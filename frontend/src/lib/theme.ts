export type Theme = { primary: string; accent: string; sidebar: string };

/** Trùng màu gốc trong globals.css (brand-600, accent-500, ink) */
export const DEFAULT_THEME: Theme = { primary: '#0a9c4b', accent: '#f97316', sidebar: '#0f172a' };
const CACHE_KEY = 'grocery_theme';

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const hsl = (h: number, s: number, l: number) => `hsl(${h.toFixed(0)} ${(clamp(s) * 100).toFixed(0)}% ${(clamp(l) * 100).toFixed(1)}%)`;
const same = (a: Theme, b: Theme) => a.primary.toLowerCase() === b.primary.toLowerCase() && a.accent.toLowerCase() === b.accent.toLowerCase() && a.sidebar.toLowerCase() === b.sidebar.toLowerCase();

/** Độ sáng từng tông brand so với tông 600 (màu chủ đạo) */
const BRAND_STEPS: [number, number][] = [[50, 0.96], [100, 0.91], [200, 0.83], [300, 0.72], [400, 0.58], [500, 0.47]];

/** Sinh biến CSS từ 3 màu cấu hình: thang brand-50…900 theo tông màu chủ đạo, màu nhấn, thanh bên quản trị */
export function themeVars(t: Theme): Record<string, string> {
  const [h, s0, l0] = hexToHsl(t.primary);
  const s = Math.max(s0, 0.25);
  const l = Math.min(l0, 0.42); // đủ tối để chữ trắng trên nút luôn đọc được
  const [ah, as, al] = hexToHsl(t.accent);
  const vars: Record<string, string> = {
    '--color-brand-600': hsl(h, s, l),
    '--color-brand-700': hsl(h, s, l - 0.08),
    '--color-brand-800': hsl(h, s, l - 0.14),
    '--color-brand-900': hsl(h, s, l - 0.19),
    '--color-accent-50': hsl(ah, as, 0.97),
    '--color-accent-100': hsl(ah, as, 0.92),
    '--color-accent-500': t.accent,
    '--color-accent-600': hsl(ah, as, al - 0.07),
    '--color-sidebar': t.sidebar,
  };
  for (const [k, light] of BRAND_STEPS) vars[`--color-brand-${k}`] = hsl(h, s, Math.max(light, l + 0.05));
  return vars;
}

/** Áp màu; nếu là màu mặc định thì bỏ ghi đè để dùng đúng bảng màu gốc trong CSS */
export function applyTheme(t: Theme) {
  const el = document.documentElement;
  const vars = themeVars(t);
  if (same(t, DEFAULT_THEME)) Object.keys(vars).forEach((k) => el.style.removeProperty(k));
  else Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));
}

export const themeCache = {
  get: (): Theme | null => {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
  },
  set: (t: Theme) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(t)); } catch { /* bỏ qua */ } },
};
