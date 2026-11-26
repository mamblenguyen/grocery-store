'use client';
import { useAdminStoreHref } from '@/context/store';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ProductForm } from '@/components/admin/ProductForm';
import { Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import type { Product } from '@/lib/types';

export default function EditProductPage() {
  const storeLink = useAdminStoreHref();
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<Product | null>(null);
  useEffect(() => { api<Product>(`/admin/products/${id}`).then(setP); }, [id]);
  if (!p) return <Spinner />;
  return (
    <div className="space-y-4">
      <Link href="/admin/products" className="text-sm text-gray-500">← Sản phẩm</Link>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sửa: {p.name}</h1>
        <Link href={storeLink(`/products/${p.slug}`)} target="_blank" className="btn-outline btn-sm">Xem trên cửa hàng ↗</Link>
      </div>
      <ProductForm key={p.updatedAt} product={p} onSaved={setP} />
    </div>
  );
}
