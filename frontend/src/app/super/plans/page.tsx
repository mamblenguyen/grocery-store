'use client';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Modal, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import type { Plan } from '@/lib/types';

type Form = { id?: number; code: string; name: string; description: string; priceMonthly: string; maxProducts: string; maxStaff: string; isActive: boolean; sortOrder: string };
const toForm = (p?: Plan): Form => ({
  id: p?.id, code: p?.code ?? '', name: p?.name ?? '', description: p?.description ?? '', priceMonthly: String(p?.priceMonthly ?? 0),
  maxProducts: p?.maxProducts == null ? '' : String(p.maxProducts), maxStaff: p?.maxStaff == null ? '' : String(p.maxStaff),
  isActive: p?.isActive ?? true, sortOrder: String(p?.sortOrder ?? 0),
});

export default function PlansPage() {
  const toast = useToast();
  const [list, setList] = useState<Plan[] | null>(null);
  const [f, setF] = useState<Form | null>(null);
  const load = () => api<Plan[]>('/super/plans').then(setList);
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      code: f!.code || undefined, name: f!.name, description: f!.description, priceMonthly: Number(f!.priceMonthly || 0),
      maxProducts: f!.maxProducts === '' ? null : Number(f!.maxProducts), maxStaff: f!.maxStaff === '' ? null : Number(f!.maxStaff),
      isActive: f!.isActive, sortOrder: Number(f!.sortOrder || 0),
    };
    try {
      await api(f!.id ? `/super/plans/${f!.id}` : '/super/plans', { method: f!.id ? 'PUT' : 'POST', json: body });
      toast('Đã lưu gói'); setF(null); load();
    } catch (err: any) { toast(err.message, 'error'); }
  };

  const remove = async (p: Plan) => {
    if (!confirm(`Xoá gói "${p.name}"?`)) return;
    try { await api(`/super/plans/${p.id}`, { method: 'DELETE' }); toast('Đã xoá'); load(); } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Gói dịch vụ</h1><p className="text-sm text-slate-500">Giới hạn để trống = không giới hạn. Gói "ngừng bán" không hiện trên trang giới thiệu nhưng cửa hàng đang dùng vẫn giữ.</p></div>
        <button className="btn-primary" onClick={() => setF(toForm())}><Plus className="h-4 w-4" /> Thêm gói</button>
      </div>
      {!list ? <Spinner /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <div key={p.id} className={`card flex flex-col ${p.isActive ? '' : 'opacity-70'}`}>
              <div className="flex items-start justify-between gap-2">
                <div><h3 className="text-lg font-bold">{p.name}</h3><div className="text-xs text-slate-400">Mã: {p.code}</div></div>
                <span className={`badge ${p.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>{p.isActive ? 'Đang bán' : 'Ngừng bán'}</span>
              </div>
              {p.description && <p className="mt-2 text-sm text-slate-500">{p.description}</p>}
              <div className="mt-3 text-2xl font-extrabold">{p.priceMonthly ? money(p.priceMonthly) : 'Miễn phí'}<span className="text-sm font-medium text-slate-400">{p.priceMonthly ? '/tháng' : ''}</span></div>
              <ul className="mt-3 space-y-1 text-sm text-slate-600">
                <li>Sản phẩm: <b>{p.maxProducts ?? 'Không giới hạn'}</b></li>
                <li>Nhân viên: <b>{p.maxStaff ?? 'Không giới hạn'}</b></li>
                <li>Đang dùng: <b>{p._count?.stores ?? 0}</b> cửa hàng</li>
              </ul>
              <div className="mt-auto flex justify-end gap-2 pt-4">
                <button className="btn-outline btn-sm" onClick={() => setF(toForm(p))}><Pencil className="h-3.5 w-3.5" /> Sửa</button>
                <button className="btn-outline btn-sm text-red-600" disabled={!!p._count?.stores} title={p._count?.stores ? 'Gói đang được sử dụng' : ''} onClick={() => remove(p)}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!f} onClose={() => setF(null)} title={f?.id ? 'Sửa gói dịch vụ' : 'Thêm gói dịch vụ'}>
        {f && (
          <form className="space-y-3" onSubmit={save}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Tên gói *</label><input className="input" required minLength={2} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
              <div><label className="label">Mã gói</label><input className="input" value={f.code} placeholder="tự tạo từ tên" onChange={(e) => setF({ ...f, code: e.target.value })} /></div>
            </div>
            <div><label className="label">Mô tả</label><input className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div><label className="label">Giá / tháng (₫)</label><input className="input" type="number" min={0} value={f.priceMonthly} onChange={(e) => setF({ ...f, priceMonthly: e.target.value })} /></div>
              <div><label className="label">Tối đa sản phẩm</label><input className="input" type="number" min={1} placeholder="Không giới hạn" value={f.maxProducts} onChange={(e) => setF({ ...f, maxProducts: e.target.value })} /></div>
              <div><label className="label">Tối đa nhân viên</label><input className="input" type="number" min={0} placeholder="Không giới hạn" value={f.maxStaff} onChange={(e) => setF({ ...f, maxStaff: e.target.value })} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Thứ tự hiển thị</label><input className="input" type="number" value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: e.target.value })} /></div>
              <label className="mt-7 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} /> Đang bán</label>
            </div>
            <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setF(null)}>Huỷ</button><button className="btn-primary">Lưu</button></div>
          </form>
        )}
      </Modal>
    </div>
  );
}
