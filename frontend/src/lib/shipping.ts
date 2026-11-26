/** Kết quả tính phí ship trả về từ /orders/preview */
export interface ShippingInfo {
  mode: 'DISTANCE' | 'FIXED';
  km: number | null;
  /** Phí theo biểu phí / cố định, chưa trừ miễn phí ship */
  fee: number;
  needPin: boolean;
  outOfRange: boolean;
  freeShip: boolean;
  note: string;
}
