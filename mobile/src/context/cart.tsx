import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { store as storage } from '@/lib/storage';
import { useStore } from './store';

export interface CartItem {
  variantId: number; productId: number; slug: string; productName: string; variantName: string;
  image?: string | null; price: number; stock: number; quantity: number;
}
export interface CartGroup { slug: string; name: string; items: CartItem[]; count: number; subtotal: number }

const PREFIX = 'grocery_cart_';
const META = 'grocery_cart_stores';
export const cartKey = (slug: string) => `${PREFIX}${slug}`;

interface CartCtx {
  // ── Giỏ của cửa hàng đang chọn
  items: CartItem[]; count: number; subtotal: number;
  add: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  update: (variantId: number, qty: number) => void;
  remove: (variantId: number) => void;
  clear: () => void;
  // ── Toàn sàn
  groups: CartGroup[];
  totalCount: number;
  addTo: (store: { slug: string; name?: string }, item: Omit<CartItem, 'quantity'>, qty?: number) => number;
  updateIn: (slug: string, variantId: number, qty: number) => void;
  removeIn: (slug: string, variantId: number) => void;
  clearIn: (slug: string) => void;
}
const Ctx = createContext<CartCtx>(null as any);

/** Giỏ hàng của toàn sàn: mỗi cửa hàng một giỏ (thanh toán & giao riêng) */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const { store } = useStore();
  const current = store?.slug ?? null;
  const [carts, setCarts] = useState<Record<string, CartItem[]>>({});
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX) && k !== META);
        const rows = await AsyncStorage.multiGet(keys);
        const all: Record<string, CartItem[]> = {};
        for (const [k, v] of rows) { try { const l = JSON.parse(v ?? '[]'); if (Array.isArray(l) && l.length) all[k.slice(PREFIX.length)] = l; } catch {} }
        setCarts(all);
        setNames(await storage.get<Record<string, string>>(META, {}));
      } catch {}
    })();
  }, []);

  // ghi nhớ tên cửa hàng để hiển thị trong giỏ chung
  useEffect(() => {
    if (store && names[store.slug] !== store.name) setNames((n) => { const x = { ...n, [store.slug]: store.name }; storage.set(META, x); return x; });
  }, [store, names]);

  const write = useCallback((slug: string, fn: (l: CartItem[]) => CartItem[]) => {
    setCarts((all) => {
      const next = fn(all[slug] ?? []);
      if (next.length) storage.set(cartKey(slug), next); else AsyncStorage.removeItem(cartKey(slug)).catch(() => {});
      return { ...all, [slug]: next };
    });
  }, []);

  const value = useMemo<CartCtx>(() => {
    const groups = Object.entries(carts).filter(([, l]) => l.length).map(([slug, items]) => ({
      slug, name: names[slug] ?? slug, items,
      count: items.reduce((s, i) => s + i.quantity, 0), subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
    }));
    const addTo: CartCtx['addTo'] = (st, item, qty = 1) => {
      if (st.name && names[st.slug] !== st.name) setNames((n) => { const x = { ...n, [st.slug]: st.name! }; storage.set(META, x); return x; });
      const inCart = carts[st.slug]?.find((i) => i.variantId === item.variantId)?.quantity ?? 0;
      write(st.slug, (l) => {
        const ex = l.find((i) => i.variantId === item.variantId);
        if (ex) return l.map((i) => (i.variantId === item.variantId ? { ...i, ...item, quantity: Math.min(i.quantity + qty, item.stock) } : i));
        return [...l, { ...item, quantity: Math.min(qty, item.stock) }];
      });
      return Math.max(0, Math.min(qty, item.stock - inCart));
    };
    const updateIn = (slug: string, id: number, qty: number) => write(slug, (l) => l.map((i) => (i.variantId === id ? { ...i, quantity: Math.max(0, Math.min(qty, i.stock)) } : i)).filter((i) => i.quantity > 0));
    const removeIn = (slug: string, id: number) => write(slug, (l) => l.filter((i) => i.variantId !== id));
    const clearIn = (slug: string) => write(slug, () => []);
    const items = current ? carts[current] ?? [] : [];
    const noop = () => {};
    return {
      items, count: items.reduce((s, i) => s + i.quantity, 0), subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
      add: (item, qty) => { if (current) addTo({ slug: current }, item, qty); },
      update: current ? (id, qty) => updateIn(current, id, qty) : noop,
      remove: current ? (id) => removeIn(current, id) : noop,
      clear: current ? () => clearIn(current) : noop,
      groups, totalCount: groups.reduce((s, g) => s + g.count, 0), addTo, updateIn, removeIn, clearIn,
    };
  }, [carts, names, current, write]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useCart = () => useContext(Ctx);
