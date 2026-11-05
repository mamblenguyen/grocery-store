import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProductCard } from '@/components/ProductCard';
import { Loading, Row, SectionHeader, T } from '@/components/ui';
import { useNotifications } from '@/context/notifications';
import { useSettings } from '@/context/settings';
import { useStore } from '@/context/store';
import { PlatformIntro, StorePicker } from '@/components/StorePicker';
import { api, imageUrl } from '@/lib/api';
import { money } from '@/lib/format';
import { useGrid } from '@/lib/layout';
import { C, R } from '@/lib/theme';
import type { Category, Paged, Product } from '@/lib/types';

export default function Home() {
  const { store, ready } = useStore();
  if (!ready) return <Loading />;
  // Chưa chọn cửa hàng → hiện danh bạ cửa hàng của nền tảng
  if (!store)
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
        <StorePicker header={<PlatformIntro />} />
      </SafeAreaView>
    );
  return <StoreHome key={store.slug} />;
}

function StoreHome() {
  const { settings } = useSettings();
  const { store } = useStore();
  const { unread } = useNotifications();
  const { item, width, isTablet } = useGrid();
  const [cats, setCats] = useState<Category[]>([]);
  const [sec, setSec] = useState<{ featured: Product[]; best: Product[]; latest: Product[]; deals: Product[] } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [slide, setSlide] = useState(0);

  const load = useCallback(async () => {
    const [c, f, b, l, all] = await Promise.all([
      api<Category[]>('/categories'),
      api<Paged<Product>>('/products?featured=true&limit=10'),
      api<Paged<Product>>('/products?sort=best_selling&limit=10'),
      api<Paged<Product>>('/products?sort=newest&limit=10'),
      api<Paged<Product>>('/products?limit=40'),
    ]).catch(() => [[], { items: [] }, { items: [] }, { items: [] }, { items: [] }] as any);
    setCats(c);
    setSec({ featured: f.items, best: b.items, latest: l.items, deals: all.items.filter((p: Product) => p.variants.some((v) => v.compareAtPrice && v.compareAtPrice > v.price)).slice(0, 10) });
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (settings.banners.length < 2) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % settings.banners.length), 5000);
    return () => clearInterval(t);
  }, [settings.banners.length]);

  const cardW = isTablet ? item : Math.min(170, item);
  const Rail = ({ data }: { data: Product[] }) => (
    <FlatList horizontal data={data} keyExtractor={(p) => String(p.id)} showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingBottom: 6 }} renderItem={({ item: p }) => <ProductCard p={p} width={cardW} />} />
  );
  const banner = settings.banners[slide];
  const catCols = width < 400 ? 4 : width < 700 ? 5 : 8;
  const catW = (width - 32 - (catCols - 1) * 10) / catCols;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.white }}>
      <View style={st.header}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable testID="change-store" onPress={() => router.push('/stores')} style={{ flex: 1, marginRight: 10 }} accessibilityLabel="Đổi cửa hàng">
            <Row gap={6}>
              <Text style={st.brand} numberOfLines={1}>{settings.storeName || store?.name}</Text>
              <Ionicons name="chevron-down" size={18} color={C.brand700} />
            </Row>
            <Text style={st.slogan} numberOfLines={1}>{settings.slogan || 'Chạm để đổi cửa hàng'}</Text>
          </Pressable>
          <Pressable testID="bell" onPress={() => router.push('/account/notifications')} style={st.bell} accessibilityLabel="Thông báo">
            <Ionicons name="notifications-outline" size={22} color={C.ink} />
            {unread > 0 && <View style={st.dot}><Text style={st.dotT}>{unread > 9 ? '9+' : unread}</Text></View>}
          </Pressable>
        </Row>
        <Pressable testID="home-search" onPress={() => router.push('/products?focus=1')} style={st.search}>
          <Ionicons name="search" size={18} color={C.faint} />
          <Text style={{ color: C.faint, flex: 1 }}>Tìm rau củ, mì gói, sữa, nước giặt…</Text>
          <Ionicons name="barcode-outline" size={20} color={C.brand700} />
        </Pressable>
      </View>
      <ScrollView style={{ backgroundColor: C.bg }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        {settings.announcement ? <View style={st.announce}><Text style={st.announceT} numberOfLines={2}>{settings.announcement}</Text></View> : null}
        {banner && (
          <Pressable onPress={() => banner.link && router.push(banner.link.replace(/^\//, '/') as any)} style={[st.banner, { height: Math.min(220, (width - 32) * 0.48) }]}>
            <Image source={{ uri: imageUrl(banner.image) }} style={StyleSheet.absoluteFill} contentFit="cover" />
            <View style={st.bannerShade} />
            <View style={{ padding: 18, maxWidth: '80%' }}>
              {!!banner.title && <Text style={st.bannerTitle}>{banner.title}</Text>}
              {!!banner.subtitle && <Text style={st.bannerSub} numberOfLines={2}>{banner.subtitle}</Text>}
              {!!banner.buttonText && <View style={st.bannerBtn}><Text style={{ color: '#fff', fontWeight: '700' }}>{banner.buttonText}</Text></View>}
            </View>
            <Row gap={5} style={st.dots}>{settings.banners.map((_, i) => <View key={i} style={[st.pager, i === slide && { width: 20, backgroundColor: '#fff' }]} />)}</Row>
          </Pressable>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingVertical: 14 }}>
          {[['bicycle-outline', 'Giao nhanh 2h', settings.freeShippingThreshold ? `Free ship từ ${money(settings.freeShippingThreshold)}` : ''], ['leaf-outline', 'Tươi mỗi ngày', 'Nhập hàng mỗi sáng'], ['shield-checkmark-outline', 'Thanh toán an toàn', 'COD · VietQR · VNPay']].map(([i, a, b]) => (
            <Row key={a} gap={10} style={st.perk}><View style={st.perkIcon}><Ionicons name={i as any} size={20} color={C.brand700} /></View><View><Text style={{ fontWeight: '700', color: C.ink, fontSize: 13 }}>{a}</Text><Text style={{ fontSize: 11, color: C.muted }}>{b}</Text></View></Row>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 16 }}>
          <SectionHeader title="Danh mục" action="Tất cả" onAction={() => router.push('/categories')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {cats.map((c) => (
              <Pressable key={c.id} onPress={() => router.push(`/products?category=${c.slug}&title=${encodeURIComponent(c.name)}`)} style={{ width: catW, alignItems: 'center', gap: 6 }}>
                <Image source={{ uri: imageUrl(c.image) }} style={{ width: catW - 8, height: catW - 8, borderRadius: 16, backgroundColor: C.brand50 }} contentFit="cover" />
                <Text style={{ fontSize: 11, textAlign: 'center', color: C.text, fontWeight: '600' }} numberOfLines={2}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {!sec ? <Loading full={false} /> : (
          <>
            {sec.deals.length > 0 && (
              <View style={st.deals}>
                <Row style={{ paddingHorizontal: 16, marginBottom: 12, justifyContent: 'space-between' }}>
                  <Row gap={6}><Ionicons name="pricetag-outline" size={20} color="#fff" /><T variant="h2" style={{ color: '#fff' }}>Giá sốc hôm nay</T></Row>
                </Row>
                <Rail data={sec.deals} />
              </View>
            )}
            {[['Sản phẩm nổi bật', 'sparkles-outline', sec.featured, 'featured=true'], ['Bán chạy nhất', 'flame-outline', sec.best, 'sort=best_selling'], ['Hàng mới về', 'leaf-outline', sec.latest, 'sort=newest']].map(([title, icon, data, q]) => (data as Product[]).length ? (
              <View key={title as string} style={{ marginTop: 22 }}>
                <View style={{ paddingHorizontal: 16 }}><SectionHeader title={title as string} icon={icon as any} action="Xem tất cả" onAction={() => router.push(`/products?${q}&title=${encodeURIComponent(title as string)}`)} /></View>
                <Rail data={data as Product[]} />
              </View>
            ) : null)}
          </>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 12, paddingTop: 6, gap: 12, backgroundColor: C.white },
  brand: { fontSize: 22, fontWeight: '800', color: C.brand700, flexShrink: 1 },
  slogan: { fontSize: 12, color: C.muted },
  bell: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.line2, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  dotT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 46, borderRadius: R.md, borderWidth: 2, borderColor: C.brand600, paddingHorizontal: 12, backgroundColor: C.white },
  announce: { backgroundColor: C.brand700, paddingVertical: 8, paddingHorizontal: 16 },
  announceT: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  banner: { marginHorizontal: 16, marginTop: 14, borderRadius: R.xl, overflow: 'hidden', justifyContent: 'center', backgroundColor: C.brand700 },
  bannerShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,.35)' },
  bannerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  bannerSub: { color: 'rgba(255,255,255,.9)', marginTop: 4 },
  bannerBtn: { backgroundColor: C.accent, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.md, marginTop: 10 },
  dots: { position: 'absolute', bottom: 10, alignSelf: 'center' },
  pager: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,.55)' },
  perk: { backgroundColor: C.white, borderRadius: R.md, padding: 10, paddingRight: 14, borderWidth: 1, borderColor: C.line2 },
  perkIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.brand50, alignItems: 'center', justifyContent: 'center' },
  deals: { marginTop: 22, paddingVertical: 16, backgroundColor: C.accent },
});
