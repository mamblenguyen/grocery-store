import { Controller, Get, Injectable, Module, Query } from '@nestjs/common';
import { IsDateString, IsIn, IsOptional } from 'class-validator';
import { AdminOnly } from '../common/decorators';
import { storeId } from '../common/tenant';
import { PrismaService } from '../prisma/prisma.service';

class ReportQuery {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsIn(['day', 'month']) groupBy?: 'day' | 'month';
}

type Agg = { revenue: number; cogs: number; profit: number; orders: number; items: number };
const zero = (): Agg => ({ revenue: 0, cogs: 0, profit: 0, orders: 0, items: 0 });

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Báo cáo bán hàng theo đơn HOÀN THÀNH trong kỳ.
   * Doanh thu hàng = tiền hàng − giảm giá (không gồm phí ship). Lợi nhuận gộp = doanh thu hàng − giá vốn.
   * Giảm giá được phân bổ cho từng dòng theo tỉ lệ thành tiền.
   */
  async sales(q: ReportQuery) {
    const to = q.to ? new Date(q.to + 'T23:59:59.999') : new Date();
    const from = q.from ? new Date(q.from + 'T00:00:00') : new Date(to.getFullYear(), to.getMonth(), 1);
    const groupBy = q.groupBy ?? (to.getTime() - from.getTime() > 62 * 86400000 ? 'month' : 'day');
    const orders = await this.prisma.order.findMany({
      where: { storeId: storeId(), status: 'COMPLETED', createdAt: { gte: from, lte: to } },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });
    const productIds = [...new Set(orders.flatMap((o) => o.items.map((i) => i.productId)).filter((x): x is number => !!x))];
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, category: { select: { name: true } } } });
    const catOf = new Map(products.map((p) => [p.id, p.category?.name ?? 'Chưa phân loại']));

    const pad = (n: number) => String(n).padStart(2, '0');
    const keyOf = (d: Date) => (groupBy === 'month' ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}` : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    const series = new Map<string, Agg>();
    for (const d = new Date(from.getFullYear(), from.getMonth(), groupBy === 'month' ? 1 : from.getDate()); d <= to; groupBy === 'month' ? d.setMonth(d.getMonth() + 1) : d.setDate(d.getDate() + 1))
      series.set(keyOf(d), zero());

    const byPayment = new Map<string, Agg>(), byChannel = new Map<string, Agg>(), byCategory = new Map<string, Agg>();
    const byProduct = new Map<string, Agg & { name: string }>();
    const sum = { ...zero(), discount: 0, shipping: 0, missingCost: 0 };
    const add = (m: Map<string, Agg>, k: string, a: Partial<Agg>) => {
      const x = m.get(k) ?? zero();
      (Object.keys(a) as (keyof Agg)[]).forEach((f) => (x[f] += a[f] ?? 0));
      m.set(k, x);
    };

    for (const o of orders) {
      const goods = o.subtotal - o.discount;
      let cogs = 0, qty = 0;
      for (const it of o.items) {
        const share = o.subtotal ? Math.round((it.total / o.subtotal) * goods) : 0;
        const cost = (it.costPrice ?? 0) * it.quantity;
        if (it.costPrice == null) sum.missingCost++;
        cogs += cost; qty += it.quantity;
        add(byCategory, it.productId ? catOf.get(it.productId) ?? 'Khác' : 'Khác', { revenue: share, cogs: cost, profit: share - cost, items: it.quantity });
        const pk = String(it.productId ?? it.productName);
        const p = byProduct.get(pk) ?? { ...zero(), name: it.productName };
        p.revenue += share; p.cogs += cost; p.profit += share - cost; p.items += it.quantity;
        byProduct.set(pk, p);
      }
      const a = { revenue: goods, cogs, profit: goods - cogs, orders: 1, items: qty };
      add(series, keyOf(o.createdAt), a);
      add(byPayment, o.paymentMethod, a);
      add(byChannel, o.channel, a);
      sum.revenue += goods; sum.cogs += cogs; sum.profit += goods - cogs; sum.orders++; sum.items += qty;
      sum.discount += o.discount; sum.shipping += o.shippingFee;
    }
    const list = (m: Map<string, Agg>) => [...m.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.revenue - a.revenue);
    return {
      range: { from: from.toISOString(), to: to.toISOString(), groupBy },
      summary: { ...sum, margin: sum.revenue ? Math.round((sum.profit / sum.revenue) * 1000) / 10 : 0, avgOrderValue: sum.orders ? Math.round(sum.revenue / sum.orders) : 0 },
      series: [...series.entries()].map(([key, v]) => ({ key, ...v })),
      byPaymentMethod: list(byPayment),
      byChannel: list(byChannel),
      byCategory: list(byCategory),
      topProducts: [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 15),
    };
  }
}

@Controller('admin/reports')
@AdminOnly()
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('sales') sales(@Query() q: ReportQuery) {
    return this.service.sales(q);
  }
}

@Module({ controllers: [ReportsController], providers: [ReportsService] })
export class ReportsModule {}
