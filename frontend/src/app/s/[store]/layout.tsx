'use client';
import { Store } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { CartDrawer } from '@/components/shop/CartDrawer';
import { Footer } from '@/components/shop/Footer';
import { Header } from '@/components/shop/Header';
import { MobileNav } from '@/components/shop/MobileNav';
import { Spinner } from '@/components/ui';
import { CartProvider } from '@/context/cart';
import { SettingsProvider, useSettings } from '@/context/settings';
import { lastStore, StoreProvider } from '@/context/store';
import { setApiStore } from '@/lib/api';

function Shell({ slug, children }: { slug: string; children: React.ReactNode }) {
  const { settings, loaded, error } = useSettings();
  useEffect(() => {
    if (loaded && !error) {
      lastStore.set({ slug, name: settings.storeName });
      document.title = settings.storeName;
    }
  }, [loaded, error, slug, settings.storeName]);
  if (!loaded) return <Spinner className="py-40" />;
  if (error)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200 text-slate-500"><Store className="h-8 w-8" /></span>
        <h1 className="text-xl font-bold text-ink">{error}</h1>
        <p className="max-w-md text-slate-500">Đường dẫn có thể đã thay đổi hoặc cửa hàng đang tạm ngưng. Hãy chọn một cửa hàng khác trên nền tảng.</p>
        <Link href="/" className="btn-primary">Xem danh sách cửa hàng</Link>
      </div>
    );
  return (
    <div className="flex min-h-screen flex-col pb-16 md:pb-0">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
      <MobileNav />
    </div>
  );
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const { store } = useParams<{ store: string }>();
  const slug = decodeURIComponent(store).toLowerCase();
  // Đặt ngay khi render để mọi request của trang con đều gửi kèm X-Store
  setApiStore(slug);
  return (
    <StoreProvider slug={slug}>
      <SettingsProvider store={slug}>
        <CartProvider store={slug}>
          <Shell slug={slug}>{children}</Shell>
        </CartProvider>
      </SettingsProvider>
    </StoreProvider>
  );
}
