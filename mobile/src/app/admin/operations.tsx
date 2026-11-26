import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import { C, R } from '@/lib/theme';
import { Badge, Card, Chip, Empty, Loading, Row, T } from '@/components/ui';
import { toast } from '@/components/Toast';
import { confirmAsync } from '@/lib/confirm';

const tabs = [['returns', 'Đổi trả'], ['reconcile', 'Đối soát'], ['loyalty', 'Thành viên'], ['promotions', 'Khuyến mãi'], ['crm', 'CRM'], ['audit', 'Audit']] as const;
const label: Record<string, string> = { REQUESTED: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', RECEIVED: 'Đã nhận hàng', REFUNDED: 'Đã hoàn tiền', COMPLETED: 'Hoàn thành', DRAFT: 'Nháp', CONFIRMED: 'Đã chốt', SENT: 'Đã gửi' };

export default function OperationsScreen() {
  const [tab, setTab] = useState<(typeof tabs)[number][0]>('returns'); const [data, setData] = useState<any[] | null>(null); const [refreshing, setRefreshing] = useState(false);
  const endpoint = { returns: '/admin/operations/returns?limit=100', reconcile: '/admin/operations/reconciliations', loyalty: '/admin/operations/loyalty', promotions: '/admin/operations/promotions', crm: '/admin/operations/campaigns', audit: '/admin/operations/audit?limit=100' }[tab];
  const load = async () => { try { const r: any = await api(endpoint); setData(r.items ?? r); } catch (e: any) { toast(e.message, 'error'); setData([]); } };
  useEffect(() => { setData(null); load(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  const updateReturn = async (r: any, status: string) => { if (!(await confirmAsync(`${label[status]} ${r.code}?`, status === 'RECEIVED' ? 'Tồn kho sẽ được cập nhật ngay.' : '', label[status], ['REJECTED', 'CANCELLED'].includes(status)))) return; try { await api(`/admin/operations/returns/${r.id}`, { method: 'PATCH', json: { status, approvedAmount: r.approvedAmount ?? r.requestedAmount } }); toast('Đã cập nhật'); load(); } catch (e: any) { toast(e.message, 'error'); } };
  const next: Record<string, string[]> = { REQUESTED: ['APPROVED', 'REJECTED'], APPROVED: ['RECEIVED'], RECEIVED: ['REFUNDED', 'COMPLETED'], REFUNDED: ['COMPLETED'] };
  return <><Stack.Screen options={{ title: 'Vận hành & tăng trưởng' }} /><ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />} contentContainerStyle={{ padding: 16, gap: 14 }}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>{tabs.map(([id, name]) => <Chip key={id} label={name} active={tab === id} onPress={() => setTab(id)} />)}</ScrollView>
    {!data ? <Loading full={false} /> : !data.length ? <Empty text="Chưa có dữ liệu" /> : data.map((x) => <Card key={x.id} style={{ gap: 8 }}>
      {tab === 'returns' && <><Row style={{ justifyContent: 'space-between' }}><T variant="h3">{x.code}</T><Badge label={label[x.status] ?? x.status} /></Row><T variant="muted">Đơn #{x.orderId} · {x.reason}</T><Text style={{ fontWeight: '800', color: C.ink }}>{money(x.approvedAmount ?? x.requestedAmount)}</Text><Row style={{ flexWrap: 'wrap' }}>{(next[x.status] ?? []).map((s) => <Pressable key={s} onPress={() => updateReturn(x, s)} style={{ backgroundColor: ['REJECTED', 'CANCELLED'].includes(s) ? C.red : C.brand600, borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 8 }}><Text style={{ color: '#fff', fontWeight: '700' }}>{label[s]}</Text></Pressable>)}</Row></>}
      {tab === 'reconcile' && <><Row style={{ justifyContent: 'space-between' }}><T variant="h3">{x.code}</T><Badge label={label[x.status] ?? x.status} /></Row><T variant="muted">{x.type} · {x.itemCount} giao dịch</T><Row style={{ justifyContent: 'space-between' }}><Text>Hệ thống {money(x.expectedAmount)}</Text><Text style={{ color: x.difference ? C.red : C.brand700, fontWeight: '800' }}>Lệch {money(x.difference)}</Text></Row></>}
      {tab === 'loyalty' && <><Row style={{ justifyContent: 'space-between' }}><T variant="h3">Khách #{x.userId}</T><Badge label={x.tier} /></Row><Text style={{ fontSize: 22, fontWeight: '900', color: C.brand700 }}>{x.points.toLocaleString('vi-VN')} điểm</Text><T variant="muted">Trọn đời {x.lifetimePoints.toLocaleString('vi-VN')} điểm</T></>}
      {tab === 'promotions' && <><Row style={{ justifyContent: 'space-between' }}><T variant="h3">{x.name}</T><Badge label={x.isActive ? 'Đang chạy' : 'Đã tắt'} /></Row><T variant="muted">{x.code} · {x.type} · đã dùng {x.usedCount}</T></>}
      {tab === 'crm' && <><Row style={{ justifyContent: 'space-between' }}><T variant="h3">{x.name}</T><Badge label={label[x.status] ?? x.status} /></Row><T variant="muted">{x.subject || x.type}</T><Text>{x.content}</Text><T variant="muted">Đã gửi {x.sentCount}/{x.totalCount}</T></>}
      {tab === 'audit' && <><Row style={{ justifyContent: 'space-between' }}><T variant="h3">{x.action} · {x.entity}</T><T variant="muted">#{x.entityId || '—'}</T></Row><T variant="muted">{x.userEmail} · {new Date(x.createdAt).toLocaleString('vi-VN')}</T><Text style={{ fontFamily: 'monospace', color: C.muted, fontSize: 12 }}>{x.path}</Text></>}
    </Card>)}
  </ScrollView></>;
}
