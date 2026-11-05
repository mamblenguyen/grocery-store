'use client';
import { ArrowLeft, Ban, CheckCircle2, Printer, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { StockDocForm } from '@/components/admin/StockDocForm';
import { useToast } from '@/components/Toast';
import { Badge, Spinner } from '@/components/ui';
import { api, imageUrl } from '@/lib/api';
import { dateOnly, dateTime, EXPORT_REASONS, money, STOCK_DOC_STATUS, STOCK_DOC_TYPE } from '@/lib/format';
import type { StockDoc } from '@/lib/types';

export default function StockDocDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [doc, setDoc] = useState<StockDoc | null>(null);
  const load = useCallback(() => api<StockDoc>(`/admin/stock/documents/${id}`).then(setDoc), [id]);
  useEffect(() => { load(); }, [load]);
  if (!doc) return <Spinner />;

  const act = async (fn: () => Promise<unknown>, msg: string) => { try { await fn(); toast(msg); load(); } catch (e: any) { toast(e.message, 'error'); } };

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link href="/admin/stock" className="btn-ghost"><ArrowLeft className="h-4 w-4" /> Danh sách phiếu</Link>
        <div className="flex flex-wrap gap-2">
          <a href={`/print/stock/${doc.id}`} target="_blank" className="btn-outline"><Printer className="h-4 w-4" /> In phiếu</a>
          {doc.status === 'DRAFT' && (
            <>
              <button className="btn-outline text-red-600" onClick={() => confirm('Xoá phiếu nháp này?') && act(async () => { await api(`/admin/stock/documents/${doc.id}`, { method: 'DELETE' }); router.push('/admin/stock'); }, 'Đã xoá phiếu')}><Trash2 className="h-4 w-4" /> Xoá nháp</button>
              <button className="btn-primary" onClick={() => confirm('Hoàn tất phiếu và cập nhật tồn kho?') && act(() => api(`/admin/stock/documents/${doc.id}/complete`, { method: 'POST' }), 'Đã hoàn tất phiếu')}><CheckCircle2 className="h-4 w-4" /> Hoàn tất ngay</button>
            </>
          )}
          {doc.status === 'COMPLETED' && (
            <button className="btn-danger" onClick={() => {
              const reason = prompt('Lý do huỷ phiếu? (tồn kho sẽ được đảo ngược)');
              if (reason) act(() => api(`/admin/stock/documents/${doc.id}/cancel`, { method: 'POST', json: { reason } }), 'Đã huỷ phiếu & đảo ngược tồn kho');
            }}><Ban className="h-4 w-4" /> Huỷ phiếu</button>
          )}
        </div>
      </div>

      {doc.status === 'DRAFT' ? <StockDocForm key={doc.id + doc.status + (doc as any).updatedAt} type={doc.type} doc={doc} onSaved={setDoc} /> : (
        <>
          <div className="card grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><div className="text-xs text-slate-400">Mã phiếu</div><div className="font-mono text-lg font-bold text-ink">{doc.code}</div><div className="mt-1 flex gap-1.5"><Badge map={Object.fromEntries(Object.entries(STOCK_DOC_TYPE).map(([k, v]) => [k, { label: v.label, cls: v.cls }]))} value={doc.type} /><Badge map={STOCK_DOC_STATUS} value={doc.status} /></div></div>
            <div className="text-sm"><div className="text-xs text-slate-400">{doc.type === 'EXPORT' ? 'Lý do / NCC' : 'Nhà cung cấp'}</div>{doc.reason && <div className="font-semibold">{EXPORT_REASONS[doc.reason]}</div>}<div>{doc.supplier?.name ?? (doc.type === 'STOCKTAKE' ? 'Kiểm kê nội bộ' : '—')}</div>{doc.invoiceNo && <div className="text-slate-500">HĐ: {doc.invoiceNo}</div>}</div>
            <div className="text-sm"><div className="text-xs text-slate-400">Người lập / hoàn tất</div><div>{doc.createdBy?.fullName} · {dateTime(doc.createdAt)}</div>{doc.completedAt && <div className="text-slate-500">{doc.completedBy?.fullName} · {dateTime(doc.completedAt)}</div>}</div>
            <div className="text-sm"><div className="text-xs text-slate-400">Tổng</div><div className="text-xl font-bold text-ink">{money(doc.totalAmount)}</div><div className="text-slate-500">{doc.type === 'STOCKTAKE' ? `Chênh lệch ${doc.totalQuantity > 0 ? '+' : ''}${doc.totalQuantity}` : `${doc.totalQuantity} đơn vị`}</div></div>
            {doc.note && <div className="text-sm sm:col-span-4"><span className="text-slate-400">Ghi chú:</span> {doc.note}</div>}
            {doc.status === 'CANCELLED' && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-4">Đã huỷ lúc {dateTime(doc.cancelledAt!)} – {doc.cancelReason}</div>}
          </div>
          <div className="card overflow-x-auto p-0">
            <table className="table">
              <thead><tr><th>#</th><th>Sản phẩm</th><th>SKU</th>{doc.type === 'STOCKTAKE' ? <><th className="text-right">Tồn hệ thống</th><th className="text-right">Thực tế</th><th className="text-right">Chênh lệch</th></> : <th className="text-right">Số lượng</th>}<th className="text-right">{doc.type === 'IMPORT' ? 'Giá nhập' : 'Giá vốn'}</th>{doc.type === 'IMPORT' && <th>Lô / HSD</th>}<th className="text-right">Thành tiền</th></tr></thead>
              <tbody>
                {doc.items?.map((i, idx) => (
                  <tr key={i.id}>
                    <td className="text-slate-400">{idx + 1}</td>
                    <td><div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl(i.variant.image || i.variant.product.thumbnail)} alt="" className="h-9 w-9 rounded-lg object-cover" />
                      <div><div className="font-semibold text-ink">{i.variant.product.name}</div><div className="text-xs text-slate-400">{i.variant.name}</div></div>
                    </div></td>
                    <td className="font-mono text-xs">{i.variant.sku}</td>
                    {doc.type === 'STOCKTAKE' ? (
                      <><td className="text-right">{i.systemQty}</td><td className="text-right font-semibold">{i.quantity}</td><td className={`text-right font-bold ${i.quantity - (i.systemQty ?? 0) < 0 ? 'text-red-600' : 'text-brand-700'}`}>{i.quantity - (i.systemQty ?? 0) > 0 ? '+' : ''}{i.quantity - (i.systemQty ?? 0)}</td></>
                    ) : <td className="text-right font-semibold">{i.quantity} {i.variant.product.unit}</td>}
                    <td className="text-right">{money(i.unitCost)}</td>
                    {doc.type === 'IMPORT' && <td className="text-xs">{i.lotNo}{i.expiryDate && ` · HSD ${dateOnly(i.expiryDate)}`}</td>}
                    <td className="text-right font-semibold">{money(i.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
