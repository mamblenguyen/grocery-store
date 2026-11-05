import { CartDrawer } from '@/components/shop/CartDrawer';
import { Footer } from '@/components/shop/Footer';
import { Header } from '@/components/shop/Header';
import { MobileNav } from '@/components/shop/MobileNav';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
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
