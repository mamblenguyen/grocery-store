'use client';
import { SlidersHorizontal, Store, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ProductCardSkeleton, ProductGrid } from '@/components/shop/ProductCard';
import { Empty, Pagination } from '@/components/ui';
import type { Paged, Product } from '@/lib/types';

/**
 * Trang danh sách sản phẩm dùng chung cho sàn (/products) và từng cửa hàng (/s/[store]/products):
 * cùng một bộ lọc (danh mục, cửa hàng*, khoảng giá, thương hiệu, còn hàng, giảm giá), sắp xếp, thẻ lọc đang chọn,
 * ngăn kéo bộ lọc trên điện thoại. (*chỉ ở sàn)
 */

export interface FilterCategory { slug: string; name: string; count?: number }
export interface FilterBrand { name: string; count?: number }
export interface FilterStore { slug: string; name: string }
type Params = Record<string, string>;
type SetParams = (patch: Record<string, string | undefined>) => void;

export const PRICE_RANGES = [
  { label: 'Dưới 20.000₫', min: '', max: '20000' },
  { label: '20.000₫ – 50.000₫', min: '20000', max: '50000' },
  { label: '50.000₫ – 200.000₫', min: '50000', max: '200000' },
  { label: 'Trên 200.000₫', min: '200000', max: '' },
];

export const SORTS: [string, string][] = [
  ['rating', 'Đánh giá cao'], ['best_selling', 'Bán chạy'], ['newest', 'Mới nhất'],
  ['price_asc', 'Giá thấp → cao'], ['price_desc', 'Giá cao → thấp'], ['name', 'Tên A–Z'],
];

const vnd = (v: string) => `${Number(v).toLocaleString('vi-VN')}₫`;
const priceLabel = (min?: string, max?: string) =>
  PRICE_RANGES.find((r) => r.min === (min ?? '') && r.max === (max ?? ''))?.label
  ?? (min && max ? `${vnd(min)} – ${vnd(max)}` : min ? `Từ ${vnd(min)}` : `Đến ${vnd(max!)}`);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h3 className="mb-3 text-sm font-bold text-ink">{title}</h3>{children}</div>;
}

function FilterPanel({ params, set, categories, brands, stores }: {
  params: Params; set: SetParams; categories: FilterCategory[]; brands: FilterBrand[]; stores?: FilterStore[];
}) {
  const [min, setMin] = useState(params.minPrice ?? '');
  const [max, setMax] = useState(params.maxPrice ?? '');
  const [allBrands, setAllBrands] = useState(false);
  useEffect(() => { setMin(params.minPrice ?? ''); setMax(params.maxPrice ?? ''); }, [params.minPrice, params.maxPrice]);
  const shownBrands = allBrands ? brands : brands.slice(0, 12);
  const row = (active: boolean) => `flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left ${active ? 'bg-brand-50 font-semibold text-brand-800' : 'hover:bg-slate-50'}`;

  return (
    <div className="space-y-6">
      <Section title="Danh mục">
        <ul className="space-y-0.5 text-sm">
          <li><button className={row(!params.category)} onClick={() => set({ category: undefined })}>Tất cả sản phẩm</button></li>
          {categories.map((c) => (
            <li key={c.slug}>
              <button className={row(params.category === c.slug)} onClick={() => set({ category: c.slug })}>
                <span>{c.name}</span>{c.count != null && <span className="text-xs text-slate-400">{c.count}</span>}
              </button>
            </li>
          ))}
        </ul>
      </Section>

      {stores && stores.length > 0 && (
        <Section title="Cửa hàng">
          <select className="input" value={params.store ?? ''} onChange={(e) => set({ store: e.target.value || undefined })} aria-label="Cửa hàng">
            <option value="">Mọi cửa hàng</option>
            {stores.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
          </select>
        </Section>
      )}

      <Section title="Khoảng giá">
        <div className="flex flex-wrap gap-2">
          {PRICE_RANGES.map((r) => {
            const active = (params.minPrice ?? '') === r.min && (params.maxPrice ?? '') === r.max;
            return <button key={r.label} className={`chip ${active ? 'chip-active' : ''}`} onClick={() => set(active ? { minPrice: undefined, maxPrice: undefined } : { minPrice: r.min || undefined, maxPrice: r.max || undefined })}>{r.label}</button>;
          })}
        </div>
        <form className="mt-3 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); set({ minPrice: min || undefined, maxPrice: max || undefined }); }}>
          <input className="input min-w-0 px-2.5 py-2" type="number" min={0} step={1000} placeholder="Từ ₫" value={min} onChange={(e) => setMin(e.target.value)} aria-label="Giá từ" />
          <span className="text-slate-400">–</span>
          <input className="input min-w-0 px-2.5 py-2" type="number" min={0} step={1000} placeholder="Đến ₫" value={max} onChange={(e) => setMax(e.target.value)} aria-label="Giá đến" />
          <button className="btn-outline btn-sm shrink-0">Áp dụng</button>
        </form>
      </Section>

      {brands.length > 0 && (
        <Section title="Thương hiệu">
          <div className="flex flex-wrap gap-2">
            {shownBrands.map((b) => (
              <button key={b.name} className={`chip ${params.brand === b.name ? 'chip-active' : ''}`} onClick={() => set({ brand: params.brand === b.name ? undefined : b.name })}>
                {b.name}{b.count != null && <span className="text-[11px] opacity-60">{b.count}</span>}
              </button>
            ))}
          </div>
          {brands.length > 12 && <button className="mt-2 text-sm font-medium text-brand-700" onClick={() => setAllBrands(!allBrands)}>{allBrands ? 'Thu gọn' : `Xem thêm ${brands.length - 12} thương hiệu`}</button>}
        </Section>
      )}

      <div className="space-y-2.5">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={params.inStock === 'true'} onChange={(e) => set({ inStock: e.target.checked ? 'true' : undefined })} />
          Chỉ hiện sản phẩm còn hàng
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={params.deals === 'true'} onChange={(e) => set({ deals: e.target.checked ? 'true' : undefined })} />
          🏷️ Đang giảm giá
        </label>
      </div>
    </div>
  );
}

export function ProductBrowser({
  params, set, clearAll, title, breadcrumb, top, categories, brands, stores, defaultSort, data, onPage, subtitle,
}: {
  params: Params; set: SetParams; clearAll: () => void;
  title: string; subtitle?: string; breadcrumb?: React.ReactNode; top?: React.ReactNode;
  categories: FilterCategory[]; brands: FilterBrand[]; stores?: FilterStore[];
  defaultSort: string; data: Paged<Product> | null; onPage: (page: number) => void;
}) {
  const [drawer, setDrawer] = useState(false);
  const pick: SetParams = (patch) => { set(patch); setDrawer(false); };

  const cat = categories.find((c) => c.slug === params.category);
  const store = stores?.find((s) => s.slug === params.store);
  const active = [
    params.search && { k: ['search'], label: `“${params.search}”` },
    cat && { k: ['category'], label: cat.name },
    store && { k: ['store'], label: store.name, icon: true },
    params.brand && { k: ['brand'], label: params.brand },
    (params.minPrice || params.maxPrice) && { k: ['minPrice', 'maxPrice'], label: priceLabel(params.minPrice, params.maxPrice) },
    params.inStock && { k: ['inStock'], label: 'Còn hàng' },
    params.deals && { k: ['deals'], label: 'Đang giảm giá' },
    params.featured && { k: ['featured'], label: 'Nổi bật' },
  ].filter(Boolean) as { k: string[]; label: string; icon?: boolean }[];
  const panel = <FilterPanel params={params} set={pick} categories={categories} brands={brands} stores={stores} />;

  return (
    <div className="container-x py-6">
      {breadcrumb && <nav className="mb-4 text-sm text-slate-400">{breadcrumb}</nav>}
      {top}
      <div className="flex gap-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="card sticky top-36 max-h-[calc(100vh-10rem)] overflow-y-auto">{panel}</div>
        </aside>
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="mr-auto">
              <h1 className="text-2xl font-bold text-ink">
                {title}
                {data && <span className="ml-2 text-base font-normal text-slate-400">{data.total} sản phẩm</span>}
              </h1>
              {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
            </div>
            <button className="btn-outline lg:hidden" onClick={() => setDrawer(true)} data-testid="open-filters">
              <SlidersHorizontal className="h-4 w-4" /> Bộ lọc{active.length ? ` (${active.length})` : ''}
            </button>
            <select className="input w-auto" value={params.sort ?? defaultSort} onChange={(e) => set({ sort: e.target.value === defaultSort ? undefined : e.target.value })} aria-label="Sắp xếp">
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {active.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {active.map((f) => (
                <button key={f.k[0]} className="chip chip-active" onClick={() => set(Object.fromEntries(f.k.map((k) => [k, undefined])))}>
                  {f.icon && <Store className="h-3.5 w-3.5" />}{f.label} <X className="h-3.5 w-3.5" />
                </button>
              ))}
              <button className="text-sm font-medium text-slate-500 hover:text-red-600" onClick={clearAll}>Xoá tất cả</button>
            </div>
          )}

          {!data ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
          ) : data.items.length === 0 ? (
            <div className="card"><Empty text="Không tìm thấy sản phẩm phù hợp. Thử bỏ bớt bộ lọc nhé!">{active.length > 0 && <button className="btn-primary" onClick={clearAll}>Xoá bộ lọc</button>}</Empty></div>
          ) : (
            <>
              <ProductGrid products={data.items} cols="grid-cols-2 sm:grid-cols-3 xl:grid-cols-4" />
              <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => { onPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
            </>
          )}
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div className="animate-fade-in absolute inset-0 bg-slate-900/50" onClick={() => setDrawer(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-bold">Bộ lọc</h3><button className="btn-icon btn-ghost" onClick={() => setDrawer(false)} aria-label="Đóng"><X className="h-5 w-5" /></button></div>
            {panel}
          </div>
        </div>
      )}
    </div>
  );
}
