'use client';
import { useStoreHref } from '@/context/store';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ProductBrowser } from '@/components/shop/ProductBrowser';
import { Spinner } from '@/components/ui';
import { api, qs } from '@/lib/api';
import type { Category, Paged, Product } from '@/lib/types';

const DEFAULT_SORT = 'newest';

/** Sản phẩm của 1 cửa hàng – cùng bộ lọc với trang sản phẩm toàn sàn */
function ProductsInner() {
  const sh = useStoreHref();
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [cats, setCats] = useState<Category[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [data, setData] = useState<Paged<Product> | null>(null);

  const params = Object.fromEntries(sp.entries());
  const set = (patch: Record<string, string | undefined>) => router.push(pathname + qs({ ...params, page: undefined, ...patch }), { scroll: false });

  useEffect(() => {
    api<Category[]>('/categories').then(setCats).catch(() => {});
    api<string[]>('/products/brands').then(setBrands).catch(() => {});
  }, []);

  useEffect(() => {
    setData(null);
    api<Paged<Product>>('/products' + qs({ limit: 20, ...params }))
      .then(setData).catch(() => setData({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.toString()]);

  const current = cats.find((c) => c.slug === params.category);

  return (
    <ProductBrowser
      params={params} set={set} clearAll={() => router.push(pathname)}
      title={params.search ? `Kết quả cho “${params.search}”` : current?.name ?? 'Tất cả sản phẩm'}
      breadcrumb={<><Link href={sh('/')} className="hover:text-brand-700">Trang chủ</Link> / <span className="text-slate-600">{current?.name ?? 'Sản phẩm'}</span></>}
      categories={cats.map((c) => ({ slug: c.slug, name: c.name, count: c._count?.products ?? 0 }))}
      brands={brands.map((name) => ({ name }))}
      defaultSort={DEFAULT_SORT} data={data}
      onPage={(p) => set({ page: String(p) })}
    />
  );
}

export default function ProductsPage() {
  return <Suspense fallback={<Spinner />}><ProductsInner /></Suspense>;
}
