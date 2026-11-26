'use client';
import { Contact, Gift, History, MapPin, Search, Star, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Empty, Modal, Pagination, Spinner, StatusBadge } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { api, qs } from '@/lib/api';
import { date, dateTime, money, ROLES } from '@/lib/format';
import type { Order, Paged, StoreRef, User } from '@/lib/types';

interface Row { id: number; email: string; fullName: string; phone?: string | null; isActive: boolean; createdAt: string; orders: number; lastOrderAt: string; totalSpent: number; points: number; lifetimePoints: number; tier: string }
type PointTx = { id: number; type: string; points: number; balance: number; note?: string | null; createdAt: string };
type CouponInfo = { id: number; code: string; description?: string | null; type: 'PERCENT' | 'FIXED'; value: number; minOrderValue: number; endsAt?: string | null; assigned: boolean; usedAt?: string | null; redemptionOrderId?: number | null };
type Detail = Omit<Row, 'orders' | 'lastOrderAt'> & { address?: string | null; updatedAt: string; addresses: { id: number; label?: string | null; address: string; isDefault: boolean }[]; orders: Order[]; loyalty: { points: number; lifetimePoints: number; tier: string; joinedAt?: string | null }; pointHistory: PointTx[]; coupons: CouponInfo[] };
type PlatformUser = User & { store: StoreRef | null; _count: { orders: number } };

export default function CustomersPage() {
  const { user: me } = useAuth();
  const isSuper = me?.role === 'SUPER_ADMIN';
  const [tab, setTab] = useState<'customers' | 'users'>('customers');
  const [filter, setFilter] = useState({ search: '', page: 1 });
  const [data, setData] = useState<Paged<Row> | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [userFilter, setUserFilter] = useState({ search: '', role: '', page: 1 });
  const [users, setUsers] = useState<Paged<PlatformUser> | null>(null);
  useEffect(() => { setData(null); api<Paged<Row>>('/admin/customers' + qs({ ...filter, limit: 20 })).then(setData); }, [filter]);
  useEffect(() => { if (!isSuper || tab !== 'users') return; setUsers(null); api<Paged<PlatformUser>>('/super/users' + qs({ ...userFilter, kind: 'users', limit: 20 })).then(setUsers); }, [isSuper, tab, userFilter]);

  const tabs = isSuper && <div className="flex w-fit rounded-xl border border-slate-200 bg-white p-1"><button onClick={() => setTab('customers')} className={`rounded-lg px-5 py-2 text-sm font-semibold ${tab === 'customers' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Khách hàng</button><button onClick={() => setTab('users')} className={`rounded-lg px-5 py-2 text-sm font-semibold ${tab === 'users' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Người dùng</button></div>;

  if (isSuper && tab === 'users') return <div className="space-y-4">
    <div><h1 className="text-2xl font-bold">Quản lý tài khoản</h1><p className="text-sm text-slate-500">Tách biệt tài khoản vận hành khỏi khách hàng mua sắm.</p></div>
    {tabs}
    <div className="card flex flex-wrap gap-3 p-4"><form className="relative w-full sm:w-72" onSubmit={(e) => { e.preventDefault(); setUserFilter({ ...userFilter, search: String(new FormData(e.currentTarget).get('q') ?? ''), page: 1 }); }}><Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" /><input name="q" className="input pl-9" placeholder="Tên, email, SĐT… (Enter)" /></form><select className="input w-full sm:w-48" value={userFilter.role} onChange={(e) => setUserFilter({ ...userFilter, role: e.target.value, page: 1 })}><option value="">Mọi vai trò</option>{Object.entries(ROLES).filter(([k]) => k !== 'CUSTOMER').map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
    <div className="card overflow-x-auto p-0">{!users ? <Spinner /> : !users.items.length ? <Empty text="Chưa có người dùng phù hợp" /> : <table className="table"><thead><tr><th>Người dùng</th><th>Vai trò</th><th>Cửa hàng</th><th>Ngày tạo</th><th>Trạng thái</th></tr></thead><tbody>{users.items.map((u) => <tr key={u.id}><td><div className="font-medium">{u.fullName}</div><div className="text-xs text-slate-500">{u.email}{u.phone ? ` · ${u.phone}` : ''}</div></td><td>{ROLES[u.role]}</td><td>{u.store?.name || 'Toàn nền tảng'}</td><td className="text-xs">{date(u.createdAt)}</td><td><span className={`badge ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>{u.isActive ? 'Hoạt động' : 'Đã khóa'}</span></td></tr>)}</tbody></table>}</div>
    {users && <Pagination page={users.page} totalPages={users.totalPages} onChange={(page) => setUserFilter({ ...userFilter, page })} />}
  </div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Khách hàng</h1>
        <p className="text-sm text-slate-500">Hồ sơ khách mua online hoặc đã quét mã thành viên tại POS, bao gồm điểm, voucher và lịch sử mua hàng.</p>
      </div>
      {tabs}
      <div className="card flex p-4">
        <form className="relative w-full max-w-sm" onSubmit={(e) => { e.preventDefault(); setFilter({ search: String(new FormData(e.currentTarget).get('q') ?? ''), page: 1 }); }}>
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input name="q" className="input pl-9" placeholder="Tìm tên, email, SĐT… (Enter)" />
        </form>
      </div>
      <div className="card overflow-x-auto p-0">
        {!data ? <Spinner /> : !data.items.length ? <Empty icon={<Contact className="h-7 w-7" />} text="Chưa có khách hàng nào" /> : (
          <table className="table">
            <thead><tr><th>Khách hàng</th><th>SĐT</th><th>Hạng</th><th className="text-right">Điểm</th><th className="text-right">Số đơn</th><th className="text-right">Đã chi</th><th>Đơn gần nhất</th><th></th></tr></thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id}>
                  <td><div className="font-medium">{u.fullName}</div><div className="text-xs text-slate-500">{u.email}</div></td>
                  <td>{u.phone || '—'}</td>
                  <td><span className="chip text-xs">{u.tier}</span></td>
                  <td className="text-right font-bold text-amber-600">{u.points.toLocaleString('vi-VN')}</td>
                  <td className="text-right">{u.orders}</td>
                  <td className="text-right font-semibold text-brand-700">{money(u.totalSpent)}</td>
                  <td className="text-xs">{dateTime(u.lastOrderAt)}</td>
                  <td className="text-right"><button className="btn-outline btn-sm" onClick={() => api<Detail>(`/admin/customers/${u.id}`).then(setDetail)}>Chi tiết</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(page) => setFilter({ ...filter, page })} />}

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Hồ sơ khách hàng" size="xl">
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4 md:col-span-2"><div className="flex items-center gap-2 font-bold text-ink"><UserRound className="h-5 w-5 text-brand-600" />{detail.fullName}</div><div className="mt-2 space-y-1 text-xs text-slate-500"><div>{detail.email}</div><div>{detail.phone || 'Chưa có SĐT'}</div><div>{detail.address || 'Chưa có địa chỉ hồ sơ'}</div><div>Tham gia: {date(detail.createdAt)} · {detail.isActive ? 'Đang hoạt động' : 'Đã khóa'}</div></div></div>
              <div className="rounded-xl bg-amber-50 p-4"><Star className="mb-2 h-5 w-5 text-amber-600" /><div className="text-2xl font-extrabold text-amber-700">{detail.loyalty.points.toLocaleString('vi-VN')}</div><div className="text-xs text-amber-700">Điểm hiện có · Hạng {detail.loyalty.tier}</div><div className="mt-1 text-[11px] text-amber-600">Tổng từng tích: {detail.loyalty.lifetimePoints.toLocaleString('vi-VN')}</div></div>
              <div className="rounded-xl bg-brand-50 p-4"><div className="text-2xl font-extrabold text-brand-700">{money(detail.totalSpent)}</div><div className="text-xs text-brand-700">Tổng chi tiêu · {detail.orders.length} đơn</div></div>
            </div>
            {!!detail.addresses.length && <section><h3 className="mb-2 flex items-center gap-2 font-bold"><MapPin className="h-4 w-4 text-brand-600" />Địa chỉ</h3><div className="grid gap-2 sm:grid-cols-2">{detail.addresses.map((a) => <div key={a.id} className="rounded-lg border border-slate-200 p-3"><b>{a.label || 'Địa chỉ'}</b>{a.isDefault && <span className="ml-2 text-xs text-brand-700">Mặc định</span>}<div className="mt-1 text-xs text-slate-500">{a.address}</div></div>)}</div></section>}
            <section><h3 className="mb-2 flex items-center gap-2 font-bold"><Gift className="h-4 w-4 text-brand-600" />Mã giảm giá ({detail.coupons.length})</h3>{!detail.coupons.length ? <p className="text-slate-400">Chưa có voucher khả dụng.</p> : <div className="grid gap-2 sm:grid-cols-2">{detail.coupons.map((c) => <div key={c.id} className={`rounded-xl border p-3 ${c.usedAt ? 'border-slate-200 bg-slate-50 opacity-70' : 'border-brand-200 bg-brand-50/40'}`}><div className="flex justify-between gap-2"><b className="text-brand-800">{c.code}</b><span className="text-xs font-semibold">{c.usedAt ? 'Đã dùng' : c.assigned ? 'Voucher riêng' : 'Dùng chung'}</span></div><div className="mt-1 text-xs text-slate-500">{c.description || (c.type === 'PERCENT' ? `Giảm ${c.value}%` : `Giảm ${money(c.value)}`)}</div>{c.usedAt && <div className="mt-1 text-[11px] text-slate-400">Dùng lúc {dateTime(c.usedAt)}</div>}</div>)}</div>}</section>
            <section><h3 className="mb-2 flex items-center gap-2 font-bold"><History className="h-4 w-4 text-brand-600" />Lịch sử điểm</h3><div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200">{!detail.pointHistory.length ? <p className="p-4 text-slate-400">Chưa có giao dịch điểm.</p> : detail.pointHistory.map((x) => <div key={x.id} className="flex items-center justify-between border-b border-slate-100 p-3 last:border-0"><div><b className="text-xs">{x.note || x.type}</b><div className="text-[11px] text-slate-400">{dateTime(x.createdAt)} · Số dư {x.balance}</div></div><span className={`font-bold ${x.points >= 0 ? 'text-brand-700' : 'text-red-600'}`}>{x.points >= 0 ? '+' : ''}{x.points}</span></div>)}</div></section>
            <h3 className="font-bold">Đơn hàng gần đây</h3>
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Mã đơn</th><th>Tổng</th><th>Trạng thái</th><th>Ngày</th></tr></thead>
                <tbody>
                  {detail.orders.map((o) => (
                    <tr key={o.id}>
                      <td><Link className="link" href={`/admin/orders/${o.id}`}>{o.code}</Link></td>
                      <td>{money(o.total)}</td><td><StatusBadge status={o.status} /></td><td className="text-xs">{dateTime(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
