import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from '@/lib/api';
import type { User } from '@/lib/types';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  isStaff: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { email: string; password: string; fullName: string; phone?: string }) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}
const Ctx = createContext<AuthCtx>(null as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!(await tokenStore.get())) return setUser(null);
    try { setUser(await api<User>('/auth/me')); } catch { setUser(null); }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const handle = async (r: { accessToken: string; user: User }) => { await tokenStore.set(r.accessToken); setUser(r.user); return r.user; };

  return (
    <Ctx.Provider value={{
      user, loading, refresh, isStaff: user?.role === 'ADMIN' || user?.role === 'STAFF',
      login: async (email, password) => handle(await api('/auth/login', { method: 'POST', json: { email: email.trim(), password } })),
      register: async (data) => handle(await api('/auth/register', { method: 'POST', json: data })),
      logout: async () => { await tokenStore.clear(); setUser(null); },
    }}>{children}</Ctx.Provider>
  );
}
export const useAuth = () => useContext(Ctx);
