import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { isAllStores, isExpired, scope, storeId, tenant } from '../common/tenant';
import { paged, paginate } from '../common/utils';
import { CouponsService } from '../coupons/coupons.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.module';
import { SettingsService } from '../settings/settings.service';
import { DeliveryCoreService } from '../delivery/delivery-core.service';
import { storeAddressData } from '../geo/vn-address';
import { assertPlanLimit } from '../common/plan-limits';
import { PlatformService } from '../common/platform';
import { quoteShipping } from '../common/shipping';
import { CreateOrderDto, EInvoiceRequestDto, IssueEInvoiceDto, PosOrderDto, PreviewOrderDto, QueryOrdersDto } from './dto/order.dto';

/** Luồng trạng thái hợp lệ */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const orderInclude = {
  items: true,
  user: { select: { id: true, email: true, fullName: true } },
  store: { select: { id: true, slug: true, name: true } },
  createdBy: { select: { id: true, fullName: true } },
  payments: { orderBy: { createdAt: 'desc' } },
  einvoice: true,
  delivery: {
    include: {
      shipper: { select: { id: true, fullName: true, phone: true, shipperProfile: { select: { vehicleType: true, plateNumber: true } } } },
    },
  },
} satisfies Prisma.OrderInclude;

type Line = {
  variantId: number; quantity: number; productId: number; productName: string; variantName: string;
  sku: string; image: string | null; price: number; costPrice: number | null; total: number; slug: string; stock: number; unit: string | null;
  /** Thuế suất GTGT snapshot tại thời điểm bán */
  vatRate: string;
};

const toItem = ({ slug, stock, ...l }: Line) => l;

/** Chuẩn hoá thông tin người mua trên hoá đơn điện tử */
function einvoiceData(d: EInvoiceRequestDto) {
  const org = d.buyerType === 'TO_CHUC';
  const taxCode = d.buyerTaxCode?.replace(/\s/g, '') || null;
  if (org && (!taxCode || !d.buyerCompany?.trim() || !d.buyerAddress?.trim()))
    throw new BadRequestException('Hoá đơn cho tổ chức cần đủ tên đơn vị, mã số thuế và địa chỉ');
  return {
    buyerType: org ? 'TO_CHUC' : 'CA_NHAN',
    buyerName: d.buyerName.trim(),
    buyerCompany: org ? d.buyerCompany!.trim() : null,
    buyerTaxCode: taxCode,
    buyerIdNumber: d.buyerIdNumber?.trim() || null,
    buyerAddress: d.buyerAddress?.trim() || null,
    buyerEmail: d.buyerEmail?.trim().toLowerCase() || null,
  };
}

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private coupons: CouponsService,
    private settings: SettingsService,
    private delivery: DeliveryCoreService,
    private notifications: NotificationsService,
    private platform: PlatformService,
  ) {}

  /** Gửi thông báo không làm hỏng luồng chính nếu lỗi */
  private safeNotify(fn: () => Promise<unknown>) {
    fn().catch(() => {});
  }

  private genCode(prefix = 'DH') {
    const d = new Date();
    const ymd = `${d.getFullYear() % 100}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return `${prefix}${ymd}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  }

  /** Tính giá đơn hàng (dùng chung cho xem trước, đặt hàng online và POS) */
  private async calculate(dto: PreviewOrderDto, tx: Prisma.TransactionClient = this.prisma, opts: { shipping?: boolean; userId?: number | null } = {}) {
    const s = await this.settings.get();
    const merged = new Map<number, number>();
    dto.items.forEach((i) => merged.set(i.variantId, (merged.get(i.variantId) ?? 0) + i.quantity));
    const variants = await tx.productVariant.findMany({
      // chỉ biến thể của cửa hàng đang mua → không thể đặt hàng chéo cửa hàng
      where: { id: { in: [...merged.keys()] }, storeId: storeId() },
      include: { product: { select: { id: true, name: true, slug: true, thumbnail: true, unit: true, isActive: true, vatRate: true } } },
    });
    const lines: Line[] = [...merged.entries()].map(([variantId, quantity]) => {
      const v = variants.find((x) => x.id === variantId);
      if (!v || !v.isActive || !v.product.isActive) throw new BadRequestException(`Sản phẩm (#${variantId}) không còn bán`);
      if (v.stock < quantity) throw new BadRequestException(`"${v.product.name} - ${v.name}" chỉ còn ${v.stock} sản phẩm`);
      return {
        variantId, quantity, productId: v.product.id, productName: v.product.name, variantName: v.name,
        sku: v.sku, image: v.image || v.product.thumbnail, price: v.price, costPrice: v.costPrice, total: v.price * quantity,
        slug: v.product.slug, stock: v.stock, unit: v.product.unit,
        vatRate: v.product.vatRate ?? s.tax.defaultVatRate,
      };
    });
    const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
    let discount = 0;
    let couponCode: string | null = null;
    let couponId: number | null = null;
    if (dto.couponCode) {
      const r = await this.coupons.apply(dto.couponCode, subtotal, tx, opts.userId);
      discount = r.discount;
      couponCode = r.coupon.code;
      couponId = r.coupon.id;
    }
    // Khuyến mãi tự động nâng cao. Mặc định chọn ưu đãi tốt nhất; ưu đãi stackable được cộng thêm.
    const now = new Date();
    const promotions: Prisma.PromotionGetPayload<object>[] = await tx.promotion.findMany({
      where: { storeId: storeId(), isActive: true, OR: [{ startsAt: null }, { startsAt: { lte: now } }], AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] },
      orderBy: { priority: 'desc' },
    }).catch(() => []);
    const candidates = promotions.filter((p) => p.usageLimit == null || p.usedCount < p.usageLimit).map((p) => {
      const rules = p.rules as any; const actions = p.actions as any;
      if (subtotal < Number(rules.minSubtotal ?? 0)) return { p, amount: 0 };
      if (rules.productIds?.length && !lines.some((l) => rules.productIds.includes(l.productId))) return { p, amount: 0 };
      let amount = 0;
      if (['PERCENT', 'FLASH_SALE', 'TIER_PRICE'].includes(p.type)) amount = Math.floor(subtotal * Number(actions.percent ?? actions.value ?? 0) / 100);
      else if (['FIXED', 'BUNDLE'].includes(p.type)) amount = Number(actions.amount ?? actions.value ?? 0);
      else if (p.type === 'BUY_X_GET_Y') {
        const buy = lines.find((l) => l.productId === Number(rules.buyProductId));
        const gift = lines.find((l) => l.productId === Number(actions.getProductId ?? rules.buyProductId));
        const sets = buy ? Math.floor(buy.quantity / Math.max(1, Number(rules.buyQuantity ?? 1))) : 0;
        amount = gift ? Math.min(gift.quantity, sets * Number(actions.getQuantity ?? 1)) * gift.price * Number(actions.discountPercent ?? 100) / 100 : 0;
      }
      amount = Math.max(0, Math.min(subtotal - discount, Math.floor(amount)));
      if (actions.maxDiscount) amount = Math.min(amount, Number(actions.maxDiscount));
      return { p, amount };
    }).filter((x) => x.amount > 0);
    const best = candidates.filter((x) => !x.p.stackable).sort((a, b) => b.amount - a.amount)[0];
    const applied = [...(best ? [best] : []), ...candidates.filter((x) => x.p.stackable)];
    const promotionDiscount = Math.min(subtotal - discount, applied.reduce((s, x) => s + x.amount, 0));
    discount += promotionDiscount;
    // Phí ship: theo quãng đường (biểu phí của sàn) hoặc cố định; miễn phí khi đạt ngưỡng (ngưỡng 0 = luôn tính phí)
    let shipping: ReturnType<typeof quoteShipping> | null = null;
    let shippingFee = 0;
    if (opts.shipping !== false) {
      const store = await tx.store.findUnique({ where: { id: storeId() }, select: { lat: true, lng: true } });
      shipping = quoteShipping({
        store, dropoff: dto.lat != null && dto.lng != null ? { lat: dto.lat, lng: dto.lng } : null,
        mode: s.shippingMode, fixedFee: s.shippingFee, tariff: (await this.platform.get()).delivery,
      });
      const freeShip = s.freeShippingThreshold > 0 && subtotal >= s.freeShippingThreshold;
      shippingFee = freeShip ? 0 : shipping.fee;
    }
    return {
      lines, subtotal, discount, shippingFee, total: subtotal - discount + shippingFee, couponCode, couponId,
      shipping: shipping && { ...shipping, freeShip: !!shipping && shippingFee === 0 && shipping.fee > 0 },
      appliedPromotions: applied.map((x) => ({ id: x.p.id, code: x.p.code, name: x.p.name, discount: x.amount })),
    };
  }

  async preview(dto: PreviewOrderDto) {
    const { couponId, lines, ...rest } = await this.calculate(dto);
    const s = await this.settings.get();
    return { ...rest, lines: lines.map(({ costPrice, ...l }) => l), einvoiceEnabled: s.einvoice.enabled, freeShippingThreshold: s.freeShippingThreshold, minOrderValue: s.minOrderValue };
  }

  /** Trừ kho có điều kiện (chống bán vượt tồn khi đặt đồng thời) + ghi log */
  private async deductStock(tx: Prisma.TransactionClient, lines: Line[], code: string, userId: number | null) {
    for (const l of lines) {
      const r = await tx.productVariant.updateMany({
        where: { id: l.variantId, stock: { gte: l.quantity } },
        data: { stock: { decrement: l.quantity } },
      });
      if (r.count === 0) throw new BadRequestException(`"${l.productName} - ${l.variantName}" không đủ hàng`);
      const v = await tx.productVariant.findUniqueOrThrow({ where: { id: l.variantId }, select: { stock: true, costPrice: true } });
      await tx.inventoryLog.create({
        data: { variantId: l.variantId, change: -l.quantity, stockAfter: v.stock, unitCost: v.costPrice, reason: 'ORDER', note: `Đơn ${code}`, userId },
      });
    }
  }

  async create(dto: CreateOrderDto, userId: number) {
    await assertPlanLimit(this.prisma, storeId(), 'ordersMonthly');
    const st = tenant().store;
    if (st && isExpired(st)) throw new ForbiddenException('Cửa hàng tạm ngưng nhận đơn online, vui lòng quay lại sau');
    const s = await this.settings.getPublic();
    const method = dto.paymentMethod ?? 'COD';
    const enabled = { COD: s.payment.cod, BANK_TRANSFER: s.payment.bankTransfer, VNPAY: s.payment.vnpay }[method];
    if (!enabled) throw new BadRequestException('Phương thức thanh toán này hiện không khả dụng');

    let deliveryDate: Date | null = null;
    if (dto.deliveryDate || dto.deliverySlot) {
      if (!dto.deliveryDate || !dto.deliverySlot) throw new BadRequestException('Vui lòng chọn đủ ngày và khung giờ giao hàng');
      if (!s.deliverySlots.includes(dto.deliverySlot)) throw new BadRequestException('Khung giờ giao hàng không hợp lệ');
      deliveryDate = new Date(dto.deliveryDate.slice(0, 10) + 'T00:00:00Z');
      const today = new Date();
      const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
      const diff = Math.round((deliveryDate.getTime() - todayUtc) / 86400000);
      if (diff < 0 || diff > s.deliveryDaysAhead) throw new BadRequestException(`Chỉ nhận giao trong ${s.deliveryDaysAhead + 1} ngày tới`);
    }

    const addressData = storeAddressData(dto.addressParts, 'Địa chỉ giao hàng');
    let einvoice: ReturnType<typeof einvoiceData> | null = null;
    if (dto.einvoice) {
      if (!s.einvoice.enabled) throw new BadRequestException('Cửa hàng chưa hỗ trợ xuất hoá đơn điện tử theo yêu cầu');
      einvoice = einvoiceData(dto.einvoice);
    }
    const order = await this.prisma.$transaction(async (tx) => {
      const calc = await this.calculate(dto, tx, { userId });
      if (calc.subtotal < s.minOrderValue)
        throw new BadRequestException(`Đơn hàng tối thiểu ${s.minOrderValue.toLocaleString('vi-VN')}₫`);
      if (calc.shipping?.needPin) throw new BadRequestException('Vui lòng ghim vị trí giao hàng trên bản đồ để tính phí ship theo quãng đường');
      if (calc.shipping?.outOfRange) throw new BadRequestException(`Địa chỉ giao hàng ${calc.shipping.note.charAt(0).toLowerCase()}${calc.shipping.note.slice(1)} – cửa hàng chưa giao tới khu vực này`);
      const code = this.genCode();
      await this.deductStock(tx, calc.lines, code, userId);
      if (calc.couponId) await tx.coupon.update({ where: { id: calc.couponId }, data: { usedCount: { increment: 1 } } });
      for (const promo of calc.appliedPromotions) await tx.promotion.update({ where: { id: promo.id }, data: { usedCount: { increment: 1 } } });
      return tx.order.create({
        data: {
          code, userId, channel: 'ONLINE', storeId: storeId(),
          customerName: dto.customerName, phone: dto.phone, note: dto.note, ...addressData,
          dropoffLat: dto.lat ?? null, dropoffLng: dto.lng ?? null,
          paymentMethod: method, deliveryDate, deliverySlot: dto.deliverySlot,
          subtotal: calc.subtotal, discount: calc.discount, shippingFee: calc.shippingFee, total: calc.total,
          shippingKm: calc.shipping?.mode === 'DISTANCE' ? calc.shipping.km : null,
          couponCode: calc.couponCode,
          promotionData: calc.appliedPromotions as Prisma.InputJsonValue,
          items: { create: calc.lines.map(toItem) },
          ...(einvoice && { einvoice: { create: { ...einvoice, storeId: storeId() } } }),
        },
        include: orderInclude,
      });
    });
    this.safeNotify(() => this.notifications.notifyStaff(order.storeId, {
      type: 'NEW_ORDER', title: `🛒 Đơn hàng mới ${order.code}`,
      body: `${order.customerName} · ${order.total.toLocaleString('vi-VN')}₫ · ${order.items.length} sản phẩm`,
      data: { orderId: order.id, url: `/admin/orders/${order.id}` },
    }));
    return order;
  }

  /** Bán tại quầy: hoàn thành & thanh toán ngay */
  async createPos(dto: PosOrderDto, staffId: number) {
    await assertPlanLimit(this.prisma, storeId(), 'ordersMonthly');
    return this.prisma.$transaction(async (tx) => {
      let memberToken: Prisma.PosLoyaltyTokenGetPayload<object> | null = null;
      if (dto.posToken) {
        const raw = dto.posToken.trim().replace(/^LOYALTY:/i, '');
        memberToken = await tx.posLoyaltyToken.findUnique({ where: { token: raw } });
        if (!memberToken || memberToken.storeId !== storeId() || memberToken.consumedAt || memberToken.expiresAt <= new Date())
          throw new BadRequestException('Mã thành viên đã hết hạn, đã dùng hoặc không thuộc cửa hàng này');
        const claimed = await tx.posLoyaltyToken.updateMany({ where: { id: memberToken.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
        if (claimed.count !== 1) throw new BadRequestException('Mã thành viên vừa được sử dụng ở giao dịch khác');
      }
      const securedDto = memberToken ? { ...dto, couponCode: memberToken.couponCode ?? undefined } : dto;
      const calc = await this.calculate(securedDto, tx, { shipping: false, userId: memberToken?.userId });
      const pointDiscount = memberToken ? Math.min(memberToken.pointsToUse * 100, Math.max(0, calc.subtotal - calc.discount)) : 0;
      const manual = Math.min(dto.manualDiscount ?? 0, calc.subtotal - calc.discount);
      const discount = Math.min(calc.subtotal, calc.discount + pointDiscount + manual);
      const total = calc.subtotal - discount;
      if (dto.paymentMethod === 'CASH' && dto.cashReceived !== undefined && dto.cashReceived < total)
        throw new BadRequestException('Tiền khách đưa chưa đủ');
      const code = this.genCode('HD');
      await this.deductStock(tx, calc.lines, code, staffId);
      if (calc.couponId) await tx.coupon.update({ where: { id: calc.couponId }, data: { usedCount: { increment: 1 } } });
      for (const promo of calc.appliedPromotions) await tx.promotion.update({ where: { id: promo.id }, data: { usedCount: { increment: 1 } } });
      for (const l of calc.lines)
        await tx.product.update({ where: { id: l.productId }, data: { soldCount: { increment: l.quantity } } });
      const now = new Date();
      const member = memberToken ? await tx.user.findUniqueOrThrow({ where: { id: memberToken.userId }, select: { fullName: true, phone: true } }) : null;
      const order = await tx.order.create({
        data: {
          code, channel: 'POS', createdById: staffId, storeId: storeId(), userId: memberToken?.userId ?? null,
          customerName: member?.fullName ?? (dto.customerName?.trim() || 'Khách lẻ'), phone: member?.phone ?? (dto.phone?.trim() || ''), address: 'Mua tại cửa hàng',
          note: dto.note, status: 'COMPLETED', paymentMethod: dto.paymentMethod, paymentStatus: 'PAID', paidAt: now,
          cashReceived: dto.paymentMethod === 'CASH' ? dto.cashReceived ?? total : null,
          subtotal: calc.subtotal, discount, shippingFee: 0, total, couponCode: calc.couponCode,
          loyaltyPointsUsed: memberToken?.pointsToUse ?? 0, loyaltyDiscount: pointDiscount,
          promotionData: calc.appliedPromotions as Prisma.InputJsonValue,
          items: { create: calc.lines.map(toItem) },
          payments: {
            create: {
              provider: dto.paymentMethod, amount: total, status: 'SUCCESS',
              txnRef: `${code}-POS`, message: dto.paymentMethod === 'CASH' ? 'Tiền mặt tại quầy' : 'Chuyển khoản tại quầy',
            },
          },
        },
        include: orderInclude,
      });
      if (memberToken) {
        const account = await tx.loyaltyAccount.upsert({ where: { storeId_userId: { storeId: storeId(), userId: memberToken.userId } }, create: { storeId: storeId(), userId: memberToken.userId }, update: {} });
        if (account.points < memberToken.pointsToUse) throw new BadRequestException('Số dư điểm đã thay đổi, vui lòng tạo lại mã');
        let balance = account.points;
        if (memberToken.pointsToUse > 0) {
          balance -= memberToken.pointsToUse;
          await tx.loyaltyAccount.update({ where: { id: account.id }, data: { points: balance } });
          await tx.loyaltyTransaction.create({ data: { storeId: storeId(), userId: memberToken.userId, orderId: order.id, type: 'REDEEM_POS', points: -memberToken.pointsToUse, balance, note: `Dùng điểm tại quầy ${code}` } });
        }
        const earned = Math.floor(total / 1000);
        if (earned > 0) {
          balance += earned;
          await tx.loyaltyAccount.update({ where: { id: account.id }, data: { points: { increment: earned }, lifetimePoints: { increment: earned } } });
          await tx.loyaltyTransaction.create({ data: { storeId: storeId(), userId: memberToken.userId, orderId: order.id, type: 'EARN_ORDER', points: earned, balance, note: `Tích điểm đơn POS ${code}` } });
        }
        if (calc.couponId) {
          const coupon = await tx.coupon.findUniqueOrThrow({ where: { id: calc.couponId } });
          if (!coupon.audienceAll) await tx.couponRedemption.create({ data: { couponId: coupon.id, userId: memberToken.userId, orderId: order.id, storeId: storeId() } });
        }
        await tx.posLoyaltyToken.update({ where: { id: memberToken.id }, data: { orderId: order.id } });
      }
      return order;
    });
  }

  private buildWhere(q: QueryOrdersDto, extra: Prisma.OrderWhereInput = {}): Prisma.OrderWhereInput {
    return {
      ...extra,
      ...(q.status && { status: q.status }),
      ...(q.paymentStatus && { paymentStatus: q.paymentStatus }),
      ...(q.channel && { channel: q.channel }),
      ...((q.from || q.to) && {
        createdAt: { ...(q.from && { gte: new Date(q.from) }), ...(q.to && { lte: new Date(q.to + 'T23:59:59') }) },
      }),
      ...(q.search && {
        OR: [{ code: { contains: q.search } }, { customerName: { contains: q.search } }, { phone: { contains: q.search } }],
      }),
    };
  }

  private async listWhere(q: QueryOrdersDto, extra: Prisma.OrderWhereInput = {}) {
    const { skip, take, page, limit } = paginate(q.page, q.limit);
    const where = this.buildWhere(q, extra);
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { items: true } }, user: { select: { id: true, email: true } },
          store: { select: { id: true, slug: true, name: true } }, items: { take: 3, select: { image: true, productName: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return paged(items, total, page, limit);
  }

  /** Khách: đơn của mình ở mọi cửa hàng */
  listMine(userId: number, q: QueryOrdersDto) {
    return this.listWhere(q, { userId });
  }

  /** Cửa hàng: chỉ đơn của cửa hàng hiện tại */
  listAll(q: QueryOrdersDto) {
    return this.listWhere(q, scope());
  }

  /** Xuất CSV (UTF-8 BOM để Excel đọc đúng tiếng Việt) */
  async exportCsv(q: QueryOrdersDto) {
    const rows = await this.prisma.order.findMany({
      where: this.buildWhere(q, scope()), orderBy: { createdAt: 'desc' }, take: 10000,
      include: { items: true, store: { select: { name: true } } },
    });
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Mã đơn', 'Cửa hàng', 'Ngày', 'Kênh', 'Khách hàng', 'SĐT', 'Địa chỉ', 'Sản phẩm', 'Tạm tính', 'Giảm giá', 'Phí ship', 'Tổng', 'Thanh toán', 'TT thanh toán', 'Trạng thái'];
    const lines = rows.map((o) =>
      [
        o.code, o.store.name, o.createdAt.toLocaleString('vi-VN'), o.channel, o.customerName, o.phone, o.address,
        o.items.map((i) => `${i.productName} (${i.variantName}) x${i.quantity}`).join('; '),
        o.subtotal, o.discount, o.shippingFee, o.total, o.paymentMethod, o.paymentStatus, o.status,
      ].map(esc).join(','),
    );
    return '﻿' + [header.map(esc).join(','), ...lines].join('\r\n');
  }

  /** userId → khách xem đơn của mình; không có userId → nhân viên xem đơn của cửa hàng mình */
  async findOne(id: number, userId?: number) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: orderInclude });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (userId !== undefined ? order.userId !== userId : !isAllStores() && order.storeId !== storeId()) throw new NotFoundException('Không tìm thấy đơn hàng');
    return order;
  }

  /** checkStore=false chỉ dùng khi khách tự huỷ đơn của mình (đã kiểm tra quyền sở hữu) */
  async updateStatus(id: number, status: OrderStatus, actorId: number, cancelReason?: string, checkStore = true) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({ where: { id }, include: { items: true } });
      if (checkStore && !isAllStores() && order.storeId !== storeId()) throw new NotFoundException('Không tìm thấy đơn hàng');
      if (!TRANSITIONS[order.status].includes(status))
        throw new BadRequestException(`Không thể chuyển trạng thái từ ${order.status} sang ${status}`);

      const data: Prisma.OrderUpdateInput = { status };
      if (status === 'CANCELLED') {
        data.cancelReason = cancelReason ?? null;
        if (order.paymentStatus === 'PAID') data.paymentStatus = 'REFUNDED';
        // Hoàn kho
        for (const it of order.items) {
          if (!it.variantId) continue;
          const v = await tx.productVariant
            .update({ where: { id: it.variantId }, data: { stock: { increment: it.quantity } }, select: { stock: true } })
            .catch(() => null);
          if (v)
            await tx.inventoryLog.create({
              data: { variantId: it.variantId, change: it.quantity, stockAfter: v.stock, reason: 'CANCEL', note: `Huỷ đơn ${order.code}`, userId: actorId },
            });
        }
        if (order.couponCode)
          await tx.coupon.updateMany({ where: { storeId: order.storeId, code: order.couponCode, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
        for (const promo of Array.isArray(order.promotionData) ? order.promotionData as any[] : [])
          if (promo?.id) await tx.promotion.updateMany({ where: { id: Number(promo.id), storeId: order.storeId, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
      }
      if (status === 'COMPLETED') {
        if (order.paymentStatus !== 'PAID') {
          data.paymentStatus = 'PAID';
          data.paidAt = new Date();
        }
        for (const it of order.items) {
          if (it.productId) await tx.product.updateMany({ where: { id: it.productId }, data: { soldCount: { increment: it.quantity } } });
        }
        // Tích 1 điểm cho mỗi 1.000đ của đơn hoàn thành; mỗi đơn chỉ đi qua COMPLETED một lần.
        if (order.userId) {
          const earned = Math.floor(order.total / 1000);
          if (earned > 0) {
            const account = await tx.loyaltyAccount.upsert({
              where: { storeId_userId: { storeId: order.storeId, userId: order.userId } },
              create: { storeId: order.storeId, userId: order.userId, points: earned, lifetimePoints: earned },
              update: { points: { increment: earned }, lifetimePoints: { increment: earned } },
            });
            const previousSpend = await tx.order.aggregate({ where: { storeId: order.storeId, userId: order.userId, status: 'COMPLETED' }, _sum: { total: true } });
            const totalSpent = (previousSpend._sum.total ?? 0) + order.total;
            const tierSetting = await tx.loyaltyTierSetting.findFirst({ where: { storeId: order.storeId, isActive: true, minSpend: { lte: totalSpent } }, orderBy: { minSpend: 'desc' } });
            if (tierSetting && tierSetting.key !== account.tier) {
              await tx.loyaltyAccount.update({ where: { id: account.id }, data: { tier: tierSetting.key } });
              if (tierSetting.rewardCouponCode) {
                const reward = await tx.coupon.findUnique({ where: { storeId_code: { storeId: order.storeId, code: tierSetting.rewardCouponCode } } });
                if (reward) await tx.couponRecipient.upsert({ where: { couponId_userId: { couponId: reward.id, userId: order.userId } }, create: { couponId: reward.id, userId: order.userId }, update: {} });
              }
            }
            await tx.loyaltyTransaction.create({ data: { storeId: order.storeId, userId: order.userId, orderId: order.id, type: 'EARN_ORDER', points: earned, balance: account.points, note: `Tích điểm đơn ${order.code}` } });
          }
        }
      }
      return tx.order.update({ where: { id }, data, include: orderInclude });
    });
    // Giao hàng: xác nhận → tìm tài xế; huỷ → huỷ chuyến
    if (updated.channel === 'ONLINE' && status === 'CONFIRMED') await this.delivery.requestFor(updated.id).catch(() => null);
    if (status === 'CANCELLED') await this.delivery.cancelFor(updated.id, cancelReason ? `Đơn đã huỷ: ${cancelReason}` : undefined).catch(() => null);
    if (updated.userId && updated.channel === 'ONLINE' && updated.userId !== actorId) {
      const msg: Record<string, string> = {
        CONFIRMED: 'đã được xác nhận và đang chuẩn bị hàng',
        SHIPPING: 'đang được giao đến bạn',
        COMPLETED: 'đã giao thành công. Cảm ơn bạn đã mua sắm!',
        CANCELLED: `đã bị huỷ${cancelReason ? `: ${cancelReason}` : ''}`,
      };
      this.safeNotify(() => this.notifications.notify([updated.userId!], {
        type: 'ORDER_STATUS', title: `Đơn hàng ${updated.code}`, body: `Đơn hàng ${updated.code} ${msg[status] ?? status}`,
        data: { orderId: updated.id, status, url: `/orders/${updated.id}` },
      }));
    }
    return status === 'CONFIRMED' || status === 'CANCELLED'
      ? this.prisma.order.findUniqueOrThrow({ where: { id }, include: orderInclude })
      : updated;
  }

  async cancelMine(id: number, userId: number, reason?: string) {
    const order = await this.findOne(id, userId);
    if (order.status !== 'PENDING') throw new BadRequestException('Chỉ có thể huỷ đơn đang chờ xác nhận');
    if (order.paymentStatus === 'PAID') throw new BadRequestException('Đơn đã thanh toán, vui lòng liên hệ cửa hàng để huỷ');
    return this.updateStatus(id, 'CANCELLED', userId, reason || 'Khách hàng huỷ', false);
  }

  async updatePayment(id: number, paymentStatus: PaymentStatus) {
    const order = await this.prisma.order.findFirstOrThrow({ where: { id, ...scope() } });
    const updated = await this.prisma.$transaction(async (tx) => {
      if (paymentStatus === 'PAID' && order.paymentStatus !== 'PAID')
        await tx.paymentTransaction.create({
          data: {
            orderId: id, provider: order.paymentMethod, amount: order.total, status: 'SUCCESS',
            txnRef: `${order.code}-M${Date.now().toString().slice(-6)}`, message: 'Admin xác nhận đã nhận tiền',
          },
        });
      return tx.order.update({
        where: { id },
        data: { paymentStatus, paidAt: paymentStatus === 'PAID' ? order.paidAt ?? new Date() : null },
        include: orderInclude,
      });
    });
    if (paymentStatus === 'PAID' && order.paymentStatus !== 'PAID' && order.userId)
      this.safeNotify(() => this.notifications.notify([order.userId!], {
        type: 'PAYMENT', title: 'Đã nhận thanh toán', body: `Cửa hàng đã nhận ${order.total.toLocaleString('vi-VN')}₫ cho đơn ${order.code}`,
        data: { orderId: order.id, url: `/orders/${order.id}` },
      }));
    return updated;
  }

  // ───────────── Hoá đơn điện tử ─────────────
  /** Khách yêu cầu xuất hoá đơn cho đơn của mình (khi chưa có yêu cầu đang hiệu lực) */
  async requestEInvoice(id: number, userId: number, dto: EInvoiceRequestDto) {
    const order = await this.findOne(id, userId);
    if (order.status === 'CANCELLED') throw new BadRequestException('Đơn đã huỷ, không thể xuất hoá đơn');
    const s = await this.settings.get(order.storeId);
    if (!s.einvoice.enabled) throw new BadRequestException('Cửa hàng chưa hỗ trợ xuất hoá đơn điện tử theo yêu cầu – vui lòng liên hệ cửa hàng');
    if (order.einvoice && order.einvoice.status !== 'CANCELLED') throw new BadRequestException('Đơn hàng đã có yêu cầu / hoá đơn điện tử');
    const data = einvoiceData(dto);
    await this.prisma.eInvoice.upsert({
      where: { orderId: id },
      create: { ...data, orderId: id, storeId: order.storeId },
      update: { ...data, status: 'REQUESTED', series: null, number: null, taxAuthorityCode: null, lookupCode: null, lookupUrl: null, issuedAt: null, note: null },
    });
    this.safeNotify(() => this.notifications.notifyStaff(order.storeId, {
      type: 'EINVOICE', title: `🧾 Yêu cầu xuất hoá đơn ${order.code}`, body: `${data.buyerCompany ?? data.buyerName}${data.buyerTaxCode ? ` · MST ${data.buyerTaxCode}` : ''}`,
      data: { orderId: id, url: `/admin/orders/${id}` },
    }));
    return this.findOne(id, userId);
  }

  /**
   * Cửa hàng ghi nhận hoá đơn đã phát hành trên phần mềm HĐĐT (hoặc tạo yêu cầu tại quầy / huỷ).
   * Nền tảng không ký số hay gửi cơ quan thuế – chỉ lưu thông tin để khách tra cứu.
   */
  async saveEInvoice(id: number, dto: IssueEInvoiceDto, actorId: number) {
    const order = await this.findOne(id);
    const s = await this.settings.get(order.storeId);
    const buyer = dto.buyerName ? einvoiceData({ ...dto, buyerType: dto.buyerType ?? 'CA_NHAN', buyerName: dto.buyerName }) : null;
    if (!order.einvoice && !buyer) throw new BadRequestException('Nhập thông tin người mua');
    const status = dto.status ?? 'ISSUED';
    let issued = {};
    if (status === 'ISSUED') {
      if (order.status === 'CANCELLED') throw new BadRequestException('Đơn đã huỷ – không phát hành hoá đơn');
      const series = (dto.series || s.einvoice.series || '').trim().toUpperCase();
      if (!/^[CK]\d{2}[A-Z]{3}$/.test(series)) throw new BadRequestException('Ký hiệu hoá đơn không hợp lệ (vd C26MAA)');
      if (!dto.number || !/^\d{1,8}$/.test(dto.number.trim())) throw new BadRequestException('Số hoá đơn gồm tối đa 8 chữ số');
      if (series.startsWith('C') && !dto.taxAuthorityCode?.trim()) throw new BadRequestException('Hoá đơn có mã (ký hiệu bắt đầu bằng C) cần nhập mã của cơ quan thuế');
      issued = {
        templateCode: s.einvoice.templateCode, series, number: dto.number.trim(), taxAuthorityCode: dto.taxAuthorityCode?.trim() || null,
        lookupCode: dto.lookupCode?.trim() || null, lookupUrl: dto.lookupUrl?.trim() || s.einvoice.lookupUrl || null,
        provider: s.einvoice.provider || null, issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : new Date(), issuedById: actorId,
      };
    }
    if (status === 'CANCELLED' && !dto.note?.trim()) throw new BadRequestException('Nhập lý do huỷ / thay thế hoá đơn');
    await this.prisma.eInvoice.upsert({
      where: { orderId: id },
      create: { ...buyer!, orderId: id, storeId: order.storeId, status, ...issued, note: dto.note ?? null },
      update: { ...(buyer ?? {}), status, ...issued, ...(dto.note !== undefined && { note: dto.note }) },
    });
    if (status === 'ISSUED' && order.userId)
      this.safeNotify(() => this.notifications.notify([order.userId!], {
        type: 'EINVOICE', title: 'Hoá đơn điện tử đã phát hành', body: `Đơn ${order.code} – xem số hoá đơn & mã tra cứu trong chi tiết đơn`,
        data: { orderId: id, url: `/orders/${id}` },
      }));
    return this.findOne(id);
  }
}
