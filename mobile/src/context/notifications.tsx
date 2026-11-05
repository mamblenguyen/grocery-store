import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { api } from '@/lib/api';
import { useAuth } from './auth';

if (Platform.OS !== 'web')
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }),
  });

/** Chuyển url từ server (dạng web) sang màn hình trong app */
export function routeFromUrl(url?: string) {
  if (!url) return;
  const admin = url.match(/^\/admin\/orders\/(\d+)/);
  const mine = url.match(/^\/orders\/(\d+)/);
  if (admin) router.push(`/staff/orders/${admin[1]}`);
  else if (mine) router.push(`/orders/${mine[1]}`);
}

/** Đăng ký nhận push (chỉ trên điện thoại thật, cần projectId của EAS trong app.json) */
async function registerPush(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  const projectId = (Constants.expoConfig?.extra as any)?.eas?.projectId || (Constants as any).easConfig?.projectId;
  if (!projectId) { console.log('[push] Chưa cấu hình extra.eas.projectId → bỏ qua đăng ký push'); return null; }
  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync('default', { name: 'Thông báo đơn hàng', importance: Notifications.AndroidImportance.HIGH });
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return null;
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

const Ctx = createContext<{ unread: number; refresh: () => void }>({ unread: 0, refresh: () => {} });

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const tokenRef = useRef<string | null>(null);

  const refresh = useCallback(() => {
    if (!user) return setUnread(0);
    api<{ unread: number }>('/notifications/unread-count').then((r) => setUnread(r.unread)).catch(() => {});
  }, [user]);

  useEffect(() => {
    refresh();
    if (!user) return;
    const t = setInterval(refresh, 60_000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    registerPush()
      .then((token) => { if (token) { tokenRef.current = token; return api('/notifications/push-token', { method: 'POST', json: { token, platform: Platform.OS } }); } })
      .catch((e) => console.log('[push]', e?.message));
    return () => { clearInterval(t); sub.remove(); };
  }, [user, refresh]);

  // Bấm vào thông báo đẩy → mở đúng màn hình
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      routeFromUrl((r.notification.request.content.data as any)?.url);
      refresh();
    });
    const recv = Notifications.addNotificationReceivedListener(() => refresh());
    return () => { sub.remove(); recv.remove(); };
  }, [refresh]);

  return <Ctx.Provider value={{ unread, refresh }}>{children}</Ctx.Provider>;
}
export const useNotifications = () => useContext(Ctx);
