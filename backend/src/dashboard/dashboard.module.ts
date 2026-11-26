import { Controller, Get, Injectable, Module, Query } from '@nestjs/common';
import { AdminOnly } from '../common/decorators';
import { scope } from '../common/tenant';
import { PrismaService } from '../prisma/prisma.service';
import { vnDayKey, vnToday } from '../common/vn-time';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async overview(days = 7) {
    const sc = scope();
    // Mốc ngày theo giờ Việt Nam (server chạy UTC)
    const since = vnToday(days - 1);
    const startOfToday = vnToday();

    const [revenue, todayRevenue, orderCount, todayOrders, customers, products, byStatus, recent, topProducts, lowStock, recentOrders] =
      await Promise.all([
        this.prisma.order.aggregate({ where: { ...sc, status: 'COMPLETED' }, _sum: { total: true } }),
        this.prisma.order.aggregate({ where: { ...sc, status: { not: 'CANCELLED' }, createdAt: { gte: startOfToday } }, _sum: { total: true } }),
        this.prisma.order.count({ where: { ...sc } }),
        this.prisma.order.count({ where: { ...sc, createdAt: { gte: startOfToday } } }),
        // khách hàng của cửa hàng = khách đã từng đặt đơn tại cửa hàng
        this.prisma.order.groupBy({ by: ['userId'], where: { ...sc, userId: { not: null } } }).then((r) => r.length),
        this.prisma.product.count({ where: { ...sc, isActive: true } }),
        this.prisma.order.groupBy({ by: ['status'], where: { ...sc }, _count: { _all: true } }),
        this.prisma.order.findMany({
          where: { ...sc, createdAt: { gte: since } },
          select: { total: true, subtotal: true, discount: true, shippingFee: true, status: true, createdAt: true },
        }),
        this.prisma.orderItem.groupBy({
          by: ['productId', 'productName'],
          where: { order: { ...sc, status: { not: 'CANCELLED' } } },
          _sum: { quantity: true, total: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 5,
        }),
        this.prisma.productVariant.findMany({
          where: { ...sc, isActive: true, stock: { lte: this.prisma.productVariant.fields.lowStockThreshold } },
          orderBy: { stock: 'asc' },
          take: 10,
          select: { id: true, sku: true, name: true, stock: true, lowStockThreshold: true, product: { select: { name: true } } },
        }),
        this.prisma.order.findMany({ where: { ...sc }, orderBy: { createdAt: 'desc' }, take: 8, include: { store: { select: { id: true, name: true } } } }),
      ]);

    // Gom theo ngày (giờ VN), lấp đủ các ngày không có đơn.
    // revenue = tổng tiền đơn KHÔNG huỷ (gồm phí ship, đã trừ giảm giá) – cùng cách tính với "Doanh thu hôm nay"
    type Bucket = { revenue: number; goods: number; shipping: number; discount: number; orders: number; cancelled: number; completed: number };
    const empty = (): Bucket => ({ revenue: 0, goods: 0, shipping: 0, discount: 0, orders: 0, cancelled: 0, completed: 0 });
    const buckets = new Map<string, Bucket>();
    for (const o of recent) {
      const k = vnDayKey(o.createdAt);
      const b = buckets.get(k) ?? empty();
      if (o.status === 'CANCELLED') b.cancelled += 1;
      else {
        b.orders += 1;
        b.revenue += o.total;
        b.goods += o.subtotal - o.discount;
        b.shipping += o.shippingFee;
        b.discount += o.discount;
        if (o.status === 'COMPLETED') b.completed += 1;
      }
      buckets.set(k, b);
    }
    const chart = Array.from({ length: days }, (_, i) => {
      const k = vnDayKey(new Date(since.getTime() + i * 86_400_000));
      return { date: k, ...(buckets.get(k) ?? empty()) };
    });

    return {
      stats: {
        revenue: revenue._sum.total ?? 0,
        todayRevenue: todayRevenue._sum.total ?? 0,
        orders: orderCount,
        todayOrders,
        customers,
        products,
      },
      ordersByStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
      chart,
      topProducts: topProducts.map((t) => ({
        productId: t.productId, productName: t.productName, quantity: t._sum.quantity ?? 0, revenue: t._sum.total ?? 0,
      })),
      lowStock: lowStock.map(({ product, ...v }) => ({ ...v, productName: product.name })),
      recentOrders,
    };
  }
}

@Controller('admin/dashboard')
@AdminOnly()
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get() overview(@Query('days') days?: string) {
    return this.service.overview(Math.min(90, Math.max(1, Number(days) || 7)));
  }
}

@Module({ controllers: [DashboardController], providers: [DashboardService] })
export class DashboardModule {}
