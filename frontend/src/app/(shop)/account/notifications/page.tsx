'use client';
import { Bell, CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { AppNotification } from '@/components/NotificationBell';
import { AccountShell } from '@/components/shop/AccountShell';
import { Empty, Pagination, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { dateTime } from '@/lib/format';
import type { Paged } from '@/lib/types';

export default function NotificationsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<(Paged<AppNotification> & { unread: number }) | null>(null);
  const load = () => api<typeof data>(`/notifications?page=${page}&limit=20`).then(setData);
  useEffect(() => { load(); }, [page]); // eslint-disable-line

  return (
    <AccountShell>
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Thông báo {data?.unread ? <span className="text-brand-700">({data.unread} chưa đọc)</span> : null}</h2>
          {!!data?.unread && <button className="btn-outline btn-sm" onClick={async () => { await api('/notifications/read-all', { method: 'PATCH' }); load(); }}><CheckCheck className="h-4 w-4" /> Đọc tất cả</button>}
        </div>
        {!data ? <Spinner /> : !data.items.length ? <Empty icon={<Bell className="h-7 w-7" />} text="Chưa có thông báo nào" /> : (
          <div className="divide-y divide-slate-100">
            {data.items.map((n) => (
              <button key={n.id} className={`flex w-full gap-3 rounded-xl p-3 text-left hover:bg-slate-50 ${n.readAt ? '' : 'bg-brand-50/50'}`}
                onClick={async () => { if (!n.readAt) await api(`/notifications/${n.id}/read`, { method: 'PATCH' }); if (n.data?.url) router.push(n.data.url); else load(); }}>
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.readAt ? 'bg-slate-200' : 'bg-brand-500'}`} />
                <span><span className="block font-semibold text-ink">{n.title}</span><span className="block text-sm text-slate-600">{n.body}</span><span className="text-xs text-slate-400">{dateTime(n.createdAt)}</span></span>
              </button>
            ))}
            <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </div>
        )}
      </div>
    </AccountShell>
  );
}
