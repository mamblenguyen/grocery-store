'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/context/auth';
import { useCart } from '@/context/cart';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isStaff } = useAuth();
  const { count } = useCart();
  const router = useRouter();
  const [q, setQ] = useState('');

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link href="/" className="shrink-0 text-xl font-bold text-brand-700">🛒 Tạp Hoá Xanh</Link>
          <form
            className="flex flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`/products?search=${encodeURIComponent(q)}`);
            }}
          >
            <input className="input rounded-r-none" placeholder="Tìm sản phẩm, thương hiệu..." value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn-primary rounded-l-none">Tìm</button>
          </form>
          <nav className="flex shrink-0 items-center gap-3 text-sm">
            <Link href="/products" className="hidden hover:text-brand-700 md:inline">Sản phẩm</Link>
            {user ? (
              <div className="group relative">
                <button className="hover:text-brand-700">👤 {user.fullName.split(' ').pop()}</button>
                <div className="absolute right-0 hidden w-48 pt-2 group-hover:block">
                  <div className="card flex flex-col gap-1 p-2">
                    {isStaff && <Link href="/admin" className="rounded px-2 py-1 hover:bg-gray-100">Trang quản trị</Link>}
                    <Link href="/account" className="rounded px-2 py-1 hover:bg-gray-100">Tài khoản</Link>
                    <Link href="/orders" className="rounded px-2 py-1 hover:bg-gray-100">Đơn hàng của tôi</Link>
                    <button onClick={() => { logout(); router.push('/'); }} className="rounded px-2 py-1 text-left text-red-600 hover:bg-gray-100">
                      Đăng xuất
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link href="/login" className="hover:text-brand-700">Đăng nhập</Link>
            )}
            <Link href="/cart" className="relative rounded-lg bg-brand-50 px-3 py-2 font-medium text-brand-700">
              🛍 Giỏ hàng
              {count > 0 && (
                <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs text-white">
                  {count}
                </span>
              )}
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
      <footer className="border-t border-gray-200 bg-white py-6 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Tạp Hoá Xanh · Miễn phí giao hàng cho đơn từ 300.000₫
      </footer>
    </div>
  );
}
