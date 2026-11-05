'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useAuth } from '@/context/auth';

function LoginInner() {
  const { login } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get('next');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const u = await login(email, password);
      router.push(next || (u.role === 'CUSTOMER' ? '/' : '/admin'));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <form onSubmit={submit} className="card space-y-4">
        <h1 className="text-center text-2xl font-bold">Đăng nhập</h1>
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div><label className="label">Email</label><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className="label">Mật khẩu</label><input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <button className="btn-primary w-full py-3" disabled={loading}>{loading ? 'Đang xử lý...' : 'Đăng nhập'}</button>
        <p className="text-center text-sm">Chưa có tài khoản? <Link href="/register" className="text-brand-700 hover:underline">Đăng ký</Link></p>
        <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
          Tài khoản demo: <b>admin@grocery.local</b> / <b>customer@grocery.local</b> – mật khẩu <b>123456</b>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginInner /></Suspense>;
}
