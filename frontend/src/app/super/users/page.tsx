'use client';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Empty, Pagination, Spinner } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { api, qs } from '@/lib/api';
import { date, ROLES } from '@/lib/format';
import type { Paged, StoreRef, User } from '@/lib/types';

type Row = User & { store: StoreRef | null; _count: { orders: number } };

export default function PlatformUsersPage() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [f, setF] = useState({ search: '', role: '', page: 1 });
  const [data, setData] = useState<Paged<Row> | null>(null);
  const load = () => api<Paged<Row>>('/super/users' + qs({ ...f, limit: 30 })).then(setData);
  useEffect(() => { setData(null); load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [f]);

  const update = async (u: Row, body: Record<string, unknown>, msg: string) => {
    try { await api(`/super/users/${u.id}`, { method: 'PATCH', json: body }); toast(msg); load(); } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Người dùng toàn nền tảng</h1>
      <div className="card flex flex-wrap gap-3 p-4">
        <form className="relative w-full sm:w-72" onSubmit={(e) => { e.preventDefault(); setF({ ...f, search: String(new FormData(e.currentTarget).get('q') ?? ''), page: 1 }); }}>
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input name="q" className="input pl-9" placeholder="Email, tên, SĐT… (Enter)" />
        </form>
        <select className="input w-full sm:w-48" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value, page: 1 })}>
          <option value="">Mọi vai trò</option>
          {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="card overflow-x-auto p-0">
        {!data ? <Spinner /> : !data.items.length ? <Empty /> : (
          <table className="table">
            <thead><tr><th>Người dùng</th><th>Vai trò</th><th>Cửa hàng</th><th className="text-right">Đơn đã đặt</th><th>Ngày tạo</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id}>
                  <td><div className="font-medium">{u.fullName}</div><div className="text-xs text-slate-500">{u.email}{u.phone && ` · ${u.phone}`}</div></td>
                  <td>{ROLES[u.role]}</td>
                  <td>{u.store ? <Link className="link" href={`/super/stores/${u.store.id}`}>{u.store.name}</Link> : '—'}</td>
                  <td className="text-right">{u._count.orders}</td>
                  <td className="text-xs">{date(u.createdAt)}</td>
                  <td><span className={`badge ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>{u.isActive ? 'Hoạt động' : 'Đã khoá'}</span></td>
                  <td className="space-x-1 text-right whitespace-nowrap">
                    <button className="btn-outline btn-sm" onClick={() => { const p = prompt(`Mật khẩu mới cho ${u.email} (≥ 6 ký tự)`); if (p) update(u, { password: p }, 'Đã đặt lại mật khẩu'); }}>Đổi MK</button>
                    {u.id !== me?.id && <button className={u.isActive ? 'btn-danger btn-sm' : 'btn-primary btn-sm'} onClick={() => update(u, { isActive: !u.isActive }, u.isActive ? 'Đã khoá' : 'Đã mở khoá')}>{u.isActive ? 'Khoá' : 'Mở khoá'}</button>}
                  </td>
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
