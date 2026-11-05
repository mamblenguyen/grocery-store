'use client';
import { useStoreHref } from '@/context/store';
import { ArrowRight, BadgePercent, Clock, Flame, Headphones, Leaf, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { HeroSlider } from '@/components/shop/HeroSlider';
import { ProductCardSkeleton, ProductGrid } from '@/components/shop/ProductCard';
import { useSettings } from '@/context/settings';
import { api, imageUrl } from '@/lib/api';
import { money } from '@/lib/format';
import type { Category, Paged, Product } from '@/lib/types';

function Section({ title, icon, href, items, tone = 'bg-transparent' }: { title: string; icon: React.ReactNode; href: string; items: Product[] | null; tone?: string }) {
  if (items && !items.length) return null;
  return (
    <section className={`py-8 ${tone}`}>
      <div className="container-x">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="section-title flex items-center gap-2.5">{icon}{title}</h2>
          <Link href={href} className="flex items-center gap-1 text-sm font-semibold text-brand-700 hover:gap-2 transition-all">Xem tất cả <ArrowRight className="h-4 w-4" /></Link>
        </div>
        {items ? <ProductGrid products={items} /> : <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>}
      </div>
    </section>
  );
}

export default function HomePage() {
  const sh = useStoreHref();
  const { settings } = useSettings();
  const [cats, setCats] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[] | null>(null);
  const [best, setBest] = useState<Product[] | null>(null);
  const [latest, setLatest] = useState<Product[] | null>(null);
  const [deals, setDeals] = useState<Product[] | null>(null);

  useEffect(() => {
    api<Category[]>('/categories').then(setCats).catch(() => {});
    api<Paged<Product>>('/products?featured=true&limit=10').then((r) => setFeatured(r.items));
    api<Paged<Product>>('/products?sort=best_selling&limit=10').then((r) => setBest(r.items));
    api<Paged<Product>>('/products?sort=newest&limit=10').then((r) => setLatest(r.items));
    api<Paged<Product>>('/products?limit=40').then((r) =>
      setDeals(r.items.filter((p) => p.variants.some((v) => v.compareAtPrice && v.compareAtPrice > v.price)).slice(0, 5)),
    );
  }, []);

  const perks = [
    { icon: <Truck className="h-6 w-6" />, title: 'Giao nhanh 2 giờ', text: settings.freeShippingThreshold ? `Miễn phí đơn từ ${money(settings.freeShippingThreshold)}` : 'Nội thành' },
    { icon: <Leaf className="h-6 w-6" />, title: 'Tươi ngon mỗi ngày', text: 'Nhập hàng mới mỗi sáng' },
    { icon: <ShieldCheck className="h-6 w-6" />, title: 'Thanh toán an toàn', text: 'COD, VietQR, VNPay' },
    { icon: <Headphones className="h-6 w-6" />, title: 'Hỗ trợ tận tâm', text: settings.hotline ? `Hotline ${settings.hotline}` : 'Đổi trả trong 7 ngày' },
  ];

  return (
    <div>
      <section className="container-x pt-5 sm:pt-6">
        {settings.banners.length ? (
          <HeroSlider banners={settings.banners} />
        ) : (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-600 to-emerald-400 p-8 text-white sm:p-14">
            <h1 className="max-w-xl text-3xl font-extrabold sm:text-5xl">{settings.slogan}</h1>
            <Link href={sh('/products')} className="btn-accent btn-lg mt-6">Mua sắm ngay</Link>
          </div>
        )}
      </section>

      <section className="container-x mt-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {perks.map((p) => (
            <div key={p.title} className="flex items-center gap-3.5 rounded-2xl border border-slate-200/70 bg-white p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">{p.icon}</div>
              <div className="min-w-0"><div className="text-sm font-bold text-ink">{p.title}</div><div className="truncate text-xs text-slate-500">{p.text}</div></div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-x py-10">
        <h2 className="section-title mb-5">Mua theo danh mục</h2>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {cats.map((c) => (
            <Link key={c.id} href={sh(`/products?category=${c.slug}`)} className="group flex flex-col items-center gap-2.5 rounded-2xl border border-slate-200/70 bg-white p-3 text-center transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft">
              <div className="aspect-square w-full overflow-hidden rounded-xl bg-brand-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(c.image)} alt={c.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
              </div>
              <span className="line-clamp-2 text-xs leading-tight font-semibold text-slate-700 sm:text-[13px]">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {deals?.length ? (
        <section className="container-x">
          <div className="rounded-3xl bg-gradient-to-br from-accent-500 to-red-500 p-5 sm:p-7">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-white">
              <h2 className="flex items-center gap-2.5 text-xl font-extrabold sm:text-2xl"><BadgePercent className="h-7 w-7" /> Giá sốc hôm nay</h2>
              <span className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-sm font-medium"><Clock className="h-4 w-4" /> Ưu đãi có hạn – mua ngay kẻo lỡ</span>
            </div>
            <ProductGrid products={deals} />
          </div>
        </section>
      ) : null}

      <Section title="Sản phẩm nổi bật" icon={<Sparkles className="h-6 w-6 text-amber-500" />} href={sh('/products?featured=true')} items={featured} />
      <Section title="Bán chạy nhất" icon={<Flame className="h-6 w-6 text-accent-500" />} href={sh('/products?sort=best_selling')} items={best} tone="bg-white" />

      {settings.banners[1] && (
        <section className="container-x py-8">
          <Link href={sh(settings.banners[1].link || '/products')} className="relative block overflow-hidden rounded-3xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl(settings.banners[1].image)} alt="" className="h-48 w-full object-cover sm:h-56" />
            <div className="absolute inset-0 flex flex-col justify-center bg-gradient-to-r from-brand-900/85 to-transparent p-8 text-white">
              <div className="text-2xl font-extrabold sm:text-3xl">{settings.banners[1].title}</div>
              <div className="mt-1 text-white/85">{settings.banners[1].subtitle}</div>
            </div>
          </Link>
        </section>
      )}

      <Section title="Hàng mới về" icon={<Leaf className="h-6 w-6 text-brand-600" />} href={sh('/products?sort=newest')} items={latest} />
    </div>
  );
}
