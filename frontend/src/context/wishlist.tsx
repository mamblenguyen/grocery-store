'use client';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import { useAuth } from './auth';

const Ctx = createContext<{ ids: Set<number>; toggle: (productId: number) => void; has: (id: number) => boolean }>({
  ids: new Set(), toggle: () => {}, has: () => false,
});

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [ids, setIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user) return setIds(new Set());
    api<number[]>('/wishlist/ids').then((l) => setIds(new Set(l))).catch(() => {});
  }, [user]);

  const toggle = useCallback(async (productId: number) => {
    if (!user) {
      toast('Đăng nhập để lưu sản phẩm yêu thích', 'error');
      return router.push('/login');
    }
    const has = ids.has(productId);
    setIds((s) => { const n = new Set(s); has ? n.delete(productId) : n.add(productId); return n; });
    try {
      await api(`/wishlist/${productId}`, { method: has ? 'DELETE' : 'POST' });
      toast(has ? 'Đã bỏ khỏi yêu thích' : 'Đã thêm vào yêu thích ❤️');
    } catch (e: any) {
      toast(e.message, 'error');
    }
  }, [ids, user, router, toast]);

  return <Ctx.Provider value={{ ids, toggle, has: (id) => ids.has(id) }}>{children}</Ctx.Provider>;
}

export const useWishlist = () => useContext(Ctx);
