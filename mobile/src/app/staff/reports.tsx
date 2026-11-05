import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Card, Chip, Loading, Row, T } from '@/components/ui';
import { api, qs } from '@/lib/api';
import { money, num, ymd } from '@/lib/format';
import { useStaffGuard } from '@/lib/staff';
import { C } from '@/lib/theme';

type Agg = { key: string; revenue: number; cogs: number; profit: number; orders: number };
interface Rep { summary: { revenue: number; cogs: number; profit: number; margin: number; orders: number; items: number; avgOrderValue: number }; series: Agg[]; byCategory: Agg[]; topProducts: (Agg & { name: string; items: number })[] }

function range(k: string): [string, string] {
  const t = new Date();
  if (k === 'today') return [ymd(t), ymd(t)];
  if (k === '7d') { const f = new Date(t); f.setDate(t.getDate() - 6); return [ymd(f), ymd(t)]; }
  if (k === 'year') return [ymd(new Date(t.getFullYear(), 0, 1)), ymd(t)];
  return [ymd(new Date(t.getFullYear(), t.getMonth(), 1)), ymd(t)];
}

export default function Reports() {
  useStaffGuard();
  const [k, setK] = useState('month');
  const [r, setR] = useState<Rep | null>(null);
  useEffect(() => { setR(null); const [from, to] = range(k); api<Rep>('/admin/reports/sales' + qs({ from, to })).then(setR).catch(() => {}); }, [k]);
  const max = r ? Math.max(1, ...r.series.map((s) => s.revenue)) : 1;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, maxWidth: 900, width: '100%', alignSelf: 'center' }}>
      <Stack.Screen options={{ title: 'Báo cáo lợi nhuận' }} />
      <Row style={{ flexWrap: 'wrap' }}>{[['today', 'Hôm nay'], ['7d', '7 ngày'], ['month', 'Tháng này'], ['year', 'Năm nay']].map(([v, l]) => <Chip key={v} label={l} active={k === v} onPress={() => setK(v)} />)}</Row>
      {!r ? <Loading full={false} /> : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {[['Doanh thu', money(r.summary.revenue)], ['Giá vốn', money(r.summary.cogs)], ['Lợi nhuận gộp', money(r.summary.profit)], ['Biên LN', `${r.summary.margin}%`], ['Đơn hoàn thành', num(r.summary.orders)], ['TB / đơn', money(r.summary.avgOrderValue)]].map(([l, v]) => (
              <Card key={l} style={{ flexBasis: '47%', flexGrow: 1, padding: 12 }}><T variant="muted">{l}</T><Text style={{ fontSize: 18, fontWeight: '800', color: l === 'Lợi nhuận gộp' ? C.brand700 : C.ink }}>{v}</Text></Card>
            ))}
          </View>
          <Card style={{ gap: 8 }}>
            <T variant="h3">Doanh thu theo {r.series.length > 31 ? 'tháng' : 'ngày'}</T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 4 }}>
                {r.series.map((s) => (
                  <View key={s.key} style={{ width: 18, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                    <View style={{ width: 14, height: `${Math.max(2, (s.revenue / max) * 100)}%`, backgroundColor: C.brand200, borderTopLeftRadius: 4, borderTopRightRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' }}>
                      <View style={{ height: s.revenue ? `${Math.max(0, (s.profit / s.revenue) * 100)}%` : 0, backgroundColor: C.brand600 }} />
                    </View>
                    <Text style={{ fontSize: 8, color: C.faint }}>{s.key.slice(-2)}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </Card>
          <Card style={{ gap: 8 }}>
            <T variant="h3">Top sản phẩm</T>
            {r.topProducts.slice(0, 10).map((p, i) => (
              <Row key={p.name + i} style={{ justifyContent: 'space-between' }}><T style={{ flex: 1 }} numberOfLines={1}>{i + 1}. {p.name} <Text style={{ color: C.muted }}>×{p.items}</Text></T><View style={{ alignItems: 'flex-end' }}><Text style={{ fontWeight: '700' }}>{money(p.revenue)}</Text><Text style={{ fontSize: 12, color: p.profit < 0 ? C.red : C.brand700 }}>LN {money(p.profit)}</Text></View></Row>
            ))}
            {!r.topProducts.length && <T variant="muted">Chưa có đơn hoàn thành trong kỳ</T>}
          </Card>
          <Card style={{ gap: 6 }}>
            <T variant="h3">Theo danh mục</T>
            {r.byCategory.map((c) => <Row key={c.key} style={{ justifyContent: 'space-between' }}><T>{c.key}</T><T style={{ fontWeight: '700' }}>{money(c.revenue)}</T></Row>)}
          </Card>
        </>
      )}
    </ScrollView>
  );
}
