'use client';
import { ChevronRight, Package } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AccountShell } from '@/components/shop/AccountShell';
import { Empty, Pagination, PaymentBadge, Spinner, StatusBadge } from '@/components/ui';
import { api, imageUrl, qs } from '@/lib/api';
import { dateTime, money, ORDER_STATUS } from '@/lib/format';
import type { Order, Paged } from '@/lib/types';

export default function MyOrdersPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<Order & { items: { image: string; productName: string }[] }> | null>(null);
  useEffect(() => { setData(null); api<typeof data>('/orders/my' + qs({ status, page, limit: 10 })).then(setData).catch(() => {}); }, [status, page]);

  return (
    <AccountShell>
      <div className="card p-0">
        <div className="border-b border-slate-100 p-5"><h2 className="text-lg font-bold">Đơn hàng của tôi</h2></div>
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3">
          {[['', 'Tất cả'], ...Object.entries(ORDER_STATUS).map(([k, v]) => [k, v.label])].map(([k, l]) => (
            <button key={k} onClick={() => { setStatus(k); setPage(1); }} className={`-mb-px shrink-0 border-b-2 px-3 py-3 text-sm font-semibold ${status === k ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500'}`}>{l}</button>
          ))}
        </div>
        <div className="p-5">
          {!data ? <Spinner /> : !data.items.length ? <Empty icon={<Package className="h-7 w-7" />} text="Chưa có đơn hàng nào"><Link href="/products" className="btn-primary">Mua sắm ngay</Link></Empty> : (
            <div className="space-y-3">
              {data.items.map((o) => (
                <Link key={o.id} href={`/orders/${o.id}`} className="block rounded-2xl border border-slate-200 p-4 transition hover:border-brand-300 hover:shadow-soft">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2"><span className="font-bold text-ink">{o.code}</span><span className="text-xs text-slate-400">{dateTime(o.createdAt)}</span></div>
                    <div className="flex gap-1.5"><PaymentBadge status={o.paymentStatus} /><StatusBadge status={o.status} /></div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex -space-x-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {o.items.map((it, i) => <img key={i} src={imageUrl(it.image)} alt="" className="h-12 w-12 rounded-lg border-2 border-white object-cover" />)}
                    </div>
                    <span className="flex-1 truncate text-sm text-slate-500">{o.items.map((i) => i.productName).join(', ')}{(o._count?.items ?? 0) > 3 && ` và ${(o._count?.items ?? 0) - 3} sản phẩm khác`}</span>
                    <span className="text-right"><span className="block text-xs text-slate-400">Tổng tiền</span><span className="font-bold text-brand-700">{money(o.total)}</span></span>
                    <ChevronRight className="h-5 w-5 text-slate-300" />
                  </div>
                </Link>
              ))}
              <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
            </div>
          )}
        </div>
      </div>
    </AccountShell>
  );
}
