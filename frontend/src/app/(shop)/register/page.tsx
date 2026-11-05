'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { AuthShell } from '@/components/shop/AuthShell';
import { useAuth } from '@/context/auth';
import { lastStore } from '@/context/store';

function RegisterInner() {
  const { register } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get('next');
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setError('Mật khẩu nhập lại không khớp');
    setLoading(true);
    try { const { confirm, ...data } = form; await register(data); router.push(next || (lastStore.get() ? `/s/${lastStore.get()!.slug}` : '/')); }
    catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };
  const f = (k: keyof typeof form, label: string, type = 'text', required = true, auto?: string) => (
    <div><label className="label">{label}</label><input className="input" type={type} autoComplete={auto} required={required} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>
  );

  return (
    <AuthShell title="Tạo tài khoản" subtitle="Chỉ mất 30 giây để bắt đầu mua sắm">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {f('fullName', 'Họ và tên', 'text', true, 'name')}
        <div className="grid gap-4 sm:grid-cols-2">{f('email', 'Email', 'email', true, 'email')}{f('phone', 'Số điện thoại', 'tel', false, 'tel')}</div>
        <div className="grid gap-4 sm:grid-cols-2">{f('password', 'Mật khẩu (≥ 6 ký tự)', 'password', true, 'new-password')}{f('confirm', 'Nhập lại mật khẩu', 'password', true, 'new-password')}</div>
        <button className="btn-primary btn-lg w-full" disabled={loading}>{loading ? 'Đang tạo tài khoản…' : 'Đăng ký'}</button>
        <p className="text-center text-sm text-slate-500">Đã có tài khoản? <Link href="/login" className="link">Đăng nhập</Link></p>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return <Suspense><RegisterInner /></Suspense>;
}
