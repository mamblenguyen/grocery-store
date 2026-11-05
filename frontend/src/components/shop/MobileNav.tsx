'use client';
import { Grid3x3, Heart, Home, ShoppingCart, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth';
import { useCart } from '@/context/cart';
import { useStoreHref } from '@/context/store';

export function MobileNav() {
  const pathname = usePathname();
  const { count, setOpen } = useCart();
  const { user } = useAuth();
  const sh = useStoreHref();
  const item = (href: string, icon: React.ReactNode, label: string) => (
    <Link href={href} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${pathname === href ? 'text-brand-700' : 'text-slate-500'}`}>{icon}{label}</Link>
  );
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {item(sh('/'), <Home className="h-5 w-5" />, 'Trang chủ')}
      {item(sh('/products'), <Grid3x3 className="h-5 w-5" />, 'Sản phẩm')}
      <button onClick={() => setOpen(true)} className="relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-slate-500">
        <ShoppingCart className="h-5 w-5" />Giỏ hàng
        {count > 0 && <span className="absolute top-1 left-1/2 ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{count}</span>}
      </button>
      {item('/account/wishlist', <Heart className="h-5 w-5" />, 'Yêu thích')}
      {item(user ? '/account' : '/login', <User className="h-5 w-5" />, user ? 'Tài khoản' : 'Đăng nhập')}
    </nav>
  );
}
