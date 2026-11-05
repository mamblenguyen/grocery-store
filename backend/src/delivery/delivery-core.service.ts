import { Injectable, Logger } from '@nestjs/common';
import { distanceKm } from '../common/geo';
import { NotificationsService } from '../notifications/notifications.module';
import { PrismaService } from '../prisma/prisma.service';

/** Phí tối thiểu trả cho tài xế khi đơn được miễn phí ship (sàn bù) */
export const MIN_SHIPPER_FEE = Number(process.env.SHIPPER_MIN_FEE ?? 15000);
/** Mỗi tài xế nhận tối đa bao nhiêu đơn cùng lúc (ghép đơn) */
export const MAX_ACTIVE_PER_SHIPPER = Number(process.env.SHIPPER_MAX_ACTIVE ?? 3);

export const ACTIVE_STATUSES = ['ASSIGNED', 'PICKED_UP'] as const;

/** Tạo / huỷ chuyến giao hàng theo vòng đời đơn – dùng chung cho đơn hàng & tài xế */
@Injectable()
export class DeliveryCoreService {
  private log = new Logger('Delivery');
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  /** Đơn online được xác nhận → mở chuyến chờ tài xế nhận (hoặc mở lại nếu chuyến trước thất bại / bị huỷ) */
  async requestFor(orderId: number) {
    const o = await this.prisma.order.findUnique({ where: { id: orderId }, include: { store: true, delivery: true } });
    if (!o || o.channel !== 'ONLINE' || ['CANCELLED', 'COMPLETED'].includes(o.status)) return null;
    if (o.delivery && !['FAILED', 'CANCELLED'].includes(o.delivery.status)) return o.delivery;
    const data = {
      storeId: o.storeId,
      fee: Math.max(o.shippingFee, MIN_SHIPPER_FEE),
      codAmount: o.paymentStatus === 'PAID' ? 0 : o.total,
      pickupAddress: o.store.address || o.store.name,
      pickupLat: o.store.lat, pickupLng: o.store.lng,
      dropoffAddress: o.address,
      dropoffLat: o.dropoffLat, dropoffLng: o.dropoffLng,
      distanceKm: distanceKm(o.store, { lat: o.dropoffLat, lng: o.dropoffLng }),
      status: 'WAITING' as const, shipperId: null, assignedAt: null, pickedUpAt: null, deliveredAt: null, failedAt: null, failReason: null,
      shipperLat: null, shipperLng: null, shipperLocAt: null,
    };
    const d = o.delivery
      ? await this.prisma.delivery.update({ where: { id: o.delivery.id }, data })
      : await this.prisma.delivery.create({ data: { ...data, orderId } });
    // Báo cho tài xế đang trực tuyến
    const online = await this.prisma.user.findMany({ where: { role: 'SHIPPER', isActive: true, shipperProfile: { isOnline: true } }, select: { id: true } });
    this.notifications.notify(online.map((u) => u.id), {
      type: 'SYSTEM', title: '🛵 Có đơn giao mới',
      body: `${o.store.name} → ${o.address.slice(0, 60)} · thu nhập ${d.fee.toLocaleString('vi-VN')}₫${d.distanceKm != null ? ` · ${d.distanceKm} km` : ''}`,
      data: { deliveryId: d.id, url: '/shipper' },
    }).catch((e) => this.log.warn(e.message));
    return d;
  }

  /** Đơn bị huỷ → huỷ chuyến (báo tài xế nếu đã nhận) */
  async cancelFor(orderId: number, reason = 'Đơn hàng đã bị huỷ') {
    const d = await this.prisma.delivery.findUnique({ where: { orderId }, include: { order: { select: { code: true } } } });
    if (!d || ['DELIVERED', 'CANCELLED'].includes(d.status)) return;
    await this.prisma.delivery.update({ where: { id: d.id }, data: { status: 'CANCELLED', failReason: reason } });
    if (d.shipperId)
      this.notifications.notify([d.shipperId], { type: 'SYSTEM', title: `Đơn ${d.order.code} đã huỷ`, body: reason, data: { deliveryId: d.id, url: '/shipper' } })
        .catch(() => {});
  }
}
