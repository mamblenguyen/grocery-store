import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Empty, QtyStepper, Row, T } from '@/components/ui';
import { useCart } from '@/context/cart';
import { useSettings } from '@/context/settings';
import { api, imageUrl } from '@/lib/api';
import { money } from '@/lib/format';
import { C, R } from '@/lib/theme';

export default function CartTab() {
  const { items, update, remove, subtotal, clear } = useCart();
  const { settings } = useSettings();
  const insets = useSafeAreaInsets();
  const [error, setError] = useState('');
  useEffect(() => {
    if (!items.length) return setError('');
    api('/orders/preview', { method: 'POST', json: { items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })) } }).then(() => setError('')).catch((e) => setError(e.message));
  }, [JSON.stringify(items.map((i) => [i.variantId, i.quantity]))]); // eslint-disable-line

  if (!items.length) return <Empty icon="cart-outline" text="Giỏ hàng của bạn đang trống"><Button title="Mua sắm ngay" onPress={() => router.push('/products')} /></Empty>;
  const t = settings.freeShippingThreshold;
  const ship = t && subtotal >= t ? 0 : settings.shippingFee;
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.variantId)}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 200 }}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 4 }}>
            {!!t && (
              <View style={{ backgroundColor: C.brand50, borderRadius: R.md, padding: 12, gap: 8 }}>
                <Row gap={6}><Ionicons name="bicycle-outline" size={18} color={C.brand700} /><Text style={{ color: C.brand800, fontWeight: '600', flex: 1 }}>{subtotal >= t ? 'Đơn hàng được miễn phí giao hàng 🎉' : `Mua thêm ${money(t - subtotal)} để được miễn phí ship`}</Text></Row>
                <View style={{ height: 6, backgroundColor: C.brand100, borderRadius: 3 }}><View style={{ height: 6, borderRadius: 3, backgroundColor: C.brand600, width: `${Math.min(100, (subtotal / t) * 100)}%` }} /></View>
              </View>
            )}
            {!!error && <View style={{ backgroundColor: C.red50, borderRadius: R.md, padding: 12 }}><Text style={{ color: C.red }}>⚠ {error}</Text></View>}
          </View>
        }
        renderItem={({ item: i }) => (
          <Card style={{ flexDirection: 'row', gap: 12, padding: 12 }}>
            <Pressable onPress={() => router.push(`/products/${i.slug}`)}><Image source={{ uri: imageUrl(i.image) }} style={{ width: 76, height: 76, borderRadius: 12 }} contentFit="cover" /></Pressable>
            <View style={{ flex: 1, gap: 2 }}>
              <Row style={{ alignItems: 'flex-start' }}>
                <Text style={{ flex: 1, fontWeight: '700', color: C.ink }} numberOfLines={2}>{i.productName}</Text>
                <Pressable onPress={() => remove(i.variantId)} hitSlop={8} accessibilityLabel="Xoá"><Ionicons name="trash-outline" size={18} color={C.faint} /></Pressable>
              </Row>
              <T variant="muted">{i.variantName}</T>
              <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
                <QtyStepper size="sm" value={i.quantity} max={i.stock} onChange={(q) => update(i.variantId, q)} />
                <Text style={{ fontWeight: '800', color: C.brand700 }}>{money(i.price * i.quantity)}</Text>
              </Row>
            </View>
          </Card>
        )}
        ListFooterComponent={<Pressable onPress={clear} style={{ alignSelf: 'center', padding: 10 }}><Text style={{ color: C.red, fontWeight: '600' }}>Xoá giỏ hàng</Text></Pressable>}
      />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.white, padding: 16, paddingBottom: 16 + (insets.bottom ? 0 : 0), gap: 8, borderTopWidth: 1, borderTopColor: C.line }}>
        <Row style={{ justifyContent: 'space-between' }}><T>Tạm tính</T><T style={{ fontWeight: '700', color: C.ink }}>{money(subtotal)}</T></Row>
        <Row style={{ justifyContent: 'space-between' }}><T>Phí giao hàng</T><T style={{ fontWeight: '700', color: C.ink }}>{ship ? money(ship) : 'Miễn phí'}</T></Row>
        <Button testID="go-checkout" title={`Thanh toán · ${money(subtotal + ship)}`} size="lg" disabled={!!error} onPress={() => router.push('/checkout')} />
      </View>
    </View>
  );
}
