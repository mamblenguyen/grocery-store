'use client';
import { ExternalLink, FileCheck2, ReceiptText } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import { dateTime } from '@/lib/format';
import type { EInvoice, EInvoiceRequest, Order } from '@/lib/types';

export const EMPTY_EINVOICE: EInvoiceRequest = { buyerType: 'CA_NHAN', buyerName: '', buyerCompany: '', buyerTaxCode: '', buyerIdNumber: '', buyerAddress: '', buyerEmail: '' };
export const EINVOICE_STATUS: Record<string, { label: string; cls: string }> = {
  REQUESTED: { label: 'Chờ phát hành', cls: 'bg-amber-100 text-amber-800' },
  ISSUED: { label: 'Đã phát hành', cls: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Đã huỷ', cls: 'bg-slate-200 text-slate-700' },
};

/** Bỏ trường rỗng trước khi gửi API */
export const cleanEInvoice = (v: EInvoiceRequest): EInvoiceRequest =>
  Object.fromEntries(Object.entries(v).filter(([, x]) => x !== '' && x != null)) as unknown as EInvoiceRequest;

/** Ô nhập thông tin người mua trên hoá đơn điện tử */
export function EInvoiceFields({ value, onChange }: { value: EInvoiceRequest; onChange: (v: EInvoiceRequest) => void }) {
  const up = (p: Partial<EInvoiceRequest>) => onChange({ ...value, ...p });
  const org = value.buyerType === 'TO_CHUC';
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {([['CA_NHAN', 'Cá nhân'], ['TO_CHUC', 'Công ty / tổ chức']] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => up({ buyerType: k })} className={`chip ${value.buyerType === k ? 'chip-active' : ''}`}>{l}</button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">{org ? 'Người mua hàng (họ tên)' : 'Họ tên người mua'} *</label><input className="input" value={value.buyerName} onChange={(e) => up({ buyerName: e.target.value })} /></div>
        {org && <div><label className="label">Tên đơn vị *</label><input className="input" value={value.buyerCompany ?? ''} onChange={(e) => up({ buyerCompany: e.target.value })} /></div>}
        <div><label className="label">Mã số thuế {org ? '*' : '(nếu có)'}</label><input className="input font-mono" inputMode="numeric" placeholder={org ? '0101234567' : 'MST cá nhân = số định danh 12 số'} value={value.buyerTaxCode ?? ''} onChange={(e) => up({ buyerTaxCode: e.target.value.trim() })} /></div>
        {!org && <div><label className="label">Số định danh cá nhân / CCCD (nếu muốn ghi)</label><input className="input font-mono" inputMode="numeric" maxLength={12} value={value.buyerIdNumber ?? ''} onChange={(e) => up({ buyerIdNumber: e.target.value.replace(/\D/g, '') })} /></div>}
        <div className={org ? 'sm:col-span-2' : ''}><label className="label">Địa chỉ {org ? '(theo đăng ký thuế) *' : ''}</label><input className="input" value={value.buyerAddress ?? ''} onChange={(e) => up({ buyerAddress: e.target.value })} /></div>
        <div><label className="label">Email nhận hoá đơn</label><input className="input" type="email" value={value.buyerEmail ?? ''} onChange={(e) => up({ buyerEmail: e.target.value })} /></div>
      </div>
      <p className="text-xs text-slate-400">Thông tin được ghi trên hoá đơn điện tử do cửa hàng phát hành và gửi cơ quan thuế. Vui lòng nhập chính xác – hoá đơn đã phát hành chỉ điều chỉnh / thay thế được theo thủ tục luật định.</p>
    </div>
  );
}

/** Thông tin hoá đơn đã phát hành / đang chờ */
export function EInvoiceSummary({ e }: { e: EInvoice }) {
  const st = EINVOICE_STATUS[e.status];
  return (
    <div className="space-y-1.5 text-sm">
      <div className="flex items-center justify-between gap-2"><span className={`badge ${st.cls}`}>{st.label}</span>{e.issuedAt && <span className="text-xs text-slate-400">{dateTime(e.issuedAt)}</span>}</div>
      <div><span className="text-slate-500">Người mua:</span> <b>{e.buyerCompany || e.buyerName}</b>{e.buyerCompany && ` (${e.buyerName})`}</div>
      {e.buyerTaxCode && <div><span className="text-slate-500">MST:</span> <span className="font-mono">{e.buyerTaxCode}</span></div>}
      {e.buyerAddress && <div className="text-slate-600">{e.buyerAddress}</div>}
      {e.buyerEmail && <div className="text-slate-600">{e.buyerEmail}</div>}
      {e.status === 'ISSUED' && (
        <div className="mt-2 space-y-1 rounded-xl bg-emerald-50 p-3 text-emerald-900">
          <div>Mẫu số <b>{e.templateCode}</b> · Ký hiệu <b className="font-mono">{e.series}</b> · Số <b className="font-mono">{e.number}</b></div>
          {e.taxAuthorityCode && <div className="break-all">Mã CQT: <span className="font-mono">{e.taxAuthorityCode}</span></div>}
          {e.lookupCode && <div>Mã tra cứu: <b className="font-mono">{e.lookupCode}</b></div>}
          {e.provider && <div className="text-xs">Phát hành qua: {e.provider}</div>}
          {e.lookupUrl && <a href={e.lookupUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-emerald-700 underline">Tra cứu hoá đơn <ExternalLink className="h-3.5 w-3.5" /></a>}
        </div>
      )}
      {e.note && <div className="text-xs text-slate-500">Ghi chú: {e.note}</div>}
    </div>
  );
}

/** Khách xem / yêu cầu xuất hoá đơn cho đơn của mình */
export function CustomerEInvoiceCard({ order, enabled, onChange }: { order: Order; enabled: boolean; onChange: (o: Order) => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<EInvoiceRequest>({ ...EMPTY_EINVOICE, buyerName: order.customerName });
  const [busy, setBusy] = useState(false);
  const e = order.einvoice;
  const canRequest = enabled && order.status !== 'CANCELLED' && (!e || e.status === 'CANCELLED');
  if (!e && !canRequest) return null;
  const submit = async () => {
    setBusy(true);
    try { onChange(await api<Order>(`/orders/my/${order.id}/einvoice`, { method: 'POST', json: cleanEInvoice(v) })); setOpen(false); toast('Đã gửi yêu cầu xuất hoá đơn'); }
    catch (err: any) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <div className="card">
      <h3 className="mb-3 flex items-center gap-2 font-bold text-ink"><ReceiptText className="h-4 w-4 text-brand-600" /> Hoá đơn điện tử</h3>
      {e && e.status !== 'CANCELLED' && <EInvoiceSummary e={e} />}
      {canRequest && !open && <button className="btn-outline btn-sm" onClick={() => setOpen(true)}>Yêu cầu xuất hoá đơn</button>}
      {open && (
        <div className="space-y-3">
          <EInvoiceFields value={v} onChange={setV} />
          <div className="flex justify-end gap-2"><button className="btn-ghost btn-sm" onClick={() => setOpen(false)}>Đóng</button><button className="btn-primary btn-sm" disabled={busy} onClick={submit}>{busy ? 'Đang gửi…' : 'Gửi yêu cầu'}</button></div>
        </div>
      )}
    </div>
  );
}

/** Cửa hàng ghi nhận hoá đơn đã phát hành trên phần mềm HĐĐT / tạo yêu cầu tại quầy / huỷ */
export function AdminEInvoicePanel({ order, onChange }: { order: Order; onChange: (o: Order) => void }) {
  const toast = useToast();
  const e = order.einvoice;
  const [mode, setMode] = useState<'' | 'buyer' | 'issue' | 'cancel'>('');
  const [buyer, setBuyer] = useState<EInvoiceRequest>({ ...EMPTY_EINVOICE, buyerName: order.customerName });
  const [f, setF] = useState({ series: '', number: '', taxAuthorityCode: '', lookupCode: '', lookupUrl: '', issuedAt: '', note: '' });
  const [busy, setBusy] = useState(false);
  const save = async (body: Record<string, unknown>, msg: string) => {
    setBusy(true);
    try { onChange(await api<Order>(`/admin/orders/${order.id}/einvoice`, { method: 'PUT', json: body })); setMode(''); toast(msg); }
    catch (err: any) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  const clean = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).filter(([, x]) => x));

  return (
    <div className="card">
      <h3 className="mb-3 flex items-center gap-2 font-bold text-ink"><FileCheck2 className="h-4 w-4 text-brand-600" /> Hoá đơn điện tử</h3>
      {e ? <EInvoiceSummary e={e} /> : <p className="text-sm text-slate-500">Khách chưa yêu cầu xuất hoá đơn.</p>}
      {order.status !== 'CANCELLED' && !mode && (
        <div className="mt-3 flex flex-wrap gap-2">
          {(!e || e.status === 'CANCELLED') && <button className="btn-outline btn-sm" onClick={() => setMode('buyer')}>Nhập thông tin người mua</button>}
          {e && e.status !== 'CANCELLED' && <button className="btn-primary btn-sm" onClick={() => { setF({ ...f, series: e.series ?? '', number: e.number ?? '', taxAuthorityCode: e.taxAuthorityCode ?? '', lookupCode: e.lookupCode ?? '', lookupUrl: e.lookupUrl ?? '' }); setMode('issue'); }}>{e.status === 'ISSUED' ? 'Sửa thông tin hoá đơn' : 'Ghi nhận đã phát hành'}</button>}
          {e && e.status !== 'CANCELLED' && <button className="btn-ghost btn-sm text-red-600" onClick={() => setMode('cancel')}>Huỷ / thay thế</button>}
        </div>
      )}
      {mode === 'buyer' && (
        <div className="mt-3 space-y-3">
          <EInvoiceFields value={buyer} onChange={setBuyer} />
          <div className="flex justify-end gap-2"><button className="btn-ghost btn-sm" onClick={() => setMode('')}>Đóng</button><button className="btn-primary btn-sm" disabled={busy} onClick={() => save({ ...cleanEInvoice(buyer), status: 'REQUESTED' }, 'Đã lưu yêu cầu xuất hoá đơn')}>Lưu</button></div>
        </div>
      )}
      {mode === 'issue' && (
        <div className="mt-3 space-y-3">
          <p className="rounded-xl bg-sky-50 p-3 text-xs text-sky-900">Lập & ký hoá đơn trên phần mềm của nhà cung cấp HĐĐT (đúng thông tin người mua và hàng hoá của đơn), sau đó nhập số hoá đơn tại đây để khách tra cứu. Nền tảng không gửi dữ liệu tới cơ quan thuế.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Ký hiệu *</label><input className="input font-mono uppercase" maxLength={6} placeholder="C26MAA" value={f.series} onChange={(x) => setF({ ...f, series: x.target.value.toUpperCase() })} /></div>
            <div><label className="label">Số hoá đơn *</label><input className="input font-mono" inputMode="numeric" maxLength={8} value={f.number} onChange={(x) => setF({ ...f, number: x.target.value.replace(/\D/g, '') })} /></div>
            <div className="sm:col-span-2"><label className="label">Mã của cơ quan thuế {f.series.startsWith('C') && '*'}</label><input className="input font-mono" value={f.taxAuthorityCode} onChange={(x) => setF({ ...f, taxAuthorityCode: x.target.value })} /></div>
            <div><label className="label">Mã tra cứu</label><input className="input font-mono" value={f.lookupCode} onChange={(x) => setF({ ...f, lookupCode: x.target.value })} /></div>
            <div><label className="label">Ngày lập</label><input className="input" type="datetime-local" value={f.issuedAt} onChange={(x) => setF({ ...f, issuedAt: x.target.value })} /></div>
            <div className="sm:col-span-2"><label className="label">Link tra cứu (bỏ trống = theo cài đặt)</label><input className="input" value={f.lookupUrl} onChange={(x) => setF({ ...f, lookupUrl: x.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2"><button className="btn-ghost btn-sm" onClick={() => setMode('')}>Đóng</button>
            <button className="btn-primary btn-sm" disabled={busy} onClick={() => save({ status: 'ISSUED', ...clean({ ...f, note: '', issuedAt: f.issuedAt ? new Date(f.issuedAt).toISOString() : '' }) }, 'Đã ghi nhận hoá đơn')}>Lưu</button></div>
        </div>
      )}
      {mode === 'cancel' && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-slate-500">Hoá đơn đã gửi cơ quan thuế phải được điều chỉnh / thay thế trên phần mềm HĐĐT theo Điều 19 NĐ 123/2020 (sửa đổi bởi NĐ 70/2025). Ở đây chỉ ghi nhận trạng thái và lý do.</p>
          <textarea className="input" rows={2} placeholder="Lý do (vd. khách huỷ yêu cầu; đã lập hoá đơn thay thế số …)" value={f.note} onChange={(x) => setF({ ...f, note: x.target.value })} />
          <div className="flex justify-end gap-2"><button className="btn-ghost btn-sm" onClick={() => setMode('')}>Đóng</button><button className="btn-primary btn-sm bg-red-600" disabled={busy} onClick={() => save({ status: 'CANCELLED', note: f.note }, 'Đã cập nhật')}>Xác nhận</button></div>
        </div>
      )}
    </div>
  );
}
