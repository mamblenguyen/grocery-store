'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { api } from '@/lib/api';

export default function AccountPage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [profile, setProfile] = useState({ fullName: '', phone: '', address: '' });
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '' });

  useEffect(() => {
    if (!loading && !user) router.replace('/login?next=/account');
    if (user) setProfile({ fullName: user.fullName, phone: user.phone ?? '', address: user.address ?? '' });
  }, [user, loading, router]);

  if (!user) return <Spinner />;

  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
      <form className="card space-y-4" onSubmit={async (e) => {
        e.preventDefault();
        try { await api('/auth/me', { method: 'PATCH', json: profile }); await refresh(); toast('Đã cập nhật thông tin'); }
        catch (e: any) { toast(e.message, 'error'); }
      }}>
        <h2 className="text-lg font-semibold">Thông tin cá nhân</h2>
        <div><label className="label">Email</label><input className="input bg-gray-100" disabled value={user.email} /></div>
        <div><label className="label">Họ tên</label><input className="input" value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} /></div>
        <div><label className="label">Số điện thoại</label><input className="input" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></div>
        <div><label className="label">Địa chỉ mặc định</label><textarea className="input" rows={2} value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} /></div>
        <button className="btn-primary">Lưu thay đổi</button>
      </form>
      <form className="card h-fit space-y-4" onSubmit={async (e) => {
        e.preventDefault();
        try { await api('/auth/change-password', { method: 'PATCH', json: pwd }); setPwd({ currentPassword: '', newPassword: '' }); toast('Đã đổi mật khẩu'); }
        catch (e: any) { toast(e.message, 'error'); }
      }}>
        <h2 className="text-lg font-semibold">Đổi mật khẩu</h2>
        <div><label className="label">Mật khẩu hiện tại</label><input className="input" type="password" required value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} /></div>
        <div><label className="label">Mật khẩu mới</label><input className="input" type="password" required minLength={6} value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} /></div>
        <button className="btn-primary">Đổi mật khẩu</button>
      </form>
    </div>
  );
}
