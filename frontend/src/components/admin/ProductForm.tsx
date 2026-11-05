'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import type { Category, Product } from '@/lib/types';
import { ImageUploader } from './ImageUploader';

interface OptionRow { name: string; values: string[]; draft: string }
interface VariantRow {
  id?: number; sku: string; barcode: string; price: number; compareAtPrice: number | ''; costPrice: number | '';
  stock: number; lowStockThreshold: number; isActive: boolean; optionValues: string[];
}

const keyOf = (vals: string[]) => vals.join('||');

/** Tích Descartes các giá trị option -> danh sách tổ hợp */
function cartesian(options: { values: string[] }[]): string[][] {
  return options.reduce<string[][]>((acc, o) => acc.flatMap((combo) => o.values.map((v) => [...combo, v])), [[]]);
}

const emptyVariant = (optionValues: string[], sku: string, base?: Partial<VariantRow>): VariantRow => ({
  sku, barcode: '', price: base?.price ?? 0, compareAtPrice: '', costPrice: base?.costPrice ?? '',
  stock: 0, lowStockThreshold: base?.lowStockThreshold ?? 5, isActive: true, optionValues,
});

export function ProductForm({ product, onSaved }: { product?: Product; onSaved?: (p: Product) => void }) {
  const router = useRouter();
  const toast = useToast();
  const [cats, setCats] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState({
    name: product?.name ?? '', slug: product?.slug ?? '', description: product?.description ?? '',
    brand: product?.brand ?? '', unit: product?.unit ?? '', categoryId: product?.categoryId ? String(product.categoryId) : '',
    isActive: product?.isActive ?? true, isFeatured: product?.isFeatured ?? false,
  });
  const [thumbnail, setThumbnail] = useState<string[]>(product?.thumbnail ? [product.thumbnail] : []);
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [options, setOptions] = useState<OptionRow[]>(
    product?.options?.map((o) => ({ name: o.name, values: o.values.map((v) => v.value), draft: '' })) ?? [],
  );
  const [variants, setVariants] = useState<VariantRow[]>(
    product?.variants.map((v) => ({
      id: v.id, sku: v.sku, barcode: v.barcode ?? '', price: v.price, compareAtPrice: v.compareAtPrice ?? '',
      costPrice: v.costPrice ?? '', stock: v.stock, lowStockThreshold: v.lowStockThreshold, isActive: v.isActive,
      optionValues: product.options?.map((o) => v.options?.[o.name] ?? '') ?? [],
    })) ?? [emptyVariant([], '')],
  );
  const [bulk, setBulk] = useState({ price: '', stock: '' });

  useEffect(() => { api<Category[]>('/admin/categories').then(setCats); }, []);

  /** Sinh lại danh sách biến thể khi options thay đổi, giữ dữ liệu các tổ hợp cũ */
  const regenerate = (opts: OptionRow[]) => {
    const valid = opts.filter((o) => o.name.trim() && o.values.length);
    setVariants((old) => {
      const byKey = new Map(old.map((v) => [keyOf(v.optionValues), v]));
      const base = old[0];
      // Tiền tố SKU: chữ cái đầu mỗi từ trong tên SP (bỏ dấu) + hậu tố ngẫu nhiên để tránh trùng
      const prefix = (info.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd')
        .split(/\s+/).map((w) => w[0] ?? '').join('').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'SP') +
        '-' + Math.random().toString(36).slice(2, 5).toUpperCase();
      return cartesian(valid).map((combo, i) => byKey.get(keyOf(combo)) ?? emptyVariant(combo, `${prefix}-${String(i + 1).padStart(2, '0')}`, base));
    });
  };

  const setOpts = (next: OptionRow[]) => { setOptions(next); regenerate(next); };
  const updateOpt = (i: number, patch: Partial<OptionRow>) => setOptions(options.map((o, j) => (i === j ? { ...o, ...patch } : o)));
  const addValue = (i: number) => {
    const vals = options[i].draft.split(',').map((s) => s.trim()).filter((s) => s && !options[i].values.includes(s));
    if (!vals.length) return;
    setOpts(options.map((o, j) => (i === j ? { ...o, values: [...o.values, ...vals], draft: '' } : o)));
  };
  const setVar = (i: number, patch: Partial<VariantRow>) => setVariants(variants.map((v, j) => (i === j ? { ...v, ...patch } : v)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOpts = options.filter((o) => o.name.trim() && o.values.length);
    if (!variants.length) return toast('Cần ít nhất 1 biến thể', 'error');
    const payload = {
      ...info,
      categoryId: info.categoryId ? Number(info.categoryId) : null,
      slug: info.slug || undefined,
      thumbnail: thumbnail[0] ?? images[0],
      images,
      options: validOpts.map((o) => ({ name: o.name.trim(), values: o.values })),
      variants: variants.map((v) => ({
        ...(v.id && { id: v.id }), sku: v.sku.trim(), barcode: v.barcode || undefined, price: Number(v.price),
        compareAtPrice: v.compareAtPrice === '' ? null : Number(v.compareAtPrice),
        costPrice: v.costPrice === '' ? null : Number(v.costPrice),
        stock: Number(v.stock), lowStockThreshold: Number(v.lowStockThreshold), isActive: v.isActive, optionValues: v.optionValues,
      })),
    };
    setSaving(true);
    try {
      const saved = await api<Product>(product ? `/admin/products/${product.id}` : '/admin/products', { method: product ? 'PUT' : 'POST', json: payload });
      toast('Đã lưu sản phẩm');
      if (!product) router.replace(`/admin/products/${saved.id}`);
      else onSaved?.(saved);
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const num = (v: string) => (v === '' ? '' : Number(v));

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card space-y-4 lg:col-span-2">
          <h2 className="font-semibold">Thông tin chung</h2>
          <div><label className="label">Tên sản phẩm *</label><input className="input" required value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} /></div>
          <div className="grid gap-4 md:grid-cols-3">
            <div><label className="label">Slug (tự sinh nếu trống)</label><input className="input" value={info.slug} onChange={(e) => setInfo({ ...info, slug: e.target.value })} /></div>
            <div><label className="label">Thương hiệu</label><input className="input" value={info.brand} onChange={(e) => setInfo({ ...info, brand: e.target.value })} /></div>
            <div><label className="label">Đơn vị tính</label><input className="input" placeholder="gói, chai, kg..." value={info.unit} onChange={(e) => setInfo({ ...info, unit: e.target.value })} /></div>
          </div>
          <div><label className="label">Mô tả</label><textarea className="input" rows={5} value={info.description} onChange={(e) => setInfo({ ...info, description: e.target.value })} /></div>
        </div>
        <div className="card space-y-4">
          <h2 className="font-semibold">Phân loại & hiển thị</h2>
          <div><label className="label">Danh mục</label>
            <select className="input" value={info.categoryId} onChange={(e) => setInfo({ ...info, categoryId: e.target.value })}>
              <option value="">— Không —</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.parent ? `${c.parent.name} › ` : ''}{c.name}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={info.isActive} onChange={(e) => setInfo({ ...info, isActive: e.target.checked })} /> Đang bán</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={info.isFeatured} onChange={(e) => setInfo({ ...info, isFeatured: e.target.checked })} /> Sản phẩm nổi bật</label>
          <div><label className="label">Ảnh đại diện</label><ImageUploader value={thumbnail} onChange={setThumbnail} /></div>
          <div><label className="label">Thư viện ảnh</label><ImageUploader value={images} onChange={setImages} multiple /></div>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Thuộc tính biến thể</h2>
            <p className="text-xs text-gray-500">Vd: Khối lượng (500g, 1kg), Hương vị (Cay, Không cay). Biến thể được sinh tự động theo tổ hợp.</p>
          </div>
          <button type="button" className="btn-outline btn-sm" disabled={options.length >= 3} onClick={() => setOptions([...options, { name: '', values: [], draft: '' }])}>+ Thêm thuộc tính</button>
        </div>
        {options.map((o, i) => (
          <div key={i} className="grid gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-[200px_1fr_auto]">
            <input className="input" placeholder="Tên thuộc tính" value={o.name} onChange={(e) => updateOpt(i, { name: e.target.value })} onBlur={() => regenerate(options)} />
            <div>
              <div className="mb-2 flex flex-wrap gap-1">
                {o.values.map((v) => (
                  <span key={v} className="badge gap-1 bg-brand-50 text-brand-700">
                    {v}<button type="button" onClick={() => setOpts(options.map((x, j) => (j === i ? { ...x, values: x.values.filter((y) => y !== v) } : x)))}>×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input className="input" placeholder="Nhập giá trị, phân cách bằng dấu phẩy rồi Enter" value={o.draft}
                  onChange={(e) => updateOpt(i, { draft: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addValue(i); } }} />
                <button type="button" className="btn-outline" onClick={() => addValue(i)}>Thêm</button>
              </div>
            </div>
            <button type="button" className="btn-danger btn-sm h-fit" onClick={() => setOpts(options.filter((_, j) => j !== i))}>Xoá</button>
          </div>
        ))}
      </div>

      <div className="card space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-semibold">Danh sách biến thể ({variants.length})</h2>
          <div className="flex flex-wrap items-end gap-2 text-sm">
            <span className="text-gray-500">Áp dụng cho tất cả:</span>
            <input className="input w-28 sm:w-32" placeholder="Giá bán" value={bulk.price} onChange={(e) => setBulk({ ...bulk, price: e.target.value })} />
            <input className="input w-24" placeholder="Tồn kho" value={bulk.stock} onChange={(e) => setBulk({ ...bulk, stock: e.target.value })} />
            <button type="button" className="btn-outline" onClick={() => setVariants(variants.map((v) => ({
              ...v, ...(bulk.price !== '' && { price: Number(bulk.price) }), ...(bulk.stock !== '' && { stock: Number(bulk.stock) }),
            })))}>Áp dụng</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Biến thể</th><th>SKU *</th><th>Mã vạch</th><th>Giá bán *</th><th>Giá gốc</th><th>Giá nhập</th><th>Tồn kho</th><th>Cảnh báo</th><th>Bật</th></tr></thead>
            <tbody>
              {variants.map((v, i) => (
                <tr key={keyOf(v.optionValues) + i}>
                  <td className="font-medium whitespace-nowrap">{v.optionValues.length ? v.optionValues.join(' / ') : 'Mặc định'}</td>
                  <td><input className="input w-36 font-mono text-xs" required value={v.sku} onChange={(e) => setVar(i, { sku: e.target.value })} /></td>
                  <td><input className="input w-28" value={v.barcode} onChange={(e) => setVar(i, { barcode: e.target.value })} /></td>
                  <td><input className="input w-28" type="number" min={0} required value={v.price} onChange={(e) => setVar(i, { price: Number(e.target.value) })} /></td>
                  <td><input className="input w-28" type="number" min={0} value={v.compareAtPrice} onChange={(e) => setVar(i, { compareAtPrice: num(e.target.value) })} /></td>
                  <td><input className="input w-28" type="number" min={0} value={v.costPrice} onChange={(e) => setVar(i, { costPrice: num(e.target.value) })} /></td>
                  <td><input className="input w-20" type="number" min={0} value={v.stock} onChange={(e) => setVar(i, { stock: Number(e.target.value) })} /></td>
                  <td><input className="input w-16" type="number" min={0} value={v.lowStockThreshold} onChange={(e) => setVar(i, { lowStockThreshold: Number(e.target.value) })} /></td>
                  <td><input type="checkbox" checked={v.isActive} onChange={(e) => setVar(i, { isActive: e.target.checked })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {variants.length > 0 && (
          <p className="text-xs text-gray-500">
            Giá: {money(Math.min(...variants.map((v) => v.price)))} – {money(Math.max(...variants.map((v) => v.price)))} ·
            Tổng tồn: {variants.reduce((s, v) => s + Number(v.stock), 0)} · Thay đổi tồn kho sẽ được ghi vào lịch sử kho.
          </p>
        )}
      </div>

      <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-gray-50 py-4">
        <button type="button" className="btn-outline" onClick={() => router.push('/admin/products')}>Huỷ</button>
        <button className="btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu sản phẩm'}</button>
      </div>
    </form>
  );
}
