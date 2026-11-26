import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker, type Region } from 'react-native-maps';
import { imageUrl } from '@/lib/api';
import { C, R, shadow } from '@/lib/theme';
import type { PublicStore } from '@/lib/types';

type Point = { lat: number; lng: number };
type Props = { stores: PublicStore[]; userLocation?: Point | null; onPick: (store: PublicStore) => void };

const FALLBACK: Region = { latitude: 10.7769, longitude: 106.7009, latitudeDelta: 0.18, longitudeDelta: 0.18 };

export function StoreMap({ stores, userLocation, onPick }: Props) {
  const map = useRef<MapView>(null);
  const [selected, setSelected] = useState<PublicStore | null>(null);
  const pinned = useMemo(() => stores.filter((s) => s.lat != null && s.lng != null), [stores]);
  const initial = useMemo<Region>(() => {
    const p = userLocation ?? (pinned[0] ? { lat: pinned[0].lat!, lng: pinned[0].lng! } : null);
    return p ? { latitude: p.lat, longitude: p.lng, latitudeDelta: 0.12, longitudeDelta: 0.12 } : FALLBACK;
  }, []); // camera ban đầu; thay đổi sau đó được điều khiển bằng nút định vị

  const focusUser = () => {
    if (userLocation) map.current?.animateToRegion({ latitude: userLocation.lat, longitude: userLocation.lng, latitudeDelta: 0.06, longitudeDelta: 0.06 }, 450);
  };

  return (
    <View style={styles.wrap}>
      <MapView ref={map} style={StyleSheet.absoluteFill} initialRegion={initial} showsUserLocation={!!userLocation} showsMyLocationButton={false}>
        {pinned.map((s) => (
          <Marker key={s.id} coordinate={{ latitude: s.lat!, longitude: s.lng! }} onPress={() => setSelected(s)} pinColor={C.brand600}>
            <Callout tooltip onPress={() => onPick(s)}>
              <View style={[styles.callout, shadow]}>
                {s.banner || s.logo ? <Image source={{ uri: imageUrl(s.banner || s.logo!) }} style={styles.photo} contentFit="cover" /> : <View style={[styles.photo, styles.empty]}><Ionicons name="storefront" size={28} color={C.brand700} /></View>}
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={1}>{s.name}</Text>
                  <Text style={styles.address} numberOfLines={2}>{s.address || 'Chưa cập nhật địa chỉ'}</Text>
                  {s.distanceKm != null && <Text style={styles.distance}>{s.distanceKm.toFixed(1)} km{s.etaMin ? ` · khoảng ${s.etaMin} phút` : ''}</Text>}
                  <Text style={styles.open}>Mở cửa hàng  ›</Text>
                </View>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
      {!!userLocation && <Pressable onPress={focusUser} style={[styles.locate, shadow]} accessibilityLabel="Về vị trí của tôi"><Ionicons name="locate" size={22} color={C.brand700} /></Pressable>}
      {!pinned.length && <View style={styles.notice}><Text style={styles.noticeText}>Chưa có cửa hàng nào được ghim trên bản đồ</Text></View>}
      {!!selected && <Pressable onPress={() => onPick(selected)} style={styles.bottom}><Text style={styles.bottomName} numberOfLines={1}>{selected.name}</Text><Ionicons name="chevron-forward" size={20} color={C.brand700} /></Pressable>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 460, borderRadius: R.lg, overflow: 'hidden', backgroundColor: C.line2, borderWidth: 1, borderColor: C.line },
  callout: { width: 280, flexDirection: 'row', padding: 8, borderRadius: 14, backgroundColor: '#fff' },
  photo: { width: 82, height: 82, borderRadius: 10 }, empty: { backgroundColor: C.brand50, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, marginLeft: 9 }, name: { fontSize: 15, fontWeight: '800', color: C.ink },
  address: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 3 }, distance: { color: C.brand700, fontSize: 11, fontWeight: '700', marginTop: 3 },
  open: { color: C.brand700, fontSize: 12, fontWeight: '800', marginTop: 4 },
  locate: { position: 'absolute', right: 12, top: 12, width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  notice: { position: 'absolute', top: 18, alignSelf: 'center', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 9, borderRadius: R.full },
  noticeText: { color: C.muted, fontWeight: '600', fontSize: 12 },
  bottom: { position: 'absolute', left: 12, right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: R.md },
  bottomName: { flex: 1, color: C.ink, fontWeight: '800' },
});
