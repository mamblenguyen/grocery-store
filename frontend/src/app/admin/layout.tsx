'use client';
import {
  Boxes, Building2, ClipboardList, ExternalLink, FolderTree, LayoutDashboard, LogOut, Menu, MessageSquare, Package,
  AlertTriangle, BarChart3, BadgeCheck, Contact, QrCode, ReceiptText, Settings, ShieldCheck, Store, Ticket, Users, Warehouse, X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NotificationBell } from '@/components/NotificationBell';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useToast } from '@/components/Toast';
import { SettingsProvider, useSettings } from '@/context/settings';
import { actingStore, setApiStore } from '@/lib/api';
import { ROLES } from '@/lib/format';

const GROUPS = [
  { title: 'Bán hàng', items: [
    { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard },
    { href: '/admin/pos', label: 'Bán tại quầy (POS)', icon: Store },
    { href: '/admin/reports', label: 'Báo cáo lợi nhuận', icon: BarChart3 },
    { href: '/admin/orders', label: 'Đơn hàng', icon: ReceiptText },
    { href: '/admin/coupons', label: 'Mã giảm giá', icon: Ticket },
    { href: '/admin/customers', label: 'Khách hàng', icon: Contact },
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
    { href: '/admin/staff', label: 'Nhân viên', icon: Users, adminOnly: true },
    { href: '/admin/settings', label: 'Cài đặt cửa hàng', icon: Settings, adminOnly: true },
    { href: '/admin/subscription', label: 'Gói dịch vụ', icon: BadgeCheck, adminOnly: true },
  ] },
];

/** Thông báo hạn gói dịch vụ / chế độ quản trị hộ */
function Banners() {
  const { user, acting } = useAuth();
  const st = user?.store;
  if (acting)
    return (
      <div className="no-print flex flex-wrap items-center gap-x-3 gap-y-1 bg-violet-700 px-4 py-2 text-sm text-white sm:px-6">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        <span className="flex-1">Bạn đang <b>quản trị hộ</b> cửa hàng <b>{acting.name}</b> với quyền quản trị nền tảng.</span>
        <button className="rounded-lg bg-white/15 px-3 py-1 font-semibold hover:bg-white/25" onClick={() => { actingStore.clear(); window.location.assign(`/super/stores/${acting.id}`); }}>Thoát về trang nền tảng</button>
      </div>
    );
  if (!st || st.daysLeft == null || st.daysLeft > 7) return null;
  const expired = st.daysLeft <= 0;
  return (
    <div className={`no-print flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm sm:px-6 ${expired ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-900'}`}>
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        {expired
          ? <>Gói <b>{st.plan?.name}</b> đã hết hạn – cửa hàng chỉ được <b>xem dữ liệu</b>, không thể bán hàng hay chỉnh sửa. Khách cũng không đặt được đơn online.</>
          : <>Gói <b>{st.plan?.name}</b> còn <b>{st.daysLeft} ngày</b> (hết hạn {new Date(st.planExpiresAt!).toLocaleDateString('vi-VN')}).</>}
        {' '}Liên hệ quản trị nền tảng để gia hạn.
      </span>
      {user?.role === 'ADMIN' && <Link href="/admin/subscription" className={`rounded-lg px-3 py-1 font-semibold ${expired ? 'bg-white/20 hover:bg-white/30' : 'bg-amber-200 hover:bg-amber-300'}`}>Xem gói</Link>}
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  setApiStore(null);
  const { user, loading, isStaff } = useAuth();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login?next=/admin');
    else if (user.role === 'SUPER_ADMIN' && !isStaff) router.replace('/super');
    else if (!isStaff) router.replace('/');
  }, [loading, user, isStaff, router]);
  // API trả 402 khi gói hết hạn → báo rõ cho người dùng
  useEffect(() => {
    const h = (e: Event) => toast((e as CustomEvent).detail, 'error');
    window.addEventListener('plan-expired', h);
    return () => window.removeEventListener('plan-expired', h);
  }, [toast]);
  if (loading || !isStaff) return <Spinner className="py-40" />;
  return <SettingsProvider admin><AdminShell>{children}</AdminShell></SettingsProvider>;
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout, acting } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();
  const pathname = usePathname();
  const [mobile, setMobile] = useState(false);
  useEffect(() => setMobile(false), [pathname]);
  const isOwner = user?.role === 'ADMIN' || !!acting;
  const storeSlug = acting?.slug ?? user?.store?.slug;

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
          const items = g.items.filter((m) => !('adminOnly' in m && m.adminOnly) || isOwner);
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
          {user?.role === 'SUPER_ADMIN' && <Link href="/super" className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white" title="Trang nền tảng"><ShieldCheck className="h-4 w-4" /></Link>}
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
        <Banners />
        <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button className="btn-icon btn-ghost -ml-2 lg:hidden" onClick={() => setMobile(true)}>{mobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          <h1 className="text-base font-bold text-ink">{current?.label ?? 'Quản trị'}</h1>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <NotificationBell allHref="/account/notifications" dark />
            <Link href="/admin/pos" className="btn-primary btn-sm hidden sm:inline-flex"><Store className="h-4 w-4" /> Bán hàng</Link>
            <Link href={storeSlug ? `/s/${storeSlug}` : '/'} target="_blank" className="btn-outline btn-sm"><ExternalLink className="h-4 w-4" /><span className="hidden sm:inline">Xem cửa hàng</span></Link>
          </div>
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
