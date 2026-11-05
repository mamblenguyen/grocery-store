import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotifications } from '@/context/notifications';
import { PLATFORM_NAME } from '@/context/settings';
import { useStore } from '@/context/store';
import { api, imageUrl, qs } from '@/lib/api';
import { useGrid } from '@/lib/layout';
import { C, R } from '@/lib/theme';
import type { MarketCategory, Paged, Product, PublicStore } from '@/lib/types';
import { ProductCard } from './ProductCard';
import { Row, SectionHeader } from './ui';

/** Trang chủ sàn: hàng hoá của tất cả đối tác */
export function MarketHome() {
  const { select } = useStore();
  const { unread } = useNotifications();
  const { cols, item, gap } = useGrid();
  const [cats, setCats] = useState<MarketCategory[]>([]);
  const [stores, setStores] = useState<PublicStore[]>([]);
  const [deals, setDeals] = useState<Product[]>([]);
  const [list, setList] = useState<Product[] | null>(null);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadPage = useCallback(async (p: number) => {
    const r = await api<Paged<Product>>('/market/products' + qs({ page: p, limit: 20, sort: 'rating' }), { store: null });
    setList((old) => (p === 1 ? r.items : [...(old ?? []), ...r.items])); setPage(p); setMore(p < r.totalPages);
  }, []);
  const load = useCallback(async () => {
    await Promise.all([
      api<MarketCategory[]>('/market/categories', { store: null }).then(setCats),
      api<Paged<PublicStore>>('/stores?limit=20', { store: null }).then((r) => setStores(r.items)),
      api<Paged<Product>>('/market/products?deals=true&limit=10&sort=best_selling', { store: null }).then((r) => setDeals(r.items)),
      loadPage(1),
    ]).catch(() => setList((l) => l ?? []));
  }, [loadPage]);
  useEffect(() => { load(); }, [load]);

  const header = (
    <View style={{ gap: 4 }}>
      {cats.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <SectionHeader title="Danh mục trên sàn" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {cats.map((c) => (
              <Pressable key={c.slug} onPress={() => router.push(`/products?category=${c.slug}&title=${encodeURIComponent(c.name)}`)} style={{ width: 78, alignItems: 'center', gap: 6 }}>
                <Image source={{ uri: imageUrl(c.image) }} style={{ width: 70, height: 70, borderRadius: 16, backgroundColor: C.brand50 }} contentFit="cover" />
                <Text style={{ fontSize: 11, textAlign: 'center', color: C.text, fontWeight: '600' }} numberOfLines={2}>{c.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      {stores.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <SectionHeader title="Cửa hàng trên sàn" icon="storefront-outline" action="Tất cả" onAction={() => router.push('/stores')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {stores.map((s) => (
              <Pressable key={s.id} testID={`market-store-${s.slug}`} onPress={() => select(s)} style={st.store}>
                <View style={st.logo}>{s.logo ? <Image source={{ uri: imageUrl(s.logo) }} style={{ width: '100%', height: '100%' }} /> : <Ionicons name="storefront" size={20} color={C.brand700} />}</View>
                <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', color: C.ink }} numberOfLines={1}>{s.name}</Text><Text style={{ fontSize: 11, color: C.muted }} numberOfLines={1}>{s.productCount} sản phẩm</Text></View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      {deals.length > 0 && (
        <View style={{ marginTop: 18, paddingVertical: 14, backgroundColor: C.accent }}>
          <Row gap={6} style={{ paddingHorizontal: 16, marginBottom: 10 }}><Ionicons name="pricetag-outline" size={20} color="#fff" /><Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>Giá sốc trên sàn</Text></Row>
          <FlatList horizontal data={deals} keyExtractor={(p) => String(p.id)} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }} renderItem={({ item: p }) => <ProductCard p={p} width={Math.min(170, item)} />} />
        </View>
      )}
      <View style={{ paddingHorizontal: 16, paddingTop: 18 }}><SectionHeader title="Gợi ý hôm nay" icon="sparkles-outline" /></View>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.white }}>
      <View style={st.header}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}><Text style={st.brand}>{PLATFORM_NAME}</Text><Text style={{ fontSize: 12, color: C.muted }}>Cả khu chợ tạp hoá trong một app</Text></View>
          <Pressable onPress={() => router.push('/account/notifications')} style={st.bell} accessibilityLabel="Thông báo">
            <Ionicons name="notifications-outline" size={22} color={C.ink} />
            {unread > 0 && <View style={st.dot}><Text style={st.dotT}>{unread > 9 ? '9+' : unread}</Text></View>}
          </Pressable>
        </Row>
        <Pressable testID="market-search" onPress={() => router.push('/products?focus=1')} style={st.search}>
          <Ionicons name="search" size={18} color={C.faint} />
          <Text style={{ color: C.faint, flex: 1 }}>Tìm trên toàn sàn: mì, sữa, gạo…</Text>
        </Pressable>
      </View>
      <FlatList
        key={cols}
        style={{ backgroundColor: C.bg }}
        data={list ?? []}
        numColumns={cols}
        keyExtractor={(p) => String(p.id)}
        columnWrapperStyle={cols > 1 ? { gap, paddingHorizontal: 16 } : undefined}
        contentContainerStyle={{ gap, paddingBottom: 24 }}
        ListHeaderComponent={header}
        renderItem={({ item: p }) => <ProductCard p={p} width={item} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => more && loadPage(page + 1)}
        ListFooterComponent={!list || more ? <ActivityIndicator color={C.brand600} style={{ margin: 16 }} /> : undefined}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 12, paddingTop: 6, gap: 12, backgroundColor: C.white },
  brand: { fontSize: 22, fontWeight: '800', color: C.brand700 },
  bell: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.line2, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  dotT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 46, borderRadius: R.md, borderWidth: 2, borderColor: C.brand600, paddingHorizontal: 12, backgroundColor: C.white },
  store: { width: 200, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderRadius: R.lg, padding: 10, borderWidth: 1, borderColor: C.line2 },
  logo: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.brand50, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
