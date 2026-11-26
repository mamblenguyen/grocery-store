'use client';
import { Palette, RotateCcw, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { applyTheme, DEFAULT_THEME, themeCache, type Theme } from '@/lib/theme';

const FIELDS: { key: keyof Theme; label: string; hint: string }[] = [
  { key: 'primary', label: 'Màu chủ đạo', hint: 'Nút, liên kết, giá, menu đang chọn. Các tông nền/viền nhạt – đậm tự sinh theo màu này.' },
  { key: 'accent', label: 'Màu nhấn', hint: 'Huy hiệu giảm giá, số lượng giỏ hàng, điểm nhấn khuyến mãi.' },
  { key: 'sidebar', label: 'Màu thanh bên quản trị', hint: 'Nền menu bên trái trang quản trị cửa hàng.' },
];

// Viết đủ tên lớp để Tailwind sinh CSS (không ghép chuỗi động)
const SWATCHES = ['bg-brand-50', 'bg-brand-100', 'bg-brand-200', 'bg-brand-300', 'bg-brand-400', 'bg-brand-500', 'bg-brand-600', 'bg-brand-700', 'bg-brand-800', 'bg-brand-900'];

/** Màu giao diện toàn sàn – chỉ super admin chỉnh */
export default function ThemeSettingsPage() {
  const toast = useToast();
  const [saved, setSaved] = useState<Theme | null>(null);
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    api<Theme>('/settings/theme').then((t) => { themeCache.set(t); setSaved(t); setTheme(t); }).catch((e) => toast(e.message, 'error'));
  }, [toast]);
  // Xem trước trực tiếp; rời trang mà chưa lưu thì trả về màu đã lưu
  useEffect(() => { if (theme) applyTheme(theme); }, [theme]);
  useEffect(() => () => { const c = themeCache.get(); if (c) applyTheme(c); }, []);

  if (!theme) return <Spinner />;
  const save = async () => {
    try {
      const t = await api<Theme>('/super/settings/theme', { method: 'PUT', json: theme });
      setSaved(t); setTheme(t); themeCache.set(t);
      toast('Đã lưu màu giao diện');
    } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="flex items-center gap-2 text-2xl font-bold"><Palette className="h-6 w-6 text-violet-600" /> Giao diện</h1><p className="text-sm text-slate-500">Màu áp dụng cho toàn sàn: trang chủ, cửa hàng, trang quản trị và CMS.</p></div>
        <div className="flex gap-2">
          <button className="btn-outline" onClick={() => setTheme(DEFAULT_THEME)}><RotateCcw className="h-4 w-4" /> Về mặc định</button>
          <button className="btn-primary" onClick={save} disabled={!!saved && JSON.stringify(theme) === JSON.stringify(saved)}><Save className="h-4 w-4" /> Lưu</button>
        </div>
      </div>
      <section className="card space-y-4">
        {FIELDS.map((f) => (
          <div key={f.key} className="flex items-center gap-4">
            <input type="color" className="h-11 w-16 cursor-pointer rounded-lg border border-slate-300" value={theme[f.key]} onChange={(e) => setTheme({ ...theme, [f.key]: e.target.value })} />
            <div>
              <div className="font-semibold text-ink">{f.label} <span className="font-mono text-xs text-slate-400">{theme[f.key]}</span></div>
              <div className="text-xs text-slate-500">{f.hint}</div>
            </div>
          </div>
        ))}
      </section>
      <section className="card space-y-3">
        <div className="text-sm font-semibold text-slate-600">Xem trước</div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-primary">Nút chính</button>
          <button className="btn-outline">Nút phụ</button>
          <span className="badge bg-brand-100 text-brand-700">Nhãn</span>
          <span className="badge bg-accent-500 text-white">-20%</span>
          <span className="text-lg font-bold text-brand-700">125.000₫</span>
        </div>
        <div className="flex gap-1">{SWATCHES.map((c) => <div key={c} className={`h-8 flex-1 rounded ${c}`} title={c} />)}</div>
        <div className="h-10 rounded-lg bg-sidebar" title="Thanh bên quản trị" />
        <input className="input" placeholder="Ô nhập liệu (bấm vào để xem viền)" />
      </section>
    </div>
  );
}
