import { Image } from 'expo-image';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, Text, View } from 'react-native';
import { Button, Card, Chip, Empty, Loading, Row, StatusPill, T } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { api, imageUrl, qs } from '@/lib/api';
import { dateTime, money } from '@/lib/format';
import { C, PAY_STATUS, STATUS } from '@/lib/theme';
import type { Order, Paged } from '@/lib/types';

type O = Order & { items: { image: string; productName: string }[] };

export default function MyOrders() {
  const { user } = useAuth();
  const [status, setStatus] = useState('');
  const [data, setData] = useState<O[] | null>(null);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const load = useCallback(async (p = 1) => {
    const r = await api<Paged<O>>('/orders/my' + qs({ status, page: p, limit: 15 }));
    setData((old) => (p === 1 ? r.items : [...(old ?? []), ...r.items])); setPage(p); setMore(p < r.totalPages);
  }, [status]);
  useFocusEffect(useCallback(() => { if (user) load(1).catch(() => setData([])); }, [user, load]));

  if (!user) return <Empty icon="receipt-outline" text="Đăng nhập để xem đơn hàng"><Button title="Đăng nhập" onPress={() => router.push('/login')} /></Empty>;
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Đơn hàng của tôi' }} />
      <View style={{ backgroundColor: C.white }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, padding: 12 }}>
          {[['', 'Tất cả'], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])].map(([k, l]) => <Chip key={k} label={l} active={status === k} onPress={() => { setStatus(k); setData(null); }} />)}
        </ScrollView>
      </View>
      {!data ? <Loading /> : (
        <FlatList data={data} keyExtractor={(o) => String(o.id)} contentContainerStyle={{ padding: 16, gap: 10 }}
          onEndReached={() => more && load(page + 1)} ListFooterComponent={more ? <ActivityIndicator color={C.brand600} /> : undefined}
          ListEmptyComponent={<Empty icon="receipt-outline" text="Chưa có đơn hàng nào" />}
          renderItem={({ item: o }) => (
            <Card onPress={() => router.push(`/orders/${o.id}`)} style={{ gap: 10 }}>
              <Row style={{ justifyContent: 'space-between' }}><Text style={{ fontWeight: '800', color: C.ink }}>{o.code}</Text><StatusPill map={STATUS} value={o.status} /></Row>
              {o.store && <Text style={{ color: C.brand700, fontWeight: '700', fontSize: 12 }}>🏪 {o.store.name}</Text>}
              <Row>
                <Row gap={-10}>{o.items.map((it, i) => <Image key={i} source={{ uri: imageUrl(it.image) }} style={{ width: 44, height: 44, borderRadius: 10, borderWidth: 2, borderColor: '#fff' }} />)}</Row>
                <T variant="muted" style={{ flex: 1 }} numberOfLines={2}>{o.items.map((i) => i.productName).join(', ')}</T>
              </Row>
              <Row style={{ justifyContent: 'space-between' }}>
                <View><T variant="muted">{dateTime(o.createdAt)}</T><StatusPill map={PAY_STATUS} value={o.paymentStatus} /></View>
                <Text style={{ fontWeight: '800', color: C.brand700, fontSize: 16 }}>{money(o.total)}</Text>
              </Row>
            </Card>
          )} />
      )}
    </View>
  );
}
