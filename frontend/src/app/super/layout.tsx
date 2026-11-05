'use client';
import { BadgeCheck, Bike, Boxes, LayoutDashboard, LogOut, Menu, ReceiptText, ShieldCheck, Store, Users, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { setApiStore } from '@/lib/api';
import { PLATFORM_NAME } from '@/lib/platform';

const MENU = [
  { href: '/super', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/super/stores', label: 'Đối tác', icon: Store },
  { href: '/admin', label: 'Đơn hàng & sản phẩm (tất cả)', icon: Boxes },
  { href: '/super/shippers', label: 'Tài xế giao hàng', icon: Bike },
  { href: '/super/plans', label: 'Gói dịch vụ', icon: BadgeCheck },
  { href: '/super/payments', label: 'Phiếu thu phí', icon: ReceiptText },
  { href: '/super/users', label: 'Người dùng', icon: Users },
];

export default function SuperLayout({ children }: { children: React.ReactNode }) {
  setApiStore(null);
  const { user, loading, isSuper, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobile, setMobile] = useState(false);
  useEffect(() => { if (!loading && !isSuper) router.replace(user ? '/' : '/login?next=/super'); }, [loading, isSuper, user, router]);
  useEffect(() => setMobile(false), [pathname]);
  if (loading || !isSuper) return <Spinner className="py-40" />;
  const current = [...MENU].sort((a, b) => b.href.length - a.href.length).find((m) => (m.href === '/super' ? pathname === '/super' : pathname.startsWith(m.href)));

  const sidebar = (
    <div className="flex h-full flex-col bg-[#1e1538] text-slate-300">
      <Link href="/super" className="flex items-center gap-3 px-5 py-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 text-white"><ShieldCheck className="h-5 w-5" /></span>
        <span className="leading-tight"><span className="block font-bold text-white">{PLATFORM_NAME}</span><span className="text-xs text-violet-300">Quản trị nền tảng</span></span>
      </Link>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {MENU.map((m) => (
          <Link key={m.href} href={m.href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${current?.href === m.href ? 'bg-violet-600 text-white shadow-lg shadow-violet-950/40' : 'hover:bg-white/5 hover:text-white'}`}>
            <m.icon className="h-[18px] w-[18px]" />{m.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 font-bold text-white">{user?.fullName.trim().split(' ').pop()?.[0]?.toUpperCase()}</span>
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-white">{user?.fullName}</div><div className="truncate text-xs text-slate-400">{user?.email}</div></div>
          <button onClick={() => { logout(); router.push('/login'); }} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-red-400" title="Đăng xuất"><LogOut className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100/70">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{sidebar}</aside>
      {mobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobile(false)} />
          <div className="absolute inset-y-0 left-0 w-64">{sidebar}</div>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button className="btn-icon btn-ghost -ml-2 lg:hidden" onClick={() => setMobile(true)} aria-label="Menu">{mobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          <h1 className="text-base font-bold text-ink">{current?.label ?? 'Quản trị nền tảng'}</h1>
          <Link href="/" target="_blank" className="btn-outline btn-sm ml-auto"><Store className="h-4 w-4" /><span className="hidden sm:inline">Trang nền tảng</span></Link>
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
