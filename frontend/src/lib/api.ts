import { cookieDomain } from './platform';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const ASSET_BASE = API_URL.replace(/\/api\/?$/, '');
const TOKEN_KEY = 'grocery_token';

/**
 * Token đăng nhập. Khi bật subdomain, lưu thêm cookie trên tên miền gốc để
 * đăng nhập 1 lần dùng được ở sàn và mọi subdomain cửa hàng.
 */
function readCookie(name: string) {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}
function writeCookie(name: string, value: string, maxAge: number) {
  const domain = cookieDomain();
  if (!domain) return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Domain=${domain}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}
export const tokenStore = {
  get: () => {
    if (typeof window === 'undefined') return null;
    if (cookieDomain()) {
      const c = readCookie(TOKEN_KEY);
      if (c) return c;
      // đã đăng xuất ở subdomain khác → cookie bị xoá, bỏ luôn bản lưu cục bộ
      if (localStorage.getItem(TOKEN_KEY) && readCookie(`${TOKEN_KEY}_set`)) { localStorage.removeItem(TOKEN_KEY); return null; }
    }
    return localStorage.getItem(TOKEN_KEY);
  },
  set: (t: string) => { localStorage.setItem(TOKEN_KEY, t); writeCookie(TOKEN_KEY, t, 60 * 60 * 24 * 30); writeCookie(`${TOKEN_KEY}_set`, '1', 60 * 60 * 24 * 365); },
  clear: () => { localStorage.removeItem(TOKEN_KEY); writeCookie(TOKEN_KEY, '', 0); },
};

const ACTING_KEY = 'grocery_acting_store';

/** Cửa hàng đang xem ở storefront (/s/[store]) – gửi kèm header X-Store */
let currentStore: string | null = null;
export const setApiStore = (slug: string | null) => { currentStore = slug; };
export const getApiStore = () => currentStore;

export interface ActingStore { id: number; slug: string; name: string }
/** Super admin đang quản trị hộ cửa hàng nào (header X-Store-Id cho /admin/*) */
export const actingStore = {
  get: (): ActingStore | null => {
    if (typeof window === 'undefined') return null;
    try { return JSON.parse(localStorage.getItem(ACTING_KEY) || 'null'); } catch { return null; }
  },
  set: (s: ActingStore) => localStorage.setItem(ACTING_KEY, JSON.stringify(s)),
  clear: () => localStorage.removeItem(ACTING_KEY),
};

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T = any>(path: string, opts: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers as Record<string, string>) };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (currentStore && !headers['X-Store']) headers['X-Store'] = currentStore;
  const acting = actingStore.get();
  if (acting && path.startsWith('/admin') && !headers['X-Store-Id']) headers['X-Store-Id'] = String(acting.id);
  let body = opts.body;
  if (opts.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.json);
  }
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers, body, cache: 'no-store' });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Có lỗi xảy ra';
    if (res.status === 401 && token) tokenStore.clear();
    if (res.status === 402 && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('plan-expired', { detail: msg }));
    throw new ApiError(msg, res.status);
  }
  return data as T;
}

/** Tạo query string, bỏ qua giá trị rỗng */
export function qs(params: Record<string, unknown>) {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') s.set(k, String(v));
  });
  const str = s.toString();
  return str ? `?${str}` : '';
}

export function imageUrl(src?: string | null) {
  if (!src) return 'https://placehold.co/600x600?text=No+Image';
  return src.startsWith('/uploads') ? `${ASSET_BASE}${src}` : src;
}

export async function uploadImages(files: FileList | File[]): Promise<string[]> {
  const fd = new FormData();
  Array.from(files).forEach((f) => fd.append('files', f));
  const r = await api<{ urls: string[] }>('/admin/upload', { method: 'POST', body: fd });
  return r.urls;
}
