'use client';
import { SlidersHorizontal, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ProductCardSkeleton, ProductGrid } from '@/components/shop/ProductCard';
import { Empty, Pagination, Spinner } from '@/components/ui';
import { api, qs } from '@/lib/api';
import type { Category, Paged, Product } from '@/lib/types';

const PRICE_RANGES = [
  { label: 'Dưới 20.000₫', min: '', max: '20000' },
  { label: '20.000₫ – 50.000₫', min: '20000', max: '50000' },
  { label: '50.000₫ – 200.000₫', min: '50000', max: '200000' },
  { label: 'Trên 200.000₫', min: '200000', max: '' },
];

const SORTS = [
  ['newest', 'Mới nhất'], ['best_selling', 'Bán chạy'], ['price_asc', 'Giá thấp → cao'], ['price_desc', 'Giá cao → thấp'], ['name', 'Tên A–Z'],
];

function Filters({ params, set, cats, brands }: { params: Record<string, string>; set: (p: Record<string, string | undefined>) => void; cats: Category[]; brands: string[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-bold text-ink">Danh mục</h3>
        <ul className="space-y-0.5 text-sm">
          <li><button className={`w-full rounded-lg px-3 py-2 text-left ${!params.category ? 'bg-brand-50 font-semibold text-brand-800' : 'hover:bg-slate-50'}`} onClick={() => set({ category: undefined })}>Tất cả sản phẩm</button></li>
          {cats.map((c) => (
            <li key={c.id}>
              <button className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left ${params.category === c.slug ? 'bg-brand-50 font-semibold text-brand-800' : 'hover:bg-slate-50'}`} onClick={() => set({ category: c.slug })}>
                <span>{c.name}</span><span className="text-xs text-slate-400">{c._count?.products ?? 0}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-bold text-ink">Khoảng giá</h3>
        <div className="flex flex-wrap gap-2">
          {PRICE_RANGES.map((r) => {
            const active = (params.minPrice ?? '') === r.min && (params.maxPrice ?? '') === r.max;
            return <button key={r.label} className={`chip ${active ? 'chip-active' : ''}`} onClick={() => set(active ? { minPrice: undefined, maxPrice: undefined } : { minPrice: r.min, maxPrice: r.max })}>{r.label}</button>;
          })}
        </div>
      </div>
      {brands.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold text-ink">Thương hiệu</h3>
          <div className="flex flex-wrap gap-2">
            {brands.map((b) => <button key={b} className={`chip ${params.brand === b ? 'chip-active' : ''}`} onClick={() => set({ brand: params.brand === b ? undefined : b })}>{b}</button>)}
          </div>
        </div>
      )}
      <label className="flex cursor-pointer items-center gap-2.5 text-sm">
        <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={params.inStock === 'true'} onChange={(e) => set({ inStock: e.target.checked ? 'true' : undefined })} />
        Chỉ hiện sản phẩm còn hàng
      </label>
    </div>
  );
}

function ProductsInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [cats, setCats] = useState<Category[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [data, setData] = useState<Paged<Product> | null>(null);
  const [drawer, setDrawer] = useState(false);

  const params = Object.fromEntries(sp.entries());
  const set = (patch: Record<string, string | undefined>) => {
    router.push(pathname + qs({ ...params, page: '1', ...patch }), { scroll: false });
    setDrawer(false);
  };

  useEffect(() => {
    api<Category[]>('/categories').then(setCats).catch(() => {});
    api<string[]>('/products/brands').then(setBrands).catch(() => {});
  }, []);

  useEffect(() => {
    setData(null);
    api<Paged<Product>>('/products' + qs({ limit: 20, ...params })).then(setData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.toString()]);

  const current = cats.find((c) => c.slug === params.category);
  const activeFilters = [
    params.search && { k: 'search', label: `“${params.search}”` },
    current && { k: 'category', label: current.name },
    params.brand && { k: 'brand', label: params.brand },
    (params.minPrice || params.maxPrice) && { k: 'price', label: PRICE_RANGES.find((r) => r.min === (params.minPrice ?? '') && r.max === (params.maxPrice ?? ''))?.label ?? 'Khoảng giá' },
    params.inStock && { k: 'inStock', label: 'Còn hàng' },
    params.featured && { k: 'featured', label: 'Nổi bật' },
  ].filter(Boolean) as { k: string; label: string }[];

  return (
    <div className="container-x py-6">
      <nav className="mb-4 text-sm text-slate-400"><Link href="/" className="hover:text-brand-700">Trang chủ</Link> / <span className="text-slate-600">{current?.name ?? 'Sản phẩm'}</span></nav>
      <div className="flex gap-8">
        <aside className="hidden w-64 shrink-0 lg:block"><div className="card sticky top-36"><Filters params={params} set={set} cats={cats} brands={brands} /></div></aside>
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h1 className="mr-auto text-2xl font-bold">
              {params.search ? 'Kết quả tìm kiếm' : current?.name ?? 'Tất cả sản phẩm'}
              {data && <span className="ml-2 text-base font-normal text-slate-400">{data.total} sản phẩm</span>}
            </h1>
            <button className="btn-outline lg:hidden" onClick={() => setDrawer(true)}><SlidersHorizontal className="h-4 w-4" /> Bộ lọc</button>
            <select className="input w-auto" value={params.sort ?? 'newest'} onChange={(e) => set({ sort: e.target.value })}>
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {activeFilters.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {activeFilters.map((f) => (
                <button key={f.k} className="chip chip-active" onClick={() => set(f.k === 'price' ? { minPrice: undefined, maxPrice: undefined } : { [f.k]: undefined })}>{f.label} <X className="h-3.5 w-3.5" /></button>
              ))}
              <button className="text-sm font-medium text-slate-500 hover:text-red-600" onClick={() => router.push(pathname)}>Xoá tất cả</button>
            </div>
          )}
          {!data ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
          ) : data.items.length === 0 ? (
            <div className="card"><Empty text="Không tìm thấy sản phẩm phù hợp. Thử bỏ bớt bộ lọc nhé!"><button className="btn-primary" onClick={() => router.push(pathname)}>Xem tất cả sản phẩm</button></Empty></div>
          ) : (
            <>
              <ProductGrid products={data.items} cols="grid-cols-2 sm:grid-cols-3 xl:grid-cols-4" />
              <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => { set({ page: String(p) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
            </>
          )}
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div className="animate-fade-in absolute inset-0 bg-slate-900/50" onClick={() => setDrawer(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-bold">Bộ lọc</h3><button className="btn-icon btn-ghost" onClick={() => setDrawer(false)}><X className="h-5 w-5" /></button></div>
            <Filters params={params} set={set} cats={cats} brands={brands} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return <Suspense fallback={<Spinner />}><ProductsInner /></Suspense>;
}
