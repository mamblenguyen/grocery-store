import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, TextInput, View } from 'react-native';
import { ProductCard } from '@/components/ProductCard';
import { Scanner } from '@/components/Scanner';
import { toast } from '@/components/Toast';
import { Chip, Empty, Loading, Row, T } from '@/components/ui';
import { api, qs } from '@/lib/api';
import { useGrid } from '@/lib/layout';
import { C, R } from '@/lib/theme';
import { useStore } from '@/context/store';
import type { Paged, Product } from '@/lib/types';

const SORTS = [['newest', 'Mới nhất'], ['best_selling', 'Bán chạy'], ['price_asc', 'Giá ↑'], ['price_desc', 'Giá ↓'], ['name', 'A–Z']];
const MARKET_SORTS = SORTS.filter(([k]) => k !== 'name');

export default function ProductList() {
  const params = useLocalSearchParams<{ category?: string; search?: string; sort?: string; featured?: string; title?: string; focus?: string }>();
  const { cols, item, gap } = useGrid();
  const [search, setSearch] = useState(params.search ?? '');
  const [query, setQuery] = useState(params.search ?? '');
  const [category, setCategory] = useState(params.category ?? '');
  const [sort, setSort] = useState(params.sort ?? 'newest');
  const [inStock, setInStock] = useState(false);
  // Chưa chọn cửa hàng → tìm trên toàn sàn
  const shop = useStore();
  const market = !shop.store;
  const [cats, setCats] = useState<{ slug: string; name: string }[]>([]);
  const [items, setItems] = useState<Product[] | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [more, setMore] = useState(false);
  const [scan, setScan] = useState(false);
  const input = useRef<any>(null);

  useEffect(() => { api<{ slug: string; name: string }[]>(market ? '/market/categories' : '/categories').then(setCats).catch(() => {}); if (params.focus) setTimeout(() => input.current?.focus(), 300); }, []); // eslint-disable-line
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 350); return () => clearTimeout(t); }, [search]);

  const load = useCallback(async (p: number) => {
    const r = market
      ? await api<Paged<Product>>('/market/products' + qs({ page: p, limit: 20, search: query, category, sort: sort === 'name' ? undefined : sort, featured: params.featured }))
      : await api<Paged<Product>>('/products' + qs({ page: p, limit: 20, search: query, category, sort, featured: params.featured, inStock: inStock || undefined }));
    setItems((old) => (p === 1 ? r.items : [...(old ?? []), ...r.items]));
    setTotal(r.total); setPage(p); setMore(p < r.totalPages);
    return r;
  }, [query, category, sort, inStock, params.featured, market]);
  useEffect(() => { setItems(null); load(1).catch(() => setItems([])); }, [load]);

  /** Khách quét mã vạch trên bao bì → tìm sản phẩm */
  const onScan = async (code: string) => {
    const r = await api<Paged<Product>>(`${market ? '/market/products' : '/products'}?search=${encodeURIComponent(code)}&limit=2`);
    if (r.items.length === 1) {
      const it = r.items[0];
      if (market && it.store) await shop.selectSlug(it.store.slug).catch(() => {}); // mở đúng cửa hàng bán sản phẩm
      router.push(`/products/${it.slug}`);
    }
    else if (r.items.length) { setSearch(code); }
    else toast(`Không tìm thấy sản phẩm có mã ${code}`, 'error');
  };

  const title = params.title || cats.find((c) => c.slug === category)?.name || (query ? `Tìm “${query}”` : 'Sản phẩm');
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title }} />
      <View style={{ backgroundColor: C.white, paddingHorizontal: 16, paddingBottom: 10, gap: 10 }}>
        <Row style={{ height: 44, borderRadius: R.md, borderWidth: 1.5, borderColor: C.line, paddingHorizontal: 12 }}>
          <Ionicons name="search" size={18} color={C.faint} />
          <TextInput testID="search-input" ref={input} value={search} onChangeText={setSearch} placeholder={market ? 'Tìm trên toàn sàn…' : 'Tìm sản phẩm, thương hiệu…'} placeholderTextColor={C.faint} returnKeyType="search" style={{ flex: 1, fontSize: 15, color: C.ink, outlineStyle: 'none' as any }} />
          {!!search && <Pressable onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={C.faint} /></Pressable>}
          <Pressable onPress={() => setScan(true)} accessibilityLabel="Quét mã vạch"><Ionicons name="barcode-outline" size={22} color={C.brand700} /></Pressable>
        </Row>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label="Tất cả" active={!category} onPress={() => setCategory('')} />
          {cats.map((c) => <Chip key={c.slug} label={c.name} active={category === c.slug} onPress={() => setCategory(c.slug)} />)}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {(market ? MARKET_SORTS : SORTS).map(([k, l]) => <Chip key={k} label={l} active={sort === k} onPress={() => setSort(k)} />)}
          {!market && <Chip label="Còn hàng" icon="checkmark-done-outline" active={inStock} onPress={() => setInStock(!inStock)} />}
        </ScrollView>
      </View>
      {!items ? <Loading /> : (
        <FlatList
          key={cols}
          data={items}
          numColumns={cols}
          keyExtractor={(p) => String(p.id)}
          columnWrapperStyle={cols > 1 ? { gap } : undefined}
          contentContainerStyle={{ padding: 16, gap }}
          ListHeaderComponent={<T variant="muted">{total} sản phẩm</T>}
          renderItem={({ item: p }) => <ProductCard p={p} width={item} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => more && load(page + 1)}
          ListFooterComponent={more ? <ActivityIndicator color={C.brand600} style={{ margin: 16 }} /> : undefined}
          ListEmptyComponent={<Empty icon="search" text="Không tìm thấy sản phẩm phù hợp" />}
        />
      )}
      <Scanner visible={scan} onClose={() => setScan(false)} onScan={onScan} title="Quét mã sản phẩm" />
    </View>
  );
}
