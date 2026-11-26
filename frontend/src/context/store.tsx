'use client';
import { createContext, useCallback, useContext } from 'react';
import { useAuth } from './auth';

export { PLATFORM_NAME, PLATFORM_SLOGAN } from '@/lib/platform';
import { storeUrl } from '@/lib/platform';

const LAST_KEY = 'grocery_last_store';
export interface LastStore { slug: string; name: string }

export const lastStore = {
  get: (): LastStore | null => {
    if (typeof window === 'undefined') return null;
    try { return JSON.parse(localStorage.getItem(LAST_KEY) || 'null'); } catch { return null; }
  },
  set: (s: LastStore) => { try { localStorage.setItem(LAST_KEY, JSON.stringify(s)); } catch {} },
};

/** Đường dẫn trong cửa hàng: storeHref('tap-hoa-xanh', '/products') → /s/tap-hoa-xanh/products */
export function storeHref(slug: string, path = '/', base = `/s/${slug}`) {
  if (/^(https?:)?\/\//.test(path) || path.startsWith('/s/') || path.startsWith('#')) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p === '/' ? '' : p}` : p;
}

const Ctx = createContext<{ slug: string; base: string } | null>(null);

/** base: "/s/<slug>" khi xem trên tên miền sàn, "" khi xem trên subdomain riêng của cửa hàng */
export function StoreProvider({ slug, base = `/s/${slug}`, children }: { slug: string; base?: string; children: React.ReactNode }) {
  return <Ctx.Provider value={{ slug, base }}>{children}</Ctx.Provider>;
}

/** Đang xem cửa hàng trên subdomain riêng */
export const useOnSubdomain = () => useContext(Ctx)?.base === '';

/** slug cửa hàng hiện tại (null nếu đang ở trang chung của nền tảng) */
export const useStoreSlug = () => useContext(Ctx)?.slug ?? null;

/** Tạo đường dẫn theo cửa hàng hiện tại; ngoài cửa hàng → trang chủ nền tảng */
export function useStoreHref() {
  const ctx = useContext(Ctx);
  return useCallback((path = '/') => (ctx ? storeHref(ctx.slug, path, ctx.base) : '/'), [ctx]);
}

/** Trong trang quản trị: link tới storefront của cửa hàng đang quản trị */
export function useAdminStoreHref() {
  const { user, acting } = useAuth();
  const slug = acting?.slug ?? user?.store?.slug ?? null;
  return useCallback((path = '/') => (slug ? storeUrl(slug, path) : '/'), [slug]);
}
