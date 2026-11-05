import { router } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@/context/auth';

/** Chặn màn hình quản lý nếu không phải ADMIN/STAFF */
export function useStaffGuard() {
  const { isStaff, loading } = useAuth();
  useEffect(() => { if (!loading && !isStaff) router.replace('/login'); }, [isStaff, loading]);
  return isStaff;
}

export function cashSuggestions(total: number) {
  const s = new Set<number>([total]);
  for (const step of [1000, 5000, 10000, 50000, 100000, 500000]) s.add(Math.ceil(total / step) * step);
  return [...s].filter((x) => x >= total).sort((a, b) => a - b).slice(0, 5);
}
