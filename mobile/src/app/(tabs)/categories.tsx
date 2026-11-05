import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Loading } from '@/components/ui';
import { useStore } from '@/context/store';
import { api, imageUrl } from '@/lib/api';
import { C, R, shadow } from '@/lib/theme';
import type { Category } from '@/lib/types';

export default function Categories() {
  const { store } = useStore();
  const [cats, setCats] = useState<Category[] | null>(null);
  // Chưa vào cửa hàng → danh mục gộp của toàn sàn
  useEffect(() => {
    setCats(null);
    (store ? api<Category[]>('/categories') : api<{ slug: string; name: string; image: string | null; productCount: number }[]>('/market/categories', { store: null })
      .then((l) => l.map((c, i) => ({ id: i + 1, slug: c.slug, name: c.name, image: c.image, _count: { products: c.productCount } }) as unknown as Category)))
      .then(setCats).catch(() => setCats([]));
  }, [store?.slug]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!cats) return <Loading />;
  return (
    <FlatList
      data={[{ id: 0, name: 'Tất cả sản phẩm', slug: '', image: null, _count: undefined } as unknown as Category, ...cats]}
      keyExtractor={(c) => String(c.id)}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      renderItem={({ item: c }) => (
        <Pressable onPress={() => router.push(c.slug ? `/products?category=${c.slug}&title=${encodeURIComponent(c.name)}` : '/products')}
          style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.white, borderRadius: R.lg, padding: 10 }, shadow, pressed && { opacity: 0.85 }]}>
          {c.image ? <Image source={{ uri: imageUrl(c.image) }} style={{ width: 56, height: 56, borderRadius: 12 }} contentFit="cover" />
            : <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: C.brand50, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="grid-outline" size={24} color={C.brand700} /></View>}
          <View style={{ flex: 1 }}><Text style={{ fontSize: 16, fontWeight: '700', color: C.ink }}>{c.name}</Text>{c._count && <Text style={{ color: C.muted, fontSize: 13 }}>{c._count.products} sản phẩm</Text>}</View>
          <Ionicons name="chevron-forward" size={20} color={C.faint} />
        </Pressable>
      )}
    />
  );
}
