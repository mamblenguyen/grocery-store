'use client';
import { ShoppingBag, Store, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Empty, QtyInput } from '@/components/ui';
import { useAllCarts } from '@/context/cart';
import { imageUrl } from '@/lib/api';
import { money } from '@/lib/format';

/** Giỏ hàng chung của sàn – nhóm theo cửa hàng, mỗi cửa hàng thanh toán & giao riêng */
export default function MarketCart() {
  const { groups, count, update, remove } = useAllCarts();
  if (!groups.length)
    return <div className="container-x py-10"><div className="card"><Empty icon={<ShoppingBag className="h-7 w-7" />} text="Giỏ hàng đang trống"><Link href="/" className="btn-primary">Mua sắm trên sàn</Link></Empty></div></div>;
  return (
    <div className="container-x space-y-5 py-8">
      <div>
        <h1 className="text-2xl font-bold">Giỏ hàng ({count})</h1>
        <p className="text-sm text-slate-500">Hàng từ {groups.length} cửa hàng. Mỗi cửa hàng giao hàng & thanh toán riêng – bấm “Thanh toán” ở từng cửa hàng.</p>
      </div>
      {groups.map((g) => (
        <div key={g.slug} className="card p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
            <Link href={`/s/${g.slug}`} className="flex items-center gap-2 font-bold text-ink hover:text-brand-700"><Store className="h-5 w-5 text-brand-600" />{g.name}</Link>
            <Link href={`/s/${g.slug}`} className="text-sm font-medium text-brand-700">Mua thêm tại cửa hàng →</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {g.items.map((i) => (
              <div key={i.variantId} className="flex flex-wrap items-center gap-3 px-5 py-3 sm:flex-nowrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(i.image)} alt="" className="h-16 w-16 shrink-0 rounded-xl border border-slate-100 object-cover" />
                <div className="min-w-0 flex-1">
                  <Link href={`/s/${g.slug}/products/${i.slug}`} className="font-semibold text-ink hover:text-brand-700">{i.productName}</Link>
                  <div className="text-sm text-slate-400">{i.variantName} · {money(i.price)}</div>
                </div>
                <QtyInput value={i.quantity} max={i.stock} onChange={(v) => update(g.slug, i.variantId, v)} size="sm" />
                <div className="w-24 text-right font-bold">{money(i.price * i.quantity)}</div>
                <button className="btn-icon btn-ghost h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => remove(g.slug, i.variantId)} aria-label="Xoá"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-4 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
            <span className="text-sm text-slate-500">Tạm tính ({g.count} SP): <b className="text-lg text-brand-700">{money(g.subtotal)}</b></span>
            <Link href={`/s/${g.slug}/checkout`} className="btn-primary">Thanh toán tại {g.name}</Link>
          </div>
        </div>
      ))}
    </div>
  );
}
