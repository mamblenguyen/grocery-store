'use client';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { AuthShell } from '@/components/shop/AuthShell';
import { useAuth } from '@/context/auth';

function LoginInner() {
  const { login } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get('next');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try { const u = await login(email, password); router.push(next || (u.role === 'CUSTOMER' ? '/' : '/admin')); }
    catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <AuthShell title="Đăng nhập" subtitle="Chào mừng bạn quay lại! 👋">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div><label className="label">Email</label><input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div>
          <label className="label">Mật khẩu</label>
          <div className="relative">
            <input className="input pr-11" type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShow(!show)} className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400">{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
          </div>
        </div>
        <button className="btn-primary btn-lg w-full" disabled={loading}>{loading ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
        <p className="text-center text-sm text-slate-500">Chưa có tài khoản? <Link href={`/register${next ? `?next=${next}` : ''}`} className="link">Đăng ký ngay</Link></p>
        <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
          Tài khoản demo (mật khẩu <b>123456</b>):{' '}
          <button type="button" className="link" onClick={() => { setEmail('admin@grocery.local'); setPassword('123456'); }}>admin@grocery.local</button>{' · '}
          <button type="button" className="link" onClick={() => { setEmail('customer@grocery.local'); setPassword('123456'); }}>customer@grocery.local</button>
        </div>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return <Suspense><LoginInner /></Suspense>;
}
