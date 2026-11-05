'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ProductCard, Spinner } from '@/components/ui';
import { api, imageUrl } from '@/lib/api';
import type { Category, Paged, Product } from '@/lib/types';

export default function HomePage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[] | null>(null);
  const [best, setBest] = useState<Product[]>([]);
  const [latest, setLatest] = useState<Product[]>([]);

  useEffect(() => {
    api<Category[]>('/categories').then(setCats);
    api<Paged<Product>>('/products?featured=true&limit=10').then((r) => setFeatured(r.items));
    api<Paged<Product>>('/products?sort=best_selling&limit=10').then((r) => setBest(r.items));
    api<Paged<Product>>('/products?sort=newest&limit=10').then((r) => setLatest(r.items));
  }, []);

  const Section = ({ title, items, href }: { title: string; items: Product[]; href: string }) =>
    items.length ? (
      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <Link href={href} className="text-sm text-brand-700 hover:underline">Xem tất cả →</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>
    ) : null;

  return (
    <div>
      <div className="mb-8 rounded-2xl bg-gradient-to-r from-brand-600 to-emerald-400 p-8 text-white md:p-12">
        <h1 className="text-3xl font-bold md:text-4xl">Đi chợ online – Giao nhanh tận nhà</h1>
        <p className="mt-2 text-brand-50">Hàng nghìn sản phẩm tươi ngon, giá tốt mỗi ngày. Nhập mã <b>WELCOME10</b> giảm 10%.</p>
        <Link href="/products" className="btn mt-6 bg-white text-brand-700 hover:bg-brand-50">Mua sắm ngay</Link>
      </div>

      <section className="mb-10">
        <h2 className="mb-4 text-xl font-bold">Danh mục</h2>
        <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
          {cats.map((c) => (
            <Link key={c.id} href={`/products?category=${c.slug}`} className="flex flex-col items-center gap-2 rounded-xl bg-white p-3 text-center text-xs hover:shadow">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl(c.image)} alt={c.name} className="h-14 w-14 rounded-full object-cover" />
              <span className="line-clamp-2">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {featured === null ? <Spinner /> : <Section title="⭐ Sản phẩm nổi bật" items={featured} href="/products?featured=true" />}
      <Section title="🔥 Bán chạy" items={best} href="/products?sort=best_selling" />
      <Section title="🆕 Mới về" items={latest} href="/products?sort=newest" />
    </div>
  );
}
