import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { Button, Card, Empty, Loading, Row, T } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { SuperHome } from '@/components/SuperHome';
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import { C, R } from '@/lib/theme';

interface Dash {
  stats: { todayRevenue: number; todayOrders: number; revenue: number; orders: number };
  ordersByStatus: Record<string, number>;
  lowStock: { id: number; name: string; stock: number; productName: string }[];
}

export default function Manage() {
  const { isStaff, isSuper, loading } = useAuth();
  if (loading) return <Loading />;
  // Super admin chưa chọn cửa hàng để quản trị hộ → màn hình nền tảng
  if (isSuper && !isStaff) return <SuperHome />;
  return <StoreManage />;
}

/** Thông báo quản trị hộ / hạn gói dịch vụ */
function Banner() {
  const { user, acting, setActing } = useAuth();
  if (acting)
    return (
      <View style={{ backgroundColor: C.violet, borderRadius: R.lg, padding: 12, gap: 8 }}>
        <Text style={{ color: '#fff', fontWeight: '600' }}>Đang quản trị hộ: <Text style={{ fontWeight: '800' }}>{acting.name}</Text></Text>
        <Pressable testID="exit-acting" onPress={() => { const id = acting.id; setActing(null); router.push(`/super/store/${id}`); }} style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,.2)', borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Thoát về trang nền tảng</Text>
        </Pressable>
      </View>
    );
  const st = user?.store;
  if (!st || st.daysLeft == null || st.daysLeft > 7) return null;
  const expired = st.daysLeft <= 0;
  return (
    <View style={{ backgroundColor: expired ? C.red50 : C.amber50, borderRadius: R.lg, padding: 12, borderWidth: 1, borderColor: expired ? '#fecaca' : '#fde68a', flexDirection: 'row', gap: 8 }}>
      <Ionicons name="warning-outline" size={20} color={expired ? C.red : C.amber} />
      <Text style={{ flex: 1, color: expired ? '#991b1b' : '#92400e', fontWeight: '600' }}>
        {expired ? `Gói ${st.plan?.name ?? ''} đã hết hạn – cửa hàng chỉ xem được dữ liệu, chưa bán hàng được. Liên hệ quản trị nền tảng để gia hạn.` : `Gói ${st.plan?.name ?? ''} còn ${st.daysLeft} ngày. Liên hệ quản trị nền tảng để gia hạn.`}
      </Text>
    </View>
  );
}

function StoreManage() {
  const { isStaff, user, acting } = useAuth();
  const { width } = useWindowDimensions();
  const [d, setD] = useState<Dash | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(() => api<Dash>('/admin/dashboard?days=7').then(setD).catch(() => {}), []);
  useFocusEffect(useCallback(() => { if (isStaff) load(); }, [isStaff, load, acting?.id]));
  if (!isStaff) return <Empty icon="lock-closed-outline" text="Chỉ dành cho nhân viên cửa hàng"><Button title="Đăng nhập" onPress={() => router.push('/login')} /></Empty>;

  const cols = width < 500 ? 3 : 4;
  const tileW = (Math.min(width, 900) - 32 - (cols - 1) * 10) / cols;
  const actions: [string, any, string, string][] = [
    ['Bán tại quầy', 'storefront-outline', '/staff/pos', C.brand600],
    ['Tra cứu mã', 'barcode-outline', '/staff/lookup', C.sky],
    ['Nhập kho', 'arrow-down-circle-outline', '/staff/stock/new?type=IMPORT', '#059669'],
    ['Xuất kho', 'arrow-up-circle-outline', '/staff/stock/new?type=EXPORT', C.accent],
    ['Kiểm kê', 'clipboard-outline', '/staff/stock/new?type=STOCKTAKE', C.violet],
    ['Phiếu kho', 'documents-outline', '/staff/stock', '#475569'],
    ['Đơn hàng', 'receipt-outline', '/staff/orders', '#db2777'],
    ['Báo cáo', 'stats-chart-outline', '/staff/reports', '#0891b2'],
  ];
  const pending = d?.ordersByStatus.PENDING ?? 0;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, maxWidth: 900, width: '100%', alignSelf: 'center' }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
      <Banner />
      <T variant="muted">Xin chào, {user?.fullName}{(acting ?? user?.store) ? ` · ${(acting ?? user?.store)!.name}` : ''}</T>
      <Row style={{ flexWrap: 'wrap' }} gap={10}>
        {[['Doanh thu hôm nay', money(d?.stats.todayRevenue), 'cash-outline'], ['Đơn hôm nay', String(d?.stats.todayOrders ?? '–'), 'receipt-outline']].map(([l, v, i]) => (
          <Card key={l} style={{ flex: 1, minWidth: 150, gap: 6 }}>
            <Row gap={6}><Ionicons name={i as any} size={18} color={C.brand600} /><T variant="muted">{l}</T></Row>
            <Text style={{ fontSize: 22, fontWeight: '800', color: C.ink }}>{v}</Text>
          </Card>
        ))}
      </Row>
      {pending > 0 && (
        <Pressable onPress={() => router.push('/staff/orders?status=PENDING')} style={{ backgroundColor: C.amber50, borderRadius: R.lg, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#fde68a' }}>
          <Ionicons name="alert-circle-outline" size={22} color={C.amber} />
          <Text style={{ flex: 1, color: '#92400e', fontWeight: '600' }}>{pending} đơn hàng đang chờ xác nhận</Text>
          <Ionicons name="chevron-forward" size={18} color="#92400e" />
        </Pressable>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {actions.map(([label, icon, href, color]) => (
          <Pressable key={label} testID={`action-${label}`} onPress={() => router.push(href as any)} style={({ pressed }) => [{ width: tileW, backgroundColor: C.white, borderRadius: R.lg, paddingVertical: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#eef2f6' }, pressed && { opacity: 0.8 }]}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={26} color={color} /></View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: C.ink, textAlign: 'center' }}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {!!d?.lowStock.length && (
        <Card style={{ gap: 8 }}>
          <Row style={{ justifyContent: 'space-between' }}><T variant="h3">⚠️ Sắp hết hàng</T><Pressable onPress={() => router.push('/staff/stock/new?type=IMPORT')}><Text style={{ color: C.brand700, fontWeight: '700' }}>+ Nhập hàng</Text></Pressable></Row>
          {d.lowStock.slice(0, 6).map((v) => (
            <Row key={v.id} style={{ justifyContent: 'space-between' }}><T style={{ flex: 1 }} numberOfLines={1}>{v.productName} <Text style={{ color: C.muted }}>({v.name})</Text></T><Text style={{ fontWeight: '800', color: v.stock <= 0 ? C.red : C.accent }}>{v.stock}</Text></Row>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}
