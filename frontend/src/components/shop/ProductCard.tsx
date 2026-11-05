'use client';
import { storeHref, useStoreSlug } from '@/context/store';
import { Heart, Plus, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { Stars } from '@/components/ui';
import { useOptionalCart } from '@/context/cart';
import { useWishlist } from '@/context/wishlist';
import { imageUrl } from '@/lib/api';
import { money } from '@/lib/format';
import type { Product } from '@/lib/types';

export function ProductCard({ p }: { p: Product }) {
  // Trong cửa hàng: link theo cửa hàng hiện tại; ở trang chung (yêu thích): theo cửa hàng của sản phẩm
  const slug = useStoreSlug() ?? p.store?.slug ?? null;
  const sh = (path: string) => (slug ? storeHref(slug, path) : '/');
  const cart = useOptionalCart();
  const wl = useWishlist();
  const toast = useToast();
  const router = useRouter();
  const active = p.variants.filter((v) => v.isActive !== false);
  const best = active.reduce<(typeof active)[number] | undefined>((b, v) => {
    const off = v.compareAtPrice && v.compareAtPrice > v.price ? 1 - v.price / v.compareAtPrice : 0;
    const bo = b?.compareAtPrice && b.compareAtPrice > b.price ? 1 - b.price / b.compareAtPrice : 0;
    return off > bo ? v : b;
  }, undefined);
  const discount = best?.compareAtPrice ? Math.round((1 - best.price / best.compareAtPrice) * 100) : 0;
  const outOfStock = active.every((v) => v.stock <= 0);
  const single = active.length === 1 ? active[0] : null;

  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!single || !cart) return router.push(sh(`/products/${p.slug}`));
    const inCart = cart.items.find((i) => i.variantId === single.id)?.quantity ?? 0;
    if (inCart >= single.stock) return toast(`Chỉ còn ${single.stock} sản phẩm`, 'error');
    cart.add({ variantId: single.id, productId: p.id, slug: p.slug, productName: p.name, variantName: single.name, image: p.thumbnail, price: single.price, stock: single.stock });
    toast(`Đã thêm "${p.name}" vào giỏ`);
  };

  return (
    <Link href={sh(`/products/${p.slug}`)} className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift">
      <div className="relative aspect-square overflow-hidden bg-slate-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl(p.thumbnail)} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
          {discount > 0 && <span className="badge bg-red-500 text-white shadow">-{discount}%</span>}
          {p.isFeatured && <span className="badge bg-amber-400 text-amber-950 shadow">Nổi bật</span>}
        </div>
        <button
          onClick={(e) => { e.preventDefault(); wl.toggle(p.id); }}
          className="absolute top-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm backdrop-blur transition hover:text-red-500"
          aria-label="Yêu thích"
        >
          <Heart className={`h-[18px] w-[18px] ${wl.has(p.id) ? 'fill-red-500 text-red-500' : ''}`} />
        </button>
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
            <span className="badge bg-slate-800 px-3 py-1 text-white">Tạm hết hàng</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <div className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{p.brand || p.category?.name}</div>
        <h3 className="mt-0.5 line-clamp-2 min-h-10 text-sm leading-5 font-semibold text-ink group-hover:text-brand-700">{p.name}</h3>
        <div className="mt-1.5 flex h-4 items-center gap-1.5 text-xs text-slate-400">
          {p.ratingCount > 0 && <><Stars value={p.ratingAvg} size="h-3.5 w-3.5" /><span>({p.ratingCount})</span></>}
          {p.soldCount > 0 && <span>{p.ratingCount > 0 && '·'} Đã bán {p.soldCount}</span>}
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="min-w-0">
            <div className="text-base leading-tight font-bold text-brand-700">{money(p.minPrice)}</div>
            {best?.compareAtPrice && discount > 0 ? (
              <div className="text-xs text-slate-400 line-through">{money(best.compareAtPrice)}</div>
            ) : (
              <div className="text-xs text-slate-400">{active.length > 1 ? `${active.length} phân loại` : p.unit ? `/ ${p.unit}` : ' '}</div>
            )}
          </div>
          {!outOfStock && (
            <button
              onClick={quickAdd}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition hover:bg-brand-600 hover:text-white"
              aria-label={single ? 'Thêm vào giỏ' : 'Chọn phân loại'}
              title={single ? 'Thêm vào giỏ' : 'Chọn phân loại'}
            >
              {single ? <Plus className="h-5 w-5" /> : <ShoppingCart className="h-[18px] w-[18px]" />}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ products, cols = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' }: { products: Product[]; cols?: string }) {
  return <div className={`grid gap-3 sm:gap-4 ${cols}`}>{products.map((p) => <ProductCard key={p.id} p={p} />)}</div>;
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
      <div className="aspect-square animate-pulse bg-slate-100" />
      <div className="space-y-2 p-3.5"><div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" /><div className="h-4 animate-pulse rounded bg-slate-100" /><div className="h-5 w-1/2 animate-pulse rounded bg-slate-100" /></div>
    </div>
  );
}
