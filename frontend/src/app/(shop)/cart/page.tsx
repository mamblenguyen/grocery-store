'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Empty } from '@/components/ui';
import { useCart } from '@/context/cart';
import { api, imageUrl } from '@/lib/api';
import { money } from '@/lib/format';

export default function CartPage() {
  const { items, update, remove, subtotal, add } = useCart();
  const [error, setError] = useState('');

  // Đồng bộ lại giá & tồn kho mới nhất từ server
  useEffect(() => {
    if (!items.length) return;
    api('/orders/preview', { method: 'POST', json: { items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })) } })
      .then(() => setError(''))
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items.map((i) => [i.variantId, i.quantity]))]);

  if (!items.length)
    return (
      <div className="card">
        <Empty text="Giỏ hàng của bạn đang trống" />
        <div className="text-center"><Link href="/products" className="btn-primary">Tiếp tục mua sắm</Link></div>
      </div>
    );

  const shipping = subtotal >= 300000 ? 0 : 20000;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="card lg:col-span-2">
        <h1 className="mb-4 text-xl font-bold">Giỏ hàng ({items.length})</h1>
        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">⚠ {error}</div>}
        <div className="divide-y divide-gray-100">
          {items.map((i) => (
            <div key={i.variantId} className="flex gap-4 py-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl(i.image)} alt="" className="h-20 w-20 rounded-lg object-cover" />
              <div className="flex-1">
                <Link href={`/products/${i.slug}`} className="font-medium hover:text-brand-700">{i.productName}</Link>
                <div className="text-sm text-gray-500">Phân loại: {i.variantName}</div>
                <div className="mt-1 font-semibold text-brand-700">{money(i.price)}</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center rounded-lg border border-gray-300 text-sm">
                  <button className="px-2 py-1" onClick={() => update(i.variantId, i.quantity - 1)}>−</button>
                  <span className="w-10 text-center">{i.quantity}</span>
                  <button className="px-2 py-1" onClick={() => update(i.variantId, i.quantity + 1)} disabled={i.quantity >= i.stock}>+</button>
                </div>
                <div className="text-sm font-semibold">{money(i.price * i.quantity)}</div>
                <button onClick={() => remove(i.variantId)} className="text-xs text-red-600 hover:underline">Xoá</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card h-fit space-y-3">
        <h2 className="font-semibold">Tóm tắt đơn hàng</h2>
        <div className="flex justify-between text-sm"><span>Tạm tính</span><span>{money(subtotal)}</span></div>
        <div className="flex justify-between text-sm"><span>Phí giao hàng</span><span>{shipping ? money(shipping) : 'Miễn phí'}</span></div>
        {shipping > 0 && <div className="text-xs text-gray-500">Mua thêm {money(300000 - subtotal)} để được miễn phí giao hàng</div>}
        <div className="flex justify-between border-t pt-3 font-bold"><span>Tổng</span><span className="text-brand-700">{money(subtotal + shipping)}</span></div>
        <Link href="/checkout" className={`btn-primary w-full py-3 ${error ? 'pointer-events-none opacity-50' : ''}`}>Tiến hành đặt hàng</Link>
        <p className="text-xs text-gray-500">Mã giảm giá được áp dụng ở bước thanh toán.</p>
      </div>
    </div>
  );
}
