import { router } from 'expo-router';
import { StorePicker } from '@/components/StorePicker';

/** Đổi cửa hàng đang mua sắm */
export default function StoresScreen() {
  return <StorePicker onPicked={() => (router.canGoBack() ? router.back() : router.replace('/'))} />;
}
