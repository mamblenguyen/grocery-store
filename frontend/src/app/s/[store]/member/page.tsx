'use client';
import QRCode from 'qrcode';
import { Gift, RefreshCw, ShieldCheck, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth';
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import { useToast } from '@/components/Toast';

type Coupon = { code: string; description?: string | null; type: 'PERCENT' | 'FIXED'; value: number };
type Options = { points: number; tier: string; pointValue: number; coupons: Coupon[] };
type Token = { qr: string; expiresAt: string; pointsToUse: number; couponCode: string | null };

export default function MemberAtCounterPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [options, setOptions] = useState<Options | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [points, setPoints] = useState(0);
  const [token, setToken] = useState<Token | null>(null);
  const [qr, setQr] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!loading && !user) router.replace('/login'); }, [loading, user, router]);
  useEffect(() => { if (user) api<Options>('/loyalty/pos-options').then(setOptions).catch((e) => toast(e.message, 'error')); }, [user, toast]);
  useEffect(() => { if (token) QRCode.toDataURL(token.qr, { width: 360, margin: 2, errorCorrectionLevel: 'M' }).then(setQr); }, [token]);
  useEffect(() => { if (!token) return; const tick = () => setSeconds(Math.max(0, Math.ceil((new Date(token.expiresAt).getTime() - Date.now()) / 1000))); tick(); const id = setInterval(tick, 1000); return () => clearInterval(id); }, [token]);
  const create = async () => { setBusy(true); try { setToken(await api<Token>('/loyalty/pos-token', { method: 'POST', json: { couponCode: couponCode || undefined, pointsToUse: points } })); } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); } };
  if (!user || !options) return <div className="container-x py-16 text-center text-slate-500">Đang tải thẻ thành viên…</div>;
  return <div className="container-x py-8"><div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1fr_360px]">
    <section className="card space-y-5 p-5">
      <div><h1 className="text-2xl font-extrabold text-ink">Mã thành viên tại quầy</h1><p className="mt-1 text-sm text-slate-500">Đưa QR cho thu ngân quét để tự động tích điểm. Bạn có thể chọn thêm điểm hoặc voucher muốn sử dụng.</p></div>
      <div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-brand-50 p-4"><Star className="mb-2 h-5 w-5 text-brand-700" /><b className="block text-xl text-brand-800">{options.points.toLocaleString('vi-VN')} điểm</b><span className="text-xs text-brand-700">1 điểm = {money(options.pointValue)}</span></div><div className="rounded-xl bg-amber-50 p-4"><Gift className="mb-2 h-5 w-5 text-amber-700" /><b className="block text-xl text-amber-800">Hạng {options.tier}</b><span className="text-xs text-amber-700">{options.coupons.length} ưu đãi</span></div></div>
      <div><label className="label">Số điểm muốn dùng</label><input className="input" type="number" min={0} max={options.points} value={points} onChange={(e) => { setPoints(Math.min(options.points, Math.max(0, Number(e.target.value) || 0))); setToken(null); }} /><div className="mt-1 text-xs text-slate-400">Giảm tối đa {money(points * options.pointValue)}</div></div>
      <div><label className="label">Voucher</label><select className="input" value={couponCode} onChange={(e) => { setCouponCode(e.target.value); setToken(null); }}><option value="">Không dùng voucher</option>{options.coupons.map((c) => <option key={c.code} value={c.code}>{c.code} – {c.description || (c.type === 'PERCENT' ? `Giảm ${c.value}%` : `Giảm ${money(c.value)}`)}</option>)}</select></div>
      <button className="btn-primary w-full" disabled={busy} onClick={create}>{busy ? 'Đang tạo mã…' : token ? 'Tạo mã QR mới' : points || couponCode ? 'Tạo mã dùng ưu đãi và tích điểm' : 'Tạo mã tích điểm'}</button>
      <div className="flex gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500"><ShieldCheck className="h-5 w-5 shrink-0 text-brand-600" /><span>Mã hiệu lực 2 phút, dùng một lần và chỉ tại cửa hàng này. Điểm/voucher chỉ bị trừ khi thanh toán thành công.</span></div>
    </section>
    <section className="card flex min-h-[410px] flex-col items-center justify-center p-5 text-center">{token && qr ? <><img src={qr} alt="QR thành viên tại quầy" className={`w-full max-w-[320px] ${seconds === 0 ? 'opacity-30' : ''}`} /><div className={`mt-3 font-bold ${seconds > 20 ? 'text-brand-700' : 'text-red-600'}`}>{seconds ? `Còn ${seconds} giây` : 'Mã đã hết hạn'}</div><div className="mt-1 text-xs text-slate-500">{token.couponCode ? `Voucher ${token.couponCode}` : 'Không dùng voucher'}{token.pointsToUse ? ` · ${token.pointsToUse} điểm` : ''}</div>{seconds === 0 && <button className="btn-outline mt-4" onClick={create}><RefreshCw className="h-4 w-4" /> Tạo lại mã</button>}</> : <><Gift className="h-16 w-16 text-slate-200" /><p className="mt-4 text-sm text-slate-400">QR sẽ xuất hiện ở đây sau khi bạn chọn ưu đãi.</p></>}</section>
  </div></div>;
}
