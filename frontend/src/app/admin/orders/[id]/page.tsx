'use client';
import { ArrowLeft, CalendarDays, CircleDollarSign, CreditCard, MapPin, Phone, Printer, StickyNote, User } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { DeliveryTracker } from '@/components/DeliveryTracker';
import { OrderTimeline } from '@/components/OrderTimeline';
import { useToast } from '@/components/Toast';
import { PaymentBadge, Spinner, StatusBadge } from '@/components/ui';
import { api, imageUrl } from '@/lib/api';
import { dateOnly, dateTime, money, ORDER_STATUS, PAYMENT_METHOD } from '@/lib/format';
import type { Order } from '@/lib/types';

const NEXT: Record<string, string[]> = { PENDING: ['CONFIRMED', 'CANCELLED'], CONFIRMED: ['SHIPPING', 'CANCELLED'], SHIPPING: ['COMPLETED', 'CANCELLED'], COMPLETED: [], CANCELLED: [] };
const TXN: Record<string, string> = { PENDING: 'bg-amber-100 text-amber-800', SUCCESS: 'bg-emerald-100 text-emerald-800', FAILED: 'bg-red-100 text-red-700' };

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [o, setO] = useState<Order | null>(null);
  const load = useCallback(() => api<Order>(`/admin/orders/${id}`).then(setO), [id]);
  useEffect(() => { load(); }, [load]);
  // Đang giao → cập nhật vị trí tài xế mỗi 15 giây
  const liveDelivery = o?.delivery && ['WAITING', 'ASSIGNED', 'PICKED_UP'].includes(o.delivery.status);
  useEffect(() => { if (!liveDelivery) return; const t = setInterval(load, 15000); return () => clearInterval(t); }, [liveDelivery, load]);
  const delivery = async (action: 'request' | 'cancel') => {
    if (action === 'cancel' && !confirm('Huỷ gọi tài xế cho đơn này?')) return;
    try { setO(await api<Order>(`/admin/orders/${id}/delivery/${action}`, { method: 'POST' })); toast(action === 'request' ? 'Đã gọi tài xế' : 'Đã huỷ gọi tài xế'); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  const changeStatus = async (status: string) => {
    let cancelReason: string | undefined;
    if (status === 'CANCELLED') { const r = prompt('Lý do huỷ đơn (hàng sẽ được hoàn lại kho):'); if (r === null) return; cancelReason = r; }
    else if (!confirm(`Chuyển đơn sang "${ORDER_STATUS[status].label}"?`)) return;
    try { setO(await api<Order>(`/admin/orders/${id}/status`, { method: 'PATCH', json: { status, cancelReason } })); toast('Đã cập nhật trạng thái'); }
    catch (e: any) { toast(e.message, 'error'); }
  };
  const markPaid = async () => {
    if (!confirm(`Xác nhận đã nhận đủ ${money(o!.total)}?`)) return;
    try { setO(await api<Order>(`/admin/orders/${id}/payment`, { method: 'PATCH', json: { paymentStatus: 'PAID' } })); toast('Đã ghi nhận thanh toán'); }
    catch (e: any) { toast(e.message, 'error'); }
  };
  if (!o) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders" className="btn-icon btn-ghost"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold">{o.code} <span className={`badge ${o.channel === 'POS' ? 'bg-violet-100 text-violet-800' : 'bg-sky-100 text-sky-800'}`}>{o.channel === 'POS' ? 'Tại quầy' : 'Online'}</span></h1>
            <div className="text-sm text-slate-400">Tạo {dateTime(o.createdAt)}{o.createdBy && ` bởi ${o.createdBy.fullName}`}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {NEXT[o.status].map((s) => <button key={s} className={s === 'CANCELLED' ? 'btn-outline text-red-600' : 'btn-primary'} onClick={() => changeStatus(s)}>{s === 'CANCELLED' ? 'Huỷ đơn' : `→ ${ORDER_STATUS[s].label}`}</button>)}
          <a href={`/print/invoice/${o.id}`} target="_blank" className="btn-outline"><Printer className="h-4 w-4" /> Hoá đơn A4</a>
          <a href={`/print/invoice/${o.id}?format=k80`} target="_blank" className="btn-outline"><Printer className="h-4 w-4" /> Bill K80</a>
        </div>
      </div>
      <div className="card"><OrderTimeline status={o.status} />{o.cancelReason && <p className="mt-4 text-center text-sm text-slate-500">Lý do huỷ: {o.cancelReason}</p>}</div>
      {o.delivery ? (
        <DeliveryTracker d={o.delivery} staff onRefresh={load} onRequest={() => delivery('request')} onCancel={() => delivery('cancel')} />
      ) : o.channel === 'ONLINE' && ['CONFIRMED', 'SHIPPING'].includes(o.status) ? (
        <div className="card flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-slate-600">Đơn chưa có tài xế giao hàng của sàn.</span>
          <button className="btn-primary btn-sm" onClick={() => delivery('request')}>🛵 Gọi tài xế</button>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="card p-0 xl:col-span-2">
          <div className="p-5 pb-2 font-bold text-ink">Sản phẩm ({o.items?.length})</div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Sản phẩm</th><th>SKU</th><th className="text-right">Đơn giá</th><th className="text-right">SL</th><th className="text-right">Thành tiền</th></tr></thead>
              <tbody>
                {o.items?.map((i) => (
                  <tr key={i.id}>
                    <td><div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl(i.image)} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      <div><div className="font-semibold text-ink">{i.productName}</div><div className="text-xs text-slate-400">{i.variantName}</div></div>
                    </div></td>
                    <td className="font-mono text-xs">{i.sku}</td><td className="text-right">{money(i.price)}</td><td className="text-right">{i.quantity}</td>
                    <td className="text-right font-semibold">{money(i.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ml-auto max-w-sm space-y-1.5 p-5 text-sm">
            <div className="flex justify-between"><span>Tạm tính</span><span>{money(o.subtotal)}</span></div>
            {o.discount > 0 && <div className="flex justify-between text-red-600"><span>Giảm giá {o.couponCode && `(${o.couponCode})`}</span><span>-{money(o.discount)}</span></div>}
            <div className="flex justify-between"><span>Phí giao hàng</span><span>{money(o.shippingFee)}</span></div>
            <div className="flex justify-between border-t border-slate-100 pt-2 text-lg font-bold"><span>Tổng cộng</span><span className="text-brand-700">{money(o.total)}</span></div>
            {o.cashReceived != null && <div className="flex justify-between text-slate-500"><span>Khách đưa / thối lại</span><span>{money(o.cashReceived)} / {money(o.cashReceived - o.total)}</span></div>}
          </div>
        </div>

        <div className="space-y-5">
          <div className="card space-y-2 text-sm">
            <h3 className="font-bold text-ink">Khách hàng</h3>
            <p className="flex gap-2"><User className="h-4 w-4 text-slate-400" /> {o.customerName}{o.user && <span className="text-slate-400">({o.user.email})</span>}</p>
            {o.phone && <p className="flex gap-2"><Phone className="h-4 w-4 text-slate-400" /><a href={`tel:${o.phone}`} className="link">{o.phone}</a></p>}
            <p className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-slate-400" /> {o.address}</p>
            {o.deliveryDate && <p className="flex gap-2"><CalendarDays className="h-4 w-4 text-slate-400" /> Giao {dateOnly(o.deliveryDate)} · {o.deliverySlot}</p>}
            {o.note && <p className="flex gap-2 rounded-lg bg-amber-50 p-2 text-amber-900"><StickyNote className="h-4 w-4 shrink-0" /> {o.note}</p>}
          </div>
          <div className="card space-y-3 text-sm">
            <h3 className="flex items-center justify-between font-bold text-ink">Thanh toán <PaymentBadge status={o.paymentStatus} /></h3>
            <p className="flex gap-2"><CreditCard className="h-4 w-4 text-slate-400" />{PAYMENT_METHOD[o.paymentMethod]}</p>
            {o.paidAt && <p className="text-slate-500">Thanh toán lúc {dateTime(o.paidAt)}</p>}
            {o.paymentStatus === 'UNPAID' && o.status !== 'CANCELLED' && <button className="btn-primary w-full" onClick={markPaid}><CircleDollarSign className="h-4 w-4" /> Xác nhận đã nhận tiền</button>}
            {!!o.payments?.length && (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="text-xs font-semibold text-slate-400 uppercase">Lịch sử giao dịch</div>
                {o.payments.map((p) => (
                  <div key={p.id} className="rounded-lg bg-slate-50 p-2.5 text-xs">
                    <div className="flex justify-between"><b>{p.provider}</b><span className={`badge ${TXN[p.status]}`}>{p.status}</span></div>
                    <div className="mt-1 font-mono text-slate-500">{p.txnRef}{p.transactionNo && ` · GD ${p.transactionNo}`}{p.bankCode && ` · ${p.bankCode}`}</div>
                    <div className="text-slate-500">{money(p.amount)} · {dateTime(p.createdAt)}{p.message && ` · ${p.message}`}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2"><StatusBadge status={o.status} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
