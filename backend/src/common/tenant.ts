import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StoreStatus } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Ngữ cảnh cửa hàng (tenant) của request hiện tại.
 * - Khách / storefront: xác định qua header `X-Store: <slug>` (middleware)
 * - ADMIN / STAFF: luôn là cửa hàng của tài khoản (AuthGuard ghi đè, không tin header)
 * - SUPER_ADMIN: chọn cửa hàng để quản trị hộ qua header `X-Store-Id`
 */
export interface StoreInfo {
  id: number;
  slug: string;
  name: string;
  status: StoreStatus;
  planExpiresAt: Date | null;
}
export interface TenantCtx {
  storeId?: number;
  store?: StoreInfo;
  /** Lý do không dùng được cửa hàng (không tồn tại / tạm khoá) – báo khi service cần storeId */
  storeError?: string;
  /** Super admin xem dữ liệu của TẤT CẢ đối tác (header X-Store-Id: all) */
  allStores?: boolean;
}

export const tenantAls = new AsyncLocalStorage<TenantCtx>();
export const tenant = (): TenantCtx => tenantAls.getStore() ?? {};

/** storeId bắt buộc của request; ném lỗi rõ ràng nếu chưa xác định / cửa hàng không hoạt động */
export function storeId(): number {
  const t = tenant();
  if (t.storeId) return t.storeId;
  if (t.allStores) throw new BadRequestException('Chức năng này cần chọn một đối tác cụ thể ở bộ lọc "Đối tác" phía trên');
  if (t.storeError) throw new NotFoundException(t.storeError);
  throw new ForbiddenException('Chưa xác định cửa hàng (thiếu header X-Store)');
}

export const optionalStoreId = (): number | undefined => tenant().storeId;

export const isExpired = (s: Pick<StoreInfo, 'planExpiresAt'>) => !!s.planExpiresAt && s.planExpiresAt.getTime() < Date.now();

/**
 * Điều kiện lọc theo cửa hàng cho truy vấn ĐỌC / thao tác theo id:
 * - bình thường: { storeId } của cửa hàng hiện tại
 * - super admin chế độ "Tất cả đối tác": {} (không giới hạn)
 */
export function scope(): { storeId?: number } {
  return tenant().allStores ? {} : { storeId: storeId() };
}
export const isAllStores = () => !!tenant().allStores;
