import { createContext, useContext, useEffect, useState } from 'react';
import { store } from '@/lib/storage';
import { useStore } from './store';

export interface CartItem {
  variantId: number; productId: number; slug: string; productName: string; variantName: string;
  image?: string | null; price: number; stock: number; quantity: number;
}
interface CartCtx {
  items: CartItem[]; count: number; subtotal: number;
  add: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  update: (variantId: number, qty: number) => void;
  remove: (variantId: number) => void;
  clear: () => void;
  /** Đọc lại giỏ từ bộ nhớ (sau khi thêm hàng từ màn hình khác) */
  reload: () => Promise<void>;
}
const Ctx = createContext<CartCtx>(null as any);
export const cartKey = (slug: string) => `grocery_cart_${slug}`;

/** Thêm hàng vào giỏ của 1 cửa hàng bất kỳ (mua lại đơn cũ) */
export async function addToStoredCart(slug: string, add: CartItem[]) {
  const list = await store.get<CartItem[]>(cartKey(slug), []);
  for (const it of add) {
    const ex = list.find((i) => i.variantId === it.variantId);
    if (ex) Object.assign(ex, { ...it, quantity: Math.min(ex.quantity + it.quantity, it.stock) });
    else list.push({ ...it, quantity: Math.min(it.quantity, it.stock) });
  }
  await store.set(cartKey(slug), list);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Mỗi cửa hàng một giỏ hàng riêng
  const slug = useStore().store?.slug ?? null;
  const KEY = slug ? cartKey(slug) : null;
  const [items, setItems] = useState<CartItem[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  useEffect(() => {
    setLoadedKey(null);
    if (!KEY) { setItems([]); return; }
    store.get<CartItem[]>(KEY, []).then((v) => { setItems(v); setLoadedKey(KEY); });
  }, [KEY]);
  useEffect(() => { if (KEY && loadedKey === KEY) store.set(KEY, items); }, [items, KEY, loadedKey]);

  return (
    <Ctx.Provider value={{
      items,
      count: items.reduce((s, i) => s + i.quantity, 0),
      subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
      add: (item, qty = 1) => setItems((l) => {
        const ex = l.find((i) => i.variantId === item.variantId);
        if (ex) return l.map((i) => (i.variantId === item.variantId ? { ...i, ...item, quantity: Math.min(i.quantity + qty, item.stock) } : i));
        return [...l, { ...item, quantity: Math.min(qty, item.stock) }];
      }),
      update: (id, qty) => setItems((l) => l.map((i) => (i.variantId === id ? { ...i, quantity: Math.max(0, Math.min(qty, i.stock)) } : i)).filter((i) => i.quantity > 0)),
      remove: (id) => setItems((l) => l.filter((i) => i.variantId !== id)),
      clear: () => setItems([]),
      reload: async () => { if (KEY) setItems(await store.get<CartItem[]>(KEY, [])); },
    }}>{children}</Ctx.Provider>
  );
}
export const useCart = () => useContext(Ctx);
