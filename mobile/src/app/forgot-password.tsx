import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button, Input, T } from '@/components/ui';
import { api } from '@/lib/api';
import { C, R } from '@/lib/theme';

export default function Forgot() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 14, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
      {sent ? (
        <View style={{ alignItems: 'center', gap: 12 }}>
          <Ionicons name="mail-open-outline" size={56} color={C.brand600} />
          <T style={{ textAlign: 'center' }}>{sent}</T>
          <T variant="muted" style={{ textAlign: 'center' }}>Mở email và bấm liên kết để đặt mật khẩu mới (hiệu lực 30 phút).</T>
          <Button title="Quay lại đăng nhập" onPress={() => router.back()} />
        </View>
      ) : (
        <>
          <T variant="muted">Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.</T>
          {!!error && <View style={{ backgroundColor: C.red50, padding: 12, borderRadius: R.md }}><Text style={{ color: C.red }}>{error}</Text></View>}
          <Input label="Email" icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Button title="Gửi liên kết" size="lg" loading={loading} onPress={async () => {
            setLoading(true); setError('');
            try { setSent((await api<{ message: string }>('/auth/forgot-password', { method: 'POST', json: { email } })).message); }
            catch (e: any) { setError(e.message); } finally { setLoading(false); }
          }} />
        </>
      )}
    </ScrollView>
  );
}
