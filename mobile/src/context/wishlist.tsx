import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/components/Toast';
import { useAuth } from './auth';

const Ctx = createContext<{ has: (id: number) => boolean; toggle: (id: number) => void; count: number }>({ has: () => false, toggle: () => {}, count: 0 });

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<number>>(new Set());
  useEffect(() => {
    if (!user) return setIds(new Set());
    api<number[]>('/wishlist/ids').then((l) => setIds(new Set(l))).catch(() => {});
  }, [user]);
  const toggle = useCallback(async (id: number) => {
    if (!user) { toast('Đăng nhập để lưu sản phẩm yêu thích', 'error'); router.push('/login'); return; }
    const had = ids.has(id);
    setIds((s) => { const n = new Set(s); had ? n.delete(id) : n.add(id); return n; });
    try { await api(`/wishlist/${id}`, { method: had ? 'DELETE' : 'POST' }); toast(had ? 'Đã bỏ yêu thích' : 'Đã thêm vào yêu thích ❤️'); }
    catch (e: any) { toast(e.message, 'error'); }
  }, [ids, user]);
  return <Ctx.Provider value={{ has: (id) => ids.has(id), toggle, count: ids.size }}>{children}</Ctx.Provider>;
}
export const useWishlist = () => useContext(Ctx);
