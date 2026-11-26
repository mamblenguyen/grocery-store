import { Injectable, Logger } from '@nestjs/common';
import { distanceKm } from '../common/geo';
import { PlatformService } from '../common/platform';
import { roadKm, shipperPay } from '../common/shipping';
import { deliveryPlace, inAreas, readAreas } from '../geo/vn-address';
import { NotificationsService } from '../notifications/notifications.module';
import { PrismaService } from '../prisma/prisma.service';

/** Phí tối thiểu trả cho tài xế (kể cả khi đơn được miễn phí ship – cửa hàng chịu phần này) */

/**
 * Thanh toán trực tiếp giữa tài xế và cửa hàng (tiền không đi qua sàn):
 * - Đơn đã trả trước (chuyển khoản/VNPay): tiền ship nằm ở cửa hàng → cửa hàng trả `fee` cho tài xế khi giao hàng cho tài xế.
 * - Đơn COD: tài xế thu `codAmount` của khách, giữ lại `fee`, nộp `codAmount - fee` cho cửa hàng.
 *   (Hiếm: tiền thu hộ nhỏ hơn phí → cửa hàng trả thêm phần chênh.)
 */
export function settlement(d: { fee: number; codAmount: number }) {
  const net = d.codAmount - d.fee;
  return {
    /** tài xế thu của khách */
    collect: d.codAmount,
    /** cửa hàng trả tài xế khi lấy hàng */
    storePaysShipper: net < 0 ? -net : 0,
    /** tài xế nộp lại cửa hàng sau khi giao */
    shipperPaysStore: net > 0 ? net : 0,
  };
}
/** Mỗi tài xế nhận tối đa bao nhiêu đơn cùng lúc (ghép đơn) */
export const MAX_ACTIVE_PER_SHIPPER = Number(process.env.SHIPPER_MAX_ACTIVE ?? 3);

export const ACTIVE_STATUSES = ['ASSIGNED', 'PICKED_UP'] as const;

/** Tạo / huỷ chuyến giao hàng theo vòng đời đơn – dùng chung cho đơn hàng & tài xế */
@Injectable()
export class DeliveryCoreService {
  private log = new Logger('Delivery');
  constructor(private prisma: PrismaService, private notifications: NotificationsService, private platform: PlatformService) {}

  /** Đơn online được xác nhận → mở chuyến chờ tài xế nhận (hoặc mở lại nếu chuyến trước thất bại / bị huỷ) */
  async requestFor(orderId: number) {
    const o = await this.prisma.order.findUnique({ where: { id: orderId }, include: { store: true, delivery: true } });
    if (!o || o.channel !== 'ONLINE' || ['CANCELLED', 'COMPLETED'].includes(o.status)) return null;
    if (o.delivery && !['FAILED', 'CANCELLED'].includes(o.delivery.status)) return o.delivery;
    const tariff = (await this.platform.get()).delivery;
    const dropoff = { lat: o.dropoffLat, lng: o.dropoffLng };
    // Quãng đường: đã chốt lúc đặt đơn (phí theo km) hoặc ước tính lại từ toạ độ
    const km = o.shippingKm ?? roadKm(o.store, dropoff, tariff);
    const data = {
      storeId: o.storeId,
      // Thu nhập tài xế theo quãng đường (kể cả khi khách được miễn phí ship – cửa hàng chịu phần này)
      fee: km != null ? shipperPay(km, o.shippingFee, tariff) : Math.max(o.shippingFee, tariff.shipperMinFee),
      codAmount: o.paymentStatus === 'PAID' ? 0 : o.total,
      pickupAddress: o.store.address || o.store.name,
      pickupLat: o.store.lat, pickupLng: o.store.lng,
      dropoffAddress: o.address,
      dropoffLat: o.dropoffLat, dropoffLng: o.dropoffLng,
      distanceKm: km ?? distanceKm(o.store, dropoff),
      status: 'WAITING' as const, shipperId: null, assignedAt: null, pickedUpAt: null, deliveredAt: null, failedAt: null, failReason: null,
      shipperLat: null, shipperLng: null, shipperLocAt: null,
    };
    const d = o.delivery
      ? await this.prisma.delivery.update({ where: { id: o.delivery.id }, data })
      : await this.prisma.delivery.create({ data: { ...data, orderId } });
    await this.notifyShippers(d.id).catch((e) => this.log.warn(e.message));
    return d;
  }

  /** Báo đơn mới cho tài xế đang trực tuyến có vùng hoạt động chứa cửa hàng (hoặc địa chỉ giao nếu cửa hàng chưa khai báo vùng) */
  async notifyShippers(deliveryId: number, exclude: number[] = []) {
    const d = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        store: { select: { name: true, provinceCode: true, districtCode: true, wardCode: true } },
        order: { select: { provinceCode: true, districtCode: true, wardCode: true } },
      },
    });
    if (!d || d.status !== 'WAITING') return;
    const online = await this.prisma.user.findMany({
      where: { role: 'SHIPPER', isActive: true, id: { notIn: exclude }, shipperProfile: { isOnline: true } },
      select: { id: true, shipperProfile: { select: { areas: true } } },
    });
    const ids = online.filter((u) => inAreas(readAreas(u.shipperProfile?.areas), deliveryPlace(d.store, d.order))).map((u) => u.id);
    if (!ids.length) return;
    await this.notifications.notify(ids, {
      type: 'SYSTEM', title: '🛵 Có đơn giao mới',
      body: `${d.store.name} → ${d.dropoffAddress.slice(0, 60)} · thu nhập ${d.fee.toLocaleString('vi-VN')}₫${d.distanceKm != null ? ` · ${d.distanceKm} km` : ''}`,
      data: { deliveryId: d.id, url: '/shipper' },
    });
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
