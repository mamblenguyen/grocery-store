'use client';
import { Store } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth';
import type { StoreRef } from '@/lib/types';

/** Super admin đang xem "Tất cả đối tác" */
export function useAllStores() {
  const { acting } = useAuth();
  return acting?.id === 'all';
}

/** Nhãn cửa hàng trong danh sách – chỉ hiện ở chế độ tất cả đối tác */
export function StoreTag({ s }: { s?: Pick<StoreRef, 'name'> | null }) {
  const all = useAllStores();
  if (!all || !s) return null;
  return <div className="mt-0.5 flex items-center gap-1 text-xs font-medium text-violet-700"><Store className="h-3 w-3" />{s.name}</div>;
}

/** Chuyển bộ lọc sang 1 đối tác rồi mở trang (VD: sửa sản phẩm cần biết cửa hàng) */
export function useOpenInStore() {
  const { acting, setActing } = useAuth();
  const router = useRouter();
  return (s: StoreRef | undefined | null, href: string) => {
    if (acting?.id === 'all' && s) setActing({ id: s.id, slug: s.slug, name: s.name });
    router.push(href);
  };
}
