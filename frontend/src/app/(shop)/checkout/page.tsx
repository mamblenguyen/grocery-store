'use client';
import { Banknote, CalendarDays, CreditCard, Lock, MapPin, QrCode, TicketPercent } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useCart } from '@/context/cart';
import { useSettings } from '@/context/settings';
import { api, imageUrl } from '@/lib/api';
import { money } from '@/lib/format';
import type { Address, Order } from '@/lib/types';

interface Preview { subtotal: number; discount: number; shippingFee: number; total: number; couponCode: string | null; minOrderValue: number }

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export default function CheckoutPage() {
  const { user, loading } = useAuth();
  const { settings } = useSettings();
  const cart = useCart();
  const router = useRouter();
  const toast = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addrId, setAddrId] = useState<number | 'new'>('new');
  const [form, setForm] = useState({ customerName: '', phone: '', address: '', note: '' });
  const [payment, setPayment] = useState<'COD' | 'BANK_TRANSFER' | 'VNPAY'>('COD');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliverySlot, setDeliverySlot] = useState('');
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState<string | undefined>();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const lineItems = cart.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
  const days = useMemo(() => Array.from({ length: settings.deliveryDaysAhead + 1 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; }), [settings.deliveryDaysAhead]);
  const methods = [
    settings.payment.cod && { k: 'COD' as const, icon: <Banknote className="h-5 w-5" />, title: 'Thanh toán khi nhận hàng', sub: 'Trả tiền mặt cho shipper' },
    settings.payment.bankTransfer && { k: 'BANK_TRANSFER' as const, icon: <QrCode className="h-5 w-5" />, title: 'Chuyển khoản VietQR', sub: 'Quét mã QR bằng app ngân hàng' },
    settings.payment.vnpay && { k: 'VNPAY' as const, icon: <CreditCard className="h-5 w-5" />, title: 'VNPay', sub: 'Thẻ ATM, Visa, Master, QR' },
  ].filter(Boolean) as { k: 'COD' | 'BANK_TRANSFER' | 'VNPAY'; icon: React.ReactNode; title: string; sub: string }[];

  useEffect(() => { if (methods.length && !methods.some((m) => m.k === payment)) setPayment(methods[0].k); }, [methods.length]); // eslint-disable-line
  useEffect(() => { if (!deliveryDate && days.length) setDeliveryDate(ymd(days[0])); }, [days, deliveryDate]);

  useEffect(() => {
    if (!loading && !user) router.replace('/login?next=/checkout');
    if (!user) return;
    api<Address[]>('/addresses').then((list) => {
      setAddresses(list);
      const def = list.find((a) => a.isDefault) ?? list[0];
      if (def) { setAddrId(def.id); setForm((f) => ({ ...f, customerName: def.fullName, phone: def.phone, address: def.address })); }
      else setForm((f) => ({ ...f, customerName: user.fullName, phone: user.phone ?? '', address: user.address ?? '' }));
    });
  }, [user, loading, router]);

  const runPreview = async (code?: string) => {
    try { setPreview(await api<Preview>('/orders/preview', { method: 'POST', json: { items: lineItems, couponCode: code } })); setError(''); return true; }
    catch (e: any) { setError(e.message); return false; }
  };
  useEffect(() => { if (cart.items.length) runPreview(applied); }, [cart.items.length]); // eslint-disable-line

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    if (await runPreview(coupon.trim())) { setApplied(coupon.trim().toUpperCase()); toast('Áp dụng mã giảm giá thành công'); }
    else await runPreview(applied);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (settings.deliverySlots.length && !deliverySlot) return setError('Vui lòng chọn khung giờ giao hàng');
    setSubmitting(true);
    try {
      const order = await api<Order>('/orders', {
        method: 'POST',
        json: { ...form, items: lineItems, couponCode: applied, paymentMethod: payment, ...(settings.deliverySlots.length && { deliveryDate, deliverySlot }) },
      });
      if (addrId === 'new' && !addresses.length) api('/addresses', { method: 'POST', json: { fullName: form.customerName, phone: form.phone, address: form.address, isDefault: true } }).catch(() => {});
      cart.clear();
      if (payment === 'VNPAY') {
        const { paymentUrl } = await api<{ paymentUrl: string }>('/payments/vnpay/create', { method: 'POST', json: { orderId: order.id } });
        window.location.href = paymentUrl;
        return;
      }
      router.push(`/orders/${order.id}?success=1`);
    } catch (e: any) { setError(e.message); setSubmitting(false); }
  };

  if (loading || !user) return <Spinner />;
  if (!cart.items.length) return <div className="container-x py-16 text-center"><p className="mb-4 text-slate-500">Giỏ hàng trống.</p><Link href="/products" className="btn-primary">Mua sắm ngay</Link></div>;

  return (
    <form onSubmit={submit} className="container-x py-8">
      <h1 className="mb-6 text-2xl font-bold">Thanh toán</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-5">
          <section className="card space-y-4">
            <h2 className="flex items-center gap-2 font-bold text-ink"><MapPin className="h-5 w-5 text-brand-600" /> Địa chỉ nhận hàng</h2>
            {addresses.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {addresses.map((a) => (
                  <label key={a.id} className={`cursor-pointer rounded-xl border-2 p-3.5 text-sm transition ${addrId === a.id ? 'border-brand-600 bg-brand-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" className="sr-only" checked={addrId === a.id} onChange={() => { setAddrId(a.id); setForm({ ...form, customerName: a.fullName, phone: a.phone, address: a.address }); }} />
                    <div className="font-semibold text-ink">{a.fullName} · {a.phone} {a.isDefault && <span className="badge ml-1 bg-brand-100 text-brand-800">Mặc định</span>}</div>
                    <div className="mt-1 text-slate-500">{a.label && <b>{a.label}: </b>}{a.address}</div>
                  </label>
                ))}
                <label className={`flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed p-3.5 text-sm font-medium transition ${addrId === 'new' ? 'border-brand-600 text-brand-700' : 'border-slate-200 text-slate-500'}`}>
                  <input type="radio" className="sr-only" checked={addrId === 'new'} onChange={() => { setAddrId('new'); setForm({ ...form, customerName: user.fullName, phone: '', address: '' }); }} />+ Giao đến địa chỉ khác
                </label>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Họ tên người nhận *</label><input className="input" required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></div>
              <div><label className="label">Số điện thoại *</label><input className="input" required inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div><label className="label">Địa chỉ chi tiết *</label><input className="input" required placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><label className="label">Ghi chú cho cửa hàng</label><textarea className="input" rows={2} placeholder="VD: Gọi trước khi giao, chọn rau non…" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
          </section>

          {settings.deliverySlots.length > 0 && (
            <section className="card space-y-4">
              <h2 className="flex items-center gap-2 font-bold text-ink"><CalendarDays className="h-5 w-5 text-brand-600" /> Thời gian giao hàng</h2>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {days.map((d, i) => {
                  const v = ymd(d);
                  return (
                    <button type="button" key={v} onClick={() => setDeliveryDate(v)} className={`flex min-w-[76px] flex-col items-center rounded-xl border-2 px-3 py-2 transition ${deliveryDate === v ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 hover:border-slate-300'}`}>
                      <span className="text-xs font-medium">{i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : WD[d.getDay()]}</span>
                      <span className="text-lg font-bold">{pad(d.getDate())}/{pad(d.getMonth() + 1)}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.deliverySlots.map((s) => <button type="button" key={s} onClick={() => setDeliverySlot(s)} className={`chip ${deliverySlot === s ? 'chip-active' : ''}`}>{s}</button>)}
              </div>
            </section>
          )}

          <section className="card space-y-3">
            <h2 className="flex items-center gap-2 font-bold text-ink"><CreditCard className="h-5 w-5 text-brand-600" /> Phương thức thanh toán</h2>
            {methods.map((m) => (
              <label key={m.k} className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition ${payment === m.k ? 'border-brand-600 bg-brand-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" className="h-4 w-4 accent-brand-600" checked={payment === m.k} onChange={() => setPayment(m.k)} />
                <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${payment === m.k ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{m.icon}</span>
                <span><span className="block font-semibold text-ink">{m.title}</span><span className="text-sm text-slate-500">{m.sub}</span></span>
              </label>
            ))}
            {payment === 'BANK_TRANSFER' && <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-800">Sau khi đặt hàng, mã QR kèm sẵn số tiền & nội dung chuyển khoản sẽ hiển thị để bạn quét.</p>}
            {payment === 'VNPAY' && <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-800">Bạn sẽ được chuyển sang cổng VNPay để thanh toán an toàn.</p>}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-36 lg:self-start">
          <div className="card space-y-4">
            <h2 className="font-bold text-ink">Đơn hàng ({cart.count} sản phẩm)</h2>
            <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
              {cart.items.map((i) => (
                <div key={i.variantId} className="flex gap-3 text-sm">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl(i.image)} alt="" className="h-14 w-14 rounded-lg border border-slate-100 object-cover" />
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-700 px-1 text-[10px] font-bold text-white">{i.quantity}</span>
                  </div>
                  <div className="min-w-0 flex-1"><div className="line-clamp-1 font-medium text-ink">{i.productName}</div><div className="text-xs text-slate-400">{i.variantName}</div></div>
                  <div className="font-semibold">{money(i.price * i.quantity)}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 border-t border-slate-100 pt-4">
              <div className="relative flex-1"><TicketPercent className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="input pl-9 uppercase" placeholder="Mã giảm giá" value={coupon} onChange={(e) => setCoupon(e.target.value)} /></div>
              <button type="button" className="btn-outline" onClick={applyCoupon}>Áp dụng</button>
            </div>
            {applied && (
              <div className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
                <span>Mã <b>{applied}</b> đã được áp dụng</span>
                <button type="button" className="text-xs font-semibold text-red-600" onClick={() => { setApplied(undefined); setCoupon(''); runPreview(); }}>Bỏ</button>
              </div>
            )}
            {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            {preview && (
              <div className="space-y-2 border-t border-slate-100 pt-4 text-sm">
                <div className="flex justify-between"><span>Tạm tính</span><span className="font-medium text-ink">{money(preview.subtotal)}</span></div>
                {preview.discount > 0 && <div className="flex justify-between text-red-600"><span>Giảm giá</span><span>-{money(preview.discount)}</span></div>}
                <div className="flex justify-between"><span>Phí giao hàng</span><span className="font-medium text-ink">{preview.shippingFee ? money(preview.shippingFee) : 'Miễn phí'}</span></div>
                <div className="flex items-end justify-between border-t border-slate-100 pt-3"><span className="font-semibold text-ink">Tổng thanh toán</span><span className="text-2xl font-extrabold text-brand-700">{money(preview.total)}</span></div>
              </div>
            )}
            <button className="btn-primary btn-lg w-full" disabled={submitting || !preview}>
              <Lock className="h-4 w-4" />{submitting ? 'Đang xử lý…' : payment === 'VNPAY' ? 'Đặt hàng & thanh toán VNPay' : 'Đặt hàng'}
            </button>
          </div>
        </aside>
      </div>
    </form>
  );
}
