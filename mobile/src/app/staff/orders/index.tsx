import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, Text, TextInput, View } from 'react-native';
import { Badge, Card, Chip, Empty, Loading, Row, StatusPill, T } from '@/components/ui';
import { api, qs } from '@/lib/api';
import { dateTime, money } from '@/lib/format';
import { useStaffGuard } from '@/lib/staff';
import { C, PAY_STATUS, R, STATUS } from '@/lib/theme';
import type { Order, Paged } from '@/lib/types';

export default function StaffOrders() {
  useStaffGuard();
  const params = useLocalSearchParams<{ status?: string }>();
  const [status, setStatus] = useState(params.status ?? '');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<Order[] | null>(null);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const load = useCallback(async (p = 1) => {
    const r = await api<Paged<Order>>('/admin/orders' + qs({ status, search, page: p, limit: 20 }));
    setData((o) => (p === 1 ? r.items : [...(o ?? []), ...r.items])); setPage(p); setMore(p < r.totalPages);
  }, [status, search]);
  useFocusEffect(useCallback(() => { load(1).catch(() => setData([])); }, [load]));
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Đơn hàng' }} />
      <View style={{ backgroundColor: C.white, padding: 12, gap: 10 }}>
        <Row style={{ height: 44, borderWidth: 1.5, borderColor: C.line, borderRadius: R.md, paddingHorizontal: 12 }}>
          <Ionicons name="search" size={18} color={C.faint} />
          <TextInput value={search} onChangeText={setSearch} onSubmitEditing={() => { setData(null); load(1); }} placeholder="Mã đơn, tên, SĐT" placeholderTextColor={C.faint} returnKeyType="search" style={{ flex: 1, fontSize: 15, outlineStyle: 'none' as any }} />
        </Row>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[['', 'Tất cả'], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])].map(([k, l]) => <Chip key={k} label={l} active={status === k} onPress={() => { setStatus(k); setData(null); }} />)}
        </ScrollView>
      </View>
      {!data ? <Loading /> : (
        <FlatList data={data} keyExtractor={(o) => String(o.id)} contentContainerStyle={{ padding: 16, gap: 10 }} onEndReached={() => more && load(page + 1)}
          ListFooterComponent={more ? <ActivityIndicator color={C.brand600} /> : undefined} ListEmptyComponent={<Empty icon="receipt-outline" text="Không có đơn hàng" />}
          renderItem={({ item: o }) => (
            <Card onPress={() => router.push(`/staff/orders/${o.id}`)} style={{ gap: 6 }}>
              <Row style={{ justifyContent: 'space-between' }}><Row gap={6}><Text style={{ fontWeight: '800', color: C.ink }}>{o.code}</Text><Badge label={o.channel === 'POS' ? 'Tại quầy' : 'Online'} fg={o.channel === 'POS' ? C.violet : C.sky} bg={o.channel === 'POS' ? C.violet50 : C.sky50} /></Row><StatusPill map={STATUS} value={o.status} /></Row>
              <T>{o.customerName} · {o.phone}</T>
              <Row style={{ justifyContent: 'space-between' }}><Row gap={6}><StatusPill map={PAY_STATUS} value={o.paymentStatus} /><T variant="muted">{dateTime(o.createdAt)}</T></Row><Text style={{ fontWeight: '800', color: C.brand700 }}>{money(o.total)}</Text></Row>
            </Card>
          )} />
      )}
    </View>
  );
}
