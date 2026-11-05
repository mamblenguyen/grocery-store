'use client';
import { useStoreHref } from '@/context/store';
import { ShoppingBag, Trash2, Truck, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { QtyInput } from '@/components/ui';
import { useCart } from '@/context/cart';
import { useSettings } from '@/context/settings';
import { imageUrl } from '@/lib/api';
import { money } from '@/lib/format';

export function FreeShipProgress({ subtotal }: { subtotal: number }) {
  const { settings } = useSettings();
  const t = settings.freeShippingThreshold;
  if (!t) return null;
  const pct = Math.min(100, (subtotal / t) * 100);
  return (
    <div className="rounded-xl bg-brand-50 p-3 text-sm">
      <div className="flex items-center gap-2 font-medium text-brand-800">
        <Truck className="h-4 w-4" />
        {subtotal >= t ? 'Tuyệt! Đơn hàng được miễn phí giao hàng' : <>Mua thêm <b>{money(t - subtotal)}</b> để được miễn phí giao hàng</>}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-100"><div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export function CartDrawer() {
  const sh = useStoreHref();
  const { items, isOpen, setOpen, update, remove, subtotal, count } = useCart();
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname, setOpen]);
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[95]">
      <div className="animate-fade-in absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
      <aside className="animate-slide-in absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold">Giỏ hàng <span className="text-slate-400">({count})</span></h2>
          <button className="btn-icon btn-ghost" onClick={() => setOpen(false)} aria-label="Đóng"><X className="h-5 w-5" /></button>
        </div>
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-50"><ShoppingBag className="h-9 w-9 text-brand-600" /></div>
            <p className="text-slate-500">Giỏ hàng của bạn đang trống</p>
            <Link href={sh('/products')} className="btn-primary">Bắt đầu mua sắm</Link>
          </div>
        ) : (
          <>
            <div className="px-5 pt-4"><FreeShipProgress subtotal={subtotal} /></div>
            <div className="flex-1 divide-y divide-slate-100 overflow-y-auto px-5">
              {items.map((i) => (
                <div key={i.variantId} className="flex gap-3 py-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl(i.image)} alt="" className="h-20 w-20 shrink-0 rounded-xl border border-slate-100 object-cover" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link href={sh(`/products/${i.slug}`)} className="line-clamp-2 text-sm font-semibold text-ink hover:text-brand-700">{i.productName}</Link>
                    <span className="text-xs text-slate-400">{i.variantName}</span>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <QtyInput size="sm" value={i.quantity} max={i.stock} onChange={(q) => update(i.variantId, q)} />
                      <span className="text-sm font-bold text-brand-700">{money(i.price * i.quantity)}</span>
                    </div>
                  </div>
                  <button onClick={() => remove(i.variantId)} className="self-start p-1 text-slate-300 hover:text-red-500" aria-label="Xoá"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 p-5">
              <div className="flex justify-between text-base"><span>Tạm tính</span><span className="font-bold text-ink">{money(subtotal)}</span></div>
              <div className="grid grid-cols-2 gap-2">
                <Link href={sh('/cart')} className="btn-outline">Xem giỏ hàng</Link>
                <Link href={sh('/checkout')} className="btn-primary">Thanh toán</Link>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
