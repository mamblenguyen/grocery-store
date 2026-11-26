export interface Banner {
  image: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  link?: string;
}

/**
 * Phương pháp tính thuế GTGT của cửa hàng – quyết định loại hoá đơn:
 *  - KHAU_TRU : doanh nghiệp / HKD nộp thuế theo phương pháp khấu trừ → Hoá đơn GTGT (mẫu số 1), ghi thuế suất từng mặt hàng
 *  - TRUC_TIEP: HKD / doanh nghiệp tính thuế trực tiếp trên doanh thu (tỷ lệ %) → Hoá đơn bán hàng (mẫu số 2), KHÔNG ghi thuế suất
 *  - MIEN     : HKD doanh thu năm không quá ngưỡng không chịu thuế (NĐ 68/2026 sửa đổi bởi NĐ 141/2026) – chỉ thông báo doanh thu
 */
export type TaxMethod = 'KHAU_TRU' | 'TRUC_TIEP' | 'MIEN';
export interface TaxSettings {
  method: TaxMethod;
  /** Thuế suất mặc định cho sản phẩm chưa khai báo: "0" | "5" | "8" | "10" | "KCT" | "KKKNT" */
  defaultVatRate: string;
}
export interface EInvoiceSettings {
  /** Cho phép khách yêu cầu xuất hoá đơn điện tử khi đặt hàng */
  enabled: boolean;
  /** Tổ chức cung cấp dịch vụ HĐĐT mà cửa hàng đã ký hợp đồng (VNPT, Viettel, MISA, BKAV…) */
  provider: string;
  /** Mẫu số: "1" (HĐ GTGT) hoặc "2" (HĐ bán hàng) */
  templateCode: string;
  /** Ký hiệu hoá đơn đã đăng ký với cơ quan thuế, vd "C26MAA" */
  series: string;
  /** Trang tra cứu hoá đơn của nhà cung cấp */
  lookupUrl: string;
}

export interface StoreSettings {
  // Thông tin cửa hàng
  storeName: string;
  slogan: string;
  logo: string;
  hotline: string;
  email: string;
  address: string;
  openingHours: string;
  announcement: string;
  // Hoá đơn & thuế
  taxCode: string;
  tax: TaxSettings;
  einvoice: EInvoiceSettings;
  invoiceFooter: string;
  // Giao hàng
  /** DISTANCE = theo km (biểu phí của sàn) · FIXED = phí cố định của cửa hàng */
  shippingMode: 'DISTANCE' | 'FIXED';
  /** Phí cố định – dùng khi chọn FIXED, hoặc khi cửa hàng chưa ghim vị trí */
  shippingFee: number;
  freeShippingThreshold: number;
  minOrderValue: number;
  deliverySlots: string[];
  deliveryDaysAhead: number;
  // Thanh toán
  payment: { cod: boolean; bankTransfer: boolean; vnpay: boolean };
  bank: { bankBin: string; bankName: string; accountNo: string; accountName: string };
  // Giao diện
  banners: Banner[];
  social: { facebook: string; zalo: string; tiktok: string; youtube: string };
}

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'Tạp Hoá Xanh',
  slogan: 'Đi chợ online – Tươi ngon mỗi ngày',
  logo: '',
  hotline: '',
  email: '',
  address: '',
  openingHours: '07:00 – 22:00 (cả tuần)',
  announcement: '🚚 Miễn phí giao hàng cho đơn từ 300.000₫ · Giao nhanh trong 2 giờ',
  taxCode: '',
  tax: { method: 'TRUC_TIEP', defaultVatRate: '8' },
  einvoice: { enabled: false, provider: '', templateCode: '2', series: '', lookupUrl: '' },
  invoiceFooter: 'Cảm ơn quý khách đã mua sắm! Hàng đã mua được đổi trả trong 7 ngày kèm hoá đơn.',
  shippingMode: 'DISTANCE',
  shippingFee: 20000,
  freeShippingThreshold: 300000,
  minOrderValue: 0,
  deliverySlots: ['08:00 – 10:00', '10:00 – 12:00', '14:00 – 16:00', '16:00 – 18:00', '18:00 – 20:00'],
  deliveryDaysAhead: 3,
  // Chuyển khoản tắt cho tới khi cửa hàng nhập tài khoản ngân hàng của chính mình
  payment: { cod: true, bankTransfer: false, vnpay: true },
  bank: { bankBin: '970436', bankName: 'Vietcombank', accountNo: '', accountName: '' },
  banners: [
    {
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1600&q=80',
      title: 'Rau củ tươi mỗi sáng',
      subtitle: 'Thu hoạch trong ngày, giao tận nhà trong 2 giờ',
      buttonText: 'Mua ngay',
      link: '/products?category=rau-cu-trai-cay',
    },
    {
      image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1600&q=80',
      title: 'Giảm đến 20% đồ dùng thiết yếu',
      subtitle: 'Nhập mã WELCOME10 cho đơn hàng đầu tiên',
      buttonText: 'Xem ưu đãi',
      link: '/products?sort=best_selling',
    },
  ],
  social: { facebook: '', zalo: '', tiktok: '', youtube: '' },
};
