import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Input, T } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useSettings } from '@/context/settings';
import { C, R } from '@/lib/theme';

export default function Login() {
  const { login } = useAuth();
  const { settings } = useSettings();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true); setError('');
    try {
      const u = await login(email, password);
      if (router.canDismiss()) router.dismiss();
      if (next) router.replace(next as any); else if (u.role === 'SHIPPER') router.replace('/deliver'); else if (u.role !== 'CUSTOMER') router.replace('/manage');
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 14, maxWidth: 480, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: 4, marginVertical: 12 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: C.brand700 }}>{settings.storeName}</Text>
          <T variant="muted">Chào mừng bạn quay lại! 👋</T>
        </View>
        {!!error && <View style={{ backgroundColor: C.red50, padding: 12, borderRadius: R.md }}><Text style={{ color: C.red }}>{error}</Text></View>}
        <Input testID="login-email" label="Email" icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Input testID="login-password" label="Mật khẩu" icon="key-outline" value={password} onChangeText={setPassword} secureTextEntry={!show} autoComplete="password" onSubmitEditing={submit} />
        <Pressable onPress={() => setShow(!show)}><Text style={{ color: C.muted }}>{show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</Text></Pressable>
        <Button testID="login-submit" title="Đăng nhập" size="lg" loading={loading} onPress={submit} />
        <Pressable onPress={() => router.push('/forgot-password')}><Text style={{ color: C.brand700, textAlign: 'center', fontWeight: '600' }}>Quên mật khẩu?</Text></Pressable>
        <Pressable onPress={() => router.replace(`/register${next ? `?next=${next}` : ''}`)}><Text style={{ textAlign: 'center', color: C.text }}>Chưa có tài khoản? <Text style={{ color: C.brand700, fontWeight: '700' }}>Đăng ký</Text></Text></Pressable>
        <View style={{ backgroundColor: C.line2, borderRadius: R.md, padding: 12, gap: 4 }}>
          <T variant="muted">Tài khoản demo (mật khẩu 123456):</T>
          <Pressable onPress={() => { setEmail('customer@grocery.local'); setPassword('123456'); }}><Text style={{ color: C.brand700 }}>• Khách: customer@grocery.local</Text></Pressable>
          <Pressable onPress={() => { setEmail('admin@grocery.local'); setPassword('123456'); }}><Text style={{ color: C.brand700 }}>• Quản trị: admin@grocery.local</Text></Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
