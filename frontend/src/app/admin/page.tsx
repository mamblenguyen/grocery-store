'use client';
import { AlertTriangle, ArrowRight, DollarSign, Package, ReceiptText, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { StoreTag } from '@/components/admin/AllStores';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Spinner, StatCard, StatusBadge } from '@/components/ui';
import { api } from '@/lib/api';
import { dateTime, money, ORDER_STATUS } from '@/lib/format';
import type { Order } from '@/lib/types';

interface Dashboard {
  stats: { revenue: number; todayRevenue: number; orders: number; todayOrders: number; customers: number; products: number };
  ordersByStatus: Record<string, number>;
  chart: { date: string; revenue: number; orders: number }[];
  topProducts: { productId: number; productName: string; quantity: number; revenue: number }[];
  lowStock: { id: number; sku: string; name: string; stock: number; lowStockThreshold: number; productName: string }[];
  recentOrders: Order[];
}

export default function AdminDashboard() {
  const [days, setDays] = useState(7);
  const [d, setD] = useState<Dashboard | null>(null);
  useEffect(() => { api<Dashboard>(`/admin/dashboard?days=${days}`).then(setD); }, [days]);
  if (!d) return <Spinner />;
  const max = Math.max(1, ...d.chart.map((c) => c.revenue));
  const periodRevenue = d.chart.reduce((s, c) => s + c.revenue, 0);
  const totalOrders = Object.values(d.ordersByStatus).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<DollarSign className="h-5 w-5" />} label="Doanh thu hôm nay" value={money(d.stats.todayRevenue)} hint={`${d.stats.todayOrders} đơn hôm nay`} />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} tone="sky" label={`Doanh thu ${days} ngày`} value={money(periodRevenue)} hint={`Tổng đã hoàn thành: ${money(d.stats.revenue)}`} />
        <StatCard icon={<ReceiptText className="h-5 w-5" />} tone="violet" label="Tổng đơn hàng" value={d.stats.orders} hint={`${d.ordersByStatus.PENDING ?? 0} đơn chờ xác nhận`} />
        <StatCard icon={<Users className="h-5 w-5" />} tone="accent" label="Khách hàng" value={d.stats.customers} hint={`${d.stats.products} sản phẩm đang bán`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div><h2 className="font-bold text-ink">Doanh thu theo ngày</h2><p className="text-xs text-slate-400">Không tính đơn đã huỷ</p></div>
            <div className="flex rounded-xl bg-slate-100 p-1">{[7, 14, 30].map((n) => <button key={n} onClick={() => setDays(n)} className={`rounded-lg px-3 py-1 text-xs font-semibold ${days === n ? 'bg-white text-ink shadow-sm' : 'text-slate-500'}`}>{n} ngày</button>)}</div>
          </div>
          <div className="flex h-64 items-end gap-1.5">
            {d.chart.map((c) => (
              <div key={c.date} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                <div className="pointer-events-none absolute bottom-full mb-1 hidden rounded-lg bg-ink px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg group-hover:block">{money(c.revenue)}<br />{c.orders} đơn · {c.date.slice(8)}/{c.date.slice(5, 7)}</div>
                <div className="w-full max-w-10 rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400 transition group-hover:from-brand-700" style={{ height: `${(c.revenue / max) * 100}%`, minHeight: c.revenue ? 6 : 2 }} />
                {(d.chart.length <= 14 || Number(c.date.slice(8)) % 3 === 0) && <div className="mt-1.5 text-[10px] text-slate-400">{c.date.slice(8)}/{c.date.slice(5, 7)}</div>}
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2 className="mb-4 font-bold text-ink">Trạng thái đơn hàng</h2>
          <div className="space-y-3">
            {Object.entries(ORDER_STATUS).map(([k, v]) => {
              const n = d.ordersByStatus[k] ?? 0;
              return (
                <Link key={k} href={`/admin/orders?status=${k}`} className="block">
                  <div className="mb-1 flex justify-between text-sm"><span className={`badge ${v.cls}`}>{v.label}</span><b className="text-ink">{n}</b></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(n / totalOrders) * 100}%` }} /></div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card p-0 xl:col-span-2">
          <div className="flex items-center justify-between p-5 pb-3"><h2 className="font-bold text-ink">Đơn hàng mới nhất</h2><Link href="/admin/orders" className="flex items-center gap-1 text-sm font-semibold text-brand-700">Xem tất cả <ArrowRight className="h-4 w-4" /></Link></div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Mã</th><th>Khách</th><th>Kênh</th><th className="text-right">Tổng</th><th>Trạng thái</th><th>Thời gian</th></tr></thead>
              <tbody>
                {d.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td><Link href={`/admin/orders/${o.id}`} className="font-semibold text-brand-700">{o.code}</Link><StoreTag s={o.store} /></td>
                    <td>{o.customerName}</td>
                    <td><span className={`badge ${o.channel === 'POS' ? 'bg-violet-100 text-violet-800' : 'bg-sky-100 text-sky-800'}`}>{o.channel === 'POS' ? 'Tại quầy' : 'Online'}</span></td>
                    <td className="text-right font-semibold">{money(o.total)}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="text-xs text-slate-500">{dateTime(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-6">
          <div className="card">
            <h2 className="mb-3 flex items-center gap-2 font-bold text-ink"><ShoppingBag className="h-4 w-4 text-brand-600" /> Bán chạy</h2>
            {d.topProducts.map((t, i) => (
              <div key={t.productId ?? i} className="flex items-center gap-3 py-2 text-sm">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>
                <span className="flex-1 truncate">{t.productName}</span><span className="font-semibold text-ink">{t.quantity}</span>
              </div>
            ))}
            {!d.topProducts.length && <div className="text-sm text-slate-400">Chưa có dữ liệu</div>}
          </div>
          <div className="card">
            <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold text-ink"><AlertTriangle className="h-4 w-4 text-accent-500" /> Sắp hết hàng</h2><Link href="/admin/stock/new?type=IMPORT" className="text-xs font-semibold text-brand-700">+ Nhập hàng</Link></div>
            {d.lowStock.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                <span className="min-w-0 truncate"><Package className="mr-1.5 inline h-3.5 w-3.5 text-slate-400" />{v.productName} <span className="text-slate-400">({v.name})</span></span>
                <span className={`badge ${v.stock <= 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{v.stock}</span>
              </div>
            ))}
            {!d.lowStock.length && <div className="text-sm text-slate-400">Tồn kho ổn định 👍</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
