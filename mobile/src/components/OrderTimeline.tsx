import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { C } from '@/lib/theme';

const FLOW = [['PENDING', 'Đặt hàng', 'receipt-outline'], ['CONFIRMED', 'Xác nhận', 'clipboard-outline'], ['SHIPPING', 'Đang giao', 'bicycle-outline'], ['COMPLETED', 'Hoàn thành', 'checkmark-done-outline']] as const;

export function OrderTimeline({ status }: { status: string }) {
  if (status === 'CANCELLED') return <View style={{ backgroundColor: C.line2, borderRadius: 12, padding: 12, alignItems: 'center' }}><Text style={{ color: C.muted, fontWeight: '600' }}>Đơn hàng đã bị huỷ</Text></View>;
  const idx = FLOW.findIndex((f) => f[0] === status);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      {FLOW.map(([k, label, icon], i) => (
        <View key={k} style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
            <View style={{ flex: 1, height: 3, backgroundColor: i === 0 ? 'transparent' : i <= idx ? C.brand600 : C.line2 }} />
            <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: i <= idx ? C.brand600 : C.line2 }}><Ionicons name={icon} size={18} color={i <= idx ? '#fff' : C.faint} /></View>
            <View style={{ flex: 1, height: 3, backgroundColor: i === FLOW.length - 1 ? 'transparent' : i < idx ? C.brand600 : C.line2 }} />
          </View>
          <Text style={{ fontSize: 11, marginTop: 4, fontWeight: '600', color: i <= idx ? C.brand700 : C.faint }}>{label}</Text>
        </View>
      ))}
    </View>
  );
}
