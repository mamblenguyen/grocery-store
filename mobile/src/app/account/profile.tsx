import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { toast } from '@/components/Toast';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { api } from '@/lib/api';

export default function Profile() {
  const { user, refresh } = useAuth();
  const [f, setF] = useState({ fullName: '', phone: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (user) setF({ fullName: user.fullName, phone: user.phone ?? '' }); }, [user]);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      <Stack.Screen options={{ title: 'Thông tin cá nhân' }} />
      <Input label="Email" value={user?.email} editable={false} />
      <Input label="Họ tên" value={f.fullName} onChangeText={(v) => setF({ ...f, fullName: v })} />
      <Input label="Số điện thoại" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} keyboardType="phone-pad" />
      <Button title="Lưu thay đổi" loading={saving} onPress={async () => { setSaving(true); try { await api('/auth/me', { method: 'PATCH', json: f }); await refresh(); toast('Đã cập nhật'); } catch (e: any) { toast(e.message, 'error'); } finally { setSaving(false); } }} />
    </ScrollView>
  );
}
