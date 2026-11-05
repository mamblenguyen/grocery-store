'use client';
import { Printer, QrCode, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PickedVariant, VariantPicker } from '@/components/admin/VariantPicker';
import { Empty } from '@/components/ui';
import { money } from '@/lib/format';

/** Chọn sản phẩm & số lượng tem → mở trang in tem QR */
export default function LabelsPage() {
  const [rows, setRows] = useState<{ v: PickedVariant; qty: number }[]>([]);
  const [opts, setOpts] = useState({ size: 'm', code: 'sku', price: true });
  const add = (v: PickedVariant) => setRows((rs) => (rs.some((r) => r.v.id === v.id) ? rs.map((r) => (r.v.id === v.id ? { ...r, qty: r.qty + 1 } : r)) : [...rs, { v, qty: 1 }]));
  const url = `/print/labels?items=${rows.map((r) => `${r.v.id}x${r.qty}`).join(',')}&size=${opts.size}&code=${opts.code}&price=${opts.price ? 1 : 0}`;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="card space-y-4">
        <div>
          <h2 className="font-bold text-ink">Chọn sản phẩm cần in tem</h2>
          <p className="text-sm text-slate-500">Tem có mã QR chứa SKU / mã vạch – quét lại được ở POS và phiếu kho.</p>
        </div>
        <VariantPicker onPick={add} showPrice="price" />
        {!rows.length ? <Empty icon={<QrCode className="h-7 w-7" />} text="Chưa chọn sản phẩm" /> : (
          <table className="table">
            <thead><tr><th>Sản phẩm</th><th>SKU / Mã vạch</th><th>Giá</th><th>Số tem</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.v.id}>
                  <td><div className="font-semibold text-ink">{r.v.product.name}</div><div className="text-xs text-slate-400">{r.v.name}</div></td>
                  <td className="font-mono text-xs">{r.v.sku}<div className="text-slate-400">{r.v.barcode ?? '—'}</div></td>
                  <td>{money(r.v.price)}</td>
                  <td><input type="number" min={1} max={500} className="input w-24" value={r.qty} onChange={(e) => setRows((rs) => rs.map((x) => (x.v.id === r.v.id ? { ...x, qty: Math.max(1, Number(e.target.value)) } : x)))} /></td>
                  <td><button className="p-1 text-slate-300 hover:text-red-500" onClick={() => setRows((rs) => rs.filter((x) => x.v.id !== r.v.id))}><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="card h-fit space-y-4">
        <h3 className="font-bold text-ink">Tuỳ chọn in</h3>
        <div><label className="label">Kích thước tem</label>
          <select className="input" value={opts.size} onChange={(e) => setOpts({ ...opts, size: e.target.value })}>
            <option value="s">Nhỏ 40×30mm (giấy decal tem)</option><option value="m">Vừa 50×40mm</option><option value="l">Lớn – lưới A4 (3 cột)</option>
          </select></div>
        <div><label className="label">Nội dung mã QR</label>
          <select className="input" value={opts.code} onChange={(e) => setOpts({ ...opts, code: e.target.value })}>
            <option value="sku">SKU (khuyên dùng)</option><option value="barcode">Mã vạch EAN (nếu có)</option>
          </select></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={opts.price} onChange={(e) => setOpts({ ...opts, price: e.target.checked })} /> In giá bán trên tem</label>
        <div className="rounded-xl bg-slate-50 p-3 text-sm">Tổng: <b>{rows.reduce((s, r) => s + r.qty, 0)}</b> tem</div>
        <a href={rows.length ? url : undefined} target="_blank" className={`btn-primary w-full ${rows.length ? '' : 'pointer-events-none opacity-50'}`}><Printer className="h-4 w-4" /> Xem & in tem</a>
      </div>
    </div>
  );
}
