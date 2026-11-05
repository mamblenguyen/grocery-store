import '@/lib/scanner-setup';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastHost } from '@/components/Toast';
import { AuthProvider } from '@/context/auth';
import { CartProvider } from '@/context/cart';
import { NotificationsProvider } from '@/context/notifications';
import { SettingsProvider } from '@/context/settings';
import { StoreProvider } from '@/context/store';
import { WishlistProvider } from '@/context/wishlist';
import { C } from '@/lib/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
      <SettingsProvider>
        <AuthProvider>
          <NotificationsProvider>
            <WishlistProvider>
              <CartProvider>
                <StatusBar style="dark" />
                <Stack
                  screenOptions={{
                    headerTintColor: C.ink,
                    headerTitleStyle: { fontWeight: '700' },
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: C.white },
                    contentStyle: { backgroundColor: C.bg },
                    headerBackButtonDisplayMode: 'minimal',
                  }}
                >
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="login" options={{ title: 'Đăng nhập', presentation: 'modal' }} />
                  <Stack.Screen name="register" options={{ title: 'Tạo tài khoản', presentation: 'modal' }} />
                  <Stack.Screen name="forgot-password" options={{ title: 'Quên mật khẩu', presentation: 'modal' }} />
                  <Stack.Screen name="stores" options={{ title: 'Chọn cửa hàng' }} />
                  <Stack.Screen name="shipper/[id]" options={{ title: 'Chuyến giao' }} />
                </Stack>
                <ToastHost />
              </CartProvider>
            </WishlistProvider>
          </NotificationsProvider>
        </AuthProvider>
      </SettingsProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
