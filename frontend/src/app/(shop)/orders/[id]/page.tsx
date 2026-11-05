'use client';
import { ArrowLeft, CalendarDays, CreditCard, MapPin, PartyPopper, Printer, RefreshCw, StickyNote, Store } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { OrderTimeline } from '@/components/OrderTimeline';
import { AccountShell } from '@/components/shop/AccountShell';
import { BankTransferBox } from '@/components/shop/BankTransferBox';
import { useToast } from '@/components/Toast';
import { PaymentBadge, Spinner, StatusBadge } from '@/components/ui';
import { addToStoredCart, type CartItem } from '@/context/cart';
import { FALLBACK_SETTINGS } from '@/context/settings';
import { api, imageUrl } from '@/lib/api';
import { dateOnly, dateTime, money, PAYMENT_METHOD } from '@/lib/format';
import type { Order, StoreSettings } from '@/lib/types';

interface PreviewLine { variantId: number; quantity: number; productId: number; productName: string; variantName: string; image: string | null; price: number; slug: string; stock: number }

function OrderDetailInner() {
  const { id } = useParams<{ id: string }>();
  const success = useSearchParams().get('success');
  const toast = useToast();
  const router = useRouter();
  // Cài đặt của cửa hàng bán đơn này (tài khoản ngân hàng, VNPay…)
  const [settings, setSettings] = useState<StoreSettings>(FALLBACK_SETTINGS);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => { api<Order>(`/orders/my/${id}`).then(setOrder).catch((e) => setError(e.message)); }, [id]);
  const slug = order?.store?.slug;
  useEffect(() => { if (slug) api<StoreSettings>('/settings', { headers: { 'X-Store': slug } }).then(setSettings).catch(() => {}); }, [slug]);

  const cancel = async () => {
    const reason = prompt('Lý do huỷ đơn?');
    if (reason === null) return;
    try { setOrder(await api<Order>(`/orders/my/${id}/cancel`, { method: 'PATCH', json: { reason } })); toast('Đã huỷ đơn hàng'); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  const payVnpay = async () => {
    setPaying(true);
    try { const { paymentUrl } = await api<{ paymentUrl: string }>('/payments/vnpay/create', { method: 'POST', json: { orderId: order!.id } }); window.location.href = paymentUrl; }
    catch (e: any) { toast(e.message, 'error'); setPaying(false); }
  };

  /** Mua lại: lấy giá & tồn kho mới nhất rồi thêm vào giỏ */
  const reorder = async () => {
    const items = order!.items!.filter((i) => i.variantId).map((i) => ({ variantId: i.variantId!, quantity: i.quantity }));
    if (!slug) return;
    const add: CartItem[] = [];
    for (const it of items) {
      try {
        const r = await api<{ lines: PreviewLine[] }>('/orders/preview', { method: 'POST', json: { items: [it] }, headers: { 'X-Store': slug } });
        const l = r.lines[0];
        add.push({ variantId: l.variantId, productId: l.productId, slug: l.slug, productName: l.productName, variantName: l.variantName, image: l.image, price: l.price, stock: l.stock, quantity: l.quantity });
      } catch { /* hết hàng / ngừng bán → bỏ qua */ }
    }
    if (add.length) { addToStoredCart(slug, add); toast(`Đã thêm ${add.length}/${items.length} sản phẩm vào giỏ`); router.push(`/s/${slug}/cart`); }
    else toast('Các sản phẩm trong đơn hiện đã hết hàng', 'error');
  };

  if (error) return <AccountShell><div className="card text-center">{error}</div></AccountShell>;
  if (!order) return <AccountShell><Spinner /></AccountShell>;
  const unpaid = order.paymentStatus === 'UNPAID' && order.status !== 'CANCELLED';

  return (
    <AccountShell>
      <div className="space-y-5">
        {success && (
          <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 p-5 text-white">
            <PartyPopper className="h-10 w-10 shrink-0" />
            <div><div className="text-lg font-bold">Đặt hàng thành công!</div><div className="text-brand-50">Mã đơn <b>{order.code}</b>. Chúng tôi sẽ liên hệ xác nhận trong ít phút.</div></div>
          </div>
        )}
        <div className="card">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">Đơn hàng {order.code}</h1>
              <div className="text-sm text-slate-400">Đặt lúc {dateTime(order.createdAt)}</div>
              {order.store && <Link href={`/s/${order.store.slug}`} className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"><Store className="h-4 w-4" />{order.store.name}</Link>}
            </div>
            <div className="flex gap-2"><PaymentBadge status={order.paymentStatus} /><StatusBadge status={order.status} /></div>
          </div>
          <OrderTimeline status={order.status} />
          {order.cancelReason && <p className="mt-4 text-center text-sm text-slate-500">Lý do huỷ: {order.cancelReason}</p>}
        </div>

        {unpaid && order.paymentMethod === 'BANK_TRANSFER' && <BankTransferBox code={order.code} amount={order.total} bank={settings.bank} />}
        {unpaid && settings.payment.vnpay && order.channel === 'ONLINE' && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <span className="text-sm text-sky-900">{order.paymentMethod === 'VNPAY' ? 'Đơn hàng chưa được thanh toán qua VNPay.' : 'Bạn có thể thanh toán online ngay qua VNPay.'}</span>
            <button className="btn-primary" onClick={payVnpay} disabled={paying}><CreditCard className="h-4 w-4" /> {paying ? 'Đang chuyển…' : 'Thanh toán VNPay'}</button>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-3">
          <div className="card text-sm">
            <h3 className="mb-2 flex items-center gap-2 font-bold text-ink"><MapPin className="h-4 w-4 text-brand-600" /> Người nhận</h3>
            <p className="font-semibold text-ink">{order.customerName}</p><p>{order.phone}</p><p className="text-slate-500">{order.address}</p>
          </div>
          <div className="card text-sm">
            <h3 className="mb-2 flex items-center gap-2 font-bold text-ink"><CalendarDays className="h-4 w-4 text-brand-600" /> Giao hàng</h3>
            {order.deliveryDate ? <p>Ngày <b>{dateOnly(order.deliveryDate)}</b><br />Khung giờ <b>{order.deliverySlot}</b></p> : <p className="text-slate-500">Giao sớm nhất có thể</p>}
            {order.note && <p className="mt-2 flex gap-1.5 text-slate-500"><StickyNote className="mt-0.5 h-4 w-4 shrink-0" />{order.note}</p>}
          </div>
          <div className="card text-sm">
            <h3 className="mb-2 flex items-center gap-2 font-bold text-ink"><CreditCard className="h-4 w-4 text-brand-600" /> Thanh toán</h3>
            <p>{PAYMENT_METHOD[order.paymentMethod]}</p>
            {order.paidAt && <p className="text-slate-500">Đã thanh toán lúc {dateTime(order.paidAt)}</p>}
          </div>
        </div>

        <div className="card">
          <h3 className="mb-2 font-bold text-ink">Sản phẩm</h3>
          <div className="divide-y divide-slate-100">
            {order.items?.map((i) => (
              <div key={i.id} className="flex items-center gap-4 py-3 text-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(i.image)} alt="" className="h-16 w-16 rounded-xl border border-slate-100 object-cover" />
                <div className="flex-1"><div className="font-semibold text-ink">{i.productName}</div><div className="text-slate-400">{i.variantName}</div></div>
                <div className="text-right text-slate-500">{money(i.price)} × {i.quantity}<div className="font-bold text-ink">{money(i.total)}</div></div>
              </div>
            ))}
          </div>
          <div className="mt-3 ml-auto max-w-xs space-y-1.5 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between"><span>Tạm tính</span><span>{money(order.subtotal)}</span></div>
            {order.discount > 0 && <div className="flex justify-between text-red-600"><span>Giảm giá {order.couponCode && `(${order.couponCode})`}</span><span>-{money(order.discount)}</span></div>}
            <div className="flex justify-between"><span>Phí giao hàng</span><span>{order.shippingFee ? money(order.shippingFee) : 'Miễn phí'}</span></div>
            <div className="flex justify-between pt-1 text-lg font-bold"><span>Tổng cộng</span><span className="text-brand-700">{money(order.total)}</span></div>
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-2">
          <Link href="/orders" className="btn-ghost"><ArrowLeft className="h-4 w-4" /> Danh sách đơn</Link>
          <div className="flex flex-wrap gap-2">
            <a href={`/print/invoice/${order.id}`} target="_blank" className="btn-outline"><Printer className="h-4 w-4" /> In hoá đơn</a>
            <button className="btn-outline" onClick={reorder}><RefreshCw className="h-4 w-4" /> Mua lại</button>
            {order.status === 'PENDING' && order.paymentStatus !== 'PAID' && <button className="btn-danger" onClick={cancel}>Huỷ đơn</button>}
          </div>
        </div>
      </div>
    </AccountShell>
  );
}

export default function OrderDetailPage() {
  return <Suspense><OrderDetailInner /></Suspense>;
}
