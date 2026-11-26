import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Scanner } from '@/components/Scanner';
import { StaffSearch, SV } from '@/components/StaffSearch';
import { toast } from '@/components/Toast';
import { Badge, Button, Card, Chip, Empty, Input, Row, T } from '@/components/ui';
import { api, imageUrl } from '@/lib/api';
import { scanFeedback } from '@/lib/feedback';
import { money } from '@/lib/format';
import { useStaffGuard } from '@/lib/staff';
import { C } from '@/lib/theme';

export default function Lookup() {
  useStaffGuard();
  const [v, setV] = useState<SV | null>(null);
  const [scan, setScan] = useState(false);
  const [mode, setMode] = useState<'SET' | 'PLUS' | 'MINUS'>('SET');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const pick = (x: SV) => { setV(x); setQty(String(x.stock)); setMode('SET'); setNote(''); };
  const onScan = async (code: string) => {
    try { pick(await api<SV>(`/admin/stock/lookup?code=${encodeURIComponent(code)}`)); scanFeedback('ok'); }
    catch { scanFeedback('error'); toast(`Không tìm thấy mã ${code}`, 'error'); }
  };
  const adjust = async () => {
    if (!v) return;
    const n = Number(qty) || 0;
    const change = mode === 'SET' ? n - v.stock : mode === 'PLUS' ? n : -n;
    if (!change) return toast('Không có thay đổi', 'error');
    if (!note.trim()) return toast('Vui lòng nhập lý do', 'error');
    setBusy(true);
    try {
      await api('/admin/inventory/adjust', { method: 'POST', json: { variantId: v.id, change, reason: 'ADJUST', note } });
      toast('Đã cập nhật tồn kho'); pick(await api<SV>(`/admin/stock/lookup?code=${encodeURIComponent(v.sku)}`));
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const margin = v?.costPrice ? Math.round(((v.price - v.costPrice) / v.price) * 100) : null;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, maxWidth: 700, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Tra cứu mã' }} />
      <StaffSearch onPick={pick} onScanPress={() => setScan(true)} showCost />
      {!v ? <Empty icon="barcode-outline" text="Quét hoặc tìm sản phẩm để xem giá, tồn kho"><Button title="Quét mã" icon="scan-outline" onPress={() => setScan(true)} /></Empty> : (
        <>
          <Card style={{ flexDirection: 'row', gap: 12 }}>
            <Image source={{ uri: imageUrl(v.image || v.product.thumbnail) }} style={{ width: 86, height: 86, borderRadius: 12 }} />
            <View style={{ flex: 1, gap: 3 }}>
              <T variant="h3">{v.product.name}</T><T variant="muted">{v.name}</T>
              <Text style={{ fontSize: 12, color: C.faint }}>SKU {v.sku}{v.barcode ? ` · ${v.barcode}` : ''}</Text>
              {!v.isActive && <Badge label="Ngừng bán" fg={C.red} bg={C.red50} />}
            </View>
          </Card>
          <Row style={{ flexWrap: 'wrap' }} gap={10}>
            {[['Giá bán', money(v.price)], ['Giá vốn', v.costPrice != null ? money(v.costPrice) : '—'], ['Biên LN', margin != null ? `${margin}%` : '—'], ['Tồn kho', `${v.stock} ${v.product.unit ?? ''}`]].map(([l, val]) => (
              <Card key={l} style={{ flex: 1, minWidth: 140, padding: 12 }}><T variant="muted">{l}</T><Text style={{ fontSize: 18, fontWeight: '800', color: l === 'Tồn kho' && v.stock <= v.lowStockThreshold ? C.accent : C.ink }}>{val}</Text></Card>
            ))}
          </Row>
          <Card style={{ gap: 10 }}>
            <T variant="h3">Điều chỉnh tồn nhanh</T>
            <Row>{([['SET', 'Đặt SL'], ['PLUS', 'Cộng'], ['MINUS', 'Trừ']] as const).map(([k, l]) => <Chip key={k} label={l} active={mode === k} onPress={() => { setMode(k); setQty(k === 'SET' ? String(v.stock) : ''); }} />)}</Row>
            <Input label={mode === 'SET' ? 'Số lượng tồn mới' : 'Số lượng'} value={qty} onChangeText={(x) => setQty(x.replace(/\D/g, ''))} keyboardType="number-pad" />
            <Input label="Lý do" value={note} onChangeText={setNote} placeholder="VD: đếm lại kệ, hàng vỡ…" />
            <Button title="Cập nhật tồn kho" loading={busy} onPress={adjust} />
            <Row><Button title="Nhập thêm" variant="outline" size="sm" onPress={() => router.push('/staff/stock/new?type=IMPORT')} style={{ flex: 1 }} /><Button title="Xuất huỷ" variant="outline" size="sm" onPress={() => router.push('/staff/stock/new?type=EXPORT')} style={{ flex: 1 }} /></Row>
          </Card>
        </>
      )}
      <Scanner visible={scan} onClose={() => setScan(false)} onScan={onScan} title="Tra cứu sản phẩm" />
    </ScrollView>
  );
}
