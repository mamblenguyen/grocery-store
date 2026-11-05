'use client';
import {
  Bell, ChevronDown, Grid3x3, Heart, LayoutDashboard, LogOut, MapPin, Menu, Package, Phone, Search, ShoppingCart, User, X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/auth';
import { useCart } from '@/context/cart';
import { useSettings } from '@/context/settings';
import { useWishlist } from '@/context/wishlist';
import { NotificationBell } from '@/components/NotificationBell';
import { api, imageUrl } from '@/lib/api';
import { money } from '@/lib/format';
import type { Category, Paged, Product } from '@/lib/types';

export function Logo({ light = false }: { light?: boolean }) {
  const { settings } = useSettings();
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5">
      {settings.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl(settings.logo)} alt={settings.storeName} className="h-10 w-auto" />
      ) : (
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-600/30">
          <ShoppingCart className="h-5 w-5" strokeWidth={2.4} />
        </span>
      )}
      <span className="leading-tight">
        <span className={`block text-lg font-extrabold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>{settings.storeName}</span>
        <span className={`hidden text-[11px] font-medium sm:block ${light ? 'text-brand-100' : 'text-slate-400'}`}>{settings.slogan}</span>
      </span>
    </Link>
  );
}

function SearchBox({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get('search') ?? '');
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) return setResults([]);
    const t = setTimeout(() => api<Paged<Product>>(`/products?limit=6&search=${encodeURIComponent(q.trim())}`).then((r) => setResults(r.items)).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const h = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setOpen(false);
    onDone?.();
    router.push(`/products?search=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div ref={box} className="relative w-full">
      <form onSubmit={submit} className="flex h-11 items-center overflow-hidden rounded-xl border-2 border-brand-600 bg-white">
        <Search className="ml-3 h-5 w-5 shrink-0 text-slate-400" />
        <input
          className="h-full w-full bg-transparent px-3 text-sm outline-none placeholder:text-slate-400"
          placeholder="Tìm rau củ, mì gói, sữa, nước giặt…"
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        />
        <button className="h-full shrink-0 bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700">Tìm kiếm</button>
      </form>
      {open && results.length > 0 && (
        <div className="animate-fade-in absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lift">
          {results.map((p) => (
            <Link key={p.id} href={`/products/${p.slug}`} onClick={() => { setOpen(false); onDone?.(); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl(p.thumbnail)} alt="" className="h-11 w-11 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">{p.name}</div>
                <div className="text-xs text-slate-400">{p.brand}</div>
              </div>
              <div className="text-sm font-bold text-brand-700">{money(p.minPrice)}</div>
            </Link>
          ))}
          <button onClick={submit} className="w-full border-t border-slate-100 py-2.5 text-center text-sm font-medium text-brand-700 hover:bg-brand-50">
            Xem tất cả kết quả cho “{q}”
          </button>
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, logout, isStaff } = useAuth();
  const router = useRouter();
  if (!user)
    return (
      <Link href="/login" className="hidden items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-100 md:flex">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100"><User className="h-5 w-5 text-slate-600" /></span>
        <span className="text-left text-xs leading-tight"><span className="block text-slate-400">Xin chào</span><span className="font-semibold text-ink">Đăng nhập</span></span>
      </Link>
    );
  return (
    <div className="group relative hidden md:block">
      <button className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-100">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{user.fullName.trim().split(' ').pop()?.[0]?.toUpperCase()}</span>
        <span className="text-left text-xs leading-tight"><span className="block text-slate-400">Tài khoản</span><span className="flex items-center gap-1 font-semibold text-ink">{user.fullName.split(' ').pop()} <ChevronDown className="h-3 w-3" /></span></span>
      </button>
      <div className="invisible absolute right-0 z-50 w-56 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-lift">
          {isStaff && <Link href="/admin" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"><LayoutDashboard className="h-4 w-4" /> Trang quản trị</Link>}
          <Link href="/account" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"><User className="h-4 w-4" /> Thông tin tài khoản</Link>
          <Link href="/orders" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"><Package className="h-4 w-4" /> Đơn hàng của tôi</Link>
          <Link href="/account/addresses" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"><MapPin className="h-4 w-4" /> Sổ địa chỉ</Link>
          <Link href="/account/wishlist" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"><Heart className="h-4 w-4" /> Sản phẩm yêu thích</Link>
          <Link href="/account/notifications" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"><Bell className="h-4 w-4" /> Thông báo</Link>
          <div className="my-1 border-t border-slate-100" />
          <button onClick={() => { logout(); router.push('/'); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" /> Đăng xuất</button>
        </div>
      </div>
    </div>
  );
}

export function Header() {
  const { settings } = useSettings();
  const { count, setOpen } = useCart();
  const wl = useWishlist();
  const pathname = usePathname();
  const [cats, setCats] = useState<Category[]>([]);
  const [menu, setMenu] = useState(false);

  useEffect(() => { api<Category[]>('/categories').then(setCats).catch(() => {}); }, []);
  useEffect(() => setMenu(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 bg-white shadow-[0_1px_0_rgb(15_23_42/0.06)]">
      {settings.announcement && (
        <div className="bg-brand-700 text-white">
          <div className="container-x flex h-9 items-center justify-between gap-4 text-xs sm:text-[13px]">
            <span className="truncate font-medium">{settings.announcement}</span>
            <div className="hidden shrink-0 items-center gap-5 text-brand-100 md:flex">
              {settings.openingHours && <span>🕒 {settings.openingHours}</span>}
              <Link href="/orders" className="hover:text-white">Tra cứu đơn hàng</Link>
            </div>
          </div>
        </div>
      )}
      <div className="container-x flex h-[72px] items-center gap-3 lg:gap-6">
        <button className="btn-icon btn-ghost -ml-2 lg:hidden" onClick={() => setMenu(true)} aria-label="Menu"><Menu className="h-6 w-6" /></button>
        <Logo />
        <div className="hidden flex-1 md:block"><Suspense><SearchBox /></Suspense></div>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          {settings.hotline && (
            <a href={`tel:${settings.hotline.replace(/\s/g, '')}`} className="hidden items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-100 xl:flex">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50"><Phone className="h-[18px] w-[18px] text-brand-700" /></span>
              <span className="text-left text-xs leading-tight"><span className="block text-slate-400">Hotline</span><span className="font-bold text-ink">{settings.hotline}</span></span>
            </a>
          )}
          <UserMenu />
          <NotificationBell />
          <Link href="/account/wishlist" className="btn-icon btn-ghost relative hidden sm:flex" aria-label="Yêu thích">
            <Heart className="h-[22px] w-[22px]" />
            {wl.ids.size > 0 && <span className="absolute top-0.5 right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{wl.ids.size}</span>}
          </Link>
          <button onClick={() => setOpen(true)} className="relative flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-3.5 text-white shadow-md shadow-brand-600/25 transition hover:bg-brand-700">
            <ShoppingCart className="h-5 w-5" />
            <span className="hidden text-sm font-semibold sm:inline">Giỏ hàng</span>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-brand-700">{count}</span>
          </button>
        </div>
      </div>
      <div className="container-x pb-3 md:hidden"><Suspense><SearchBox /></Suspense></div>

      {/* Thanh danh mục */}
      <nav className="hidden border-t border-slate-100 lg:block">
        <div className="container-x flex h-12 items-center gap-1">
          <div className="group relative">
            <button className="flex h-12 items-center gap-2 bg-brand-50 px-4 text-sm font-semibold text-brand-800"><Grid3x3 className="h-4 w-4" /> Danh mục sản phẩm <ChevronDown className="h-4 w-4" /></button>
            <div className="invisible absolute top-full left-0 z-50 w-72 opacity-0 transition group-hover:visible group-hover:opacity-100">
              <div className="rounded-b-xl border border-slate-200 bg-white p-1.5 shadow-lift">
                {cats.map((c) => (
                  <Link key={c.id} href={`/products?category=${c.slug}`} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-brand-50 hover:text-brand-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl(c.image)} alt="" className="h-8 w-8 rounded-lg object-cover" />
                    <span className="flex-1">{c.name}</span>
                    <span className="text-xs text-slate-400">{c._count?.products}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          {cats.slice(0, 6).map((c) => (
            <Link key={c.id} href={`/products?category=${c.slug}`} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-brand-700">{c.name}</Link>
          ))}
          <Link href="/products?sort=best_selling" className="ml-auto rounded-lg px-3 py-2 text-sm font-semibold text-accent-600 hover:bg-accent-50">🔥 Bán chạy</Link>
        </div>
      </nav>

      {/* Menu mobile */}
      {menu && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div className="animate-fade-in absolute inset-0 bg-slate-900/50" onClick={() => setMenu(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-4"><Logo /><button className="btn-icon btn-ghost" onClick={() => setMenu(false)}><X className="h-5 w-5" /></button></div>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="px-3 pb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">Danh mục</div>
              {cats.map((c) => (
                <Link key={c.id} href={`/products?category=${c.slug}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl(c.image)} alt="" className="h-8 w-8 rounded-lg object-cover" />{c.name}
                </Link>
              ))}
            </div>
            {settings.hotline && <a href={`tel:${settings.hotline}`} className="m-3 btn-primary"><Phone className="h-4 w-4" /> Gọi {settings.hotline}</a>}
          </div>
        </div>
      )}
    </header>
  );
}
