export type Theme = { primary: string; accent: string; sidebar: string };

export const DEFAULT_THEME: Theme = { primary: '#059669', accent: '#ef4444', sidebar: '#111827' };
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

/** Sinh toàn bộ biến CSS từ 3 màu cấu hình; các màu còn lại (nền, viền, chữ) được pha cùng tông với màu chủ đạo */
export function themeVars(t: Theme): Record<string, string> {
  const [h, s0, l0] = hexToHsl(t.primary);
  const s = Math.max(s0, 0.25);
  const l = Math.min(l0, 0.42); // đủ tối để chữ trắng trên nút luôn đọc được
  const [ah, as] = hexToHsl(t.accent);
  const [sh, ss, sl] = hexToHsl(t.sidebar);
  const ns = 0.1; // độ ám màu của các màu trung tính
  return {
    '--color-brand-50': hsl(h, s, 0.96),
    '--color-brand-100': hsl(h, s, 0.9),
    '--color-brand-500': hsl(h, s, l + 0.1),
    '--color-brand-600': hsl(h, s, l),
    '--color-brand-700': hsl(h, s, l - 0.08),
    '--color-accent-100': hsl(ah, as, 0.92),
    '--color-accent-500': t.accent,
    '--color-accent-700': hsl(ah, as, 0.35),
    '--color-sidebar': t.sidebar,
    '--color-sidebar-hover': hsl(sh, ss, sl > 0.5 ? sl - 0.08 : sl + 0.08),
    '--color-gray-50': hsl(h, ns, 0.97),
    '--color-gray-100': hsl(h, ns, 0.94),
    '--color-gray-200': hsl(h, ns, 0.89),
    '--color-gray-300': hsl(h, ns, 0.82),
  };
}

export function applyTheme(t: Theme) {
  const el = document.documentElement;
  Object.entries(themeVars(t)).forEach(([k, v]) => el.style.setProperty(k, v));
}

export const themeCache = {
  get: (): Theme | null => {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
  },
  set: (t: Theme) => localStorage.setItem(CACHE_KEY, JSON.stringify(t)),
};
