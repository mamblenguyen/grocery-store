'use client';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, Save, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { api, imageUrl } from '@/lib/api';
import { EXPORT_REASONS, money, STOCK_DOC_TYPE } from '@/lib/format';
import type { StockDoc, Supplier } from '@/lib/types';
import { PickedVariant, VariantPicker } from './VariantPicker';

type DocType = 'IMPORT' | 'EXPORT' | 'STOCKTAKE';
interface Row { key: string; variantId: number; name: string; variantName: string; sku: string; unit?: string | null; image?: string | null; stock: number; costPrice: number | null; quantity: number; unitCost: number; lotNo: string; expiryDate: string }

const ICON = { IMPORT: ArrowDownToLine, EXPORT: ArrowUpFromLine, STOCKTAKE: ClipboardCheck };

export function StockDocForm({ type, doc, onSaved }: { type: DocType; doc?: StockDoc; onSaved?: (d: StockDoc) => void }) {
  const router = useRouter();
  const toast = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [info, setInfo] = useState({ supplierId: doc?.supplierId ? String(doc.supplierId) : '', reason: doc?.reason ?? '', invoiceNo: doc?.invoiceNo ?? '', note: doc?.note ?? '' });
  const [rows, setRows] = useState<Row[]>(
    doc?.items?.map((i) => ({
      key: String(i.id), variantId: i.variantId, name: i.variant.product.name, variantName: i.variant.name, sku: i.variant.sku,
      unit: i.variant.product.unit, image: i.variant.image || i.variant.product.thumbnail, stock: i.variant.stock, costPrice: i.variant.costPrice ?? null,
      quantity: i.quantity, unitCost: i.unitCost, lotNo: i.lotNo ?? '', expiryDate: i.expiryDate?.slice(0, 10) ?? '',
    })) ?? [],
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (type !== 'STOCKTAKE') api<Supplier[]>('/admin/suppliers').then((s) => setSuppliers(s.filter((x) => x.isActive))); }, [type]);

  const add = (v: PickedVariant) => {
    setRows((rs) => {
      const ex = rs.find((r) => r.variantId === v.id);
      if (ex) {
        // Quét lại cùng mã → cộng 1 (kiểm kê: đếm thêm 1)
        toast(`${v.product.name} – ${v.name}: ${ex.quantity + 1}`);
        return rs.map((r) => (r.variantId === v.id ? { ...r, quantity: r.quantity + 1 } : r));
      }
      return [{
        key: `${v.id}-${Date.now()}`, variantId: v.id, name: v.product.name, variantName: v.name, sku: v.sku, unit: v.product.unit,
        image: v.image || v.product.thumbnail, stock: v.stock, costPrice: v.costPrice ?? null,
        quantity: type === 'STOCKTAKE' ? 1 : 1, unitCost: v.costPrice ?? 0, lotNo: '', expiryDate: '',
      }, ...rs];
    });
  };
  const set = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const totalQty = rows.reduce((s, r) => s + r.quantity, 0);
  const totalAmount = rows.reduce((s, r) => s + (type === 'IMPORT' ? r.quantity * r.unitCost : type === 'EXPORT' ? r.quantity * (r.costPrice ?? 0) : (r.quantity - r.stock) * (r.costPrice ?? 0)), 0);
  const overStock = type === 'EXPORT' ? rows.filter((r) => r.quantity > r.stock) : [];

  const save = async (complete: boolean) => {
    if (!rows.length) return toast('Chưa có dòng hàng nào', 'error');
    if (type === 'EXPORT' && !info.reason) return toast('Vui lòng chọn lý do xuất kho', 'error');
    if (complete && !confirm(type === 'STOCKTAKE' ? 'Hoàn tất kiểm kê? Tồn kho sẽ được cập nhật bằng số lượng thực tế.' : `Hoàn tất ${STOCK_DOC_TYPE[type].label.toLowerCase()}? Tồn kho sẽ được cập nhật ngay.`)) return;
    setSaving(true);
    const payload = {
      type, complete,
      supplierId: info.supplierId ? Number(info.supplierId) : null,
      reason: type === 'EXPORT' ? info.reason : undefined, invoiceNo: info.invoiceNo || undefined, note: info.note || undefined,
      items: rows.map((r) => ({ variantId: r.variantId, quantity: r.quantity, unitCost: type === 'IMPORT' ? r.unitCost : undefined, lotNo: r.lotNo || undefined, expiryDate: r.expiryDate || undefined })),
    };
    try {
      const saved = await api<StockDoc>(doc ? `/admin/stock/documents/${doc.id}` : '/admin/stock/documents', { method: doc ? 'PUT' : 'POST', json: payload });
      toast(complete ? `Đã hoàn tất ${saved.code}` : `Đã lưu nháp ${saved.code}`);
      if (onSaved) onSaved(saved);
      else router.push(`/admin/stock/${saved.id}`);
    } catch (e: any) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  const Icon = ICON[type];
  return (
    <div className="space-y-5">
      <div className="card grid gap-4 md:grid-cols-4">
        <div className="flex items-center gap-3 md:col-span-4">
          <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${STOCK_DOC_TYPE[type].cls}`}><Icon className="h-5 w-5" /></span>
          <div><h2 className="text-lg font-bold">{doc ? `${STOCK_DOC_TYPE[type].label} ${doc.code}` : `Tạo ${STOCK_DOC_TYPE[type].label.toLowerCase()}`}</h2>
            <p className="text-sm text-slate-500">{type === 'IMPORT' ? 'Nhập hàng từ nhà cung cấp – giá vốn được tính bình quân gia quyền' : type === 'EXPORT' ? 'Xuất hàng khỏi kho không qua bán hàng' : 'Đếm thực tế và cân bằng tồn kho'}</p></div>
        </div>
        {type !== 'STOCKTAKE' && (
          <div><label className="label">Nhà cung cấp {type === 'EXPORT' && <span className="font-normal text-slate-400">(khi trả hàng)</span>}</label>
            <select className="input" value={info.supplierId} onChange={(e) => setInfo({ ...info, supplierId: e.target.value })}>
              <option value="">— Không chọn —</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></div>
        )}
        {type === 'EXPORT' && (
          <div><label className="label">Lý do xuất *</label>
            <select className="input" value={info.reason} onChange={(e) => setInfo({ ...info, reason: e.target.value })}>
              <option value="">— Chọn lý do —</option>{Object.entries(EXPORT_REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
        )}
        {type === 'IMPORT' && <div><label className="label">Số hoá đơn NCC</label><input className="input" value={info.invoiceNo} onChange={(e) => setInfo({ ...info, invoiceNo: e.target.value })} /></div>}
        <div className={type === 'STOCKTAKE' ? 'md:col-span-4' : 'md:col-span-2'}><label className="label">Ghi chú</label><input className="input" value={info.note} onChange={(e) => setInfo({ ...info, note: e.target.value })} /></div>
      </div>

      <div className="card space-y-4">
        <VariantPicker onPick={add} autoFocus />
        <p className="text-xs text-slate-400">💡 Dùng máy quét mã vạch USB, hoặc nút “Quét mã” để quét bằng camera. Quét lại cùng một mã sẽ cộng thêm 1.</p>
        <div className="-mx-5 overflow-x-auto">
          <table className="table">
            <thead><tr>
              <th>Sản phẩm</th>
              <th className="text-right">Tồn hiện tại</th>
              <th>{type === 'STOCKTAKE' ? 'SL thực tế' : 'Số lượng'}</th>
              {type === 'IMPORT' && <><th>Giá nhập</th><th>Số lô</th><th>Hạn dùng</th></>}
              {type === 'STOCKTAKE' && <th className="text-right">Chênh lệch</th>}
              <th className="text-right">{type === 'STOCKTAKE' ? 'Giá trị lệch' : 'Thành tiền'}</th><th />
            </tr></thead>
            <tbody>
              {!rows.length && <tr><td colSpan={9} className="py-10 text-center text-slate-400">Chưa có dòng hàng</td></tr>}
              {rows.map((r) => {
                const diff = r.quantity - r.stock;
                const amount = type === 'IMPORT' ? r.quantity * r.unitCost : type === 'EXPORT' ? r.quantity * (r.costPrice ?? 0) : diff * (r.costPrice ?? 0);
                return (
                  <tr key={r.key}>
                    <td><div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl(r.image)} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      <div className="min-w-0"><div className="font-semibold text-ink">{r.name}</div><div className="text-xs text-slate-400">{r.variantName} · <span className="font-mono">{r.sku}</span></div></div>
                    </div></td>
                    <td className="text-right text-slate-500">{r.stock} {r.unit}</td>
                    <td><input type="number" min={type === 'STOCKTAKE' ? 0 : 1} className={`input w-24 ${type === 'EXPORT' && r.quantity > r.stock ? 'border-red-400 text-red-600' : ''}`} value={r.quantity} onChange={(e) => set(r.key, { quantity: Math.max(0, Number(e.target.value)) })} /></td>
                    {type === 'IMPORT' && (
                      <>
                        <td><input type="number" min={0} className="input w-32" value={r.unitCost} onChange={(e) => set(r.key, { unitCost: Math.max(0, Number(e.target.value)) })} />{r.costPrice != null && <div className="mt-0.5 text-[11px] text-slate-400">Giá vốn hiện: {money(r.costPrice)}</div>}</td>
                        <td><input className="input w-24" value={r.lotNo} onChange={(e) => set(r.key, { lotNo: e.target.value })} /></td>
                        <td><input type="date" className="input w-40" value={r.expiryDate} onChange={(e) => set(r.key, { expiryDate: e.target.value })} /></td>
                      </>
                    )}
                    {type === 'STOCKTAKE' && <td className={`text-right font-bold ${diff > 0 ? 'text-brand-700' : diff < 0 ? 'text-red-600' : 'text-slate-400'}`}>{diff > 0 ? '+' : ''}{diff}</td>}
                    <td className={`text-right font-semibold ${amount < 0 ? 'text-red-600' : 'text-ink'}`}>{money(amount)}</td>
                    <td><button className="p-1 text-slate-300 hover:text-red-500" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {overStock.length > 0 && <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><AlertTriangle className="h-4 w-4" /> {overStock.length} dòng xuất vượt tồn kho – không thể hoàn tất.</div>}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
          <div className="text-sm text-slate-500">
            {rows.length} mặt hàng · {type === 'STOCKTAKE' ? <>Chênh lệch: <b className="text-ink">{rows.reduce((s, r) => s + r.quantity - r.stock, 0)}</b></> : <>Tổng SL: <b className="text-ink">{totalQty}</b></>}
            {' · '}{type === 'STOCKTAKE' ? 'Giá trị lệch' : type === 'EXPORT' ? 'Giá vốn xuất (ước tính)' : 'Tổng tiền hàng'}: <b className="text-lg text-ink">{money(totalAmount)}</b>
          </div>
          <div className="flex gap-2">
            <button className="btn-outline" disabled={saving} onClick={() => save(false)}><Save className="h-4 w-4" /> Lưu nháp</button>
            <button className="btn-primary" disabled={saving || overStock.length > 0} onClick={() => save(true)}>Hoàn tất & cập nhật kho</button>
          </div>
        </div>
      </div>
    </div>
  );
}
