'use client';
import { useStoreHref } from '@/context/store';
import { Check, ChevronRight, Heart, ShieldCheck, ShoppingCart, Truck, Zap } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ProductGrid } from '@/components/shop/ProductCard';
import { useToast } from '@/components/Toast';
import { Empty, Pagination, QtyInput, Spinner, StarInput, Stars } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useCart } from '@/context/cart';
import { useSettings } from '@/context/settings';
import { useWishlist } from '@/context/wishlist';
import { api, imageUrl } from '@/lib/api';
import { date, money } from '@/lib/format';
import type { Paged, Product, Review, Variant } from '@/lib/types';

type ReviewPage = Paged<Review> & { distribution: Record<string, number> };

function Reviews({ product, onChanged }: { product: Product; onChanged: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ReviewPage | null>(null);
  const [mine, setMine] = useState<{ canReview: boolean; review: Review | null } | null>(null);
  const [form, setForm] = useState({ rating: 5, comment: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => api<ReviewPage>(`/products/${product.id}/reviews?page=${page}&limit=5`).then(setData), [product.id, page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!user) return setMine(null);
    api<{ canReview: boolean; review: Review | null }>(`/products/${product.id}/reviews/me`).then((m) => {
      setMine(m);
      if (m.review) setForm({ rating: m.review.rating, comment: m.review.comment ?? '' });
    });
  }, [user, product.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/products/${product.id}/reviews`, { method: 'POST', json: form });
      toast('Cảm ơn bạn đã đánh giá!');
      load(); onChanged();
      setMine((m) => (m ? { ...m, review: { ...(m.review as Review), ...form } } : m));
    } catch (e: any) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  const total = data ? Object.values(data.distribution).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <div className="space-y-5">
        <div className="rounded-2xl bg-slate-50 p-5 text-center">
          <div className="text-5xl font-extrabold text-ink">{product.ratingAvg.toFixed(1)}</div>
          <Stars value={product.ratingAvg} size="h-5 w-5" />
          <div className="mt-1 text-sm text-slate-500">{product.ratingCount} đánh giá</div>
        </div>
        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map((r) => {
            const n = data?.distribution[r] ?? 0;
            return (
              <div key={r} className="flex items-center gap-2 text-sm">
                <span className="w-8 text-slate-500">{r} ★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${total ? (n / total) * 100 : 0}%` }} /></div>
                <span className="w-6 text-right text-slate-400">{n}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        {user ? (
          mine?.canReview ? (
            <form onSubmit={submit} className="mb-6 space-y-3 rounded-2xl border border-brand-100 bg-brand-50/50 p-5">
              <div className="font-semibold text-ink">{mine.review ? 'Cập nhật đánh giá của bạn' : 'Viết đánh giá'}</div>
              <StarInput value={form.rating} onChange={(rating) => setForm({ ...form, rating })} />
              <textarea className="input" rows={3} placeholder="Chia sẻ cảm nhận về chất lượng, hương vị, đóng gói…" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
              <button className="btn-primary" disabled={saving}>{saving ? 'Đang gửi…' : 'Gửi đánh giá'}</button>
            </form>
          ) : (
            <div className="mb-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Bạn có thể đánh giá sau khi mua sản phẩm này và đơn hàng hoàn thành.</div>
          )
        ) : (
          <div className="mb-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-500"><Link href="/login" className="link">Đăng nhập</Link> để viết đánh giá.</div>
        )}
        {!data ? <Spinner className="py-6" /> : !data.items.length ? <Empty text="Chưa có đánh giá nào" /> : (
          <div className="divide-y divide-slate-100">
            {data.items.map((r) => (
              <div key={r.id} className="flex gap-3 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-800">{r.user.fullName.trim().split(' ').pop()?.[0]?.toUpperCase()}</div>
                <div>
                  <div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-ink">{r.user.fullName}</span><span className="badge bg-brand-50 text-brand-700"><Check className="h-3 w-3" /> Đã mua hàng</span></div>
                  <div className="mt-0.5 flex items-center gap-2"><Stars value={r.rating} size="h-3.5 w-3.5" /><span className="text-xs text-slate-400">{date(r.createdAt)}</span></div>
                  {r.comment && <p className="mt-2 text-sm leading-relaxed text-slate-600">{r.comment}</p>}
                </div>
              </div>
            ))}
            <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  const sh = useStoreHref();
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const cart = useCart();
  const wl = useWishlist();
  const toast = useToast();
  const { settings } = useSettings();
  const [p, setP] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [qty, setQty] = useState(1);
  const [mainImg, setMainImg] = useState<string | null>(null);
  const [tab, setTab] = useState<'desc' | 'reviews'>('desc');

  const load = useCallback((init = false) =>
    api<Product>(`/products/${slug}`).then((prod) => {
      setP(prod);
      if (!init) return;
      const first = prod.variants.find((v) => v.stock > 0) ?? prod.variants[0];
      if (first && prod.options) {
        const s: Record<number, number> = {};
        prod.options.forEach((o) => { const id = o.values.find((val) => first.optionValueIds?.includes(val.id))?.id; if (id) s[o.id] = id; });
        setSelected(s);
      }
    }).catch((e) => setError(e.message)), [slug]);

  useEffect(() => { load(true); }, [load]);

  const variant: Variant | undefined = useMemo(() => {
    if (!p) return;
    if (!p.options?.length) return p.variants[0];
    const ids = Object.values(selected);
    if (ids.length !== p.options.length) return;
    return p.variants.find((v) => ids.every((id) => v.optionValueIds?.includes(id)));
  }, [p, selected]);

  const availability = (optionId: number, valueId: number) => {
    const others = Object.entries(selected).filter(([oid]) => Number(oid) !== optionId).map(([, v]) => v);
    const m = p!.variants.filter((v) => v.optionValueIds?.includes(valueId) && others.every((o) => v.optionValueIds?.includes(o)));
    if (!m.length) return 'none';
    return m.some((x) => x.stock > 0) ? 'ok' : 'out';
  };

  if (error) return <div className="container-x py-20"><Empty text={error}><Link href={sh('/products')} className="btn-primary">Quay lại cửa hàng</Link></Empty></div>;
  if (!p) return <Spinner />;

  const images = [...new Set([variant?.image, p.thumbnail, ...(p.images ?? [])].filter(Boolean) as string[])];
  const shown = mainImg ?? images[0];
  const discount = variant?.compareAtPrice && variant.compareAtPrice > variant.price ? Math.round((1 - variant.price / variant.compareAtPrice) * 100) : 0;

  const addToCart = (buyNow = false) => {
    if (!variant) return toast('Vui lòng chọn đầy đủ phân loại', 'error');
    if (variant.stock <= 0) return toast('Phân loại này đã hết hàng', 'error');
    const inCart = cart.items.find((i) => i.variantId === variant.id)?.quantity ?? 0;
    if (inCart + qty > variant.stock) return toast(`Chỉ còn ${variant.stock} sản phẩm (giỏ đã có ${inCart})`, 'error');
    cart.add({ variantId: variant.id, productId: p.id, slug: p.slug, productName: p.name, variantName: variant.name, image: variant.image || p.thumbnail, price: variant.price, stock: variant.stock }, qty);
    if (buyNow) router.push(sh('/checkout'));
    else { toast('Đã thêm vào giỏ hàng'); cart.setOpen(true); }
  };

  return (
    <div className="container-x py-6">
      <nav className="mb-5 flex flex-wrap items-center gap-1 text-sm text-slate-400">
        <Link href={sh('/')} className="hover:text-brand-700">Trang chủ</Link><ChevronRight className="h-3.5 w-3.5" />
        {p.category && <><Link href={sh(`/products?category=${p.category.slug}`)} className="hover:text-brand-700">{p.category.name}</Link><ChevronRight className="h-3.5 w-3.5" /></>}
        <span className="truncate text-slate-600">{p.name}</span>
      </nav>

      <div className="grid gap-8 rounded-3xl border border-slate-200/70 bg-white p-4 shadow-soft sm:p-6 lg:grid-cols-2 lg:gap-12">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl(shown)} alt={p.name} className="h-full w-full object-cover" />
            {discount > 0 && <span className="badge absolute top-4 left-4 bg-red-500 px-3 py-1 text-sm text-white">-{discount}%</span>}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
              {images.map((img) => (
                <button key={img} onClick={() => setMainImg(img)} className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition ${img === shown ? 'border-brand-500' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl(img)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          {p.brand && <Link href={sh(`/products?brand=${encodeURIComponent(p.brand)}`)} className="w-fit text-sm font-semibold tracking-wide text-brand-700 uppercase">{p.brand}</Link>}
          <h1 className="mt-1 text-2xl leading-tight font-bold sm:text-3xl">{p.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            {p.ratingCount > 0 ? <button onClick={() => { setTab('reviews'); document.getElementById('tabs')?.scrollIntoView({ behavior: 'smooth' }); }} className="flex items-center gap-1.5"><Stars value={p.ratingAvg} /><span className="underline">{p.ratingCount} đánh giá</span></button> : <span>Chưa có đánh giá</span>}
            <span>·</span><span>Đã bán {p.soldCount}</span>
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl bg-gradient-to-r from-brand-50 to-white p-5">
            <span className="text-3xl font-extrabold text-brand-700 sm:text-4xl">{money(variant?.price ?? p.minPrice)}</span>
            {!variant && p.maxPrice > p.minPrice && <span className="pb-1 text-xl text-slate-500">– {money(p.maxPrice)}</span>}
            {discount > 0 && <span className="pb-1 text-lg text-slate-400 line-through">{money(variant!.compareAtPrice)}</span>}
            {p.unit && <span className="pb-1.5 text-sm text-slate-500">/ {p.unit}</span>}
          </div>

          {p.options?.map((o) => (
            <div key={o.id} className="mt-6">
              <div className="mb-2.5 text-sm font-semibold text-ink">{o.name}: <span className="font-normal text-slate-500">{o.values.find((v) => v.id === selected[o.id])?.value}</span></div>
              <div className="flex flex-wrap gap-2">
                {o.values.map((val) => {
                  const state = availability(o.id, val.id);
                  const active = selected[o.id] === val.id;
                  return (
                    <button
                      key={val.id}
                      disabled={state === 'none'}
                      onClick={() => { setSelected((s) => ({ ...s, [o.id]: val.id })); setQty(1); setMainImg(null); }}
                      className={`relative rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 ${active ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 hover:border-brand-400'} ${state === 'out' && !active ? 'text-slate-400' : ''}`}
                    >
                      {val.value}{state === 'out' && <span className="ml-1 text-[11px]">(hết)</span>}
                      {active && <Check className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-brand-600 p-0.5 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <QtyInput value={qty} onChange={setQty} max={Math.max(1, variant?.stock ?? 1)} />
            <span className={`text-sm font-medium ${variant && variant.stock > 0 ? (variant.stock <= variant.lowStockThreshold ? 'text-accent-600' : 'text-brand-700') : 'text-red-500'}`}>
              {variant ? (variant.stock > 0 ? (variant.stock <= variant.lowStockThreshold ? `Chỉ còn ${variant.stock} sản phẩm!` : `Còn hàng (${variant.stock})`) : 'Hết hàng') : 'Vui lòng chọn phân loại'}
            </span>
          </div>

          <div className="mt-6 flex gap-2 sm:gap-3">
            <button className="btn-outline btn-lg min-w-0 flex-1 border-2 border-brand-600 px-3 text-sm text-brand-700 hover:bg-brand-50 sm:px-6 sm:text-base" disabled={!variant || variant.stock <= 0} onClick={() => addToCart()}><ShoppingCart className="hidden h-5 w-5 sm:block" /> Thêm vào giỏ</button>
            <button className="btn-primary btn-lg min-w-0 flex-1 px-3 text-sm sm:px-6 sm:text-base" disabled={!variant || variant.stock <= 0} onClick={() => addToCart(true)}><Zap className="hidden h-5 w-5 sm:block" /> Mua ngay</button>
            <button onClick={() => wl.toggle(p.id)} className="btn-outline btn-lg shrink-0 px-3 sm:px-4" aria-label="Yêu thích"><Heart className={`h-5 w-5 ${wl.has(p.id) ? 'fill-red-500 text-red-500' : ''}`} /></button>
          </div>

          <div className="mt-6 grid gap-2.5 rounded-2xl border border-slate-100 p-4 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2.5"><Truck className="h-5 w-5 text-brand-600" />{settings.freeShippingThreshold ? `Miễn phí ship đơn từ ${money(settings.freeShippingThreshold)}` : 'Giao hàng nhanh'}</div>
            <div className="flex items-center gap-2.5"><ShieldCheck className="h-5 w-5 text-brand-600" />Đổi trả trong 7 ngày</div>
          </div>
          {variant && <div className="mt-3 text-xs text-slate-400">SKU: {variant.sku}{variant.barcode && ` · Mã vạch: ${variant.barcode}`}</div>}
        </div>
      </div>

      <div id="tabs" className="mt-8 rounded-3xl border border-slate-200/70 bg-white shadow-soft">
        <div className="flex border-b border-slate-100 px-4 sm:px-6">
          {([['desc', 'Mô tả sản phẩm'], ['reviews', `Đánh giá (${p.ratingCount})`]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`-mb-px border-b-2 px-4 py-4 text-sm font-semibold transition ${tab === k ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-ink'}`}>{l}</button>
          ))}
        </div>
        <div className="p-5 sm:p-8">
          {tab === 'desc' ? (
            <div className="max-w-3xl space-y-4 text-[15px] leading-relaxed whitespace-pre-line text-slate-600">
              {p.description || 'Đang cập nhật mô tả.'}
              <table className="mt-4 w-full max-w-md text-sm">
                <tbody className="divide-y divide-slate-100">
                  {p.brand && <tr><td className="py-2 text-slate-400">Thương hiệu</td><td className="py-2 font-medium text-ink">{p.brand}</td></tr>}
                  {p.category && <tr><td className="py-2 text-slate-400">Danh mục</td><td className="py-2 font-medium text-ink">{p.category.name}</td></tr>}
                  {p.unit && <tr><td className="py-2 text-slate-400">Đơn vị</td><td className="py-2 font-medium text-ink">{p.unit}</td></tr>}
                  {p.options?.map((o) => <tr key={o.id}><td className="py-2 text-slate-400">{o.name}</td><td className="py-2 font-medium text-ink">{o.values.map((v) => v.value).join(', ')}</td></tr>)}
                </tbody>
              </table>
            </div>
          ) : <Reviews product={p} onChanged={() => load()} />}
        </div>
      </div>

      {!!p.related?.length && (
        <section className="mt-10">
          <h2 className="section-title mb-5">Có thể bạn cũng thích</h2>
          <ProductGrid products={p.related.slice(0, 5)} />
        </section>
      )}
    </div>
  );
}
