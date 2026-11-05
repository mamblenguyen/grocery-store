'use client';
import {
  Boxes, Building2, ClipboardList, ExternalLink, FolderTree, LayoutDashboard, LogOut, Menu, MessageSquare, Package,
  BarChart3, QrCode, ReceiptText, Settings, Store, Ticket, Users, Warehouse, X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NotificationBell } from '@/components/NotificationBell';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useSettings } from '@/context/settings';
import { ROLES } from '@/lib/format';

const GROUPS = [
  { title: 'Bán hàng', items: [
    { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard },
    { href: '/admin/pos', label: 'Bán tại quầy (POS)', icon: Store },
    { href: '/admin/reports', label: 'Báo cáo lợi nhuận', icon: BarChart3 },
    { href: '/admin/orders', label: 'Đơn hàng', icon: ReceiptText },
    { href: '/admin/coupons', label: 'Mã giảm giá', icon: Ticket },
  ] },
  { title: 'Hàng hoá', items: [
    { href: '/admin/products', label: 'Sản phẩm', icon: Package },
    { href: '/admin/categories', label: 'Danh mục', icon: FolderTree },
    { href: '/admin/reviews', label: 'Đánh giá', icon: MessageSquare },
  ] },
  { title: 'Kho hàng', items: [
    { href: '/admin/inventory', label: 'Tồn kho', icon: Boxes },
    { href: '/admin/stock', label: 'Phiếu nhập / xuất / kiểm kê', icon: ClipboardList },
    { href: '/admin/suppliers', label: 'Nhà cung cấp', icon: Building2 },
    { href: '/admin/labels', label: 'In tem mã QR', icon: QrCode },
  ] },
  { title: 'Hệ thống', items: [
    { href: '/admin/users', label: 'Người dùng', icon: Users, adminOnly: true },
    { href: '/admin/settings', label: 'Cài đặt cửa hàng', icon: Settings, adminOnly: true },
  ] },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isStaff, logout } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();
  const pathname = usePathname();
  const [mobile, setMobile] = useState(false);

  useEffect(() => { if (!loading && !isStaff) router.replace('/login?next=/admin'); }, [loading, isStaff, router]);
  useEffect(() => setMobile(false), [pathname]);
  if (loading || !isStaff) return <Spinner className="py-40" />;

  const all = GROUPS.flatMap((g) => g.items);
  const current = [...all].sort((a, b) => b.href.length - a.href.length).find((m) => (m.href === '/admin' ? pathname === '/admin' : pathname.startsWith(m.href)));

  const sidebar = (
    <div className="flex h-full flex-col bg-ink text-slate-300">
      <Link href="/admin" className="flex items-center gap-3 px-5 py-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white"><Warehouse className="h-5 w-5" /></span>
        <span className="leading-tight"><span className="block font-bold text-white">{settings.storeName}</span><span className="text-xs text-slate-400">Quản trị cửa hàng</span></span>
      </Link>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {GROUPS.map((g) => {
          const items = g.items.filter((m) => !('adminOnly' in m && m.adminOnly) || user?.role === 'ADMIN');
          if (!items.length) return null;
          return (
            <div key={g.title}>
              <div className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">{g.title}</div>
              {items.map((m) => {
                const active = current?.href === m.href;
                return (
                  <Link key={m.href} href={m.href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/40' : 'hover:bg-white/5 hover:text-white'}`}>
                    <m.icon className="h-[18px] w-[18px]" />{m.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 font-bold text-white">{user?.fullName.trim().split(' ').pop()?.[0]?.toUpperCase()}</span>
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-white">{user?.fullName}</div><div className="text-xs text-slate-500">{ROLES[user!.role]}</div></div>
          <button onClick={() => { logout(); router.push('/login'); }} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-red-400" title="Đăng xuất"><LogOut className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100/70">
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{sidebar}</aside>
      {mobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobile(false)} />
          <div className="absolute inset-y-0 left-0 w-64">{sidebar}</div>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button className="btn-icon btn-ghost -ml-2 lg:hidden" onClick={() => setMobile(true)}>{mobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          <h1 className="text-base font-bold text-ink">{current?.label ?? 'Quản trị'}</h1>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <NotificationBell allHref="/account/notifications" dark />
            <Link href="/admin/pos" className="btn-primary btn-sm hidden sm:inline-flex"><Store className="h-4 w-4" /> Bán hàng</Link>
            <Link href="/" target="_blank" className="btn-outline btn-sm"><ExternalLink className="h-4 w-4" /><span className="hidden sm:inline">Xem cửa hàng</span></Link>
          </div>
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
