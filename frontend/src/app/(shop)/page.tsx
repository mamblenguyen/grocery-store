'use client';
import { ArrowRight, Flame, Leaf, Search, ShieldCheck, Sparkles, Store, Tag, Truck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ProductCardSkeleton, ProductGrid } from '@/components/shop/ProductCard';
import { api, imageUrl, qs } from '@/lib/api';
import { PLATFORM_NAME } from '@/lib/platform';
import type { MarketCategory, Paged, Product, PublicStore } from '@/lib/types';

function Section({ title, icon, href, items }: { title: string; icon: React.ReactNode; href: string; items: Product[] | null }) {
  if (items && !items.length) return null;
  return (
    <section className="container-x py-6">
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="section-title flex items-center gap-2">{icon}{title}</h2>
        <Link href={href} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-700 transition-all hover:gap-2">Xem tất cả <ArrowRight className="h-4 w-4" /></Link>
      </div>
      {items ? <ProductGrid products={items} /> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>}
    </section>
  );
}

/** Trang chủ sàn: hàng hoá của tất cả đối tác */
export default function MarketHome() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [cats, setCats] = useState<MarketCategory[]>([]);
  const [stores, setStores] = useState<PublicStore[]>([]);
  const [deals, setDeals] = useState<Product[] | null>(null);
  const [best, setBest] = useState<Product[] | null>(null);
  const [latest, setLatest] = useState<Product[] | null>(null);
  const [all, setAll] = useState<Paged<Product> | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const m = (p: Record<string, unknown>) => api<Paged<Product>>('/market/products' + qs(p)).then((r) => r.items).catch(() => []);
    api<MarketCategory[]>('/market/categories').then(setCats).catch(() => {});
    api<Paged<PublicStore>>('/stores?limit=12').then((r) => setStores(r.items)).catch(() => {});
    m({ deals: true, limit: 10, sort: 'best_selling' }).then(setDeals);
    m({ sort: 'best_selling', limit: 10 }).then(setBest);
    m({ sort: 'newest', limit: 10 }).then(setLatest);
    api<Paged<Product>>('/market/products?limit=20&sort=rating').then(setAll).catch(() => {});
  }, []);

  const more = async () => {
    if (!all) return;
    setLoadingMore(true);
    const r = await api<Paged<Product>>(`/market/products?limit=20&sort=rating&page=${all.page + 1}`).finally(() => setLoadingMore(false));
    setAll({ ...r, items: [...all.items, ...r.items] });
  };

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-emerald-500 text-white">
        <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div className="container-x relative grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <h1 className="text-3xl leading-tight font-extrabold sm:text-5xl">Cả khu chợ tạp hoá trong một trang</h1>
            <p className="mt-3 max-w-xl text-brand-50 sm:text-lg">So giá, chọn hàng từ nhiều tạp hoá quanh bạn trên {PLATFORM_NAME}. Mỗi cửa hàng tự giao tận nhà.</p>
            <form onSubmit={(e) => { e.preventDefault(); router.push('/products' + qs({ search: q.trim() })); }} className="mt-6 flex h-14 max-w-xl items-center overflow-hidden rounded-2xl bg-white shadow-lift">
              <Search className="ml-4 h-5 w-5 shrink-0 text-slate-400" />
              <input className="h-full w-full min-w-0 bg-transparent px-3 text-ink outline-none placeholder:text-slate-400" placeholder="Tìm sản phẩm trên toàn sàn: mì, sữa, gạo…" value={q} onChange={(e) => setQ(e.target.value)} />
              <button className="mr-2 h-10 shrink-0 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700">Tìm</button>
            </form>
          </div>
          <div className="hidden grid-cols-2 gap-3 lg:grid">
            {[[Store, `${stores.length || '…'} cửa hàng`, 'đang bán trên sàn'], [Truck, 'Giao tận nhà', 'từ tạp hoá gần bạn'], [Tag, 'Giá sốc mỗi ngày', 'so giá giữa các cửa hàng'], [ShieldCheck, 'Thanh toán an toàn', 'COD · VietQR · VNPay']].map(([I, a, b]) => {
              const Icon = I as typeof Store;
              return <div key={a as string} className="rounded-2xl bg-white/10 p-4 backdrop-blur"><Icon className="h-6 w-6" /><div className="mt-2 font-bold">{a as string}</div><div className="text-sm text-brand-50">{b as string}</div></div>;
            })}
          </div>
        </div>
      </section>

      {cats.length > 0 && (
        <section className="container-x pt-8">
          <h2 className="section-title mb-4">Danh mục trên sàn</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {cats.map((c) => (
              <Link key={c.slug} href={`/products?category=${c.slug}`} className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200/70 bg-white p-3 text-center transition hover:border-brand-300 hover:shadow-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(c.image)} alt="" className="aspect-square w-full rounded-xl object-cover" />
                <span className="line-clamp-2 text-xs font-semibold text-slate-700 group-hover:text-brand-700 sm:text-sm">{c.name}</span>
                <span className="text-[11px] text-slate-400">{c.productCount} SP · {c.stores} cửa hàng</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {stores.length > 0 && (
        <section className="container-x pt-8">
          <div className="mb-4 flex items-end justify-between"><h2 className="section-title flex items-center gap-2"><Store className="h-6 w-6 text-brand-600" />Cửa hàng trên sàn</h2><Link href="/stores" className="flex items-center gap-1 text-sm font-semibold text-brand-700">Tất cả <ArrowRight className="h-4 w-4" /></Link></div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {stores.map((s) => (
              <Link key={s.id} href={`/s/${s.slug}`} className="flex w-60 shrink-0 items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-3 transition hover:border-brand-300 hover:shadow-soft">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 text-brand-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {s.logo ? <img src={imageUrl(s.logo)} alt="" className="h-full w-full object-cover" /> : <Store className="h-5 w-5" />}
                </span>
                <span className="min-w-0"><span className="block truncate font-semibold text-ink">{s.name}</span><span className="block truncate text-xs text-slate-400">{s.productCount} sản phẩm{s.address ? ` · ${s.address}` : ''}</span></span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-4 bg-accent-50/60"><Section title="Giá sốc hôm nay" icon={<Tag className="h-6 w-6 text-accent-500" />} href="/products?deals=true" items={deals} /></div>
      <Section title="Bán chạy trên sàn" icon={<Flame className="h-6 w-6 text-accent-500" />} href="/products?sort=best_selling" items={best} />
      <Section title="Hàng mới lên sàn" icon={<Leaf className="h-6 w-6 text-brand-600" />} href="/products?sort=newest" items={latest} />

      <section className="container-x py-6">
        <h2 className="section-title mb-4 flex items-center gap-2"><Sparkles className="h-6 w-6 text-amber-500" />Gợi ý hôm nay</h2>
        {all ? <ProductGrid products={all.items} /> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 10 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>}
        {all && all.page < all.totalPages && <div className="mt-6 text-center"><button className="btn-outline btn-lg" onClick={more} disabled={loadingMore}>{loadingMore ? 'Đang tải…' : 'Xem thêm sản phẩm'}</button></div>}
      </section>
    </>
  );
}
