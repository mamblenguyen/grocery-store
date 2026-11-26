import { distanceKm } from './geo';

/**
 * Biểu phí giao hàng theo quãng đường – cấu hình cấp sàn (Super admin → Cấu hình sàn → Phí giao hàng).
 * Khoảng cách = đường chim bay (haversine) × hệ số đường đi, vì đường thực tế luôn dài hơn đường thẳng.
 */
export interface DeliveryTariff {
  /** Tắt → mọi cửa hàng dùng phí cố định của cửa hàng */
  enabled: boolean;
  /** Hệ số quy đổi đường chim bay → đường đi thực tế (thường 1,2–1,4 trong nội thành) */
  roadFactor: number;
  /** Số km đầu tính giá mở cửa */
  baseKm: number;
  /** Giá mở cửa (đồng) cho baseKm đầu */
  baseFee: number;
  /** Mỗi km tiếp theo (đồng/km, tính tròn lên từng km) */
  perKm: number;
  /** Phí tối đa (0 = không giới hạn) */
  maxFee: number;
  /** Bán kính giao tối đa (km đường đi, 0 = không giới hạn) – xa hơn thì không nhận đơn */
  maxDistanceKm: number;
  /** Làm tròn lên tới bội số (đồng) */
  roundTo: number;
  /** Tài xế nhận bao nhiêu % phí giao theo biểu phí (100 = toàn bộ) */
  shipperSharePercent: number;
  /** Thu nhập tối thiểu của tài xế mỗi chuyến */
  shipperMinFee: number;
}

/** Giá trị mặc định – tạm dùng cho tới khi super admin khai báo trong CMS */
export function defaultTariff(): DeliveryTariff {
  return {
    enabled: true, roadFactor: 1.3, baseKm: 2, baseFee: 15000, perKm: 5000, maxFee: 0, maxDistanceKm: 15, roundTo: 1000,
    shipperSharePercent: 100, shipperMinFee: Number(process.env.SHIPPER_MIN_FEE ?? 15000),
  };
}

const roundUp = (n: number, step: number) => (step > 1 ? Math.ceil(n / step) * step : Math.ceil(n));

/** Quãng đường ước tính (km, 1 chữ số thập phân) từ toạ độ cửa hàng tới điểm giao */
export function roadKm(from: { lat?: number | null; lng?: number | null } | null, to: { lat?: number | null; lng?: number | null } | null, t: DeliveryTariff) {
  const d = distanceKm(from, to);
  return d == null ? null : Math.round(d * t.roadFactor * 10) / 10;
}

/** Phí giao theo biểu phí cho quãng đường km */
export function tariffFee(km: number, t: DeliveryTariff) {
  const extraKm = Math.max(0, Math.ceil(km - t.baseKm - 1e-9));
  let fee = roundUp(t.baseFee + extraKm * t.perKm, t.roundTo);
  if (t.maxFee > 0) fee = Math.min(fee, t.maxFee);
  return fee;
}

/** Thu nhập tài xế cho chuyến dài km (không phụ thuộc khách có được miễn phí ship hay không) */
export function shipperPay(km: number | null, fallbackFee: number, t: DeliveryTariff) {
  const base = km != null && t.enabled ? roundUp((tariffFee(km, t) * t.shipperSharePercent) / 100, t.roundTo) : fallbackFee;
  return Math.max(base, t.shipperMinFee);
}

export type ShippingMode = 'DISTANCE' | 'FIXED';

export interface ShippingQuote {
  /** Cách tính thực tế đã áp dụng */
  mode: ShippingMode;
  /** Quãng đường ước tính (km), null nếu thiếu vị trí */
  km: number | null;
  /** Phí theo biểu phí / phí cố định – CHƯA trừ miễn phí ship */
  fee: number;
  /** Cần khách ghim vị trí để tính đúng phí (cửa hàng tính theo km nhưng khách chưa ghim) */
  needPin: boolean;
  /** Ngoài bán kính giao hàng */
  outOfRange: boolean;
  /** Ghi chú hiển thị cho khách */
  note: string;
}

/** Tính phí ship cho 1 đơn: theo km nếu cửa hàng chọn & đủ toạ độ, ngược lại phí cố định của cửa hàng */
export function quoteShipping(input: {
  store: { lat?: number | null; lng?: number | null } | null;
  dropoff: { lat?: number | null; lng?: number | null } | null;
  mode: ShippingMode;
  fixedFee: number;
  tariff: DeliveryTariff;
}): ShippingQuote {
  const { tariff: t } = input;
  const storePinned = input.store?.lat != null && input.store?.lng != null;
  const distance = t.enabled && input.mode === 'DISTANCE' && storePinned;
  const km = storePinned ? roadKm(input.store, input.dropoff, t) : null;
  if (!distance) return { mode: 'FIXED', km, fee: input.fixedFee, needPin: false, outOfRange: false, note: 'Phí giao cố định của cửa hàng' };
  if (km == null)
    return { mode: 'DISTANCE', km: null, fee: input.fixedFee, needPin: true, outOfRange: false, note: 'Ghim vị trí giao hàng để tính phí theo quãng đường' };
  const outOfRange = t.maxDistanceKm > 0 && km > t.maxDistanceKm;
  return {
    mode: 'DISTANCE', km, fee: tariffFee(km, t), needPin: false, outOfRange,
    note: outOfRange ? `Ngoài bán kính giao hàng ${t.maxDistanceKm} km (khoảng ${km} km)` : `Khoảng ${km} km`,
  };
}
