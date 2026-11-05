import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, R, shadow } from '@/lib/theme';

type T = { id: number; msg: string; type: 'success' | 'error' };
let listeners: ((t: T[]) => void)[] = [];
let list: T[] = [];
const emit = () => listeners.forEach((l) => l([...list]));

/** Gọi ở bất kỳ đâu: toast('Đã lưu') / toast('Lỗi', 'error') */
export function toast(msg: string, type: T['type'] = 'success') {
  const t = { id: Date.now() + Math.random(), msg, type };
  list = [...list.slice(-2), t];
  emit();
  setTimeout(() => { list = list.filter((x) => x.id !== t.id); emit(); }, 2800);
}

export function ToastHost() {
  const [items, setItems] = useState<T[]>([]);
  const insets = useSafeAreaInsets();
  useEffect(() => { listeners.push(setItems); return () => { listeners = listeners.filter((l) => l !== setItems); }; }, []);
  return (
    <View pointerEvents="none" style={[st.wrap, { top: insets.top + 8 }]}>
      {items.map((t) => (
        <View key={t.id} style={[st.toast, shadow]}>
          <Ionicons name={t.type === 'success' ? 'checkmark-circle' : 'close-circle'} size={20} color={t.type === 'success' ? C.brand600 : C.red} />
          <Text style={st.msg}>{t.msg}</Text>
        </View>
      ))}
    </View>
  );
}
const st = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 999, gap: 8, alignItems: 'center' },
  toast: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: C.white, borderRadius: R.md, paddingVertical: 12, paddingHorizontal: 14, maxWidth: 480, width: '100%', borderWidth: 1, borderColor: C.line },
  msg: { flex: 1, color: C.ink, fontSize: 14 },
});
