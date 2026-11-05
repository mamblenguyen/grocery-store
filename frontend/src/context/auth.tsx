'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from '@/lib/api';
import type { User } from '@/lib/types';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { email: string; password: string; fullName: string; phone?: string }) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
  isStaff: boolean;
}

const Ctx = createContext<AuthCtx>(null as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) return setUser(null);
    try {
      setUser(await api<User>('/auth/me'));
    } catch {
      tokenStore.clear();
      setUser(null);
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
        isStaff: user?.role === 'ADMIN' || user?.role === 'STAFF',
        login: async (email, password) => handle(await api('/auth/login', { method: 'POST', json: { email, password } })),
        register: async (data) => handle(await api('/auth/register', { method: 'POST', json: data })),
        logout: () => {
          tokenStore.clear();
          setUser(null);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
