import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { toast } from '@/components/Toast';
import { Button, Card, Chip, Input, Row, T } from '@/components/ui';
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import { slugifyVi, type SuperStore } from '@/lib/super';
import type { Plan } from '@/lib/types';

/** Super admin tạo cửa hàng mới + tài khoản chủ cửa hàng */
export default function NewStore() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [f, setF] = useState({ name: '', slug: '', phone: '', address: '', planId: 0, months: 1, ownerName: '', ownerEmail: '', ownerPassword: '' });
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api<Plan[]>('/super/plans').then((l) => { setPlans(l); setF((x) => ({ ...x, planId: l.find((p) => p.isActive)?.id ?? 0 })); }).catch(() => {}); }, []);
  const slug = slugTouched ? f.slug : slugifyVi(f.name);
  const plan = plans.find((p) => p.id === f.planId);

  const submit = async () => {
    setBusy(true);
    try {
      const s = await api<SuperStore>('/super/stores', {
        method: 'POST',
        json: {
          name: f.name, slug, phone: f.phone || undefined, address: f.address || undefined, planId: f.planId || undefined, months: f.months,
          owner: { fullName: f.ownerName, email: f.ownerEmail, password: f.ownerPassword },
        },
      });
      toast('Đã tạo cửa hàng');
      router.replace(`/super/store/${s.id}`);
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Thêm cửa hàng' }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, maxWidth: 760, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: 10 }}>
          <T variant="h3">Thông tin cửa hàng</T>
          <Input testID="ns-name" label="Tên cửa hàng *" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} />
          <Input label="Đường dẫn /s/…" autoCapitalize="none" value={slug} onChangeText={(v) => { setSlugTouched(true); setF({ ...f, slug: slugifyVi(v) }); }} />
          <Input label="Số điện thoại" keyboardType="phone-pad" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} />
          <Input label="Địa chỉ" value={f.address} onChangeText={(v) => setF({ ...f, address: v })} />
        </Card>
        <Card style={{ gap: 10 }}>
          <T variant="h3">Tài khoản chủ cửa hàng</T>
          <Input testID="ns-owner" label="Họ tên *" value={f.ownerName} onChangeText={(v) => setF({ ...f, ownerName: v })} />
          <Input testID="ns-email" label="Email đăng nhập *" autoCapitalize="none" keyboardType="email-address" value={f.ownerEmail} onChangeText={(v) => setF({ ...f, ownerEmail: v })} />
          <Input testID="ns-pass" label="Mật khẩu * (≥ 6 ký tự)" value={f.ownerPassword} onChangeText={(v) => setF({ ...f, ownerPassword: v })} />
        </Card>
        <Card style={{ gap: 10 }}>
          <T variant="h3">Gói dịch vụ</T>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>{plans.map((p) => <Chip key={p.id} label={`${p.name} · ${p.priceMonthly ? money(p.priceMonthly) : '0₫'}`} active={f.planId === p.id} onPress={() => setF({ ...f, planId: p.id })} />)}</Row>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>{[1, 3, 6, 12].map((m) => <Chip key={m} label={`${m} tháng`} active={f.months === m} onPress={() => setF({ ...f, months: m })} />)}<Chip label="Không thời hạn" active={f.months === 0} onPress={() => setF({ ...f, months: 0 })} /></Row>
          {f.months > 0 && <T variant="muted">Thu phí: {money((plan?.priceMonthly ?? 0) * f.months)} (ghi phiếu thu tự động)</T>}
        </Card>
        <Button testID="ns-submit" title="Tạo cửa hàng" icon="checkmark-circle-outline" loading={busy} disabled={!f.name || !f.ownerName || !f.ownerEmail || f.ownerPassword.length < 6} onPress={submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
