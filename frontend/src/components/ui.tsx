'use client';
import { ChevronLeft, ChevronRight, Inbox, Star, X } from 'lucide-react';
import { useEffect } from 'react';
import { ORDER_STATUS, PAYMENT_STATUS } from '@/lib/format';

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1);
  const cls = 'flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium transition';
  return (
    <div className="mt-6 flex items-center justify-center gap-1">
      <button className={`${cls} border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40`} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Trang trước"><ChevronLeft className="h-4 w-4" /></button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-slate-400">…</span>}
          <button className={`${cls} ${p === page ? 'bg-brand-600 text-white shadow-sm' : 'border border-slate-200 bg-white hover:bg-slate-50'}`} onClick={() => onChange(p)}>{p}</button>
        </span>
      ))}
      <button className={`${cls} border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40`} disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Trang sau"><ChevronRight className="h-4 w-4" /></button>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = ORDER_STATUS[status] ?? { label: status, cls: 'bg-slate-100' };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export function PaymentBadge({ status }: { status: string }) {
  const s = PAYMENT_STATUS[status] ?? { label: status, cls: 'bg-slate-100' };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export function Badge({ map, value }: { map: Record<string, { label: string; cls: string }>; value: string }) {
  const s = map[value] ?? { label: value, cls: 'bg-slate-100' };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export function Spinner({ className = 'py-16' }: { className?: string }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-brand-100 border-t-brand-600" />
    </div>
  );
}

export function Empty({ text = 'Không có dữ liệu', icon, children }: { text?: string; icon?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">{icon ?? <Inbox className="h-7 w-7" />}</div>
      <p className="text-slate-500">{text}</p>
      {children}
    </div>
  );
}

export function Modal({ open, onClose, title, children, size = 'md' }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  const w = { md: 'max-w-lg', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size];
  return (
    <div className="animate-fade-in fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div className={`my-8 w-full ${w} rounded-2xl bg-white shadow-2xl`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="btn-icon btn-ghost -mr-2 h-9 w-9" aria-label="Đóng"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function Stars({ value, size = 'h-4 w-4', showValue }: { value: number; size?: string; showValue?: boolean }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="relative">
          <Star className={`${size} text-slate-200`} fill="currentColor" strokeWidth={0} />
          <span className="absolute inset-0 overflow-hidden" style={{ width: `${Math.max(0, Math.min(1, value - i + 1)) * 100}%` }}>
            <Star className={`${size} text-amber-400`} fill="currentColor" strokeWidth={0} />
          </span>
        </span>
      ))}
      {showValue && <span className="ml-1 text-sm font-semibold text-slate-700">{value.toFixed(1)}</span>}
    </span>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <span className="inline-flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => onChange(i)} aria-label={`${i} sao`}>
          <Star className={`h-7 w-7 transition ${i <= value ? 'text-amber-400' : 'text-slate-200 hover:text-amber-200'}`} fill="currentColor" strokeWidth={0} />
        </button>
      ))}
    </span>
  );
}

/** Ô thống kê */
export function StatCard({ icon, label, value, hint, tone = 'brand' }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: 'brand' | 'accent' | 'sky' | 'violet' | 'rose';
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700', accent: 'bg-accent-50 text-accent-600', sky: 'bg-sky-50 text-sky-700',
    violet: 'bg-violet-50 text-violet-700', rose: 'bg-rose-50 text-rose-600',
  };
  return (
    <div className="card flex items-start gap-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className="mt-0.5 truncate text-xl font-bold text-ink">{value}</div>
        {hint && <div className="mt-0.5 text-xs text-slate-400">{hint}</div>}
      </div>
    </div>
  );
}

export function QtyInput({ value, onChange, max, min = 1, size = 'md' }: { value: number; onChange: (v: number) => void; max?: number; min?: number; size?: 'sm' | 'md' }) {
  const h = size === 'sm' ? 'h-8' : 'h-11';
  const w = size === 'sm' ? 'w-8' : 'w-11';
  return (
    <div className={`inline-flex ${h} items-center rounded-xl border border-slate-200 bg-white`}>
      <button type="button" className={`${w} h-full text-lg text-slate-500 hover:text-brand-700 disabled:opacity-30`} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
      <input
        className={`${size === 'sm' ? 'w-9 text-sm' : 'w-12'} h-full border-x border-slate-200 text-center font-semibold outline-none`}
        value={value}
        inputMode="numeric"
        onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, '')) || min; onChange(Math.max(min, max ? Math.min(n, max) : n)); }}
      />
      <button type="button" className={`${w} h-full text-lg text-slate-500 hover:text-brand-700 disabled:opacity-30`} disabled={max !== undefined && value >= max} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}
