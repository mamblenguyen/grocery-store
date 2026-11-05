'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Spinner, StatusBadge } from '@/components/ui';
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

  useEffect(() => {
    api<Dashboard>(`/admin/dashboard?days=${days}`).then(setD);
  }, [days]);

  if (!d) return <Spinner />;
  const max = Math.max(1, ...d.chart.map((c) => c.revenue));

  const stats = [
    { label: 'Doanh thu (đơn hoàn thành)', value: money(d.stats.revenue) },
    { label: 'Doanh thu hôm nay', value: money(d.stats.todayRevenue) },
    { label: 'Tổng đơn / Hôm nay', value: `${d.stats.orders} / ${d.stats.todayOrders}` },
    { label: 'Khách hàng', value: d.stats.customers },
    { label: 'Sản phẩm đang bán', value: d.stats.products },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tổng quan</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <div className="text-xs text-gray-500">{s.label}</div>
            <div className="mt-1 text-xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Doanh thu theo ngày</h2>
            <select className="input w-32" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={7}>7 ngày</option><option value={14}>14 ngày</option><option value={30}>30 ngày</option>
            </select>
          </div>
          <div className="flex h-56 items-end gap-1">
            {d.chart.map((c) => (
              <div key={c.date} className="group relative flex flex-1 flex-col items-center justify-end">
                <div className="absolute -top-12 hidden rounded bg-gray-800 px-2 py-1 text-xs whitespace-nowrap text-white group-hover:block">
                  {money(c.revenue)} · {c.orders} đơn
                </div>
                <div className="w-full rounded-t bg-brand-500 transition hover:bg-brand-700" style={{ height: `${(c.revenue / max) * 100}%`, minHeight: c.revenue ? 4 : 1 }} />
                <div className="mt-1 text-[10px] text-gray-500">{c.date.slice(8)}/{c.date.slice(5, 7)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2 className="mb-3 font-semibold">Đơn theo trạng thái</h2>
          <div className="space-y-2">
            {Object.entries(ORDER_STATUS).map(([k, v]) => (
              <Link key={k} href={`/admin/orders?status=${k}`} className="flex items-center justify-between rounded-lg p-2 hover:bg-gray-50">
                <span className={`badge ${v.cls}`}>{v.label}</span><b>{d.ordersByStatus[k] ?? 0}</b>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-3 flex justify-between"><h2 className="font-semibold">Đơn hàng mới nhất</h2><Link href="/admin/orders" className="text-sm text-brand-700">Xem tất cả</Link></div>
          <table className="table">
            <thead><tr><th>Mã</th><th>Khách</th><th>Tổng</th><th>Trạng thái</th><th>Thời gian</th></tr></thead>
            <tbody>
              {d.recentOrders.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/admin/orders/${o.id}`} className="font-medium text-brand-700">{o.code}</Link></td>
                  <td>{o.customerName}</td><td>{money(o.total)}</td><td><StatusBadge status={o.status} /></td>
                  <td className="text-xs text-gray-500">{dateTime(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-6">
          <div className="card">
            <h2 className="mb-3 font-semibold">Top bán chạy</h2>
            {d.topProducts.map((t, i) => (
              <div key={t.productId ?? i} className="flex justify-between py-1 text-sm">
                <span>{i + 1}. {t.productName}</span><span className="text-gray-500">{t.quantity} SP</span>
              </div>
            ))}
            {!d.topProducts.length && <div className="text-sm text-gray-500">Chưa có dữ liệu</div>}
          </div>
          <div className="card">
            <div className="mb-3 flex justify-between"><h2 className="font-semibold">⚠ Sắp hết hàng</h2><Link href="/admin/inventory?filter=low" className="text-sm text-brand-700">Kho</Link></div>
            {d.lowStock.map((v) => (
              <div key={v.id} className="flex justify-between py-1 text-sm">
                <span className="truncate">{v.productName} <span className="text-gray-500">({v.name})</span></span>
                <span className={v.stock <= 0 ? 'font-bold text-red-600' : 'text-orange-600'}>{v.stock}</span>
              </div>
            ))}
            {!d.lowStock.length && <div className="text-sm text-gray-500">Tồn kho ổn định</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
