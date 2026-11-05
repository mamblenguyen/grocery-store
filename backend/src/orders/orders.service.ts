import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { paged, paginate } from '../common/utils';
import { CouponsService } from '../coupons/coupons.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.module';
import { SettingsService } from '../settings/settings.service';
import { CreateOrderDto, PosOrderDto, PreviewOrderDto, QueryOrdersDto } from './dto/order.dto';

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
  createdBy: { select: { id: true, fullName: true } },
  payments: { orderBy: { createdAt: 'desc' } },
} satisfies Prisma.OrderInclude;

type Line = {
  variantId: number; quantity: number; productId: number; productName: string; variantName: string;
  sku: string; image: string | null; price: number; costPrice: number | null; total: number; slug: string; stock: number; unit: string | null;
};

const toItem = ({ slug, stock, unit, ...l }: Line) => l;

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private coupons: CouponsService,
    private settings: SettingsService,
    private notifications: NotificationsService,
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
  private async calculate(dto: PreviewOrderDto, tx: Prisma.TransactionClient = this.prisma, opts: { shipping?: boolean } = {}) {
    const s = await this.settings.get();
    const merged = new Map<number, number>();
    dto.items.forEach((i) => merged.set(i.variantId, (merged.get(i.variantId) ?? 0) + i.quantity));
    const variants = await tx.productVariant.findMany({
      where: { id: { in: [...merged.keys()] } },
      include: { product: { select: { id: true, name: true, slug: true, thumbnail: true, unit: true, isActive: true } } },
    });
    const lines: Line[] = [...merged.entries()].map(([variantId, quantity]) => {
      const v = variants.find((x) => x.id === variantId);
      if (!v || !v.isActive || !v.product.isActive) throw new BadRequestException(`Sản phẩm (#${variantId}) không còn bán`);
      if (v.stock < quantity) throw new BadRequestException(`"${v.product.name} - ${v.name}" chỉ còn ${v.stock} sản phẩm`);
      return {
        variantId, quantity, productId: v.product.id, productName: v.product.name, variantName: v.name,
        sku: v.sku, image: v.image || v.product.thumbnail, price: v.price, costPrice: v.costPrice, total: v.price * quantity,
        slug: v.product.slug, stock: v.stock, unit: v.product.unit,
      };
    });
    const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
    let discount = 0;
    let couponCode: string | null = null;
    let couponId: number | null = null;
    if (dto.couponCode) {
      const r = await this.coupons.apply(dto.couponCode, subtotal, tx);
      discount = r.discount;
      couponCode = r.coupon.code;
      couponId = r.coupon.id;
    }
    const shippingFee = opts.shipping === false || subtotal >= s.freeShippingThreshold ? 0 : s.shippingFee;
    return { lines, subtotal, discount, shippingFee, total: subtotal - discount + shippingFee, couponCode, couponId };
  }

  async preview(dto: PreviewOrderDto) {
    const { couponId, lines, ...rest } = await this.calculate(dto);
    const s = await this.settings.get();
    return { ...rest, lines: lines.map(({ costPrice, ...l }) => l), freeShippingThreshold: s.freeShippingThreshold, minOrderValue: s.minOrderValue };
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

    const order = await this.prisma.$transaction(async (tx) => {
      const calc = await this.calculate(dto, tx);
      if (calc.subtotal < s.minOrderValue)
        throw new BadRequestException(`Đơn hàng tối thiểu ${s.minOrderValue.toLocaleString('vi-VN')}₫`);
      const code = this.genCode();
      await this.deductStock(tx, calc.lines, code, userId);
      if (calc.couponId) await tx.coupon.update({ where: { id: calc.couponId }, data: { usedCount: { increment: 1 } } });
      return tx.order.create({
        data: {
          code, userId, channel: 'ONLINE',
          customerName: dto.customerName, phone: dto.phone, address: dto.address, note: dto.note,
          paymentMethod: method, deliveryDate, deliverySlot: dto.deliverySlot,
          subtotal: calc.subtotal, discount: calc.discount, shippingFee: calc.shippingFee, total: calc.total,
          couponCode: calc.couponCode,
          items: { create: calc.lines.map(toItem) },
        },
        include: orderInclude,
      });
    });
    this.safeNotify(() => this.notifications.notifyStaff({
      type: 'NEW_ORDER', title: `🛒 Đơn hàng mới ${order.code}`,
      body: `${order.customerName} · ${order.total.toLocaleString('vi-VN')}₫ · ${order.items.length} sản phẩm`,
      data: { orderId: order.id, url: `/admin/orders/${order.id}` },
    }));
    return order;
  }

  /** Bán tại quầy: hoàn thành & thanh toán ngay */
  async createPos(dto: PosOrderDto, staffId: number) {
    return this.prisma.$transaction(async (tx) => {
      const calc = await this.calculate(dto, tx, { shipping: false });
      const manual = Math.min(dto.manualDiscount ?? 0, calc.subtotal - calc.discount);
      const discount = calc.discount + manual;
      const total = calc.subtotal - discount;
      if (dto.paymentMethod === 'CASH' && dto.cashReceived !== undefined && dto.cashReceived < total)
        throw new BadRequestException('Tiền khách đưa chưa đủ');
      const code = this.genCode('HD');
      await this.deductStock(tx, calc.lines, code, staffId);
      if (calc.couponId) await tx.coupon.update({ where: { id: calc.couponId }, data: { usedCount: { increment: 1 } } });
      for (const l of calc.lines)
        await tx.product.update({ where: { id: l.productId }, data: { soldCount: { increment: l.quantity } } });
      const now = new Date();
      return tx.order.create({
        data: {
          code, channel: 'POS', createdById: staffId,
          customerName: dto.customerName?.trim() || 'Khách lẻ', phone: dto.phone?.trim() || '', address: 'Mua tại cửa hàng',
          note: dto.note, status: 'COMPLETED', paymentMethod: dto.paymentMethod, paymentStatus: 'PAID', paidAt: now,
          cashReceived: dto.paymentMethod === 'CASH' ? dto.cashReceived ?? total : null,
          subtotal: calc.subtotal, discount, shippingFee: 0, total, couponCode: calc.couponCode,
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
        include: { _count: { select: { items: true } }, user: { select: { id: true, email: true } }, items: { take: 3, select: { image: true, productName: true } } },
      }),
      this.prisma.order.count({ where }),
    ]);
    return paged(items, total, page, limit);
  }

  listMine(userId: number, q: QueryOrdersDto) {
    return this.listWhere(q, { userId });
  }

  listAll(q: QueryOrdersDto) {
    return this.listWhere(q);
  }

  /** Xuất CSV (UTF-8 BOM để Excel đọc đúng tiếng Việt) */
  async exportCsv(q: QueryOrdersDto) {
    const rows = await this.prisma.order.findMany({
      where: this.buildWhere(q), orderBy: { createdAt: 'desc' }, take: 10000,
      include: { items: true },
    });
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Mã đơn', 'Ngày', 'Kênh', 'Khách hàng', 'SĐT', 'Địa chỉ', 'Sản phẩm', 'Tạm tính', 'Giảm giá', 'Phí ship', 'Tổng', 'Thanh toán', 'TT thanh toán', 'Trạng thái'];
    const lines = rows.map((o) =>
      [
        o.code, o.createdAt.toLocaleString('vi-VN'), o.channel, o.customerName, o.phone, o.address,
        o.items.map((i) => `${i.productName} (${i.variantName}) x${i.quantity}`).join('; '),
        o.subtotal, o.discount, o.shippingFee, o.total, o.paymentMethod, o.paymentStatus, o.status,
      ].map(esc).join(','),
    );
    return '﻿' + [header.map(esc).join(','), ...lines].join('\r\n');
  }

  async findOne(id: number, userId?: number) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: orderInclude });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (userId !== undefined && order.userId !== userId) throw new ForbiddenException();
    return order;
  }

  async updateStatus(id: number, status: OrderStatus, actorId: number, cancelReason?: string) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({ where: { id }, include: { items: true } });
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
          await tx.coupon.updateMany({ where: { code: order.couponCode, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
      }
      if (status === 'COMPLETED') {
        if (order.paymentStatus !== 'PAID') {
          data.paymentStatus = 'PAID';
          data.paidAt = new Date();
        }
        for (const it of order.items) {
          if (it.productId) await tx.product.updateMany({ where: { id: it.productId }, data: { soldCount: { increment: it.quantity } } });
        }
      }
      return tx.order.update({ where: { id }, data, include: orderInclude });
    });
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
    return updated;
  }

  async cancelMine(id: number, userId: number, reason?: string) {
    const order = await this.findOne(id, userId);
    if (order.status !== 'PENDING') throw new BadRequestException('Chỉ có thể huỷ đơn đang chờ xác nhận');
    if (order.paymentStatus === 'PAID') throw new BadRequestException('Đơn đã thanh toán, vui lòng liên hệ cửa hàng để huỷ');
    return this.updateStatus(id, 'CANCELLED', userId, reason || 'Khách hàng huỷ');
  }

  async updatePayment(id: number, paymentStatus: PaymentStatus) {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id } });
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
}
