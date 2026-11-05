import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { toast } from '@/components/Toast';
import { Button, Input } from '@/components/ui';
import { api } from '@/lib/api';

export default function Password() {
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      <Stack.Screen options={{ title: 'Đổi mật khẩu' }} />
      <Input label="Mật khẩu hiện tại" value={f.currentPassword} onChangeText={(v) => setF({ ...f, currentPassword: v })} secureTextEntry />
      <Input label="Mật khẩu mới" value={f.newPassword} onChangeText={(v) => setF({ ...f, newPassword: v })} secureTextEntry />
      <Input label="Nhập lại mật khẩu mới" value={f.confirm} onChangeText={(v) => setF({ ...f, confirm: v })} secureTextEntry />
      <Button title="Đổi mật khẩu" loading={saving} onPress={async () => {
        if (f.newPassword !== f.confirm) return toast('Mật khẩu nhập lại không khớp', 'error');
        setSaving(true);
        try { await api('/auth/change-password', { method: 'PATCH', json: { currentPassword: f.currentPassword, newPassword: f.newPassword } }); toast('Đã đổi mật khẩu'); router.back(); }
        catch (e: any) { toast(e.message, 'error'); } finally { setSaving(false); }
      }} />
    </ScrollView>
  );
}
