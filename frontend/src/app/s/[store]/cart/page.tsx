'use client';
import { useStoreHref } from '@/context/store';
import { ArrowLeft, ShoppingBag, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FreeShipProgress } from '@/components/shop/CartDrawer';
import { Empty, QtyInput } from '@/components/ui';
import { useCart } from '@/context/cart';
import { useSettings } from '@/context/settings';
import { api, imageUrl } from '@/lib/api';
import { money } from '@/lib/format';

export default function CartPage() {
  const sh = useStoreHref();
  const { items, update, remove, subtotal, clear } = useCart();
  const { settings } = useSettings();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!items.length) return;
    api('/orders/preview', { method: 'POST', json: { items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })) } })
      .then(() => setError('')).catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items.map((i) => [i.variantId, i.quantity]))]);

  if (!items.length)
    return <div className="container-x py-10"><div className="card"><Empty icon={<ShoppingBag className="h-7 w-7" />} text="Giỏ hàng của bạn đang trống"><Link href={sh('/products')} className="btn-primary">Tiếp tục mua sắm</Link></Empty></div></div>;

  const shipping = subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingFee;
  const belowMin = settings.minOrderValue > 0 && subtotal < settings.minOrderValue;

  return (
    <div className="container-x py-8">
      <h1 className="mb-6 text-2xl font-bold">Giỏ hàng <span className="text-slate-400">({items.length} sản phẩm)</span></h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="card p-0">
          {error && <div className="m-5 mb-0 rounded-xl bg-red-50 p-3 text-sm text-red-700">⚠ {error}</div>}
          <div className="divide-y divide-slate-100">
            {items.map((i) => (
              <div key={i.variantId} className="flex gap-4 p-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(i.image)} alt="" className="h-24 w-24 shrink-0 rounded-xl border border-slate-100 object-cover" />
                <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <Link href={sh(`/products/${i.slug}`)} className="font-semibold text-ink hover:text-brand-700">{i.productName}</Link>
                    <div className="text-sm text-slate-400">{i.variantName}</div>
                    <div className="mt-1 font-semibold text-brand-700">{money(i.price)}</div>
                  </div>
                  <QtyInput value={i.quantity} max={i.stock} onChange={(q) => update(i.variantId, q)} />
                  <div className="w-28 font-bold text-ink sm:text-right">{money(i.price * i.quantity)}</div>
                </div>
                <button onClick={() => remove(i.variantId)} className="self-start p-1 text-slate-300 hover:text-red-500" aria-label="Xoá"><Trash2 className="h-5 w-5" /></button>
              </div>
            ))}
          </div>
          <div className="flex justify-between border-t border-slate-100 p-5">
            <Link href={sh('/products')} className="btn-ghost"><ArrowLeft className="h-4 w-4" /> Tiếp tục mua sắm</Link>
            <button onClick={() => confirm('Xoá toàn bộ giỏ hàng?') && clear()} className="btn-ghost text-red-600">Xoá giỏ hàng</button>
          </div>
        </div>
        <div className="space-y-4">
          <FreeShipProgress subtotal={subtotal} />
          <div className="card space-y-3">
            <h2 className="font-bold text-ink">Tóm tắt đơn hàng</h2>
            <div className="flex justify-between text-sm"><span>Tạm tính</span><span className="font-medium text-ink">{money(subtotal)}</span></div>
            <div className="flex justify-between text-sm"><span>Phí giao hàng</span><span className="font-medium text-ink">{shipping ? money(shipping) : 'Miễn phí'}</span></div>
            <div className="flex justify-between border-t border-slate-100 pt-3 text-lg font-bold"><span>Tổng cộng</span><span className="text-brand-700">{money(subtotal + shipping)}</span></div>
            {belowMin && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Đơn tối thiểu {money(settings.minOrderValue)}</div>}
            <Link href={sh('/checkout')} className={`btn-primary btn-lg w-full ${error || belowMin ? 'pointer-events-none opacity-50' : ''}`}>Tiến hành thanh toán</Link>
            <p className="text-center text-xs text-slate-400">Mã giảm giá được áp dụng ở bước thanh toán</p>
          </div>
        </div>
      </div>
    </div>
  );
}
