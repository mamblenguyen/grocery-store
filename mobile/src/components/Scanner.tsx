import { Ionicons } from '@expo/vector-icons';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, R } from '@/lib/theme';
import { Button } from './ui';

const TYPES = ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'] as const;

/**
 * Màn hình quét mã toàn màn hình.
 * - continuous: quét liên tục (POS / phiếu kho), cùng mã trong 1,5s bị bỏ qua
 * - Có ô nhập tay mã / SKU khi mã bị mờ
 * - Đèn pin cho chỗ thiếu sáng
 */
export function Scanner({ visible, onClose, onScan, continuous = false, title = 'Quét mã vạch / QR', footer }: {
  visible: boolean; onClose: () => void; onScan: (code: string) => void | Promise<void>; continuous?: boolean; title?: string; footer?: React.ReactNode;
}) {
  const [perm, requestPerm] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [manual, setManual] = useState('');
  const [last, setLast] = useState('');
  const lastRef = useRef({ code: '', at: 0 });
  const busy = useRef(false);
  const insets = useSafeAreaInsets();

  const handle = async (code: string) => {
    const now = Date.now();
    if (!code || busy.current || (code === lastRef.current.code && now - lastRef.current.at < 1500)) return;
    lastRef.current = { code, at: now };
    busy.current = true;
    setLast(code);
    try { await onScan(code.trim()); } finally { busy.current = false; }
    if (!continuous) onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {!perm ? null : !perm.granted ? (
          <View style={st.center}>
            <Ionicons name="camera-outline" size={56} color="#cbd5e1" />
            <Text style={st.white}>Cần quyền truy cập camera để quét mã</Text>
            <Button title="Cho phép camera" onPress={requestPerm} />
          </View>
        ) : (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: [...TYPES] }}
            onBarcodeScanned={(r: BarcodeScanningResult) => handle(r.data)}
          />
        )}
        <View pointerEvents="none" style={st.frameWrap}><View style={st.frame} /></View>
        <View style={[st.top, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={onClose} style={st.iconBtn} accessibilityLabel="Đóng"><Ionicons name="close" size={24} color="#fff" /></Pressable>
          <Text style={st.title}>{title}</Text>
          <Pressable onPress={() => setTorch(!torch)} style={st.iconBtn} accessibilityLabel="Đèn pin"><Ionicons name="flashlight-outline" size={22} color={torch ? '#fde047' : '#fff'} /></Pressable>
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[st.bottom, { paddingBottom: insets.bottom + 12 }]}>
          {!!last && <Text style={st.last}>Vừa quét: {last}</Text>}
          {footer}
          <View style={st.manual}>
            <Ionicons name="keypad-outline" size={18} color={C.faint} />
            <TextInput testID="scanner-manual" value={manual} onChangeText={setManual} placeholder="Nhập mã / SKU bằng tay" placeholderTextColor={C.faint} autoCapitalize="characters"
              style={{ flex: 1, color: C.ink, fontSize: 15, paddingVertical: 10, outlineStyle: 'none' as any }} returnKeyType="done"
              onSubmitEditing={() => { if (manual.trim()) { lastRef.current = { code: '', at: 0 }; handle(manual.trim()); setManual(''); } }} />
          </View>
          {continuous && <Button title="Xong" onPress={onClose} />}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  white: { color: '#fff', fontSize: 16, textAlign: 'center' },
  frameWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  frame: { width: '78%', maxWidth: 340, aspectRatio: 1.5, borderWidth: 3, borderColor: C.brand500, borderRadius: 20 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8, backgroundColor: 'rgba(0,0,0,.35)', paddingBottom: 10 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: '#fff', fontWeight: '700', fontSize: 16, textAlign: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, gap: 10, backgroundColor: 'rgba(0,0,0,.45)' },
  last: { color: '#bbf7d0', textAlign: 'center', fontWeight: '600' },
  manual: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: R.md, paddingHorizontal: 12 },
});
