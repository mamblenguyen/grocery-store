import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCart } from '@/context/cart';
import { useStore } from '@/context/store';
import { useWishlist } from '@/context/wishlist';
import { imageUrl } from '@/lib/api';
import { C, R, shadow } from '@/lib/theme';
import type { Product } from '@/lib/types';
import { toast } from './Toast';
import { Price, Stars } from './ui';

export function ProductCard({ p, width }: { p: Product; width: number }) {
  const cart = useCart();
  const wl = useWishlist();
  const shop = useStore();
  // Sản phẩm của cửa hàng khác (VD: trong danh sách yêu thích) → chuyển cửa hàng trước khi mở
  const otherStore = !!p.store && p.store.slug !== shop.store?.slug;
  const open = async () => {
    if (otherStore) {
      try { await shop.selectSlug(p.store!.slug); } catch (e: any) { return toast(e.message, 'error'); }
    }
    router.push(`/products/${p.slug}`);
  };
  const active = p.variants.filter((v) => v.isActive !== false);
  const best = active.reduce<(typeof active)[number] | undefined>((b, v) => {
    const o = v.compareAtPrice && v.compareAtPrice > v.price ? 1 - v.price / v.compareAtPrice : 0;
    const bo = b?.compareAtPrice && b.compareAtPrice > b.price ? 1 - b.price / b.compareAtPrice : 0;
    return o > bo ? v : b;
  }, undefined);
  const discount = best?.compareAtPrice ? Math.round((1 - best.price / best.compareAtPrice) * 100) : 0;
  const out = active.every((v) => v.stock <= 0);
  const single = active.length === 1 ? active[0] : null;

  const quickAdd = () => {
    if (!single) return open();
    // Sản phẩm của cửa hàng khác (trang sàn) → thêm thẳng vào giỏ của cửa hàng đó
    if (otherStore) {
      const line = { variantId: single.id, productId: p.id, slug: p.slug, productName: p.name, variantName: single.name, image: p.thumbnail, price: single.price, stock: single.stock };
      if (!cart.addTo({ slug: p.store!.slug, name: p.store!.name }, line)) return toast(`Chỉ còn ${single.stock} sản phẩm`, 'error');
      return toast(`Đã thêm "${p.name}" vào giỏ ${p.store!.name}`);
    }
    const inCart = cart.items.find((i) => i.variantId === single.id)?.quantity ?? 0;
    if (inCart >= single.stock) return toast(`Chỉ còn ${single.stock} sản phẩm`, 'error');
    cart.add({ variantId: single.id, productId: p.id, slug: p.slug, productName: p.name, variantName: single.name, image: p.thumbnail, price: single.price, stock: single.stock });
    toast(`Đã thêm "${p.name}"`);
  };

  return (
    <Pressable testID={`product-${p.slug}`} onPress={open} style={({ pressed }) => [st.card, shadow, { width }, pressed && { opacity: 0.92 }]}>
      <View>
        <Image source={{ uri: imageUrl(p.thumbnail) }} style={{ width: '100%', aspectRatio: 1, backgroundColor: C.line2 }} contentFit="cover" transition={150} />
        {discount > 0 && <View style={st.sale}><Text style={st.saleT}>-{discount}%</Text><Text style={st.saleS}>GIẢM</Text></View>}
        {p.isFeatured && <View style={st.feat}><Text style={{ fontSize: 10, fontWeight: '800', color: '#451a03' }}>★ Nổi bật</Text></View>}
        <Pressable hitSlop={8} onPress={() => wl.toggle(p.id)} style={st.heart} accessibilityLabel="Yêu thích">
          <Ionicons name={wl.has(p.id) ? 'heart' : 'heart-outline'} size={18} color={wl.has(p.id) ? C.red : C.muted} />
        </Pressable>
        {out && <View style={st.out}><Text style={st.outT}>Tạm hết hàng</Text></View>}
      </View>
      <View style={{ padding: 10, flex: 1 }}>
        {otherStore ? (
          <Text style={[st.brand, { color: C.brand700 }]} numberOfLines={1}>🏪 {p.store!.name}</Text>
        ) : <Text style={st.brand} numberOfLines={1}>{(p.brand || p.category?.name || '').toUpperCase()}</Text>}
        <Text style={st.name} numberOfLines={2}>{p.name}</Text>
        <View style={{ height: 16, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {p.ratingCount > 0 && <><Stars value={p.ratingAvg} size={11} /><Text style={st.meta}>({p.ratingCount})</Text></>}
          {p.soldCount > 0 && <Text style={st.meta}>Đã bán {p.soldCount}</Text>}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 6 }}>
          <View style={{ flex: 1 }}>
            <Price value={p.minPrice} size={16} style={discount > 0 ? { color: '#e11d48' } : undefined} />
            {discount > 0 && best?.compareAtPrice ? <Text style={st.strike}>{best.compareAtPrice.toLocaleString('vi-VN')}₫</Text> : <Text style={st.meta}>{active.length > 1 ? `${active.length} phân loại` : p.unit ? `/ ${p.unit}` : ' '}</Text>}
          </View>
          {!out && (
            <Pressable testID={`quick-add-${p.slug}`} onPress={quickAdd} hitSlop={6} style={st.add} accessibilityLabel="Thêm vào giỏ">
              <Ionicons name={single ? 'add' : 'cart-outline'} size={single ? 22 : 18} color="#fff" />
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: C.white, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#e8edf3' },
  sale: { position: 'absolute', top: 0, left: 10, backgroundColor: '#e11d48', borderBottomLeftRadius: 8, borderBottomRightRadius: 8, paddingHorizontal: 7, paddingTop: 5, paddingBottom: 4, alignItems: 'center' },
  saleT: { color: C.white, fontWeight: '900', fontSize: 12, lineHeight: 13 },
  saleS: { color: C.white, fontWeight: '700', fontSize: 8, letterSpacing: 0.5 },
  feat: { position: 'absolute', bottom: 8, left: 8, backgroundColor: '#fbbf24', borderRadius: R.full, paddingHorizontal: 7, paddingVertical: 2 },
  heart: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,.92)', alignItems: 'center', justifyContent: 'center' },
  out: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(255,255,255,.6)', alignItems: 'center', justifyContent: 'center' },
  outT: { backgroundColor: C.ink, color: C.white, fontWeight: '700', fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.full, overflow: 'hidden' },
  brand: { fontSize: 10, fontWeight: '700', color: C.faint, letterSpacing: 0.5 },
  name: { fontSize: 14, fontWeight: '500', color: C.ink, minHeight: 38, lineHeight: 19 },
  meta: { fontSize: 11, color: C.faint },
  strike: { fontSize: 11, color: C.faint, textDecorationLine: 'line-through' },
  add: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.brand600, alignItems: 'center', justifyContent: 'center' },
});
