'use client';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { OrderTimeline } from '@/components/OrderTimeline';
import { useToast } from '@/components/Toast';
import { PaymentBadge, Spinner, StatusBadge } from '@/components/ui';
import { api, imageUrl } from '@/lib/api';
import { dateTime, money, PAYMENT_METHOD } from '@/lib/format';
import type { Order } from '@/lib/types';

function OrderDetailInner() {
  const { id } = useParams<{ id: string }>();
  const success = useSearchParams().get('success');
  const toast = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Order>(`/orders/my/${id}`).then(setOrder).catch((e) => setError(e.message));
  }, [id]);

  const cancel = async () => {
    const reason = prompt('Lý do huỷ đơn?') ?? undefined;
    if (reason === undefined) return;
    try {
      setOrder(await api<Order>(`/orders/my/${id}/cancel`, { method: 'PATCH', json: { reason } }));
      toast('Đã huỷ đơn hàng');
    } catch (e: any) { toast(e.message, 'error'); }
  };

  if (error) return <div className="card text-center">{error}</div>;
  if (!order) return <Spinner />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {success && (
        <div className="rounded-xl bg-brand-50 p-5 text-brand-700">
          🎉 <b>Đặt hàng thành công!</b> Mã đơn của bạn là <b>{order.code}</b>. Chúng tôi sẽ liên hệ xác nhận sớm.
        </div>
      )}
      <div className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">Đơn hàng {order.code}</h1>
            <div className="text-sm text-gray-500">Đặt lúc {dateTime(order.createdAt)}</div>
          </div>
          <div className="flex gap-2"><StatusBadge status={order.status} /><PaymentBadge status={order.paymentStatus} /></div>
        </div>
        <OrderTimeline status={order.status} />
        {order.cancelReason && <div className="mt-3 text-sm text-gray-500">Lý do huỷ: {order.cancelReason}</div>}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card text-sm">
          <h2 className="mb-2 font-semibold">Thông tin nhận hàng</h2>
          <p><b>{order.customerName}</b> · {order.phone}</p>
          <p>{order.address}</p>
          {order.note && <p className="mt-2 text-gray-500">Ghi chú: {order.note}</p>}
        </div>
        <div className="card text-sm">
          <h2 className="mb-2 font-semibold">Thanh toán</h2>
          <p>{PAYMENT_METHOD[order.paymentMethod]}</p>
          {order.couponCode && <p>Mã giảm giá: <b>{order.couponCode}</b></p>}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Sản phẩm</h2>
        <div className="divide-y divide-gray-100">
          {order.items?.map((i) => (
            <div key={i.id} className="flex items-center gap-4 py-3 text-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl(i.image)} alt="" className="h-14 w-14 rounded-lg object-cover" />
              <div className="flex-1"><div className="font-medium">{i.productName}</div><div className="text-gray-500">{i.variantName} · SKU {i.sku}</div></div>
              <div className="text-right">{money(i.price)} × {i.quantity}<div className="font-semibold">{money(i.total)}</div></div>
            </div>
          ))}
        </div>
        <div className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><span>Tạm tính</span><span>{money(order.subtotal)}</span></div>
          {order.discount > 0 && <div className="flex justify-between text-red-600"><span>Giảm giá</span><span>-{money(order.discount)}</span></div>}
          <div className="flex justify-between"><span>Phí giao hàng</span><span>{money(order.shippingFee)}</span></div>
          <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Tổng</span><span className="text-brand-700">{money(order.total)}</span></div>
        </div>
      </div>

      <div className="flex justify-between">
        <Link href="/orders" className="btn-outline">← Danh sách đơn</Link>
        {order.status === 'PENDING' && <button className="btn-danger" onClick={cancel}>Huỷ đơn hàng</button>}
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return <Suspense><OrderDetailInner /></Suspense>;
}
