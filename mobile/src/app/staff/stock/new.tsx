import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Scanner } from '@/components/Scanner';
import { StaffSearch, SV } from '@/components/StaffSearch';
import { toast } from '@/components/Toast';
import { Button, Card, Chip, Empty, Input, Row, T } from '@/components/ui';
import { api } from '@/lib/api';
import { confirmAsync } from '@/lib/confirm';
import { scanFeedback } from '@/lib/feedback';
import { DOC_TYPE, EXPORT_REASONS, money } from '@/lib/format';
import { useStaffGuard } from '@/lib/staff';
import { C, R } from '@/lib/theme';
import type { StockDoc, Supplier } from '@/lib/types';

type DocType = 'IMPORT' | 'EXPORT' | 'STOCKTAKE';
interface Line { v: SV; quantity: string; unitCost: string; lotNo: string; expiryDate: string }

export default function NewStockDoc() {
  useStaffGuard();
  const { type: t } = useLocalSearchParams<{ type?: string }>();
  const type: DocType = t === 'EXPORT' || t === 'STOCKTAKE' ? t : 'IMPORT';
  const insets = useSafeAreaInsets();
  const [lines, setLines] = useState<Line[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [scan, setScan] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef(lines);
  ref.current = lines;

  useEffect(() => { if (type !== 'STOCKTAKE') api<Supplier[]>('/admin/suppliers').then((s) => setSuppliers(s.filter((x) => x.isActive))).catch(() => {}); }, [type]);

  const add = useCallback((v: SV) => {
    const ex = ref.current.find((l) => l.v.id === v.id);
    setLines((ls) => ex
      ? ls.map((l) => (l.v.id === v.id ? { ...l, quantity: String((Number(l.quantity) || 0) + 1) } : l))
      : [{ v, quantity: '1', unitCost: String(v.costPrice ?? 0), lotNo: '', expiryDate: '' }, ...ls]);
    scanFeedback('ok');
    if (ex) toast(`${v.product.name}: ${(Number(ex.quantity) || 0) + 1}`);
  }, []);
  const onScan = useCallback(async (code: string) => {
    try { add(await api<SV>(`/admin/stock/lookup?code=${encodeURIComponent(code)}`)); }
    catch { scanFeedback('error'); toast(`Không tìm thấy mã ${code}`, 'error'); }
  }, [add]);
  const set = (id: number, p: Partial<Line>) => setLines((ls) => ls.map((l) => (l.v.id === id ? { ...l, ...p } : l)));

  const amount = (l: Line) => {
    const q = Number(l.quantity) || 0;
    return type === 'IMPORT' ? q * (Number(l.unitCost) || 0) : type === 'EXPORT' ? q * (l.v.costPrice ?? 0) : (q - l.v.stock) * (l.v.costPrice ?? 0);
  };
  const over = type === 'EXPORT' ? lines.filter((l) => Number(l.quantity) > l.v.stock) : [];
  const total = lines.reduce((s, l) => s + amount(l), 0);

  const save = async (complete: boolean) => {
    if (!lines.length) return toast('Chưa có dòng hàng', 'error');
    if (type === 'EXPORT' && !reason) return toast('Chọn lý do xuất kho', 'error');
    if (complete && !(await confirmAsync(`Hoàn tất ${DOC_TYPE[type].toLowerCase()}?`, 'Tồn kho sẽ được cập nhật ngay.'))) return;
    setBusy(true);
    try {
      const doc = await api<StockDoc>('/admin/stock/documents', {
        method: 'POST',
        json: {
          type, complete, supplierId, reason: type === 'EXPORT' ? reason : undefined, note: note || undefined,
          items: lines.map((l) => ({ variantId: l.v.id, quantity: Number(l.quantity) || 0, unitCost: type === 'IMPORT' ? Number(l.unitCost) || 0 : undefined, lotNo: l.lotNo || undefined, expiryDate: /^\d{4}-\d{2}-\d{2}$/.test(l.expiryDate) ? l.expiryDate : undefined })),
        },
      });
      toast(complete ? `Đã hoàn tất ${doc.code}` : `Đã lưu nháp ${doc.code}`);
      router.replace(`/staff/stock/${doc.id}`);
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  const numInput = (value: string, onChange: (v: string) => void, w = 80, testID?: string) => (
    <TextInput testID={testID} value={value} onChangeText={(v) => onChange(v.replace(/\D/g, ''))} keyboardType="number-pad" style={{ width: w, height: 38, borderWidth: 1.5, borderColor: C.line, borderRadius: R.sm, paddingHorizontal: 8, fontWeight: '700', color: C.ink, backgroundColor: C.white, outlineStyle: 'none' as any }} />
  );

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: DOC_TYPE[type] }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 150 + insets.bottom, maxWidth: 760, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        {type !== 'STOCKTAKE' && suppliers.length > 0 && (
          <View style={{ gap: 6 }}>
            <T variant="label">Nhà cung cấp {type === 'EXPORT' ? '(khi trả hàng)' : ''}</T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <Chip label="Không chọn" active={supplierId === null} onPress={() => setSupplierId(null)} />
              {suppliers.map((s) => <Chip key={s.id} label={s.name} active={supplierId === s.id} onPress={() => setSupplierId(s.id)} />)}
            </ScrollView>
          </View>
        )}
        {type === 'EXPORT' && (
          <View style={{ gap: 6 }}><T variant="label">Lý do xuất *</T><Row style={{ flexWrap: 'wrap' }}>{Object.entries(EXPORT_REASONS).map(([k, l]) => <Chip key={k} label={l} active={reason === k} onPress={() => setReason(k)} />)}</Row></View>
        )}
        <Input label="Ghi chú" value={note} onChangeText={setNote} />
        <StaffSearch onPick={add} onScanPress={() => setScan(true)} showCost />
        <T variant="muted">💡 Quét lại cùng mã sẽ cộng thêm 1.</T>
        {!lines.length && <Empty icon="scan-outline" text="Quét hoặc tìm sản phẩm để thêm vào phiếu" />}
        {lines.map((l) => {
          const diff = (Number(l.quantity) || 0) - l.v.stock;
          return (
            <Card key={l.v.id} style={{ gap: 8, padding: 12, borderColor: Number(l.quantity) > l.v.stock && type === 'EXPORT' ? C.red : '#eef2f6' }}>
              <Row style={{ alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', color: C.ink }}>{l.v.product.name}</Text><T variant="muted">{l.v.name} · {l.v.sku} · Tồn {l.v.stock}</T></View>
                <Pressable onPress={() => setLines((ls) => ls.filter((x) => x.v.id !== l.v.id))} hitSlop={8}><Ionicons name="trash-outline" size={18} color={C.faint} /></Pressable>
              </Row>
              <Row style={{ flexWrap: 'wrap' }} gap={10}>
                <View style={{ gap: 2 }}><T variant="muted">{type === 'STOCKTAKE' ? 'SL thực tế' : 'Số lượng'}</T>{numInput(l.quantity, (v) => set(l.v.id, { quantity: v }), 80, `qty-${l.v.sku}`)}</View>
                {type === 'IMPORT' && <View style={{ gap: 2 }}><T variant="muted">Giá nhập</T>{numInput(l.unitCost, (v) => set(l.v.id, { unitCost: v }), 110)}</View>}
                {type === 'IMPORT' && <View style={{ gap: 2 }}><T variant="muted">Số lô</T><TextInput value={l.lotNo} onChangeText={(v) => set(l.v.id, { lotNo: v })} style={{ width: 90, height: 38, borderWidth: 1.5, borderColor: C.line, borderRadius: R.sm, paddingHorizontal: 8, backgroundColor: C.white, outlineStyle: 'none' as any }} /></View>}
                {type === 'IMPORT' && <View style={{ gap: 2 }}><T variant="muted">HSD (yyyy-mm-dd)</T><TextInput value={l.expiryDate} onChangeText={(v) => set(l.v.id, { expiryDate: v })} placeholder="2027-01-31" placeholderTextColor={C.faint} style={{ width: 120, height: 38, borderWidth: 1.5, borderColor: C.line, borderRadius: R.sm, paddingHorizontal: 8, backgroundColor: C.white, outlineStyle: 'none' as any }} /></View>}
                {type === 'STOCKTAKE' && <View style={{ gap: 2 }}><T variant="muted">Chênh lệch</T><Text style={{ fontSize: 18, fontWeight: '800', color: diff < 0 ? C.red : diff > 0 ? C.brand700 : C.faint }}>{diff > 0 ? '+' : ''}{diff}</Text></View>}
                <View style={{ gap: 2, marginLeft: 'auto', alignItems: 'flex-end' }}><T variant="muted">Thành tiền</T><Text style={{ fontWeight: '800', color: amount(l) < 0 ? C.red : C.ink }}>{money(amount(l))}</Text></View>
              </Row>
            </Card>
          );
        })}
        {over.length > 0 && <Text style={{ color: C.red, fontWeight: '600' }}>⚠ {over.length} dòng xuất vượt tồn kho</Text>}
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.line, padding: 16, paddingBottom: 16 + insets.bottom, gap: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}><T>{lines.length} mặt hàng</T><Text style={{ fontSize: 20, fontWeight: '800', color: C.ink }}>{money(total)}</Text></Row>
        <Row>
          <Button title="Quét" icon="scan-outline" variant="soft" onPress={() => setScan(true)} style={{ flex: 1 }} />
          <Button title="Lưu nháp" variant="outline" loading={busy} onPress={() => save(false)} style={{ flex: 1 }} />
          <Button testID="doc-complete" title="Hoàn tất" loading={busy} disabled={over.length > 0} onPress={() => save(true)} style={{ flex: 1.3 }} />
        </Row>
      </View>
      <Scanner visible={scan} onClose={() => setScan(false)} onScan={onScan} continuous title={`${DOC_TYPE[type]} – quét liên tục`}
        footer={<View style={{ backgroundColor: 'rgba(255,255,255,.95)', borderRadius: R.md, padding: 10 }}><Text style={{ fontWeight: '700', textAlign: 'center' }}>{lines.length} mặt hàng · {lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0)} đơn vị</Text></View>} />
    </View>
  );
}
