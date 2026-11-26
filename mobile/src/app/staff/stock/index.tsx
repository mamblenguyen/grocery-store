import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';
import { Badge, Button, Card, Chip, Empty, Loading, Row, T } from '@/components/ui';
import { api, qs } from '@/lib/api';
import { dateTime, DOC_STATUS, DOC_TYPE, EXPORT_REASONS, money } from '@/lib/format';
import { useStaffGuard } from '@/lib/staff';
import { C } from '@/lib/theme';
import type { Paged, StockDoc } from '@/lib/types';

const TYPE_COLOR: Record<string, [string, string]> = { IMPORT: ['#065f46', '#d1fae5'], EXPORT: ['#9a3412', '#ffedd5'], STOCKTAKE: ['#075985', '#e0f2fe'] };
const STATUS_COLOR: Record<string, [string, string]> = { DRAFT: ['#334155', '#e2e8f0'], COMPLETED: ['#065f46', '#d1fae5'], CANCELLED: ['#b91c1c', '#fee2e2'] };

export default function StockDocs() {
  useStaffGuard();
  const [type, setType] = useState('');
  const [data, setData] = useState<StockDoc[] | null>(null);
  useFocusEffect(useCallback(() => { api<Paged<StockDoc>>('/admin/stock/documents' + qs({ type, limit: 50 })).then((r) => setData(r.items)).catch(() => setData([])); }, [type]));
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Phiếu kho' }} />
      <View style={{ backgroundColor: C.white, padding: 12, gap: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[['', 'Tất cả'], ['IMPORT', 'Nhập'], ['EXPORT', 'Xuất'], ['STOCKTAKE', 'Kiểm kê']].map(([k, l]) => <Chip key={k} label={l} active={type === k} onPress={() => { setType(k); setData(null); }} />)}
        </ScrollView>
        <Row><Button title="+ Nhập" size="sm" onPress={() => router.push('/staff/stock/new?type=IMPORT')} style={{ flex: 1 }} /><Button title="+ Xuất" size="sm" variant="accent" onPress={() => router.push('/staff/stock/new?type=EXPORT')} style={{ flex: 1 }} /><Button title="+ Kiểm kê" size="sm" variant="outline" onPress={() => router.push('/staff/stock/new?type=STOCKTAKE')} style={{ flex: 1 }} /></Row>
      </View>
      {!data ? <Loading /> : (
        <FlatList data={data} keyExtractor={(d) => String(d.id)} contentContainerStyle={{ padding: 16, gap: 10 }} ListEmptyComponent={<Empty icon="documents-outline" text="Chưa có phiếu kho" />}
          renderItem={({ item: d }) => (
            <Card onPress={() => router.push(`/staff/stock/${d.id}`)} style={{ gap: 6 }}>
              <Row style={{ justifyContent: 'space-between' }}><Text style={{ fontWeight: '800', color: C.ink }}>{d.code}</Text><Badge label={DOC_STATUS[d.status]} fg={STATUS_COLOR[d.status][0]} bg={STATUS_COLOR[d.status][1]} /></Row>
              <Row style={{ justifyContent: 'space-between' }}><Badge label={DOC_TYPE[d.type]} fg={TYPE_COLOR[d.type][0]} bg={TYPE_COLOR[d.type][1]} /><Text style={{ fontWeight: '800' }}>{money(d.totalAmount)}</Text></Row>
              <T variant="muted">{d.supplier?.name ?? (d.reason ? EXPORT_REASONS[d.reason] : '')} · {d._count?.items} dòng · {dateTime(d.createdAt)}</T>
            </Card>
          )} />
      )}
    </View>
  );
}
