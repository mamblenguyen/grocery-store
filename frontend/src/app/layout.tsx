import type { Metadata, Viewport } from 'next';
import '@fontsource/be-vietnam-pro/vietnamese-400.css';
import '@fontsource/be-vietnam-pro/vietnamese-500.css';
import '@fontsource/be-vietnam-pro/vietnamese-600.css';
import '@fontsource/be-vietnam-pro/vietnamese-700.css';
import '@fontsource/be-vietnam-pro/vietnamese-800.css';
import '@fontsource/be-vietnam-pro/latin-400.css';
import '@fontsource/be-vietnam-pro/latin-500.css';
import '@fontsource/be-vietnam-pro/latin-600.css';
import '@fontsource/be-vietnam-pro/latin-700.css';
import '@fontsource/be-vietnam-pro/latin-800.css';
import { AuthProvider } from '@/context/auth';
import { CartProvider } from '@/context/cart';
import { SettingsProvider } from '@/context/settings';
import { WishlistProvider } from '@/context/wishlist';
import { ToastProvider } from '@/components/Toast';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Tạp Hoá Xanh – Đi chợ online, giao nhanh 2 giờ', template: '%s | Tạp Hoá Xanh' },
  description: 'Rau củ, thịt cá, đồ khô, đồ uống, hoá phẩm… giá tốt mỗi ngày. Giao nhanh trong 2 giờ.',
};

export const viewport: Viewport = { themeColor: '#0a9c4b' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <ToastProvider>
          <SettingsProvider>
            <AuthProvider>
              <WishlistProvider>
                <CartProvider>{children}</CartProvider>
              </WishlistProvider>
            </AuthProvider>
          </SettingsProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
