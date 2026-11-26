'use client';
import { ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, FileText } from 'lucide-react';
import { StoreTag } from '@/components/admin/AllStores';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Badge, Empty, Pagination, Spinner } from '@/components/ui';
import { api, qs } from '@/lib/api';
import { dateTime, EXPORT_REASONS, money, STOCK_DOC_STATUS, STOCK_DOC_TYPE } from '@/lib/format';
import type { Paged, StockDoc } from '@/lib/types';

function Inner() {
  const sp = useSearchParams();
  const router = useRouter();
  const params = Object.fromEntries(sp.entries());
  const [data, setData] = useState<Paged<StockDoc & { _count: { items: number } }> | null>(null);
  const set = (p: Record<string, string | undefined>) => router.push('/admin/stock' + qs({ ...params, page: 1, ...p }));
  useEffect(() => { setData(null); api<typeof data>('/admin/stock/documents' + qs({ limit: 20, ...params })).then(setData); }, [sp.toString()]); // eslint-disable-line

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { t: 'IMPORT', icon: ArrowDownToLine, title: 'Nhập kho', sub: 'Nhập hàng từ nhà cung cấp', cls: 'from-emerald-500 to-brand-700' },
          { t: 'EXPORT', icon: ArrowUpFromLine, title: 'Xuất kho', sub: 'Hư hỏng, hết hạn, trả NCC…', cls: 'from-orange-400 to-accent-600' },
          { t: 'STOCKTAKE', icon: ClipboardCheck, title: 'Kiểm kê', sub: 'Đếm & cân bằng tồn kho', cls: 'from-sky-400 to-sky-700' },
        ].map((x) => (
          <Link key={x.t} href={`/admin/stock/new?type=${x.t}`} className={`flex items-center gap-4 rounded-2xl bg-gradient-to-br ${x.cls} p-5 text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20"><x.icon className="h-6 w-6" /></span>
            <span><span className="block text-lg font-bold">+ {x.title}</span><span className="text-sm text-white/80">{x.sub}</span></span>
          </Link>
        ))}
      </div>
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <input className="input max-w-xs" placeholder="Mã phiếu, số HĐ, NCC, ghi chú…" defaultValue={params.search} onKeyDown={(e) => e.key === 'Enter' && set({ search: (e.target as HTMLInputElement).value })} />
        <select className="input w-44" value={params.type ?? ''} onChange={(e) => set({ type: e.target.value })}><option value="">Tất cả loại phiếu</option>{Object.entries(STOCK_DOC_TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        <select className="input w-40" value={params.status ?? ''} onChange={(e) => set({ status: e.target.value })}><option value="">Mọi trạng thái</option>{Object.entries(STOCK_DOC_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        <input type="date" className="input w-40" value={params.from ?? ''} onChange={(e) => set({ from: e.target.value })} />
        <input type="date" className="input w-40" value={params.to ?? ''} onChange={(e) => set({ to: e.target.value })} />
      </div>
      <div className="card overflow-x-auto p-0">
        {!data ? <Spinner /> : !data.items.length ? <Empty icon={<FileText className="h-7 w-7" />} text="Chưa có phiếu kho" /> : (
          <table className="table">
            <thead><tr><th>Mã phiếu</th><th>Loại</th><th>NCC / Lý do</th><th className="text-right">Số dòng</th><th className="text-right">Tổng SL</th><th className="text-right">Giá trị</th><th>Trạng thái</th><th>Người tạo</th><th>Ngày tạo</th></tr></thead>
            <tbody>
              {data.items.map((d) => (
                <tr key={d.id} className="cursor-pointer" onClick={() => router.push(`/admin/stock/${d.id}`)}>
                  <td className="font-mono font-semibold text-brand-700">{d.code}<StoreTag s={d.store} /></td>
                  <td><Badge map={Object.fromEntries(Object.entries(STOCK_DOC_TYPE).map(([k, v]) => [k, { label: v.short, cls: v.cls }]))} value={d.type} /></td>
                  <td className="text-sm">{d.supplier?.name ?? (d.reason ? EXPORT_REASONS[d.reason] : '—')}</td>
                  <td className="text-right">{d._count.items}</td>
                  <td className="text-right">{d.totalQuantity}</td>
                  <td className="text-right font-semibold">{money(d.totalAmount)}</td>
                  <td><Badge map={STOCK_DOC_STATUS} value={d.status} /></td>
                  <td className="text-sm">{d.createdBy?.fullName}</td>
                  <td className="text-xs text-slate-500">{dateTime(d.createdAt)}</td>
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

export default function StockDocsPage() {
  return <Suspense fallback={<Spinner />}><Inner /></Suspense>;
}
