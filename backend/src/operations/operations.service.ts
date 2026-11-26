import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { isAllStores, scope, storeId } from '../common/tenant';
import { paged, paginate } from '../common/utils';
import { NotificationsService } from '../notifications/notifications.module';
import { PrismaService } from '../prisma/prisma.service';
import { CampaignDto, CreateReturnDto, LoyaltyAdjustDto, LoyaltyTierDto, PosLoyaltyTokenDto, PromotionDto, ReconcileDto, ResolvePosLoyaltyDto, SegmentDto, UpdateReturnDto } from './operations.dto';
import { assertPlanLimit } from '../common/plan-limits';
import { CouponsService } from '../coupons/coupons.service';

const json = (v: unknown) => v as Prisma.InputJsonValue;
const code = (prefix: string) => `${prefix}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

@Injectable()
export class OperationsService {
  constructor(private prisma: PrismaService, private notifications: NotificationsService, private coupons: CouponsService) {}

  async createReturn(userId: number, dto: CreateReturnDto) {
    const order = await this.prisma.order.findFirst({ where: { id: dto.orderId, userId }, include: { items: true } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (order.status !== 'COMPLETED') throw new BadRequestException('Chỉ tạo yêu cầu sau khi đơn đã hoàn thành');
    const active = await this.prisma.returnRequest.findFirst({ where: { orderId: order.id, userId, status: { notIn: ['REJECTED', 'CANCELLED', 'COMPLETED'] } } });
    if (active) throw new BadRequestException('Đơn hàng đang có yêu cầu được xử lý');
    let requestedAmount = 0;
    const items = dto.items.map((x) => {
      const item = order.items.find((i) => i.id === x.orderItemId);
      if (!item || x.quantity > item.quantity) throw new BadRequestException('Sản phẩm hoặc số lượng đổi trả không hợp lệ');
      requestedAmount += item.price * x.quantity;
      return { orderItemId: item.id, variantId: item.variantId, productName: item.productName, variantName: item.variantName, quantity: x.quantity, unitPrice: item.price };
    });
    if (!items.length) throw new BadRequestException('Vui lòng chọn ít nhất một sản phẩm');
    return this.prisma.returnRequest.create({ data: {
      code: code('RT'), storeId: order.storeId, orderId: order.id, userId, type: dto.type, reason: dto.reason,
      customerNote: dto.customerNote, evidence: json(dto.evidence ?? []), items: json(items), requestedAmount,
    } });
  }

  listMyReturns(userId: number) { return this.prisma.returnRequest.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }); }
  listReturns(q: any) {
    const { skip, take, page, limit } = paginate(q.page, q.limit);
    const where: Prisma.ReturnRequestWhereInput = { ...scope(), ...(q.status && { status: q.status }), ...(q.search && { OR: [{ code: { contains: q.search } }, { reason: { contains: q.search } }] }) };
    return Promise.all([this.prisma.returnRequest.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }), this.prisma.returnRequest.count({ where })]).then(([items, total]) => paged(items, total, page, limit));
  }

  async updateReturn(id: number, actorId: number, dto: UpdateReturnDto) {
    const ret = await this.prisma.returnRequest.findFirst({ where: { id, ...scope() } });
    if (!ret) throw new NotFoundException('Không tìm thấy yêu cầu');
    const allowed: Record<string, string[]> = { REQUESTED: ['APPROVED', 'REJECTED', 'CANCELLED'], APPROVED: ['RECEIVED', 'CANCELLED'], RECEIVED: ['REFUNDED', 'COMPLETED'], REFUNDED: ['COMPLETED'] };
    if (!(allowed[ret.status] ?? []).includes(dto.status)) throw new BadRequestException(`Không thể chuyển ${ret.status} sang ${dto.status}`);
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      if (dto.status === 'RECEIVED') {
        const items = ret.items as any[];
        for (const item of items) if (item.variantId) {
          const v = await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } }, select: { stock: true, costPrice: true } });
          await tx.inventoryLog.create({ data: { variantId: item.variantId, change: item.quantity, stockAfter: v.stock, unitCost: v.costPrice, reason: 'RETURN', note: `Đổi trả ${ret.code}`, userId: actorId } });
        }
      }
      const approved = dto.approvedAmount ?? ret.approvedAmount ?? ret.requestedAmount;
      if (approved > ret.requestedAmount) throw new BadRequestException('Số tiền duyệt không được vượt giá trị yêu cầu');
      if (dto.status === 'REFUNDED') {
        const order = await tx.order.findUniqueOrThrow({ where: { id: ret.orderId } });
        await tx.paymentTransaction.create({ data: { orderId: order.id, provider: order.paymentMethod, amount: -approved, status: 'SUCCESS', txnRef: dto.refundRef || `${ret.code}-RF`, message: `Hoàn tiền ${ret.code}` } });
        if (approved >= order.total) {
          await tx.order.update({ where: { id: order.id }, data: { paymentStatus: 'REFUNDED' } });
          // Hoàn toàn bộ đơn: trả điểm đã dùng, thu hồi điểm đã tích và trả lại voucher.
          if (order.userId) {
            const account = await tx.loyaltyAccount.findUnique({ where: { storeId_userId: { storeId: order.storeId, userId: order.userId } } });
            if (account) {
              const earnedTx = await tx.loyaltyTransaction.findFirst({ where: { orderId: order.id, type: 'EARN_ORDER' }, orderBy: { createdAt: 'desc' } });
              const earned = Math.max(0, earnedTx?.points ?? 0);
              const removed = Math.min(account.points, earned);
              const balance = account.points - removed + order.loyaltyPointsUsed;
              await tx.loyaltyAccount.update({ where: { id: account.id }, data: { points: balance, lifetimePoints: Math.max(0, account.lifetimePoints - earned) } });
              await tx.loyaltyTransaction.create({ data: { storeId: order.storeId, userId: order.userId, orderId: order.id, type: 'REFUND_ORDER', points: order.loyaltyPointsUsed - removed, balance, note: `Hoàn điểm do trả toàn bộ đơn ${order.code}` } });
            }
          }
          if (order.couponCode) await tx.coupon.updateMany({ where: { storeId: order.storeId, code: order.couponCode, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
          await tx.couponRedemption.deleteMany({ where: { orderId: order.id } });
        }
      }
      return tx.returnRequest.update({ where: { id }, data: {
        status: dto.status, approvedAmount: approved, adminNote: dto.adminNote, resolution: dto.resolution,
        refundMethod: dto.refundMethod, refundRef: dto.refundRef,
        ...(['APPROVED', 'REJECTED'].includes(dto.status) && { reviewedById: actorId, reviewedAt: now }),
        ...(dto.status === 'RECEIVED' && { receivedAt: now }), ...(dto.status === 'REFUNDED' && { refundedAt: now }),
        ...(dto.status === 'COMPLETED' && { completedAt: now }),
      } });
    });
  }

  async previewReconciliation(dto: ReconcileDto) {
    const sid = storeId(); const from = new Date(dto.periodFrom); const to = new Date(dto.periodTo.length === 10 ? `${dto.periodTo}T23:59:59.999` : dto.periodTo);
    if (to < from) throw new BadRequestException('Khoảng thời gian không hợp lệ');
    if (dto.type === 'COD') {
      const rows = await this.prisma.delivery.findMany({ where: { storeId: sid, status: 'DELIVERED', deliveredAt: { gte: from, lte: to }, codAmount: { gt: 0 } }, include: { order: { select: { code: true } }, shipper: { select: { fullName: true } } } });
      // Tài xế thu COD của khách, giữ lại phí ship → cửa hàng nhận (thu hộ − phí ship); đơn phí > thu hộ thì cửa hàng phải trả thêm (số âm)
      const details = rows.map((x) => ({ id: x.id, order: x.order.code, shipper: x.shipper?.fullName, cod: x.codAmount, shipperFee: x.fee, amount: x.codAmount - x.fee }));
      return { expectedAmount: details.reduce((s, x) => s + x.amount, 0), itemCount: rows.length, details };
    }
    const rows = await this.prisma.paymentTransaction.findMany({ where: { order: { storeId: sid }, status: 'SUCCESS', createdAt: { gte: from, lte: to } }, include: { order: { select: { code: true } } } });
    return { expectedAmount: rows.reduce((s, x) => s + x.amount, 0), itemCount: rows.length, details: rows.map((x) => ({ id: x.id, order: x.order.code, provider: x.provider, amount: x.amount, ref: x.txnRef })) };
  }
  async createReconciliation(actorId: number, dto: ReconcileDto) {
    const p = await this.previewReconciliation(dto); const actual = dto.actualAmount ?? p.expectedAmount;
    return this.prisma.reconciliation.create({ data: { code: code(dto.type === 'COD' ? 'COD' : 'PAY'), storeId: storeId(), type: dto.type, periodFrom: new Date(dto.periodFrom), periodTo: new Date(dto.periodTo), expectedAmount: p.expectedAmount, actualAmount: actual, difference: actual - p.expectedAmount, itemCount: p.itemCount, details: json(p.details), note: dto.note, createdById: actorId } });
  }
  listReconciliations() { return this.prisma.reconciliation.findMany({ where: scope(), orderBy: { createdAt: 'desc' }, take: 200 }); }
  confirmReconciliation(id: number, actorId: number) { return this.prisma.reconciliation.updateMany({ where: { id, ...scope(), status: 'DRAFT' }, data: { status: 'CONFIRMED', confirmedById: actorId, confirmedAt: new Date() } }); }

  myLoyalty(userId: number) { return this.prisma.loyaltyAccount.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } }); }

  async posOptions(userId: number) {
    const sid = storeId();
    const now = new Date();
    const account = await this.prisma.loyaltyAccount.findUnique({ where: { storeId_userId: { storeId: sid, userId } } });
    const coupons = await this.prisma.coupon.findMany({
      where: {
        storeId: sid, isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          { OR: [{ audienceAll: true }, { recipients: { some: { userId } } }] },
          { OR: [{ audienceAll: true }, { NOT: { id: { in: (await this.prisma.couponRedemption.findMany({ where: { userId, storeId: sid }, select: { couponId: true } })).map((x) => x.couponId) } } }] },
        ],
      },
      select: { code: true, description: true, type: true, value: true, minOrderValue: true, maxDiscount: true, endsAt: true, audienceAll: true },
      orderBy: { createdAt: 'desc' }, take: 30,
    });
    return { points: account?.points ?? 0, tier: account?.tier ?? 'MEMBER', pointValue: 100, coupons };
  }

  async createPosToken(userId: number, dto: PosLoyaltyTokenDto) {
    const sid = storeId();
    const pointsToUse = dto.pointsToUse ?? 0;
    const account = await this.prisma.loyaltyAccount.findUnique({ where: { storeId_userId: { storeId: sid, userId } } });
    if (pointsToUse > (account?.points ?? 0)) throw new BadRequestException('Số điểm muốn dùng lớn hơn số dư hiện có');
    const couponCode = dto.couponCode?.trim().toUpperCase() || null;
    if (couponCode) {
      const coupon = await this.prisma.coupon.findUnique({ where: { storeId_code: { storeId: sid, code: couponCode } } });
      if (!coupon) throw new BadRequestException('Mã giảm giá không tồn tại');
      if (!coupon.audienceAll) {
        const assigned = await this.prisma.couponRecipient.findUnique({ where: { couponId_userId: { couponId: coupon.id, userId } } });
        const used = await this.prisma.couponRedemption.findUnique({ where: { couponId_userId: { couponId: coupon.id, userId } } });
        if (!assigned || used) throw new BadRequestException(used ? 'Voucher này đã được sử dụng' : 'Voucher không thuộc tài khoản của bạn');
      }
    }
    await this.prisma.posLoyaltyToken.updateMany({ where: { storeId: sid, userId, consumedAt: null }, data: { expiresAt: new Date() } });
    const expiresAt = new Date(Date.now() + 2 * 60_000);
    const token = randomBytes(32).toString('base64url');
    await this.prisma.posLoyaltyToken.create({ data: { token, storeId: sid, userId, couponCode, pointsToUse, expiresAt } });
    return { qr: `LOYALTY:${token}`, expiresAt, pointsToUse, couponCode };
  }

  async resolvePosToken(dto: ResolvePosLoyaltyDto) {
    const raw = dto.token.trim().replace(/^LOYALTY:/i, '');
    const token = await this.prisma.posLoyaltyToken.findUnique({ where: { token: raw } });
    if (!token || token.storeId !== storeId() || token.consumedAt || token.expiresAt <= new Date()) throw new BadRequestException('Mã thành viên đã hết hạn hoặc không hợp lệ tại cửa hàng này');
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: token.userId }, select: { fullName: true, phone: true } });
    const account = await this.prisma.loyaltyAccount.findUnique({ where: { storeId_userId: { storeId: token.storeId, userId: token.userId } } });
    if (token.pointsToUse > (account?.points ?? 0)) throw new BadRequestException('Số dư điểm đã thay đổi, vui lòng tạo lại mã');
    let couponDiscount = 0;
    if (token.couponCode) couponDiscount = (await this.coupons.apply(token.couponCode, dto.subtotal, this.prisma, token.userId)).discount;
    const pointDiscount = Math.min(token.pointsToUse * 100, Math.max(0, dto.subtotal - couponDiscount));
    const mask = (name: string) => name.split(/\s+/).map((x, i, a) => i === a.length - 1 ? `${x[0] ?? ''}***` : x).join(' ');
    return { posToken: dto.token.trim(), customerName: mask(user.fullName), phoneLast4: user.phone?.slice(-4) ?? '', pointsBalance: account?.points ?? 0, pointsToUse: token.pointsToUse, pointDiscount, couponCode: token.couponCode, couponDiscount };
  }
  async adjustLoyalty(actorId: number, dto: LoyaltyAdjustDto) {
    const sid = storeId();
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.loyaltyAccount.upsert({ where: { storeId_userId: { storeId: sid, userId: dto.userId } }, create: { storeId: sid, userId: dto.userId }, update: {} });
      const balance = Math.max(0, current.points + dto.points); const lifetime = current.lifetimePoints + Math.max(0, dto.points);
      await tx.loyaltyAccount.update({ where: { id: current.id }, data: { points: balance, lifetimePoints: lifetime } });
      return tx.loyaltyTransaction.create({ data: { storeId: sid, userId: dto.userId, type: dto.points >= 0 ? 'ADJUST_ADD' : 'ADJUST_SUBTRACT', points: dto.points, balance, note: `${dto.note} (bởi #${actorId})` } });
    });
  }
  async listLoyalty() {
    await this.recalculateLoyalty();
    const rows = await this.prisma.loyaltyAccount.findMany({ where: scope(), orderBy: [{ tier: 'desc' }, { lifetimePoints: 'desc' }], take: 500 });
    const users = await this.prisma.user.findMany({ where: { id: { in: rows.map((x) => x.userId) } }, select: { id: true, fullName: true, email: true, phone: true } });
    const spending = await this.prisma.order.groupBy({ by: ['userId'], where: { storeId: storeId(), status: 'COMPLETED', userId: { in: rows.map((x) => x.userId) } }, _sum: { total: true } });
    return rows.map((row) => ({ ...row, user: users.find((x) => x.id === row.userId), totalSpent: spending.find((x) => x.userId === row.userId)?._sum.total ?? 0 }));
  }

  async listLoyaltyTiers() {
    const sid = storeId();
    const defaults = [
      { key: 'BRONZE', name: 'Đồng', minSpend: 0, sortOrder: 1 },
      { key: 'SILVER', name: 'Bạc', minSpend: 2000000, sortOrder: 2 },
      { key: 'GOLD', name: 'Vàng', minSpend: 5000000, sortOrder: 3 },
      { key: 'DIAMOND', name: 'Kim cương', minSpend: 10000000, sortOrder: 4 },
    ];
    for (const item of defaults) await this.prisma.loyaltyTierSetting.upsert({ where: { storeId_key: { storeId: sid, key: item.key } }, create: { storeId: sid, ...item, benefits: [] }, update: {} });
    return this.prisma.loyaltyTierSetting.findMany({ where: { storeId: sid }, orderBy: { sortOrder: 'asc' } });
  }

  async saveLoyaltyTier(dto: LoyaltyTierDto) {
    const tier = await this.prisma.loyaltyTierSetting.upsert({
      where: { storeId_key: { storeId: storeId(), key: dto.key } },
      create: { ...dto, storeId: storeId(), benefits: json(dto.benefits), rewardCouponCode: dto.rewardCouponCode?.trim().toUpperCase() || null },
      update: { ...dto, benefits: json(dto.benefits), rewardCouponCode: dto.rewardCouponCode?.trim().toUpperCase() || null },
    });
    await this.recalculateLoyalty();
    return tier;
  }

  private async recalculateLoyalty() {
    const sid = storeId();
    const tiers = await this.prisma.loyaltyTierSetting.findMany({ where: { storeId: sid, isActive: true }, orderBy: { minSpend: 'asc' } });
    if (!tiers.length) return;
    const totals = await this.prisma.order.groupBy({ by: ['userId'], where: { storeId: sid, status: 'COMPLETED', userId: { not: null } }, _sum: { total: true } });
    for (const item of totals) {
      if (!item.userId) continue;
      const spent = item._sum.total ?? 0;
      const tier = [...tiers].reverse().find((x) => spent >= x.minSpend) ?? tiers[0];
      await this.prisma.loyaltyAccount.upsert({ where: { storeId_userId: { storeId: sid, userId: item.userId } }, create: { storeId: sid, userId: item.userId, tier: tier.key }, update: { tier: tier.key } });
      if (tier.rewardCouponCode) {
        const coupon = await this.prisma.coupon.findUnique({ where: { storeId_code: { storeId: sid, code: tier.rewardCouponCode } } });
        if (coupon) await this.prisma.couponRecipient.upsert({ where: { couponId_userId: { couponId: coupon.id, userId: item.userId } }, create: { couponId: coupon.id, userId: item.userId }, update: {} });
      }
    }
  }

  listPromotions() { return this.prisma.promotion.findMany({ where: scope(), orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }] }); }
  async savePromotion(id: number | null, dto: PromotionDto) {
    const data = { ...dto, code: dto.code.trim().toUpperCase(), rules: json(dto.rules), actions: json(dto.actions), startsAt: dto.startsAt ? new Date(dto.startsAt) : null, endsAt: dto.endsAt ? new Date(dto.endsAt) : null };
    if (!id) return this.prisma.promotion.create({ data: { ...data, storeId: storeId() } });
    const existing = await this.prisma.promotion.findFirst({ where: { id, ...scope() } });
    if (!existing) throw new NotFoundException('Không tìm thấy khuyến mãi');
    return this.prisma.promotion.update({ where: { id }, data });
  }
  removePromotion(id: number) { return this.prisma.promotion.deleteMany({ where: { id, ...scope() } }); }

  listSegments() { return this.prisma.customerSegment.findMany({ where: scope(), orderBy: { createdAt: 'desc' } }); }
  async saveSegment(id: number | null, dto: SegmentDto) {
    const data = { name: dto.name, description: dto.description, rules: json(dto.rules) };
    if (id && !await this.prisma.customerSegment.findFirst({ where: { id, ...scope() } })) throw new NotFoundException('Không tìm thấy phân khúc');
    const segment = id ? await this.prisma.customerSegment.update({ where: { id }, data }) : await this.prisma.customerSegment.create({ data: { ...data, storeId: storeId() } });
    const count = await this.segmentUsers(segment.storeId, dto.rules).then((x) => x.length);
    return this.prisma.customerSegment.update({ where: { id: segment.id }, data: { memberCount: count } });
  }
  private async segmentUsers(sid: number, rules: any) {
    const users = await this.prisma.user.findMany({ where: { orders: { some: { storeId: sid, status: 'COMPLETED' } } }, select: { id: true } });
    const ids: number[] = [];
    for (const u of users) {
      const agg = await this.prisma.order.aggregate({ where: { storeId: sid, userId: u.id, status: 'COMPLETED' }, _sum: { total: true }, _count: true, _max: { createdAt: true } });
      const days = agg._max.createdAt ? (Date.now() - agg._max.createdAt.getTime()) / 86400000 : 99999;
      if ((agg._sum.total ?? 0) >= Number(rules.minSpent ?? 0) && agg._count >= Number(rules.minOrders ?? 0) && days >= Number(rules.inactiveDays ?? 0)) ids.push(u.id);
    }
    return ids;
  }
  listCampaigns() { return this.prisma.marketingCampaign.findMany({ where: scope(), orderBy: { createdAt: 'desc' } }); }
  async saveCampaign(dto: CampaignDto, actorId: number) {
    await assertPlanLimit(this.prisma, storeId(), 'campaignsMonthly');
    return this.prisma.marketingCampaign.create({ data: { ...dto, storeId: storeId(), createdById: actorId, triggerData: dto.triggerData ? json(dto.triggerData) : undefined, scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined } });
  }
  async sendCampaign(id: number) {
    const campaign = await this.prisma.marketingCampaign.findFirst({ where: { id, ...scope() } });
    if (!campaign || !['DRAFT', 'SCHEDULED'].includes(campaign.status)) throw new BadRequestException('Chiến dịch không thể gửi');
    let ids: number[];
    if (campaign.segmentId) {
      const segment = await this.prisma.customerSegment.findFirstOrThrow({ where: { id: campaign.segmentId, storeId: campaign.storeId } });
      ids = await this.segmentUsers(campaign.storeId, segment.rules);
    } else ids = (await this.prisma.user.findMany({ where: { orders: { some: { storeId: campaign.storeId } } }, select: { id: true } })).map((x) => x.id);
    await this.notifications.notify(ids, { type: 'SYSTEM', title: campaign.subject || campaign.name, body: campaign.content, data: { campaignId: campaign.id, couponCode: campaign.couponCode } });
    return this.prisma.marketingCampaign.update({ where: { id }, data: { status: 'SENT', sentAt: new Date(), totalCount: ids.length, sentCount: ids.length } });
  }

  async listAudit(q: any) {
    const { skip, take, page, limit } = paginate(q.page, q.limit);
    let retainedSince: Date | undefined;
    if (!isAllStores()) {
      const store = await this.prisma.store.findUnique({ where: { id: storeId() }, include: { plan: true } });
      if (store?.plan?.auditRetentionDays) retainedSince = new Date(Date.now() - store.plan.auditRetentionDays * 86400000);
    }
    const where: Prisma.AuditLogWhereInput = { ...(isAllStores() ? {} : { storeId: storeId() }), ...(retainedSince && { createdAt: { gte: retainedSince } }), ...(q.action && { action: q.action }), ...(q.entity && { entity: { contains: q.entity } }) };
    return Promise.all([this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }), this.prisma.auditLog.count({ where })]).then(([items, total]) => paged(items.map((x) => ({ ...x, id: x.id.toString() })), total, page, limit));
  }
}
