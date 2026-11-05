import { Controller, Get, Injectable, Module, Query } from '@nestjs/common';
import { AdminOnly } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async overview(days = 7) {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [revenue, todayRevenue, orderCount, todayOrders, customers, products, byStatus, daily, topProducts, lowStock, recentOrders] =
      await Promise.all([
        this.prisma.order.aggregate({ where: { status: 'COMPLETED' }, _sum: { total: true } }),
        this.prisma.order.aggregate({ where: { status: { not: 'CANCELLED' }, createdAt: { gte: startOfToday } }, _sum: { total: true } }),
        this.prisma.order.count(),
        this.prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
        this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
        this.prisma.product.count({ where: { isActive: true } }),
        this.prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
        this.prisma.$queryRaw<{ day: Date; revenue: bigint; orders: bigint }[]>`
          SELECT date_trunc('day', "createdAt") AS day,
                 COALESCE(SUM(total) FILTER (WHERE status <> 'CANCELLED'), 0)::bigint AS revenue,
                 COUNT(*)::bigint AS orders
          FROM "Order" WHERE "createdAt" >= ${since}
          GROUP BY 1 ORDER BY 1`,
        this.prisma.orderItem.groupBy({
          by: ['productId', 'productName'],
          where: { order: { status: { not: 'CANCELLED' } } },
          _sum: { quantity: true, total: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 5,
        }),
        this.prisma.$queryRaw<any[]>`
          SELECT v.id, v.sku, v.name, v.stock, v."lowStockThreshold", p.name AS "productName"
          FROM "ProductVariant" v JOIN "Product" p ON p.id = v."productId"
          WHERE v."isActive" AND v.stock <= v."lowStockThreshold"
          ORDER BY v.stock ASC LIMIT 10`,
        this.prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
      ]);

    // Lấp đủ các ngày không có đơn
    const chart = Array.from({ length: days }, (_, i) => {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const row = daily.find((r) => new Date(r.day).toDateString() === d.toDateString());
      return { date: d.toISOString().slice(0, 10), revenue: Number(row?.revenue ?? 0), orders: Number(row?.orders ?? 0) };
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
      lowStock,
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
