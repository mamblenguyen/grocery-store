'use client';
import { KeyRound, Plus, UserMinus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Empty, Modal, Spinner } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { api } from '@/lib/api';
import { date, ROLES } from '@/lib/format';
import type { User } from '@/lib/types';

type Member = User & { _count: { createdOrders: number } };
const EMPTY = { email: '', password: '', fullName: '', phone: '', role: 'STAFF' as 'STAFF' | 'ADMIN' };

export default function StaffPage() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [list, setList] = useState<Member[] | null>(null);
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const [pwd, setPwd] = useState<{ u: Member; value: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => api<Member[]>('/admin/staff').then(setList).catch((e) => { toast(e.message, 'error'); setList([]); });
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const update = async (u: Member, patch: Record<string, unknown>, msg = 'Đã cập nhật') => {
    try { await api(`/admin/staff/${u.id}`, { method: 'PATCH', json: patch }); toast(msg); load(); return true; }
    catch (e: any) { toast(e.message, 'error'); return false; }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await api('/admin/staff', { method: 'POST', json: { ...form, phone: form!.phone || undefined } }); toast('Đã thêm nhân viên'); setForm(null); load(); }
    catch (e: any) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  const remove = async (u: Member) => {
    if (!confirm(`Gỡ ${u.fullName} khỏi cửa hàng? Tài khoản sẽ trở thành khách hàng thường, lịch sử bán hàng vẫn được giữ.`)) return;
    try { await api(`/admin/staff/${u.id}`, { method: 'DELETE' }); toast('Đã gỡ khỏi cửa hàng'); load(); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Nhân viên</h1>
          <p className="text-sm text-slate-500">Tài khoản đăng nhập trang quản trị & app bán hàng của cửa hàng. Nhân viên không xem được cài đặt, gói dịch vụ và danh sách nhân viên.</p>
        </div>
        <button className="btn-primary" onClick={() => setForm(EMPTY)}><Plus className="h-4 w-4" /> Thêm nhân viên</button>
      </div>

      <div className="card overflow-x-auto p-0">
        {!list ? <Spinner /> : !list.length ? <Empty icon={<Users className="h-7 w-7" />} /> : (
          <table className="table">
            <thead><tr><th>Nhân viên</th><th>SĐT</th><th>Vai trò</th><th>Đơn đã bán</th><th>Ngày thêm</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id}>
                  <td><div className="font-medium">{u.fullName}{u.id === me?.id && <span className="ml-1 text-xs text-slate-400">(bạn)</span>}</div><div className="text-xs text-slate-500">{u.email}</div></td>
                  <td>{u.phone || '—'}</td>
                  <td>
                    <select className="input w-40 py-1" disabled={u.id === me?.id} value={u.role} onChange={(e) => update(u, { role: e.target.value })}>
                      <option value="ADMIN">{ROLES.ADMIN} / quản lý</option>
                      <option value="STAFF">{ROLES.STAFF}</option>
                    </select>
                  </td>
                  <td>{u._count.createdOrders}</td>
                  <td className="text-xs">{date(u.createdAt)}</td>
                  <td><span className={`badge ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>{u.isActive ? 'Hoạt động' : 'Đã khoá'}</span></td>
                  <td className="space-x-1 text-right whitespace-nowrap">
                    <button className="btn-outline btn-sm" onClick={() => setPwd({ u, value: '' })} title="Đặt lại mật khẩu"><KeyRound className="h-3.5 w-3.5" /></button>
                    {u.id !== me?.id && (
                      <>
                        <button className={u.isActive ? 'btn-outline btn-sm' : 'btn-primary btn-sm'} onClick={() => update(u, { isActive: !u.isActive })}>{u.isActive ? 'Khoá' : 'Mở khoá'}</button>
                        <button className="btn-danger btn-sm" onClick={() => remove(u)} title="Gỡ khỏi cửa hàng"><UserMinus className="h-3.5 w-3.5" /></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title="Thêm nhân viên">
        {form && (
          <form onSubmit={create} className="space-y-3">
            <div><label className="label">Họ tên *</label><input className="input" required minLength={2} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Email đăng nhập *</label><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><label className="label">Số điện thoại</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Mật khẩu *</label><input className="input" type="text" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Tối thiểu 6 ký tự" /></div>
              <div><label className="label">Vai trò</label>
                <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'STAFF' })}>
                  <option value="STAFF">Nhân viên bán hàng / kho</option>
                  <option value="ADMIN">Quản lý (toàn quyền cửa hàng)</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-slate-500">Email là duy nhất trên toàn nền tảng. Gói dịch vụ có thể giới hạn số nhân viên.</p>
            <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-ghost" onClick={() => setForm(null)}>Huỷ</button><button className="btn-primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Thêm nhân viên'}</button></div>
          </form>
        )}
      </Modal>

      <Modal open={!!pwd} onClose={() => setPwd(null)} title={`Đặt lại mật khẩu – ${pwd?.u.fullName ?? ''}`}>
        {pwd && (
          <form onSubmit={async (e) => { e.preventDefault(); if (await update(pwd.u, { password: pwd.value }, 'Đã đặt lại mật khẩu')) setPwd(null); }} className="space-y-3">
            <div><label className="label">Mật khẩu mới</label><input className="input" required minLength={6} value={pwd.value} onChange={(e) => setPwd({ ...pwd, value: e.target.value })} /></div>
            <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setPwd(null)}>Huỷ</button><button className="btn-primary">Lưu mật khẩu</button></div>
          </form>
        )}
      </Modal>
    </div>
  );
}
