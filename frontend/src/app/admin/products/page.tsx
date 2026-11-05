'use client';
import Link from 'next/link';
import { StoreTag, useOpenInStore } from '@/components/admin/AllStores';
import { Fragment, useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Empty, Pagination, Spinner } from '@/components/ui';
import { api, imageUrl, qs } from '@/lib/api';
import { money } from '@/lib/format';
import type { Category, Paged, Product } from '@/lib/types';

export default function AdminProductsPage() {
  const openInStore = useOpenInStore();
  const toast = useToast();
  const [cats, setCats] = useState<Category[]>([]);
  const [filter, setFilter] = useState({ search: '', categoryId: '', status: 'all', page: 1 });
  const [data, setData] = useState<Paged<Product> | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = () => api<Paged<Product>>('/admin/products' + qs({ ...filter, limit: 15 })).then(setData);

  useEffect(() => { api<Category[]>('/admin/categories').then(setCats); }, []);
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  const action = async (fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); toast(msg); load(); } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sản phẩm</h1>
        <Link href="/admin/products/new" className="btn-primary">+ Thêm sản phẩm</Link>
      </div>
      <div className="card flex flex-wrap gap-3 p-4">
        <input className="input max-w-xs" placeholder="Tìm tên, thương hiệu, SKU..." defaultValue={filter.search}
          onKeyDown={(e) => e.key === 'Enter' && setFilter({ ...filter, search: (e.target as HTMLInputElement).value, page: 1 })} />
        <select className="input w-56" value={filter.categoryId} onChange={(e) => setFilter({ ...filter, categoryId: e.target.value, page: 1 })}>
          <option value="">Tất cả danh mục</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input w-40" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value, page: 1 })}>
          <option value="all">Tất cả</option><option value="active">Đang bán</option><option value="inactive">Ngừng bán</option>
        </select>
      </div>
      <div className="card overflow-x-auto p-0">
        {!data ? <Spinner /> : !data.items.length ? <Empty /> : (
          <table className="table">
            <thead><tr><th>Sản phẩm</th><th>Danh mục</th><th>Giá</th><th>Biến thể</th><th>Tồn kho</th><th>Đã bán</th><th>Trạng thái</th><th className="text-right">Thao tác</th></tr></thead>
            <tbody>
              {data.items.map((p) => (
                <Fragment key={p.id}>
                  <tr>
                    <td>
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl(p.thumbnail)} alt="" className="h-10 w-10 rounded object-cover" />
                        <div>
                          <div className="font-medium">{p.name} {p.isFeatured && <span title="Nổi bật">⭐</span>}</div>
                          <div className="text-xs text-gray-500">{p.brand}</div>
                          <StoreTag s={p.store} />
                        </div>
                      </div>
                    </td>
                    <td>{p.category?.name ?? '—'}</td>
                    <td className="whitespace-nowrap">{money(p.minPrice)}{p.maxPrice > p.minPrice && ` – ${money(p.maxPrice)}`}</td>
                    <td><button className="text-brand-700 hover:underline" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>{p.variants.length} biến thể ▾</button></td>
                    <td className={p.totalStock! <= 0 ? 'font-semibold text-red-600' : ''}>{p.totalStock}</td>
                    <td>{p.soldCount}</td>
                    <td>
                      <button onClick={() => action(() => api(`/admin/products/${p.id}/toggle-active`, { method: 'PATCH' }), 'Đã cập nhật')}
                        className={`badge ${p.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                        {p.isActive ? 'Đang bán' : 'Ngừng bán'}
                      </button>
                    </td>
                    <td className="space-x-1 text-right whitespace-nowrap">
                      <button className="btn-outline btn-sm" onClick={() => action(() => api(`/admin/products/${p.id}/toggle-featured`, { method: 'PATCH' }), 'Đã cập nhật')}>
                        {p.isFeatured ? 'Bỏ nổi bật' : 'Nổi bật'}
                      </button>
                      <button onClick={() => openInStore(p.store, `/admin/products/${p.id}`)} className="btn-outline btn-sm">Sửa</button>
                      <button className="btn-danger btn-sm" onClick={() => confirm(`Xoá "${p.name}"?`) && action(() => api(`/admin/products/${p.id}`, { method: 'DELETE' }), 'Đã xoá')}>Xoá</button>
                    </td>
                  </tr>
                  {expanded === p.id && (
                    <tr key={`${p.id}-v`}>
                      <td colSpan={8} className="bg-gray-50">
                        <table className="table">
                          <thead><tr><th>SKU</th><th>Biến thể</th><th>Giá bán</th><th>Giá gốc</th><th>Tồn</th><th>Trạng thái</th></tr></thead>
                          <tbody>
                            {p.variants.map((v) => (
                              <tr key={v.id}>
                                <td className="font-mono text-xs">{v.sku}</td><td>{v.name}</td><td>{money(v.price)}</td>
                                <td>{v.compareAtPrice ? money(v.compareAtPrice) : '—'}</td>
                                <td className={v.stock <= v.lowStockThreshold ? 'font-semibold text-orange-600' : ''}>{v.stock}</td>
                                <td>{v.isActive ? 'Bật' : 'Tắt'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(page) => setFilter({ ...filter, page })} />}
    </div>
  );
}
