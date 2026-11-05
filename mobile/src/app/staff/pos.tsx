import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Scanner } from '@/components/Scanner';
import { StaffSearch, SV } from '@/components/StaffSearch';
import { toast } from '@/components/Toast';
import { Button, Card, Chip, Empty, Input, QtyStepper, Row, T } from '@/components/ui';
import { useSettings } from '@/context/settings';
import { api } from '@/lib/api';
import { confirmAsync } from '@/lib/confirm';
import { scanFeedback } from '@/lib/feedback';
import { money, vietQrUrl } from '@/lib/format';
import { printInvoice } from '@/lib/invoice';
import { cashSuggestions, useStaffGuard } from '@/lib/staff';
import { store } from '@/lib/storage';
import { C, R } from '@/lib/theme';
import type { Order } from '@/lib/types';

interface Line { v: SV; qty: number }
const KEY = 'pos_bill_mobile';

export default function MobilePos() {
  useStaffGuard();
  const { settings } = useSettings();
  const insets = useSafeAreaInsets();
  const [lines, setLines] = useState<Line[]>([]);
  const [ready, setReady] = useState(false);
  const [scan, setScan] = useState(false);
  const [mult, setMult] = useState(1);
  const [pay, setPay] = useState(false);
  const [method, setMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [cash, setCash] = useState('');
  const [discount, setDiscount] = useState('');
  const [customer, setCustomer] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Order | null>(null);
  const [quick, setQuick] = useState<SV[]>([]);
  const [cats, setCats] = useState<{ id: number; name: string }[]>([]);
  const [cat, setCat] = useState<number | null>(null);
  const [showQuick, setShowQuick] = useState(true);
  useEffect(() => {
    api<SV[]>('/admin/stock/variants?sellable=1&limit=1000').then(setQuick).catch(() => {});
    api<{ id: number; name: string }[]>('/categories').then(setCats).catch(() => {});
  }, []);
  const linesRef = useRef(lines);
  linesRef.current = lines;

  // Hoá đơn đang bán được lưu lại – tắt app / chuyển màn hình không mất
  useEffect(() => { store.get<Line[]>(KEY, []).then((l) => { setLines(l); setReady(true); }); }, []);
  useEffect(() => { if (ready) store.set(KEY, lines); }, [lines, ready]);

  const add = useCallback((v: SV, qty: number) => {
    if (!v.isActive || v.product.isActive === false) { scanFeedback('error'); toast(`"${v.product.name}" đang ngừng bán`, 'error'); return false; }
    const inBill = linesRef.current.find((l) => l.v.id === v.id)?.qty ?? 0;
    if (inBill + qty > v.stock) { scanFeedback('error'); toast(`${v.product.name} – ${v.name}: chỉ còn ${v.stock}`, 'error'); return false; }
    setLines((ls) => {
      const ex = ls.find((l) => l.v.id === v.id);
      return ex ? ls.map((l) => (l.v.id === v.id ? { v, qty: Math.min(l.qty + qty, v.stock) } : l)) : [{ v, qty }, ...ls];
    });
    scanFeedback('ok');
    return true;
  }, []);

  const onScan = useCallback(async (code: string) => {
    try { const v = await api<SV>(`/admin/stock/lookup?code=${encodeURIComponent(code)}`); add(v, mult); }
    catch { scanFeedback('error'); toast(`Không tìm thấy mã ${code}`, 'error'); }
  }, [add, mult]);

  const subtotal = lines.reduce((s, l) => s + l.v.price * l.qty, 0);
  const md = Math.min(Number(discount) || 0, subtotal);
  const total = subtotal - md;
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const change = method === 'CASH' && cash ? Number(cash) - total : 0;

  const checkout = async () => {
    if (method === 'CASH' && cash && Number(cash) < total) return toast('Tiền khách đưa chưa đủ', 'error');
    setBusy(true);
    try {
      const o = await api<Order>('/admin/orders/pos', {
        method: 'POST',
        json: { items: lines.map((l) => ({ variantId: l.v.id, quantity: l.qty })), paymentMethod: method, cashReceived: method === 'CASH' ? (cash ? Number(cash) : total) : undefined, manualDiscount: md || undefined, customerName: customer || undefined },
      });
      setDone(o); setPay(false); setLines([]); setCash(''); setDiscount(''); setCustomer(''); setMult(1);
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Bán tại quầy', headerRight: () => lines.length ? <Pressable onPress={async () => { if (await confirmAsync('Xoá hoá đơn đang bán?', '', 'Xoá', true)) setLines([]); }}><Text style={{ color: C.red, fontWeight: '700' }}>Làm mới</Text></Pressable> : null }} />
      <View style={{ padding: 16, gap: 10, backgroundColor: C.white }}>
        <StaffSearch onPick={(v) => add(v, mult)} onScanPress={() => setScan(true)} />
        <Row gap={6}><T variant="muted">SL mỗi lần quét:</T>{[1, 2, 3, 5, 10].map((n) => <Chip key={n} label={`×${n}`} active={mult === n} onPress={() => setMult(n)} />)}</Row>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 160 + insets.bottom }}>
        <Pressable onPress={() => setShowQuick(!showQuick)}><Row style={{ justifyContent: 'space-between' }}><T variant="h3">Chọn nhanh ({quick.length})</T><Ionicons name={showQuick ? 'chevron-up' : 'chevron-down'} size={20} color={C.muted} /></Row></Pressable>
        {showQuick && (
          <View style={{ gap: 8 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              <Chip label="Tất cả" active={cat === null} onPress={() => setCat(null)} />
              {cats.map((c) => <Chip key={c.id} label={c.name} active={cat === c.id} onPress={() => setCat(c.id)} />)}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {quick.filter((v) => cat === null || (v.product as any).categoryId === cat).map((v) => (
                <Pressable key={v.id} disabled={v.stock <= 0} onPress={() => add(v, mult)} style={({ pressed }) => [{ width: 118, backgroundColor: C.white, borderRadius: R.md, padding: 8, borderWidth: 1, borderColor: C.line, opacity: v.stock <= 0 ? 0.4 : 1 }, pressed && { borderColor: C.brand600 }]}>
                  <Image source={{ uri: v.image || v.product.thumbnail || undefined }} style={{ width: '100%', height: 64, borderRadius: 8, backgroundColor: C.line2 }} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: C.ink, marginTop: 4 }} numberOfLines={1}>{v.product.name}</Text>
                  <Text style={{ fontSize: 11, color: C.muted }} numberOfLines={1}>{v.name}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: C.brand700 }}>{money(v.price)} <Text style={{ color: C.faint, fontWeight: '400' }}>· {v.stock}</Text></Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
        {!lines.length && <Empty icon="scan-outline" text="Quét mã hoặc chọn nhanh để bắt đầu bán hàng"><Button testID="start-scan" title="Mở camera quét" icon="scan-outline" onPress={() => setScan(true)} /></Empty>}
        {lines.map((l) => (
          <Card key={l.v.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 }}>
            <Image source={{ uri: l.v.image || l.v.product.thumbnail || undefined }} style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: C.line2 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: C.ink }} numberOfLines={1}>{l.v.product.name}</Text>
              <T variant="muted" numberOfLines={1}>{l.v.name} · {money(l.v.price)}</T>
              <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
                <QtyStepper size="sm" value={l.qty} max={l.v.stock} min={0} onChange={(q) => setLines((ls) => (q <= 0 ? ls.filter((x) => x.v.id !== l.v.id) : ls.map((x) => (x.v.id === l.v.id ? { ...x, qty: q } : x))))} />
                <Text style={{ fontWeight: '800' }}>{money(l.v.price * l.qty)}</Text>
              </Row>
            </View>
          </Card>
        ))}
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.line, padding: 16, paddingBottom: 16 + insets.bottom, gap: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}><T>{count} sản phẩm</T><Text testID="pos-total" style={{ fontSize: 24, fontWeight: '800', color: C.brand700 }}>{money(total)}</Text></Row>
        <Row>
          <Button title="Quét" icon="scan-outline" variant="soft" size="lg" onPress={() => setScan(true)} style={{ flex: 1 }} />
          <Button testID="pos-pay" title="Thanh toán" icon="cash-outline" size="lg" disabled={!lines.length} onPress={() => setPay(true)} style={{ flex: 2 }} />
        </Row>
      </View>

      <Scanner visible={scan} onClose={() => setScan(false)} onScan={onScan} continuous title={`Quét liên tục${mult > 1 ? ` · ×${mult}` : ''}`}
        footer={<View style={{ backgroundColor: 'rgba(255,255,255,.95)', borderRadius: R.md, padding: 12, flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontWeight: '700' }}>{count} SP</Text><Text style={{ fontWeight: '800', color: C.brand700, fontSize: 18 }}>{money(total)}</Text></View>} />

      <Modal visible={pay} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPay(false)}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Row style={{ justifyContent: 'space-between' }}><T variant="h2">Thanh toán</T><Pressable onPress={() => setPay(false)}><Ionicons name="close" size={26} color={C.ink} /></Pressable></Row>
          <Input label="Tên khách (tuỳ chọn)" value={customer} onChangeText={setCustomer} />
          <Input label="Giảm giá (₫)" value={discount} onChangeText={(v) => setDiscount(v.replace(/\D/g, ''))} keyboardType="number-pad" />
          <View style={{ backgroundColor: C.brand50, borderRadius: R.md, padding: 14 }}>
            <Row style={{ justifyContent: 'space-between' }}><T>Tạm tính</T><T>{money(subtotal)}</T></Row>
            {md > 0 && <Row style={{ justifyContent: 'space-between' }}><T style={{ color: C.red }}>Giảm giá</T><T style={{ color: C.red }}>-{money(md)}</T></Row>}
            <Row style={{ justifyContent: 'space-between' }}><T variant="h3">Khách cần trả</T><Text style={{ fontSize: 26, fontWeight: '800', color: C.brand700 }}>{money(total)}</Text></Row>
          </View>
          <Row><Button title="Tiền mặt" icon="cash-outline" variant={method === 'CASH' ? 'primary' : 'outline'} onPress={() => setMethod('CASH')} style={{ flex: 1 }} /><Button title="Chuyển khoản" icon="qr-code-outline" variant={method === 'BANK_TRANSFER' ? 'primary' : 'outline'} onPress={() => setMethod('BANK_TRANSFER')} style={{ flex: 1 }} /></Row>
          {method === 'CASH' ? (
            <>
              <Input testID="pos-cash" label="Tiền khách đưa" value={cash} onChangeText={(v) => setCash(v.replace(/\D/g, ''))} keyboardType="number-pad" />
              <Row style={{ flexWrap: 'wrap' }}>{cashSuggestions(total).map((s) => <Chip key={s} label={s.toLocaleString('vi-VN')} active={cash === String(s)} onPress={() => setCash(String(s))} />)}</Row>
              {!!cash && <View style={{ backgroundColor: change >= 0 ? C.brand50 : C.red50, borderRadius: R.md, padding: 12, flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontWeight: '700', color: change >= 0 ? C.brand800 : C.red }}>{change >= 0 ? 'Tiền thối lại' : 'Còn thiếu'}</Text><Text style={{ fontWeight: '800', fontSize: 18, color: change >= 0 ? C.brand800 : C.red }}>{money(Math.abs(change))}</Text></View>}
            </>
          ) : settings.bank.accountNo ? <Image source={{ uri: vietQrUrl(settings.bank, total, 'Thanh toan tai quay') }} style={{ width: 220, height: 220, alignSelf: 'center' }} contentFit="contain" /> : null}
          <Button testID="pos-confirm" title={`Xác nhận ${money(total)}`} size="lg" loading={busy} onPress={checkout} />
        </ScrollView>
      </Modal>

      <Modal visible={!!done} transparent animationType="fade" onRequestClose={() => setDone(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,.5)', justifyContent: 'center', padding: 24 }}>
          {done && (
            <Card style={{ gap: 12, alignItems: 'center', maxWidth: 420, width: '100%', alignSelf: 'center' }}>
              <Ionicons name="checkmark-circle" size={60} color={C.brand600} />
              <T variant="muted">Hoá đơn {done.code}</T>
              <Text testID="pos-done-total" style={{ fontSize: 30, fontWeight: '800', color: C.ink }}>{money(done.total)}</Text>
              {done.cashReceived != null && <T>Khách đưa {money(done.cashReceived)} · Thối <Text style={{ fontWeight: '800', color: C.brand700 }}>{money(done.cashReceived - done.total)}</Text></T>}
              <Button title="In bill K80" icon="print-outline" variant="outline" onPress={() => printInvoice(done, settings, 'k80')} style={{ alignSelf: 'stretch' }} />
              <Button testID="pos-next" title="Khách tiếp theo" onPress={() => { setDone(null); setScan(true); }} style={{ alignSelf: 'stretch' }} />
            </Card>
          )}
        </View>
      </Modal>
    </View>
  );
}
