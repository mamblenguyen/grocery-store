'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Empty, Pagination, PaymentBadge, Spinner, StatusBadge } from '@/components/ui';
import { api, qs } from '@/lib/api';
import { dateTime, money, ORDER_STATUS } from '@/lib/format';
import type { Order, Paged } from '@/lib/types';

function OrdersInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const params = Object.fromEntries(sp.entries());
  const [data, setData] = useState<Paged<Order> | null>(null);
  const set = (patch: Record<string, string | undefined>) => router.push('/admin/orders' + qs({ ...params, page: 1, ...patch }));

  useEffect(() => {
    setData(null);
    api<Paged<Order>>('/admin/orders' + qs({ limit: 20, ...params })).then(setData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.toString()]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Đơn hàng</h1>
      <div className="flex flex-wrap gap-2">
        {[['', 'Tất cả'], ...Object.entries(ORDER_STATUS).map(([k, v]) => [k, v.label])].map(([k, l]) => (
          <button key={k} className={(params.status ?? '') === k ? 'btn-primary btn-sm' : 'btn-outline btn-sm'} onClick={() => set({ status: k })}>{l}</button>
        ))}
      </div>
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div><label className="label">Tìm kiếm</label>
          <input className="input w-64" placeholder="Mã đơn, tên, SĐT" defaultValue={params.search}
            onKeyDown={(e) => e.key === 'Enter' && set({ search: (e.target as HTMLInputElement).value })} /></div>
        <div><label className="label">Từ ngày</label><input type="date" className="input" value={params.from ?? ''} onChange={(e) => set({ from: e.target.value })} /></div>
        <div><label className="label">Đến ngày</label><input type="date" className="input" value={params.to ?? ''} onChange={(e) => set({ to: e.target.value })} /></div>
        <button className="btn-outline" onClick={() => router.push('/admin/orders')}>Xoá lọc</button>
      </div>
      <div className="card overflow-x-auto p-0">
        {!data ? <Spinner /> : !data.items.length ? <Empty /> : (
          <table className="table">
            <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>SĐT</th><th>SP</th><th>Tổng tiền</th><th>Thanh toán</th><th>Trạng thái</th><th>Ngày đặt</th></tr></thead>
            <tbody>
              {data.items.map((o) => (
                <tr key={o.id} className="cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/admin/orders/${o.id}`)}>
                  <td><Link href={`/admin/orders/${o.id}`} className="font-medium text-brand-700">{o.code}</Link></td>
                  <td>{o.customerName}<div className="text-xs text-gray-500">{o.user?.email}</div></td>
                  <td>{o.phone}</td><td>{o._count?.items}</td>
                  <td className="font-semibold">{money(o.total)}</td>
                  <td><PaymentBadge status={o.paymentStatus} /></td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="text-xs text-gray-500">{dateTime(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => set({ page: String(p) })} />}
    </div>
  );
}

export default function AdminOrdersPage() {
  return <Suspense fallback={<Spinner />}><OrdersInner /></Suspense>;
}
