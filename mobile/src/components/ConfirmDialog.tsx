import { Ionicons } from '@expo/vector-icons';
import { createContext, useCallback, useContext, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { C, R, shadow } from '@/lib/theme';

type Options = { title: string; message?: string; confirmText?: string; destructive?: boolean };
type Request = Options & { resolve: (value: boolean) => void };
const Ctx = createContext<(options: Options) => Promise<boolean>>(async () => false);
let globalAsk: ((options: Options) => Promise<boolean>) | null = null;

export function confirmAsync(title: string, message = '', confirmText = 'Xác nhận', destructive = false) {
  return globalAsk?.({ title, message, confirmText, destructive }) ?? Promise.resolve(false);
}

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);
  const ask = useCallback((options: Options) => new Promise<boolean>((resolve) => setRequest({ ...options, resolve })), []);
  globalAsk = ask;
  const close = useCallback((result: boolean) => {
    setRequest((current) => { current?.resolve(result); return null; });
  }, []);

  return (
    <Ctx.Provider value={ask}>
      {children}
      <Modal visible={!!request} transparent animationType="fade" statusBarTranslucent onRequestClose={() => close(false)}>
        <Pressable accessibilityRole="button" accessibilityLabel="Đóng hộp thoại" onPress={() => close(false)}
          style={{ flex: 1, backgroundColor: 'rgba(15,23,42,.5)', justifyContent: 'center', padding: 20 }}>
          <Pressable accessibilityRole="alert" onPress={(e) => e.stopPropagation()} style={[{ width: '100%', maxWidth: 440, alignSelf: 'center', borderRadius: R.xl, backgroundColor: C.white, padding: 20, gap: 16 }, shadow]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: request?.destructive ? C.red50 : C.brand50 }}>
                <Ionicons name={request?.destructive ? 'warning-outline' : 'help-circle-outline'} size={24} color={request?.destructive ? C.red : C.brand700} />
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={{ color: C.ink, fontSize: 18, fontWeight: '800' }}>{request?.title}</Text>
                {!!request?.message && <Text style={{ color: C.muted, fontSize: 14, lineHeight: 21 }}>{request.message}</Text>}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable accessibilityRole="button" onPress={() => close(false)} style={{ flex: 1, height: 46, borderRadius: R.md, borderWidth: 1.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: C.ink, fontWeight: '700' }}>Huỷ</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => close(true)} style={{ flex: 1, height: 46, borderRadius: R.md, backgroundColor: request?.destructive ? C.red : C.brand600, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: C.white, fontWeight: '800' }}>{request?.confirmText ?? 'Xác nhận'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Ctx.Provider>
  );
}

export const useConfirm = () => useContext(Ctx);
