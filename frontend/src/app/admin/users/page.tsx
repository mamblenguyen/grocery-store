'use client';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Empty, Modal, Pagination, Spinner, StatusBadge } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { api, qs } from '@/lib/api';
import { date, dateTime, money, ROLES } from '@/lib/format';
import type { Order, Paged, User } from '@/lib/types';

type Row = User & { _count: { orders: number } };
type Detail = Row & { orders: Order[]; totalSpent: number };

export default function UsersPage() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [filter, setFilter] = useState({ search: '', role: '', page: 1 });
  const [data, setData] = useState<Paged<Row> | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);

  const load = () => api<Paged<Row>>('/admin/users' + qs({ ...filter, limit: 20 })).then(setData);
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  const update = async (u: Row, patch: Partial<User>) => {
    try { await api(`/admin/users/${u.id}`, { method: 'PATCH', json: patch }); toast('Đã cập nhật'); load(); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Người dùng</h1>
      <div className="card flex flex-wrap gap-3 p-4">
        <input className="input max-w-xs" placeholder="Tìm email, tên, SĐT..." onKeyDown={(e) => e.key === 'Enter' && setFilter({ ...filter, search: (e.target as HTMLInputElement).value, page: 1 })} />
        <select className="input w-44" value={filter.role} onChange={(e) => setFilter({ ...filter, role: e.target.value, page: 1 })}>
          <option value="">Tất cả vai trò</option>
          {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="card overflow-x-auto p-0">
        {!data ? <Spinner /> : !data.items.length ? <Empty /> : (
          <table className="table">
            <thead><tr><th>Người dùng</th><th>SĐT</th><th>Vai trò</th><th>Số đơn</th><th>Ngày tạo</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id}>
                  <td><div className="font-medium">{u.fullName}</div><div className="text-xs text-gray-500">{u.email}</div></td>
                  <td>{u.phone ?? '—'}</td>
                  <td>
                    <select className="input w-32 py-1" disabled={u.id === me?.id} value={u.role} onChange={(e) => update(u, { role: e.target.value as User['role'] })}>
                      {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td>{u._count.orders}</td>
                  <td className="text-xs">{date(u.createdAt)}</td>
                  <td><span className={`badge ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>{u.isActive ? 'Hoạt động' : 'Đã khoá'}</span></td>
                  <td className="space-x-1 text-right whitespace-nowrap">
                    <button className="btn-outline btn-sm" onClick={() => api<Detail>(`/admin/users/${u.id}`).then(setDetail)}>Chi tiết</button>
                    {u.id !== me?.id && (
                      <button className={u.isActive ? 'btn-danger btn-sm' : 'btn-primary btn-sm'} onClick={() => update(u, { isActive: !u.isActive })}>
                        {u.isActive ? 'Khoá' : 'Mở khoá'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(page) => setFilter({ ...filter, page })} />}

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Chi tiết khách hàng" wide>
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <p><b>{detail.fullName}</b> · {ROLES[detail.role]}</p><p>{detail.email}</p>
              <p>📞 {detail.phone ?? '—'}</p><p>📍 {detail.address ?? '—'}</p>
              <p>Tổng đơn: <b>{detail._count.orders}</b></p><p>Đã chi tiêu: <b className="text-brand-700">{money(detail.totalSpent)}</b></p>
            </div>
            <table className="table">
              <thead><tr><th>Mã đơn</th><th>Tổng</th><th>Trạng thái</th><th>Ngày</th></tr></thead>
              <tbody>
                {detail.orders.map((o) => (
                  <tr key={o.id}><td><a href={`/admin/orders/${o.id}`} className="text-brand-700">{o.code}</a></td><td>{money(o.total)}</td><td><StatusBadge status={o.status} /></td><td className="text-xs">{dateTime(o.createdAt)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
