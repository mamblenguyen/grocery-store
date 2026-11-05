'use client';
import { Contact, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Empty, Modal, Pagination, Spinner, StatusBadge } from '@/components/ui';
import { api, qs } from '@/lib/api';
import { date, dateTime, money } from '@/lib/format';
import type { Order, Paged } from '@/lib/types';

interface Row { id: number; email: string; fullName: string; phone?: string | null; createdAt: string; orders: number; lastOrderAt: string; totalSpent: number }
type Detail = Omit<Row, 'orders' | 'lastOrderAt'> & { orders: Order[] };

export default function CustomersPage() {
  const [filter, setFilter] = useState({ search: '', page: 1 });
  const [data, setData] = useState<Paged<Row> | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  useEffect(() => { setData(null); api<Paged<Row>>('/admin/customers' + qs({ ...filter, limit: 20 })).then(setData); }, [filter]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Khách hàng</h1>
        <p className="text-sm text-slate-500">Khách đã đặt đơn online tại cửa hàng của bạn (khách mua tại quầy không cần tài khoản).</p>
      </div>
      <div className="card flex p-4">
        <form className="relative w-full max-w-sm" onSubmit={(e) => { e.preventDefault(); setFilter({ search: String(new FormData(e.currentTarget).get('q') ?? ''), page: 1 }); }}>
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input name="q" className="input pl-9" placeholder="Tìm tên, email, SĐT… (Enter)" />
        </form>
      </div>
      <div className="card overflow-x-auto p-0">
        {!data ? <Spinner /> : !data.items.length ? <Empty icon={<Contact className="h-7 w-7" />} text="Chưa có khách hàng nào" /> : (
          <table className="table">
            <thead><tr><th>Khách hàng</th><th>SĐT</th><th className="text-right">Số đơn</th><th className="text-right">Đã chi (đơn hoàn thành)</th><th>Đơn gần nhất</th><th></th></tr></thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id}>
                  <td><div className="font-medium">{u.fullName}</div><div className="text-xs text-slate-500">{u.email}</div></td>
                  <td>{u.phone || '—'}</td>
                  <td className="text-right">{u.orders}</td>
                  <td className="text-right font-semibold text-brand-700">{money(u.totalSpent)}</td>
                  <td className="text-xs">{dateTime(u.lastOrderAt)}</td>
                  <td className="text-right"><button className="btn-outline btn-sm" onClick={() => api<Detail>(`/admin/customers/${u.id}`).then(setDetail)}>Chi tiết</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(page) => setFilter({ ...filter, page })} />}

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Chi tiết khách hàng" size="lg">
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <p><b>{detail.fullName}</b></p><p>{detail.email}</p>
              <p>📞 {detail.phone || '—'}</p><p>Tham gia nền tảng: {date(detail.createdAt)}</p>
              <p>Số đơn tại cửa hàng: <b>{detail.orders.length}</b></p><p>Đã chi: <b className="text-brand-700">{money(detail.totalSpent)}</b></p>
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Mã đơn</th><th>Tổng</th><th>Trạng thái</th><th>Ngày</th></tr></thead>
                <tbody>
                  {detail.orders.map((o) => (
                    <tr key={o.id}>
                      <td><Link className="link" href={`/admin/orders/${o.id}`}>{o.code}</Link></td>
                      <td>{money(o.total)}</td><td><StatusBadge status={o.status} /></td><td className="text-xs">{dateTime(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
