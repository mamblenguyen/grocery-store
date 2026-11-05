'use client';
import { Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Empty, Pagination, Spinner } from '@/components/ui';
import { api, qs } from '@/lib/api';
import { date, money } from '@/lib/format';
import type { StorePaymentRow } from '@/lib/super';
import type { Paged } from '@/lib/types';

export default function PaymentsPage() {
  const toast = useToast();
  const [f, setF] = useState({ from: '', to: '', page: 1 });
  const [data, setData] = useState<(Paged<StorePaymentRow> & { sum: number }) | null>(null);
  const load = () => api<Paged<StorePaymentRow> & { sum: number }>('/super/payments' + qs({ ...f, limit: 30 })).then(setData);
  useEffect(() => { setData(null); load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [f]);

  const remove = async (p: StorePaymentRow) => {
    if (!confirm('Xoá phiếu thu này? (hạn dùng của cửa hàng không tự thay đổi)')) return;
    try { await api(`/super/payments/${p.id}`, { method: 'DELETE' }); toast('Đã xoá phiếu thu'); load(); } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Phiếu thu phí dịch vụ</h1>
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div><label className="label">Từ ngày</label><input type="date" className="input" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value, page: 1 })} /></div>
        <div><label className="label">Đến ngày</label><input type="date" className="input" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value, page: 1 })} /></div>
        {data && <div className="ml-auto text-right"><div className="text-sm text-slate-500">Tổng thu ({data.total} phiếu)</div><div className="text-2xl font-bold text-brand-700">{money(data.sum)}</div></div>}
      </div>
      <div className="card overflow-x-auto p-0">
        {!data ? <Spinner /> : !data.items.length ? <Empty text="Chưa có phiếu thu" /> : (
          <table className="table">
            <thead><tr><th>Ngày thu</th><th>Cửa hàng</th><th>Gói</th><th>Tháng</th><th>Thời hạn</th><th className="text-right">Số tiền</th><th>Hình thức</th><th></th></tr></thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id}>
                  <td className="text-xs">{date(p.createdAt)}</td>
                  <td>{p.store && <Link className="link" href={`/super/stores/${p.store.id}`}>{p.store.name}</Link>}</td>
                  <td>{p.plan?.name ?? '—'}</td><td>{p.months}</td>
                  <td className="text-xs">{date(p.periodFrom)} → {date(p.periodTo)}</td>
                  <td className="text-right font-semibold">{money(p.amount)}</td>
                  <td>{p.method || '—'}{p.note && <div className="text-xs text-slate-400">{p.note}</div>}</td>
                  <td className="text-right"><button className="btn-ghost btn-sm text-red-600" onClick={() => remove(p)} aria-label="Xoá"><Trash2 className="h-3.5 w-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(page) => setF({ ...f, page })} />}
    </div>
  );
}
