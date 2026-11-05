export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const ASSET_BASE = API_URL.replace(/\/api\/?$/, '');
const TOKEN_KEY = 'grocery_token';

export const tokenStore = {
  get: () => (typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
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
