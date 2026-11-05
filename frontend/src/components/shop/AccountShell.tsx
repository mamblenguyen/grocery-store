'use client';
import { Bell, Heart, LogOut, MapPin, Package, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/context/auth';

const MENU = [
  { href: '/account', label: 'Thông tin tài khoản', icon: User },
  { href: '/orders', label: 'Đơn hàng của tôi', icon: Package },
  { href: '/account/addresses', label: 'Sổ địa chỉ', icon: MapPin },
  { href: '/account/wishlist', label: 'Sản phẩm yêu thích', icon: Heart },
  { href: '/account/notifications', label: 'Thông báo', icon: Bell },
];

export function AccountShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => { if (!loading && !user) router.replace(`/login?next=${pathname}`); }, [user, loading, router, pathname]);
  if (!user) return <Spinner />;
  return (
    <div className="container-x py-8">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="card h-fit p-3">
          <div className="flex items-center gap-3 border-b border-slate-100 p-3 pb-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">{user.fullName.trim().split(' ').pop()?.[0]?.toUpperCase()}</span>
            <div className="min-w-0"><div className="truncate font-semibold text-ink">{user.fullName}</div><div className="truncate text-xs text-slate-400">{user.email}</div></div>
          </div>
          <nav className="mt-2 flex gap-1 overflow-x-auto lg:flex-col">
            {MENU.map((m) => {
              const active = m.href === '/orders' ? pathname.startsWith('/orders') : pathname === m.href;
              return (
                <Link key={m.href} href={m.href} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <m.icon className="h-[18px] w-[18px]" />{m.label}
                </Link>
              );
            })}
            <button onClick={() => { logout(); router.push('/'); }} className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"><LogOut className="h-[18px] w-[18px]" /> Đăng xuất</button>
          </nav>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
