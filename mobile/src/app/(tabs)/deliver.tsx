import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { toast } from '@/components/Toast';
import { Button, Card, Empty, Loading, Row, StatusPill, T } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import { currentPosition, DELIVERY_STATUS, VEHICLES, type LatLng } from '@/lib/geo';
import type { Job, ShipperMe } from '@/lib/shipper';
import { C, R } from '@/lib/theme';
import { useLiveLocation } from '@/lib/use-live-location';
import { JobCard } from '@/components/JobCard';

/** Tab tài xế: bật nhận đơn, đơn gần, đang giao, lịch sử */
export default function DeliverTab() {
  const { user } = useAuth();
  const [me, setMe] = useState<ShipperMe | null>(null);
  const [tab, setTab] = useState<'jobs' | 'active' | 'history'>('jobs');
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [active, setActive] = useState<Job[] | null>(null);
  const [history, setHistory] = useState<Job[] | null>(null);
  const [busy, setBusy] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pos = useRef<LatLng | null>(null);

  const load = useCallback(async () => {
    const q = pos.current ? `?lat=${pos.current.lat}&lng=${pos.current.lng}` : '';
    const [m, j, a, h] = await Promise.all([
      api<ShipperMe>('/shipper/me'),
      api<Job[]>('/shipper/jobs' + q).catch(() => []),
      api<{ items: Job[] }>('/shipper/deliveries?status=active'),
      api<{ items: Job[] }>('/shipper/deliveries?status=history&limit=30'),
    ]).catch(() => [null, [], { items: [] }, { items: [] }] as any);
    if (m) setMe(m);
    setJobs(j); setActive(a.items); setHistory(h.items);
  }, []);
  // Làm mới khi mở tab + mỗi 20 giây khi đang trực tuyến
  useFocusEffect(useCallback(() => {
    if (user?.role !== 'SHIPPER') return;
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [user, load]));
  useLiveLocation(!!me?.profile.isOnline, (p) => { pos.current = p; });

  if (user?.role !== 'SHIPPER') return <Empty icon="bicycle-outline" text="Chỉ dành cho tài xế giao hàng" />;
  if (!me) return <Loading />;
  const online = me.profile.isOnline;

  const toggle = async () => {
    let loc: Partial<LatLng> = {};
    if (!online) {
      try { loc = await currentPosition(); pos.current = loc as LatLng; } catch (e: any) { toast(e.message, 'error'); }
    }
    await api('/shipper/me', { method: 'PATCH', json: { isOnline: !online, ...loc } }).catch((e) => toast(e.message, 'error'));
    toast(online ? 'Đã tắt nhận đơn' : 'Đã bật nhận đơn');
    load();
  };
  const accept = async (j: Job) => {
    setBusy(j.id);
    try { await api(`/shipper/jobs/${j.id}/accept`, { method: 'POST' }); toast(`Đã nhận đơn ${j.order.code}`); router.push(`/shipper/${j.id}`); load(); }
    catch (e: any) { toast(e.message, 'error'); load(); } finally { setBusy(0); }
  };

  const data = tab === 'jobs' ? (online ? jobs ?? [] : []) : tab === 'active' ? active ?? [] : history ?? [];
  return (
    <FlatList
      data={data}
      keyExtractor={(j) => String(j.id)}
      contentContainerStyle={{ padding: 16, gap: 12, maxWidth: 760, width: '100%', alignSelf: 'center' }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          <View style={[st.hero, { backgroundColor: online ? C.brand600 : '#475569' }]}>
            <Row style={{ padding: 14 }} gap={12}>
              <View style={st.avatar}><Ionicons name="bicycle" size={24} color="#fff" /></View>
              <View style={{ flex: 1 }}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{me.fullName}</Text><Text style={{ color: 'rgba(255,255,255,.8)', fontSize: 12 }}>{VEHICLES[me.profile.vehicleType]}{me.profile.plateNumber ? ` · ${me.profile.plateNumber}` : ''}</Text></View>
              <Pressable testID="toggle-online" onPress={toggle} style={[st.toggle, { backgroundColor: online ? '#fff' : C.brand500 }]}>
                <Ionicons name="power" size={16} color={online ? C.brand700 : '#fff'} /><Text style={{ fontWeight: '800', color: online ? C.brand700 : '#fff' }}>{online ? 'Đang nhận đơn' : 'Bật nhận đơn'}</Text>
              </Pressable>
            </Row>
            <Row style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.15)' }} gap={0}>
              {[[money(me.stats.todayEarnings), 'Thu nhập hôm nay'], [String(me.stats.todayTrips), 'Chuyến hôm nay'], [money(me.stats.todayCod), 'Thu hộ COD']].map(([v, l]) => (
                <View key={l} style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}><Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>{v}</Text><Text style={{ color: 'rgba(255,255,255,.8)', fontSize: 11 }}>{l}</Text></View>
              ))}
            </Row>
          </View>
          <Row gap={4} style={{ backgroundColor: C.white, borderRadius: R.md, padding: 4 }}>
            {([['jobs', `Đơn mới${online && jobs?.length ? ` (${jobs.length})` : ''}`], ['active', `Đang giao${active?.length ? ` (${active.length})` : ''}`], ['history', 'Lịch sử']] as const).map(([k, l]) => (
              <Pressable key={k} testID={`tab-${k}`} onPress={() => setTab(k)} style={{ flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: tab === k ? C.brand600 : 'transparent', alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', color: tab === k ? '#fff' : C.text }}>{l}</Text>
              </Pressable>
            ))}
          </Row>
          {tab === 'jobs' && !online && <Card style={{ alignItems: 'center', gap: 6 }}><Ionicons name="power" size={28} color={C.faint} /><T variant="muted" style={{ textAlign: 'center' }}>Bật nhận đơn để xem các đơn đang chờ giao gần bạn</T></Card>}
        </View>
      }
      ListEmptyComponent={tab === 'jobs' && !online ? undefined : <Empty icon="cube-outline" text={tab === 'jobs' ? 'Chưa có đơn chờ – tự làm mới mỗi 20 giây' : tab === 'active' ? 'Bạn chưa nhận đơn nào' : 'Chưa có chuyến nào'} />}
      renderItem={({ item: j }) => (
        <JobCard j={j}>
          {tab === 'jobs'
            ? <Button testID={`accept-${j.id}`} title={`Nhận đơn · +${money(j.fee)}`} size="lg" loading={busy === j.id} onPress={() => accept(j)} />
            : <Button title={j.status === 'ASSIGNED' ? 'Đến cửa hàng lấy hàng' : j.status === 'PICKED_UP' ? 'Giao cho khách' : 'Xem chi tiết'} variant={tab === 'history' ? 'outline' : 'primary'} icon="chevron-forward" onPress={() => router.push(`/shipper/${j.id}`)} />}
        </JobCard>
      )}
    />
  );
}

const st = StyleSheet.create({
  hero: { borderRadius: R.xl, overflow: 'hidden' },
  avatar: { width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(255,255,255,.15)', alignItems: 'center', justifyContent: 'center' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: R.full },
  pill: { backgroundColor: C.sky50, borderRadius: R.full, paddingHorizontal: 10, paddingVertical: 4 },
  dot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  b: { fontWeight: '700', color: C.ink },
  tag: { borderRadius: R.full, paddingHorizontal: 10, paddingVertical: 4 },
});
