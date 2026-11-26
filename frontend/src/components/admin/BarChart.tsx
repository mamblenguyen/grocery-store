'use client';
import { useLayoutEffect, useRef, useState } from 'react';

export interface BarSeries {
  /** Giá trị cột (cùng đơn vị với trục) */
  value: number;
  /** Lớp màu Tailwind của cột */
  className: string;
}
export interface BarDatum {
  key: string;
  /** Nhãn trục X */
  label: string;
  /** Cột chính (nền) */
  bar: BarSeries;
  /** Phần phủ bên trong cột chính, tính từ đáy (vd. lợi nhuận trong doanh thu). Giá trị âm được báo đỏ ở đáy cột. */
  overlay?: BarSeries;
  /** Nội dung tooltip – các dòng nhãn / giá trị đã định dạng chính xác */
  tooltip: { title: string; rows: { label: string; value: string; tone?: 'pos' | 'neg' | 'muted'; dot?: string }[] };
}

/** Làm tròn trục lên mốc đẹp: 1, 2, 2.5, 5 × 10^n */
function niceMax(max: number, ticks: number) {
  if (max <= 0) return ticks;
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  return step * ticks;
}

/** Nhãn rút gọn cho trục (tooltip luôn hiển thị số đầy đủ) */
export function compactVnd(n: number) {
  const a = Math.abs(n);
  const f = (v: number) => (Math.round(v * 10) / 10).toLocaleString('vi-VN');
  if (a >= 1e9) return `${f(n / 1e9)} tỷ`;
  if (a >= 1e6) return `${f(n / 1e6)} tr`;
  if (a >= 1e3) return `${f(n / 1e3)}k`;
  return n.toLocaleString('vi-VN');
}

/**
 * Biểu đồ cột có trục giá trị + tooltip số liệu chính xác.
 * Tooltip được vẽ ở lớp ngoài vùng cuộn ngang nên không bị cắt; hỗ trợ chuột, chạm (mobile) và bàn phím.
 */
export function BarChart({ data, height = 256, ticks = 4, minColWidth = 22, axisFormat = compactVnd, emptyText = 'Chưa có dữ liệu trong kỳ' }: {
  data: BarDatum[]; height?: number; ticks?: number; minColWidth?: number; axisFormat?: (n: number) => string; emptyText?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);

  const max = niceMax(Math.max(0, ...data.map((d) => Math.max(d.bar.value, d.overlay?.value ?? 0))), ticks);
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  const every = Math.max(1, Math.ceil(data.length / 16));
  const hasData = data.some((d) => d.bar.value !== 0 || (d.overlay?.value ?? 0) !== 0);

  // Đặt tooltip theo vị trí cột đang chọn, giữ trong khung biểu đồ
  useLayoutEffect(() => {
    if (active == null) { setPos(null); return; }
    const col = colRefs.current[active], box = wrap.current, tip = tipRef.current;
    if (!col || !box || !tip) return;
    const c = col.getBoundingClientRect(), b = box.getBoundingClientRect();
    const d = data[active];
    const barTop = c.top - b.top + c.height * (1 - Math.min(1, Math.max(0, d.bar.value / max)));
    const w = tip.offsetWidth, h = tip.offsetHeight;
    const left = Math.min(Math.max(0, c.left - b.left + c.width / 2 - w / 2), b.width - w);
    const top = barTop - h - 8 >= 0 ? barTop - h - 8 : Math.max(0, Math.min(barTop + 8, b.height - h));
    // so sánh trước khi set để không render lặp (data là mảng mới mỗi lần render của trang cha)
    setPos((p) => (p && Math.abs(p.left - left) < 0.5 && Math.abs(p.top - top) < 0.5 ? p : { left, top }));
  }, [active, data, max]);

  if (!data.length) return <div className="py-16 text-center text-sm text-slate-400">{emptyText}</div>;
  const d = active != null ? data[active] : null;

  return (
    <div ref={wrap} className="relative select-none" onMouseLeave={() => setActive(null)}>
      <div className="flex">
        {/* Trục Y */}
        <div className="relative mr-2 shrink-0 text-right text-[10px] text-slate-400" style={{ height, width: 44 }}>
          {Array.from({ length: ticks + 1 }, (_, i) => (
            <span key={i} className="absolute right-0 -translate-y-1/2" style={{ top: `${(i / ticks) * 100}%` }}>{axisFormat(max - (max / ticks) * i)}</span>
          ))}
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div style={{ minWidth: data.length * minColWidth }}>
            <div className="relative" style={{ height }}>
              {/* Đường lưới */}
              {Array.from({ length: ticks + 1 }, (_, i) => (
                <div key={i} className={`pointer-events-none absolute inset-x-0 border-t ${i === ticks ? 'border-slate-300' : 'border-dashed border-slate-100'}`} style={{ top: `${(i / ticks) * 100}%` }} />
              ))}
              <div className="absolute inset-0 flex items-end gap-1">
                {data.map((x, i) => (
                  <div
                    key={x.key}
                    ref={(el) => { colRefs.current[i] = el; }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${x.tooltip.title}: ${x.tooltip.rows.map((r) => `${r.label} ${r.value}`).join(', ')}`}
                    className={`relative flex h-full flex-1 cursor-pointer items-end justify-center rounded-md outline-none ${active === i ? 'bg-slate-100/80' : ''}`}
                    style={{ minWidth: minColWidth - 4 }}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    onClick={() => setActive(active === i ? null : i)}
                  >
                    <div className={`relative w-full max-w-10 rounded-t-md transition-[filter] ${x.bar.className} ${active === i ? 'brightness-90' : ''}`} style={{ height: pct(x.bar.value), minHeight: x.bar.value > 0 ? 3 : 0 }}>
                      {x.overlay && x.overlay.value > 0 && (
                        <div className={`absolute inset-x-0 bottom-0 rounded-t-md ${x.overlay.className}`} style={{ height: x.bar.value ? `${Math.min(100, (x.overlay.value / x.bar.value) * 100)}%` : 0 }} />
                      )}
                    </div>
                    {x.overlay && x.overlay.value < 0 && <div className="absolute inset-x-1 bottom-0 h-1 rounded bg-red-500" title="Lỗ" />}
                  </div>
                ))}
              </div>
              {!hasData && <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">{emptyText}</div>}
            </div>
            {/* Trục X */}
            <div className="mt-1.5 flex gap-1">
              {data.map((x, i) => (
                <div key={x.key} className={`flex-1 text-center text-[10px] whitespace-nowrap ${active === i ? 'font-semibold text-ink' : 'text-slate-400'}`} style={{ minWidth: minColWidth - 4 }}>
                  {i % every === 0 || active === i ? x.label : ''}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {d && (
        <div
          ref={tipRef}
          className="pointer-events-none absolute z-20 min-w-44 rounded-xl bg-ink px-3 py-2 text-xs text-white shadow-xl"
          style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden' }}
        >
          <div className="mb-1 font-semibold">{d.tooltip.title}</div>
          {d.tooltip.rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-4 leading-5">
              <span className="flex items-center gap-1.5 text-slate-300">{r.dot && <i className={`inline-block h-2 w-2 rounded-sm ${r.dot}`} />}{r.label}</span>
              <b className={`tabular-nums ${r.tone === 'neg' ? 'text-red-300' : r.tone === 'pos' ? 'text-emerald-300' : r.tone === 'muted' ? 'font-normal text-slate-300' : ''}`}>{r.value}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
