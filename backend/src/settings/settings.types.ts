export interface Banner {
  image: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  link?: string;
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
  // Hoá đơn
  taxCode: string;
  /** % VAT đã bao gồm trong giá bán (0 = không tách thuế trên hoá đơn) */
  vatRate: number;
  invoiceFooter: string;
  // Giao hàng
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
  vatRate: 8,
  invoiceFooter: 'Cảm ơn quý khách đã mua sắm! Hàng đã mua được đổi trả trong 7 ngày kèm hoá đơn.',
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
