import type { Metadata } from 'next';
import { AuthProvider } from '@/context/auth';
import { CartProvider } from '@/context/cart';
import { ToastProvider } from '@/components/Toast';
import { ThemeLoader } from '@/components/ThemeLoader';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tạp Hoá Xanh',
  description: 'Cửa hàng tạp hoá trực tuyến',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <ThemeLoader />
        <ToastProvider>
          <AuthProvider>
            <CartProvider>{children}</CartProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
