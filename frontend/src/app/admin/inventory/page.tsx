'use client';
import { AlertTriangle, ArrowDownToLine, Boxes, ClipboardCheck, PackageX, SlidersHorizontal, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { PickedVariant, VariantPicker } from '@/components/admin/VariantPicker';
import { useToast } from '@/components/Toast';
import { Empty, Modal, Pagination, Spinner, StatCard } from '@/components/ui';
import { api, imageUrl, qs } from '@/lib/api';
import { dateTime, INVENTORY_REASONS, money, num } from '@/lib/format';
import type { Paged } from '@/lib/types';

interface StockRow { id: number; sku: string; name: string; stock: number; lowStockThreshold: number; price: number; costPrice: number | null; productName: string; thumbnail: string | null; isActive: boolean }
interface Log { id: number; change: number; stockAfter: number; unitCost: number | null; reason: string; note: string | null; createdAt: string; variant: { sku: string; name: string; product: { name: string } }; user: { fullName: string } | null; document: { id: number; code: string } | null }
interface Expiring { id: number; lotNo: string | null; expiryDate: string; quantity: number; daysLeft: number; document: { id: number; code: string }; variant: { id: number; sku: string; name: string; stock: number; product: { name: string; thumbnail: string | null; unit: string | null } } }
interface Summary { skus: number; units: number; costValue: number; retailValue: number; lowStock: number; outOfStock: number }

const REASON_CLS: Record<string, string> = { IMPORT: 'bg-emerald-100 text-emerald-800', EXPORT: 'bg-orange-100 text-orange-800', STOCKTAKE: 'bg-sky-100 text-sky-800', ORDER: 'bg-violet-100 text-violet-800', CANCEL: 'bg-slate-200 text-slate-700', ADJUST: 'bg-amber-100 text-amber-800' };

function InventoryInner() {
  const toast = useToast();
  const [tab, setTab] = useState<'stock' | 'logs' | 'expiring'>('stock');
  const [expDays, setExpDays] = useState(30);
  const [expiring, setExpiring] = useState<Expiring[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [filter, setFilter] = useState({ filter: useSearchParams().get('filter') ?? 'all', search: '', page: 1 });
  const [stock, setStock] = useState<Paged<StockRow> | null>(null);
  const [logF, setLogF] = useState({ reason: '', search: '', page: 1 });
  const [logs, setLogs] = useState<Paged<Log> | null>(null);
  const [adjusting, setAdjusting] = useState<StockRow | null>(null);
  const [adj, setAdj] = useState({ type: 'SET', qty: 0, note: '' });

  const loadSummary = () => api<Summary>('/admin/stock/summary').then(setSummary);
  const loadStock = () => api<Paged<StockRow>>('/admin/inventory' + qs({ ...filter, limit: 20 })).then(setStock);
  useEffect(() => { loadSummary(); }, []);
  useEffect(() => { loadStock(); }, [filter]); // eslint-disable-line
  useEffect(() => { if (tab === 'expiring') { setExpiring(null); api<Expiring[]>(`/admin/stock/expiring?days=${expDays}`).then(setExpiring); } }, [tab, expDays]);
  useEffect(() => { if (tab === 'logs') api<Paged<Log>>('/admin/inventory/logs' + qs({ ...logF, limit: 30 })).then(setLogs); }, [tab, logF]);

  const openAdjust = (v: StockRow) => { setAdjusting(v); setAdj({ type: 'SET', qty: v.stock, note: '' }); };
  const pickToAdjust = (v: PickedVariant) => openAdjust({ id: v.id, sku: v.sku, name: v.name, stock: v.stock, lowStockThreshold: v.lowStockThreshold, price: v.price, costPrice: v.costPrice ?? null, productName: v.product.name, thumbnail: v.image || v.product.thumbnail || null, isActive: v.isActive });

  const submitAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    const change = adj.type === 'SET' ? adj.qty - adjusting!.stock : adj.type === 'MINUS' ? -Math.abs(adj.qty) : Math.abs(adj.qty);
    if (change === 0) return toast('Không có thay đổi', 'error');
    if (!adj.note.trim()) return toast('Vui lòng ghi lý do điều chỉnh', 'error');
    try {
      await api('/admin/inventory/adjust', { method: 'POST', json: { variantId: adjusting!.id, change, reason: 'ADJUST', note: adj.note } });
      toast('Đã điều chỉnh tồn kho'); setAdjusting(null); loadStock(); loadSummary();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div className="space-y-5">
      {summary && (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard icon={<Boxes className="h-5 w-5" />} label="Mã hàng (SKU)" value={num(summary.skus)} hint={`${num(summary.units)} đơn vị trong kho`} />
          <StatCard icon={<Wallet className="h-5 w-5" />} tone="sky" label="Giá trị tồn (giá vốn)" value={money(summary.costValue)} hint={`Theo giá bán: ${money(summary.retailValue)}`} />
          <button className="text-left" onClick={() => setFilter({ ...filter, filter: 'low', page: 1 })}><StatCard icon={<AlertTriangle className="h-5 w-5" />} tone="accent" label="Sắp hết hàng" value={summary.lowStock} hint="≤ ngưỡng cảnh báo" /></button>
          <button className="text-left" onClick={() => setFilter({ ...filter, filter: 'out', page: 1 })}><StatCard icon={<PackageX className="h-5 w-5" />} tone="rose" label="Hết hàng" value={summary.outOfStock} hint="Tồn = 0" /></button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-x-auto rounded-xl bg-white p-1 shadow-soft">
          <button className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'stock' ? 'bg-brand-600 text-white' : 'text-slate-600'}`} onClick={() => setTab('stock')}>Tồn kho</button>
          <button className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'logs' ? 'bg-brand-600 text-white' : 'text-slate-600'}`} onClick={() => setTab('logs')}>Lịch sử</button>
          <button className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'expiring' ? 'bg-brand-600 text-white' : 'text-slate-600'}`} onClick={() => setTab('expiring')}>Sắp hết hạn</button>
        </div>
        <Link href="/admin/stock/new?type=IMPORT" className="btn-primary ml-auto"><ArrowDownToLine className="h-4 w-4" /> Nhập kho</Link>
        <Link href="/admin/stock/new?type=STOCKTAKE" className="btn-outline"><ClipboardCheck className="h-4 w-4" /> Kiểm kê</Link>
      </div>

      {tab === 'expiring' ? (
        <div className="card overflow-x-auto p-0">
          <div className="flex flex-wrap items-center gap-2 p-4">
            <span className="text-sm text-slate-500">Hết hạn trong</span>
            {[7, 15, 30, 60, 90].map((d) => <button key={d} className={`chip ${expDays === d ? 'chip-active' : ''}`} onClick={() => setExpDays(d)}>{d} ngày</button>)}
            <span className="text-xs text-slate-400">· theo số lô & HSD trên phiếu nhập, chỉ hiện sản phẩm còn tồn</span>
          </div>
          {!expiring ? <Spinner /> : !expiring.length ? <Empty text="Không có lô nào sắp hết hạn 🎉" /> : (
            <table className="table">
              <thead><tr><th>Sản phẩm</th><th>Lô</th><th>Hạn dùng</th><th className="text-right">Còn</th><th className="text-right">SL nhập lô</th><th className="text-right">Tồn hiện tại</th><th>Phiếu nhập</th><th /></tr></thead>
              <tbody>
                {expiring.map((e) => (
                  <tr key={e.id}>
                    <td><div className="font-semibold text-ink">{e.variant.product.name}</div><div className="text-xs text-slate-400">{e.variant.name} · <span className="font-mono">{e.variant.sku}</span></div></td>
                    <td className="font-mono text-xs">{e.lotNo || '—'}</td>
                    <td>{new Date(e.expiryDate).toLocaleDateString('vi-VN', { timeZone: 'UTC' })}</td>
                    <td className="text-right"><span className={`badge ${e.daysLeft < 0 ? 'bg-red-600 text-white' : e.daysLeft <= 7 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>{e.daysLeft < 0 ? `Quá hạn ${-e.daysLeft} ngày` : `${e.daysLeft} ngày`}</span></td>
                    <td className="text-right">{e.quantity}</td><td className="text-right font-semibold">{e.variant.stock}</td>
                    <td><Link href={`/admin/stock/${e.document.id}`} className="link font-mono text-xs">{e.document.code}</Link></td>
                    <td className="text-right"><Link href="/admin/stock/new?type=EXPORT" className="btn-ghost btn-sm">Xuất huỷ</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : tab === 'stock' ? (
        <>
          <div className="card grid gap-3 p-4 lg:grid-cols-[1fr_auto]">
            <VariantPicker onPick={pickToAdjust} placeholder="Quét / tìm sản phẩm để điều chỉnh nhanh…" />
            <div className="flex flex-wrap gap-2">
              <input className="input w-56" placeholder="Lọc theo tên, SKU…" onKeyDown={(e) => e.key === 'Enter' && setFilter({ ...filter, search: (e.target as HTMLInputElement).value, page: 1 })} />
              {[['all', 'Tất cả'], ['low', 'Sắp hết'], ['out', 'Hết hàng']].map(([k, l]) => <button key={k} className={`chip ${filter.filter === k ? 'chip-active' : ''}`} onClick={() => setFilter({ ...filter, filter: k, page: 1 })}>{l}</button>)}
            </div>
          </div>
          <div className="card overflow-x-auto p-0">
            {!stock ? <Spinner /> : !stock.items.length ? <Empty /> : (
              <table className="table">
                <thead><tr><th>Sản phẩm</th><th>SKU</th><th className="text-right">Giá vốn</th><th className="text-right">Giá bán</th><th className="text-right">Biên LN</th><th className="text-right">Tồn</th><th className="text-right">Giá trị tồn</th><th /></tr></thead>
                <tbody>
                  {stock.items.map((v) => {
                    const margin = v.costPrice ? Math.round(((v.price - v.costPrice) / v.price) * 100) : null;
                    return (
                      <tr key={v.id} className={v.isActive ? '' : 'opacity-50'}>
                        <td><div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imageUrl(v.thumbnail)} alt="" className="h-10 w-10 rounded-lg object-cover" />
                          <div><div className="font-semibold text-ink">{v.productName}</div><div className="text-xs text-slate-400">{v.name}</div></div>
                        </div></td>
                        <td className="font-mono text-xs">{v.sku}</td>
                        <td className="text-right">{v.costPrice != null ? money(v.costPrice) : '—'}</td>
                        <td className="text-right">{money(v.price)}</td>
                        <td className={`text-right text-sm ${margin != null && margin < 10 ? 'text-red-600' : 'text-slate-500'}`}>{margin != null ? `${margin}%` : '—'}</td>
                        <td className="text-right"><span className={`badge ${v.stock <= 0 ? 'bg-red-100 text-red-700' : v.stock <= v.lowStockThreshold ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>{v.stock}</span></td>
                        <td className="text-right font-semibold">{money(Math.max(0, v.stock) * (v.costPrice ?? 0))}</td>
                        <td className="text-right"><button className="btn-ghost btn-sm" onClick={() => openAdjust(v)}><SlidersHorizontal className="h-3.5 w-3.5" /> Điều chỉnh</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          {stock && <Pagination page={stock.page} totalPages={stock.totalPages} onChange={(page) => setFilter({ ...filter, page })} />}
        </>
      ) : (
        <>
          <div className="card flex flex-wrap gap-2 p-4">
            <input className="input w-64" placeholder="SKU, sản phẩm, ghi chú, mã phiếu…" onKeyDown={(e) => e.key === 'Enter' && setLogF({ ...logF, search: (e.target as HTMLInputElement).value, page: 1 })} />
            <button className={`chip ${!logF.reason ? 'chip-active' : ''}`} onClick={() => setLogF({ ...logF, reason: '', page: 1 })}>Tất cả</button>
            {Object.entries(INVENTORY_REASONS).map(([k, l]) => <button key={k} className={`chip ${logF.reason === k ? 'chip-active' : ''}`} onClick={() => setLogF({ ...logF, reason: k, page: 1 })}>{l}</button>)}
          </div>
          <div className="card overflow-x-auto p-0">
            {!logs ? <Spinner /> : !logs.items.length ? <Empty /> : (
              <table className="table">
                <thead><tr><th>Thời gian</th><th>Sản phẩm</th><th>Loại</th><th className="text-right">Thay đổi</th><th className="text-right">Tồn sau</th><th className="text-right">Đơn giá vốn</th><th>Chứng từ / Ghi chú</th><th>Người thực hiện</th></tr></thead>
                <tbody>
                  {logs.items.map((l) => (
                    <tr key={l.id}>
                      <td className="text-xs whitespace-nowrap">{dateTime(l.createdAt)}</td>
                      <td>{l.variant.product.name}<div className="text-xs text-slate-400">{l.variant.name} · <span className="font-mono">{l.variant.sku}</span></div></td>
                      <td><span className={`badge ${REASON_CLS[l.reason]}`}>{INVENTORY_REASONS[l.reason]}</span></td>
                      <td className={`text-right font-bold ${l.change > 0 ? 'text-brand-700' : 'text-red-600'}`}>{l.change > 0 ? '+' : ''}{l.change}</td>
                      <td className="text-right">{l.stockAfter}</td>
                      <td className="text-right text-sm">{l.unitCost != null ? money(l.unitCost) : '—'}</td>
                      <td className="text-xs">{l.document && <Link href={`/admin/stock/${l.document.id}`} className="link mr-1 font-mono">{l.document.code}</Link>}{l.note}</td>
                      <td className="text-xs">{l.user?.fullName ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {logs && <Pagination page={logs.page} totalPages={logs.totalPages} onChange={(page) => setLogF({ ...logF, page })} />}
        </>
      )}

      <Modal open={!!adjusting} onClose={() => setAdjusting(null)} title="Điều chỉnh tồn kho nhanh">
        {adjusting && (
          <form onSubmit={submitAdjust} className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3 text-sm"><b>{adjusting.productName}</b> – {adjusting.name}<br />Tồn hiện tại: <b>{adjusting.stock}</b></div>
            <div className="grid grid-cols-3 gap-2">
              {[['SET', 'Đặt số lượng'], ['PLUS', 'Cộng thêm'], ['MINUS', 'Trừ bớt']].map(([k, l]) => <button type="button" key={k} className={`chip justify-center ${adj.type === k ? 'chip-active' : ''}`} onClick={() => setAdj({ ...adj, type: k, qty: k === 'SET' ? adjusting.stock : 0 })}>{l}</button>)}
            </div>
            <div><label className="label">{adj.type === 'SET' ? 'Số lượng tồn mới' : 'Số lượng'}</label><input className="input text-lg font-bold" type="number" min={0} required value={adj.qty} onChange={(e) => setAdj({ ...adj, qty: Number(e.target.value) })} /></div>
            <div><label className="label">Lý do *</label><input className="input" placeholder="VD: Đếm lại kệ, hàng tặng kèm…" value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} /></div>
            <p className="text-xs text-slate-400">Dùng cho chỉnh nhanh từng mã. Nhập hàng có giá vốn / kiểm kê định kỳ nên dùng <Link href="/admin/stock" className="link">Phiếu kho</Link> để có chứng từ đầy đủ.</p>
            <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setAdjusting(null)}>Huỷ</button><button className="btn-primary">Xác nhận</button></div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export default function InventoryPage() {
  return <Suspense fallback={<Spinner />}><InventoryInner /></Suspense>;
}
