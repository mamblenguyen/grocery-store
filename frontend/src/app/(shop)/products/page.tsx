'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Empty, Pagination, ProductCard, Spinner } from '@/components/ui';
import { api, qs } from '@/lib/api';
import type { Category, Paged, Product } from '@/lib/types';

const PRICE_RANGES = [
  { label: 'Dưới 50.000₫', min: '', max: '50000' },
  { label: '50.000₫ – 200.000₫', min: '50000', max: '200000' },
  { label: 'Trên 200.000₫', min: '200000', max: '' },
];

function ProductsInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [cats, setCats] = useState<Category[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [data, setData] = useState<Paged<Product> | null>(null);

  const params = Object.fromEntries(sp.entries());
  const set = (patch: Record<string, string | undefined>) => {
    const next = { ...params, page: '1', ...patch };
    router.push(pathname + qs(next));
  };

  useEffect(() => {
    api<Category[]>('/categories').then(setCats);
    api<string[]>('/products/brands').then(setBrands);
  }, []);

  useEffect(() => {
    setData(null);
    api<Paged<Product>>('/products' + qs({ limit: 20, ...params })).then(setData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.toString()]);

  const current = cats.find((c) => c.slug === params.category);

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <aside className="w-full shrink-0 space-y-5 md:w-60">
        <div className="card p-4">
          <h3 className="mb-2 font-semibold">Danh mục</h3>
          <ul className="space-y-1 text-sm">
            <li><button className={!params.category ? 'font-semibold text-brand-700' : ''} onClick={() => set({ category: undefined })}>Tất cả</button></li>
            {cats.map((c) => (
              <li key={c.id}>
                <button className={params.category === c.slug ? 'font-semibold text-brand-700' : 'hover:text-brand-700'} onClick={() => set({ category: c.slug })}>
                  {c.name} <span className="text-gray-400">({c._count?.products ?? 0})</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-4">
          <h3 className="mb-2 font-semibold">Khoảng giá</h3>
          <ul className="space-y-1 text-sm">
            {PRICE_RANGES.map((r) => {
              const active = (params.minPrice ?? '') === r.min && (params.maxPrice ?? '') === r.max;
              return (
                <li key={r.label}>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="radio" checked={active} onChange={() => set({ minPrice: r.min, maxPrice: r.max })} /> {r.label}
                  </label>
                </li>
              );
            })}
            <li><button className="text-xs text-gray-500 underline" onClick={() => set({ minPrice: undefined, maxPrice: undefined })}>Bỏ lọc giá</button></li>
          </ul>
        </div>
        <div className="card p-4">
          <h3 className="mb-2 font-semibold">Thương hiệu</h3>
          <select className="input" value={params.brand ?? ''} onChange={(e) => set({ brand: e.target.value })}>
            <option value="">Tất cả</option>
            {brands.map((b) => <option key={b}>{b}</option>)}
          </select>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={params.inStock === 'true'} onChange={(e) => set({ inStock: e.target.checked ? 'true' : undefined })} />
            Chỉ hiện còn hàng
          </label>
        </div>
      </aside>

      <div className="flex-1">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold">
            {params.search ? `Kết quả cho "${params.search}"` : current?.name ?? 'Tất cả sản phẩm'}
            {data && <span className="ml-2 text-sm font-normal text-gray-500">({data.total} sản phẩm)</span>}
          </h1>
          <select className="input w-48" value={params.sort ?? 'newest'} onChange={(e) => set({ sort: e.target.value })}>
            <option value="newest">Mới nhất</option>
            <option value="best_selling">Bán chạy</option>
            <option value="price_asc">Giá tăng dần</option>
            <option value="price_desc">Giá giảm dần</option>
            <option value="name">Tên A–Z</option>
          </select>
        </div>
        {!data ? <Spinner /> : data.items.length === 0 ? <Empty text="Không tìm thấy sản phẩm phù hợp" /> : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {data.items.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => set({ page: String(p) })} />
          </>
        )}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return <Suspense fallback={<Spinner />}><ProductsInner /></Suspense>;
}
