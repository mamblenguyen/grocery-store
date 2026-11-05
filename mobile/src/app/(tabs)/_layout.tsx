import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useAuth } from '@/context/auth';
import { useCart } from '@/context/cart';
import { C } from '@/lib/theme';

export default function TabsLayout() {
  const { isStaff, isSuper, loading, user } = useAuth();
  const isShipper = user?.role === 'SHIPPER';
  const { totalCount: count } = useCart();
  const icon = (name: keyof typeof Ionicons.glyphMap) => ({ color, size }: { color: unknown; size: number }) => <Ionicons name={name} size={size} color={color as string} />;
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: C.brand600, tabBarInactiveTintColor: C.faint, headerShadowVisible: false, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' }, sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Trang chủ', headerShown: false, tabBarIcon: icon('home-outline') }} />
      <Tabs.Screen name="categories" options={{ title: 'Danh mục', tabBarIcon: icon('grid-outline') }} />
      <Tabs.Screen name="cart" options={{ title: 'Giỏ hàng', tabBarIcon: icon('cart-outline'), tabBarBadge: count > 0 ? (count > 99 ? '99+' : count) : undefined, tabBarBadgeStyle: { backgroundColor: C.red } }} />
      <Tabs.Screen name="account" options={{ title: 'Tài khoản', tabBarIcon: icon('person-outline') }} />
      {/* Cùng 1 app: tab Quản lý chỉ hiện với nhân viên / chủ cửa hàng / quản trị nền tảng */}
      <Tabs.Screen name="deliver" options={{ title: 'Nhận đơn', href: isShipper ? undefined : null, tabBarIcon: icon('bicycle-outline') }} />
      <Tabs.Screen name="manage" options={{ title: isSuper && !isStaff ? 'Nền tảng' : 'Quản lý', href: loading || isStaff || isSuper ? undefined : null, tabBarIcon: icon(isSuper && !isStaff ? 'shield-checkmark-outline' : 'briefcase-outline') }} />
    </Tabs>
  );
}
