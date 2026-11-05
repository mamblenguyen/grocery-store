import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** Lưu bí mật (token): Keychain/Keystore trên điện thoại; localStorage trên web (SecureStore không hỗ trợ web) */
export const secure = {
  get: async (k: string) => (Platform.OS === 'web' ? globalThis.localStorage?.getItem(k) ?? null : SecureStore.getItemAsync(k)),
  set: async (k: string, v: string) => (Platform.OS === 'web' ? globalThis.localStorage?.setItem(k, v) : SecureStore.setItemAsync(k, v)),
  del: async (k: string) => (Platform.OS === 'web' ? globalThis.localStorage?.removeItem(k) : SecureStore.deleteItemAsync(k)),
};

/** Lưu dữ liệu thường (giỏ hàng, hoá đơn chờ…) */
export const store = {
  async get<T>(k: string, fallback: T): Promise<T> {
    try { const v = await AsyncStorage.getItem(k); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
  },
  set: (k: string, v: unknown) => AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {}),
};
