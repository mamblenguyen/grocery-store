import { BadRequestException, Controller, Get, Injectable, Module, Query } from '@nestjs/common';
import { IsDateString, IsIn, IsOptional } from 'class-validator';
import { AdminOnly } from '../common/decorators';
import { scope, storeId } from '../common/tenant';
import { PrismaService } from '../prisma/prisma.service';
import { vnDate, vnDayKey, vnEndOfDay, vnMonthKey, vnMonthStart, vnParts, vnStartOfDay } from '../common/vn-time';
import { splitVat, VAT_LABEL } from '../common/vat';

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
    // Khoảng ngày tính theo giờ Việt Nam (server chạy UTC)
    const to = q.to ? vnEndOfDay(q.to) : new Date();
    const from = q.from ? vnStartOfDay(q.from) : vnMonthStart(to);
    if (from > to) throw new BadRequestException('Ngày bắt đầu phải trước ngày kết thúc');
    const groupBy = q.groupBy ?? (to.getTime() - from.getTime() > 62 * 86400000 ? 'month' : 'day');
    const orders = await this.prisma.order.findMany({
      where: { ...scope(), status: 'COMPLETED', createdAt: { gte: from, lte: to } },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });
    const productIds = [...new Set(orders.flatMap((o) => o.items.map((i) => i.productId)).filter((x): x is number => !!x))];
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, category: { select: { name: true } } } });
    const catOf = new Map(products.map((p) => [p.id, p.category?.name ?? 'Chưa phân loại']));

    const keyOf = (d: Date) => (groupBy === 'month' ? vnMonthKey(d) : vnDayKey(d));
    const series = new Map<string, Agg>();
    const f = vnParts(from);
    for (let i = 0; ; i++) {
      const d = groupBy === 'month' ? vnDate(f.y, f.m + i, 1) : vnDate(f.y, f.m, f.d + i);
      if (d > to) break;
      series.set(keyOf(d), zero());
    }

    const byPayment = new Map<string, Agg>(), byChannel = new Map<string, Agg>(), byCategory = new Map<string, Agg>();
    const byProduct = new Map<string, Agg & { name: string }>();
    const sum = { ...zero(), discount: 0, shipping: 0, missingCost: 0, missingVat: 0 };
    /** Tổng hợp thuế GTGT theo thuế suất (giá bán đã gồm thuế) – phục vụ đối chiếu kê khai */
    const byVat = new Map<string, { key: string; label: string; revenue: number; preTax: number; vat: number; items: number }>();
    const add = (m: Map<string, Agg>, k: string, a: Partial<Agg>) => {
      const x = m.get(k) ?? zero();
      (Object.keys(a) as (keyof Agg)[]).forEach((f) => (x[f] += a[f] ?? 0));
      m.set(k, x);
    };

    for (const o of orders) {
      const goods = o.subtotal - o.discount;
      let cogs = 0, qty = 0;
      // Phân bổ (tiền hàng − giảm giá) cho từng dòng theo tỉ lệ thành tiền; dòng cuối nhận phần dư làm tròn
      // → tổng theo danh mục / sản phẩm / thuế suất luôn khớp đúng tổng doanh thu
      let allocated = 0;
      for (const [idx, it] of o.items.entries()) {
        const share = idx === o.items.length - 1 ? goods - allocated : o.subtotal ? Math.round((it.total / o.subtotal) * goods) : 0;
        allocated += share;
        const cost = (it.costPrice ?? 0) * it.quantity;
        if (it.costPrice == null) sum.missingCost++;
        if (it.vatRate == null) sum.missingVat++;
        const rate = it.vatRate ?? 'NA';
        const vt = byVat.get(rate) ?? { key: rate, label: VAT_LABEL[rate] ?? 'Chưa khai báo thuế suất', revenue: 0, preTax: 0, vat: 0, items: 0 };
        const sp = splitVat(share, it.vatRate);
        vt.revenue += share; vt.preTax += sp.preTax; vt.vat += sp.vat; vt.items += it.quantity;
        byVat.set(rate, vt);
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
      byVatRate: [...byVat.values()].sort((a, b) => b.revenue - a.revenue),
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
