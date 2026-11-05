'use client';
import { useEffect, useState } from 'react';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { useToast } from '@/components/Toast';
import { Modal, Spinner } from '@/components/ui';
import { api, imageUrl } from '@/lib/api';
import type { Category } from '@/lib/types';

const empty = { name: '', slug: '', description: '', image: '', sortOrder: 0, isActive: true, parentId: '' as string | number };

export default function AdminCategoriesPage() {
  const toast = useToast();
  const [list, setList] = useState<Category[] | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const load = () => api<Category[]>('/admin/categories').then(setList);
  useEffect(() => { load(); }, []);

  const openForm = (c?: Category) => {
    setEditing(c ?? null);
    setForm(c ? { name: c.name, slug: c.slug, description: c.description ?? '', image: c.image ?? '', sortOrder: c.sortOrder, isActive: c.isActive, parentId: c.parentId ?? '' } : empty);
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, parentId: form.parentId === '' ? null : Number(form.parentId), slug: form.slug || undefined, sortOrder: Number(form.sortOrder) };
    try {
      await api(editing ? `/admin/categories/${editing.id}` : '/admin/categories', { method: editing ? 'PATCH' : 'POST', json: payload });
      toast('Đã lưu danh mục');
      setOpen(false);
      load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const remove = async (c: Category) => {
    if (!confirm(`Xoá danh mục "${c.name}"? Sản phẩm thuộc danh mục sẽ chuyển về "Không có danh mục".`)) return;
    try { await api(`/admin/categories/${c.id}`, { method: 'DELETE' }); toast('Đã xoá'); load(); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Danh mục</h1>
        <button className="btn-primary" onClick={() => openForm()}>+ Thêm danh mục</button>
      </div>
      <div className="card overflow-x-auto p-0">
        {!list ? <Spinner /> : (
          <table className="table">
            <thead><tr><th>Danh mục</th><th>Slug</th><th>Danh mục cha</th><th>Thứ tự</th><th>Số SP</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td><div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl(c.image)} alt="" className="h-9 w-9 rounded object-cover" /><span className="font-medium">{c.name}</span>
                  </div></td>
                  <td className="text-gray-500">{c.slug}</td>
                  <td>{c.parent?.name ?? '—'}</td>
                  <td>{c.sortOrder}</td>
                  <td>{c._count?.products}</td>
                  <td><span className={`badge ${c.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200'}`}>{c.isActive ? 'Hiển thị' : 'Ẩn'}</span></td>
                  <td className="space-x-1 text-right">
                    <button className="btn-outline btn-sm" onClick={() => openForm(c)}>Sửa</button>
                    <button className="btn-danger btn-sm" onClick={() => remove(c)}>Xoá</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Sửa danh mục' : 'Thêm danh mục'}>
        <form onSubmit={save} className="space-y-3">
          <div><label className="label">Tên *</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Slug</label><input className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
            <div><label className="label">Thứ tự</label><input className="input" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} /></div>
          </div>
          <div><label className="label">Danh mục cha</label>
            <select className="input" value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
              <option value="">— Không —</option>
              {list?.filter((c) => c.id !== editing?.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="label">Mô tả</label><textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><label className="label">Ảnh</label><ImageUploader value={form.image ? [form.image] : []} onChange={(v) => setForm({ ...form, image: v[0] ?? '' })} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Hiển thị</label>
          <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setOpen(false)}>Huỷ</button><button className="btn-primary">Lưu</button></div>
        </form>
      </Modal>
    </div>
  );
}
