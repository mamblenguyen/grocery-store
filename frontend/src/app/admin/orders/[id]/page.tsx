'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { OrderTimeline } from '@/components/OrderTimeline';
import { useToast } from '@/components/Toast';
import { PaymentBadge, Spinner, StatusBadge } from '@/components/ui';
import { api, imageUrl } from '@/lib/api';
import { dateTime, money, ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from '@/lib/format';
import type { Order } from '@/lib/types';

const NEXT: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [o, setO] = useState<Order | null>(null);

  useEffect(() => { api<Order>(`/admin/orders/${id}`).then(setO); }, [id]);

  const changeStatus = async (status: string) => {
    let cancelReason: string | undefined;
    if (status === 'CANCELLED') {
      const r = prompt('Lý do huỷ đơn (hàng sẽ được hoàn lại kho):');
      if (r === null) return;
      cancelReason = r;
    } else if (!confirm(`Chuyển đơn sang "${ORDER_STATUS[status].label}"?`)) return;
    try {
      setO(await api<Order>(`/admin/orders/${id}/status`, { method: 'PATCH', json: { status, cancelReason } }));
      toast('Đã cập nhật trạng thái');
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const changePayment = async (paymentStatus: string) => {
    try { setO(await api<Order>(`/admin/orders/${id}/payment`, { method: 'PATCH', json: { paymentStatus } })); toast('Đã cập nhật thanh toán'); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  if (!o) return <Spinner />;

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="text-sm text-gray-500">← Đơn hàng</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Đơn {o.code}</h1>
          <div className="text-sm text-gray-500">Đặt lúc {dateTime(o.createdAt)} · Cập nhật {dateTime(o.updatedAt)}</div>
        </div>
        <div className="flex gap-2">
          {NEXT[o.status].map((s) => (
            <button key={s} className={s === 'CANCELLED' ? 'btn-danger' : 'btn-primary'} onClick={() => changeStatus(s)}>
              {s === 'CANCELLED' ? 'Huỷ đơn' : `→ ${ORDER_STATUS[s].label}`}
            </button>
          ))}
          <button className="btn-outline" onClick={() => window.print()}>In đơn</button>
        </div>
      </div>
      <div className="card"><OrderTimeline status={o.status} />{o.cancelReason && <p className="mt-3 text-sm text-gray-500">Lý do huỷ: {o.cancelReason}</p>}</div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-3 font-semibold">Sản phẩm</h2>
          <table className="table">
            <thead><tr><th>Sản phẩm</th><th>SKU</th><th>Đơn giá</th><th>SL</th><th className="text-right">Thành tiền</th></tr></thead>
            <tbody>
              {o.items?.map((i) => (
                <tr key={i.id}>
                  <td><div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl(i.image)} alt="" className="h-10 w-10 rounded object-cover" />
                    <div><div className="font-medium">{i.productName}</div><div className="text-xs text-gray-500">{i.variantName}</div></div>
                  </div></td>
                  <td className="font-mono text-xs">{i.sku}</td><td>{money(i.price)}</td><td>{i.quantity}</td>
                  <td className="text-right font-semibold">{money(i.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between"><span>Tạm tính</span><span>{money(o.subtotal)}</span></div>
            {o.discount > 0 && <div className="flex justify-between text-red-600"><span>Giảm giá ({o.couponCode})</span><span>-{money(o.discount)}</span></div>}
            <div className="flex justify-between"><span>Phí ship</span><span>{money(o.shippingFee)}</span></div>
            <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Tổng</span><span className="text-brand-700">{money(o.total)}</span></div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="card space-y-1 text-sm">
            <h2 className="mb-2 font-semibold">Khách hàng</h2>
            <p><b>{o.customerName}</b></p><p>📞 {o.phone}</p><p>📍 {o.address}</p>
            {o.user && <p className="text-gray-500">Tài khoản: {o.user.email}</p>}
            {o.note && <p className="mt-2 rounded bg-yellow-50 p-2">📝 {o.note}</p>}
          </div>
          <div className="card space-y-3 text-sm">
            <h2 className="font-semibold">Thanh toán</h2>
            <p>{PAYMENT_METHOD[o.paymentMethod]}</p>
            <div className="flex items-center gap-2"><StatusBadge status={o.status} /><PaymentBadge status={o.paymentStatus} /></div>
            <select className="input" value={o.paymentStatus} onChange={(e) => changePayment(e.target.value)}>
              {Object.entries(PAYMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
