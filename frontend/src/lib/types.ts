export type Role = 'ADMIN' | 'STAFF' | 'CUSTOMER';

export interface User {
  id: number; email: string; fullName: string; phone?: string | null; address?: string | null;
  role: Role; isActive: boolean; createdAt: string;
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
}

export interface ProductOption { id: number; name: string; position: number; values: { id: number; value: string }[] }

export interface Product {
  id: number; name: string; slug: string; description?: string | null; brand?: string | null; unit?: string | null;
  thumbnail?: string | null; images: string[]; isActive: boolean; isFeatured: boolean;
  minPrice: number; maxPrice: number; soldCount: number; categoryId?: number | null;
  category?: { id: number; name: string; slug: string } | null;
  options?: ProductOption[]; variants: Variant[]; totalStock?: number; related?: Product[]; updatedAt?: string;
}

export interface OrderItem {
  id: number; variantId?: number | null; productId?: number | null; productName: string; variantName: string;
  sku: string; image?: string | null; price: number; quantity: number; total: number;
}

export interface Order {
  id: number; code: string; customerName: string; phone: string; address: string; note?: string | null;
  status: string; paymentMethod: string; paymentStatus: string; subtotal: number; discount: number;
  shippingFee: number; total: number; couponCode?: string | null; cancelReason?: string | null;
  createdAt: string; updatedAt: string; items?: OrderItem[];
  user?: { id: number; email: string; fullName?: string } | null; _count?: { items: number };
}

export interface Coupon {
  id: number; code: string; description?: string | null; type: 'PERCENT' | 'FIXED'; value: number;
  minOrderValue: number; maxDiscount?: number | null; usageLimit?: number | null; usedCount: number;
  startsAt?: string | null; endsAt?: string | null; isActive: boolean;
}

export interface Paged<T> { items: T[]; total: number; page: number; limit: number; totalPages: number }
