import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { api, imageUrl } from '@/lib/api';
import { money } from '@/lib/format';
import { C, R, shadow } from '@/lib/theme';
import type { Variant } from '@/lib/types';
import { Row } from './ui';

export type SV = Variant & { product: NonNullable<Variant['product']> };

/** Ô tìm sản phẩm cho nhân viên: tên / SKU / mã vạch + nút quét */
export function StaffSearch({ onPick, onScanPress, showCost }: { onPick: (v: SV) => void; onScanPress?: () => void; showCost?: boolean }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<SV[]>([]);
  useEffect(() => {
    if (!q.trim()) return setRes([]);
    const t = setTimeout(() => api<SV[]>(`/admin/stock/variants?search=${encodeURIComponent(q.trim())}`).then(setRes).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q]);
  const submit = async () => {
    if (!q.trim()) return;
    try { onPick(await api<SV>(`/admin/stock/lookup?code=${encodeURIComponent(q.trim())}`)); setQ(''); setRes([]); }
    catch { if (res[0]) { onPick(res[0]); setQ(''); setRes([]); } }
  };
  return (
    <View style={{ zIndex: 10 }}>
      <Row>
        <Row style={{ flex: 1, height: 46, borderWidth: 1.5, borderColor: C.line, borderRadius: R.md, paddingHorizontal: 12, backgroundColor: C.white }}>
          <Ionicons name="search" size={18} color={C.faint} />
          <TextInput testID="staff-search" value={q} onChangeText={setQ} onSubmitEditing={submit} placeholder="Tên, SKU hoặc mã vạch" placeholderTextColor={C.faint} returnKeyType="search" autoCapitalize="none" style={{ flex: 1, fontSize: 15, color: C.ink, outlineStyle: 'none' as any }} />
        </Row>
        {onScanPress && <Pressable testID="open-scanner" onPress={onScanPress} style={{ height: 46, width: 52, borderRadius: R.md, backgroundColor: C.brand600, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Quét mã"><Ionicons name="scan-outline" size={24} color="#fff" /></Pressable>}
      </Row>
      {res.length > 0 && (
        <View style={[{ backgroundColor: C.white, borderRadius: R.md, marginTop: 6, borderWidth: 1, borderColor: C.line, maxHeight: 320, overflow: 'hidden' }, shadow]}>
          {res.slice(0, 8).map((v) => (
            <Pressable key={v.id} onPress={() => { onPick(v); setQ(''); setRes([]); }} style={({ pressed }) => [{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: C.line2 }, pressed && { backgroundColor: C.brand50 }]}>
              <Image source={{ uri: imageUrl(v.image || v.product.thumbnail) }} style={{ width: 40, height: 40, borderRadius: 8 }} />
              <View style={{ flex: 1 }}><Text style={{ fontWeight: '600', color: C.ink }} numberOfLines={1}>{v.product.name} – {v.name}</Text><Text style={{ fontSize: 12, color: C.faint }}>{v.sku}</Text></View>
              <View style={{ alignItems: 'flex-end' }}><Text style={{ fontWeight: '700' }}>{money(showCost ? v.costPrice : v.price)}</Text><Text style={{ fontSize: 12, color: v.stock <= 0 ? C.red : C.muted }}>Tồn {v.stock}</Text></View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
