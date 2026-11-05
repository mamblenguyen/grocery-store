import { Controller, Get, Injectable, Module, Query } from '@nestjs/common';
import { AdminOnly } from '../common/decorators';
import { storeId } from '../common/tenant';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async overview(days = 7) {
    const sid = storeId();
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [revenue, todayRevenue, orderCount, todayOrders, customers, products, byStatus, recent, topProducts, lowStock, recentOrders] =
      await Promise.all([
        this.prisma.order.aggregate({ where: { storeId: sid, status: 'COMPLETED' }, _sum: { total: true } }),
        this.prisma.order.aggregate({ where: { storeId: sid, status: { not: 'CANCELLED' }, createdAt: { gte: startOfToday } }, _sum: { total: true } }),
        this.prisma.order.count({ where: { storeId: sid } }),
        this.prisma.order.count({ where: { storeId: sid, createdAt: { gte: startOfToday } } }),
        // khách hàng của cửa hàng = khách đã từng đặt đơn tại cửa hàng
        this.prisma.order.groupBy({ by: ['userId'], where: { storeId: sid, userId: { not: null } } }).then((r) => r.length),
        this.prisma.product.count({ where: { storeId: sid, isActive: true } }),
        this.prisma.order.groupBy({ by: ['status'], where: { storeId: sid }, _count: { _all: true } }),
        this.prisma.order.findMany({
          where: { storeId: sid, createdAt: { gte: since } },
          select: { total: true, status: true, createdAt: true },
        }),
        this.prisma.orderItem.groupBy({
          by: ['productId', 'productName'],
          where: { order: { storeId: sid, status: { not: 'CANCELLED' } } },
          _sum: { quantity: true, total: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 5,
        }),
        this.prisma.productVariant.findMany({
          where: { storeId: sid, isActive: true, stock: { lte: this.prisma.productVariant.fields.lowStockThreshold } },
          orderBy: { stock: 'asc' },
          take: 10,
          select: { id: true, sku: true, name: true, stock: true, lowStockThreshold: true, product: { select: { name: true } } },
        }),
        this.prisma.order.findMany({ where: { storeId: sid }, orderBy: { createdAt: 'desc' }, take: 8 }),
      ]);

    // Gom doanh thu theo ngày (giờ địa phương của server), lấp đủ các ngày không có đơn
    const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const buckets = new Map<string, { revenue: number; orders: number }>();
    for (const o of recent) {
      const k = dayKey(o.createdAt);
      const b = buckets.get(k) ?? { revenue: 0, orders: 0 };
      b.orders += 1;
      if (o.status !== 'CANCELLED') b.revenue += o.total;
      buckets.set(k, b);
    }
    const chart = Array.from({ length: days }, (_, i) => {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const k = dayKey(d);
      return { date: k, ...(buckets.get(k) ?? { revenue: 0, orders: 0 }) };
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
