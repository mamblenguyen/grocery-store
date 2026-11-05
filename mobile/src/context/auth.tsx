import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, ApiError, setApiActing, setUnauthorizedHandler, tokenStore } from '@/lib/api';
import { store as storage } from '@/lib/storage';
import type { StoreRef, User } from '@/lib/types';
import { useStore } from './store';

const ACTING_KEY = 'grocery_acting_store';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  /** Dùng được công cụ quản lý cửa hàng (nhân viên, chủ, hoặc super admin đang quản trị hộ) */
  isStaff: boolean;
  isSuper: boolean;
  /** Cửa hàng super admin đang quản trị hộ */
  acting: StoreRef | null;
  setActing: (s: StoreRef | null) => void;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { email: string; password: string; fullName: string; phone?: string }) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}
const Ctx = createContext<AuthCtx>(null as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActingState] = useState<StoreRef | null>(null);
  const shop = useStore();

  const setActing = useCallback((s: StoreRef | null) => {
    setApiActing(s?.id ?? null);
    setActingState(s);
    storage.set(ACTING_KEY, s);
  }, []);

  const refresh = useCallback(async () => {
    if (!(await tokenStore.get())) return setUser(null);
    try { setUser(await api<User>('/auth/me')); }
    catch (e) { if (e instanceof ApiError && (e.status === 401 || e.status === 403)) setUser(null); }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    storage.get<StoreRef | null>(ACTING_KEY, null).then((s) => { if (s) { setApiActing(s.id); setActingState(s); } });
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // Nhân viên chưa chọn cửa hàng để xem → mặc định mở cửa hàng của mình
  const autoPicked = useRef(false);
  useEffect(() => {
    if (autoPicked.current || !shop.ready || shop.store || !user?.store || user.store.status !== 'ACTIVE') return;
    autoPicked.current = true;
    shop.selectSlug(user.store.slug).catch(() => {});
  }, [shop, user]);

  const handle = async (r: { accessToken: string; user: User }) => { await tokenStore.set(r.accessToken); setUser(r.user); refresh(); return r.user; };
  const isSuper = user?.role === 'SUPER_ADMIN';

  return (
    <Ctx.Provider value={{
      user, loading, refresh, isSuper,
      acting: isSuper ? acting : null,
      setActing,
      isStaff: user?.role === 'ADMIN' || user?.role === 'STAFF' || (isSuper && !!acting),
      login: async (email, password) => handle(await api('/auth/login', { method: 'POST', json: { email: email.trim(), password } })),
      register: async (data) => handle(await api('/auth/register', { method: 'POST', json: data })),
      logout: async () => { await tokenStore.clear(); setActing(null); setUser(null); },
    }}>{children}</Ctx.Provider>
  );
}
export const useAuth = () => useContext(Ctx);
