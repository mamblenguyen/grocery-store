'use client';
import { createContext, useContext, useEffect, useState } from 'react';

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

interface CartCtx {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  update: (variantId: number, qty: number) => void;
  remove: (variantId: number) => void;
  clear: () => void;
}

const KEY = 'grocery_cart';
const Ctx = createContext<CartCtx>(null as any);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem(KEY) || '[]'));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, ready]);

  const update = (variantId: number, qty: number) =>
    setItems((list) =>
      list
        .map((i) => (i.variantId === variantId ? { ...i, quantity: Math.max(0, Math.min(qty, i.stock)) } : i))
        .filter((i) => i.quantity > 0),
    );

  return (
    <Ctx.Provider
      value={{
        items,
        count: items.reduce((s, i) => s + i.quantity, 0),
        subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
        add: (item, qty = 1) =>
          setItems((list) => {
            const exist = list.find((i) => i.variantId === item.variantId);
            if (exist)
              return list.map((i) =>
                i.variantId === item.variantId ? { ...i, ...item, quantity: Math.min(i.quantity + qty, item.stock) } : i,
              );
            return [...list, { ...item, quantity: Math.min(qty, item.stock) }];
          }),
        update,
        remove: (variantId) => setItems((list) => list.filter((i) => i.variantId !== variantId)),
        clear: () => setItems([]),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useCart = () => useContext(Ctx);
