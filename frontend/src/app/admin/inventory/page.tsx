'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Empty, Modal, Pagination, Spinner } from '@/components/ui';
import { api, imageUrl, qs } from '@/lib/api';
import { dateTime, money } from '@/lib/format';
import type { Paged } from '@/lib/types';

interface StockRow { id: number; sku: string; name: string; stock: number; lowStockThreshold: number; price: number; costPrice: number | null; productName: string; thumbnail: string | null; isActive: boolean }
interface Log { id: number; change: number; stockAfter: number; reason: string; note: string | null; createdAt: string; variant: { sku: string; name: string; product: { name: string } }; user: { fullName: string } | null }

const REASONS: Record<string, string> = { IMPORT: 'Nhập kho', ORDER: 'Bán hàng', CANCEL: 'Huỷ đơn', ADJUST: 'Điều chỉnh' };

function InventoryInner() {
  const toast = useToast();
  const [tab, setTab] = useState<'stock' | 'logs'>('stock');
  const [filter, setFilter] = useState({ filter: useSearchParams().get('filter') ?? 'all', search: '', page: 1 });
  const [stock, setStock] = useState<Paged<StockRow> | null>(null);
  const [logs, setLogs] = useState<Paged<Log> | null>(null);
  const [logPage, setLogPage] = useState(1);
  const [adjusting, setAdjusting] = useState<StockRow | null>(null);
  const [adj, setAdj] = useState({ type: 'IMPORT', qty: 0, note: '' });

  const loadStock = () => api<Paged<StockRow>>('/admin/inventory' + qs({ ...filter, limit: 20 })).then(setStock);
  useEffect(() => { loadStock(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);
  useEffect(() => { if (tab === 'logs') api<Paged<Log>>('/admin/inventory/logs' + qs({ page: logPage, limit: 30 })).then(setLogs); }, [tab, logPage]);

  const submitAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    const change = adj.type === 'EXPORT' ? -Math.abs(adj.qty) : adj.type === 'IMPORT' ? Math.abs(adj.qty) : adj.qty - adjusting!.stock;
    if (change === 0) return toast('Không có thay đổi', 'error');
    try {
      await api('/admin/inventory/adjust', { method: 'POST', json: { variantId: adjusting!.id, change, reason: adj.type === 'IMPORT' ? 'IMPORT' : 'ADJUST', note: adj.note || undefined } });
      toast('Đã cập nhật tồn kho');
      setAdjusting(null);
      loadStock();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Kho hàng</h1>
      <div className="flex gap-2">
        <button className={tab === 'stock' ? 'btn-primary' : 'btn-outline'} onClick={() => setTab('stock')}>Tồn kho theo biến thể</button>
        <button className={tab === 'logs' ? 'btn-primary' : 'btn-outline'} onClick={() => setTab('logs')}>Lịch sử xuất nhập</button>
      </div>

      {tab === 'stock' ? (
        <>
          <div className="card flex flex-wrap gap-3 p-4">
            <input className="input max-w-xs" placeholder="Tìm SKU, tên sản phẩm..." onKeyDown={(e) => e.key === 'Enter' && setFilter({ ...filter, search: (e.target as HTMLInputElement).value, page: 1 })} />
            {[['all', 'Tất cả'], ['low', 'Sắp hết'], ['out', 'Hết hàng']].map(([k, l]) => (
              <button key={k} className={filter.filter === k ? 'btn-primary' : 'btn-outline'} onClick={() => setFilter({ ...filter, filter: k, page: 1 })}>{l}</button>
            ))}
          </div>
          <div className="card overflow-x-auto p-0">
            {!stock ? <Spinner /> : !stock.items.length ? <Empty /> : (
              <table className="table">
                <thead><tr><th>Sản phẩm</th><th>SKU</th><th>Giá bán</th><th>Giá nhập</th><th>Tồn kho</th><th>Ngưỡng cảnh báo</th><th>Giá trị tồn</th><th></th></tr></thead>
                <tbody>
                  {stock.items.map((v) => (
                    <tr key={v.id}>
                      <td><div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl(v.thumbnail)} alt="" className="h-9 w-9 rounded object-cover" />
                        <div><div className="font-medium">{v.productName}</div><div className="text-xs text-gray-500">{v.name}</div></div>
                      </div></td>
                      <td className="font-mono text-xs">{v.sku}</td>
                      <td>{money(v.price)}</td><td>{v.costPrice ? money(v.costPrice) : '—'}</td>
                      <td><span className={`badge ${v.stock <= 0 ? 'bg-red-100 text-red-700' : v.stock <= v.lowStockThreshold ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{v.stock}</span></td>
                      <td>{v.lowStockThreshold}</td>
                      <td>{money(v.stock * (v.costPrice ?? v.price))}</td>
                      <td><button className="btn-outline btn-sm" onClick={() => { setAdjusting(v); setAdj({ type: 'IMPORT', qty: 0, note: '' }); }}>Nhập / Điều chỉnh</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {stock && <Pagination page={stock.page} totalPages={stock.totalPages} onChange={(page) => setFilter({ ...filter, page })} />}
        </>
      ) : (
        <>
          <div className="card overflow-x-auto p-0">
            {!logs ? <Spinner /> : !logs.items.length ? <Empty /> : (
              <table className="table">
                <thead><tr><th>Thời gian</th><th>Sản phẩm</th><th>SKU</th><th>Loại</th><th>Thay đổi</th><th>Tồn sau</th><th>Ghi chú</th><th>Người thực hiện</th></tr></thead>
                <tbody>
                  {logs.items.map((l) => (
                    <tr key={l.id}>
                      <td className="text-xs">{dateTime(l.createdAt)}</td>
                      <td>{l.variant.product.name}<div className="text-xs text-gray-500">{l.variant.name}</div></td>
                      <td className="font-mono text-xs">{l.variant.sku}</td>
                      <td>{REASONS[l.reason]}</td>
                      <td className={l.change > 0 ? 'font-semibold text-green-600' : 'font-semibold text-red-600'}>{l.change > 0 ? '+' : ''}{l.change}</td>
                      <td>{l.stockAfter}</td><td className="text-xs">{l.note}</td><td className="text-xs">{l.user?.fullName ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {logs && <Pagination page={logs.page} totalPages={logs.totalPages} onChange={setLogPage} />}
        </>
      )}

      <Modal open={!!adjusting} onClose={() => setAdjusting(null)} title="Cập nhật tồn kho">
        {adjusting && (
          <form onSubmit={submitAdjust} className="space-y-3">
            <div className="rounded-lg bg-gray-50 p-3 text-sm">{adjusting.productName} – {adjusting.name}<br />Tồn hiện tại: <b>{adjusting.stock}</b></div>
            <div className="flex gap-2">
              {[['IMPORT', 'Nhập thêm'], ['EXPORT', 'Xuất / Hao hụt'], ['SET', 'Đặt số lượng']].map(([k, l]) => (
                <button type="button" key={k} className={adj.type === k ? 'btn-primary btn-sm' : 'btn-outline btn-sm'} onClick={() => setAdj({ ...adj, type: k })}>{l}</button>
              ))}
            </div>
            <div><label className="label">{adj.type === 'SET' ? 'Số lượng tồn mới' : 'Số lượng'}</label>
              <input className="input" type="number" min={0} required value={adj.qty} onChange={(e) => setAdj({ ...adj, qty: Number(e.target.value) })} /></div>
            <div><label className="label">Ghi chú</label><input className="input" placeholder="Vd: Nhập từ NCC A, hàng hỏng..." value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} /></div>
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
