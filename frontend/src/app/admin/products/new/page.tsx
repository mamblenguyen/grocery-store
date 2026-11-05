import Link from 'next/link';
import { ProductForm } from '@/components/admin/ProductForm';

export default function NewProductPage() {
  return (
    <div className="space-y-4">
      <Link href="/admin/products" className="text-sm text-gray-500">← Sản phẩm</Link>
      <h1 className="text-2xl font-bold">Thêm sản phẩm</h1>
      <ProductForm />
    </div>
  );
}
