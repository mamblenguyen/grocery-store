'use client';
import { Search, Store, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ProductCardSkeleton, ProductGrid } from '@/components/shop/ProductCard';
import { Empty, Pagination } from '@/components/ui';
import { api, qs } from '@/lib/api';
import type { MarketCategory, Paged, Product, PublicStore } from '@/lib/types';

const SORTS: [string, string][] = [['', 'Đánh giá cao'], ['best_selling', 'Bán chạy'], ['newest', 'Mới nhất'], ['price_asc', 'Giá thấp → cao'], ['price_desc', 'Giá cao → thấp']];

/** Tìm kiếm & lọc sản phẩm trên toàn sàn */
function Inner() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const params = Object.fromEntries(sp.entries());
  const [cats, setCats] = useState<MarketCategory[]>([]);
  const [stores, setStores] = useState<PublicStore[]>([]);
  const [data, setData] = useState<Paged<Product> | null>(null);
  const [q, setQ] = useState(params.search ?? '');
  const set = (patch: Record<string, string | undefined>) => router.push(pathname + qs({ ...params, page: undefined, ...patch }), { scroll: false });

  useEffect(() => {
    api<MarketCategory[]>('/market/categories').then(setCats).catch(() => {});
    api<Paged<PublicStore>>('/stores?limit=50').then((r) => setStores(r.items)).catch(() => {});
  }, []);
  useEffect(() => { setQ(params.search ?? ''); setData(null); api<Paged<Product>>('/market/products' + qs({ limit: 20, sort: 'rating', ...params })).then(setData).catch(() => setData({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 })); }, [sp]); // eslint-disable-line react-hooks/exhaustive-deps

  const cat = cats.find((c) => c.slug === params.category);
  const store = stores.find((s) => s.slug === params.store);
  const title = params.search ? `Kết quả cho “${params.search}”` : cat?.name ?? (params.deals ? 'Giá sốc hôm nay' : 'Tất cả sản phẩm trên sàn');

  return (
    <div className="container-x py-6">
      <form onSubmit={(e) => { e.preventDefault(); set({ search: q.trim() || undefined }); }} className="mb-5 flex h-12 max-w-2xl items-center overflow-hidden rounded-xl border-2 border-brand-600 bg-white">
        <Search className="ml-3 h-5 w-5 shrink-0 text-slate-400" />
        <input className="h-full w-full min-w-0 bg-transparent px-3 text-sm outline-none" placeholder="Tìm sản phẩm hoặc cửa hàng trên toàn sàn…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="h-full shrink-0 bg-brand-600 px-5 text-sm font-semibold text-white">Tìm</button>
      </form>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-ink">{title}</h1>{data && <p className="text-sm text-slate-500">{data.total} sản phẩm{store ? ` tại ${store.name}` : ' từ nhiều cửa hàng'}</p>}</div>
        <div className="flex flex-wrap gap-2">
          <select className="input w-auto" value={params.store ?? ''} onChange={(e) => set({ store: e.target.value || undefined })} aria-label="Cửa hàng">
            <option value="">Mọi cửa hàng</option>
            {stores.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
          </select>
          <select className="input w-auto" value={params.sort ?? ''} onChange={(e) => set({ sort: e.target.value || undefined })} aria-label="Sắp xếp">
            {SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
      </div>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        <button className={`chip shrink-0 ${!params.category && !params.deals ? 'chip-active' : ''}`} onClick={() => set({ category: undefined, deals: undefined })}>Tất cả</button>
        <button className={`chip shrink-0 ${params.deals ? 'chip-active' : ''}`} onClick={() => set({ deals: params.deals ? undefined : 'true' })}>🏷️ Giá sốc</button>
        {cats.map((c) => <button key={c.slug} className={`chip shrink-0 ${params.category === c.slug ? 'chip-active' : ''}`} onClick={() => set({ category: c.slug })}>{c.name}</button>)}
      </div>
      {(params.search || store) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {params.search && <button className="chip" onClick={() => set({ search: undefined })}>“{params.search}” <X className="h-3.5 w-3.5" /></button>}
          {store && <button className="chip" onClick={() => set({ store: undefined })}><Store className="h-3.5 w-3.5" />{store.name} <X className="h-3.5 w-3.5" /></button>}
        </div>
      )}
      {!data ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 10 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
        : !data.items.length ? <div className="card"><Empty text="Không tìm thấy sản phẩm phù hợp" /></div>
          : <><ProductGrid products={data.items} /><Pagination page={data.page} totalPages={data.totalPages} onChange={(page) => router.push(pathname + qs({ ...params, page }))} /></>}
    </div>
  );
}

export default function MarketProducts() {
  return <Suspense><Inner /></Suspense>;
}
