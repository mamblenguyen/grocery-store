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
import { WishlistProvider } from '@/context/wishlist';
import { ToastProvider } from '@/components/Toast';
import { PLATFORM_NAME } from '@/lib/platform';
import './globals.css';

export const metadata: Metadata = {
  title: { default: `${PLATFORM_NAME} – Đi chợ online tại tạp hoá gần bạn`, template: `%s | ${PLATFORM_NAME}` },
  description: 'Nền tảng bán hàng cho tạp hoá: đặt hàng online, bán tại quầy, quản lý kho. Rau củ, đồ khô, đồ uống… giao nhanh.',
};

export const viewport: Viewport = { themeColor: '#0a9c4b' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <ToastProvider>
          <AuthProvider>
            <WishlistProvider>{children}</WishlistProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
