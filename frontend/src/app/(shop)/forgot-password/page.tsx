'use client';
import { MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { AuthShell } from '@/components/shop/AuthShell';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <AuthShell title="Quên mật khẩu" subtitle="Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.">
      {sent ? (
        <div className="space-y-4 text-center">
          <MailCheck className="mx-auto h-14 w-14 text-brand-600" />
          <p className="text-slate-600">{sent}</p>
          <p className="text-sm text-slate-400">Liên kết có hiệu lực trong 30 phút. Kiểm tra cả hộp thư Spam.</p>
          <Link href="/login" className="btn-primary">Quay lại đăng nhập</Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault(); setLoading(true); setError('');
          try { setSent((await api<{ message: string }>('/auth/forgot-password', { method: 'POST', json: { email } })).message); }
          catch (e: any) { setError(e.message); } finally { setLoading(false); }
        }}>
          {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div><label className="label">Email</label><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <button className="btn-primary btn-lg w-full" disabled={loading}>{loading ? 'Đang gửi…' : 'Gửi liên kết đặt lại'}</button>
          <p className="text-center text-sm"><Link href="/login" className="link">← Quay lại đăng nhập</Link></p>
        </form>
      )}
    </AuthShell>
  );
}
