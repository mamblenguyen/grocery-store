'use client';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Empty, Pagination, Spinner } from '@/components/ui';
import { api, qs } from '@/lib/api';
import { dateTime } from '@/lib/format';
import { APP_STATUS, type AppStatus } from '@/lib/partner';
import type { Paged } from '@/lib/types';

type Row = {
  id: number; code: string; status: AppStatus; storeName: string; businessName: string; businessType: string; taxCode: string;
  representative: string; representativePhone: string; storeAddress: string; createdAt: string; updatedAt: string;
  contractSignedAt: string | null; paidAt: string | null; plan: { name: string } | null; _count: { documents: number };
};
const TABS: (AppStatus | '')[] = ['SUBMITTED', 'NEED_INFO', 'APPROVED', 'ACTIVATED', 'REJECTED', 'CANCELLED', ''];

export default function ApplicationsPage() {
  const [filter, setFilter] = useState<{ status: AppStatus | ''; search: string; page: number }>({ status: 'SUBMITTED', search: '', page: 1 });
  const [q, setQ] = useState('');
  const [data, setData] = useState<(Paged<Row> & { counts: Record<string, number> }) | null>(null);
  useEffect(() => { setData(null); api<Paged<Row> & { counts: Record<string, number> }>('/super/partner-applications' + qs({ ...filter, limit: 20 })).then(setData); }, [filter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Hồ sơ đăng ký đối tác</h1><p className="text-sm text-slate-500">Thẩm định giấy tờ → xác thực danh tính → duyệt & gửi hợp đồng → xác nhận phí → kích hoạt cửa hàng</p></div>
        <form onSubmit={(e) => { e.preventDefault(); setFilter({ ...filter, search: q, page: 1 }); }} className="flex gap-2">
          <div className="relative"><Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" /><input className="input pl-9" placeholder="Mã, tên, MST, SĐT…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </form>
      </div>
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t || 'all'} className={`chip ${filter.status === t ? 'chip-active' : ''}`} onClick={() => setFilter({ ...filter, status: t, page: 1 })}>
            {t ? APP_STATUS[t].label : 'Tất cả'}{t && data?.counts[t] ? <span className="ml-1 rounded-full bg-slate-200 px-1.5 text-xs">{data.counts[t]}</span> : null}
          </button>
        ))}
      </div>
      <div className="card overflow-x-auto p-0">
        {!data ? <Spinner /> : !data.items.length ? <Empty text="Không có hồ sơ" /> : (
          <table className="table">
            <thead><tr><th>Mã</th><th>Cửa hàng</th><th>Pháp lý</th><th>Người đại diện</th><th>Gói</th><th>Giấy tờ</th><th>Trạng thái</th><th>Cập nhật</th></tr></thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/super/applications/${r.id}`} className="font-mono font-semibold text-violet-700">{r.code}</Link></td>
                  <td><div className="font-semibold text-ink">{r.storeName}</div><div className="max-w-64 truncate text-xs text-slate-500">{r.storeAddress}</div></td>
                  <td className="text-sm"><div>{r.businessName}</div><div className="font-mono text-xs text-slate-500">{r.businessType === 'CONG_TY' ? 'DN' : 'HKD'} · MST {r.taxCode}</div></td>
                  <td className="text-sm">{r.representative}<div className="text-xs text-slate-500">{r.representativePhone}</div></td>
                  <td className="text-sm">{r.plan?.name ?? '—'}</td>
                  <td className="text-center">{r._count.documents}</td>
                  <td>
                    <span className={`badge ${APP_STATUS[r.status].cls}`}>{APP_STATUS[r.status].label}</span>
                    {r.status === 'APPROVED' && <div className="mt-1 text-xs text-slate-500">{r.contractSignedAt ? '✔ đã ký' : '✗ chưa ký'} · {r.paidAt ? '✔ đã trả phí' : '✗ chưa trả phí'}</div>}
                  </td>
                  <td className="text-xs text-slate-500">{dateTime(r.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(page) => setFilter({ ...filter, page })} />}
    </div>
  );
}
