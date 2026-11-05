'use client';
import { useParams, useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import { Suspense, useEffect, useState } from 'react';
import { PrintShell } from '@/components/PrintShell';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useSettings } from '@/context/settings';
import { api, imageUrl } from '@/lib/api';
import { dateOnly, num, PAYMENT_METHOD, vietQrUrl } from '@/lib/format';
import { numberToVietnameseWords } from '@/lib/number-to-words';
import type { Order, StoreSettings } from '@/lib/types';

const PAY_STATUS: Record<string, string> = { PAID: 'ĐÃ THANH TOÁN', UNPAID: 'CHƯA THANH TOÁN', REFUNDED: 'ĐÃ HOÀN TIỀN' };
const fmtDate = (d: string) => { const x = new Date(d); return `Ngày ${String(x.getDate()).padStart(2, '0')} tháng ${String(x.getMonth() + 1).padStart(2, '0')} năm ${x.getFullYear()}`; };
const fmtDT = (d: string) => new Date(d).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

/** Tách VAT từ giá đã gồm thuế */
function vatSplit(total: number, rate: number) {
  if (!rate) return null;
  const pre = Math.round((total * 100) / (100 + rate));
  return { pre, vat: total - pre };
}

function A4({ o, s, qr }: { o: Order; s: StoreSettings; qr: string }) {
  const vat = vatSplit(o.total, s.vatRate);
  const unpaidTransfer = o.paymentStatus === 'UNPAID' && o.paymentMethod === 'BANK_TRANSFER' && o.status !== 'CANCELLED' && s.bank.accountNo;
  return (
    <div className="p-[14mm] text-[12.5px] leading-relaxed">
      <div className="flex items-start justify-between gap-6 border-b-2 border-black pb-4">
        <div className="flex gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {s.logo && <img src={imageUrl(s.logo)} alt="" className="h-16 w-auto" />}
          <div>
            <div className="text-lg font-extrabold uppercase">{s.storeName}</div>
            {s.address && <div>Địa chỉ: {s.address}</div>}
            <div>{s.hotline && `Điện thoại: ${s.hotline}`}{s.email && ` · Email: ${s.email}`}</div>
            {s.taxCode && <div>Mã số thuế: <b>{s.taxCode}</b></div>}
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {qr && <img src={qr} alt="QR" className="h-24 w-24" />}
      </div>

      <div className="my-5 text-center">
        <div className="text-2xl font-extrabold tracking-wide">HOÁ ĐƠN BÁN HÀNG</div>
        <div className="italic">{fmtDate(o.createdAt)}</div>
        <div>Số: <b>{o.code}</b></div>
      </div>

      <table className="mb-4 w-full"><tbody>
        <tr><td className="w-40 py-0.5">Khách hàng:</td><td className="font-semibold">{o.customerName}</td><td className="w-28">Điện thoại:</td><td>{o.phone || '—'}</td></tr>
        <tr><td className="py-0.5">Địa chỉ:</td><td colSpan={3}>{o.address}</td></tr>
        <tr><td className="py-0.5">Hình thức thanh toán:</td><td>{PAYMENT_METHOD[o.paymentMethod]?.split(' (')[0]}</td><td>Trạng thái:</td><td className="font-bold">{PAY_STATUS[o.paymentStatus]}</td></tr>
        {o.deliveryDate && <tr><td className="py-0.5">Giao hàng:</td><td colSpan={3}>{dateOnly(o.deliveryDate)} · {o.deliverySlot}</td></tr>}
      </tbody></table>

      <table className="w-full border-collapse [&_td]:border [&_td]:border-black [&_td]:px-2 [&_td]:py-1.5 [&_th]:border [&_th]:border-black [&_th]:px-2 [&_th]:py-1.5">
        <thead className="bg-slate-100 print:bg-slate-100">
          <tr><th className="w-10">STT</th><th className="text-left">Tên hàng hoá</th><th className="w-24">Mã hàng</th><th className="w-14">SL</th><th className="w-28 text-right">Đơn giá</th><th className="w-32 text-right">Thành tiền</th></tr>
        </thead>
        <tbody>
          {o.items?.map((i, idx) => (
            <tr key={i.id}>
              <td className="text-center">{idx + 1}</td>
              <td>{i.productName}<div className="text-[11px] text-slate-600">{i.variantName}</div></td>
              <td className="text-center font-mono text-[11px]">{i.sku}</td>
              <td className="text-center">{i.quantity}</td>
              <td className="text-right">{num(i.price)}</td>
              <td className="text-right">{num(i.total)}</td>
            </tr>
          ))}
          <tr><td colSpan={5} className="text-right">Cộng tiền hàng</td><td className="text-right">{num(o.subtotal)}</td></tr>
          {o.discount > 0 && <tr><td colSpan={5} className="text-right">Chiết khấu / giảm giá {o.couponCode && `(${o.couponCode})`}</td><td className="text-right">-{num(o.discount)}</td></tr>}
          {o.shippingFee > 0 && <tr><td colSpan={5} className="text-right">Phí vận chuyển</td><td className="text-right">{num(o.shippingFee)}</td></tr>}
          <tr className="font-bold"><td colSpan={5} className="text-right text-[14px]">TỔNG TIỀN THANH TOÁN</td><td className="text-right text-[14px]">{num(o.total)}</td></tr>
          {vat && (
            <>
              <tr className="text-[11.5px]"><td colSpan={5} className="text-right italic">Trong đó: Tiền hàng chưa thuế GTGT</td><td className="text-right">{num(vat.pre)}</td></tr>
              <tr className="text-[11.5px]"><td colSpan={5} className="text-right italic">Thuế GTGT ({s.vatRate}%)</td><td className="text-right">{num(vat.vat)}</td></tr>
            </>
          )}
        </tbody>
      </table>
      <p className="mt-2">Số tiền viết bằng chữ: <b className="italic">{numberToVietnameseWords(o.total)}.</b></p>
      {o.paymentMethod === 'CASH' && o.cashReceived != null && <p>Khách đưa: {num(o.cashReceived)}đ · Tiền thối: {num(o.cashReceived - o.total)}đ</p>}
      {o.note && <p>Ghi chú: {o.note}</p>}

      {unpaidTransfer && (
        <div className="mt-4 flex items-center gap-4 border border-dashed border-black p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={vietQrUrl(s.bank, o.total, o.code)} alt="" className="h-28 w-28" />
          <div>Chuyển khoản tới <b>{s.bank.bankName}</b> – STK <b>{s.bank.accountNo}</b> – {s.bank.accountName}<br />Nội dung: <b>{o.code}</b> · Số tiền: <b>{num(o.total)}đ</b></div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 text-center">
        <div><b>NGƯỜI MUA HÀNG</b><div className="italic">(Ký, ghi rõ họ tên)</div><div className="h-20" />{o.customerName !== 'Khách lẻ' && o.customerName}</div>
        <div><b>NGƯỜI BÁN HÀNG</b><div className="italic">(Ký, ghi rõ họ tên)</div><div className="h-20" />{o.createdBy?.fullName}</div>
      </div>
      {s.invoiceFooter && <p className="mt-6 border-t border-black pt-2 text-center text-[11.5px] italic">{s.invoiceFooter}</p>}
      <p className="mt-1 text-center text-[10px] text-slate-500">Hoá đơn bán lẻ (không thay thế hoá đơn GTGT điện tử). In lúc {fmtDT(new Date().toISOString())}</p>
    </div>
  );
}

function K80({ o, s, qr }: { o: Order; s: StoreSettings; qr: string }) {
  const vat = vatSplit(o.total, s.vatRate);
  const line = <div className="my-1.5 border-t border-dashed border-black" />;
  return (
    <div className="px-[3mm] py-[4mm] font-mono text-[11.5px] leading-snug">
      <div className="text-center">
        <div className="text-[15px] font-extrabold uppercase">{s.storeName}</div>
        {s.address && <div>{s.address}</div>}
        {s.hotline && <div>ĐT: {s.hotline}</div>}
        {s.taxCode && <div>MST: {s.taxCode}</div>}
      </div>
      {line}
      <div className="text-center text-[13px] font-bold">HOÁ ĐƠN BÁN LẺ</div>
      <div className="flex justify-between"><span>Số: {o.code}</span></div>
      <div>{fmtDT(o.createdAt)}</div>
      {o.createdBy && <div>Thu ngân: {o.createdBy.fullName}</div>}
      <div>KH: {o.customerName}{o.phone && ` - ${o.phone}`}</div>
      {line}
      {o.items?.map((i) => (
        <div key={i.id} className="mb-1">
          <div>{i.productName} {i.variantName !== 'Mặc định' && `(${i.variantName})`}</div>
          <div className="flex justify-between"><span>{i.quantity} x {num(i.price)}</span><span>{num(i.total)}</span></div>
        </div>
      ))}
      {line}
      <div className="flex justify-between"><span>Tiền hàng</span><span>{num(o.subtotal)}</span></div>
      {o.discount > 0 && <div className="flex justify-between"><span>Giảm giá</span><span>-{num(o.discount)}</span></div>}
      {o.shippingFee > 0 && <div className="flex justify-between"><span>Phí ship</span><span>{num(o.shippingFee)}</span></div>}
      <div className="flex justify-between text-[14px] font-extrabold"><span>TỔNG CỘNG</span><span>{num(o.total)}</span></div>
      {vat && <div className="flex justify-between text-[10.5px]"><span>(Đã gồm VAT {s.vatRate}%)</span><span>{num(vat.vat)}</span></div>}
      {o.paymentMethod === 'CASH' && o.cashReceived != null && (
        <>
          <div className="flex justify-between"><span>Khách đưa</span><span>{num(o.cashReceived)}</span></div>
          <div className="flex justify-between font-bold"><span>Tiền thối</span><span>{num(o.cashReceived - o.total)}</span></div>
        </>
      )}
      <div>TT: {PAYMENT_METHOD[o.paymentMethod]?.split(' (')[0]} – {PAY_STATUS[o.paymentStatus]}</div>
      {line}
      <div className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {qr && <img src={qr} alt="" className="mx-auto h-20 w-20" />}
        <div className="mt-1 text-[10.5px]">{s.invoiceFooter || 'Cảm ơn quý khách!'}</div>
      </div>
    </div>
  );
}

function Inner() {
  const { id } = useParams<{ id: string }>();
  const k80 = useSearchParams().get('format') === 'k80';
  const { user, loading, isStaff } = useAuth();
  const ctx = useSettings();
  const [own, setOwn] = useState<StoreSettings | null>(null);
  const [o, setO] = useState<Order | null>(null);
  const [qr, setQr] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) { setError('Vui lòng đăng nhập để xem hoá đơn'); return; }
    api<Order>(isStaff ? `/admin/orders/${id}` : `/orders/my/${id}`).then(async (order) => {
      setO(order);
      // Khách in hoá đơn: lấy thông tin của cửa hàng đã bán đơn này
      if (!isStaff && order.store) setOwn(await api<StoreSettings>('/settings', { headers: { 'X-Store': order.store.slug } }));
      setQr(await QRCode.toDataURL(order.code, { margin: 0, width: 200 }));
    }).catch((e) => setError(e.message));
  }, [id, user, loading, isStaff]);

  if (error) return <div className="p-10 text-center">{error}</div>;
  const settings = isStaff ? ctx.settings : own;
  if (!o || !settings || (isStaff && !ctx.loaded)) return <Spinner />;
  return (
    <PrintShell ready={!!qr} width={k80 ? '80mm' : '210mm'} page={k80 ? 'size: 80mm auto; margin: 0;' : 'size: A4; margin: 0;'}>
      {k80 ? <K80 o={o} s={settings} qr={qr} /> : <A4 o={o} s={settings} qr={qr} />}
    </PrintShell>
  );
}

export default function InvoicePrintPage() {
  return <Suspense fallback={<Spinner />}><Inner /></Suspense>;
}
