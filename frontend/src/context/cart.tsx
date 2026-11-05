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
  isOpen: boolean;
  setOpen: (v: boolean) => void;
}

export const cartKey = (store: string) => `grocery_cart_${store}`;

/** Thêm hàng vào giỏ của 1 cửa hàng khi đang ở ngoài cửa hàng đó (mua lại đơn cũ) */
export function addToStoredCart(store: string, add: CartItem[]) {
  let list: CartItem[] = [];
  try { list = JSON.parse(localStorage.getItem(cartKey(store)) || '[]'); } catch {}
  for (const it of add) {
    const exist = list.find((i) => i.variantId === it.variantId);
    if (exist) Object.assign(exist, { ...it, quantity: Math.min(exist.quantity + it.quantity, it.stock) });
    else list.push({ ...it, quantity: Math.min(it.quantity, it.stock) });
  }
  localStorage.setItem(cartKey(store), JSON.stringify(list));
}
const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ store, children }: { store: string; children: React.ReactNode }) {
  const KEY = cartKey(store);
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    setReady(false);
    try {
      setItems(JSON.parse(localStorage.getItem(KEY) || '[]'));
    } catch {
      setItems([]);
    }
    setReady(true);
  }, [KEY]);

  useEffect(() => {
    // Không tạo khoá rỗng cho cửa hàng chưa từng mua
    if (ready && (items.length || localStorage.getItem(KEY))) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, ready, KEY]);

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
        isOpen,
        setOpen,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

/** Giỏ hàng của cửa hàng hiện tại (chỉ dùng trong /s/[store]) */
export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCart phải nằm trong cửa hàng');
  return c;
};
/** Giỏ hàng nếu đang ở trong một cửa hàng, ngược lại null */
export const useOptionalCart = () => useContext(Ctx);
