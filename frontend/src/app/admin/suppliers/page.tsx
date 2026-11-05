'use client';
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Empty, Modal, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import type { Supplier } from '@/lib/types';

const empty = { name: '', contactName: '', phone: '', email: '', address: '', taxCode: '', note: '', isActive: true };

export default function SuppliersPage() {
  const toast = useToast();
  const [list, setList] = useState<Supplier[] | null>(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const load = () => api<Supplier[]>(`/admin/suppliers${search ? `?search=${encodeURIComponent(search)}` : ''}`).then(setList);
  useEffect(() => { load(); }, [search]); // eslint-disable-line

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? undefined : v]));
    try { await api(editing ? `/admin/suppliers/${editing.id}` : '/admin/suppliers', { method: editing ? 'PATCH' : 'POST', json: payload }); toast('Đã lưu nhà cung cấp'); setOpen(false); load(); }
    catch (e: any) { toast(e.message, 'error'); }
  };
  const f = (k: keyof typeof empty, label: string, type = 'text') => (
    <div><label className="label">{label}</label><input className="input" type={type} value={String(form[k] ?? '')} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input className="input max-w-xs" placeholder="Tìm tên, SĐT, MST…" onKeyDown={(e) => e.key === 'Enter' && setSearch((e.target as HTMLInputElement).value)} />
        <button className="btn-primary ml-auto" onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}><Plus className="h-4 w-4" /> Thêm nhà cung cấp</button>
      </div>
      <div className="card overflow-x-auto p-0">
        {!list ? <Spinner /> : !list.length ? <Empty icon={<Building2 className="h-7 w-7" />} text="Chưa có nhà cung cấp" /> : (
          <table className="table">
            <thead><tr><th>Nhà cung cấp</th><th>Liên hệ</th><th>MST</th><th>Địa chỉ</th><th className="text-right">Số phiếu</th><th>Trạng thái</th><th /></tr></thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <td className="font-semibold text-ink">{s.name}</td>
                  <td className="text-sm">{s.contactName}<div className="text-xs text-slate-500">{s.phone} {s.email}</div></td>
                  <td className="font-mono text-xs">{s.taxCode}</td>
                  <td className="max-w-xs truncate text-sm">{s.address}</td>
                  <td className="text-right"><Link href={`/admin/stock?search=${encodeURIComponent(s.name)}`} className="link">{s._count?.documents ?? 0}</Link></td>
                  <td><span className={`badge ${s.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>{s.isActive ? 'Hoạt động' : 'Ngừng'}</span></td>
                  <td className="text-right whitespace-nowrap">
                    <button className="btn-icon btn-ghost h-8 w-8" onClick={() => { setEditing(s); setForm({ ...empty, ...Object.fromEntries(Object.entries(s).filter(([k]) => k in empty).map(([k, v]) => [k, v ?? ''])) } as typeof empty); setOpen(true); }}><Pencil className="h-4 w-4" /></button>
                    <button className="btn-icon btn-ghost h-8 w-8 text-red-500" onClick={async () => { if (confirm(`Xoá "${s.name}"? (NCC đã có phiếu sẽ chỉ bị ngừng hoạt động)`)) { await api(`/admin/suppliers/${s.id}`, { method: 'DELETE' }); load(); } }}><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'} size="lg">
        <form onSubmit={save} className="space-y-4">
          <div><label className="label">Tên nhà cung cấp *</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid gap-4 sm:grid-cols-3">{f('contactName', 'Người liên hệ')}{f('phone', 'Điện thoại')}{f('email', 'Email', 'email')}</div>
          <div className="grid gap-4 sm:grid-cols-3"><div className="sm:col-span-2">{f('address', 'Địa chỉ')}</div>{f('taxCode', 'Mã số thuế')}</div>
          {f('note', 'Ghi chú')}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Đang hợp tác</label>
          <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setOpen(false)}>Huỷ</button><button className="btn-primary">Lưu</button></div>
        </form>
      </Modal>
    </div>
  );
}
