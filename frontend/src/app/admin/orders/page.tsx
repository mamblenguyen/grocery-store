'use client';
import { FileDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Empty, Pagination, PaymentBadge, Spinner, StatusBadge } from '@/components/ui';
import { api, API_URL, qs, tokenStore } from '@/lib/api';
import { dateTime, money, ORDER_STATUS, PAYMENT_METHOD } from '@/lib/format';
import type { Order, Paged } from '@/lib/types';

function OrdersInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const params = Object.fromEntries(sp.entries());
  const [data, setData] = useState<Paged<Order> | null>(null);
  const set = (patch: Record<string, string | undefined>) => router.push('/admin/orders' + qs({ ...params, page: 1, ...patch }));

  useEffect(() => { setData(null); api<Paged<Order>>('/admin/orders' + qs({ limit: 20, ...params })).then(setData); }, [sp.toString()]); // eslint-disable-line

  const exportCsv = async () => {
    const { page, ...filters } = params;
    const res = await fetch(`${API_URL}/admin/orders/export${qs(filters)}`, { headers: { Authorization: `Bearer ${tokenStore.get()}` } });
    if (!res.ok) return toast('Xuất file thất bại', 'error');
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement('a'), { href: url, download: `don-hang-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[['', 'Tất cả'], ...Object.entries(ORDER_STATUS).map(([k, v]) => [k, v.label])].map(([k, l]) => (
          <button key={k} className={`chip ${(params.status ?? '') === k ? 'chip-active' : ''}`} onClick={() => set({ status: k })}>{l}</button>
        ))}
      </div>
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div><label className="label">Tìm kiếm</label><input className="input w-60" placeholder="Mã đơn, tên, SĐT" defaultValue={params.search} onKeyDown={(e) => e.key === 'Enter' && set({ search: (e.target as HTMLInputElement).value })} /></div>
        <div><label className="label">Kênh</label><select className="input w-36" value={params.channel ?? ''} onChange={(e) => set({ channel: e.target.value })}><option value="">Tất cả</option><option value="ONLINE">Online</option><option value="POS">Tại quầy</option></select></div>
        <div><label className="label">Thanh toán</label><select className="input w-44" value={params.paymentStatus ?? ''} onChange={(e) => set({ paymentStatus: e.target.value })}><option value="">Tất cả</option><option value="UNPAID">Chưa thanh toán</option><option value="PAID">Đã thanh toán</option><option value="REFUNDED">Đã hoàn tiền</option></select></div>
        <div><label className="label">Từ ngày</label><input type="date" className="input" value={params.from ?? ''} onChange={(e) => set({ from: e.target.value })} /></div>
        <div><label className="label">Đến ngày</label><input type="date" className="input" value={params.to ?? ''} onChange={(e) => set({ to: e.target.value })} /></div>
        <button className="btn-ghost" onClick={() => router.push('/admin/orders')}>Xoá lọc</button>
        <button className="btn-outline ml-auto" onClick={exportCsv}><FileDown className="h-4 w-4" /> Xuất Excel (CSV)</button>
      </div>
      <div className="card overflow-x-auto p-0">
        {!data ? <Spinner /> : !data.items.length ? <Empty /> : (
          <table className="table">
            <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Kênh</th><th className="text-right">SP</th><th className="text-right">Tổng tiền</th><th>Thanh toán</th><th>Trạng thái</th><th>Ngày đặt</th></tr></thead>
            <tbody>
              {data.items.map((o) => (
                <tr key={o.id} className="cursor-pointer" onClick={() => router.push(`/admin/orders/${o.id}`)}>
                  <td><Link href={`/admin/orders/${o.id}`} className="font-semibold text-brand-700">{o.code}</Link></td>
                  <td>{o.customerName}<div className="text-xs text-slate-400">{o.phone}</div></td>
                  <td><span className={`badge ${o.channel === 'POS' ? 'bg-violet-100 text-violet-800' : 'bg-sky-100 text-sky-800'}`}>{o.channel === 'POS' ? 'Tại quầy' : 'Online'}</span></td>
                  <td className="text-right">{o._count?.items}</td>
                  <td className="text-right font-semibold">{money(o.total)}</td>
                  <td><PaymentBadge status={o.paymentStatus} /><div className="mt-0.5 text-[11px] text-slate-400">{PAYMENT_METHOD[o.paymentMethod]?.split(' (')[0]}</div></td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="text-xs text-slate-500">{dateTime(o.createdAt)}</td>
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
