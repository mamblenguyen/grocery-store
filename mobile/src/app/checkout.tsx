import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from '@/components/Toast';
import { Button, Card, Chip, Empty, Input, Loading, Row, T } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useCart } from '@/context/cart';
import { useSettings } from '@/context/settings';
import { api } from '@/lib/api';
import { money, ymd } from '@/lib/format';
import { C, R } from '@/lib/theme';
import type { Address, Order } from '@/lib/types';

interface Preview { subtotal: number; discount: number; shippingFee: number; total: number }
const WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
type Method = 'COD' | 'BANK_TRANSFER' | 'VNPAY';

export default function Checkout() {
  const { user, loading } = useAuth();
  const { settings } = useSettings();
  const cart = useCart();
  const insets = useSafeAreaInsets();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addrId, setAddrId] = useState<number | 'new'>('new');
  const [form, setForm] = useState({ customerName: '', phone: '', address: '', note: '' });
  const [method, setMethod] = useState<Method>('COD');
  const [day, setDay] = useState('');
  const [slot, setSlot] = useState('');
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState<string>();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const items = cart.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
  const days = useMemo(() => Array.from({ length: settings.deliveryDaysAhead + 1 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; }), [settings.deliveryDaysAhead]);
  const methods = ([
    settings.payment.cod && { k: 'COD', icon: 'cash-outline', title: 'Thanh toán khi nhận hàng', sub: 'Trả tiền mặt cho shipper' },
    settings.payment.bankTransfer && { k: 'BANK_TRANSFER', icon: 'qr-code-outline', title: 'Chuyển khoản VietQR', sub: 'Quét QR bằng app ngân hàng' },
    settings.payment.vnpay && { k: 'VNPAY', icon: 'card-outline', title: 'VNPay', sub: 'ATM, Visa/Master, QR' },
  ].filter(Boolean)) as { k: Method; icon: any; title: string; sub: string }[];

  useEffect(() => { if (methods.length && !methods.some((m) => m.k === method)) setMethod(methods[0].k); }, [methods.length]); // eslint-disable-line
  useEffect(() => { if (!day && days.length) setDay(ymd(days[0])); }, [days, day]);
  useEffect(() => {
    if (!loading && !user) { router.replace('/login?next=/checkout'); return; }
    if (!user) return;
    api<Address[]>('/addresses').then((l) => {
      setAddresses(l);
      const d = l.find((a) => a.isDefault) ?? l[0];
      if (d) { setAddrId(d.id); setForm((f) => ({ ...f, customerName: d.fullName, phone: d.phone, address: d.address })); }
      else setForm((f) => ({ ...f, customerName: user.fullName, phone: user.phone ?? '', address: user.address ?? '' }));
    }).catch(() => {});
  }, [user, loading]);

  const runPreview = async (code?: string) => {
    try { setPreview(await api<Preview>('/orders/preview', { method: 'POST', json: { items, couponCode: code } })); setError(''); return true; }
    catch (e: any) { setError(e.message); return false; }
  };
  useEffect(() => { if (items.length) runPreview(applied); }, [cart.items.length]); // eslint-disable-line

  const submit = async () => {
    if (!form.customerName || !form.phone || !form.address) return setError('Vui lòng nhập đủ người nhận, số điện thoại và địa chỉ');
    if (settings.deliverySlots.length && !slot) return setError('Vui lòng chọn khung giờ giao hàng');
    setBusy(true); setError('');
    try {
      const order = await api<Order>('/orders', { method: 'POST', json: { ...form, items, couponCode: applied, paymentMethod: method, ...(settings.deliverySlots.length && { deliveryDate: day, deliverySlot: slot }) } });
      if (addrId === 'new' && !addresses.length) api('/addresses', { method: 'POST', json: { fullName: form.customerName, phone: form.phone, address: form.address, isDefault: true } }).catch(() => {});
      cart.clear();
      if (method === 'VNPAY') {
        const { paymentUrl } = await api<{ paymentUrl: string }>('/payments/vnpay/create', { method: 'POST', json: { orderId: order.id } });
        await WebBrowser.openBrowserAsync(paymentUrl);
      }
      router.replace(`/orders/${order.id}?success=1`);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  if (loading || !user) return <Loading />;
  if (!cart.items.length) return <Empty icon="cart-outline" text="Giỏ hàng trống"><Button title="Mua sắm" onPress={() => router.replace('/products')} /></Empty>;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Thanh toán' }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 140 + insets.bottom, maxWidth: 760, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: 12 }}>
          <Row gap={6}><Ionicons name="location-outline" size={20} color={C.brand600} /><T variant="h3">Địa chỉ nhận hàng</T></Row>
          {addresses.map((a) => (
            <Pressable key={a.id} onPress={() => { setAddrId(a.id); setForm({ ...form, customerName: a.fullName, phone: a.phone, address: a.address }); }}
              style={{ borderWidth: 2, borderColor: addrId === a.id ? C.brand600 : C.line, backgroundColor: addrId === a.id ? C.brand50 : C.white, borderRadius: R.md, padding: 12 }}>
              <Text style={{ fontWeight: '700', color: C.ink }}>{a.fullName} · {a.phone}{a.isDefault ? '  (Mặc định)' : ''}</Text>
              <T variant="muted">{a.label ? `${a.label}: ` : ''}{a.address}</T>
            </Pressable>
          ))}
          {addresses.length > 0 && <Chip label="+ Địa chỉ khác" active={addrId === 'new'} onPress={() => { setAddrId('new'); setForm({ ...form, customerName: user.fullName, phone: '', address: '' }); }} />}
          {(addrId === 'new' || !addresses.length) && (
            <View style={{ gap: 10 }}>
              <Input testID="co-name" label="Họ tên người nhận" value={form.customerName} onChangeText={(v) => setForm({ ...form, customerName: v })} />
              <Input testID="co-phone" label="Số điện thoại" keyboardType="phone-pad" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} />
              <Input testID="co-address" label="Địa chỉ" value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} placeholder="Số nhà, đường, phường, quận, tỉnh" />
            </View>
          )}
          <Input label="Ghi chú" value={form.note} onChangeText={(v) => setForm({ ...form, note: v })} placeholder="VD: gọi trước khi giao" />
        </Card>

        {settings.deliverySlots.length > 0 && (
          <Card style={{ gap: 12 }}>
            <Row gap={6}><Ionicons name="calendar-outline" size={20} color={C.brand600} /><T variant="h3">Thời gian giao hàng</T></Row>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {days.map((d, i) => {
                const v = ymd(d);
                return (
                  <Pressable key={v} onPress={() => setDay(v)} style={{ minWidth: 72, alignItems: 'center', borderWidth: 2, borderColor: day === v ? C.brand600 : C.line, backgroundColor: day === v ? C.brand50 : C.white, borderRadius: R.md, paddingVertical: 8 }}>
                    <Text style={{ fontSize: 12, color: C.muted }}>{i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : WD[d.getDay()]}</Text>
                    <Text style={{ fontWeight: '800', color: C.ink, fontSize: 16 }}>{d.getDate()}/{d.getMonth() + 1}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{settings.deliverySlots.map((s) => <Chip key={s} label={s} active={slot === s} onPress={() => setSlot(s)} />)}</View>
          </Card>
        )}

        <Card style={{ gap: 10 }}>
          <Row gap={6}><Ionicons name="wallet-outline" size={20} color={C.brand600} /><T variant="h3">Phương thức thanh toán</T></Row>
          {methods.map((m) => (
            <Pressable key={m.k} testID={`pay-${m.k}`} onPress={() => setMethod(m.k)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: method === m.k ? C.brand600 : C.line, backgroundColor: method === m.k ? C.brand50 : C.white, borderRadius: R.md, padding: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: method === m.k ? C.brand600 : C.line2, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={m.icon} size={20} color={method === m.k ? '#fff' : C.muted} /></View>
              <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', color: C.ink }}>{m.title}</Text><T variant="muted">{m.sub}</T></View>
              <Ionicons name={method === m.k ? 'radio-button-on' : 'radio-button-off'} size={22} color={method === m.k ? C.brand600 : C.faint} />
            </Pressable>
          ))}
        </Card>

        <Card style={{ gap: 10 }}>
          <T variant="h3">Đơn hàng ({cart.count} sản phẩm)</T>
          {cart.items.map((i) => <Row key={i.variantId} style={{ justifyContent: 'space-between' }}><T style={{ flex: 1 }} numberOfLines={1}>{i.productName} <Text style={{ color: C.muted }}>({i.variantName}) ×{i.quantity}</Text></T><T style={{ fontWeight: '600' }}>{money(i.price * i.quantity)}</T></Row>)}
          <Row>
            <View style={{ flex: 1 }}><Input testID="co-coupon" icon="pricetag-outline" value={coupon} onChangeText={setCoupon} placeholder="Mã giảm giá" autoCapitalize="characters" /></View>
            <Button title="Áp dụng" variant="outline" onPress={async () => { if (coupon.trim() && (await runPreview(coupon.trim()))) { setApplied(coupon.trim().toUpperCase()); toast('Đã áp dụng mã giảm giá'); } else runPreview(applied); }} />
          </Row>
          {applied && <Row style={{ justifyContent: 'space-between' }}><Text style={{ color: C.brand700 }}>Mã {applied} đã áp dụng</Text><Pressable onPress={() => { setApplied(undefined); setCoupon(''); runPreview(); }}><Text style={{ color: C.red, fontWeight: '600' }}>Bỏ</Text></Pressable></Row>}
          {preview && (
            <View style={{ gap: 4, borderTopWidth: 1, borderTopColor: C.line2, paddingTop: 10 }}>
              <Row style={{ justifyContent: 'space-between' }}><T>Tạm tính</T><T>{money(preview.subtotal)}</T></Row>
              {preview.discount > 0 && <Row style={{ justifyContent: 'space-between' }}><T style={{ color: C.red }}>Giảm giá</T><T style={{ color: C.red }}>-{money(preview.discount)}</T></Row>}
              <Row style={{ justifyContent: 'space-between' }}><T>Phí giao hàng</T><T>{preview.shippingFee ? money(preview.shippingFee) : 'Miễn phí'}</T></Row>
            </View>
          )}
        </Card>
        {!!error && <View style={{ backgroundColor: C.red50, borderRadius: R.md, padding: 12 }}><Text style={{ color: C.red }}>{error}</Text></View>}
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.white, padding: 16, paddingBottom: 16 + insets.bottom, borderTopWidth: 1, borderTopColor: C.line, gap: 6 }}>
        <Row style={{ justifyContent: 'space-between' }}><T variant="h3">Tổng thanh toán</T><Text style={{ fontSize: 22, fontWeight: '800', color: C.brand700 }}>{money(preview?.total ?? cart.subtotal)}</Text></Row>
        <Button testID="place-order" title={method === 'VNPAY' ? 'Đặt hàng & thanh toán VNPay' : 'Đặt hàng'} icon="lock-closed-outline" size="lg" loading={busy} disabled={!preview} onPress={submit} />
      </View>
    </KeyboardAvoidingView>
  );
}
