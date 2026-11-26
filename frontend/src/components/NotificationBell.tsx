'use client';
import { Bell, CheckCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/auth';
import { api } from '@/lib/api';
import { dateTime } from '@/lib/format';

export interface AppNotification { id: number; type: string; title: string; body: string; data?: { url?: string; orderId?: number } | null; readAt: string | null; createdAt: string }

export function NotificationBell({ allHref = '/account/notifications', dark = false }: { allHref?: string; dark?: boolean }) {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(() => api<{ items: AppNotification[]; unread: number }>('/notifications?limit=8').then((r) => { setItems(r.items); setUnread(r.unread); }).catch(() => {}), []);
  useEffect(() => {
    if (!user) return;
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [user, load]);
  useEffect(() => {
    const h = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  if (!user) return null;

  const openItem = async (n: AppNotification) => {
    setOpen(false);
    if (!n.readAt) { await api(`/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {}); load(); }
    if (n.data?.url) router.push(n.data.url);
  };

  return (
    <div ref={box} className="relative">
      <button onClick={() => { setOpen(!open); if (!open) load(); }} className={`btn-icon relative ${dark ? 'text-slate-600 hover:bg-slate-100' : 'btn-ghost'}`} aria-label="Thông báo">
        <Bell className="h-[22px] w-[22px]" />
        {unread > 0 && <span className="absolute top-0.5 right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className="animate-fade-in absolute right-0 z-50 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lift">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="font-bold text-ink">Thông báo</span>
            {unread > 0 && <button className="flex items-center gap-1 text-xs font-semibold text-brand-700" onClick={async () => { await api('/notifications/read-all', { method: 'PATCH' }); load(); }}><CheckCheck className="h-4 w-4" /> Đọc tất cả</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!items.length && <div className="p-8 text-center text-sm text-slate-400">Chưa có thông báo</div>}
            {items.map((n) => (
              <button key={n.id} onClick={() => openItem(n)} className={`flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50 ${n.readAt ? '' : 'bg-brand-50/50'}`}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-brand-500'}`} />
                <span className="min-w-0"><span className="block text-sm font-semibold text-ink">{n.title}</span><span className="block text-sm text-slate-500">{n.body}</span><span className="text-xs text-slate-400">{dateTime(n.createdAt)}</span></span>
              </button>
            ))}
          </div>
          <Link href={allHref} onClick={() => setOpen(false)} className="block py-2.5 text-center text-sm font-semibold text-brand-700 hover:bg-brand-50">Xem tất cả</Link>
        </div>
      )}
    </div>
  );
}
