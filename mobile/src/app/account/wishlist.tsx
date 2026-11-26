import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList } from 'react-native';
import { ProductCard } from '@/components/ProductCard';
import { Empty, Loading } from '@/components/ui';
import { useWishlist } from '@/context/wishlist';
import { api } from '@/lib/api';
import { useGrid } from '@/lib/layout';
import type { Product } from '@/lib/types';

export default function Wishlist() {
  const wl = useWishlist();
  const { cols, item, gap } = useGrid();
  const [list, setList] = useState<Product[] | null>(null);
  useFocusEffect(useCallback(() => { api<Product[]>('/wishlist').then(setList).catch(() => setList([])); }, []));
  const shown = list?.filter((p) => wl.has(p.id));
  return (
    <>
      <Stack.Screen options={{ title: 'Sản phẩm yêu thích' }} />
      {!shown ? <Loading /> : (
        <FlatList key={cols} data={shown} numColumns={cols} keyExtractor={(p) => String(p.id)} columnWrapperStyle={cols > 1 ? { gap } : undefined}
          contentContainerStyle={{ padding: 16, gap }} renderItem={({ item: p }) => <ProductCard p={p} width={item} />}
          ListEmptyComponent={<Empty icon="heart-outline" text="Chưa có sản phẩm yêu thích" />} />
      )}
    </>
  );
}
