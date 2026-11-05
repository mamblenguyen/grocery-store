'use client';
import { Bike, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { NotificationBell } from '@/components/NotificationBell';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { setApiStore } from '@/lib/api';
import { PLATFORM_NAME } from '@/lib/platform';

/** Khu vực tài xế giao hàng */
export default function ShipperLayout({ children }: { children: React.ReactNode }) {
  setApiStore(null);
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!loading && user?.role !== 'SHIPPER') router.replace(user ? '/' : '/login?next=/shipper'); }, [loading, user, router]);
  if (loading || user?.role !== 'SHIPPER') return <Spinner className="py-40" />;
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-30 bg-brand-700 text-white shadow">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link href="/shipper" className="flex items-center gap-2 font-bold"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"><Bike className="h-5 w-5" /></span>Tài xế {PLATFORM_NAME}</Link>
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell allHref="/account/notifications" />
            <button onClick={() => { logout(); router.push('/login'); }} className="rounded-lg p-2 hover:bg-white/10" title="Đăng xuất" aria-label="Đăng xuất"><LogOut className="h-5 w-5" /></button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-3 sm:p-4">{children}</main>
    </div>
  );
}
