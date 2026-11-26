'use client';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { type FilterBrand, ProductBrowser } from '@/components/shop/ProductBrowser';
import { Spinner } from '@/components/ui';
import { api, qs } from '@/lib/api';
import type { MarketCategory, Paged, Product, PublicStore } from '@/lib/types';

const DEFAULT_SORT = 'rating';

/** Tìm kiếm & lọc sản phẩm trên toàn sàn (cùng bộ lọc với trang sản phẩm của từng cửa hàng + lọc theo cửa hàng) */
function Inner() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const params = Object.fromEntries(sp.entries());
  const [cats, setCats] = useState<MarketCategory[]>([]);
  const [stores, setStores] = useState<PublicStore[]>([]);
  const [brands, setBrands] = useState<FilterBrand[]>([]);
  const [data, setData] = useState<Paged<Product> | null>(null);
  const [q, setQ] = useState(params.search ?? '');
  const set = (patch: Record<string, string | undefined>) => router.push(pathname + qs({ ...params, page: undefined, ...patch }), { scroll: false });

  useEffect(() => {
    api<MarketCategory[]>('/market/categories').then(setCats).catch(() => {});
    api<Paged<PublicStore>>('/stores?limit=50').then((r) => setStores(r.items)).catch(() => {});
  }, []);
  useEffect(() => {
    setQ(params.search ?? '');
    setData(null);
    api<Paged<Product>>('/market/products' + qs({ limit: 20, sort: DEFAULT_SORT, ...params }))
      .then(setData).catch(() => setData({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 }));
  }, [sp]); // eslint-disable-line react-hooks/exhaustive-deps

  // Thương hiệu theo các bộ lọc khác đang chọn (danh mục, cửa hàng, tìm kiếm, giá…)
  const { brand, page, sort, ...scopeParams } = params; // eslint-disable-line @typescript-eslint/no-unused-vars
  const brandKey = qs(scopeParams);
  useEffect(() => { api<FilterBrand[]>('/market/brands' + brandKey).then(setBrands).catch(() => setBrands([])); }, [brandKey]);

  const cat = cats.find((c) => c.slug === params.category);
  const store = stores.find((s) => s.slug === params.store);
  const title = params.search ? `Kết quả cho “${params.search}”` : cat?.name ?? (params.deals ? 'Giá sốc hôm nay' : 'Tất cả sản phẩm trên sàn');

  return (
    <ProductBrowser
      params={params} set={set} clearAll={() => router.push(pathname)}
      title={title} subtitle={store ? `tại ${store.name}` : 'từ nhiều cửa hàng trên sàn'}
      breadcrumb={<><Link href="/" className="hover:text-brand-700">Trang chủ</Link> / <span className="text-slate-600">{cat?.name ?? 'Sản phẩm'}</span></>}
      top={
        <form onSubmit={(e) => { e.preventDefault(); set({ search: q.trim() || undefined }); }} className="mb-6 flex h-12 max-w-2xl items-center overflow-hidden rounded-xl border-2 border-brand-600 bg-white">
          <Search className="ml-3 h-5 w-5 shrink-0 text-slate-400" />
          <input className="h-full w-full min-w-0 bg-transparent px-3 text-sm outline-none" placeholder="Tìm sản phẩm hoặc cửa hàng trên toàn sàn…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="h-full shrink-0 bg-brand-600 px-5 text-sm font-semibold text-white">Tìm</button>
        </form>
      }
      categories={cats.map((c) => ({ slug: c.slug, name: c.name, count: c.productCount }))}
      brands={brands}
      stores={stores.map((s) => ({ slug: s.slug, name: s.name }))}
      defaultSort={DEFAULT_SORT} data={data}
      onPage={(p) => router.push(pathname + qs({ ...params, page: p }))}
    />
  );
}

export default function MarketProducts() {
  return <Suspense fallback={<Spinner />}><Inner /></Suspense>;
}
