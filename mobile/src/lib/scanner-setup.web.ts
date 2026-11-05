// Chỉ chạy trên web: expo-camera dùng BarcodeDetector của trình duyệt, nếu không có (Chrome Linux/Windows, Firefox, Safari cũ)
// sẽ dùng polyfill zxing-wasm. Mặc định polyfill tải WASM từ CDN → trỏ về file tự phục vụ trong public/.
import { setZXingModuleOverrides } from 'barcode-detector';

setZXingModuleOverrides({
  locateFile: (file: string, prefix: string) => (file.endsWith('.wasm') ? `${globalThis.location?.origin ?? ''}/zxing_reader.wasm` : prefix + file),
});
