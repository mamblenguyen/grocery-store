'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { actingStore, api, ApiError, tokenStore, type ActingStore } from '@/lib/api';
import type { User } from '@/lib/types';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { email: string; password: string; fullName: string; phone?: string }) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
  /** Được vào trang quản trị cửa hàng (nhân viên, chủ, hoặc super admin đang quản trị hộ) */
  isStaff: boolean;
  isSuper: boolean;
  /** Cửa hàng super admin đang quản trị hộ */
  acting: ActingStore | null;
  setActing: (s: ActingStore | null) => void;
}

const Ctx = createContext<AuthCtx>(null as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActingState] = useState<ActingStore | null>(null);
  useEffect(() => setActingState(actingStore.get()), []);
  const setActing = useCallback((st: ActingStore | null) => {
    if (st) actingStore.set(st); else actingStore.clear();
    setActingState(st);
  }, []);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) return setUser(null);
    try {
      setUser(await api<User>('/auth/me'));
    } catch (e) {
      // Chỉ đăng xuất khi server từ chối token; lỗi mạng / request bị huỷ khi chuyển trang thì giữ phiên
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        tokenStore.clear();
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const handle = (r: { accessToken: string; user: User }) => {
    tokenStore.set(r.accessToken);
    setUser(r.user);
    return r.user;
  };

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        refresh,
        isStaff: user?.role === 'ADMIN' || user?.role === 'STAFF' || (user?.role === 'SUPER_ADMIN' && !!acting),
        isSuper: user?.role === 'SUPER_ADMIN',
        acting: user?.role === 'SUPER_ADMIN' ? acting : null,
        setActing,
        login: async (email, password) => handle(await api('/auth/login', { method: 'POST', json: { email, password } })),
        register: async (data) => handle(await api('/auth/register', { method: 'POST', json: data })),
        logout: () => {
          tokenStore.clear();
          actingStore.clear();
          setActingState(null);
          setUser(null);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
