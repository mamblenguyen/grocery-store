'use client';
import { CircleCheck, CircleX } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Spinner } from '@/components/ui';
import { api } from '@/lib/api';

function Inner() {
  const sp = useSearchParams();
  const [r, setR] = useState<{ valid: boolean; success: boolean; orderId: number | null; message: string } | null>(null);
  useEffect(() => {
    api<typeof r>(`/payments/vnpay/return?${sp.toString()}`).then(setR).catch((e) => setR({ valid: false, success: false, orderId: null, message: e.message }));
  }, [sp]);
  if (!r) return <Spinner />;
  return (
    <div className="container-x py-16">
      <div className="card mx-auto max-w-md text-center">
        {r.success ? <CircleCheck className="mx-auto h-16 w-16 text-brand-600" /> : <CircleX className="mx-auto h-16 w-16 text-red-500" />}
        <h1 className="mt-4 text-2xl font-bold">{r.success ? 'Thanh toán thành công!' : 'Thanh toán chưa thành công'}</h1>
        <p className="mt-2 text-slate-500">{r.message}</p>
        <div className="mt-6 flex justify-center gap-3">
          {r.orderId && <Link href={`/orders/${r.orderId}`} className="btn-primary">Xem đơn hàng</Link>}
          <Link href="/" className="btn-outline">Về trang chủ</Link>
        </div>
      </div>
    </div>
  );
}

export default function VnpayReturnPage() {
  return <Suspense fallback={<Spinner />}><Inner /></Suspense>;
}
