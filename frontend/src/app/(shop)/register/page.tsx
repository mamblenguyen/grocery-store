'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/context/auth';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setError('Mật khẩu nhập lại không khớp');
    setLoading(true);
    try {
      const { confirm, ...data } = form;
      await register(data);
      router.push('/');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const f = (k: keyof typeof form, label: string, type = 'text', required = true) => (
    <div><label className="label">{label}</label>
      <input className="input" type={type} required={required} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>
  );

  return (
    <div className="mx-auto max-w-md">
      <form onSubmit={submit} className="card space-y-4">
        <h1 className="text-center text-2xl font-bold">Tạo tài khoản</h1>
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {f('fullName', 'Họ tên')}
        {f('email', 'Email', 'email')}
        {f('phone', 'Số điện thoại', 'tel', false)}
        {f('password', 'Mật khẩu (tối thiểu 6 ký tự)', 'password')}
        {f('confirm', 'Nhập lại mật khẩu', 'password')}
        <button className="btn-primary w-full py-3" disabled={loading}>{loading ? 'Đang xử lý...' : 'Đăng ký'}</button>
        <p className="text-center text-sm">Đã có tài khoản? <Link href="/login" className="text-brand-700 hover:underline">Đăng nhập</Link></p>
      </form>
    </div>
  );
}
