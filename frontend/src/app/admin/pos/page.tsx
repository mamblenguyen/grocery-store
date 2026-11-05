'use client';
import {
  Banknote, Camera, CameraOff, CircleCheck, Keyboard, Minus, Plus, Printer, QrCode, RotateCcw, ScanLine, Search, ShoppingBasket, Trash2, User, X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraScanPanel } from '@/components/admin/CameraScanPanel';
import { beep, useHidScanner } from '@/components/admin/scan-utils';
import { PickedVariant } from '@/components/admin/VariantPicker';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/ui';
import { useSettings } from '@/context/settings';
import { api, imageUrl } from '@/lib/api';
import { money, vietQrUrl } from '@/lib/format';
import type { Order } from '@/lib/types';

interface Line { v: PickedVariant; qty: number }
interface Bill {
  id: number; lines: Line[]; customer: { name: string; phone: string }; method: 'CASH' | 'BANK_TRANSFER';
  cash: number | ''; manualDiscount: number | ''; coupon: string; couponDiscount: number;
}
const newBill = (id: number): Bill => ({ id, lines: [], customer: { name: '', phone: '' }, method: 'CASH', cash: '', manualDiscount: '', coupon: '', couponDiscount: 0 });
const STORE_KEY = 'pos_bills_v1';

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
  const [bills, setBills] = useState<Bill[]>([newBill(1)]);
  const [active, setActive] = useState(0);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PickedVariant[]>([]);
  const [mult, setMult] = useState(1);
  const [camera, setCamera] = useState(false);
  const [flash, setFlash] = useState<number | null>(null);
  const [done, setDone] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const multRef = useRef(1);
  multRef.current = mult;

  // Khôi phục hoá đơn đang chờ & lựa chọn camera (lưu trên trình duyệt của quầy)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (saved?.bills?.length) { setBills(saved.bills); setActive(Math.min(saved.active ?? 0, saved.bills.length - 1)); }
      setCamera(localStorage.getItem('pos_camera') === '1');
    } catch {}
    setReady(true);
    api<PickedVariant[]>('/admin/stock/variants?search=').then((r) => setQuick(r.filter((v) => v.isActive && v.product.isActive)));
  }, []);
  useEffect(() => { if (ready) try { localStorage.setItem(STORE_KEY, JSON.stringify({ bills, active })); } catch {} }, [bills, active, ready]);
  useEffect(() => { if (ready) try { localStorage.setItem('pos_camera', camera ? '1' : '0'); } catch {} }, [camera, ready]);

  const bill = bills[active] ?? bills[0];
  const update = (patch: Partial<Bill>) => setBills((bs) => bs.map((b, i) => (i === active ? { ...b, ...patch } : b)));

  const billsRef = useRef(bills);
  billsRef.current = bills;
  const activeRef = useRef(active);
  activeRef.current = active;

  const add = useCallback((v: PickedVariant, qty = 1) => {
    if (!v.isActive || v.product.isActive === false) { beep('error'); toast(`"${v.product.name}" đang ngừng bán`, 'error'); return false; }
    const cur = billsRef.current[activeRef.current];
    const inBill = cur?.lines.find((l) => l.v.id === v.id)?.qty ?? 0;
    if (inBill + qty > v.stock) { beep('error'); toast(`"${v.product.name} – ${v.name}" chỉ còn ${v.stock} (hoá đơn đã có ${inBill})`, 'error'); return false; }
    const idx = activeRef.current;
    setBills((bs) => bs.map((b, i) => {
      if (i !== idx) return b;
      const ex = b.lines.find((l) => l.v.id === v.id);
      const next = Math.min((ex?.qty ?? 0) + qty, v.stock); // chặn trần khi quét rất nhanh liên tiếp
      const lines = ex ? b.lines.map((l) => (l.v.id === v.id ? { v, qty: next } : l)) : [{ v, qty: next }, ...b.lines];
      return { ...b, lines, couponDiscount: 0 };
    }));
    beep('ok');
    setFlash(v.id); setTimeout(() => setFlash((f) => (f === v.id ? null : f)), 700);
    return true;
  }, [toast]);

  /** Xử lý một mã quét được (camera / máy quét / ô nhập) */
  const handleCode = useCallback(async (raw: string) => {
    let code = raw.trim();
    let qty = multRef.current;
    const m = code.match(/^(\d{1,3})\*(.*)$/);
    if (m) { qty = Number(m[1]); code = m[2].trim(); }
    if (!code) { setMult(Math.max(1, qty)); return; }
    try {
      const v = await api<PickedVariant>(`/admin/stock/lookup?code=${encodeURIComponent(code)}`);
      if (add(v, Math.max(1, qty))) setMult(1);
    } catch {
      beep('error');
      toast(`Không tìm thấy mã "${code}"`, 'error');
    }
  }, [add, toast]);

  // Máy quét USB/Bluetooth: bắt ở mọi nơi trên trang
  useHidScanner(handleCode, !done);

  useEffect(() => {
    if (!q.trim() || /^\d{1,3}\*$/.test(q.trim())) return setResults([]);
    const t = setTimeout(() => api<PickedVariant[]>(`/admin/stock/variants?search=${encodeURIComponent(q.replace(/^\d{1,3}\*/, '').trim())}`).then(setResults), 200);
    return () => clearTimeout(t);
  }, [q]);

  const onInputKey = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setQ(''); setResults([]); setMult(1); return; }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const raw = q.trim();
    if (!raw) return;
    if (/^\d{1,3}\*$/.test(raw)) { setMult(Number(raw.slice(0, -1)) || 1); setQ(''); return; }
    const before = multRef.current;
    const m = raw.match(/^(\d{1,3})\*(.*)$/);
    const codePart = (m ? m[2] : raw).trim();
    try {
      const v = await api<PickedVariant>(`/admin/stock/lookup?code=${encodeURIComponent(codePart)}`);
      if (add(v, m ? Number(m[1]) : before)) setMult(1);
    } catch {
      // Không phải mã → chọn kết quả tìm kiếm đầu tiên
      if (results[0]) { if (add(results[0], m ? Number(m[1]) : before)) setMult(1); }
      else { beep('error'); toast(`Không tìm thấy "${codePart}"`, 'error'); }
    }
    setQ(''); setResults([]);
  };

  const setQty = (id: number, qty: number) => update({ lines: bill.lines.map((l) => (l.v.id === id ? { ...l, qty: Math.max(1, Math.min(qty, l.v.stock)) } : l)), couponDiscount: 0 });
  const subtotal = bill.lines.reduce((s, l) => s + l.v.price * l.qty, 0);
  const md = Math.min(Number(bill.manualDiscount) || 0, Math.max(0, subtotal - bill.couponDiscount));
  const total = Math.max(0, subtotal - bill.couponDiscount - md);
  const change = bill.method === 'CASH' && bill.cash !== '' ? Number(bill.cash) - total : 0;
  const itemCount = bill.lines.reduce((s, l) => s + l.qty, 0);

  const applyCoupon = async () => {
    try { const r = await api<{ discount: number }>('/coupons/validate', { method: 'POST', json: { code: bill.coupon, subtotal } }); update({ couponDiscount: r.discount }); toast(`Giảm ${money(r.discount)}`); }
    catch (e: any) { update({ couponDiscount: 0 }); toast(e.message, 'error'); }
  };

  const addBill = () => { const id = Math.max(...bills.map((b) => b.id)) + 1; setBills([...bills, newBill(id)]); setActive(bills.length); };
  const closeBill = (i: number) => {
    if (bills[i].lines.length && !confirm(`Huỷ hoá đơn chờ #${bills[i].id}?`)) return;
    const rest = bills.filter((_, j) => j !== i);
    setBills(rest.length ? rest : [newBill(1)]);
    setActive((a) => Math.max(0, Math.min(a > i ? a - 1 : a, rest.length - 1)));
  };

  const checkout = useCallback(async () => {
    if (!bill.lines.length) return toast('Chưa có sản phẩm', 'error');
    if (bill.method === 'CASH' && bill.cash !== '' && Number(bill.cash) < total) return toast('Tiền khách đưa chưa đủ', 'error');
    setBusy(true);
    try {
      const order = await api<Order>('/admin/orders/pos', {
        method: 'POST',
        json: {
          items: bill.lines.map((l) => ({ variantId: l.v.id, quantity: l.qty })),
          paymentMethod: bill.method, cashReceived: bill.method === 'CASH' ? (bill.cash === '' ? total : Number(bill.cash)) : undefined,
          manualDiscount: md || undefined, couponCode: bill.couponDiscount ? bill.coupon : undefined,
          customerName: bill.customer.name || undefined, phone: bill.customer.phone || undefined,
        },
      });
      setDone(order);
      setQuick((qv) => qv.map((v) => { const l = bill.lines.find((x) => x.v.id === v.id); return l ? { ...v, stock: v.stock - l.qty } : v; }));
      // Xong hoá đơn này → bỏ khỏi danh sách chờ
      const rest = bills.filter((_, i) => i !== active);
      setBills(rest.length ? rest : [newBill(Math.max(...bills.map((b) => b.id)) + 1)]);
      setActive(0);
    } catch (e: any) { beep('error'); toast(e.message, 'error'); } finally { setBusy(false); }
  }, [bill, bills, active, total, md, toast]);

  // Phím tắt
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'F9') { e.preventDefault(); if (!done) checkout(); }
      if (e.key === 'F2') { e.preventDefault(); input.current?.focus(); }
      if (e.key === 'F4') { e.preventDefault(); update({ method: bill.method === 'CASH' ? 'BANK_TRANSFER' : 'CASH' }); }
      if (e.key === 'F8') { e.preventDefault(); update({ cash: total }); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_440px]">
      <div className="min-w-0 space-y-4">
        <div className="card space-y-3 p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <ScanLine className="absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-brand-600" />
              <input
                ref={input} autoFocus value={q}
                onChange={(e) => setQ(e.target.value)} onKeyDown={onInputKey}
                className="input h-12 pl-11 text-base"
                placeholder="Quét mã / gõ SKU, tên rồi Enter · “3*” để nhân số lượng"
              />
              {mult > 1 && <span className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg bg-accent-500 px-2 py-1 text-sm font-bold text-white">×{mult}</span>}
              {results.length > 0 && (
                <div className="absolute top-full right-0 left-0 z-30 mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lift">
                  {results.map((v) => (
                    <button key={v.id} onClick={() => { if (add(v, mult)) setMult(1); setQ(''); setResults([]); input.current?.focus(); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-brand-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl(v.image || v.product.thumbnail)} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-ink">{v.product.name} – {v.name}</div><div className="font-mono text-xs text-slate-400">{v.sku} {v.barcode}</div></div>
                      <div className="text-right text-sm"><b>{money(v.price)}</b><div className="text-xs text-slate-400">Tồn {v.stock}</div></div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className={`btn h-12 shrink-0 ${camera ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white'}`} onClick={() => setCamera(!camera)} title="Bật/tắt camera quét">
              {camera ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}<span className="hidden sm:inline">Camera</span>
            </button>
          </div>
          <CameraScanPanel active={camera && !done} onScan={handleCode} />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Keyboard className="h-3.5 w-3.5" /> Máy quét USB hoạt động ở mọi nơi trên trang</span>
            <span><kbd className="rounded bg-slate-100 px-1">F2</kbd> tìm</span><span><kbd className="rounded bg-slate-100 px-1">F4</kbd> đổi cách trả</span>
            <span><kbd className="rounded bg-slate-100 px-1">F8</kbd> khách đưa đủ</span><span><kbd className="rounded bg-slate-100 px-1">F9</kbd> thanh toán</span>
          </div>
        </div>
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-bold text-ink">Chọn nhanh</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {quick.map((v) => (
              <button key={v.id} onClick={() => add(v, mult) && setMult(1)} disabled={v.stock <= 0} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2 text-left transition hover:border-brand-400 hover:bg-brand-50/40 active:scale-[0.98] disabled:opacity-40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(v.image || v.product.thumbnail)} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
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

      <div className="card flex flex-col gap-3 p-4 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:self-start">
        {/* Hoá đơn chờ */}
        <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1">
          {bills.map((b, i) => (
            <div key={b.id} className={`flex shrink-0 items-center rounded-lg border text-sm ${i === active ? 'border-brand-600 bg-brand-50 font-semibold text-brand-800' : 'border-slate-200 text-slate-600'}`}>
              <button className="py-1.5 pr-1 pl-3" onClick={() => setActive(i)}>#{b.id}{b.lines.length > 0 && <span className="ml-1 text-xs">({b.lines.reduce((s, l) => s + l.qty, 0)})</span>}</button>
              <button className="py-1.5 pr-2 pl-1 text-slate-400 hover:text-red-500" onClick={() => closeBill(i)} aria-label="Đóng"><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          <button className="btn-ghost btn-sm shrink-0" onClick={addBill} title="Thêm hoá đơn chờ"><Plus className="h-4 w-4" /> Khách mới</button>
        </div>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold text-ink"><ShoppingBasket className="h-5 w-5 text-brand-600" /> Hoá đơn #{bill.id}</h2>
          {bill.lines.length > 0 && <button className="btn-ghost btn-sm text-red-600" onClick={() => confirm('Xoá hết sản phẩm trong hoá đơn này?') && update(newBill(bill.id))}><RotateCcw className="h-3.5 w-3.5" /> Làm mới</button>}
        </div>
        <div className="-mx-1 min-h-[140px] flex-1 space-y-1 overflow-y-auto px-1">
          {!bill.lines.length && <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-slate-400"><Search className="h-8 w-8" />Quét mã hoặc chọn sản phẩm để bắt đầu</div>}
          {bill.lines.map((l) => (
            <div key={l.v.id} className={`flex items-center gap-2 rounded-xl border p-2 transition-colors ${flash === l.v.id ? 'border-brand-400 bg-brand-50' : 'border-slate-100'}`}>
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-ink">{l.v.product.name}</div><div className="truncate text-xs text-slate-400">{l.v.name} · {money(l.v.price)}</div></div>
              <div className="flex items-center rounded-lg border border-slate-200">
                <button className="p-1.5 text-slate-500" onClick={() => setQty(l.v.id, l.qty - 1)}><Minus className="h-3.5 w-3.5" /></button>
                <input className="w-9 text-center text-sm font-semibold outline-none" value={l.qty} onChange={(e) => setQty(l.v.id, Number(e.target.value) || 1)} />
                <button className="p-1.5 text-slate-500" onClick={() => setQty(l.v.id, l.qty + 1)}><Plus className="h-3.5 w-3.5" /></button>
              </div>
              <div className="w-20 text-right text-sm font-bold">{money(l.v.price * l.qty)}</div>
              <button className="p-1 text-slate-300 hover:text-red-500" onClick={() => update({ lines: bill.lines.filter((x) => x.v.id !== l.v.id), couponDiscount: 0 })}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>

        <div className="space-y-2.5 border-t border-slate-100 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="relative"><User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="input pl-9" placeholder="Tên khách" value={bill.customer.name} onChange={(e) => update({ customer: { ...bill.customer, name: e.target.value } })} /></div>
            <input className="input" placeholder="SĐT" value={bill.customer.phone} onChange={(e) => update({ customer: { ...bill.customer, phone: e.target.value } })} />
            <div className="flex gap-1"><input className="input uppercase" placeholder="Mã giảm giá" value={bill.coupon} onChange={(e) => update({ coupon: e.target.value, couponDiscount: 0 })} /><button className="btn-outline px-3" onClick={applyCoupon} disabled={!bill.coupon || !subtotal}>✓</button></div>
            <input className="input" type="number" min={0} placeholder="Giảm tay (₫)" value={bill.manualDiscount} onChange={(e) => update({ manualDiscount: e.target.value === '' ? '' : Number(e.target.value) })} />
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Tạm tính ({itemCount} SP)</span><span>{money(subtotal)}</span></div>
            {bill.couponDiscount + md > 0 && <div className="flex justify-between text-red-600"><span>Giảm giá</span><span>-{money(bill.couponDiscount + md)}</span></div>}
            <div className="flex items-end justify-between"><span className="font-semibold text-ink">Khách cần trả</span><span className="text-3xl font-extrabold text-brand-700">{money(total)}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className={`btn ${bill.method === 'CASH' ? 'bg-brand-600 text-white' : 'border border-slate-200'}`} onClick={() => update({ method: 'CASH' })}><Banknote className="h-4 w-4" /> Tiền mặt</button>
            <button className={`btn ${bill.method === 'BANK_TRANSFER' ? 'bg-brand-600 text-white' : 'border border-slate-200'}`} onClick={() => update({ method: 'BANK_TRANSFER' })}><QrCode className="h-4 w-4" /> Chuyển khoản</button>
          </div>
          {bill.method === 'CASH' ? (
            <div className="space-y-2">
              <input className="input text-lg font-bold" type="number" min={0} placeholder="Tiền khách đưa" value={bill.cash} onChange={(e) => update({ cash: e.target.value === '' ? '' : Number(e.target.value) })} />
              {total > 0 && <div className="flex flex-wrap gap-1.5">{cashSuggestions(total).map((s) => <button key={s} className={`chip text-xs ${bill.cash === s ? 'chip-active' : ''}`} onClick={() => update({ cash: s })}>{s.toLocaleString('vi-VN')}</button>)}</div>}
              {bill.cash !== '' && <div className={`flex justify-between rounded-xl p-3 text-sm font-semibold ${change >= 0 ? 'bg-brand-50 text-brand-800' : 'bg-red-50 text-red-700'}`}><span>{change >= 0 ? 'Tiền thối lại' : 'Còn thiếu'}</span><span className="text-lg">{money(Math.abs(change))}</span></div>}
            </div>
          ) : settings.bank.accountNo && total > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vietQrUrl(settings.bank, total, `HD quay ${bill.id}`)} alt="QR" className="mx-auto w-44 rounded-xl border" />
          ) : null}
          <button className="btn-primary btn-lg w-full" onClick={checkout} disabled={busy || !bill.lines.length}>{busy ? 'Đang xử lý…' : `Thanh toán ${money(total)} (F9)`}</button>
        </div>
      </div>

      <Modal open={!!done} onClose={() => { setDone(null); setTimeout(() => input.current?.focus(), 50); }} title="Thanh toán thành công">
        {done && (
          <div className="space-y-4 text-center">
            <CircleCheck className="mx-auto h-14 w-14 text-brand-600" />
            <div><div className="text-sm text-slate-500">Hoá đơn {done.code}</div><div className="text-3xl font-extrabold text-ink">{money(done.total)}</div></div>
            {done.paymentMethod === 'CASH' && done.cashReceived != null && <div className="rounded-xl bg-slate-50 p-3 text-sm">Khách đưa {money(done.cashReceived)} · Thối lại <b className="text-brand-700">{money(done.cashReceived - done.total)}</b></div>}
            <div className="grid grid-cols-2 gap-2">
              <a className="btn-outline" href={`/print/invoice/${done.id}?format=k80`} target="_blank"><Printer className="h-4 w-4" /> In bill K80</a>
              <a className="btn-outline" href={`/print/invoice/${done.id}`} target="_blank"><Printer className="h-4 w-4" /> In hoá đơn A4</a>
            </div>
            <button className="btn-primary w-full" autoFocus onClick={() => { setDone(null); setTimeout(() => input.current?.focus(), 50); }}>Khách tiếp theo (Enter)</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
