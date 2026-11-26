import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { C, R } from '@/lib/theme';
import {
  type AddressParts, areaLabel, formatAddress, getDistricts, getProvinces, getWards, type ServiceArea, type VnUnit,
} from '@/lib/vn-address';
import { Button, Input, Row, T } from './ui';

/** Bỏ dấu để tìm "ho chi minh" ra "Hồ Chí Minh" */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

function useUnits(loader: (() => Promise<VnUnit[]>) | null, key: unknown) {
  const [list, setList] = useState<VnUnit[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!loader) { setList([]); return; }
    let alive = true;
    setLoading(true);
    loader().then((r) => alive && setList(r)).catch(() => alive && setList([])).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return { list, loading };
}

/** Ô chọn 1 đơn vị hành chính: bấm mở danh sách có tìm kiếm */
function UnitSelect({ label, placeholder, value, list, loading, disabled, onPick, emptyOption, testID }: {
  label: string; placeholder: string; value: string | null; list: VnUnit[]; loading?: boolean; disabled?: boolean;
  onPick: (u: VnUnit | null) => void; emptyOption?: string; testID?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const shown = useMemo(() => (q ? list.filter((u) => fold(u.name).includes(fold(q))) : list), [q, list]);
  const choose = (u: VnUnit | null) => { onPick(u); setOpen(false); setQ(''); };
  return (
    <View>
      <T variant="label">{label}</T>
      <Pressable testID={testID} disabled={disabled} onPress={() => setOpen(true)} style={[st.box, disabled && { backgroundColor: C.line2 }]}>
        <Text style={{ flex: 1, fontSize: 15, color: value ? C.ink : C.faint }} numberOfLines={1}>{value || (loading ? 'Đang tải…' : placeholder)}</Text>
        <Ionicons name="chevron-down" size={18} color={C.faint} />
      </Pressable>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={st.backdrop}>
          <View style={st.sheet}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T variant="h3">{label}</T>
              <Pressable onPress={() => setOpen(false)} hitSlop={10} accessibilityLabel="Đóng"><Ionicons name="close" size={24} color={C.muted} /></Pressable>
            </Row>
            <View style={st.search}>
              <Ionicons name="search" size={18} color={C.faint} />
              <TextInput value={q} onChangeText={setQ} placeholder="Tìm nhanh…" placeholderTextColor={C.faint} style={{ flex: 1, height: 42, color: C.ink }} autoFocus />
            </View>
            {loading ? <ActivityIndicator color={C.brand600} style={{ marginTop: 20 }} /> : (
              <FlatList
                data={shown}
                keyExtractor={(u) => String(u.code)}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={emptyOption && !q ? (
                  <Pressable onPress={() => choose(null)} style={st.item}><Text style={{ color: C.brand700, fontWeight: '600' }}>{emptyOption}</Text></Pressable>
                ) : undefined}
                renderItem={({ item }) => (
                  <Pressable onPress={() => choose(item)} style={st.item}>
                    <Text style={{ color: C.ink, fontWeight: item.name === value ? '700' : '400' }}>{item.name}</Text>
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** Địa chỉ đầy đủ: Tỉnh/TP → Quận/Huyện → Phường/Xã → số nhà, tên đường */
export function AddressFields({ value, onChange, label = 'Địa chỉ', testID = 'addr', hint }: {
  value: AddressParts; onChange: (v: AddressParts) => void; label?: string; testID?: string; hint?: string;
}) {
  const provinces = useUnits(getProvinces, 'p');
  const districts = useUnits(value.provinceCode != null ? () => getDistricts(value.provinceCode!) : null, value.provinceCode);
  const wards = useUnits(value.districtCode != null && !value.noWard ? () => getWards(value.districtCode!) : null, `${value.districtCode}-${value.noWard}`);
  const preview = formatAddress(value);
  return (
    <View style={{ gap: 10 }}>
      <T variant="h3">{label}</T>
      <UnitSelect testID={`${testID}-province`} label="Tỉnh / Thành phố *" placeholder="Chọn Tỉnh / Thành phố" value={value.provinceName} {...provinces}
        onPick={(p) => onChange({ ...value, provinceCode: p?.code ?? null, provinceName: p?.name ?? null, districtCode: null, districtName: null, wardCode: null, wardName: null, noWard: false })} />
      <UnitSelect testID={`${testID}-district`} label="Quận / Huyện *" placeholder="Chọn Quận / Huyện" value={value.districtName} disabled={value.provinceCode == null} {...districts}
        onPick={(d) => onChange({ ...value, districtCode: d?.code ?? null, districtName: d?.name ?? null, wardCode: null, wardName: null, noWard: !!d && d.wardCount === 0 })} />
      <UnitSelect testID={`${testID}-ward`} label="Phường / Xã *" placeholder={value.noWard ? 'Huyện không có cấp xã' : 'Chọn Phường / Xã'} value={value.wardName}
        disabled={value.districtCode == null || value.noWard} {...wards} onPick={(w) => onChange({ ...value, wardCode: w?.code ?? null, wardName: w?.name ?? null })} />
      <Input testID={`${testID}-street`} label="Số nhà, tên đường *" placeholder="VD: 123 Lê Lợi" value={value.street} onChangeText={(street) => onChange({ ...value, street })} />
      {!!hint && <T variant="small" style={{ color: C.amber }}>{hint}</T>}
      {!!preview && <T variant="muted">📍 {preview}</T>}
    </View>
  );
}

const areaKey = (a: ServiceArea) => `${a.provinceCode}/${a.districtCode ?? '*'}/${a.wardCode ?? '*'}`;
const covers = (a: ServiceArea, b: ServiceArea) =>
  a.provinceCode === b.provinceCode && (a.districtCode == null || (a.districtCode === b.districtCode && (a.wardCode == null || a.wardCode === b.wardCode)));

/** Vùng hoạt động tài xế: cả tỉnh / cả huyện / một xã. Rỗng = mọi nơi */
export function AreaPicker({ value, onChange }: { value: ServiceArea[]; onChange: (v: ServiceArea[]) => void }) {
  const [p, setP] = useState<VnUnit | null>(null);
  const [d, setD] = useState<VnUnit | null>(null);
  const [w, setW] = useState<VnUnit | null>(null);
  const provinces = useUnits(getProvinces, 'p');
  const districts = useUnits(p ? () => getDistricts(p.code) : null, p?.code);
  const wards = useUnits(d && d.wardCount !== 0 ? () => getWards(d.code) : null, d?.code);
  const draft: ServiceArea | null = p
    ? { provinceCode: p.code, provinceName: p.name, districtCode: d?.code ?? null, districtName: d?.name ?? null, wardCode: w?.code ?? null, wardName: w?.name ?? null }
    : null;
  const already = !!draft && value.some((a) => covers(a, draft));
  const add = () => { if (draft && !already) { onChange([...value.filter((a) => !covers(draft, a)), draft]); setD(null); setW(null); } };
  return (
    <View style={{ gap: 10 }}>
      {value.length ? (
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          {value.map((a) => (
            <Pressable key={areaKey(a)} onPress={() => onChange(value.filter((x) => areaKey(x) !== areaKey(a)))} style={st.chip} accessibilityLabel={`Bỏ ${areaLabel(a)}`}>
              <Text style={{ color: C.brand800, fontSize: 13 }}>{areaLabel(a)}</Text>
              <Ionicons name="close-circle" size={16} color={C.brand700} />
            </Pressable>
          ))}
        </Row>
      ) : <T variant="muted">Chưa chọn vùng → nhận đơn ở mọi nơi.</T>}
      <UnitSelect testID="area-province" label="Tỉnh / Thành phố" placeholder="Chọn Tỉnh / Thành phố" value={p?.name ?? null} {...provinces} onPick={(u) => { setP(u); setD(null); setW(null); }} />
      <UnitSelect testID="area-district" label="Quận / Huyện" placeholder="Toàn tỉnh / thành phố" emptyOption="Toàn tỉnh / thành phố" value={d?.name ?? null} disabled={!p} {...districts} onPick={(u) => { setD(u); setW(null); }} />
      <UnitSelect testID="area-ward" label="Phường / Xã" placeholder="Toàn quận / huyện" emptyOption="Toàn quận / huyện" value={w?.name ?? null} disabled={!d || d.wardCount === 0} {...wards} onPick={setW} />
      <Button testID="area-add" title={already ? 'Vùng đã có trong danh sách' : 'Thêm vùng'} icon="add-circle-outline" variant="outline" disabled={!draft || already} onPress={add} />
    </View>
  );
}

const st = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: C.line, borderRadius: R.md, backgroundColor: C.white, paddingHorizontal: 12, minHeight: 46 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, padding: 16, gap: 10, maxHeight: '80%', width: '100%', maxWidth: 640, alignSelf: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: C.line, borderRadius: R.md, paddingHorizontal: 12 },
  item: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.brand50, borderRadius: R.full, paddingHorizontal: 10, paddingVertical: 6 },
});
