import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from '@/components/Toast';
import { Badge, Button, Card, Chip, Empty, Input, Loading, Row, T } from '@/components/ui';
import { api } from '@/lib/api';
import { confirmAsync } from '@/lib/confirm';
import { C } from '@/lib/theme';
import type { Address } from '@/lib/types';

const empty = { label: '', fullName: '', phone: '', address: '', isDefault: false };

export default function Addresses() {
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<Address[] | null>(null);
  const [editing, setEditing] = useState<Address | null>(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(empty);
  const load = useCallback(() => api<Address[]>('/addresses').then(setList).catch(() => setList([])), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const save = async () => {
    try { await api(editing ? `/addresses/${editing.id}` : '/addresses', { method: editing ? 'PATCH' : 'POST', json: { ...f, label: f.label || undefined } }); toast('Đã lưu địa chỉ'); setOpen(false); load(); }
    catch (e: any) { toast(e.message, 'error'); }
  };
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Sổ địa chỉ' }} />
      {!list ? <Loading /> : (
        <FlatList data={list} keyExtractor={(a) => String(a.id)} contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
          ListEmptyComponent={<Empty icon="location-outline" text="Chưa có địa chỉ nào" />}
          renderItem={({ item: a }) => (
            <Card style={{ gap: 6, borderColor: a.isDefault ? C.brand200 : '#eef2f6', borderWidth: a.isDefault ? 2 : 1 }}>
              <Row style={{ justifyContent: 'space-between' }}><Text style={{ fontWeight: '700', color: C.ink }}>{a.fullName} · {a.phone}</Text>{a.isDefault && <Badge label="Mặc định" />}</Row>
              <T variant="muted">{a.label ? `${a.label}: ` : ''}{a.address}</T>
              <Row gap={16}>
                <Pressable onPress={() => { setEditing(a); setF({ label: a.label ?? '', fullName: a.fullName, phone: a.phone, address: a.address, isDefault: a.isDefault }); setOpen(true); }}><Text style={{ color: C.brand700, fontWeight: '600' }}>Sửa</Text></Pressable>
                {!a.isDefault && <Pressable onPress={async () => { await api(`/addresses/${a.id}`, { method: 'PATCH', json: { fullName: a.fullName, phone: a.phone, address: a.address, label: a.label ?? undefined, isDefault: true } }); load(); }}><Text style={{ color: C.brand700, fontWeight: '600' }}>Đặt mặc định</Text></Pressable>}
                <Pressable onPress={async () => { if (await confirmAsync('Xoá địa chỉ này?', '', 'Xoá', true)) { await api(`/addresses/${a.id}`, { method: 'DELETE' }); load(); } }}><Text style={{ color: C.red, fontWeight: '600' }}>Xoá</Text></Pressable>
              </Row>
            </Card>
          )} />
      )}
      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16 + insets.bottom }}><Button title="Thêm địa chỉ" icon="add" onPress={() => { setEditing(null); setF(empty); setOpen(true); }} /></View>
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingTop: 24 }} keyboardShouldPersistTaps="handled">
          <T variant="h2">{editing ? 'Sửa địa chỉ' : 'Thêm địa chỉ'}</T>
          <Input label="Họ tên" value={f.fullName} onChangeText={(v) => setF({ ...f, fullName: v })} />
          <Input label="Số điện thoại" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} keyboardType="phone-pad" />
          <Input label="Địa chỉ" value={f.address} onChangeText={(v) => setF({ ...f, address: v })} multiline />
          <Row style={{ flexWrap: 'wrap' }}>{['Nhà riêng', 'Công ty', 'Nhà bố mẹ'].map((l) => <Chip key={l} label={l} active={f.label === l} onPress={() => setF({ ...f, label: l })} />)}</Row>
          <Chip label="Đặt làm mặc định" icon={f.isDefault ? 'checkmark-circle' : 'ellipse-outline'} active={f.isDefault} onPress={() => setF({ ...f, isDefault: !f.isDefault })} />
          <Row><Button title="Huỷ" variant="outline" onPress={() => setOpen(false)} style={{ flex: 1 }} /><Button title="Lưu" onPress={save} style={{ flex: 1 }} /></Row>
        </ScrollView>
      </Modal>
    </View>
  );
}
