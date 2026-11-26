import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import { toast } from '@/components/Toast';
import { Button, Card, Empty, Input, Loading, QtyStepper, Row, T } from '@/components/ui';
import type { Order } from '@/lib/types';

const labels: Record<string, string> = { REQUESTED: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Đã từ chối', RECEIVED: 'Đã nhận hàng', REFUNDED: 'Đã hoàn tiền', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã huỷ' };
export default function ReturnsScreen() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>(); const [list, setList] = useState<any[] | null>(null); const [order, setOrder] = useState<Order | null>(null); const [qty, setQty] = useState<Record<number, number>>({}); const [reason, setReason] = useState(''); const [note, setNote] = useState(''); const [saving, setSaving] = useState(false);
  const load = () => api<any[]>('/returns/my').then(setList).catch((e) => toast(e.message, 'error')); useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (orderId) api<Order>(`/orders/my/${orderId}`).then((o) => { setOrder(o); setQty(Object.fromEntries((o.items ?? []).map((i) => [i.id, 0]))); }).catch((e) => toast(e.message, 'error')); }, [orderId]);
  const submit = async () => { const items = Object.entries(qty).filter(([, v]) => v > 0).map(([id, quantity]) => ({ orderItemId: Number(id), quantity })); if (!items.length) return toast('Vui lòng chọn sản phẩm', 'error'); setSaving(true); try { await api('/returns', { method: 'POST', json: { orderId: order!.id, type: 'RETURN', reason, customerNote: note, items } }); toast('Đã gửi yêu cầu'); setOrder(null); load(); } catch (e: any) { toast(e.message, 'error'); } finally { setSaving(false); } };
  return <><Stack.Screen options={{ title: 'Đổi trả & khiếu nại' }} /><ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
    {order && <Card style={{ gap: 12 }}><T variant="h3">Đơn {order.code}</T>{(order.items ?? []).map((i) => <Row key={i.id}><View style={{ flex: 1 }}><T style={{ fontWeight: '700' }}>{i.productName}</T><T variant="muted">{i.variantName} · {money(i.price)} · đã mua {i.quantity}</T></View><QtyStepper min={0} max={i.quantity} value={qty[i.id] ?? 0} onChange={(v) => setQty({ ...qty, [i.id]: v })} size="sm" /></Row>)}<Input label="Lý do *" value={reason} onChangeText={setReason} placeholder="Sản phẩm hư hỏng, giao sai…" /><Input label="Mô tả" value={note} onChangeText={setNote} multiline style={{ minHeight: 70, textAlignVertical: 'top' }} /><Button title="Gửi yêu cầu" loading={saving} disabled={reason.trim().length < 3} onPress={submit} /></Card>}
    {!list ? <Loading full={false} /> : !list.length ? <Empty text="Chưa có yêu cầu hậu mãi" /> : list.map((r) => <Card key={r.id} style={{ gap: 5 }}><Row style={{ justifyContent: 'space-between' }}><T variant="h3">{r.code}</T><T style={{ fontWeight: '700' }}>{labels[r.status] ?? r.status}</T></Row><T variant="muted">Đơn #{r.orderId} · {r.reason}</T><T style={{ fontWeight: '800' }}>{money(r.approvedAmount ?? r.requestedAmount)}</T></Card>)}
  </ScrollView></>;
}
