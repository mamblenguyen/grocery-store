'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { StockDocForm } from '@/components/admin/StockDocForm';
import { Spinner } from '@/components/ui';

function Inner() {
  const t = useSearchParams().get('type');
  const type = t === 'EXPORT' || t === 'STOCKTAKE' ? t : 'IMPORT';
  return <StockDocForm key={type} type={type} />;
}

export default function NewStockDocPage() {
  return <Suspense fallback={<Spinner />}><Inner /></Suspense>;
}
