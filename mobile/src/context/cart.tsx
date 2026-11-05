import { createContext, useContext, useEffect, useState } from 'react';
import { store } from '@/lib/storage';

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
}
const Ctx = createContext<CartCtx>(null as any);
const KEY = 'grocery_cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => { store.get<CartItem[]>(KEY, []).then((v) => { setItems(v); setReady(true); }); }, []);
  useEffect(() => { if (ready) store.set(KEY, items); }, [items, ready]);

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
    }}>{children}</Ctx.Provider>
  );
}
export const useCart = () => useContext(Ctx);
