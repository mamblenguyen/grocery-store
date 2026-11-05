import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setApiStore, storeRestored } from '@/lib/api';
import { store as storage } from '@/lib/storage';
import type { PublicStore } from '@/lib/types';

const KEY = 'grocery_store';

interface StoreCtx {
  /** Cửa hàng đang mua sắm (null = chưa chọn) */
  store: PublicStore | null;
  ready: boolean;
  select: (s: PublicStore) => void;
  /** Mở cửa hàng theo slug (từ mã QR / đường link) */
  selectSlug: (slug: string) => Promise<PublicStore>;
  clear: () => void;
}
const Ctx = createContext<StoreCtx>(null as any);

/** Lấy slug từ nội dung mã QR: link https://…/s/<slug>, "store:<slug>" hoặc chính slug */
export function parseStoreCode(raw: string): string | null {
  const t = raw.trim();
  const m = t.match(/\/s\/([a-z0-9-]{3,})/i) ?? t.match(/^store:([a-z0-9-]{3,})$/i) ?? t.match(/^([a-z0-9-]{3,})$/i);
  if (m) return m[1].toLowerCase();
  // Link subdomain riêng của đối tác: https://<slug>.<tên miền sàn>/…
  try {
    const host = new URL(t).hostname.toLowerCase();
    const parts = host.split('.');
    const root = (process.env.EXPO_PUBLIC_ROOT_DOMAIN || '').split(':')[0].toLowerCase();
    if (root && host.endsWith(`.${root}`)) { const sub = host.slice(0, -(root.length + 1)); return sub && sub !== 'www' && !sub.includes('.') ? sub : null; }
    if (parts.length >= 3 && parts[0] !== 'www' && /^[a-z0-9-]{3,}$/.test(parts[0])) return parts[0];
  } catch {}
  return null;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<PublicStore | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    storage.get<PublicStore | null>(KEY, null).then((s) => {
      if (s) { setApiStore(s.slug); setStore(s); }
      storeRestored();
      setReady(true);
      // Làm mới thông tin (cửa hàng có thể đổi tên / tạm ngưng)
      if (s) api<PublicStore>(`/stores/${s.slug}`, { store: null }).then((fresh) => { setStore(fresh); storage.set(KEY, fresh); }).catch(() => {});
    });
  }, []);

  const select = useCallback((s: PublicStore) => {
    setApiStore(s.slug);
    setStore(s);
    storage.set(KEY, s);
  }, []);

  const selectSlug = useCallback(async (slug: string) => {
    const s = await api<PublicStore>(`/stores/${slug}`, { store: null });
    select(s);
    return s;
  }, [select]);

  const clear = useCallback(() => { setApiStore(null); setStore(null); storage.set(KEY, null); }, []);

  return <Ctx.Provider value={{ store, ready, select, selectSlug, clear }}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
