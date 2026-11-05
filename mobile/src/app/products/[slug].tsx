import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProductCard } from '@/components/ProductCard';
import { toast } from '@/components/Toast';
import { Badge, Button, Card, Empty, Input, Loading, Price, QtyStepper, Row, Stars, T } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useCart } from '@/context/cart';
import { useSettings } from '@/context/settings';
import { useWishlist } from '@/context/wishlist';
import { api, imageUrl } from '@/lib/api';
import { date, money } from '@/lib/format';
import { C, R } from '@/lib/theme';
import type { Paged, Product, Review, Variant } from '@/lib/types';

type ReviewPage = Paged<Review> & { distribution: Record<string, number> };

function Reviews({ p, onChanged }: { p: Product; onChanged: () => void }) {
  const { user } = useAuth();
  const [data, setData] = useState<ReviewPage | null>(null);
  const [mine, setMine] = useState<{ canReview: boolean; review: Review | null } | null>(null);
  const [form, setForm] = useState({ rating: 5, comment: '' });
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => api<ReviewPage>(`/products/${p.id}/reviews?limit=10`).then(setData).catch(() => {}), [p.id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!user) return;
    api<{ canReview: boolean; review: Review | null }>(`/products/${p.id}/reviews/me`).then((m) => { setMine(m); if (m.review) setForm({ rating: m.review.rating, comment: m.review.comment ?? '' }); }).catch(() => {});
  }, [user, p.id]);

  const submit = async () => {
    setSaving(true);
    try { await api(`/products/${p.id}/reviews`, { method: 'POST', json: form }); toast('Cảm ơn bạn đã đánh giá!'); load(); onChanged(); }
    catch (e: any) { toast(e.message, 'error'); } finally { setSaving(false); }
  };
  const total = data ? Object.values(data.distribution).reduce((a, b) => a + b, 0) : 0;

  return (
    <Card style={{ gap: 14 }}>
      <T variant="h3">Đánh giá sản phẩm</T>
      <Row gap={16}>
        <View style={{ alignItems: 'center' }}><Text style={{ fontSize: 36, fontWeight: '800', color: C.ink }}>{p.ratingAvg.toFixed(1)}</Text><Stars value={p.ratingAvg} /><T variant="muted">{p.ratingCount} đánh giá</T></View>
        <View style={{ flex: 1, gap: 4 }}>
          {[5, 4, 3, 2, 1].map((r) => (
            <Row key={r} gap={6}><Text style={{ width: 24, color: C.muted, fontSize: 12 }}>{r}★</Text>
              <View style={{ flex: 1, height: 6, backgroundColor: C.line2, borderRadius: 3 }}><View style={{ height: 6, borderRadius: 3, backgroundColor: '#fbbf24', width: `${total ? ((data?.distribution[r] ?? 0) / total) * 100 : 0}%` }} /></View>
            </Row>
          ))}
        </View>
      </Row>
      {user && mine?.canReview && (
        <View style={{ gap: 10, backgroundColor: C.brand50, borderRadius: R.md, padding: 12 }}>
          <T variant="h3">{mine.review ? 'Cập nhật đánh giá' : 'Viết đánh giá'}</T>
          <Row gap={4}>{[1, 2, 3, 4, 5].map((i) => <Pressable key={i} onPress={() => setForm({ ...form, rating: i })} hitSlop={4}><Ionicons name={i <= form.rating ? 'star' : 'star-outline'} size={30} color="#fbbf24" /></Pressable>)}</Row>
          <Input value={form.comment} onChangeText={(comment) => setForm({ ...form, comment })} placeholder="Chia sẻ cảm nhận của bạn…" multiline style={{ minHeight: 70, textAlignVertical: 'top' }} />
          <Button title="Gửi đánh giá" onPress={submit} loading={saving} />
        </View>
      )}
      {user && mine && !mine.canReview && <T variant="muted">Bạn có thể đánh giá sau khi mua sản phẩm và đơn hàng hoàn thành.</T>}
      {!data ? <Loading full={false} /> : !data.items.length ? <T variant="muted">Chưa có đánh giá nào</T> : data.items.map((r) => (
        <View key={r.id} style={{ borderTopWidth: 1, borderTopColor: C.line2, paddingTop: 10, gap: 3 }}>
          <Row style={{ justifyContent: 'space-between' }}><Text style={{ fontWeight: '700', color: C.ink }}>{r.user.fullName}</Text><T variant="muted">{date(r.createdAt)}</T></Row>
          <Stars value={r.rating} size={12} />
          {!!r.comment && <T>{r.comment}</T>}
        </View>
      ))}
    </Card>
  );
}

export default function ProductDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cart = useCart();
  const wl = useWishlist();
  const { settings } = useSettings();
  const [p, setP] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);

  const load = useCallback((init = false) => api<Product>(`/products/${slug}`).then((prod) => {
    setP(prod);
    if (!init) return;
    const first = prod.variants.find((v) => v.stock > 0) ?? prod.variants[0];
    if (first && prod.options) {
      const s: Record<number, number> = {};
      prod.options.forEach((o) => { const id = o.values.find((val) => first.optionValueIds?.includes(val.id))?.id; if (id) s[o.id] = id; });
      setSelected(s);
    }
  }).catch((e) => setError(e.message)), [slug]);
  useEffect(() => { load(true); }, [load]);

  const variant: Variant | undefined = useMemo(() => {
    if (!p) return;
    if (!p.options?.length) return p.variants[0];
    const ids = Object.values(selected);
    if (ids.length !== p.options.length) return;
    return p.variants.find((v) => ids.every((id) => v.optionValueIds?.includes(id)));
  }, [p, selected]);

  if (error) return <Empty icon="alert-circle-outline" text={error}><Button title="Quay lại" onPress={() => router.back()} /></Empty>;
  if (!p) return <Loading />;

  const availability = (optionId: number, valueId: number) => {
    const others = Object.entries(selected).filter(([o]) => Number(o) !== optionId).map(([, v]) => v);
    const m = p.variants.filter((v) => v.optionValueIds?.includes(valueId) && others.every((o) => v.optionValueIds?.includes(o)));
    return !m.length ? 'none' : m.some((x) => x.stock > 0) ? 'ok' : 'out';
  };
  const images = [...new Set([variant?.image, p.thumbnail, ...(p.images ?? [])].filter(Boolean) as string[])];
  const imgW = Math.min(width, 640);
  const discount = variant?.compareAtPrice && variant.compareAtPrice > variant.price ? Math.round((1 - variant.price / variant.compareAtPrice) * 100) : 0;
  const canBuy = !!variant && variant.stock > 0;

  const add = (buyNow = false) => {
    if (!variant) return toast('Vui lòng chọn đầy đủ phân loại', 'error');
    const inCart = cart.items.find((i) => i.variantId === variant.id)?.quantity ?? 0;
    if (inCart + qty > variant.stock) return toast(`Chỉ còn ${variant.stock} sản phẩm (giỏ đã có ${inCart})`, 'error');
    cart.add({ variantId: variant.id, productId: p.id, slug: p.slug, productName: p.name, variantName: variant.name, image: variant.image || p.thumbnail, price: variant.price, stock: variant.stock }, qty);
    if (buyNow) router.push('/checkout'); else toast('Đã thêm vào giỏ hàng');
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: '', headerRight: () => <Pressable onPress={() => wl.toggle(p.id)} hitSlop={8} accessibilityLabel="Yêu thích"><Ionicons name={wl.has(p.id) ? 'heart' : 'heart-outline'} size={24} color={wl.has(p.id) ? C.red : C.ink} /></Pressable> }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
        <View style={{ alignItems: 'center', backgroundColor: C.white }}>
          <FlatList horizontal pagingEnabled data={images} keyExtractor={(i) => i} style={{ width: imgW, height: imgW, flexGrow: 0 }} showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setImgIdx(Math.round(e.nativeEvent.contentOffset.x / imgW))}
            renderItem={({ item }) => <Image source={{ uri: imageUrl(item) }} style={{ width: imgW, height: imgW }} contentFit="cover" />} />
          {images.length > 1 && <Row gap={5} style={{ position: 'absolute', bottom: 10 }}>{images.map((_, i) => <View key={i} style={{ width: i === imgIdx ? 18 : 7, height: 7, borderRadius: 4, backgroundColor: i === imgIdx ? C.brand600 : 'rgba(0,0,0,.2)' }} />)}</Row>}
          {discount > 0 && <Badge label={`-${discount}%`} fg="#fff" bg={C.red} style={{ position: 'absolute', top: 12, left: 12 }} />}
        </View>
        <View style={{ padding: 16, gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
          <View style={{ gap: 6 }}>
            {!!p.brand && <Text style={{ color: C.brand700, fontWeight: '700', fontSize: 12, letterSpacing: 0.5 }}>{p.brand.toUpperCase()}</Text>}
            <T variant="h1" style={{ fontSize: 22 }}>{p.name}</T>
            <Row gap={8}>{p.ratingCount > 0 ? <><Stars value={p.ratingAvg} /><T variant="muted">{p.ratingCount} đánh giá</T></> : <T variant="muted">Chưa có đánh giá</T>}<T variant="muted">· Đã bán {p.soldCount}</T></Row>
            <View style={{ backgroundColor: C.brand50, borderRadius: R.md, padding: 14, marginTop: 4 }}>
              <Price value={variant?.price ?? p.minPrice} compare={variant?.compareAtPrice} size={26} />
              {!variant && p.maxPrice > p.minPrice && <T variant="muted">đến {money(p.maxPrice)}</T>}
            </View>
          </View>

          {p.options?.map((o) => (
            <View key={o.id} style={{ gap: 8 }}>
              <Text style={{ fontWeight: '700', color: C.ink }}>{o.name}: <Text style={{ fontWeight: '400', color: C.muted }}>{o.values.find((v) => v.id === selected[o.id])?.value}</Text></Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {o.values.map((val) => {
                  const state = availability(o.id, val.id);
                  const active = selected[o.id] === val.id;
                  return (
                    <Pressable key={val.id} testID={`opt-${val.value}`} disabled={state === 'none'} onPress={() => { setSelected((s) => ({ ...s, [o.id]: val.id })); setQty(1); }}
                      style={[st.opt, active && st.optActive, state === 'none' && { opacity: 0.35 }]}>
                      <Text style={[{ color: state === 'out' && !active ? C.faint : C.ink, fontWeight: active ? '700' : '500' }, state === 'none' && { textDecorationLine: 'line-through' }]}>{val.value}{state === 'out' ? ' (hết)' : ''}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          <Row style={{ justifyContent: 'space-between' }}>
            <QtyStepper value={qty} onChange={setQty} max={Math.max(1, variant?.stock ?? 1)} />
            <Text style={{ fontWeight: '600', color: !variant ? C.muted : variant.stock <= 0 ? C.red : variant.stock <= variant.lowStockThreshold ? C.accent : C.brand700 }}>
              {!variant ? 'Chọn phân loại' : variant.stock <= 0 ? 'Hết hàng' : variant.stock <= variant.lowStockThreshold ? `Chỉ còn ${variant.stock}!` : `Còn ${variant.stock} ${p.unit ?? ''}`}
            </Text>
          </Row>
          <Row gap={14} style={{ flexWrap: 'wrap' }}>
            <Row gap={6}><Ionicons name="bicycle-outline" size={18} color={C.brand600} /><T variant="small">{settings.freeShippingThreshold ? `Free ship từ ${money(settings.freeShippingThreshold)}` : 'Giao nhanh'}</T></Row>
            <Row gap={6}><Ionicons name="refresh-outline" size={18} color={C.brand600} /><T variant="small">Đổi trả 7 ngày</T></Row>
          </Row>

          <Card style={{ gap: 8 }}>
            <T variant="h3">Mô tả sản phẩm</T>
            <T style={{ lineHeight: 22 }}>{p.description || 'Đang cập nhật.'}</T>
            {variant && <T variant="muted">SKU: {variant.sku}{variant.barcode ? ` · Mã vạch: ${variant.barcode}` : ''}</T>}
          </Card>
          <Reviews p={p} onChanged={() => load()} />
          {!!p.related?.length && (
            <View>
              <T variant="h2" style={{ marginBottom: 10 }}>Có thể bạn cũng thích</T>
              <FlatList horizontal data={p.related} keyExtractor={(x) => String(x.id)} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }} renderItem={({ item }) => <ProductCard p={item} width={160} />} />
            </View>
          )}
        </View>
      </ScrollView>
      <View style={[st.bar, { paddingBottom: insets.bottom + 10 }]}>
        <Button testID="add-to-cart" title="Thêm vào giỏ" icon="cart-outline" variant="soft" size="lg" disabled={!canBuy} onPress={() => add()} style={{ flex: 1 }} />
        <Button testID="buy-now" title="Mua ngay" size="lg" disabled={!canBuy} onPress={() => add(true)} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  opt: { borderWidth: 2, borderColor: C.line, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: C.white },
  optActive: { borderColor: C.brand600, backgroundColor: C.brand50 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.line },
});
