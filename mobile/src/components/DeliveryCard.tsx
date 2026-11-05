import { Ionicons } from '@expo/vector-icons';
import { Linking, Text, View } from 'react-native';
import { DELIVERY_STATUS, distanceKm, openMapAt, VEHICLES } from '@/lib/geo';
import type { Delivery } from '@/lib/types';
import { C, R } from '@/lib/theme';
import { Button, Card, Row, StatusPill, T } from './ui';

const STEPS: [string, string][] = [['WAITING', 'Tìm tài xế'], ['ASSIGNED', 'Đến lấy hàng'], ['PICKED_UP', 'Đang giao'], ['DELIVERED', 'Đã giao']];

/** Khách theo dõi chuyến giao: trạng thái, tài xế, khoảng cách, gọi / xem vị trí */
export function DeliveryCard({ d }: { d: Delivery }) {
  const idx = STEPS.findIndex(([s]) => s === d.status);
  const live = d.status === 'ASSIGNED' || d.status === 'PICKED_UP';
  const remain = live ? distanceKm({ lat: d.shipperLat, lng: d.shipperLng }, d.status === 'ASSIGNED' ? { lat: d.pickupLat, lng: d.pickupLng } : { lat: d.dropoffLat, lng: d.dropoffLng }) : null;
  return (
    <Card style={{ gap: 12 }}>
      <Row style={{ justifyContent: 'space-between' }}><Row gap={6}><Ionicons name="bicycle" size={20} color={C.brand600} /><T variant="h3">Giao hàng</T></Row><StatusPill map={DELIVERY_STATUS} value={d.status} /></Row>
      {idx >= 0 && (
        <Row gap={4}>
          {STEPS.map(([k, l], i) => (
            <View key={k} style={{ flex: 1, gap: 4 }}>
              <View style={{ height: 5, borderRadius: 3, backgroundColor: i <= idx ? C.brand600 : C.line }} />
              <Text style={{ fontSize: 10, color: i <= idx ? C.brand700 : C.faint, fontWeight: i <= idx ? '700' : '400' }}>{l}</Text>
            </View>
          ))}
        </Row>
      )}
      {d.status === 'WAITING' && <T variant="muted">Đang tìm tài xế gần cửa hàng…</T>}
      {d.shipper && live && (
        <View style={{ backgroundColor: C.sky50, borderRadius: R.md, padding: 12, gap: 10 }}>
          <Row gap={10}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.sky, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 17 }}>{d.shipper.fullName.trim().split(' ').pop()?.[0]}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', color: C.ink }}>{d.shipper.fullName}</Text>
              <T variant="muted" style={{ fontSize: 12 }}>{VEHICLES[d.shipper.shipperProfile?.vehicleType ?? ''] ?? 'Xe máy'}{d.shipper.shipperProfile?.plateNumber ? ` · ${d.shipper.shipperProfile.plateNumber}` : ''}{remain != null ? ` · còn ~${remain} km` : ''}</T>
            </View>
          </Row>
          <Row gap={8}>
            {!!d.shipper.phone && <Button title="Gọi tài xế" icon="call-outline" size="sm" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${d.shipper!.phone}`)} />}
            {d.shipperLat != null && d.shipperLng != null && <Button title="Xem vị trí" icon="map-outline" variant="outline" size="sm" style={{ flex: 1 }} onPress={() => openMapAt({ lat: d.shipperLat!, lng: d.shipperLng! })} />}
          </Row>
        </View>
      )}
      {d.status === 'FAILED' && <Text style={{ color: C.red }}>Giao không thành công: {d.failReason}</Text>}
      {d.status === 'DELIVERED' && !!d.deliveredAt && <Text style={{ color: C.brand700 }}>Đã giao lúc {new Date(d.deliveredAt).toLocaleString('vi-VN')}</Text>}
    </Card>
  );
}
