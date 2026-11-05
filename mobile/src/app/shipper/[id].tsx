import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { toast } from '@/components/Toast';
import { Button, Card, Chip, Input, Loading, Row, StatusPill, T } from '@/components/ui';
import { api, imageUrl } from '@/lib/api';
import { confirmAsync } from '@/lib/confirm';
import { money } from '@/lib/format';
import { DELIVERY_STATUS, distanceKm, openDirections, type LatLng } from '@/lib/geo';
import type { Job } from '@/lib/shipper';
import { C, R } from '@/lib/theme';
import { useLiveLocation } from '@/lib/use-live-location';

const REASONS = ['Khách không nghe máy', 'Sai địa chỉ', 'Khách từ chối nhận', 'Khách hẹn giao lại'];

/** Chi tiết chuyến giao của tài xế: chỉ đường, gọi điện, xác nhận lấy / giao hàng */
export default function ShipperDelivery() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [d, setD] = useState<Job | null>(null);
  const [me, setMe] = useState<LatLng | null>(null);
  const [busy, setBusy] = useState(false);
  const [failing, setFailing] = useState(false);
  const [reason, setReason] = useState('');
  const load = useCallback(() => api<Job>(`/shipper/deliveries/${id}`).then(setD).catch((e) => toast(e.message, 'error')), [id]);
  useEffect(() => { load(); }, [load]);
  const live = !!d && ['ASSIGNED', 'PICKED_UP'].includes(d.status);
  useLiveLocation(live, setMe);
  if (!d) return <Loading />;

  const act = async (path: string, msg: string, body?: unknown) => {
    setBusy(true);
    try { setD(await api<Job>(`/shipper/deliveries/${id}/${path}`, { method: 'POST', json: body })); toast(msg); }
    catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const toStore = d.status === 'ASSIGNED';
  const remain = me ? distanceKm(me, toStore ? { lat: d.pickupLat, lng: d.pickupLng } : { lat: d.dropoffLat, lng: d.dropoffLng }) : null;
  const call = (phone?: string | null) => phone && Linking.openURL(`tel:${phone}`);

  const Stop = ({ store }: { store: boolean }) => {
    const activeStop = live && store === toStore;
    return (
      <Card style={{ gap: 10, borderWidth: activeStop ? 2 : 1, borderColor: activeStop ? (store ? C.brand500 : '#fb7185') : '#eef2f6' }}>
        <Row gap={10} style={{ alignItems: 'flex-start' }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: store ? C.brand600 : '#e11d48', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={store ? 'storefront' : 'location'} size={16} color="#fff" /></View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: store ? C.brand700 : '#be123c' }}>{store ? 'LẤY HÀNG' : 'GIAO ĐẾN'}</Text>
            <Text style={{ fontWeight: '800', color: C.ink }}>{store ? d.store.name : `${d.order.customerName} · ${d.order.phone}`}</Text>
            <T variant="muted">{store ? d.pickupAddress : d.dropoffAddress}</T>
            {!store && !!d.order.note && <Text style={{ backgroundColor: C.amber50, color: '#92400e', padding: 6, borderRadius: 8, fontSize: 12 }}>Ghi chú: {d.order.note}</Text>}
            {!store && !!d.order.deliverySlot && <T variant="muted" style={{ fontSize: 12 }}>Khung giờ: {d.order.deliverySlot}</T>}
          </View>
        </Row>
        {live && (
          <Row gap={8}>
            <Button title={activeStop && remain != null ? `Chỉ đường · ${remain} km` : 'Chỉ đường'} icon="navigate-outline" variant={activeStop ? 'primary' : 'outline'} size="sm" style={{ flex: 1 }}
              onPress={() => openDirections(store ? { lat: d.pickupLat, lng: d.pickupLng, address: d.pickupAddress } : { lat: d.dropoffLat, lng: d.dropoffLng, address: d.dropoffAddress })} />
            {(store ? d.store.phone : d.order.phone) && <Button title={store ? 'Gọi cửa hàng' : 'Gọi khách'} icon="call-outline" variant="outline" size="sm" style={{ flex: 1 }} onPress={() => call(store ? d.store.phone : d.order.phone)} />}
          </Row>
        )}
      </Card>
    );
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
      <Stack.Screen options={{ title: `Chuyến ${d.order.code}` }} />
      <Row style={{ justifyContent: 'space-between' }}><Text style={{ fontSize: 22, fontWeight: '900', color: C.brand700 }}>+{money(d.fee)}</Text><StatusPill map={DELIVERY_STATUS} value={d.status} /></Row>
      {live && (
        <Row gap={6}>
          {['Đến lấy hàng', 'Đang giao', 'Hoàn thành'].map((l, i) => {
            const on = i <= ['ASSIGNED', 'PICKED_UP', 'DELIVERED'].indexOf(d.status);
            return <View key={l} style={{ flex: 1, paddingVertical: 8, borderRadius: R.md, backgroundColor: on ? C.brand600 : C.white, alignItems: 'center' }}><Text style={{ fontSize: 12, fontWeight: '700', color: on ? '#fff' : C.faint }}>{l}</Text></View>;
          })}
        </Row>
      )}
      <Stop store />
      <Stop store={false} />
      <Card style={{ gap: 8 }}>
        <Row style={{ justifyContent: 'space-between' }}><T variant="h3">Hàng cần giao</T><T variant="muted">{d.itemCount} món</T></Row>
        {d.order.items.map((i) => (
          <Row key={i.id} gap={10}>
            <Image source={{ uri: imageUrl(i.image) }} style={{ width: 40, height: 40, borderRadius: 8 }} />
            <View style={{ flex: 1 }}><Text style={{ fontWeight: '600', color: C.ink }} numberOfLines={1}>{i.productName}</Text><T variant="muted" style={{ fontSize: 12 }}>{i.variantName}</T></View>
            <Text style={{ fontWeight: '800' }}>×{i.quantity}</Text>
          </Row>
        ))}
        <View style={{ borderTopWidth: 1, borderTopColor: C.line2, paddingTop: 8 }}>
          {d.codAmount > 0
            ? <Text style={{ fontWeight: '900', color: '#b45309', fontSize: 16 }}>💵 Thu của khách: {money(d.codAmount)}</Text>
            : <Text style={{ fontWeight: '700', color: C.brand700 }}>Khách đã thanh toán – không thu tiền</Text>}
        </View>
      </Card>

      {d.status === 'ASSIGNED' && (
        <>
          <Button testID="pickup" title="Đã lấy hàng tại cửa hàng" icon="checkmark-circle-outline" size="lg" loading={busy} onPress={() => act('pickup', 'Đã lấy hàng – bắt đầu giao')} />
          <Button title="Trả đơn (chưa lấy hàng)" variant="ghost" icon="return-up-back-outline" onPress={async () => {
            if (!(await confirmAsync('Trả đơn này?', 'Đơn sẽ quay lại cho tài xế khác nhận', 'Trả đơn', true))) return;
            try { await api(`/shipper/deliveries/${id}/release`, { method: 'POST' }); toast('Đã trả đơn'); router.back(); } catch (e: any) { toast(e.message, 'error'); }
          }} />
        </>
      )}
      {d.status === 'PICKED_UP' && !failing && (
        <>
          <Button testID="complete" title={d.codAmount ? `Đã giao & thu ${money(d.codAmount)}` : 'Đã giao thành công'} icon="checkmark-done-outline" size="lg" loading={busy}
            onPress={async () => { if (await confirmAsync('Xác nhận đã giao?', d.codAmount ? `Đã thu ${money(d.codAmount)} của khách` : '', 'Đã giao')) act('complete', 'Giao thành công 🎉'); }} />
          <Button title="Giao không thành công" variant="outline" icon="close-circle-outline" onPress={() => setFailing(true)} />
        </>
      )}
      {failing && (
        <Card style={{ gap: 10 }}>
          <T variant="h3">Lý do giao không thành công</T>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>{REASONS.map((r) => <Chip key={r} label={r} active={reason === r} onPress={() => setReason(r)} />)}</Row>
          <Input value={reason} onChangeText={setReason} placeholder="Lý do khác…" />
          <Row gap={8}><Button title="Đóng" variant="ghost" style={{ flex: 1 }} onPress={() => setFailing(false)} /><Button title="Xác nhận" variant="danger" style={{ flex: 1 }} disabled={reason.trim().length < 3} onPress={async () => { await act('fail', 'Đã báo giao không thành công', { reason }); setFailing(false); }} /></Row>
        </Card>
      )}
      {d.status === 'DELIVERED' && <Card style={{ alignItems: 'center' }}><Ionicons name="checkmark-circle" size={36} color={C.brand600} /><Text style={{ fontWeight: '700', color: C.brand700 }}>Đã giao thành công</Text></Card>}
      {d.status === 'FAILED' && <Card><Text style={{ color: C.red }}>Giao không thành công: {d.failReason}. Mang hàng trả lại cửa hàng.</Text></Card>}
      <Pressable onPress={load} style={{ alignSelf: 'center', padding: 8 }}><Text style={{ color: C.muted }}>↻ Làm mới</Text></Pressable>
    </ScrollView>
  );
}
