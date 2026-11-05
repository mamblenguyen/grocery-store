'use client';
import Link from 'next/link';
import { imageUrl } from '@/lib/api';
import { money, ORDER_STATUS, PAYMENT_STATUS } from '@/lib/format';
import type { Product } from '@/lib/types';

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2,
  );
  return (
    <div className="mt-6 flex items-center justify-center gap-1">
      <button className="btn-outline btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>‹</button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-gray-400">…</span>}
          <button className={p === page ? 'btn-primary btn-sm' : 'btn-outline btn-sm'} onClick={() => onChange(p)}>{p}</button>
        </span>
      ))}
      <button className="btn-outline btn-sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>›</button>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = ORDER_STATUS[status] ?? { label: status, cls: 'bg-gray-100' };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export function PaymentBadge({ status }: { status: string }) {
  const s = PAYMENT_STATUS[status] ?? { label: status, cls: 'bg-gray-100' };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
    </div>
  );
}

export function Empty({ text = 'Không có dữ liệu' }: { text?: string }) {
  return <div className="py-12 text-center text-gray-500">{text}</div>;
}

export function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div className={`card mt-10 w-full ${wide ? 'max-w-3xl' : 'max-w-lg'}`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-2xl leading-none text-gray-400 hover:text-gray-600">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ProductCard({ p }: { p: Product }) {
  const compare = p.variants.find((v) => v.compareAtPrice && v.compareAtPrice > v.price);
  const outOfStock = p.variants.every((v) => v.stock <= 0);
  return (
    <Link href={`/products/${p.slug}`} className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:shadow-md">
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl(p.thumbnail)} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105" />
        {compare && (
          <span className="badge absolute top-2 left-2 bg-red-500 text-white">
            -{Math.round((1 - compare.price / compare.compareAtPrice!) * 100)}%
          </span>
        )}
        {outOfStock && <span className="badge absolute top-2 right-2 bg-gray-800 text-white">Hết hàng</span>}
      </div>
      <div className="p-3">
        <div className="text-xs text-gray-500">{p.brand}</div>
        <div className="line-clamp-2 min-h-10 text-sm font-medium">{p.name}</div>
        <div className="mt-1 font-semibold text-brand-700">
          {money(p.minPrice)}
          {p.maxPrice > p.minPrice && <span className="text-gray-400"> – {money(p.maxPrice)}</span>}
        </div>
        <div className="mt-1 text-xs text-gray-500">
          {p.variants.length > 1 ? `${p.variants.length} lựa chọn` : p.unit ? `/${p.unit}` : ''}
          {p.soldCount > 0 && ` · Đã bán ${p.soldCount}`}
        </div>
      </div>
    </Link>
  );
}
