'use client';
import { CircleCheck } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { AuthShell } from '@/components/shop/AuthShell';
import { api } from '@/lib/api';

function Inner() {
  const token = useSearchParams().get('token') ?? '';
  const [pwd, setPwd] = useState({ a: '', b: '' });
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <AuthShell title="Đặt lại mật khẩu" subtitle="Tạo mật khẩu mới cho tài khoản của bạn.">
      {done ? (
        <div className="space-y-4 text-center"><CircleCheck className="mx-auto h-14 w-14 text-brand-600" /><p>Đổi mật khẩu thành công!</p><Link href="/login" className="btn-primary">Đăng nhập</Link></div>
      ) : !token ? (
        <p className="text-slate-500">Liên kết không hợp lệ. <Link href="/forgot-password" className="link">Gửi lại liên kết</Link></p>
      ) : (
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          if (pwd.a !== pwd.b) return setError('Mật khẩu nhập lại không khớp');
          setLoading(true); setError('');
          try { await api('/auth/reset-password', { method: 'POST', json: { token, newPassword: pwd.a } }); setDone(true); }
          catch (e: any) { setError(e.message); } finally { setLoading(false); }
        }}>
          {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error} {/hết hạn|không hợp lệ/.test(error) && <Link href="/forgot-password" className="link">Gửi lại</Link>}</div>}
          <div><label className="label">Mật khẩu mới</label><input className="input" type="password" minLength={6} required autoComplete="new-password" value={pwd.a} onChange={(e) => setPwd({ ...pwd, a: e.target.value })} /></div>
          <div><label className="label">Nhập lại mật khẩu</label><input className="input" type="password" minLength={6} required autoComplete="new-password" value={pwd.b} onChange={(e) => setPwd({ ...pwd, b: e.target.value })} /></div>
          <button className="btn-primary btn-lg w-full" disabled={loading}>{loading ? 'Đang lưu…' : 'Đặt mật khẩu mới'}</button>
        </form>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><Inner /></Suspense>;
}
