'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useCart } from '@/context/cart';
import { api } from '@/lib/api';
import { money, PAYMENT_METHOD } from '@/lib/format';
import type { Order } from '@/lib/types';

interface Preview { subtotal: number; discount: number; shippingFee: number; total: number; couponCode: string | null }

export default function CheckoutPage() {
  const { user, loading } = useAuth();
  const cart = useCart();
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ customerName: '', phone: '', address: '', note: '', paymentMethod: 'COD' });
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState<string | undefined>();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const lineItems = cart.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }));

  useEffect(() => {
    if (!loading && !user) router.replace('/login?next=/checkout');
    if (user) setForm((f) => ({ ...f, customerName: f.customerName || user.fullName, phone: f.phone || user.phone || '', address: f.address || user.address || '' }));
  }, [user, loading, router]);

  const runPreview = async (code?: string) => {
    try {
      const r = await api<Preview>('/orders/preview', { method: 'POST', json: { items: lineItems, couponCode: code } });
      setPreview(r);
      setError('');
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  };

  useEffect(() => {
    if (cart.items.length) runPreview(applied);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.items.length]);

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    if (await runPreview(coupon.trim())) {
      setApplied(coupon.trim());
      toast('Áp dụng mã giảm giá thành công');
    } else {
      await runPreview(applied);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const order = await api<Order>('/orders', { method: 'POST', json: { ...form, items: lineItems, couponCode: applied } });
      cart.clear();
      toast('Đặt hàng thành công!');
      router.push(`/orders/${order.id}?success=1`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) return <Spinner />;
  if (!cart.items.length) return <div className="card text-center">Giỏ hàng trống.</div>;

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
      <div className="card space-y-4 lg:col-span-2">
        <h1 className="text-xl font-bold">Thông tin giao hàng</h1>
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="label">Họ tên người nhận *</label>
            <input className="input" required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></div>
          <div><label className="label">Số điện thoại *</label>
            <input className="input" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        </div>
        <div><label className="label">Địa chỉ giao hàng *</label>
          <input className="input" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        <div><label className="label">Ghi chú</label>
          <textarea className="input" rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
        <div>
          <label className="label">Phương thức thanh toán</label>
          {Object.entries(PAYMENT_METHOD).map(([k, v]) => (
            <label key={k} className="mb-2 flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm">
              <input type="radio" checked={form.paymentMethod === k} onChange={() => setForm({ ...form, paymentMethod: k })} /> {v}
            </label>
          ))}
          {form.paymentMethod === 'BANK_TRANSFER' && (
            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              Vui lòng chuyển khoản tới STK <b>0123456789 – Ngân hàng ABC</b>, nội dung là mã đơn hàng sau khi đặt.
            </div>
          )}
        </div>
      </div>

      <div className="card h-fit space-y-3">
        <h2 className="font-semibold">Đơn hàng ({cart.count} sản phẩm)</h2>
        <div className="max-h-60 space-y-2 overflow-y-auto text-sm">
          {cart.items.map((i) => (
            <div key={i.variantId} className="flex justify-between gap-2">
              <span>{i.productName} <span className="text-gray-500">({i.variantName}) × {i.quantity}</span></span>
              <span className="shrink-0">{money(i.price * i.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 border-t pt-3">
          <input className="input uppercase" placeholder="Mã giảm giá" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
          <button type="button" className="btn-outline" onClick={applyCoupon}>Áp dụng</button>
        </div>
        {applied && (
          <div className="flex items-center justify-between text-sm text-brand-700">
            <span>Đã áp mã <b>{applied.toUpperCase()}</b></span>
            <button type="button" className="text-xs text-red-600" onClick={() => { setApplied(undefined); setCoupon(''); runPreview(); }}>Bỏ mã</button>
          </div>
        )}
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {preview && (
          <div className="space-y-2 border-t pt-3 text-sm">
            <div className="flex justify-between"><span>Tạm tính</span><span>{money(preview.subtotal)}</span></div>
            {preview.discount > 0 && <div className="flex justify-between text-red-600"><span>Giảm giá</span><span>-{money(preview.discount)}</span></div>}
            <div className="flex justify-between"><span>Phí giao hàng</span><span>{preview.shippingFee ? money(preview.shippingFee) : 'Miễn phí'}</span></div>
            <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Tổng thanh toán</span><span className="text-brand-700">{money(preview.total)}</span></div>
          </div>
        )}
        <button className="btn-primary w-full py-3" disabled={submitting || !preview}>{submitting ? 'Đang đặt hàng...' : 'Đặt hàng'}</button>
      </div>
    </form>
  );
}
