import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { money } from '@/lib/format';
import { DELIVERY_STATUS } from '@/lib/geo';
import type { Job } from '@/lib/shipper';
import { C, R } from '@/lib/theme';
import { Card, Row, StatusPill, T } from './ui';

/** Thẻ chuyến giao: cửa hàng → khách, thu nhập, tiền thu hộ */
export function JobCard({ j, children }: { j: Job; children?: React.ReactNode }) {
  return (
    <Card style={{ gap: 10 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View><Text style={{ fontSize: 20, fontWeight: '900', color: C.brand700 }}>+{money(j.fee)}</Text><T variant="muted" style={{ fontSize: 12 }}>{j.order.code} · {j.itemCount} món{j.distanceKm != null ? ` · ${j.distanceKm} km` : ''}</T></View>
        {j.status === 'WAITING'
          ? j.toPickupKm != null && <View style={st.pill}><Text style={{ color: C.sky, fontSize: 12, fontWeight: '700' }}>📍 {j.toPickupKm} km · ~{j.etaPickupMin}′</Text></View>
          : <StatusPill map={DELIVERY_STATUS} value={j.status} />}
      </Row>
      <View style={{ gap: 8 }}>
        <Row gap={10} style={{ alignItems: 'flex-start' }}><View style={[st.dot, { backgroundColor: C.brand600 }]}><Ionicons name="storefront" size={12} color="#fff" /></View><View style={{ flex: 1 }}><Text style={st.b}>{j.store.name}</Text><T variant="muted" style={{ fontSize: 13 }}>{j.pickupAddress}</T></View></Row>
        <Row gap={10} style={{ alignItems: 'flex-start' }}><View style={[st.dot, { backgroundColor: '#e11d48' }]}><Ionicons name="location" size={12} color="#fff" /></View><View style={{ flex: 1 }}><Text style={st.b}>{j.order.customerName}</Text><T variant="muted" style={{ fontSize: 13 }}>{j.dropoffAddress}</T></View></Row>
      </View>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        {j.codAmount > 0
          ? <View style={[st.tag, { backgroundColor: C.amber50 }]}><Text style={{ color: '#92400e', fontWeight: '700', fontSize: 12 }}>💵 Thu hộ {money(j.codAmount)}</Text></View>
          : <View style={[st.tag, { backgroundColor: C.brand50 }]}><Text style={{ color: C.brand700, fontWeight: '700', fontSize: 12 }}>Đã thanh toán</Text></View>}
        {!!j.order.deliverySlot && <View style={[st.tag, { backgroundColor: C.line2 }]}><Text style={{ color: C.text, fontSize: 12 }}>🕒 {j.order.deliverySlot}</Text></View>}
      </Row>
      {children}
    </Card>
  );
}


const st = StyleSheet.create({
  pill: { backgroundColor: C.sky50, borderRadius: R.full, paddingHorizontal: 10, paddingVertical: 4 },
  dot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  b: { fontWeight: '700', color: C.ink },
  tag: { borderRadius: R.full, paddingHorizontal: 10, paddingVertical: 4 },
});
