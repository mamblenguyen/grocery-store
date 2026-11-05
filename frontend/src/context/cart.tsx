'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useStoreSlug } from './store';

export interface CartItem {
  variantId: number;
  productId: number;
  slug: string;
  productName: string;
  variantName: string;
  image?: string | null;
  price: number;
  stock: number;
  quantity: number;
}

export const cartKey = (store: string) => `grocery_cart_${store}`;
const META_KEY = 'grocery_cart_stores';
const PREFIX = 'grocery_cart_';

export interface CartGroup { slug: string; name: string; items: CartItem[]; count: number; subtotal: number }

interface AllCartCtx {
  groups: CartGroup[];
  count: number;
  /** Thêm vào giỏ của một cửa hàng bất kỳ (sàn, mua lại đơn cũ) */
  addTo: (store: { slug: string; name?: string }, item: Omit<CartItem, 'quantity'>, qty?: number) => number;
  update: (store: string, variantId: number, qty: number) => void;
  remove: (store: string, variantId: number) => void;
  clear: (store: string) => void;
  setStoreName: (slug: string, name: string) => void;
  isOpen: boolean;
  setOpen: (v: boolean) => void;
}

const Ctx = createContext<AllCartCtx | null>(null);

const readAll = () => {
  const carts: Record<string, CartItem[]> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    if (!k.startsWith(PREFIX) || k === META_KEY) continue;
    try { const v = JSON.parse(localStorage.getItem(k) || '[]'); if (Array.isArray(v) && v.length) carts[k.slice(PREFIX.length)] = v; } catch {}
  }
  let names: Record<string, string> = {};
  try { names = JSON.parse(localStorage.getItem(META_KEY) || '{}'); } catch {}
  return { carts, names };
};

/** Giỏ hàng của toàn sàn: mỗi cửa hàng một giỏ riêng (thanh toán riêng theo cửa hàng) */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [carts, setCarts] = useState<Record<string, CartItem[]>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    const load = () => { const r = readAll(); setCarts(r.carts); setNames(r.names); };
    load();
    // đồng bộ giữa các tab
    const h = (e: StorageEvent) => e.key?.startsWith(PREFIX) && load();
    window.addEventListener('storage', h);
    return () => window.removeEventListener('storage', h);
  }, []);

  const write = useCallback((store: string, fn: (l: CartItem[]) => CartItem[]) => {
    setCarts((all) => {
      const next = fn(all[store] ?? []);
      try {
        if (next.length) localStorage.setItem(cartKey(store), JSON.stringify(next));
        else localStorage.removeItem(cartKey(store));
      } catch {}
      return { ...all, [store]: next };
    });
  }, []);

  const setStoreName = useCallback((slug: string, name: string) => {
    setNames((n) => {
      if (n[slug] === name) return n;
      const next = { ...n, [slug]: name };
      try { localStorage.setItem(META_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const value = useMemo<AllCartCtx>(() => {
    const groups = Object.entries(carts).filter(([, l]) => l.length).map(([slug, items]) => ({
      slug, name: names[slug] ?? slug, items,
      count: items.reduce((s, i) => s + i.quantity, 0), subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
    }));
    return {
      groups, count: groups.reduce((s, g) => s + g.count, 0), isOpen, setOpen, setStoreName,
      addTo: (store, item, qty = 1) => {
        if (store.name) setStoreName(store.slug, store.name);
        const inCart = carts[store.slug]?.find((i) => i.variantId === item.variantId)?.quantity ?? 0;
        const added = Math.max(0, Math.min(qty, item.stock - inCart));
        write(store.slug, (l) => {
          const ex = l.find((i) => i.variantId === item.variantId);
          if (ex) return l.map((i) => (i.variantId === item.variantId ? { ...i, ...item, quantity: Math.min(i.quantity + qty, item.stock) } : i));
          return [...l, { ...item, quantity: Math.min(qty, item.stock) }];
        });
        return added;
      },
      update: (store, variantId, qty) => write(store, (l) => l.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.max(0, Math.min(qty, i.stock)) } : i)).filter((i) => i.quantity > 0)),
      remove: (store, variantId) => write(store, (l) => l.filter((i) => i.variantId !== variantId)),
      clear: (store) => write(store, () => []),
    };
  }, [carts, names, isOpen, write, setStoreName]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAllCarts() {
  const c = useContext(Ctx);
  if (!c) throw new Error('Thiếu CartProvider');
  return c;
}

interface StoreCart {
  items: CartItem[]; count: number; subtotal: number;
  add: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  update: (variantId: number, qty: number) => void;
  remove: (variantId: number) => void;
  clear: () => void;
  isOpen: boolean; setOpen: (v: boolean) => void;
}

function storeView(all: AllCartCtx, slug: string): StoreCart {
  const g = all.groups.find((x) => x.slug === slug);
  return {
    items: g?.items ?? [], count: g?.count ?? 0, subtotal: g?.subtotal ?? 0,
    add: (item, qty) => { all.addTo({ slug }, item, qty); },
    update: (id, qty) => all.update(slug, id, qty),
    remove: (id) => all.remove(slug, id),
    clear: () => all.clear(slug),
    isOpen: all.isOpen, setOpen: all.setOpen,
  };
}

/** Giỏ hàng của cửa hàng đang xem (chỉ dùng trong /s/[store]) */
export function useCart(): StoreCart {
  const all = useAllCarts();
  const slug = useStoreSlug();
  if (!slug) throw new Error('useCart phải nằm trong cửa hàng');
  return storeView(all, slug);
}

/** Giỏ hàng nếu đang ở trong một cửa hàng, ngược lại null */
export function useOptionalCart(): StoreCart | null {
  const all = useContext(Ctx);
  const slug = useStoreSlug();
  return all && slug ? storeView(all, slug) : null;
}
