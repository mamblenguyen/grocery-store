'use client';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import { Suspense, useEffect, useState } from 'react';
import { PrintShell } from '@/components/PrintShell';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useSettings } from '@/context/settings';
import { api } from '@/lib/api';
import { num } from '@/lib/format';
import type { Variant } from '@/lib/types';

type V = Variant & { product: { name: string; unit?: string | null } };
const SIZES = {
  s: { w: '40mm', h: '30mm', qr: '17mm', font: '7.5px', page: 'size: 40mm 30mm; margin: 0;', sheet: '40mm' },
  m: { w: '50mm', h: '40mm', qr: '22mm', font: '8.5px', page: 'size: 50mm 40mm; margin: 0;', sheet: '50mm' },
  l: { w: '70mm', h: '42mm', qr: '26mm', font: '10px', page: 'size: A4; margin: 0;', sheet: '210mm' },
};

function Inner() {
  const sp = useSearchParams();
  const { isStaff, loading } = useAuth();
  const { settings } = useSettings();
  const size = SIZES[(sp.get('size') as keyof typeof SIZES) ?? 'm'] ?? SIZES.m;
  const useBarcode = sp.get('code') === 'barcode';
  const showPrice = sp.get('price') !== '0';
  const [labels, setLabels] = useState<{ v: V; qr: string; code: string }[] | null>(null);

  useEffect(() => {
    if (loading || !isStaff) return;
    const items = (sp.get('items') ?? '').split(',').map((x) => x.split('x').map(Number)).filter(([id, q]) => id > 0 && q > 0);
    api<V[]>(`/admin/stock/variants/by-ids?ids=${items.map(([id]) => id).join(',')}`).then(async (vs) => {
      const out: { v: V; qr: string; code: string }[] = [];
      for (const [id, qty] of items) {
        const v = vs.find((x) => x.id === id);
        if (!v) continue;
        const code = useBarcode && v.barcode ? v.barcode : v.sku;
        const qr = await QRCode.toDataURL(code, { margin: 0, width: 240, errorCorrectionLevel: 'M' });
        for (let i = 0; i < Math.min(qty, 500); i++) out.push({ v, qr, code });
      }
      setLabels(out);
    });
  }, [sp, isStaff, loading, useBarcode]);

  if (!loading && !isStaff) return <div className="p-10 text-center">Không có quyền truy cập</div>;
  if (!labels) return <Spinner />;
  const grid = size === SIZES.l;

  return (
    <PrintShell ready width={size.sheet} page={size.page}>
      <div className={grid ? 'grid grid-cols-3 gap-0 p-[5mm]' : ''}>
        {labels.map(({ v, qr, code }, i) => (
          <div key={i} className="flex items-center gap-[2mm] overflow-hidden border border-dashed border-slate-300 p-[2mm] print:border-slate-200" style={{ width: grid ? 'auto' : size.w, height: size.h, fontSize: size.font, breakAfter: grid ? 'auto' : 'page', breakInside: 'avoid' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="" style={{ width: size.qr, height: size.qr }} className="shrink-0" />
            <div className="min-w-0 leading-tight">
              <div className="line-clamp-3 font-bold" style={{ fontSize: `calc(${size.font} + 1px)` }}>{v.product.name}</div>
              <div className="line-clamp-1">{v.name !== 'Mặc định' && v.name}</div>
              {showPrice && <div className="mt-[1mm] font-extrabold" style={{ fontSize: `calc(${size.font} + 4px)` }}>{num(v.price)}đ{v.product.unit && <span className="font-normal" style={{ fontSize: size.font }}>/{v.product.unit}</span>}</div>}
              <div className="font-mono" style={{ fontSize: `calc(${size.font} - 1px)` }}>{code}</div>
              <div className="truncate opacity-60" style={{ fontSize: `calc(${size.font} - 1.5px)` }}>{settings.storeName}</div>
            </div>
          </div>
        ))}
      </div>
    </PrintShell>
  );
}

export default function LabelsPrintPage() {
  return <Suspense fallback={<Spinner />}><Inner /></Suspense>;
}
