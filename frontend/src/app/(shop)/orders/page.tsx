'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Empty, Pagination, Spinner, StatusBadge } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { api, qs } from '@/lib/api';
import { dateTime, money, ORDER_STATUS } from '@/lib/format';
import type { Order, Paged } from '@/lib/types';

export default function MyOrdersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<Order> | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login?next=/orders');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setData(null);
    api<Paged<Order>>('/orders/my' + qs({ status, page, limit: 10 })).then(setData);
  }, [user, status, page]);

  return (
    <div className="card">
      <h1 className="mb-4 text-xl font-bold">Đơn hàng của tôi</h1>
      <div className="mb-4 flex flex-wrap gap-2">
        {[['', 'Tất cả'], ...Object.entries(ORDER_STATUS).map(([k, v]) => [k, v.label])].map(([k, label]) => (
          <button key={k} className={status === k ? 'btn-primary btn-sm' : 'btn-outline btn-sm'} onClick={() => { setStatus(k); setPage(1); }}>{label}</button>
        ))}
      </div>
      {!data ? <Spinner /> : !data.items.length ? <Empty text="Chưa có đơn hàng nào" /> : (
        <>
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Mã đơn</th><th>Ngày đặt</th><th>Số SP</th><th>Tổng tiền</th><th>Trạng thái</th><th></th></tr></thead>
              <tbody>
                {data.items.map((o) => (
                  <tr key={o.id}>
                    <td className="font-medium">{o.code}</td>
                    <td>{dateTime(o.createdAt)}</td>
                    <td>{o._count?.items}</td>
                    <td className="font-semibold">{money(o.total)}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td><Link href={`/orders/${o.id}`} className="text-brand-700 hover:underline">Chi tiết</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
