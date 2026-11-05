export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const ASSET_BASE = API_URL.replace(/\/api\/?$/, '');
const TOKEN_KEY = 'grocery_token';

export const tokenStore = {
  get: () => (typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
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
