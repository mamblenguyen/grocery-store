'use client';
import { Banknote, CircleCheck, Minus, Plus, Printer, QrCode, RotateCcw, ShoppingBasket, Trash2, User } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { PickedVariant, VariantPicker } from '@/components/admin/VariantPicker';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/ui';
import { useSettings } from '@/context/settings';
import { api, imageUrl } from '@/lib/api';
import { money, vietQrUrl } from '@/lib/format';
import type { Order } from '@/lib/types';

interface Line { v: PickedVariant; qty: number }

/** Gợi ý tiền khách đưa: số tiền chẵn gần nhất theo các mệnh giá phổ biến */
function cashSuggestions(total: number) {
  const s = new Set<number>([total]);
  for (const step of [1000, 5000, 10000, 50000, 100000, 500000]) s.add(Math.ceil(total / step) * step);
  return [...s].filter((x) => x >= total).sort((a, b) => a - b).slice(0, 5);
}

export default function PosPage() {
  const toast = useToast();
  const { settings } = useSettings();
  const [quick, setQuick] = useState<PickedVariant[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [method, setMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [cash, setCash] = useState<number | ''>('');
  const [manualDiscount, setManualDiscount] = useState<number | ''>('');
  const [coupon, setCoupon] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [done, setDone] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api<PickedVariant[]>('/admin/stock/variants?search=').then((r) => setQuick(r.filter((v) => v.isActive && v.product.isActive))); }, []);

  const add = useCallback((v: PickedVariant) => {
    if (!v.isActive || v.product.isActive === false) return toast(`"${v.product.name}" đang ngừng bán`, 'error');
    setLines((ls) => {
      const ex = ls.find((l) => l.v.id === v.id);
      const qty = (ex?.qty ?? 0) + 1;
      if (qty > v.stock) { toast(`"${v.product.name} – ${v.name}" chỉ còn ${v.stock}`, 'error'); return ls; }
      return ex ? ls.map((l) => (l.v.id === v.id ? { ...l, qty } : l)) : [{ v, qty: 1 }, ...ls];
    });
  }, [toast]);

  const setQty = (id: number, qty: number) => setLines((ls) => ls.map((l) => (l.v.id === id ? { ...l, qty: Math.max(1, Math.min(qty, l.v.stock)) } : l)));
  const subtotal = lines.reduce((s, l) => s + l.v.price * l.qty, 0);
  const md = Math.min(Number(manualDiscount) || 0, Math.max(0, subtotal - couponDiscount));
  const total = Math.max(0, subtotal - couponDiscount - md);
  const change = method === 'CASH' && cash !== '' ? Number(cash) - total : 0;

  useEffect(() => { setCouponDiscount(0); }, [subtotal]);

  const applyCoupon = async () => {
    try {
      const r = await api<{ discount: number }>('/coupons/validate', { method: 'POST', json: { code: coupon, subtotal } });
      setCouponDiscount(r.discount); toast(`Giảm ${money(r.discount)}`);
    } catch (e: any) { setCouponDiscount(0); toast(e.message, 'error'); }
  };

  const reset = () => { setLines([]); setCustomer({ name: '', phone: '' }); setCash(''); setManualDiscount(''); setCoupon(''); setCouponDiscount(0); setMethod('CASH'); };

  const checkout = useCallback(async () => {
    if (!lines.length) return toast('Chưa có sản phẩm', 'error');
    if (method === 'CASH' && cash !== '' && Number(cash) < total) return toast('Tiền khách đưa chưa đủ', 'error');
    setBusy(true);
    try {
      const order = await api<Order>('/admin/orders/pos', {
        method: 'POST',
        json: {
          items: lines.map((l) => ({ variantId: l.v.id, quantity: l.qty })),
          paymentMethod: method, cashReceived: method === 'CASH' ? (cash === '' ? total : Number(cash)) : undefined,
          manualDiscount: md || undefined, couponCode: couponDiscount ? coupon : undefined,
          customerName: customer.name || undefined, phone: customer.phone || undefined,
        },
      });
      setDone(order);
      setQuick((q) => q.map((v) => { const l = lines.find((x) => x.v.id === v.id); return l ? { ...v, stock: v.stock - l.qty } : v; }));
      reset();
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  }, [lines, method, cash, total, md, couponDiscount, coupon, customer, toast]); // eslint-disable-line

  // Phím tắt F9 = thanh toán
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'F9') { e.preventDefault(); checkout(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [checkout]);

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_440px]">
      <div className="space-y-4">
        <div className="card"><VariantPicker onPick={add} autoFocus showPrice="price" placeholder="Quét mã vạch / QR hoặc gõ tên sản phẩm rồi Enter…" /></div>
        <div className="card">
          <h3 className="mb-3 text-sm font-bold text-ink">Chọn nhanh</h3>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {quick.map((v) => (
              <button key={v.id} onClick={() => add(v)} disabled={v.stock <= 0} className="group flex items-center gap-2.5 rounded-xl border border-slate-200 p-2 text-left transition hover:border-brand-400 hover:bg-brand-50/40 disabled:opacity-40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(v.image || v.product.thumbnail)} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0">
                  <div className="line-clamp-1 text-xs font-semibold text-ink">{v.product.name}</div>
                  <div className="line-clamp-1 text-[11px] text-slate-400">{v.name}</div>
                  <div className="text-xs font-bold text-brand-700">{money(v.price)} <span className="font-normal text-slate-400">· {v.stock}</span></div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card flex flex-col gap-4 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:self-start">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold text-ink"><ShoppingBasket className="h-5 w-5 text-brand-600" /> Hoá đơn bán lẻ</h2>
          {lines.length > 0 && <button className="btn-ghost btn-sm text-red-600" onClick={() => confirm('Huỷ hoá đơn đang nhập?') && reset()}><RotateCcw className="h-3.5 w-3.5" /> Làm mới</button>}
        </div>
        <div className="-mx-1 min-h-[120px] flex-1 space-y-1 overflow-y-auto px-1">
          {!lines.length && <div className="py-10 text-center text-sm text-slate-400">Quét mã hoặc chọn sản phẩm để bắt đầu</div>}
          {lines.map((l) => (
            <div key={l.v.id} className="flex items-center gap-2 rounded-xl border border-slate-100 p-2">
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-ink">{l.v.product.name}</div><div className="truncate text-xs text-slate-400">{l.v.name} · {money(l.v.price)}</div></div>
              <div className="flex items-center rounded-lg border border-slate-200">
                <button className="p-1.5 text-slate-500" onClick={() => setQty(l.v.id, l.qty - 1)}><Minus className="h-3.5 w-3.5" /></button>
                <input className="w-9 text-center text-sm font-semibold outline-none" value={l.qty} onChange={(e) => setQty(l.v.id, Number(e.target.value) || 1)} />
                <button className="p-1.5 text-slate-500" onClick={() => setQty(l.v.id, l.qty + 1)}><Plus className="h-3.5 w-3.5" /></button>
              </div>
              <div className="w-20 text-right text-sm font-bold">{money(l.v.price * l.qty)}</div>
              <button className="p-1 text-slate-300 hover:text-red-500" onClick={() => setLines((ls) => ls.filter((x) => x.v.id !== l.v.id))}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>

        <div className="space-y-3 border-t border-slate-100 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="relative"><User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="input pl-9" placeholder="Tên khách (tuỳ chọn)" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} /></div>
            <input className="input" placeholder="SĐT (tuỳ chọn)" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex gap-1"><input className="input uppercase" placeholder="Mã giảm giá" value={coupon} onChange={(e) => setCoupon(e.target.value)} /><button className="btn-outline px-3" onClick={applyCoupon} disabled={!coupon || !subtotal}>✓</button></div>
            <input className="input" type="number" min={0} placeholder="Giảm tay (₫)" value={manualDiscount} onChange={(e) => setManualDiscount(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Tạm tính ({lines.reduce((s, l) => s + l.qty, 0)} SP)</span><span>{money(subtotal)}</span></div>
            {couponDiscount + md > 0 && <div className="flex justify-between text-red-600"><span>Giảm giá</span><span>-{money(couponDiscount + md)}</span></div>}
            <div className="flex items-end justify-between pt-1"><span className="font-semibold text-ink">Khách cần trả</span><span className="text-3xl font-extrabold text-brand-700">{money(total)}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className={`btn ${method === 'CASH' ? 'bg-brand-600 text-white' : 'border border-slate-200'}`} onClick={() => setMethod('CASH')}><Banknote className="h-4 w-4" /> Tiền mặt</button>
            <button className={`btn ${method === 'BANK_TRANSFER' ? 'bg-brand-600 text-white' : 'border border-slate-200'}`} onClick={() => setMethod('BANK_TRANSFER')}><QrCode className="h-4 w-4" /> Chuyển khoản</button>
          </div>
          {method === 'CASH' ? (
            <div className="space-y-2">
              <input className="input text-lg font-bold" type="number" min={0} placeholder="Tiền khách đưa" value={cash} onChange={(e) => setCash(e.target.value === '' ? '' : Number(e.target.value))} />
              {total > 0 && <div className="flex flex-wrap gap-1.5">{cashSuggestions(total).map((s) => <button key={s} className={`chip text-xs ${cash === s ? 'chip-active' : ''}`} onClick={() => setCash(s)}>{s.toLocaleString('vi-VN')}</button>)}</div>}
              {cash !== '' && <div className={`flex justify-between rounded-xl p-3 text-sm font-semibold ${change >= 0 ? 'bg-brand-50 text-brand-800' : 'bg-red-50 text-red-700'}`}><span>{change >= 0 ? 'Tiền thối lại' : 'Còn thiếu'}</span><span className="text-lg">{money(Math.abs(change))}</span></div>}
            </div>
          ) : settings.bank.accountNo && total > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vietQrUrl(settings.bank, total, 'Thanh toan tai quay')} alt="QR" className="mx-auto w-48 rounded-xl border" />
          ) : null}
          <button className="btn-primary btn-lg w-full" onClick={checkout} disabled={busy || !lines.length}>{busy ? 'Đang xử lý…' : 'Thanh toán (F9)'}</button>
        </div>
      </div>

      <Modal open={!!done} onClose={() => setDone(null)} title="Thanh toán thành công">
        {done && (
          <div className="space-y-4 text-center">
            <CircleCheck className="mx-auto h-14 w-14 text-brand-600" />
            <div><div className="text-sm text-slate-500">Hoá đơn {done.code}</div><div className="text-3xl font-extrabold text-ink">{money(done.total)}</div></div>
            {done.paymentMethod === 'CASH' && done.cashReceived != null && (
              <div className="rounded-xl bg-slate-50 p-3 text-sm">Khách đưa {money(done.cashReceived)} · Thối lại <b className="text-brand-700">{money(done.cashReceived - done.total)}</b></div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <a className="btn-outline" href={`/print/invoice/${done.id}?format=k80`} target="_blank"><Printer className="h-4 w-4" /> In bill K80</a>
              <a className="btn-outline" href={`/print/invoice/${done.id}`} target="_blank"><Printer className="h-4 w-4" /> In hoá đơn A4</a>
            </div>
            <button className="btn-primary w-full" onClick={() => setDone(null)}>Đơn mới</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
