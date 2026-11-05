import { Alert, Platform } from 'react-native';

/** Hộp thoại xác nhận chạy được cả điện thoại & web (Alert.alert có nút không hoạt động trên react-native-web) */
export function confirmAsync(title: string, message = '', ok = 'Đồng ý', destructive = false): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Huỷ', style: 'cancel', onPress: () => resolve(false) },
      { text: ok, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) }),
  );
}
