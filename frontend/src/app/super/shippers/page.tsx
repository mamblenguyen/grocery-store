'use client';
import { Bike, KeyRound, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Empty, Modal, Pagination, Spinner } from '@/components/ui';
import { api, qs } from '@/lib/api';
import { date, dateTime, money } from '@/lib/format';
import { DELIVERY_STATUS, VEHICLES } from '@/lib/geo';
import type { Job } from '@/lib/shipper';
import type { Paged } from '@/lib/types';

interface ShipperRow {
  id: number; email: string; fullName: string; phone: string | null; isActive: boolean; createdAt: string;
  shipperProfile: { vehicleType: string; plateNumber: string | null; idNumber: string | null; area: string | null; isOnline: boolean; locationAt: string | null } | null;
  stats: { delivered: number; earnings: number; failed: number; active: number };
}
type DeliveryRow = Job & { shipper: { id: number; fullName: string; phone: string | null } | null };
const EMPTY = { fullName: '', phone: '', email: '', password: '', vehicleType: 'XE_MAY', plateNumber: '', idNumber: '', area: '' };

export default function ShippersPage() {
  const toast = useToast();
  const [tab, setTab] = useState<'shippers' | 'deliveries'>('shippers');
  const [f, setF] = useState({ search: '', page: 1 });
  const [data, setData] = useState<Paged<ShipperRow> | null>(null);
  const [dq, setDq] = useState({ status: '', page: 1 });
  const [deliveries, setDeliveries] = useState<Paged<DeliveryRow> | null>(null);
  const [form, setForm] = useState<typeof EMPTY | null>(null);

  const load = () => api<Paged<ShipperRow>>('/super/shippers' + qs({ ...f, limit: 20 })).then(setData);
  useEffect(() => { setData(null); load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [f]);
  useEffect(() => { if (tab === 'deliveries') { setDeliveries(null); api<Paged<DeliveryRow>>('/super/deliveries' + qs({ ...dq, limit: 30 })).then(setDeliveries); } }, [tab, dq]);

  const update = async (u: ShipperRow, body: Record<string, unknown>, msg: string) => {
    try { await api(`/super/shippers/${u.id}`, { method: 'PATCH', json: body }); toast(msg); load(); } catch (e: any) { toast(e.message, 'error'); }
  };
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api('/super/shippers', { method: 'POST', json: { ...form, plateNumber: form!.plateNumber || undefined, idNumber: form!.idNumber || undefined, area: form!.area || undefined } }); toast('Đã thêm tài xế'); setForm(null); load(); }
    catch (err: any) { toast(err.message, 'error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Tài xế giao hàng</h1><p className="text-sm text-slate-500">Tài xế của sàn nhận đơn từ mọi cửa hàng (như Grab). Đăng nhập bằng tài khoản được cấp tại <b>/shipper</b> hoặc trên app.</p></div>
        <button className="btn-primary" onClick={() => setForm(EMPTY)}><Plus className="h-4 w-4" /> Thêm tài xế</button>
      </div>
      <div className="flex gap-1 rounded-xl bg-white p-1 shadow-soft sm:w-fit">
        {([['shippers', 'Đội tài xế'], ['deliveries', 'Chuyến giao hàng']] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === k ? 'bg-violet-600 text-white' : 'text-slate-600'}`}>{l}</button>)}
      </div>

      {tab === 'shippers' && (
        <>
          <div className="card flex p-4">
            <form className="relative w-full sm:w-80" onSubmit={(e) => { e.preventDefault(); setF({ search: String(new FormData(e.currentTarget).get('q') ?? ''), page: 1 }); }}>
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input name="q" className="input pl-9" placeholder="Tên, SĐT, email, biển số… (Enter)" />
            </form>
          </div>
          <div className="card overflow-x-auto p-0">
            {!data ? <Spinner /> : !data.items.length ? <Empty icon={<Bike className="h-7 w-7" />} text="Chưa có tài xế" /> : (
              <table className="table">
                <thead><tr><th>Tài xế</th><th>Phương tiện</th><th>Trạng thái</th><th className="text-right">Đã giao</th><th className="text-right">Thu nhập</th><th className="text-right">Thất bại</th><th>Tài khoản</th><th></th></tr></thead>
                <tbody>
                  {data.items.map((u) => (
                    <tr key={u.id}>
                      <td><div className="font-medium">{u.fullName}</div><div className="text-xs text-slate-500">{u.phone} · {u.email}</div></td>
                      <td className="text-sm">{VEHICLES[u.shipperProfile?.vehicleType ?? ''] ?? '—'}<div className="text-xs text-slate-500">{u.shipperProfile?.plateNumber}{u.shipperProfile?.area ? ` · ${u.shipperProfile.area}` : ''}</div></td>
                      <td>
                        {u.stats.active > 0 ? <span className="badge bg-indigo-100 text-indigo-800">Đang giao {u.stats.active}</span>
                          : u.shipperProfile?.isOnline ? <span className="badge bg-green-100 text-green-800">● Trực tuyến</span> : <span className="badge bg-slate-100 text-slate-600">Ngoại tuyến</span>}
                        {u.shipperProfile?.locationAt && <div className="mt-0.5 text-[11px] text-slate-400">GPS {dateTime(u.shipperProfile.locationAt)}</div>}
                      </td>
                      <td className="text-right">{u.stats.delivered}</td>
                      <td className="text-right font-semibold">{money(u.stats.earnings)}</td>
                      <td className="text-right">{u.stats.failed}</td>
                      <td><span className={`badge ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>{u.isActive ? 'Hoạt động' : 'Đã khoá'}</span><div className="text-[11px] text-slate-400">từ {date(u.createdAt)}</div></td>
                      <td className="space-x-1 text-right whitespace-nowrap">
                        <button className="btn-outline btn-sm" title="Đặt lại mật khẩu" onClick={() => { const p = prompt(`Mật khẩu mới cho ${u.fullName} (≥ 6 ký tự)`); if (p) update(u, { password: p }, 'Đã đặt lại mật khẩu'); }}><KeyRound className="h-3.5 w-3.5" /></button>
                        <button className={u.isActive ? 'btn-danger btn-sm' : 'btn-primary btn-sm'} onClick={() => update(u, { isActive: !u.isActive }, u.isActive ? 'Đã khoá tài xế' : 'Đã mở khoá')}>{u.isActive ? 'Khoá' : 'Mở khoá'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(page) => setF({ ...f, page })} />}
        </>
      )}

      {tab === 'deliveries' && (
        <>
          <div className="flex flex-wrap gap-2">
            <button className={`chip ${!dq.status ? 'chip-active' : ''}`} onClick={() => setDq({ status: '', page: 1 })}>Tất cả</button>
            {Object.entries(DELIVERY_STATUS).map(([k, v]) => <button key={k} className={`chip ${dq.status === k ? 'chip-active' : ''}`} onClick={() => setDq({ status: k, page: 1 })}>{v.label}</button>)}
          </div>
          <div className="card overflow-x-auto p-0">
            {!deliveries ? <Spinner /> : !deliveries.items.length ? <Empty text="Chưa có chuyến giao" /> : (
              <table className="table">
                <thead><tr><th>Đơn</th><th>Cửa hàng → Khách</th><th>Tài xế</th><th className="text-right">Phí / Thu hộ</th><th>Trạng thái</th><th>Cập nhật</th></tr></thead>
                <tbody>
                  {deliveries.items.map((d) => (
                    <tr key={d.id}>
                      <td className="font-semibold">{d.order.code}</td>
                      <td className="text-sm"><div className="font-medium">{d.store.name}</div><div className="max-w-xs truncate text-xs text-slate-500">→ {d.dropoffAddress}</div></td>
                      <td className="text-sm">{d.shipper ? <>{d.shipper.fullName}<div className="text-xs text-slate-500">{d.shipper.phone}</div></> : <span className="text-slate-400">—</span>}</td>
                      <td className="text-right text-sm">{money(d.fee)}<div className="text-xs text-slate-500">{money(d.codAmount)}</div></td>
                      <td><span className={`badge ${DELIVERY_STATUS[d.status]?.cls}`}>{DELIVERY_STATUS[d.status]?.label}</span>{d.failReason && <div className="text-[11px] text-slate-400">{d.failReason}</div>}</td>
                      <td className="text-xs">{dateTime(d.deliveredAt ?? d.pickedUpAt ?? d.assignedAt ?? d.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {deliveries && <Pagination page={deliveries.page} totalPages={deliveries.totalPages} onChange={(page) => setDq({ ...dq, page })} />}
        </>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title="Thêm tài xế">
        {form && (
          <form onSubmit={create} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Họ tên *</label><input className="input" required minLength={2} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
              <div><label className="label">Số điện thoại *</label><input className="input" required minLength={9} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><label className="label">Email đăng nhập *</label><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><label className="label">Mật khẩu *</label><input className="input" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              <div><label className="label">Phương tiện</label><select className="input" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>{Object.entries(VEHICLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div><label className="label">Biển số xe</label><input className="input" value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value.toUpperCase() })} placeholder="VD: 59X1-234.56" /></div>
              <div><label className="label">Số CCCD</label><input className="input" value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} /></div>
              <div><label className="label">Khu vực hoạt động</label><input className="input" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="VD: Quận 1, Quận 3" /></div>
            </div>
            <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setForm(null)}>Huỷ</button><button className="btn-primary">Thêm tài xế</button></div>
          </form>
        )}
      </Modal>
      <p className="text-xs text-slate-400">Tài xế đăng nhập tại <Link className="link" href="/login">/login</Link> → tự vào trang nhận đơn.</p>
    </div>
  );
}
