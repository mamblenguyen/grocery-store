import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdminMenu } from '@/components/AdminMenu';
import { SuperHome } from '@/components/SuperHome';
import { Card, Chip, Loading, Row, StatusPill, T } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useNotifications } from '@/context/notifications';
import { api } from '@/lib/api';
import { money, num } from '@/lib/format';
import { C, R, shadow, STATUS } from '@/lib/theme';
import type { Order } from '@/lib/types';

interface Dash {
  stats: { todayRevenue: number; todayOrders: number; revenue: number; orders: number; customers: number; products: number };
  ordersByStatus: Record<string, number>;
  chart: { date: string; revenue: number; orders: number }[];
  topProducts: { productId: number; productName: string; quantity: number; revenue: number }[];
  lowStock: { id: number; name: string; stock: number; lowStockThreshold: number; productName: string }[];
  recentOrders: Order[];
}

const PERIODS: [number, string][] = [[7, '7 ngày'], [14, '14 ngày'], [30, '30 ngày']];
const short = (n: number) => (n >= 1e9 ? `${+(n / 1e9).toFixed(1)}tỷ` : n >= 1e6 ? `${+(n / 1e6).toFixed(1)}tr` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));
const dm = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;

export default function AdminHome() {
  const { isStaff } = useAuth();
  const insets = useSafeAreaInsets();
  const { open } = useAdminMenu();
  // Super admin chưa quản trị hộ cửa hàng nào → trang nền tảng
  if (!isStaff)
    return (
      <View style={{ flex: 1 }}>
        <TopBar title="Quản trị nền tảng" onMenu={open} top={insets.top} />
        <SuperHome />
      </View>
    );
  return <Dashboard />;
}

function TopBar({ title, subtitle, onMenu, top, dark }: { title: string; subtitle?: string; onMenu: () => void; top: number; dark?: boolean }) {
  const { unread } = useNotifications();
  const fg = dark ? '#fff' : C.ink;
  const btn = { width: 40, height: 40, borderRadius: 20, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: dark ? 'rgba(255,255,255,.15)' : C.line2 };
  return (
    <View style={{ paddingTop: top + 8, paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: dark ? 'transparent' : C.white }}>
      <Pressable testID="open-admin-menu" onPress={onMenu} style={btn} accessibilityLabel="Mở menu"><Ionicons name="menu" size={22} color={fg} /></Pressable>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: fg }} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,.75)' : C.muted }} numberOfLines={1}>{subtitle}</Text>}
      </View>
      <Pressable onPress={() => router.push('/account/notifications')} style={btn} accessibilityLabel="Thông báo">
        <Ionicons name="notifications-outline" size={21} color={fg} />
        {unread > 0 && <View style={{ position: 'absolute', top: 6, right: 6, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: dark ? C.brand700 : C.white }}><Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{unread > 9 ? '9+' : unread}</Text></View>}
      </Pressable>
    </View>
  );
}

function Dashboard() {
  const { user, acting } = useAuth();
  const { open, setPending } = useAdminMenu();
  const insets = useSafeAreaInsets();
  const [days, setDays] = useState(7);
  const [d, setD] = useState<Dash | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => api<Dash>(`/admin/dashboard?days=${days}`).then((r) => { setD(r); setPending(r.ordersByStatus.PENDING ?? 0); }).catch(() => {}), [days, setPending]);
  useFocusEffect(useCallback(() => { load(); }, [load, acting?.id]));
  useEffect(() => setSel(null), [days]);

  const store = acting ?? user?.store;
  const hour = new Date().getHours();
  const hello = hour < 11 ? 'Chào buổi sáng' : hour < 14 ? 'Chào buổi trưa' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  const chart = d?.chart ?? [];
  const periodRevenue = chart.reduce((s, c) => s + c.revenue, 0);
  const periodOrders = chart.reduce((s, c) => s + c.orders, 0);
  const yesterday = chart.length >= 2 ? chart[chart.length - 2].revenue : 0;
  const today = d?.stats.todayRevenue ?? 0;
  const delta = yesterday > 0 ? Math.round(((today - yesterday) / yesterday) * 100) : null;
  const max = Math.max(1, ...chart.map((c) => c.revenue));
  const active = sel ?? chart.length - 1;
  const pending = d?.ordersByStatus.PENDING ?? 0;
  const topMax = Math.max(1, ...(d?.topProducts.map((t) => t.quantity) ?? [1]));

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 28 }}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor="#fff" onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      {/* ── Đầu trang: doanh thu hôm nay ── */}
      <View style={{ backgroundColor: C.brand700, paddingBottom: 56, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -60, top: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,.07)' }} />
        <View style={{ position: 'absolute', left: -50, bottom: -70, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,.05)' }} />
        <TopBar dark title={store?.name ?? 'Cửa hàng'} subtitle={`${hello}, ${user?.fullName ?? ''}`} onMenu={open} top={insets.top} />
        <View style={{ paddingHorizontal: 20, paddingTop: 14, gap: 4 }}>
          <Text style={{ color: 'rgba(255,255,255,.8)', fontSize: 13, fontWeight: '600' }}>Doanh thu hôm nay</Text>
          {!d ? <View style={{ height: 40 }} /> : <Text testID="today-revenue" style={{ color: '#fff', fontSize: 34, fontWeight: '900', letterSpacing: -0.5 }}>{money(today)}</Text>}
          <Row gap={8}>
            <View style={{ backgroundColor: 'rgba(255,255,255,.15)', borderRadius: R.full, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="receipt-outline" size={13} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{num(d?.stats.todayOrders)} đơn</Text>
            </View>
            {delta != null && (
              <View style={{ backgroundColor: delta >= 0 ? 'rgba(187,247,208,.22)' : 'rgba(254,202,202,.25)', borderRadius: R.full, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name={delta >= 0 ? 'trending-up' : 'trending-down'} size={13} color={delta >= 0 ? '#bbf7d0' : '#fecaca'} />
                <Text style={{ color: delta >= 0 ? '#bbf7d0' : '#fecaca', fontSize: 12, fontWeight: '700' }}>{delta >= 0 ? '+' : ''}{delta}% so với hôm qua</Text>
              </View>
            )}
          </Row>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: -40, gap: 14, maxWidth: 900, width: '100%', alignSelf: 'center' }}>
        {/* ── Biểu đồ doanh thu theo kỳ ── */}
        <Card style={[{ gap: 12 }, shadow]}>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <T variant="h3">Doanh thu</T>
            <Row gap={6}>{PERIODS.map(([v, l]) => <Chip key={v} label={l} active={days === v} onPress={() => setDays(v)} />)}</Row>
          </Row>
          {!d ? <Loading full={false} /> : (
            <>
              <Row gap={0} style={{ alignItems: 'stretch' }}>
                <Kpi label={`${days} ngày qua`} value={money(periodRevenue)} />
                <View style={{ width: 1, backgroundColor: C.line2 }} />
                <Kpi label="Số đơn" value={num(periodOrders)} />
                <View style={{ width: 1, backgroundColor: C.line2 }} />
                <Kpi label="TB / đơn" value={money(periodOrders ? Math.round(periodRevenue / periodOrders) : 0)} />
              </Row>
              {chart[active] && (
                <View style={{ backgroundColor: C.brand50, borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: C.brand800, fontWeight: '700' }}>{active === chart.length - 1 ? 'Hôm nay' : dm(chart[active].date)}</Text>
                  <Text style={{ color: C.brand800, fontWeight: '800' }}>{money(chart[active].revenue)} · {chart[active].orders} đơn</Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: days > 14 ? 2 : 6 }}>
                {chart.map((c, i) => (
                  <Pressable key={c.date} onPress={() => setSel(i)} style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' }} accessibilityLabel={`${dm(c.date)}: ${money(c.revenue)}`}>
                    <View style={{ width: '100%', maxWidth: 28, height: `${Math.max(3, (c.revenue / max) * 100)}%`, borderRadius: 6, backgroundColor: i === active ? C.brand600 : c.revenue ? C.brand200 : C.line2 }} />
                  </Pressable>
                ))}
              </View>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 11, color: C.faint }}>{chart[0] && dm(chart[0].date)}</Text>
                <Text style={{ fontSize: 11, color: C.faint }}>Cao nhất {short(max === 1 ? 0 : max)}₫</Text>
                <Text style={{ fontSize: 11, color: C.faint }}>Hôm nay</Text>
              </Row>
            </>
          )}
        </Card>

        <Banner />

        {/* ── Đơn chờ xác nhận ── */}
        {pending > 0 && (
          <Pressable onPress={() => router.navigate('/admin/orders?status=PENDING')} style={({ pressed }) => [{ backgroundColor: C.amber50, borderRadius: R.lg, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#fde68a' }, pressed && { opacity: 0.85 }]}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#fde68a', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="time-outline" size={20} color="#92400e" /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#92400e', fontWeight: '800' }}>{pending} đơn đang chờ xác nhận</Text>
              <Text style={{ color: '#b45309', fontSize: 12 }}>Chạm để xử lý ngay</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#92400e" />
          </Pressable>
        )}

        {/* ── Tình trạng đơn hàng ── */}
        {d && (
          <Card style={{ gap: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}><T variant="h3">Đơn hàng</T><Link label="Tất cả" onPress={() => router.navigate('/admin/orders')} /></Row>
            <Row gap={8}>
              {(['PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED'] as const).map((s) => (
                <Pressable key={s} onPress={() => router.navigate(`/admin/orders?status=${s}`)} style={({ pressed }) => [{ flex: 1, backgroundColor: STATUS[s].bg, borderRadius: R.md, paddingVertical: 10, alignItems: 'center', gap: 2 }, pressed && { opacity: 0.8 }]}>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: STATUS[s].fg }}>{num(d.ordersByStatus[s])}</Text>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: STATUS[s].fg, textAlign: 'center' }} numberOfLines={1}>{STATUS[s].label}</Text>
                </Pressable>
              ))}
            </Row>
            <Row gap={8}>
              <MiniStat icon="people-outline" label="Khách hàng" value={num(d.stats.customers)} />
              <MiniStat icon="cube-outline" label="Sản phẩm" value={num(d.stats.products)} />
              <MiniStat icon="wallet-outline" label="Tổng DT (hoàn thành)" value={short(d.stats.revenue) + '₫'} />
            </Row>
          </Card>
        )}

        {/* ── Thao tác nhanh ── */}
        <Row gap={10}>
          {([
            ['Bán quầy', 'scan', () => router.navigate('/admin/pos'), C.brand600],
            ['Tra cứu', 'barcode-outline', () => router.push('/staff/lookup'), C.sky],
            ['Nhập kho', 'arrow-down-circle-outline', () => router.push('/staff/stock/new?type=IMPORT'), '#059669'],
            ['Báo cáo', 'stats-chart-outline', () => router.push('/staff/reports'), '#0891b2'],
          ] as const).map(([label, ic, go, color]) => (
            <Pressable key={label} testID={`quick-${label}`} onPress={go} style={({ pressed }) => [{ flex: 1, backgroundColor: C.white, borderRadius: R.lg, paddingVertical: 12, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#eef2f6' }, pressed && { opacity: 0.8 }]}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={ic} size={21} color={color} /></View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.ink }}>{label}</Text>
            </Pressable>
          ))}
        </Row>

        {/* ── Bán chạy ── */}
        {!!d?.topProducts.length && (
          <Card style={{ gap: 12 }}>
            <Row style={{ justifyContent: 'space-between' }}><T variant="h3">🔥 Bán chạy nhất</T><Link label="Báo cáo" onPress={() => router.push('/staff/reports')} /></Row>
            {d.topProducts.map((t, i) => (
              <View key={t.productId} style={{ gap: 5 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Row gap={8} style={{ flex: 1 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: i === 0 ? '#fbbf24' : i === 1 ? '#cbd5e1' : i === 2 ? '#fdba74' : C.line2, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 11, fontWeight: '900', color: C.ink }}>{i + 1}</Text></View>
                    <Text style={{ flex: 1, fontWeight: '600', color: C.ink }} numberOfLines={1}>{t.productName}</Text>
                  </Row>
                  <Text style={{ fontWeight: '800', color: C.ink }}>{money(t.revenue)}</Text>
                </Row>
                <Row gap={8} style={{ paddingLeft: 30 }}>
                  <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: C.line2, overflow: 'hidden' }}><View style={{ width: `${(t.quantity / topMax) * 100}%`, height: '100%', backgroundColor: C.brand500, borderRadius: 3 }} /></View>
                  <Text style={{ fontSize: 12, color: C.muted, minWidth: 54, textAlign: 'right' }}>{num(t.quantity)} đã bán</Text>
                </Row>
              </View>
            ))}
          </Card>
        )}

        {/* ── Sắp hết hàng ── */}
        {!!d?.lowStock.length && (
          <Card style={{ gap: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}><T variant="h3">⚠️ Sắp hết hàng</T><Link label="+ Nhập hàng" onPress={() => router.push('/staff/stock/new?type=IMPORT')} /></Row>
            {d.lowStock.slice(0, 6).map((v) => (
              <Row key={v.id} style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', color: C.ink }} numberOfLines={1}>{v.productName}</Text>
                  <Text style={{ fontSize: 12, color: C.muted }} numberOfLines={1}>{v.name} · ngưỡng {v.lowStockThreshold}</Text>
                </View>
                <View style={{ backgroundColor: v.stock <= 0 ? C.red50 : C.accent50, borderRadius: R.full, paddingHorizontal: 10, paddingVertical: 3 }}>
                  <Text style={{ fontWeight: '800', color: v.stock <= 0 ? C.red : C.accent }}>{v.stock <= 0 ? 'Hết' : `Còn ${v.stock}`}</Text>
                </View>
              </Row>
            ))}
          </Card>
        )}

        {/* ── Đơn gần đây ── */}
        {!!d?.recentOrders.length && (
          <Card style={{ gap: 4 }}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}><T variant="h3">Đơn gần đây</T><Link label="Xem tất cả" onPress={() => router.navigate('/admin/orders')} /></Row>
            {d.recentOrders.slice(0, 5).map((o, i) => (
              <Pressable key={o.id} onPress={() => router.push(`/staff/orders/${o.id}`)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: C.line2 }, pressed && { opacity: 0.7 }]}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: o.channel === 'POS' ? C.violet50 : C.sky50, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={o.channel === 'POS' ? 'storefront-outline' : 'globe-outline'} size={18} color={o.channel === 'POS' ? C.violet : C.sky} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontWeight: '700', color: C.ink }} numberOfLines={1}>{o.code} · {o.customerName}</Text>
                  <Row gap={6}><StatusPill map={STATUS} value={o.status} /><Text style={{ fontSize: 11, color: C.faint }}>{timeAgo(o.createdAt)}</Text></Row>
                </View>
                <Text style={{ fontWeight: '800', color: C.brand700 }}>{money(o.total)}</Text>
              </Pressable>
            ))}
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

function timeAgo(s: string) {
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  if (m < 1440) return `${Math.floor(m / 60)} giờ trước`;
  return `${Math.floor(m / 1440)} ngày trước`;
}

const Kpi = ({ label, value }: { label: string; value: string }) => (
  <View style={{ flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 4 }}>
    <Text style={{ fontSize: 11, color: C.muted, fontWeight: '600' }} numberOfLines={1}>{label}</Text>
    <Text style={{ fontSize: 15, fontWeight: '900', color: C.ink }} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
  </View>
);

const MiniStat = ({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) => (
  <View style={{ flex: 1, backgroundColor: C.bg, borderRadius: R.md, padding: 10, gap: 4 }}>
    <Ionicons name={icon} size={16} color={C.muted} />
    <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }} numberOfLines={1}>{value}</Text>
    <Text style={{ fontSize: 10.5, color: C.muted }} numberOfLines={1}>{label}</Text>
  </View>
);

const Link = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable onPress={onPress} hitSlop={8}><Text style={{ color: C.brand700, fontWeight: '700', fontSize: 13 }}>{label}</Text></Pressable>
);

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
