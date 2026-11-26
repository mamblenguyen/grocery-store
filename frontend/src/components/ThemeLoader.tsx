'use client';
import { useEffect } from 'react';
import { api } from '@/lib/api';
import { applyTheme, themeCache, type Theme } from '@/lib/theme';

/** Áp màu đã lưu (cache) ngay khi mount, rồi đồng bộ với màu mới nhất từ server */
export function ThemeLoader() {
  useEffect(() => {
    const cached = themeCache.get();
    if (cached) applyTheme(cached);
    api<Theme>('/settings/theme')
      .then((t) => { applyTheme(t); themeCache.set(t); })
      .catch(() => {});
  }, []);
  return null;
}
