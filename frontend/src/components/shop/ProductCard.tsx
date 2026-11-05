'use client';
import { storeHref, useStoreHref, useStoreSlug } from '@/context/store';
import { Heart, Plus, ShoppingCart, Store } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { Stars } from '@/components/ui';
import { useAllCarts, useOptionalCart } from '@/context/cart';
import { useWishlist } from '@/context/wishlist';
import { imageUrl } from '@/lib/api';
import { money } from '@/lib/format';
import type { Product } from '@/lib/types';

export function ProductCard({ p }: { p: Product }) {
  // Trong cửa hàng: link theo cửa hàng hiện tại; ở trang chung (yêu thích): theo cửa hàng của sản phẩm
  const current = useStoreSlug();
  const inStore = useStoreHref();
  const slug = current ?? p.store?.slug ?? null;
  const sh = (path: string) => (current ? inStore(path) : slug ? storeHref(slug, path) : '/');
  const cart = useOptionalCart();
  const all = useAllCarts();
  // Trên sàn (ngoài cửa hàng): thêm thẳng vào giỏ của cửa hàng bán sản phẩm
  const market = !current && !!p.store;
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
    if (!single || (!cart && !market)) return router.push(sh(`/products/${p.slug}`));
    const line = { variantId: single.id, productId: p.id, slug: p.slug, productName: p.name, variantName: single.name, image: p.thumbnail, price: single.price, stock: single.stock };
    if (market) {
      if (!all.addTo({ slug: p.store!.slug, name: p.store!.name }, line)) return toast(`Chỉ còn ${single.stock} sản phẩm`, 'error');
      return toast(`Đã thêm "${p.name}" vào giỏ ${p.store!.name}`);
    }
    const inCart = cart!.items.find((i) => i.variantId === single.id)?.quantity ?? 0;
    if (inCart >= single.stock) return toast(`Chỉ còn ${single.stock} sản phẩm`, 'error');
    cart!.add(line);
    toast(`Đã thêm "${p.name}" vào giỏ`);
  };

  const totalStock = active.reduce((n, v) => n + Math.max(0, v.stock), 0);
  const lowStock = !outOfStock && totalStock > 0 && totalStock <= 10;
  const priceRange = p.maxPrice > p.minPrice;

  return (
    <Link href={sh(`/products/${p.slug}`)} className="group relative flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70 transition duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_-12px_rgb(15_23_42/0.25)] hover:ring-brand-300">
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl(p.thumbnail)} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]" />
        {discount > 0 && (
          <span className="absolute top-0 left-3 rounded-b-lg bg-gradient-to-b from-red-500 to-rose-600 px-2 pt-1.5 pb-1 text-center text-xs leading-none font-extrabold text-white shadow-md">
            -{discount}%<span className="block text-[9px] font-semibold tracking-wide opacity-90">GIẢM</span>
          </span>
        )}
        <button
          onClick={(e) => { e.preventDefault(); wl.toggle(p.id); }}
          className={`absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:scale-110 ${wl.has(p.id) ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}`}
          aria-label="Yêu thích"
        >
          <Heart className={`h-4 w-4 ${wl.has(p.id) ? 'fill-red-500' : ''}`} />
        </button>
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
          {p.isFeatured && <span className="rounded-full bg-amber-400/95 px-2 py-0.5 text-[10px] font-bold text-amber-950 shadow-sm">★ Nổi bật</span>}
          {lowStock && <span className="rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-orange-600 shadow-sm">Chỉ còn {totalStock}</span>}
        </div>
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[2px]">
            <span className="rounded-full bg-slate-900/85 px-3 py-1 text-xs font-semibold text-white">Tạm hết hàng</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {market ? (
          <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-brand-600 text-white"><Store className="h-2.5 w-2.5" /></span>
            <span className="truncate">{p.store!.name}</span>
          </div>
        ) : (p.brand || p.category?.name) ? <div className="truncate text-[11px] font-semibold tracking-wide text-brand-700/80 uppercase">{p.brand || p.category?.name}</div> : null}
        <h3 className="line-clamp-2 min-h-10 text-sm leading-5 font-medium text-ink group-hover:text-brand-700">{p.name}</h3>
        <div className="flex h-4 items-center gap-1.5 text-[11px] text-slate-400">
          {p.ratingCount > 0 && <span className="flex items-center gap-0.5 font-semibold text-amber-500"><Stars value={p.ratingAvg} size="h-3 w-3" /></span>}
          {p.soldCount > 0 && <span>Đã bán {p.soldCount.toLocaleString('vi-VN')}</span>}
          {active.length > 1 && <span className="ml-auto rounded bg-slate-100 px-1.5 py-px text-[10px] font-medium text-slate-500">{active.length} loại</span>}
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="min-w-0">
            {discount > 0 && best?.compareAtPrice ? <div className="text-[11px] leading-tight text-slate-400 line-through">{money(best.compareAtPrice)}</div> : <div className="h-[14px]" />}
            <div className="flex items-baseline gap-1">
              <span className={`text-[17px] leading-tight font-extrabold ${discount > 0 ? 'text-rose-600' : 'text-ink'}`}>{money(p.minPrice)}</span>
              {priceRange ? <span className="text-[11px] text-slate-400">trở lên</span> : p.unit ? <span className="text-[11px] text-slate-400">/{p.unit}</span> : null}
            </div>
          </div>
          {!outOfStock && (
            <button
              onClick={quickAdd}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-md shadow-brand-600/30 transition hover:scale-105 hover:bg-brand-700 active:scale-95"
              aria-label={single ? 'Thêm vào giỏ' : 'Chọn phân loại'}
              title={single ? 'Thêm vào giỏ' : 'Chọn phân loại'}
            >
              {single ? <Plus className="h-5 w-5" strokeWidth={2.5} /> : <ShoppingCart className="h-4 w-4" />}
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
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70">
      <div className="aspect-square animate-pulse bg-slate-100" />
      <div className="space-y-2 p-3"><div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" /><div className="h-4 animate-pulse rounded bg-slate-100" /><div className="h-5 w-1/2 animate-pulse rounded bg-slate-100" /></div>
    </div>
  );
}
