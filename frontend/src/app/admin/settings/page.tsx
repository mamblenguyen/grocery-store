'use client';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { api } from '@/lib/api';
import { applyTheme, DEFAULT_THEME, themeCache, type Theme } from '@/lib/theme';

const FIELDS: { key: keyof Theme; label: string; hint: string }[] = [
  { key: 'primary', label: 'Màu chủ đạo', hint: 'Nút, liên kết, giá, menu đang chọn. Các màu nền/viền tự điều chỉnh theo tông này.' },
  { key: 'accent', label: 'Màu nhấn', hint: 'Huy hiệu giảm giá, số lượng giỏ hàng.' },
  { key: 'sidebar', label: 'Màu thanh bên admin', hint: 'Nền menu quản trị bên trái.' },
];

export default function ThemeSettingsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [saved, setSaved] = useState<Theme | null>(null);
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    api<Theme>('/settings/theme').then((t) => { themeCache.set(t); setSaved(t); setTheme(t); });
  }, []);

  // Xem trước trực tiếp; rời trang mà chưa lưu thì trả về màu đã lưu
  useEffect(() => { if (theme) applyTheme(theme); }, [theme]);
  useEffect(() => () => { const c = themeCache.get(); if (c) applyTheme(c); }, []);

  if (user?.role !== 'ADMIN') return <p>Chỉ quản trị viên cao nhất mới được đổi giao diện.</p>;
  if (!theme) return <Spinner />;

  const save = async () => {
    try {
      const t = await api<Theme>('/admin/settings/theme', { method: 'PUT', json: theme });
      setSaved(t); setTheme(t); themeCache.set(t);
      toast('Đã lưu màu giao diện');
    } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Giao diện</h1>
      <div className="card space-y-4">
        {FIELDS.map((f) => (
          <div key={f.key} className="flex items-center gap-4">
            <input type="color" className="h-10 w-14 cursor-pointer rounded border border-gray-300" value={theme[f.key]} onChange={(e) => setTheme({ ...theme, [f.key]: e.target.value })} />
            <div>
              <div className="font-medium">{f.label} <span className="text-xs text-gray-500">{theme[f.key]}</span></div>
              <div className="text-xs text-gray-500">{f.hint}</div>
            </div>
          </div>
        ))}
        <div className="flex gap-2 border-t border-gray-200 pt-4">
          <button className="btn-primary" onClick={save} disabled={JSON.stringify(theme) === JSON.stringify(saved)}>Lưu</button>
          <button className="btn-outline" onClick={() => setTheme(DEFAULT_THEME)}>Về mặc định</button>
        </div>
      </div>
      <div className="card space-y-3">
        <div className="text-sm font-medium text-gray-600">Xem trước</div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-primary">Nút chính</button>
          <button className="btn-outline">Nút phụ</button>
          <span className="badge bg-brand-100 text-brand-700">Nhãn</span>
          <span className="badge bg-accent-100 text-accent-700">-20%</span>
          <span className="text-lg font-bold text-brand-700">125.000₫</span>
        </div>
        <input className="input" placeholder="Ô nhập liệu (focus để xem viền)" />
      </div>
    </div>
  );
}
