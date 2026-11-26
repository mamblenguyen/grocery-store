import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth';
import { useNotifications } from '@/context/notifications';
import { useStore } from '@/context/store';
import { confirmAsync } from '@/lib/confirm';
import { C, R } from '@/lib/theme';
import type { IconName } from './ui';

/** Trạng thái dùng chung trong khu quản lý: mở menu hamburger + số đơn chờ xác nhận (badge) */
const Ctx = createContext<{ open: () => void; pending: number; setPending: (n: number) => void }>({ open: () => {}, pending: 0, setPending: () => {} });
export const useAdminMenu = () => useContext(Ctx);

const ROLE: Record<string, string> = { SUPER_ADMIN: 'Quản trị nền tảng', ADMIN: 'Chủ cửa hàng', STAFF: 'Nhân viên' };

type Item = { icon: IconName; label: string; href: string; tab?: boolean; badge?: number; color?: string };

export function AdminMenuProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(0);
  const value = useMemo(() => ({ open: () => setVisible(true), pending, setPending }), [pending]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <AdminDrawer visible={visible} onClose={() => setVisible(false)} pending={pending} />
    </Ctx.Provider>
  );
}

function AdminDrawer({ visible, onClose, pending }: { visible: boolean; onClose: () => void; pending: number }) {
  const { user, isStaff, isSuper, acting, setActing, logout } = useAuth();
  const { unread } = useNotifications();
  const shop = useStore();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const panelW = Math.min(320, width * 0.84);
  const x = useRef(new Animated.Value(-panelW)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) setMounted(true);
    Animated.timing(x, { toValue: visible ? 0 : -panelW, duration: 220, useNativeDriver: true }).start(() => { if (!visible) setMounted(false); });
  }, [visible, panelW, x]);

  const store = acting ?? user?.store ?? null;
  const go = (it: Item) => {
    onClose();
    // Tab của khu quản lý → chuyển tab; màn hình phụ → mở chồng lên
    setTimeout(() => (it.tab ? router.navigate(it.href as any) : router.push(it.href as any)), 160);
  };
  const toShop = async () => {
    onClose();
    // Chưa chọn cửa hàng để mua → mặc định mở cửa hàng của mình
    if (!shop.store && user?.store?.slug) await shop.selectSlug(user.store.slug).catch(() => {});
    router.replace('/');
  };

  const sections: [string, Item[]][] = isStaff
    ? [
        ['Bán hàng', [
          { icon: 'pie-chart-outline', label: 'Tổng quan', href: '/admin', tab: true, color: C.brand600 },
          { icon: 'storefront-outline', label: 'Bán tại quầy', href: '/admin/pos', tab: true, color: C.brand600 },
          { icon: 'receipt-outline', label: 'Đơn hàng', href: '/admin/orders', tab: true, badge: pending, color: '#db2777' },
          { icon: 'barcode-outline', label: 'Tra cứu mã', href: '/staff/lookup', color: C.sky },
        ]],
        ['Kho hàng', [
          { icon: 'arrow-down-circle-outline', label: 'Nhập kho', href: '/staff/stock/new?type=IMPORT', color: '#059669' },
          { icon: 'arrow-up-circle-outline', label: 'Xuất kho', href: '/staff/stock/new?type=EXPORT', color: C.accent },
          { icon: 'clipboard-outline', label: 'Kiểm kê', href: '/staff/stock/new?type=STOCKTAKE', color: C.violet },
          { icon: 'documents-outline', label: 'Phiếu kho', href: '/admin/stock', tab: true, color: '#475569' },
        ]],
        ['Phân tích', [{ icon: 'stats-chart-outline', label: 'Báo cáo lợi nhuận', href: '/staff/reports', color: '#0891b2' }]],
        ['Tăng trưởng', [{ icon: 'heart-circle-outline', label: 'Vận hành & tăng trưởng', href: '/admin/operations', color: C.violet }]],
      ]
    : [];
  if (isSuper && !acting) sections.unshift(['Nền tảng', [
    { icon: 'shield-checkmark-outline', label: 'Đối tác & cửa hàng', href: '/admin', tab: true, color: C.violet },
    { icon: 'add-circle-outline', label: 'Tạo đối tác mới', href: '/super/new-store', color: C.brand600 },
  ]]);
  sections.push(['Tài khoản', [
    { icon: 'notifications-outline', label: 'Thông báo', href: '/account/notifications', badge: unread, color: C.amber },
    { icon: 'person-outline', label: 'Thông tin cá nhân', href: '/account/profile', color: C.text },
    { icon: 'key-outline', label: 'Đổi mật khẩu', href: '/account/password', color: C.text },
  ]]);

  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,.45)', opacity: x.interpolate({ inputRange: [-panelW, 0], outputRange: [0, 1] }) }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Đóng menu" />
      </Animated.View>
      <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: panelW, backgroundColor: C.white, transform: [{ translateX: x }], borderTopRightRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden' }}>
        {/* Đầu menu: tài khoản + cửa hàng */}
        <View style={{ backgroundColor: C.brand700, paddingTop: insets.top + 18, paddingHorizontal: 18, paddingBottom: 18, gap: 12 }}>
          <View style={{ position: 'absolute', right: -40, top: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,.08)' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,.18)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>{user?.fullName.trim().split(' ').pop()?.[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }} numberOfLines={1}>{user?.fullName}</Text>
              <Text style={{ color: 'rgba(255,255,255,.75)', fontSize: 12 }} numberOfLines={1}>{ROLE[user?.role ?? ''] ?? ''}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Đóng menu"><Ionicons name="close" size={22} color="#fff" /></Pressable>
          </View>
          {store && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,.12)', borderRadius: R.md, paddingHorizontal: 10, paddingVertical: 8 }}>
              <Ionicons name="business-outline" size={16} color="#fff" />
              <Text style={{ flex: 1, color: '#fff', fontWeight: '700' }} numberOfLines={1}>{store.name}</Text>
              {acting && <Text style={{ color: '#ddd6fe', fontSize: 11, fontWeight: '700' }}>QUẢN TRỊ HỘ</Text>}
            </View>
          )}
        </View>

        <ScrollView contentContainerStyle={{ paddingVertical: 8, paddingBottom: 16 }}>
          {sections.map(([title, items]) => (
            <View key={title} style={{ paddingHorizontal: 10, paddingTop: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: C.faint, letterSpacing: 0.8, paddingHorizontal: 10, marginBottom: 4 }}>{title.toUpperCase()}</Text>
              {items.map((it) => (
                <Pressable key={it.label} testID={`menu-${it.label}`} onPress={() => go(it)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, paddingVertical: 10, borderRadius: R.md }, pressed && { backgroundColor: C.line2 }]}>
                  <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: (it.color ?? C.text) + '14', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={it.icon} size={19} color={it.color ?? C.text} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: C.ink }}>{it.label}</Text>
                  {!!it.badge && <View style={{ minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{it.badge > 99 ? '99+' : it.badge}</Text></View>}
                </Pressable>
              ))}
            </View>
          ))}

        </ScrollView>

        {/* Chân menu (cố định): chuyển sang giao diện khách hàng */}
        <View style={{ paddingHorizontal: 14, paddingTop: 12, gap: 8, borderTopWidth: 1, borderTopColor: C.line2 }}>
          <Pressable testID="menu-to-shop" onPress={toShop} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: R.lg, backgroundColor: C.brand50, borderWidth: 1, borderColor: C.brand200 }, pressed && { opacity: 0.85 }]}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.brand600, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="bag-handle-outline" size={20} color="#fff" /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: C.brand800 }}>Sang trang mua sắm</Text>
              <Text style={{ fontSize: 12, color: C.brand700 }}>Xem cửa hàng như khách hàng</Text>
            </View>
            <Ionicons name="swap-horizontal" size={20} color={C.brand700} />
          </Pressable>
          {acting && (
            <Pressable onPress={() => { const id = acting.id; onClose(); setActing(null); router.push(`/super/store/${id}`); }} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: R.lg, backgroundColor: C.violet50 }, pressed && { opacity: 0.85 }]}>
              <Ionicons name="exit-outline" size={20} color={C.violet} />
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: C.violet }}>Thoát quản trị hộ</Text>
            </Pressable>
          )}
        </View>
        <Pressable testID="menu-logout" onPress={async () => { if (await confirmAsync('Đăng xuất khỏi tài khoản?')) { onClose(); await logout(); router.replace('/'); } }} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 22, paddingTop: 12, paddingBottom: insets.bottom + 14 }, pressed && { backgroundColor: C.red50 }]}>
          <Ionicons name="log-out-outline" size={20} color={C.red} />
          <Text style={{ fontSize: 15, fontWeight: '700', color: C.red }}>Đăng xuất</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}
