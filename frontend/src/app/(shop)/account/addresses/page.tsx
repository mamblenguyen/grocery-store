'use client';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AccountShell } from '@/components/shop/AccountShell';
import { useToast } from '@/components/Toast';
import { Empty, Modal, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import type { Address } from '@/lib/types';

const empty = { label: '', fullName: '', phone: '', address: '', isDefault: false };

export default function AddressesPage() {
  const toast = useToast();
  const [list, setList] = useState<Address[] | null>(null);
  const [editing, setEditing] = useState<Address | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const load = () => api<Address[]>('/addresses').then(setList);
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api(editing ? `/addresses/${editing.id}` : '/addresses', { method: editing ? 'PATCH' : 'POST', json: form });
      toast('Đã lưu địa chỉ'); setOpen(false); load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <AccountShell>
      <div className="card">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">Sổ địa chỉ</h2>
          <button className="btn-primary" onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}><Plus className="h-4 w-4" /> Thêm địa chỉ</button>
        </div>
        {!list ? <Spinner /> : !list.length ? <Empty icon={<MapPin className="h-7 w-7" />} text="Bạn chưa lưu địa chỉ nào" /> : (
          <div className="grid gap-3 md:grid-cols-2">
            {list.map((a) => (
              <div key={a.id} className={`rounded-xl border-2 p-4 ${a.isDefault ? 'border-brand-200 bg-brand-50/40' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-ink">{a.fullName} <span className="font-normal text-slate-400">· {a.phone}</span></div>
                    <div className="mt-1 text-sm text-slate-600">{a.label && <b>{a.label}: </b>}{a.address}</div>
                    {a.isDefault && <span className="badge mt-2 bg-brand-100 text-brand-800">Mặc định</span>}
                  </div>
                  <div className="flex gap-1">
                    <button className="btn-icon btn-ghost h-8 w-8" onClick={() => { setEditing(a); setForm({ label: a.label ?? '', fullName: a.fullName, phone: a.phone, address: a.address, isDefault: a.isDefault }); setOpen(true); }}><Pencil className="h-4 w-4" /></button>
                    <button className="btn-icon btn-ghost h-8 w-8 text-red-500" onClick={async () => { if (confirm('Xoá địa chỉ này?')) { await api(`/addresses/${a.id}`, { method: 'DELETE' }); load(); } }}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                {!a.isDefault && <button className="mt-3 text-sm font-medium text-brand-700" onClick={async () => { await api(`/addresses/${a.id}`, { method: 'PATCH', json: { ...a, label: a.label ?? undefined, isDefault: true } }); load(); }}>Đặt làm mặc định</button>}
              </div>
            ))}
          </div>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Sửa địa chỉ' : 'Thêm địa chỉ'}>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Họ tên *</label><input className="input" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
            <div><label className="label">Số điện thoại *</label><input className="input" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div><label className="label">Địa chỉ *</label><textarea className="input" rows={2} required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="flex flex-wrap gap-2">{['Nhà riêng', 'Công ty', 'Nhà bố mẹ'].map((l) => <button type="button" key={l} className={`chip ${form.label === l ? 'chip-active' : ''}`} onClick={() => setForm({ ...form, label: l })}>{l}</button>)}</div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} /> Đặt làm địa chỉ mặc định</label>
          <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setOpen(false)}>Huỷ</button><button className="btn-primary">Lưu</button></div>
        </form>
      </Modal>
    </AccountShell>
  );
}
