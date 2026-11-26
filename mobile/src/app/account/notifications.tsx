import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Empty, Loading, T } from '@/components/ui';
import { routeFromUrl, useNotifications } from '@/context/notifications';
import { api } from '@/lib/api';
import { dateTime } from '@/lib/format';
import { C } from '@/lib/theme';
import type { Paged } from '@/lib/types';

interface N { id: number; title: string; body: string; data?: { url?: string } | null; readAt: string | null; createdAt: string }

export default function Notifications() {
  const { refresh } = useNotifications();
  const [data, setData] = useState<N[] | null>(null);
  const load = useCallback(() => api<Paged<N>>('/notifications?limit=50').then((r) => setData(r.items)).catch(() => setData([])), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return (
    <>
      <Stack.Screen options={{ title: 'Thông báo', headerRight: () => <Pressable onPress={async () => { await api('/notifications/read-all', { method: 'PATCH' }); load(); refresh(); }}><Text style={{ color: C.brand700, fontWeight: '700' }}>Đọc hết</Text></Pressable> }} />
      {!data ? <Loading /> : (
        <FlatList data={data} keyExtractor={(n) => String(n.id)} contentContainerStyle={{ padding: 12, gap: 8 }}
          ListEmptyComponent={<Empty icon="notifications-outline" text="Chưa có thông báo" />}
          renderItem={({ item: n }) => (
            <Pressable onPress={async () => { if (!n.readAt) { await api(`/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {}); refresh(); load(); } routeFromUrl(n.data?.url); }}
              style={{ flexDirection: 'row', gap: 10, backgroundColor: n.readAt ? C.white : C.brand50, borderRadius: 14, padding: 14 }}>
              <View style={{ width: 9, height: 9, borderRadius: 5, marginTop: 6, backgroundColor: n.readAt ? 'transparent' : C.brand500 }} />
              <View style={{ flex: 1, gap: 2 }}><Text style={{ fontWeight: '700', color: C.ink }}>{n.title}</Text><T>{n.body}</T><T variant="muted">{dateTime(n.createdAt)}</T></View>
            </Pressable>
          )} />
      )}
    </>
  );
}
