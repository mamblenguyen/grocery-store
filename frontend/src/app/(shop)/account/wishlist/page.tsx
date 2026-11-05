'use client';
import { Heart } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AccountShell } from '@/components/shop/AccountShell';
import { ProductGrid } from '@/components/shop/ProductCard';
import { Empty, Spinner } from '@/components/ui';
import { useWishlist } from '@/context/wishlist';
import { api } from '@/lib/api';
import type { Product } from '@/lib/types';

export default function WishlistPage() {
  const wl = useWishlist();
  const [list, setList] = useState<Product[] | null>(null);
  useEffect(() => { api<Product[]>('/wishlist').then(setList).catch(() => setList([])); }, []);
  const shown = list?.filter((p) => wl.has(p.id));
  return (
    <AccountShell>
      <div className="card">
        <h2 className="mb-5 text-lg font-bold">Sản phẩm yêu thích</h2>
        {!shown ? <Spinner /> : !shown.length ? <Empty icon={<Heart className="h-7 w-7" />} text="Chưa có sản phẩm yêu thích"><Link href="/products" className="btn-primary">Khám phá sản phẩm</Link></Empty> : <ProductGrid products={shown} cols="grid-cols-2 sm:grid-cols-3 xl:grid-cols-4" />}
      </div>
    </AccountShell>
  );
}
