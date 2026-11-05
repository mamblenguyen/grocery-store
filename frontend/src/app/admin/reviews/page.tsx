'use client';
import { Eye, EyeOff, MessageSquare, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Empty, Pagination, Spinner, Stars } from '@/components/ui';
import { api, imageUrl, qs } from '@/lib/api';
import { dateTime } from '@/lib/format';
import type { Paged, Review } from '@/lib/types';

export default function ReviewsAdminPage() {
  const toast = useToast();
  const [f, setF] = useState({ search: '', rating: '', status: '', page: 1 });
  const [data, setData] = useState<Paged<Review> | null>(null);
  const load = () => api<Paged<Review>>('/admin/reviews' + qs({ ...f, limit: 20 })).then(setData);
  useEffect(() => { load(); }, [f]); // eslint-disable-line
  const act = async (fn: () => Promise<unknown>, msg: string) => { try { await fn(); toast(msg); load(); } catch (e: any) { toast(e.message, 'error'); } };

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap gap-3 p-4">
        <input className="input max-w-xs" placeholder="Nội dung, sản phẩm, khách hàng…" onKeyDown={(e) => e.key === 'Enter' && setF({ ...f, search: (e.target as HTMLInputElement).value, page: 1 })} />
        <select className="input w-36" value={f.rating} onChange={(e) => setF({ ...f, rating: e.target.value, page: 1 })}><option value="">Mọi số sao</option>{[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} sao</option>)}</select>
        <select className="input w-40" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value, page: 1 })}><option value="">Tất cả</option><option value="visible">Đang hiển thị</option><option value="hidden">Đã ẩn</option></select>
      </div>
      <div className="card p-0">
        {!data ? <Spinner /> : !data.items.length ? <Empty icon={<MessageSquare className="h-7 w-7" />} text="Chưa có đánh giá" /> : (
          <div className="divide-y divide-slate-100">
            {data.items.map((r) => (
              <div key={r.id} className={`flex gap-4 p-4 ${r.isVisible ? '' : 'bg-slate-50 opacity-70'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(r.product?.thumbnail)} alt="" className="h-14 w-14 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${r.product?.slug}`} target="_blank" className="font-semibold text-ink hover:text-brand-700">{r.product?.name}</Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm"><Stars value={r.rating} size="h-3.5 w-3.5" /><span className="text-slate-500">{r.user.fullName} · {r.user.email}</span><span className="text-xs text-slate-400">{dateTime(r.createdAt)}</span></div>
                  {r.comment && <p className="mt-1.5 text-sm text-slate-600">{r.comment}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button className="btn-outline btn-sm" onClick={() => act(() => api(`/admin/reviews/${r.id}`, { method: 'PATCH', json: { isVisible: !r.isVisible } }), r.isVisible ? 'Đã ẩn đánh giá' : 'Đã hiện đánh giá')}>{r.isVisible ? <><EyeOff className="h-3.5 w-3.5" /> Ẩn</> : <><Eye className="h-3.5 w-3.5" /> Hiện</>}</button>
                  <button className="btn-icon btn-ghost h-8 w-8 text-red-500" onClick={() => confirm('Xoá đánh giá?') && act(() => api(`/admin/reviews/${r.id}`, { method: 'DELETE' }), 'Đã xoá')}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(page) => setF({ ...f, page })} />}
    </div>
  );
}
