'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { ROLES } from '@/lib/format';

const MENU = [
  { href: '/admin', label: 'Tổng quan', icon: '📊' },
  { href: '/admin/orders', label: 'Đơn hàng', icon: '🧾' },
  { href: '/admin/products', label: 'Sản phẩm', icon: '📦' },
  { href: '/admin/categories', label: 'Danh mục', icon: '🗂' },
  { href: '/admin/inventory', label: 'Kho hàng', icon: '🏬' },
  { href: '/admin/coupons', label: 'Mã giảm giá', icon: '🎟' },
  { href: '/admin/users', label: 'Người dùng', icon: '👥', adminOnly: true },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isStaff, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isStaff) router.replace('/login?next=/admin');
  }, [loading, isStaff, router]);

  if (loading || !isStaff) return <Spinner />;

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 flex w-60 flex-col bg-gray-900 text-gray-300">
        <Link href="/admin" className="px-5 py-5 text-lg font-bold text-white">🛒 Admin Tạp Hoá</Link>
        <nav className="flex-1 space-y-1 px-3">
          {MENU.filter((m) => !m.adminOnly || user?.role === 'ADMIN').map((m) => {
            const active = m.href === '/admin' ? pathname === '/admin' : pathname.startsWith(m.href);
            return (
              <Link key={m.href} href={m.href} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${active ? 'bg-brand-600 text-white' : 'hover:bg-gray-800'}`}>
                <span>{m.icon}</span>{m.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-gray-800 p-4 text-sm">
          <div className="text-white">{user?.fullName}</div>
          <div className="text-xs text-gray-500">{ROLES[user!.role]}</div>
          <div className="mt-3 flex gap-3 text-xs">
            <Link href="/" className="hover:text-white">Xem cửa hàng</Link>
            <button onClick={() => { logout(); router.push('/login'); }} className="text-red-400 hover:text-red-300">Đăng xuất</button>
          </div>
        </div>
      </aside>
      <main className="ml-60 flex-1 p-6">{children}</main>
    </div>
  );
}
