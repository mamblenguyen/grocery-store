import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { BankTransfer } from '@/components/BankTransfer';
import { OrderTimeline } from '@/components/OrderTimeline';
import { toast } from '@/components/Toast';
import { Button, Card, Empty, Loading, Row, StatusPill, T } from '@/components/ui';
import { addToStoredCart, useCart, type CartItem } from '@/context/cart';
import { FALLBACK_SETTINGS, useStoreSettings } from '@/context/settings';
import { useStore } from '@/context/store';
import { api, imageUrl } from '@/lib/api';
import { confirmAsync } from '@/lib/confirm';
import { dateOnly, dateTime, money, PAYMENT_METHOD } from '@/lib/format';
import { printInvoice } from '@/lib/invoice';
import { C, PAY_STATUS, R, STATUS } from '@/lib/theme';
import type { Order } from '@/lib/types';

interface Line { variantId: number; quantity: number; productId: number; productName: string; variantName: string; image: string | null; price: number; slug: string; stock: number }

export default function OrderDetail() {
  const { id, success } = useLocalSearchParams<{ id: string; success?: string }>();
  const shop = useStore();
  const cart = useCart();
  const [o, setO] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api<Order>(`/orders/my/${id}`).then(setO).catch((e) => setError(e.message)), [id]);
  // Tải lại khi quay về màn hình (vd sau khi thanh toán VNPay)
  useFocusEffect(useCallback(() => { load(); }, [load]));
  // Cài đặt (tài khoản ngân hàng, VNPay) của cửa hàng bán đơn này
  const settings = useStoreSettings(o?.store?.slug) ?? FALLBACK_SETTINGS;

  if (error) return <Empty icon="alert-circle-outline" text={error} />;
  if (!o) return <Loading />;
  const unpaid = o.paymentStatus === 'UNPAID' && o.status !== 'CANCELLED';

  const payVnpay = async () => {
    setBusy(true);
    try {
      const { paymentUrl } = await api<{ paymentUrl: string }>('/payments/vnpay/create', { method: 'POST', json: { orderId: o.id } });
      await WebBrowser.openBrowserAsync(paymentUrl);
      await load();
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const cancel = async () => {
    if (!(await confirmAsync('Huỷ đơn hàng?', `Đơn ${o.code} sẽ bị huỷ.`, 'Huỷ đơn', true))) return;
    try { setO(await api<Order>(`/orders/my/${o.id}/cancel`, { method: 'PATCH', json: { reason: 'Khách huỷ trên app' } })); toast('Đã huỷ đơn hàng'); }
    catch (e: any) { toast(e.message, 'error'); }
  };
  /** Mua lại: thêm vào giỏ của đúng cửa hàng đã bán, rồi chuyển sang cửa hàng đó */
  const reorder = async () => {
    const slug = o.store?.slug;
    if (!slug) return;
    const add: CartItem[] = [];
    for (const it of o.items ?? []) {
      if (!it.variantId) continue;
      try {
        const r = await api<{ lines: Line[] }>('/orders/preview', { method: 'POST', json: { items: [{ variantId: it.variantId, quantity: it.quantity }] }, store: slug });
        const l = r.lines[0];
        add.push({ variantId: l.variantId, productId: l.productId, slug: l.slug, productName: l.productName, variantName: l.variantName, image: l.image, price: l.price, stock: l.stock, quantity: l.quantity });
      } catch {}
    }
    if (!add.length) return toast('Sản phẩm trong đơn đã hết hàng', 'error');
    await addToStoredCart(slug, add);
    try { if (shop.store?.slug !== slug) await shop.selectSlug(slug); else await cart.reload(); } catch (e: any) { return toast(e.message, 'error'); }
    toast(`Đã thêm ${add.length} sản phẩm vào giỏ`); router.push('/cart');
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
      <Stack.Screen options={{ title: o.code }} />
      {o.store && <Row gap={6}><Ionicons name="storefront-outline" size={16} color={C.brand700} /><Text style={{ color: C.brand700, fontWeight: '700' }}>{o.store.name}</Text></Row>}
      {success && (
        <View style={{ backgroundColor: C.brand600, borderRadius: R.lg, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Ionicons name="checkmark-circle" size={36} color="#fff" />
          <View style={{ flex: 1 }}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 17 }}>Đặt hàng thành công!</Text><Text style={{ color: C.brand100 }}>Mã đơn {o.code}. Cửa hàng sẽ liên hệ xác nhận sớm.</Text></View>
        </View>
      )}
      <Card style={{ gap: 14 }}>
        <Row style={{ justifyContent: 'space-between' }}><T variant="muted">Đặt lúc {dateTime(o.createdAt)}</T><Row gap={6}><StatusPill map={PAY_STATUS} value={o.paymentStatus} /><StatusPill map={STATUS} value={o.status} /></Row></Row>
        <OrderTimeline status={o.status} />
        {!!o.cancelReason && <T variant="muted">Lý do huỷ: {o.cancelReason}</T>}
      </Card>
      {unpaid && o.paymentMethod === 'BANK_TRANSFER' && <BankTransfer code={o.code} amount={o.total} bank={settings.bank} />}
      {unpaid && settings.payment.vnpay && o.channel === 'ONLINE' && (
        <Card style={{ gap: 10, backgroundColor: C.sky50 }}>
          <T>{o.paymentMethod === 'VNPAY' ? 'Đơn hàng chưa được thanh toán qua VNPay.' : 'Bạn có thể thanh toán online ngay qua VNPay.'}</T>
          <Button title="Thanh toán VNPay" icon="card-outline" onPress={payVnpay} loading={busy} />
        </Card>
      )}
      <Card style={{ gap: 6 }}>
        <Row gap={6}><Ionicons name="location-outline" size={18} color={C.brand600} /><T variant="h3">Người nhận</T></Row>
        <T style={{ fontWeight: '700', color: C.ink }}>{o.customerName} · {o.phone}</T>
        <T variant="muted">{o.address}</T>
        {o.deliveryDate && <T>Giao ngày <Text style={{ fontWeight: '700' }}>{dateOnly(o.deliveryDate)}</Text> · {o.deliverySlot}</T>}
        {!!o.note && <T variant="muted">Ghi chú: {o.note}</T>}
        <T>Thanh toán: {PAYMENT_METHOD[o.paymentMethod]}</T>
      </Card>
      <Card style={{ gap: 10 }}>
        <T variant="h3">Sản phẩm</T>
        {o.items?.map((i) => (
          <Row key={i.id} gap={10}>
            <Image source={{ uri: imageUrl(i.image) }} style={{ width: 52, height: 52, borderRadius: 10 }} />
            <View style={{ flex: 1 }}><Text style={{ fontWeight: '600', color: C.ink }} numberOfLines={1}>{i.productName}</Text><T variant="muted">{i.variantName} · {money(i.price)} × {i.quantity}</T></View>
            <Text style={{ fontWeight: '700' }}>{money(i.total)}</Text>
          </Row>
        ))}
        <View style={{ borderTopWidth: 1, borderTopColor: C.line2, paddingTop: 8, gap: 4 }}>
          <Row style={{ justifyContent: 'space-between' }}><T>Tạm tính</T><T>{money(o.subtotal)}</T></Row>
          {o.discount > 0 && <Row style={{ justifyContent: 'space-between' }}><T style={{ color: C.red }}>Giảm giá</T><T style={{ color: C.red }}>-{money(o.discount)}</T></Row>}
          <Row style={{ justifyContent: 'space-between' }}><T>Phí giao hàng</T><T>{o.shippingFee ? money(o.shippingFee) : 'Miễn phí'}</T></Row>
          <Row style={{ justifyContent: 'space-between' }}><T variant="h3">Tổng cộng</T><Text style={{ fontSize: 20, fontWeight: '800', color: C.brand700 }}>{money(o.total)}</Text></Row>
        </View>
      </Card>
      <Row style={{ flexWrap: 'wrap' }}>
        <Button title="Mua lại" icon="refresh-outline" variant="outline" onPress={reorder} style={{ flex: 1, minWidth: 140 }} />
        <Button title="In hoá đơn" icon="print-outline" variant="outline" onPress={() => printInvoice(o, settings, 'a4')} style={{ flex: 1, minWidth: 140 }} />
      </Row>
      {o.status === 'COMPLETED' && o.items?.[0]?.productId && <T variant="muted" style={{ textAlign: 'center' }}>Hãy đánh giá sản phẩm trong trang chi tiết sản phẩm nhé ⭐</T>}
      {o.status === 'PENDING' && o.paymentStatus !== 'PAID' && <Button title="Huỷ đơn hàng" variant="ghost" onPress={cancel} style={{ alignSelf: 'center' }} />}
    </ScrollView>
  );
}
