import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@/context/auth';
import { useCart } from '@/context/cart';
import { C } from '@/lib/theme';

/** Chỉ tự chuyển vào khu quản lý 1 lần khi mở app – sau đó người quản lý có thể chủ động sang giao diện mua sắm */
let bootChecked = false;

/** Giao diện khách hàng (mua sắm). Khu quản lý có thanh menu riêng ở /admin */
export default function TabsLayout() {
  const { isStaff, isSuper, loading, user } = useAuth();
  const isShipper = user?.role === 'SHIPPER';
  const { totalCount: count } = useCart();

  useEffect(() => {
    if (loading || bootChecked) return;
    bootChecked = true;
    if (isStaff || isSuper) router.replace('/admin');
  }, [loading, isStaff, isSuper]);

  const icon = (name: keyof typeof Ionicons.glyphMap) => ({ color, size }: { color: unknown; size: number }) => <Ionicons name={name} size={size} color={color as string} />;
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: C.brand600, tabBarInactiveTintColor: C.faint, headerShadowVisible: false, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' }, sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Trang chủ', headerShown: false, tabBarIcon: icon('home-outline') }} />
      <Tabs.Screen name="categories" options={{ title: 'Danh mục', tabBarIcon: icon('grid-outline') }} />
      <Tabs.Screen name="cart" options={{ title: 'Giỏ hàng', tabBarIcon: icon('cart-outline'), tabBarBadge: count > 0 ? (count > 99 ? '99+' : count) : undefined, tabBarBadgeStyle: { backgroundColor: C.red } }} />
      <Tabs.Screen name="account" options={{ title: 'Tài khoản', tabBarIcon: icon('person-outline') }} />
      <Tabs.Screen name="deliver" options={{ title: 'Nhận đơn', href: isShipper ? undefined : null, tabBarIcon: icon('bicycle-outline') }} />
    </Tabs>
  );
}
