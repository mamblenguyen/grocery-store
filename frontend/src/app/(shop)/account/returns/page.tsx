'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { AccountShell } from '@/components/shop/AccountShell';
import { useToast } from '@/components/Toast';
import { Empty, QtyInput, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { dateTime, money } from '@/lib/format';
import type { Order } from '@/lib/types';

const LABEL: Record<string, string> = { REQUESTED: 'Chờ cửa hàng duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Đã từ chối', RECEIVED: 'Cửa hàng đã nhận hàng', REFUNDED: 'Đã hoàn tiền', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã huỷ' };

function ReturnsPageInner() {
  const orderId = useSearchParams().get('orderId'); const toast = useToast();
  const [list, setList] = useState<any[] | null>(null); const [order, setOrder] = useState<Order | null>(null);
  const [type, setType] = useState('RETURN'); const [reason, setReason] = useState(''); const [note, setNote] = useState(''); const [qty, setQty] = useState<Record<number, number>>({}); const [saving, setSaving] = useState(false);
  const load = () => api<any[]>('/returns/my').then(setList); useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (orderId) api<Order>(`/orders/my/${orderId}`).then((o) => { setOrder(o); setQty(Object.fromEntries((o.items ?? []).map((i) => [i.id, 0]))); }).catch((e) => toast(e.message, 'error')); }, [orderId, toast]);
  const submit = async () => { const items = Object.entries(qty).filter(([, q]) => q > 0).map(([orderItemId, quantity]) => ({ orderItemId: Number(orderItemId), quantity })); if (!order || !items.length) return toast('Vui lòng chọn sản phẩm', 'error'); setSaving(true); try { await api('/returns', { method: 'POST', json: { orderId: order.id, type, reason, customerNote: note, items } }); toast('Đã gửi yêu cầu tới cửa hàng'); setOrder(null); load(); } catch (e: any) { toast(e.message, 'error'); } finally { setSaving(false); } };
  return <AccountShell><div className="space-y-5"><div><h1 className="text-2xl font-bold">Đổi trả, hoàn tiền & khiếu nại</h1><p className="text-sm text-slate-500">Theo dõi toàn bộ yêu cầu hậu mãi của bạn.</p></div>
    {order && <div className="card space-y-4"><div><b>Tạo yêu cầu cho đơn {order.code}</b><div className="text-sm text-slate-500">Chọn sản phẩm và số lượng cần xử lý.</div></div><div className="divide-y divide-slate-100">{(order.items ?? []).map((i) => <div key={i.id} className="flex items-center gap-3 py-3"><div className="flex-1"><b>{i.productName}</b><div className="text-sm text-slate-500">{i.variantName} · {money(i.price)} · đã mua {i.quantity}</div></div><QtyInput value={qty[i.id] ?? 0} min={0} max={i.quantity} onChange={(v) => setQty({ ...qty, [i.id]: v })} /></div>)}</div><div className="grid gap-3 sm:grid-cols-2"><div><label className="label">Loại yêu cầu</label><select className="input" value={type} onChange={(e) => setType(e.target.value)}><option value="RETURN">Đổi/trả hàng</option><option value="REFUND">Yêu cầu hoàn tiền</option><option value="COMPLAINT">Khiếu nại</option></select></div><div><label className="label">Lý do *</label><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: sản phẩm hư hỏng" /></div></div><textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Mô tả chi tiết tình trạng và mong muốn xử lý" /><button className="btn-primary" disabled={saving || reason.trim().length < 3} onClick={submit}>{saving ? 'Đang gửi…' : 'Gửi yêu cầu'}</button></div>}
    <div className="card p-0">{!list ? <Spinner /> : !list.length ? <Empty text="Bạn chưa có yêu cầu đổi trả hoặc khiếu nại" /> : <div className="divide-y divide-slate-100">{list.map((r) => <div key={r.id} className="flex flex-wrap items-center gap-3 p-4"><div className="min-w-0 flex-1"><b>{r.code}</b><div className="text-sm text-slate-500">Đơn #{r.orderId} · {r.reason} · {dateTime(r.createdAt)}</div></div><div className="text-right"><span className="badge bg-slate-100 text-slate-700">{LABEL[r.status] ?? r.status}</span><div className="mt-1 text-sm font-semibold">{money(r.approvedAmount ?? r.requestedAmount)}</div></div></div>)}</div>}</div></div></AccountShell>;
}

export default function ReturnsPage() {
  return <Suspense fallback={<AccountShell><Spinner /></AccountShell>}><ReturnsPageInner /></Suspense>;
}
