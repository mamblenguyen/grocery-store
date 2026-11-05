'use client';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Empty, Modal, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { date, money } from '@/lib/format';
import type { Coupon } from '@/lib/types';

const empty = { code: '', description: '', type: 'PERCENT', value: 10, minOrderValue: 0, maxDiscount: '', usageLimit: '', startsAt: '', endsAt: '', isActive: true };
type Form = typeof empty;

export default function CouponsPage() {
  const toast = useToast();
  const [list, setList] = useState<Coupon[] | null>(null);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);

  const load = () => api<Coupon[]>('/admin/coupons').then(setList);
  useEffect(() => { load(); }, []);

  const openForm = (c?: Coupon) => {
    setEditing(c ?? null);
    setForm(c ? {
      code: c.code, description: c.description ?? '', type: c.type, value: c.value, minOrderValue: c.minOrderValue,
      maxDiscount: c.maxDiscount?.toString() ?? '', usageLimit: c.usageLimit?.toString() ?? '',
      startsAt: c.startsAt?.slice(0, 10) ?? '', endsAt: c.endsAt?.slice(0, 10) ?? '', isActive: c.isActive,
    } : empty);
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form, value: Number(form.value), minOrderValue: Number(form.minOrderValue),
      maxDiscount: form.maxDiscount === '' ? null : Number(form.maxDiscount),
      usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit),
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      endsAt: form.endsAt ? new Date(form.endsAt + 'T23:59:59').toISOString() : null,
    };
    try {
      await api(editing ? `/admin/coupons/${editing.id}` : '/admin/coupons', { method: editing ? 'PUT' : 'POST', json: payload });
      toast('Đã lưu mã giảm giá'); setOpen(false); load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const status = (c: Coupon) => {
    const now = new Date();
    if (!c.isActive) return ['Tắt', 'bg-gray-200'];
    if (c.endsAt && new Date(c.endsAt) < now) return ['Hết hạn', 'bg-red-100 text-red-700'];
    if (c.startsAt && new Date(c.startsAt) > now) return ['Chưa bắt đầu', 'bg-yellow-100 text-yellow-800'];
    if (c.usageLimit && c.usedCount >= c.usageLimit) return ['Hết lượt', 'bg-orange-100 text-orange-700'];
    return ['Đang chạy', 'bg-green-100 text-green-800'];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mã giảm giá</h1>
        <button className="btn-primary" onClick={() => openForm()}>+ Tạo mã</button>
      </div>
      <div className="card overflow-x-auto p-0">
        {!list ? <Spinner /> : !list.length ? <Empty /> : (
          <table className="table">
            <thead><tr><th>Mã</th><th>Giảm</th><th>Đơn tối thiểu</th><th>Đã dùng</th><th>Thời gian</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {list.map((c) => {
                const [label, cls] = status(c);
                return (
                  <tr key={c.id}>
                    <td><div className="font-mono font-bold">{c.code}</div><div className="text-xs text-gray-500">{c.description}</div></td>
                    <td>{c.type === 'PERCENT' ? `${c.value}%` : money(c.value)}{c.maxDiscount ? <div className="text-xs text-gray-500">tối đa {money(c.maxDiscount)}</div> : null}</td>
                    <td>{money(c.minOrderValue)}</td>
                    <td>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
                    <td className="text-xs">{c.startsAt ? date(c.startsAt) : '…'} → {c.endsAt ? date(c.endsAt) : '…'}</td>
                    <td><span className={`badge ${cls}`}>{label}</span></td>
                    <td className="space-x-1 text-right">
                      <button className="btn-outline btn-sm" onClick={() => openForm(c)}>Sửa</button>
                      <button className="btn-danger btn-sm" onClick={async () => { if (confirm('Xoá mã này?')) { await api(`/admin/coupons/${c.id}`, { method: 'DELETE' }); load(); } }}>Xoá</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Sửa mã giảm giá' : 'Tạo mã giảm giá'} size="lg">
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Mã *</label><input className="input uppercase" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
            <div><label className="label">Loại</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="PERCENT">Phần trăm (%)</option><option value="FIXED">Số tiền cố định</option>
              </select></div>
          </div>
          <div><label className="label">Mô tả</label><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Giá trị *</label><input className="input" type="number" min={1} required value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} /></div>
            <div><label className="label">Đơn tối thiểu</label><input className="input" type="number" min={0} value={form.minOrderValue} onChange={(e) => setForm({ ...form, minOrderValue: Number(e.target.value) })} /></div>
            <div><label className="label">Giảm tối đa</label><input className="input" type="number" min={0} value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Số lượt</label><input className="input" type="number" min={1} placeholder="∞" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} /></div>
            <div><label className="label">Bắt đầu</label><input className="input" type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></div>
            <div><label className="label">Kết thúc</label><input className="input" type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Kích hoạt</label>
          <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setOpen(false)}>Huỷ</button><button className="btn-primary">Lưu</button></div>
        </form>
      </Modal>
    </div>
  );
}
