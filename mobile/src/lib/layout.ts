import { useWindowDimensions } from 'react-native';

/** Số cột lưới sản phẩm & bề rộng thẻ theo kích thước màn hình (điện thoại → tablet) */
export function useGrid(padding = 16, gap = 12) {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 1200);
  const cols = w < 380 ? 2 : w < 640 ? 2 : w < 900 ? 3 : 4;
  const item = Math.floor((w - padding * 2 - gap * (cols - 1)) / cols);
  return { cols, item, gap, width: w, isTablet: width >= 768 };
}
