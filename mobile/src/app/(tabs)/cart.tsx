import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { toast } from '@/components/Toast';
import { Button, Card, Empty, QtyStepper, Row, T } from '@/components/ui';
import { useCart, type CartGroup } from '@/context/cart';
import { useSettings } from '@/context/settings';
import { useStore } from '@/context/store';
import { imageUrl } from '@/lib/api';
import { confirmAsync } from '@/lib/confirm';
import { money } from '@/lib/format';
import { C, R } from '@/lib/theme';

/** Giỏ hàng chung của sàn: chia theo cửa hàng, mỗi cửa hàng thanh toán & giao riêng */
export default function CartTab() {
  const cart = useCart();
  const shop = useStore();
  const { settings } = useSettings();
  const [busy, setBusy] = useState('');
  const current = shop.store?.slug;
  const groups = [...cart.groups].sort((a, b) => (a.slug === current ? -1 : b.slug === current ? 1 : 0));

  if (!groups.length)
    return <Empty icon="cart-outline" text="Giỏ hàng đang trống"><Button title="Mua sắm ngay" onPress={() => router.push(shop.store ? '/products' : '/')} /></Empty>;

  const checkout = async (g: CartGroup) => {
    setBusy(g.slug);
    try {
      if (g.slug !== current) await shop.selectSlug(g.slug);
      router.push('/checkout');
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(''); }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
      {groups.length > 1 && <T variant="muted">Hàng từ {groups.length} cửa hàng – mỗi cửa hàng giao & thanh toán riêng.</T>}
      {groups.map((g) => {
        const isCur = g.slug === current;
        const t = isCur ? settings.freeShippingThreshold : 0;
        return (
          <Card key={g.slug} style={{ gap: 10, padding: 12 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Pressable onPress={async () => { if (!isCur) await shop.selectSlug(g.slug).catch(() => {}); router.push('/'); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <Ionicons name="storefront" size={18} color={C.brand700} />
                <Text style={{ fontWeight: '800', color: C.ink, flexShrink: 1 }} numberOfLines={1}>{g.name}</Text>
                <Ionicons name="chevron-forward" size={16} color={C.faint} />
              </Pressable>
              <Pressable onPress={async () => { if (await confirmAsync(`Xoá giỏ hàng tại ${g.name}?`, '', 'Xoá', true)) cart.clearIn(g.slug); }} hitSlop={8}><Text style={{ color: C.red, fontWeight: '600', fontSize: 13 }}>Xoá</Text></Pressable>
            </Row>
            {!!t && (
              <View style={{ backgroundColor: C.brand50, borderRadius: R.md, padding: 10, gap: 6 }}>
                <Text style={{ color: C.brand800, fontWeight: '600', fontSize: 13 }}>{g.subtotal >= t ? 'Được miễn phí giao hàng 🎉' : `Mua thêm ${money(t - g.subtotal)} để được miễn phí ship`}</Text>
                <View style={{ height: 6, backgroundColor: C.brand100, borderRadius: 3 }}><View style={{ height: 6, borderRadius: 3, backgroundColor: C.brand600, width: `${Math.min(100, (g.subtotal / t) * 100)}%` }} /></View>
              </View>
            )}
            {g.items.map((i) => (
              <Row key={i.variantId} gap={10} style={{ alignItems: 'flex-start' }}>
                <Image source={{ uri: imageUrl(i.image) }} style={{ width: 64, height: 64, borderRadius: 12 }} contentFit="cover" />
                <View style={{ flex: 1, gap: 2 }}>
                  <Row style={{ alignItems: 'flex-start' }}>
                    <Text style={{ flex: 1, fontWeight: '700', color: C.ink }} numberOfLines={2}>{i.productName}</Text>
                    <Pressable onPress={() => cart.removeIn(g.slug, i.variantId)} hitSlop={8} accessibilityLabel="Xoá"><Ionicons name="trash-outline" size={18} color={C.faint} /></Pressable>
                  </Row>
                  <T variant="muted">{i.variantName}</T>
                  <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
                    <QtyStepper size="sm" value={i.quantity} max={i.stock} onChange={(q) => cart.updateIn(g.slug, i.variantId, q)} />
                    <Text style={{ fontWeight: '800', color: C.brand700 }}>{money(i.price * i.quantity)}</Text>
                  </Row>
                </View>
              </Row>
            ))}
            <Row style={{ justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.line2, paddingTop: 10 }}>
              <T>Tạm tính ({g.count} SP)</T><Text style={{ fontWeight: '800', color: C.ink, fontSize: 16 }}>{money(g.subtotal)}</Text>
            </Row>
            <Button testID={isCur ? 'go-checkout' : `checkout-${g.slug}`} title={`Thanh toán tại ${g.name}`} loading={busy === g.slug} onPress={() => checkout(g)} />
          </Card>
        );
      })}
    </ScrollView>
  );
}
