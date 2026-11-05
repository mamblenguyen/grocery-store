import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import { useSettings } from '@/context/settings';
import { money, vietQrUrl } from '@/lib/format';
import { C, R } from '@/lib/theme';
import { toast } from './Toast';
import { Card, Row, T } from './ui';

export function BankTransfer({ code, amount }: { code: string; amount: number }) {
  const { settings } = useSettings();
  const b = settings.bank;
  if (!b.accountNo) return null;
  const row = (label: string, value: string, copy = false) => (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.line2 }}>
      <T variant="muted">{label}</T>
      <Pressable disabled={!copy} onPress={async () => { await Clipboard.setStringAsync(value); toast('Đã sao chép'); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontWeight: '700', color: C.ink }}>{value}</Text>{copy && <Ionicons name="copy-outline" size={16} color={C.brand600} />}
      </Pressable>
    </Row>
  );
  return (
    <Card style={{ gap: 10, borderWidth: 2, borderColor: C.brand200, borderStyle: 'dashed' }}>
      <T variant="h3">Quét mã QR để chuyển khoản</T>
      <T variant="muted">Mở app ngân hàng → Quét QR. Số tiền & nội dung đã điền sẵn.</T>
      <Image source={{ uri: vietQrUrl(b, amount, code) }} style={{ width: 220, height: 220, alignSelf: 'center', borderRadius: R.md, backgroundColor: '#fff' }} contentFit="contain" />
      {row('Ngân hàng', b.bankName)}
      {row('Số tài khoản', b.accountNo, true)}
      {row('Chủ tài khoản', b.accountName)}
      {row('Số tiền', money(amount))}
      {row('Nội dung', code, true)}
    </Card>
  );
}
