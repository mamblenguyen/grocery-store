import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { OrderTimeline } from '@/components/OrderTimeline';
import { toast } from '@/components/Toast';
import { Button, Card, Input, Loading, Row, StatusPill, T } from '@/components/ui';
import { useSettings } from '@/context/settings';
import { api, imageUrl } from '@/lib/api';
import { confirmAsync } from '@/lib/confirm';
import { dateOnly, dateTime, money, PAYMENT_METHOD } from '@/lib/format';
import { printInvoice } from '@/lib/invoice';
import { useStaffGuard } from '@/lib/staff';
import { C, PAY_STATUS, STATUS } from '@/lib/theme';
import type { Order } from '@/lib/types';

const NEXT: Record<string, string[]> = { PENDING: ['CONFIRMED'], CONFIRMED: ['SHIPPING'], SHIPPING: ['COMPLETED'], COMPLETED: [], CANCELLED: [] };

export default function StaffOrder() {
  useStaffGuard();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { settings } = useSettings();
  const [o, setO] = useState<Order | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api<Order>(`/admin/orders/${id}`).then(setO).catch((e) => toast(e.message, 'error')), [id]);
  useEffect(() => { load(); }, [load]);
  if (!o) return <Loading />;
  const status = async (s: string, cancelReason?: string) => {
    if (!(await confirmAsync(`Chuyển đơn sang "${STATUS[s].label}"?`, s === 'CANCELLED' ? 'Hàng sẽ được hoàn lại kho.' : '', 'Đồng ý', s === 'CANCELLED'))) return;
    setBusy(true);
    try { setO(await api<Order>(`/admin/orders/${o.id}/status`, { method: 'PATCH', json: { status: s, cancelReason } })); toast('Đã cập nhật trạng thái'); }
    catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const paid = async () => {
    if (!(await confirmAsync(`Xác nhận đã nhận ${money(o.total)}?`))) return;
    try { setO(await api<Order>(`/admin/orders/${o.id}/payment`, { method: 'PATCH', json: { paymentStatus: 'PAID' } })); toast('Đã ghi nhận thanh toán'); } catch (e: any) { toast(e.message, 'error'); }
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
      <Stack.Screen options={{ title: o.code }} />
      <Card style={{ gap: 12 }}>
        <Row style={{ justifyContent: 'space-between' }}><T variant="muted">{o.channel === 'POS' ? 'Tại quầy' : 'Online'} · {dateTime(o.createdAt)}</T><Row gap={6}><StatusPill map={PAY_STATUS} value={o.paymentStatus} /><StatusPill map={STATUS} value={o.status} /></Row></Row>
        <OrderTimeline status={o.status} />
        {NEXT[o.status].map((s) => <Button key={s} testID={`to-${s}`} title={`→ ${STATUS[s].label}`} loading={busy} onPress={() => status(s)} />)}
        {o.paymentStatus === 'UNPAID' && o.status !== 'CANCELLED' && <Button title="Xác nhận đã nhận tiền" icon="cash-outline" variant="soft" onPress={paid} />}
      </Card>
      <Card style={{ gap: 4 }}>
        <T variant="h3">Khách hàng</T>
        <T style={{ fontWeight: '700', color: C.ink }}>{o.customerName}</T>
        {!!o.phone && <Text style={{ color: C.brand700, fontWeight: '600' }} onPress={() => Linking.openURL(`tel:${o.phone}`)}>📞 {o.phone}</Text>}
        <T>{o.address}</T>
        {o.deliveryDate && <T>Giao {dateOnly(o.deliveryDate)} · {o.deliverySlot}</T>}
        {!!o.note && <T style={{ backgroundColor: C.amber50, padding: 8, borderRadius: 8 }}>📝 {o.note}</T>}
        <T>Thanh toán: {PAYMENT_METHOD[o.paymentMethod]}</T>
      </Card>
      <Card style={{ gap: 8 }}>
        <T variant="h3">Sản phẩm ({o.items?.length})</T>
        {o.items?.map((i) => (
          <Row key={i.id}><Image source={{ uri: imageUrl(i.image) }} style={{ width: 44, height: 44, borderRadius: 8 }} /><View style={{ flex: 1 }}><Text style={{ fontWeight: '600' }} numberOfLines={1}>{i.productName}</Text><T variant="muted">{i.variantName} · {i.sku} · ×{i.quantity}</T></View><Text style={{ fontWeight: '700' }}>{money(i.total)}</Text></Row>
        ))}
        <Row style={{ justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.line2, paddingTop: 8 }}><T variant="h3">Tổng</T><Text style={{ fontSize: 20, fontWeight: '800', color: C.brand700 }}>{money(o.total)}</Text></Row>
      </Card>
      <Row><Button title="In K80" icon="print-outline" variant="outline" onPress={() => printInvoice(o, settings, 'k80')} style={{ flex: 1 }} /><Button title="In A4" icon="print-outline" variant="outline" onPress={() => printInvoice(o, settings, 'a4')} style={{ flex: 1 }} /></Row>
      {['PENDING', 'CONFIRMED', 'SHIPPING'].includes(o.status) && (
        <Card style={{ gap: 8 }}>
          <T variant="h3">Huỷ đơn</T>
          <Input value={reason} onChangeText={setReason} placeholder="Lý do huỷ" />
          <Button title="Huỷ đơn hàng" variant="danger" onPress={() => status('CANCELLED', reason || undefined)} />
        </Card>
      )}
    </ScrollView>
  );
}
