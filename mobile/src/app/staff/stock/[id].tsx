import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { toast } from '@/components/Toast';
import { Badge, Button, Card, Input, Loading, Row, T } from '@/components/ui';
import { api } from '@/lib/api';
import { confirmAsync } from '@/lib/confirm';
import { dateOnly, dateTime, DOC_STATUS, DOC_TYPE, EXPORT_REASONS, money } from '@/lib/format';
import { useStaffGuard } from '@/lib/staff';
import { C } from '@/lib/theme';
import type { StockDoc } from '@/lib/types';

export default function StockDocDetail() {
  useStaffGuard();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [d, setD] = useState<StockDoc | null>(null);
  const [reason, setReason] = useState('');
  const load = useCallback(() => api<StockDoc>(`/admin/stock/documents/${id}`).then(setD).catch((e) => toast(e.message, 'error')), [id]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <Loading />;
  const act = async (fn: () => Promise<unknown>, msg: string) => { try { await fn(); toast(msg); load(); } catch (e: any) { toast(e.message, 'error'); } };
  const tk = d.type === 'STOCKTAKE';
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
      <Stack.Screen options={{ title: d.code }} />
      <Card style={{ gap: 6 }}>
        <Row style={{ justifyContent: 'space-between' }}><T variant="h3">{DOC_TYPE[d.type]}</T><Badge label={DOC_STATUS[d.status]} fg={d.status === 'CANCELLED' ? C.red : d.status === 'DRAFT' ? C.text : C.brand700} bg={d.status === 'CANCELLED' ? C.red50 : d.status === 'DRAFT' ? C.line2 : C.brand50} /></Row>
        {d.supplier && <T>Nhà cung cấp: {d.supplier.name}</T>}
        {d.reason && <T>Lý do: {EXPORT_REASONS[d.reason]}</T>}
        {d.note && <T variant="muted">{d.note}</T>}
        <T variant="muted">Tạo bởi {d.createdBy?.fullName} · {dateTime(d.createdAt)}</T>
        {d.completedAt && <T variant="muted">Hoàn tất bởi {d.completedBy?.fullName} · {dateTime(d.completedAt)}</T>}
        {d.status === 'CANCELLED' && <Text style={{ color: C.red }}>Đã huỷ: {d.cancelReason}</Text>}
        <Row style={{ justifyContent: 'space-between', marginTop: 4 }}><T variant="h3">Tổng giá trị</T><Text style={{ fontSize: 20, fontWeight: '800' }}>{money(d.totalAmount)}</Text></Row>
      </Card>
      {d.items?.map((i) => {
        const diff = i.quantity - (i.systemQty ?? i.variant.stock);
        return (
          <Card key={i.id} style={{ gap: 4, padding: 12 }}>
            <Text style={{ fontWeight: '700', color: C.ink }}>{i.variant.product.name} – {i.variant.name}</Text>
            <T variant="muted">{i.variant.sku}{i.lotNo ? ` · Lô ${i.lotNo}` : ''}{i.expiryDate ? ` · HSD ${dateOnly(i.expiryDate)}` : ''}</T>
            <Row style={{ justifyContent: 'space-between' }}>
              <T>{tk ? `Hệ thống ${i.systemQty ?? '–'} → Thực tế ${i.quantity} (${diff > 0 ? '+' : ''}${d.status === 'COMPLETED' ? diff : '?'})` : `${i.quantity} × ${money(i.unitCost)}`}</T>
              <Text style={{ fontWeight: '800' }}>{money(i.total)}</Text>
            </Row>
          </Card>
        );
      })}
      {d.status === 'DRAFT' && (
        <Row>
          <Button title="Xoá nháp" variant="outline" onPress={async () => { if (await confirmAsync('Xoá phiếu nháp?', '', 'Xoá', true)) act(() => api(`/admin/stock/documents/${d.id}`, { method: 'DELETE' }), 'Đã xoá'); }} style={{ flex: 1 }} />
          <Button title="Hoàn tất" onPress={async () => { if (await confirmAsync('Hoàn tất phiếu?', 'Tồn kho sẽ được cập nhật.')) act(() => api(`/admin/stock/documents/${d.id}/complete`, { method: 'POST' }), 'Đã hoàn tất'); }} style={{ flex: 1 }} />
        </Row>
      )}
      {d.status === 'COMPLETED' && (
        <Card style={{ gap: 8 }}>
          <T variant="h3">Huỷ phiếu</T>
          <T variant="muted">Huỷ sẽ đảo ngược tồn kho đã cập nhật bởi phiếu này.</T>
          <Input value={reason} onChangeText={setReason} placeholder="Lý do huỷ" />
          <Button title="Huỷ phiếu" variant="danger" disabled={reason.trim().length < 3} onPress={async () => { if (await confirmAsync('Huỷ phiếu & đảo ngược tồn kho?', '', 'Huỷ phiếu', true)) act(() => api(`/admin/stock/documents/${d.id}/cancel`, { method: 'POST', json: { reason } }), 'Đã huỷ phiếu'); }} />
        </Card>
      )}
    </ScrollView>
  );
}
