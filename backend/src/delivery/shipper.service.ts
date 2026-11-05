import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryStatus, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { distanceKm, etaMinutes } from '../common/geo';
import { scope } from '../common/tenant';
import { paged, paginate } from '../common/utils';
import { NotificationsService } from '../notifications/notifications.module';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryCoreService, MAX_ACTIVE_PER_SHIPPER } from './delivery-core.service';

const jobInclude = {
  store: { select: { id: true, name: true, slug: true, phone: true, address: true, lat: true, lng: true } },
  order: {
    select: {
      id: true, code: true, customerName: true, phone: true, address: true, note: true, total: true, paymentMethod: true,
      paymentStatus: true, deliveryDate: true, deliverySlot: true, status: true, createdAt: true,
      items: { select: { id: true, productName: true, variantName: true, quantity: true, image: true, sku: true } },
    },
  },
} satisfies Prisma.DeliveryInclude;

const profileSelect = {
  id: true, email: true, fullName: true, phone: true, isActive: true, createdAt: true,
  shipperProfile: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class ShipperService {
  constructor(
    private prisma: PrismaService,
    private orders: OrdersService,
    private core: DeliveryCoreService,
    private notifications: NotificationsService,
  ) {}

  private profile(userId: number) {
    return this.prisma.shipperProfile.upsert({ where: { userId }, create: { userId }, update: {} });
  }

  // ───────────── Tài xế ─────────────
  async me(userId: number) {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const [user, profile, today, active, cod] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, fullName: true, email: true, phone: true } }),
      this.profile(userId),
      this.prisma.delivery.aggregate({ where: { shipperId: userId, status: 'DELIVERED', deliveredAt: { gte: start } }, _sum: { fee: true }, _count: true }),
      this.prisma.delivery.count({ where: { shipperId: userId, status: { in: ['ASSIGNED', 'PICKED_UP'] } } }),
      this.prisma.delivery.aggregate({ where: { shipperId: userId, status: 'DELIVERED', deliveredAt: { gte: start } }, _sum: { codAmount: true } }),
    ]);
    const total = await this.prisma.delivery.aggregate({ where: { shipperId: userId, status: 'DELIVERED' }, _sum: { fee: true }, _count: true });
    return {
      ...user, profile,
      stats: {
        todayTrips: today._count, todayEarnings: today._sum.fee ?? 0, todayCod: cod._sum.codAmount ?? 0,
        active, totalTrips: total._count, totalEarnings: total._sum.fee ?? 0,
      },
    };
  }

  async updateMe(userId: number, dto: { isOnline?: boolean; lat?: number; lng?: number; vehicleType?: string; plateNumber?: string; area?: string }) {
    await this.profile(userId);
    const p = await this.prisma.shipperProfile.update({
      where: { userId },
      data: {
        isOnline: dto.isOnline, vehicleType: dto.vehicleType, plateNumber: dto.plateNumber, area: dto.area,
        ...(dto.lat != null && dto.lng != null && { lat: dto.lat, lng: dto.lng, locationAt: new Date() }),
      },
    });
    if (dto.lat != null && dto.lng != null) await this.pushLocation(userId, dto.lat, dto.lng);
    return p;
  }

  /** Cập nhật vị trí (gọi định kỳ từ app/web tài xế) → khách thấy tài xế trên bản đồ */
  async location(userId: number, lat: number, lng: number) {
    await this.profile(userId);
    await this.prisma.shipperProfile.update({ where: { userId }, data: { lat, lng, locationAt: new Date() } });
    await this.pushLocation(userId, lat, lng);
    return { ok: true };
  }

  private pushLocation(userId: number, lat: number, lng: number) {
    return this.prisma.delivery.updateMany({
      where: { shipperId: userId, status: { in: ['ASSIGNED', 'PICKED_UP'] } },
      data: { shipperLat: lat, shipperLng: lng, shipperLocAt: new Date() },
    });
  }

  /** Đơn đang chờ tài xế – sắp theo khoảng cách từ tài xế tới cửa hàng */
  async jobs(userId: number, q: { lat?: number; lng?: number; radiusKm?: number }) {
    const me = await this.profile(userId);
    const at = q.lat != null && q.lng != null ? { lat: q.lat, lng: q.lng } : { lat: me.lat, lng: me.lng };
    const rows = await this.prisma.delivery.findMany({
      where: { status: 'WAITING', store: { status: 'ACTIVE' }, order: { status: { in: ['CONFIRMED', 'SHIPPING'] } } },
      include: jobInclude, orderBy: { createdAt: 'asc' }, take: 100,
    });
    const radius = q.radiusKm ?? 0;
    return rows
      .map((d) => {
        const toPickup = distanceKm(at, d.store);
        return { ...this.view(d), toPickupKm: toPickup, etaPickupMin: etaMinutes(toPickup) };
      })
      .filter((d) => !radius || d.toPickupKm == null || d.toPickupKm <= radius)
      .sort((a, b) => (a.toPickupKm ?? 1e9) - (b.toPickupKm ?? 1e9));
  }

  /** Ẩn bớt thông tin khách khi chưa nhận đơn */
  private view(d: Prisma.DeliveryGetPayload<{ include: typeof jobInclude }>, full = false) {
    const o = d.order;
    return {
      ...d,
      order: full ? o : { ...o, phone: o.phone.replace(/\d(?=\d{3})/g, '•'), customerName: o.customerName.split(' ').slice(-1)[0] },
      itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
    };
  }

  async accept(userId: number, id: number) {
    const active = await this.prisma.delivery.count({ where: { shipperId: userId, status: { in: ['ASSIGNED', 'PICKED_UP'] } } });
    if (active >= MAX_ACTIVE_PER_SHIPPER) throw new BadRequestException(`Bạn đang giao ${active} đơn – tối đa ${MAX_ACTIVE_PER_SHIPPER} đơn cùng lúc`);
    const me = await this.profile(userId);
    // Nhận đơn kiểu "ai nhanh người đó được" – chỉ 1 tài xế cập nhật thành công
    const r = await this.prisma.delivery.updateMany({
      where: { id, status: 'WAITING', shipperId: null },
      data: { status: 'ASSIGNED', shipperId: userId, assignedAt: new Date(), shipperLat: me.lat, shipperLng: me.lng, shipperLocAt: me.locationAt },
    });
    if (!r.count) throw new ConflictException('Đơn đã có tài xế khác nhận hoặc không còn khả dụng');
    const d = await this.detail(userId, id);
    const shipper = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { fullName: true, phone: true } });
    const veh = me.plateNumber ? ` (${me.plateNumber})` : '';
    this.notifications.notifyStaff(d.storeId, {
      type: 'SYSTEM', title: `🛵 Tài xế đã nhận đơn ${d.order.code}`, body: `${shipper.fullName}${veh} · ${shipper.phone ?? ''} đang đến lấy hàng`,
      data: { orderId: d.order.id, url: `/admin/orders/${d.order.id}` },
    }).catch(() => {});
    const order = await this.prisma.order.findUnique({ where: { id: d.order.id }, select: { userId: true } });
    if (order?.userId)
      this.notifications.notify([order.userId], {
        type: 'ORDER_STATUS', title: `Đơn ${d.order.code} đã có tài xế`, body: `${shipper.fullName}${veh} đang đến cửa hàng lấy hàng cho bạn`,
        data: { orderId: d.order.id, url: `/orders/${d.order.id}` },
      }).catch(() => {});
    return d;
  }

  async mine(userId: number, q: { status?: 'active' | 'history'; page?: number; limit?: number }) {
    const { skip, take, page, limit } = paginate(q.page, q.limit);
    const where: Prisma.DeliveryWhereInput = {
      shipperId: userId,
      status: q.status === 'history' ? { in: ['DELIVERED', 'FAILED', 'CANCELLED'] } : { in: ['ASSIGNED', 'PICKED_UP'] },
    };
    const [rows, total] = await Promise.all([
      this.prisma.delivery.findMany({ where, include: jobInclude, orderBy: { updatedAt: 'desc' }, skip, take }),
      this.prisma.delivery.count({ where }),
    ]);
    return paged(rows.map((d) => this.view(d, true)), total, page, limit);
  }

  async detail(userId: number, id: number) {
    const d = await this.prisma.delivery.findUnique({ where: { id }, include: jobInclude });
    if (!d || (d.shipperId !== userId && d.status !== 'WAITING')) throw new NotFoundException('Không tìm thấy chuyến giao');
    return this.view(d, d.shipperId === userId);
  }

  private async own(userId: number, id: number, allowed: DeliveryStatus[]) {
    const d = await this.prisma.delivery.findUnique({ where: { id }, include: { order: true } });
    if (!d || d.shipperId !== userId) throw new NotFoundException('Không tìm thấy chuyến giao của bạn');
    if (!allowed.includes(d.status)) throw new BadRequestException('Thao tác không hợp lệ với trạng thái hiện tại của chuyến');
    return d;
  }

  /** Đã lấy hàng tại cửa hàng → đơn chuyển "Đang giao" */
  async pickup(userId: number, id: number) {
    const d = await this.own(userId, id, ['ASSIGNED']);
    await this.prisma.delivery.update({ where: { id }, data: { status: 'PICKED_UP', pickedUpAt: new Date() } });
    if (d.order.status === 'CONFIRMED') await this.orders.updateStatus(d.orderId, 'SHIPPING', userId, undefined, false);
    this.notifications.notifyStaff(d.storeId, { type: 'SYSTEM', title: `Tài xế đã lấy hàng đơn ${d.order.code}`, body: 'Đơn đang trên đường giao tới khách', data: { orderId: d.orderId, url: `/admin/orders/${d.orderId}` } }).catch(() => {});
    return this.detail(userId, id);
  }

  /** Giao thành công (đã thu COD nếu có) → đơn hoàn thành & đã thanh toán */
  async complete(userId: number, id: number) {
    const d = await this.own(userId, id, ['PICKED_UP']);
    await this.prisma.delivery.update({ where: { id }, data: { status: 'DELIVERED', deliveredAt: new Date() } });
    if (d.order.status === 'SHIPPING') await this.orders.updateStatus(d.orderId, 'COMPLETED', userId, undefined, false);
    this.notifications.notifyStaff(d.storeId, {
      type: 'SYSTEM', title: `✅ Đã giao đơn ${d.order.code}`,
      body: d.codAmount ? `Tài xế đã thu hộ ${d.codAmount.toLocaleString('vi-VN')}₫` : 'Đơn đã thanh toán trước',
      data: { orderId: d.orderId, url: `/admin/orders/${d.orderId}` },
    }).catch(() => {});
    return this.detail(userId, id);
  }

  /** Giao thất bại (khách không nghe máy, sai địa chỉ…) → cửa hàng xử lý tiếp */
  async fail(userId: number, id: number, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('Nhập lý do giao không thành công');
    const d = await this.own(userId, id, ['PICKED_UP']);
    await this.prisma.delivery.update({ where: { id }, data: { status: 'FAILED', failedAt: new Date(), failReason: reason.trim() } });
    this.notifications.notifyStaff(d.storeId, {
      type: 'SYSTEM', title: `⚠️ Giao không thành công đơn ${d.order.code}`, body: `${reason.trim()} – tài xế sẽ mang hàng về cửa hàng`,
      data: { orderId: d.orderId, url: `/admin/orders/${d.orderId}` },
    }).catch(() => {});
    return this.detail(userId, id);
  }

  /** Trả đơn khi chưa lấy hàng → đơn quay lại hàng chờ cho tài xế khác */
  async release(userId: number, id: number) {
    const d = await this.own(userId, id, ['ASSIGNED']);
    await this.prisma.delivery.update({ where: { id }, data: { status: 'WAITING', shipperId: null, assignedAt: null } });
    await this.core.requestFor(d.orderId).catch(() => null);
    return { ok: true };
  }

  // ───────────── Cửa hàng ─────────────
  async storeRequest(orderId: number) {
    const o = await this.prisma.order.findFirst({ where: { id: orderId, ...scope() } });
    if (!o) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (o.channel !== 'ONLINE') throw new BadRequestException('Đơn bán tại quầy không cần giao hàng');
    if (!['CONFIRMED', 'SHIPPING'].includes(o.status)) throw new BadRequestException('Xác nhận đơn trước khi gọi tài xế');
    const d = await this.core.requestFor(orderId);
    if (!d) throw new BadRequestException('Không thể gọi tài xế cho đơn này');
    return this.orders.findOne(orderId);
  }

  async storeCancel(orderId: number) {
    const d = await this.prisma.delivery.findFirst({ where: { orderId, order: scope() } });
    if (!d) throw new NotFoundException('Đơn chưa gọi tài xế');
    if (d.status === 'PICKED_UP') throw new ForbiddenException('Tài xế đã lấy hàng – không thể huỷ chuyến');
    await this.core.cancelFor(orderId, 'Cửa hàng huỷ gọi tài xế');
    return this.orders.findOne(orderId);
  }

  // ───────────── Super admin ─────────────
  async listShippers(q: { page?: number; limit?: number; search?: string }) {
    const { skip, take, page, limit } = paginate(q.page, q.limit);
    const where: Prisma.UserWhereInput = {
      role: 'SHIPPER',
      ...(q.search && { OR: [{ fullName: { contains: q.search } }, { phone: { contains: q.search } }, { email: { contains: q.search } }, { shipperProfile: { plateNumber: { contains: q.search } } }] }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, select: profileSelect }),
      this.prisma.user.count({ where }),
    ]);
    const stats = await this.prisma.delivery.groupBy({ by: ['shipperId', 'status'], where: { shipperId: { in: rows.map((r) => r.id) } }, _count: true, _sum: { fee: true } });
    const items = rows.map((r) => {
      const mine = stats.filter((s) => s.shipperId === r.id);
      const done = mine.find((s) => s.status === 'DELIVERED');
      return {
        ...r,
        stats: {
          delivered: done?._count ?? 0, earnings: done?._sum.fee ?? 0,
          failed: mine.find((s) => s.status === 'FAILED')?._count ?? 0,
          active: mine.filter((s) => s.status === 'ASSIGNED' || s.status === 'PICKED_UP').reduce((n, s) => n + s._count, 0),
        },
      };
    });
    return paged(items, total, page, limit);
  }

  async createShipper(dto: { email: string; password: string; fullName: string; phone: string; vehicleType?: string; plateNumber?: string; idNumber?: string; area?: string }) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('Email đã được sử dụng');
    return this.prisma.user.create({
      data: {
        email, password: await bcrypt.hash(dto.password, 10), fullName: dto.fullName, phone: dto.phone, role: 'SHIPPER',
        shipperProfile: { create: { vehicleType: dto.vehicleType ?? 'XE_MAY', plateNumber: dto.plateNumber, idNumber: dto.idNumber, area: dto.area } },
      },
      select: profileSelect,
    });
  }

  async updateShipper(id: number, dto: { fullName?: string; phone?: string; isActive?: boolean; password?: string; vehicleType?: string; plateNumber?: string; idNumber?: string; area?: string }) {
    const u = await this.prisma.user.findFirst({ where: { id, role: 'SHIPPER' } });
    if (!u) throw new NotFoundException('Không tìm thấy tài xế');
    await this.profile(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName, phone: dto.phone, isActive: dto.isActive,
        ...(dto.password && { password: await bcrypt.hash(dto.password, 10) }),
        shipperProfile: { update: { vehicleType: dto.vehicleType, plateNumber: dto.plateNumber, idNumber: dto.idNumber, area: dto.area, ...(dto.isActive === false && { isOnline: false }) } },
      },
      select: profileSelect,
    });
  }

  async deliveries(q: { page?: number; limit?: number; status?: DeliveryStatus; shipperId?: number }) {
    const { skip, take, page, limit } = paginate(q.page, q.limit);
    const where: Prisma.DeliveryWhereInput = { ...(q.status && { status: q.status }), ...(q.shipperId && { shipperId: Number(q.shipperId) }) };
    const [items, total] = await Promise.all([
      this.prisma.delivery.findMany({
        where, skip, take, orderBy: { updatedAt: 'desc' },
        include: { ...jobInclude, shipper: { select: { id: true, fullName: true, phone: true } } },
      }),
      this.prisma.delivery.count({ where }),
    ]);
    return paged(items, total, page, limit);
  }
}
