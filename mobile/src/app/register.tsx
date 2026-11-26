import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { C, R } from '@/lib/theme';

export default function Register() {
  const { register } = useAuth();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [f, setF] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (f.password !== f.confirm) return setError('Mật khẩu nhập lại không khớp');
    setLoading(true); setError('');
    try { const { confirm, ...data } = f; await register({ ...data, phone: data.phone || undefined }); if (router.canDismiss()) router.dismiss(); if (next) router.replace(next as any); }
    catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 12, maxWidth: 480, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        {!!error && <View style={{ backgroundColor: C.red50, padding: 12, borderRadius: R.md }}><Text style={{ color: C.red }}>{error}</Text></View>}
        <Input label="Họ và tên" value={f.fullName} onChangeText={(v) => setF({ ...f, fullName: v })} autoComplete="name" />
        <Input label="Email" value={f.email} onChangeText={(v) => setF({ ...f, email: v })} autoCapitalize="none" keyboardType="email-address" />
        <Input label="Số điện thoại" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} keyboardType="phone-pad" />
        <Input label="Mật khẩu (≥ 6 ký tự)" value={f.password} onChangeText={(v) => setF({ ...f, password: v })} secureTextEntry />
        <Input label="Nhập lại mật khẩu" value={f.confirm} onChangeText={(v) => setF({ ...f, confirm: v })} secureTextEntry onSubmitEditing={submit} />
        <Button title="Tạo tài khoản" size="lg" loading={loading} onPress={submit} />
        <Pressable onPress={() => router.replace('/login')}><Text style={{ textAlign: 'center' }}>Đã có tài khoản? <Text style={{ color: C.brand700, fontWeight: '700' }}>Đăng nhập</Text></Text></Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
