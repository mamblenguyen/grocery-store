'use client';
import { ScanLine, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/Toast';
import { api, imageUrl } from '@/lib/api';
import { money } from '@/lib/format';
import type { Variant } from '@/lib/types';
import { BarcodeScanner } from './BarcodeScanner';
import { beep, useHidScanner } from './scan-utils';

export type PickedVariant = Variant & { product: NonNullable<Variant['product']> };

/**
 * Ô tìm sản phẩm theo tên / SKU / mã vạch.
 * - Gõ để tìm, chọn trong danh sách
 * - Máy quét mã vạch USB: quét → mã được gõ + Enter → tra mã chính xác
 * - Nút camera: quét bằng điện thoại / webcam (liên tục)
 */
export function VariantPicker({ onPick, placeholder = 'Tìm tên sản phẩm, SKU hoặc quét mã vạch…', autoFocus, showPrice = 'cost' }: {
  onPick: (v: PickedVariant) => void; placeholder?: string; autoFocus?: boolean; showPrice?: 'cost' | 'price';
}) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PickedVariant[]>([]);
  const [open, setOpen] = useState(false);
  const [scan, setScan] = useState(false);
  const [hi, setHi] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) return setResults([]);
    const t = setTimeout(() => api<PickedVariant[]>(`/admin/stock/variants?search=${encodeURIComponent(q.trim())}`).then((r) => { setResults(r); setHi(0); }), 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const h = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const pick = (v: PickedVariant) => { onPick(v); setQ(''); setResults([]); setOpen(false); input.current?.focus(); };

  const lookup = async (code: string) => {
    try { pick(await api<PickedVariant>(`/admin/stock/lookup?code=${encodeURIComponent(code)}`)); beep('ok'); }
    catch (e: any) { beep('error'); toast(e.message, 'error'); }
  };
  // Máy quét USB/Bluetooth hoạt động cả khi không focus ô tìm kiếm
  useHidScanner(lookup);

  const onKey = async (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = q.trim();
      if (!code) return;
      // Ưu tiên tra mã chính xác (máy quét USB), nếu không có thì chọn kết quả đang chọn
      try { pick(await api<PickedVariant>(`/admin/stock/lookup?code=${encodeURIComponent(code)}`)); beep('ok'); }
      catch { if (results[hi]) pick(results[hi]); else { beep('error'); toast(`Không tìm thấy "${code}"`, 'error'); } }
    }
  };

  return (
    <div ref={box} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input ref={input} autoFocus={autoFocus} className="input pl-10" placeholder={placeholder} value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey} />
        </div>
        <button type="button" className="btn-outline shrink-0" onClick={() => setScan(true)} title="Quét bằng camera"><ScanLine className="h-4 w-4" /><span className="hidden sm:inline">Quét mã</span></button>
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full right-0 left-0 z-30 mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lift">
          {results.map((v, i) => (
            <button type="button" key={v.id} onMouseEnter={() => setHi(i)} onClick={() => pick(v)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${i === hi ? 'bg-brand-50' : ''}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl(v.image || v.product.thumbnail)} alt="" className="h-10 w-10 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink">{v.product.name} <span className="font-normal text-slate-500">– {v.name}</span></div>
                <div className="font-mono text-xs text-slate-400">{v.sku}{v.barcode && ` · ${v.barcode}`}</div>
              </div>
              <div className="text-right text-xs">
                <div className="font-semibold text-ink">{money(showPrice === 'cost' ? v.costPrice : v.price)}</div>
                <div className={v.stock <= 0 ? 'text-red-500' : 'text-slate-400'}>Tồn: {v.stock}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      <BarcodeScanner open={scan} onClose={() => setScan(false)} onScan={lookup} continuous />
    </div>
  );
}
