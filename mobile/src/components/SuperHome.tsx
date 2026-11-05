import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { api, qs } from '@/lib/api';
import { money } from '@/lib/format';
import { expiryInfo, STORE_STATUS, type SuperStore } from '@/lib/super';
import { C, R } from '@/lib/theme';
import type { Paged } from '@/lib/types';
import { Button, Card, Chip, Row, StatusPill, T } from './ui';

interface Dash {
  stores: { ACTIVE: number; SUSPENDED: number; CLOSED: number; total: number; expired: number; expiringSoon: number };
  gmv: { month: number; monthOrders: number };
  revenue: { month: number; mrr: number };
}

/** Tab "Nền tảng" của super admin */
export function SuperHome() {
  const [d, setD] = useState<Dash | null>(null);
  const [list, setList] = useState<SuperStore[] | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'' | 'soon' | 'expired' | 'SUSPENDED'>('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const params = { search: q, limit: 50, ...(filter === 'SUSPENDED' ? { status: filter } : filter ? { expiry: filter } : {}) };
    const [dash, stores] = await Promise.all([api<Dash>('/super/dashboard'), api<Paged<SuperStore>>('/super/stores' + qs(params))]).catch(() => [null, null]);
    if (dash) setD(dash);
    setList(stores?.items ?? []);
  }, [q, filter]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [q, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const stat = (label: string, value: string, icon: any, color: string) => (
    <Card style={{ flex: 1, minWidth: 150, gap: 4 }}>
      <Row gap={6}><Ionicons name={icon} size={16} color={color} /><T variant="muted" style={{ fontSize: 12 }}>{label}</T></Row>
      <Text style={{ fontSize: 19, fontWeight: '800', color: C.ink }}>{value}</Text>
    </Card>
  );

  return (
    <FlatList
      data={list ?? []}
      keyExtractor={(s) => String(s.id)}
      contentContainerStyle={{ padding: 16, gap: 10, maxWidth: 900, width: '100%', alignSelf: 'center' }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 4 }}>
          <Row style={{ flexWrap: 'wrap' }} gap={10}>
            {stat('Cửa hàng hoạt động', d ? `${d.stores.ACTIVE}/${d.stores.total}` : '–', 'storefront-outline', C.violet)}
            {stat('MRR', d ? money(d.revenue.mrr) : '–', 'trending-up-outline', C.brand600)}
            {stat('GMV tháng', d ? money(d.gmv.month) : '–', 'bag-handle-outline', C.sky)}
            {stat('Thu phí tháng', d ? money(d.revenue.month) : '–', 'cash-outline', C.accent)}
          </Row>
          {!!d && (d.stores.expiringSoon > 0 || d.stores.expired > 0) && (
            <Pressable onPress={() => setFilter(d.stores.expired ? 'expired' : 'soon')} style={{ backgroundColor: C.amber50, borderRadius: R.lg, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'center', borderWidth: 1, borderColor: '#fde68a' }}>
              <Ionicons name="alert-circle-outline" size={20} color={C.amber} />
              <Text style={{ flex: 1, color: '#92400e', fontWeight: '600' }}>{d.stores.expiringSoon} cửa hàng sắp hết hạn · {d.stores.expired} đã hết hạn</Text>
            </Pressable>
          )}
          <Button testID="super-new-store" title="Thêm cửa hàng (đối tác)" icon="add-circle-outline" onPress={() => router.push('/super/new-store')} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: R.md, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, backgroundColor: C.white }}>
            <Ionicons name="search" size={18} color={C.faint} />
            <TextInput value={q} onChangeText={setQ} placeholder="Tìm tên, slug, SĐT, email chủ…" placeholderTextColor={C.faint} style={{ flex: 1, height: 44, color: C.ink }} />
          </View>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {([['', 'Tất cả'], ['soon', 'Sắp hết hạn'], ['expired', 'Hết hạn'], ['SUSPENDED', 'Tạm ngưng']] as const).map(([k, l]) => <Chip key={k} label={l} active={filter === k} onPress={() => setFilter(k)} />)}
          </Row>
        </View>
      }
      ListEmptyComponent={list ? <T variant="muted" style={{ textAlign: 'center', marginTop: 20 }}>Không có cửa hàng phù hợp</T> : undefined}
      renderItem={({ item: s }) => {
        const e = expiryInfo(s.planExpiresAt);
        return (
          <Card testID={`super-store-${s.slug}`} onPress={() => router.push(`/super/store/${s.id}`)} style={{ gap: 6 }}>
            <Row style={{ justifyContent: 'space-between' }}><Text style={{ fontWeight: '800', color: C.ink, flex: 1 }} numberOfLines={1}>{s.name}</Text><StatusPill map={STORE_STATUS} value={s.status} /></Row>
            <T variant="muted" style={{ fontSize: 12 }} numberOfLines={1}>/s/{s.slug}{s.owner ? ` · ${s.owner.email}` : ''}</T>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: C.text }}>{s.plan?.name ?? 'Chưa có gói'} · {s._count.products} SP · {s._count.orders} đơn</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: e.color }}>{e.text}</Text>
            </Row>
          </Card>
        );
      }}
    />
  );
}
