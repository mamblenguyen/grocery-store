import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { toast } from '@/components/Toast';
import { Button, Card, Chip, Divider, Input, Loading, Row, StatusPill, T } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useStore } from '@/context/store';
import { api } from '@/lib/api';
import { confirmAsync } from '@/lib/confirm';
import { money } from '@/lib/format';
import { BUSINESS_TYPES, expiryInfo, STORE_STATUS, type SuperStoreDetail } from '@/lib/super';
import { C } from '@/lib/theme';
import type { Plan, StoreStatus } from '@/lib/types';

const METHODS = ['Chuyển khoản', 'Tiền mặt', 'Ví điện tử', 'Miễn phí / khuyến mãi'];

export default function SuperStoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isSuper, setActing } = useAuth();
  const shop = useStore();
  const [s, setS] = useState<SuperStoreDetail | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [renew, setRenew] = useState({ months: 1, planId: 0, amount: '', method: METHODS[0] });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api<SuperStoreDetail>(`/super/stores/${id}`).then((d) => { setS(d); setRenew((r) => ({ ...r, planId: r.planId || d.planId || 0 })); }).catch((e) => toast(e.message, 'error')), [id]);
  useEffect(() => { load(); api<Plan[]>('/super/plans').then(setPlans).catch(() => {}); }, [load]);
  if (!isSuper) return null;
  if (!s) return <Loading />;

  const e = expiryInfo(s.planExpiresAt);
  const plan = plans.find((p) => p.id === renew.planId);
  const auto = (plan?.priceMonthly ?? 0) * renew.months;
  const owner = s.members.find((m) => m.role === 'ADMIN');

  const setStatus = async (status: StoreStatus) => {
    const msg = { ACTIVE: 'Mở lại hoạt động cho cửa hàng?', SUSPENDED: 'Tạm ngưng? Khách & nhân viên sẽ không truy cập được.', CLOSED: 'Đóng cửa hàng?' }[status];
    if (!(await confirmAsync(STORE_STATUS[status].label, msg, 'Xác nhận', status !== 'ACTIVE'))) return;
    try { setS(await api(`/super/stores/${s.id}`, { method: 'PATCH', json: { status } })); toast('Đã cập nhật trạng thái'); } catch (err: any) { toast(err.message, 'error'); }
  };
  const doRenew = async () => {
    if (!(await confirmAsync('Gia hạn gói?', `${plan?.name ?? ''} · ${renew.months} tháng · ${money(renew.amount === '' ? auto : Number(renew.amount))}`, 'Gia hạn'))) return;
    setBusy(true);
    try {
      setS(await api(`/super/stores/${s.id}/renew`, { method: 'POST', json: { months: renew.months, planId: renew.planId || undefined, amount: renew.amount === '' ? undefined : Number(renew.amount), method: renew.method } }));
      toast('Đã gia hạn & ghi phiếu thu');
    } catch (err: any) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  const actAs = () => { setActing({ id: s.id, slug: s.slug, name: s.name }); router.replace('/manage'); };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
      <Stack.Screen options={{ title: s.name }} />
      <Card style={{ gap: 8 }}>
        <Row style={{ justifyContent: 'space-between' }}><T variant="h2" style={{ flex: 1 }}>{s.name}</T><StatusPill map={STORE_STATUS} value={s.status} /></Row>
        <T variant="muted">/s/{s.slug}</T>
        {!!s.address && <T>📍 {s.address}</T>}
        {!!s.phone && <Text onPress={() => Linking.openURL(`tel:${s.phone}`)} style={{ color: C.brand700, fontWeight: '600' }}>📞 {s.phone}</Text>}
        {owner && <T>👤 Chủ: {owner.fullName} · {owner.email}</T>}
        <Row gap={8} style={{ flexWrap: 'wrap', marginTop: 4 }}>
          <Button testID="act-as" title="Quản trị hộ" icon="shield-checkmark-outline" size="sm" onPress={actAs} />
          {s.status === 'ACTIVE' && <Button title="Xem cửa hàng" icon="storefront-outline" variant="outline" size="sm" onPress={async () => { await shop.selectSlug(s.slug).catch(() => {}); router.replace('/'); }} />}
          {s.status !== 'ACTIVE' && <Button title="Kích hoạt" icon="play-outline" variant="outline" size="sm" onPress={() => setStatus('ACTIVE')} />}
          {s.status === 'ACTIVE' && <Button testID="suspend" title="Tạm ngưng" icon="pause-outline" variant="outline" size="sm" onPress={() => setStatus('SUSPENDED')} />}
        </Row>
      </Card>

      <Card style={{ gap: 6 }}>
        <T variant="h3">Thông tin đối tác</T>
        {([
          ['Loại hình', s.businessType ? BUSINESS_TYPES[s.businessType] ?? s.businessType : null], ['Tên DN / HKD', s.businessName], ['Mã số thuế', s.taxCode],
          ['Người đại diện', s.representative], ['CCCD', s.representativeId], ['SĐT đại diện', s.representativePhone],
          ['TK đối soát', s.bankAccountNo ? `${s.bankAccountNo}${s.bankName ? ` · ${s.bankName}` : ''}` : null], ['Chủ TK', s.bankAccountName],
          ['Hợp đồng', s.contractNo ? `${s.contractNo}${s.contractSignedAt ? ` · ${new Date(s.contractSignedAt).toLocaleDateString('vi-VN')}` : ''}` : null],
        ] as [string, string | null | undefined][]).map(([k, v]) => (
          <Row key={k} style={{ justifyContent: 'space-between' }}><T variant="muted">{k}</T><Text style={{ color: v ? C.ink : C.faint, fontWeight: '600', flexShrink: 1, textAlign: 'right' }}>{v || 'Chưa có'}</Text></Row>
        ))}
        {!!s.representativePhone && <Button title="Gọi người đại diện" icon="call-outline" variant="outline" size="sm" onPress={() => Linking.openURL(`tel:${s.representativePhone}`)} />}
      </Card>

      <Row gap={10} style={{ flexWrap: 'wrap' }}>
        {[['Doanh số tháng', money(s.stats.monthRevenue), `${s.stats.monthOrders} đơn`], ['Tổng doanh số', money(s.stats.revenue), `${s.stats.orders} đơn`], ['Sản phẩm', `${s._count.products}`, `${s.stats.variants} biến thể`], ['Khách online', `${s.stats.customers}`, `${s._count.members} tài khoản QT`]].map(([l, v, h]) => (
          <Card key={l} style={{ flex: 1, minWidth: 150, gap: 2 }}><T variant="muted" style={{ fontSize: 12 }}>{l}</T><Text style={{ fontSize: 18, fontWeight: '800', color: C.ink }}>{v}</Text><T variant="muted" style={{ fontSize: 11 }}>{h}</T></Card>
        ))}
      </Row>

      <Card style={{ gap: 10 }}>
        <T variant="h3">Gói dịch vụ</T>
        <Row style={{ justifyContent: 'space-between' }}><T>{s.plan?.name ?? 'Chưa có gói'}</T><Text style={{ color: e.color, fontWeight: '700' }}>{e.text}</Text></Row>
        <Divider />
        <T variant="label">Gia hạn / đổi gói</T>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>{plans.map((p) => <Chip key={p.id} label={`${p.name} · ${p.priceMonthly ? money(p.priceMonthly) : '0₫'}`} active={renew.planId === p.id} onPress={() => setRenew({ ...renew, planId: p.id })} />)}</Row>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>{[1, 3, 6, 12].map((m) => <Chip key={m} label={`${m} tháng`} active={renew.months === m} onPress={() => setRenew({ ...renew, months: m })} />)}</Row>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>{METHODS.map((m) => <Chip key={m} label={m} active={renew.method === m} onPress={() => setRenew({ ...renew, method: m })} />)}</Row>
        <Input label={`Số tiền (để trống = ${money(auto)})`} keyboardType="number-pad" value={renew.amount} onChangeText={(v) => setRenew({ ...renew, amount: v.replace(/\D/g, '') })} />
        <Button testID="renew" title="Xác nhận gia hạn" icon="calendar-outline" loading={busy} onPress={doRenew} />
      </Card>

      <Card style={{ gap: 8 }}>
        <T variant="h3">Tài khoản quản trị</T>
        {s.members.map((m) => (
          <Row key={m.id} style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', color: C.ink }}>{m.fullName}</Text><T variant="muted" style={{ fontSize: 12 }}>{m.email} · {m.role === 'ADMIN' ? 'Chủ / quản lý' : 'Nhân viên'}{m.isActive ? '' : ' · đã khoá'}</T></View>
            <Ionicons name="key-outline" size={20} color={C.brand700} onPress={async () => {
              const pwd = Math.random().toString(36).slice(2, 10);
              if (!(await confirmAsync('Đặt lại mật khẩu?', `Mật khẩu mới của ${m.email} sẽ là: ${pwd}`, 'Đặt lại'))) return;
              try { await api(`/super/stores/${s.id}/members/${m.id}`, { method: 'PATCH', json: { password: pwd } }); toast(`Mật khẩu mới: ${pwd}`); } catch (err: any) { toast(err.message, 'error'); }
            }} />
          </Row>
        ))}
      </Card>

      <Card style={{ gap: 8 }}>
        <T variant="h3">Lịch sử thu phí</T>
        {s.payments.length ? s.payments.map((p) => (
          <Row key={p.id} style={{ justifyContent: 'space-between' }}>
            <T style={{ flex: 1, fontSize: 13 }}>{new Date(p.createdAt).toLocaleDateString('vi-VN')} · {p.plan?.name ?? '—'} · {p.months} th{p.method ? ` · ${p.method}` : ''}</T>
            <Text style={{ fontWeight: '700', color: C.ink }}>{money(p.amount)}</Text>
          </Row>
        )) : <T variant="muted">Chưa có phiếu thu</T>}
      </Card>
    </ScrollView>
  );
}
