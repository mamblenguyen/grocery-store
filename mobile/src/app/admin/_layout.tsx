import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { AdminMenuProvider, useAdminMenu } from '@/components/AdminMenu';
import { Loading } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { C } from '@/lib/theme';

/** Khu quản lý (chủ cửa hàng / nhân viên / quản trị nền tảng) – thanh menu riêng, tách khỏi giao diện khách hàng */
export default function AdminLayout() {
  const { isStaff, isSuper, loading } = useAuth();
  if (loading) return <Loading />;
  if (!isStaff && !isSuper) return <Redirect href="/" />;
  return (
    <AdminMenuProvider>
      <AdminTabs />
    </AdminMenuProvider>
  );
}

type Icon = keyof typeof Ionicons.glyphMap;
const icon = (on: Icon, off: Icon) => ({ color, size, focused }: { color: unknown; size: number; focused: boolean }) => <Ionicons name={focused ? on : off} size={size} color={color as string} />;

function AdminTabs() {
  const { isStaff } = useAuth();
  const { open, pending } = useAdminMenu();
  // Super admin chưa chọn cửa hàng để quản trị hộ → chỉ có trang Nền tảng + Menu
  const store = isStaff ? undefined : null;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.brand600,
        tabBarInactiveTintColor: C.faint,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarStyle: { borderTopColor: C.line2, ...(Platform.OS === 'web' && { height: 64 }) },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '800', color: C.ink },
        headerStyle: { backgroundColor: C.white },
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: isStaff ? 'Tổng quan' : 'Nền tảng', headerShown: false, tabBarIcon: icon(isStaff ? 'pie-chart' : 'shield-checkmark', isStaff ? 'pie-chart-outline' : 'shield-checkmark-outline') }} />
      <Tabs.Screen
        name="orders"
        options={{ href: store, title: 'Đơn hàng', tabBarLabel: 'Đơn hàng', tabBarIcon: icon('receipt', 'receipt-outline'), tabBarBadge: pending > 0 ? (pending > 99 ? '99+' : pending) : undefined, tabBarBadgeStyle: { backgroundColor: C.red, fontSize: 10 } }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          href: store, title: 'Bán tại quầy', tabBarLabel: 'Bán quầy',
          // Nút giữa nổi bật – thao tác dùng nhiều nhất
          tabBarIcon: ({ focused }) => (
            <View style={{ width: 50, height: 50, borderRadius: 25, marginTop: -22, backgroundColor: focused ? C.brand700 : C.brand600, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: C.white, shadowColor: C.brand700, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}>
              <Ionicons name="scan" size={22} color="#fff" />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="stock" options={{ href: store, title: 'Kho hàng', tabBarLabel: 'Kho hàng', tabBarIcon: icon('cube', 'cube-outline') }} />
      <Tabs.Screen
        name="menu"
        options={{ title: 'Menu', tabBarIcon: icon('menu', 'menu'), tabBarButtonTestID: 'admin-menu' }}
        listeners={{ tabPress: (e) => { e.preventDefault(); open(); } }}
      />
    </Tabs>
  );
}
