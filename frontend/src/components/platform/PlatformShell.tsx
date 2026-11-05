'use client';
import { Home, Package, Search, ShoppingCart, Store, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NotificationBell } from '@/components/NotificationBell';
import { UserMenu } from '@/components/shop/Header';
import { useAuth } from '@/context/auth';
import { useAllCarts } from '@/context/cart';
import { lastStore, type LastStore } from '@/context/store';
import { setApiStore } from '@/lib/api';
import { PLATFORM_NAME, PLATFORM_SLOGAN } from '@/lib/platform';

export function PlatformLogo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-600/30">
        <Store className="h-5 w-5" strokeWidth={2.4} />
      </span>
      <span className="leading-tight">
        <span className={`block text-lg font-extrabold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>{PLATFORM_NAME}</span>
        <span className={`hidden text-[11px] font-medium sm:block ${light ? 'text-brand-100' : 'text-slate-400'}`}>{PLATFORM_SLOGAN}</span>
      </span>
    </Link>
  );
}

/** Cửa hàng vừa mua gần nhất (để quay lại nhanh) */
export function useLastStore() {
  const [s, setS] = useState<LastStore | null>(null);
  useEffect(() => setS(lastStore.get()), []);
  return s;
}

export function PlatformShell({ children }: { children: React.ReactNode }) {
  // Trang chung của nền tảng: không gắn cửa hàng nào
  setApiStore(null);
  const { user } = useAuth();
  const { count } = useAllCarts();
  const router = useRouter();
  const [q, setQ] = useState('');
  const pathname = usePathname();
  const search = (e: React.FormEvent) => { e.preventDefault(); router.push(`/products${q.trim() ? `?search=${encodeURIComponent(q.trim())}` : ''}`); };
  const searchBox = (
    <form onSubmit={search} className="flex h-11 w-full items-center overflow-hidden rounded-xl border-2 border-brand-600 bg-white">
      <Search className="ml-3 h-5 w-5 shrink-0 text-slate-400" />
      <input className="h-full w-full min-w-0 bg-transparent px-3 text-sm outline-none placeholder:text-slate-400" placeholder="Tìm trên toàn sàn…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm trên sàn" />
      <button className="h-full shrink-0 bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700">Tìm</button>
    </form>
  );
  const nav = (href: string, icon: React.ReactNode, label: string, active = pathname === href) => (
    <Link href={href} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active ? 'text-brand-700' : 'text-slate-500'}`}>{icon}{label}</Link>
  );
  return (
    <div className="flex min-h-screen flex-col pb-16 md:pb-0">
      <header className="sticky top-0 z-40 bg-white shadow-[0_1px_0_rgb(15_23_42/0.06)]">
        <div className="container-x flex h-[68px] items-center gap-3 lg:gap-6">
          <PlatformLogo />
          <div className="hidden flex-1 md:block">{searchBox}</div>
          <div className="ml-auto flex items-center gap-1.5 md:ml-0">
            <Link href="/stores" className="btn-ghost btn-sm hidden lg:inline-flex"><Store className="h-4 w-4" /> Cửa hàng</Link>
            <UserMenu />
            {user && <NotificationBell />}
            {!user && <Link href="/login" className="btn-primary btn-sm md:hidden">Đăng nhập</Link>}
            <Link href="/cart" className="relative flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-3.5 text-white shadow-md shadow-brand-600/25 hover:bg-brand-700" aria-label="Giỏ hàng">
              <ShoppingCart className="h-5 w-5" /><span className="hidden text-sm font-semibold sm:inline">Giỏ hàng</span>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-brand-700">{count}</span>
            </Link>
          </div>
        </div>
        <div className="container-x pb-3 md:hidden">{searchBox}</div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-16 bg-ink text-slate-400">
        <div className="container-x flex flex-col gap-4 py-10 text-sm md:flex-row md:items-center md:justify-between">
          <PlatformLogo light />
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/stores" className="hover:text-white">Danh sách cửa hàng</Link>
            <Link href="/orders" className="hover:text-white">Đơn hàng của tôi</Link>
            <Link href="/stores#doi-tac" className="hover:text-white">Mở cửa hàng trên {PLATFORM_NAME}</Link>
          </div>
          <div>© {new Date().getFullYear()} {PLATFORM_NAME}</div>
        </div>
      </footer>
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {nav('/', <Home className="h-5 w-5" />, 'Sàn')}
        {nav('/stores', <Store className="h-5 w-5" />, 'Cửa hàng', pathname.startsWith('/stores'))}
        {nav('/cart', <span className="relative"><ShoppingCart className="h-5 w-5" />{count > 0 && <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{count}</span>}</span>, 'Giỏ hàng')}
        {nav('/orders', <Package className="h-5 w-5" />, 'Đơn hàng', pathname.startsWith('/orders'))}
        {nav(user ? '/account' : '/login', <User className="h-5 w-5" />, user ? 'Tài khoản' : 'Đăng nhập', pathname.startsWith('/account') || pathname === '/login')}
      </nav>
    </div>
  );
}
