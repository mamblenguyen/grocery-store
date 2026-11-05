'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/Toast';
import { ProductCard, Spinner } from '@/components/ui';
import { useCart } from '@/context/cart';
import { api, imageUrl } from '@/lib/api';
import { money } from '@/lib/format';
import type { Product, Variant } from '@/lib/types';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const cart = useCart();
  const toast = useToast();
  const [p, setP] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Record<number, number>>({}); // optionId -> valueId
  const [qty, setQty] = useState(1);
  const [mainImg, setMainImg] = useState<string | null>(null);

  useEffect(() => {
    api<Product>(`/products/${slug}`)
      .then((prod) => {
        setP(prod);
        // Chọn sẵn biến thể đầu tiên còn hàng
        const first = prod.variants.find((v) => v.stock > 0) ?? prod.variants[0];
        if (first && prod.options) {
          const init: Record<number, number> = {};
          prod.options.forEach((o) => {
            const vid = o.values.find((val) => first.optionValueIds?.includes(val.id))?.id;
            if (vid) init[o.id] = vid;
          });
          setSelected(init);
        }
      })
      .catch((e) => setError(e.message));
  }, [slug]);

  const variant: Variant | undefined = useMemo(() => {
    if (!p) return;
    if (!p.options?.length) return p.variants[0];
    const ids = Object.values(selected);
    if (ids.length !== p.options.length) return;
    return p.variants.find((v) => ids.every((id) => v.optionValueIds?.includes(id)));
  }, [p, selected]);

  /** Giá trị option có thể chọn được không (tồn tại biến thể với các lựa chọn khác giữ nguyên) */
  const availability = (optionId: number, valueId: number) => {
    const others = Object.entries(selected).filter(([oid]) => Number(oid) !== optionId).map(([, v]) => v);
    const matches = p!.variants.filter((v) => v.optionValueIds?.includes(valueId) && others.every((o) => v.optionValueIds?.includes(o)));
    if (!matches.length) return 'none';
    return matches.some((m) => m.stock > 0) ? 'ok' : 'out';
  };

  if (error) return <div className="py-20 text-center">{error} · <Link href="/products" className="text-brand-700">Quay lại</Link></div>;
  if (!p) return <Spinner />;

  const images = [...new Set([variant?.image, p.thumbnail, ...p.images].filter(Boolean) as string[])];
  const shown = mainImg ?? images[0];

  const addToCart = (buyNow = false) => {
    if (!variant) return toast('Vui lòng chọn đầy đủ phân loại', 'error');
    if (variant.stock <= 0) return toast('Biến thể này đã hết hàng', 'error');
    const inCart = cart.items.find((i) => i.variantId === variant.id)?.quantity ?? 0;
    if (inCart + qty > variant.stock) return toast(`Chỉ còn ${variant.stock} sản phẩm (giỏ đã có ${inCart})`, 'error');
    cart.add({
      variantId: variant.id, productId: p.id, slug: p.slug, productName: p.name, variantName: variant.name,
      image: variant.image || p.thumbnail, price: variant.price, stock: variant.stock,
    }, qty);
    if (buyNow) router.push('/cart');
    else toast('Đã thêm vào giỏ hàng');
  };

  return (
    <div>
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/">Trang chủ</Link> / <Link href={`/products?category=${p.category?.slug ?? ''}`}>{p.category?.name}</Link> / {p.name}
      </nav>
      <div className="card grid gap-8 md:grid-cols-2">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl(shown)} alt={p.name} className="aspect-square w-full rounded-xl object-cover" />
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {images.map((img) => (
              <button key={img} onClick={() => setMainImg(img)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${img === shown ? 'border-brand-500' : 'border-transparent'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(img)} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-500">Thương hiệu: <b>{p.brand || '—'}</b></div>
          <h1 className="mt-1 text-2xl font-bold">{p.name}</h1>
          <div className="mt-1 text-sm text-gray-500">Đã bán {p.soldCount}</div>

          <div className="mt-4 flex items-end gap-3 rounded-xl bg-gray-50 p-4">
            <span className="text-3xl font-bold text-brand-700">{money(variant?.price ?? p.minPrice)}</span>
            {variant?.compareAtPrice && variant.compareAtPrice > variant.price && (
              <>
                <span className="text-gray-400 line-through">{money(variant.compareAtPrice)}</span>
                <span className="badge bg-red-100 text-red-700">-{Math.round((1 - variant.price / variant.compareAtPrice) * 100)}%</span>
              </>
            )}
            {!variant && p.maxPrice > p.minPrice && <span className="text-xl text-gray-500">– {money(p.maxPrice)}</span>}
          </div>

          {p.options?.map((o) => (
            <div key={o.id} className="mt-5">
              <div className="mb-2 text-sm font-medium">{o.name}</div>
              <div className="flex flex-wrap gap-2">
                {o.values.map((val) => {
                  const state = availability(o.id, val.id);
                  const active = selected[o.id] === val.id;
                  return (
                    <button
                      key={val.id}
                      disabled={state === 'none'}
                      onClick={() => { setSelected((s) => ({ ...s, [o.id]: val.id })); setQty(1); setMainImg(null); }}
                      className={`rounded-lg border px-4 py-2 text-sm transition ${
                        active ? 'border-brand-600 bg-brand-50 font-medium text-brand-700' : 'border-gray-300 hover:border-brand-500'
                      } ${state !== 'ok' ? 'text-gray-400' : ''} disabled:cursor-not-allowed disabled:line-through`}
                    >
                      {val.value}
                      {state === 'out' && <span className="ml-1 text-xs">(hết)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center rounded-lg border border-gray-300">
              <button className="px-3 py-2" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
              <input className="w-14 border-x border-gray-300 py-2 text-center outline-none" value={qty}
                onChange={(e) => setQty(Math.max(1, Math.min(Number(e.target.value) || 1, variant?.stock || 1)))} />
              <button className="px-3 py-2" onClick={() => setQty((q) => Math.min(q + 1, variant?.stock || 1))}>+</button>
            </div>
            <span className="text-sm text-gray-500">
              {variant ? (variant.stock > 0 ? `Còn ${variant.stock} ${p.unit ?? 'sản phẩm'}` : 'Hết hàng') : 'Chọn phân loại'}
            </span>
          </div>
          {variant && <div className="mt-2 text-xs text-gray-400">SKU: {variant.sku}</div>}

          <div className="mt-6 flex gap-3">
            <button className="btn-outline flex-1 border-brand-600 py-3 text-brand-700" disabled={!variant || variant.stock <= 0} onClick={() => addToCart()}>
              Thêm vào giỏ
            </button>
            <button className="btn-primary flex-1 py-3" disabled={!variant || variant.stock <= 0} onClick={() => addToCart(true)}>
              Mua ngay
            </button>
          </div>

          {p.description && (
            <div className="mt-8">
              <h2 className="mb-2 font-semibold">Mô tả sản phẩm</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line text-gray-600">{p.description}</p>
            </div>
          )}
        </div>
      </div>

      {!!p.related?.length && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold">Sản phẩm liên quan</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {p.related.map((r) => <ProductCard key={r.id} p={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}
