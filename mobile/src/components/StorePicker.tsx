import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { parseStoreCode, useStore } from '@/context/store';
import { PLATFORM_NAME } from '@/context/settings';
import { api, imageUrl, qs } from '@/lib/api';
import { useGrid } from '@/lib/layout';
import { C, R, shadow } from '@/lib/theme';
import type { Paged, PublicStore } from '@/lib/types';
import { Scanner } from './Scanner';
import { toast } from './Toast';
import { Empty, Row } from './ui';

/** Danh bạ cửa hàng của nền tảng: tìm kiếm hoặc quét mã QR dán tại quầy */
export function StorePicker({ onPicked, header }: { onPicked?: (s: PublicStore) => void; header?: React.ReactNode }) {
  const { store: current, select, selectSlug } = useStore();
  const { width } = useGrid();
  const [q, setQ] = useState('');
  const [list, setList] = useState<PublicStore[] | null>(null);
  const [scan, setScan] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (search = q) => {
    try { setList((await api<Paged<PublicStore>>('/stores' + qs({ search, limit: 50 }), { store: null })).items); }
    catch (e: any) { toast(e.message, 'error'); setList([]); }
  }, [q]);
  useEffect(() => { const t = setTimeout(() => load(q), 250); return () => clearTimeout(t); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (s: PublicStore) => { select(s); onPicked?.(s); };
  const onScan = async (code: string) => {
    const slug = parseStoreCode(code);
    if (!slug) return toast('Mã QR không phải mã cửa hàng', 'error');
    try { const s = await selectSlug(slug); toast(`Đã mở ${s.name}`); onPicked?.(s); }
    catch (e: any) { toast(e.message, 'error'); }
  };
  const cols = width >= 900 ? 3 : width >= 600 ? 2 : 1;

  return (
    <>
      <FlatList
        key={cols}
        numColumns={cols}
        data={list ?? []}
        keyExtractor={(s) => String(s.id)}
        columnWrapperStyle={cols > 1 ? { gap: 12 } : undefined}
        contentContainerStyle={{ padding: 16, gap: 12, maxWidth: 1100, width: '100%', alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            {header}
            <Row gap={8}>
              <View style={st.search}>
                <Ionicons name="search" size={18} color={C.faint} />
                <TextInput testID="store-search" value={q} onChangeText={setQ} placeholder="Tìm tên cửa hàng, khu vực…" placeholderTextColor={C.faint} style={{ flex: 1, height: 44, color: C.ink }} />
              </View>
              <Pressable testID="store-scan" onPress={() => setScan(true)} style={st.scanBtn} accessibilityLabel="Quét mã QR cửa hàng">
                <Ionicons name="qr-code-outline" size={22} color="#fff" />
              </Pressable>
            </Row>
            {list === null && <ActivityIndicator color={C.brand600} style={{ marginTop: 30 }} />}
          </View>
        }
        ListEmptyComponent={list ? <Empty icon="storefront-outline" text="Không tìm thấy cửa hàng phù hợp" /> : undefined}
        renderItem={({ item: s }) => (
          <Pressable testID={`store-${s.slug}`} onPress={() => pick(s)} style={({ pressed }) => [st.card, shadow, { flex: 1 }, pressed && { opacity: 0.9 }, current?.id === s.id && { borderColor: C.brand500 }]}>
            <View style={st.cover}>
              {s.banner ? <Image source={{ uri: imageUrl(s.banner) }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
              {!s.acceptingOrders && <View style={st.paused}><Text style={{ color: '#92400e', fontSize: 11, fontWeight: '700' }}>Tạm ngưng nhận đơn</Text></View>}
            </View>
            <View style={{ padding: 12, paddingTop: 0 }}>
              <View style={st.logo}>{s.logo ? <Image source={{ uri: imageUrl(s.logo) }} style={{ width: '100%', height: '100%' }} /> : <Ionicons name="storefront" size={22} color={C.brand700} />}</View>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={st.name} numberOfLines={1}>{s.name}</Text>
                {current?.id === s.id && <Text style={{ color: C.brand700, fontWeight: '700', fontSize: 12 }}>Đang chọn</Text>}
              </Row>
              {!!s.slogan && <Text style={st.sub} numberOfLines={1}>{s.slogan}</Text>}
              {!!s.address && <Row gap={4} style={{ marginTop: 6 }}><Ionicons name="location-outline" size={13} color={C.faint} /><Text style={st.sub} numberOfLines={1}>{s.address}</Text></Row>}
              <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={st.sub}>{s.productCount} sản phẩm{s.openingHours ? ` · ${s.openingHours}` : ''}</Text>
                <Ionicons name="chevron-forward" size={18} color={C.brand700} />
              </Row>
            </View>
          </Pressable>
        )}
      />
      <Scanner visible={scan} onClose={() => setScan(false)} onScan={onScan} title="Quét mã QR của cửa hàng" />
    </>
  );
}

/** Lời chào khi chưa chọn cửa hàng */
export function PlatformIntro() {
  return (
    <View style={st.intro}>
      <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800' }}>{PLATFORM_NAME}</Text>
      <Text style={{ color: 'rgba(255,255,255,.9)', marginTop: 4 }}>Chọn tạp hoá quen của bạn để bắt đầu đi chợ. Bạn có thể quét mã QR dán tại quầy cửa hàng.</Text>
    </View>
  );
}

const st = StyleSheet.create({
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: R.md, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, backgroundColor: C.white },
  scanBtn: { width: 46, height: 46, borderRadius: R.md, backgroundColor: C.brand600, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.white, borderRadius: R.lg, overflow: 'hidden', borderWidth: 1, borderColor: C.line2 },
  cover: { height: 90, backgroundColor: C.brand600 },
  paused: { position: 'absolute', top: 8, right: 8, backgroundColor: C.amber50, paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.full },
  logo: { width: 52, height: 52, borderRadius: 14, marginTop: -26, marginBottom: 6, borderWidth: 3, borderColor: '#fff', backgroundColor: C.brand50, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  name: { fontSize: 16, fontWeight: '800', color: C.ink, flex: 1 },
  sub: { fontSize: 12, color: C.muted, flexShrink: 1 },
  intro: { backgroundColor: C.brand700, borderRadius: R.xl, padding: 18 },
});
