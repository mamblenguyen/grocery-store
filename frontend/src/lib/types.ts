export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | 'CUSTOMER';
export type StoreStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED';

export interface StoreRef { id: number; slug: string; name: string }

export interface Plan {
  id: number; code: string; name: string; description?: string | null; priceMonthly: number;
  maxProducts: number | null; maxStaff: number | null; isActive: boolean; sortOrder: number; _count?: { stores: number };
}

/** Cửa hàng của tài khoản quản trị (trả về trong /auth/me) */
export interface MyStore extends StoreRef {
  status: StoreStatus; logo?: string | null; planExpiresAt: string | null; daysLeft: number | null;
  plan: { id: number; name: string; maxProducts: number | null; maxStaff: number | null } | null;
}

/** Cửa hàng trong danh bạ công khai */
export interface PublicStore extends StoreRef {
  logo?: string | null; address?: string | null; hotline?: string | null; slogan?: string; openingHours?: string;
  banner?: string | null; productCount: number; acceptingOrders: boolean;
}

export interface User {
  id: number; email: string; fullName: string; phone?: string | null; address?: string | null;
  role: Role; isActive: boolean; createdAt: string; store?: MyStore | null;
}

export interface Category {
  id: number; name: string; slug: string; description?: string | null; image?: string | null;
  sortOrder: number; isActive: boolean; parentId?: number | null;
  parent?: { id: number; name: string } | null; _count?: { products: number };
}

export interface Variant {
  id: number; sku: string; barcode?: string | null; name: string; price: number;
  compareAtPrice?: number | null; costPrice?: number | null; stock: number; lowStockThreshold: number;
  image?: string | null; isActive: boolean; optionValueIds?: number[]; options?: Record<string, string>;
  product?: { id: number; name: string; unit?: string | null; thumbnail?: string | null; isActive?: boolean };
}

export interface ProductOption { id: number; name: string; position: number; values: { id: number; value: string }[] }

export interface Product {
  id: number; name: string; slug: string; description?: string | null; brand?: string | null; unit?: string | null;
  thumbnail?: string | null; images: string[]; isActive: boolean; isFeatured: boolean;
  minPrice: number; maxPrice: number; soldCount: number; ratingAvg: number; ratingCount: number; categoryId?: number | null;
  category?: { id: number; name: string; slug: string } | null;
  options?: ProductOption[]; variants: Variant[]; totalStock?: number; related?: Product[]; updatedAt?: string;
  store?: StoreRef;
}

export interface OrderItem {
  id: number; variantId?: number | null; productId?: number | null; productName: string; variantName: string;
  sku: string; image?: string | null; price: number; quantity: number; total: number;
}

export interface PaymentTransaction {
  id: number; provider: string; amount: number; status: 'PENDING' | 'SUCCESS' | 'FAILED'; txnRef: string;
  transactionNo?: string | null; bankCode?: string | null; responseCode?: string | null; message?: string | null; createdAt: string;
}

export interface Order {
  id: number; code: string; customerName: string; phone: string; address: string; note?: string | null;
  status: string; paymentMethod: string; paymentStatus: string; subtotal: number; discount: number;
  shippingFee: number; total: number; couponCode?: string | null; cancelReason?: string | null;
  channel: 'ONLINE' | 'POS'; deliveryDate?: string | null; deliverySlot?: string | null; paidAt?: string | null;
  cashReceived?: number | null;
  createdAt: string; updatedAt: string; items?: OrderItem[]; payments?: PaymentTransaction[];
  user?: { id: number; email: string; fullName?: string } | null; createdBy?: { id: number; fullName: string } | null;
  _count?: { items: number }; storeId?: number; store?: StoreRef;
}

export interface Coupon {
  id: number; code: string; description?: string | null; type: 'PERCENT' | 'FIXED'; value: number;
  minOrderValue: number; maxDiscount?: number | null; usageLimit?: number | null; usedCount: number;
  startsAt?: string | null; endsAt?: string | null; isActive: boolean;
}

export interface Banner { image: string; title?: string; subtitle?: string; buttonText?: string; link?: string }

export interface StoreSettings {
  storeName: string; slogan: string; logo: string; hotline: string; email: string; address: string;
  openingHours: string; announcement: string; taxCode: string; vatRate: number; invoiceFooter: string;
  shippingFee: number; freeShippingThreshold: number; minOrderValue: number;
  deliverySlots: string[]; deliveryDaysAhead: number;
  payment: { cod: boolean; bankTransfer: boolean; vnpay: boolean };
  bank: { bankBin: string; bankName: string; accountNo: string; accountName: string };
  banners: Banner[];
  social: { facebook: string; zalo: string; tiktok: string; youtube: string };
  vnpayConfigured?: boolean;
}

export interface Review {
  id: number; rating: number; comment?: string | null; isVisible: boolean; createdAt: string;
  user: { id: number; fullName: string; email?: string };
  product?: { id: number; name: string; slug: string; thumbnail?: string | null };
}

export interface Address {
  id: number; label?: string | null; fullName: string; phone: string; address: string; isDefault: boolean;
}

export interface Supplier {
  id: number; name: string; contactName?: string | null; phone?: string | null; email?: string | null;
  address?: string | null; taxCode?: string | null; note?: string | null; isActive: boolean; _count?: { documents: number };
}

export interface StockDocItem {
  id: number; variantId: number; quantity: number; systemQty?: number | null; unitCost: number; total: number;
  lotNo?: string | null; expiryDate?: string | null; note?: string | null;
  variant: Variant & { product: { id: number; name: string; unit?: string | null; thumbnail?: string | null } };
}

export interface StockDoc {
  store?: { id: number; name: string };
  id: number; code: string; type: 'IMPORT' | 'EXPORT' | 'STOCKTAKE'; status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
  supplier?: Supplier | null; supplierId?: number | null; reason?: string | null; invoiceNo?: string | null; note?: string | null;
  totalQuantity: number; totalAmount: number; createdAt: string; completedAt?: string | null; cancelledAt?: string | null;
  cancelReason?: string | null; createdBy?: { fullName: string } | null; completedBy?: { fullName: string } | null;
  items?: StockDocItem[]; _count?: { items: number };
}

export interface Paged<T> { items: T[]; total: number; page: number; limit: number; totalPages: number }

/** Danh mục gộp toàn sàn */
export interface MarketCategory { slug: string; name: string; image: string | null; productCount: number; stores: number }
