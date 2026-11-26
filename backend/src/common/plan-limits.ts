import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { vnMonthStart } from './vn-time';

export type PlanLimit = 'products' | 'staff' | 'ordersMonthly' | 'campaignsMonthly';
export const LIMIT_KINDS: PlanLimit[] = ['products', 'staff', 'ordersMonthly', 'campaignsMonthly'];
export const LIMIT_LABEL: Record<PlanLimit, string> = {
  products: 'sản phẩm', staff: 'nhân viên', ordersMonthly: 'đơn hàng/tháng', campaignsMonthly: 'chiến dịch/tháng',
};
const PLAN_FIELD = {
  products: 'maxProducts', staff: 'maxStaff', ordersMonthly: 'maxOrdersMonthly', campaignsMonthly: 'maxCampaignsMonthly',
} as const;

/** Mã gói mặc định gán cho đối tác mới */
export const DEFAULT_PLAN_CODE = 'free';

/** Gói mặc định: gói mã "free", nếu không có thì gói 0đ đang bán có thứ tự nhỏ nhất */
export async function defaultPlan(prisma: PrismaService | Prisma.TransactionClient) {
  return (await prisma.plan.findUnique({ where: { code: DEFAULT_PLAN_CODE } }))
    ?? (await prisma.plan.findFirst({ where: { isActive: true, priceMonthly: 0 }, orderBy: { sortOrder: 'asc' } }));
}

/** Hạn mức mua thêm đang còn hiệu lực */
export const activeAddonWhere = (storeId: number, now = new Date()): Prisma.StorePurchaseWhereInput => ({
  storeId, type: 'ADDON', status: 'ACTIVE', OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
});

export interface LimitInfo { base: number | null; extra: number; max: number | null }

/** Hạn mức thực tế = hạn mức gói chính + tổng hạn mức mua thêm còn hiệu lực. Gói không giới hạn (null) → không giới hạn. */
export async function storeLimits(prisma: PrismaService, storeId: number) {
  const [store, addons] = await Promise.all([
    prisma.store.findUnique({ where: { id: storeId }, select: { plan: true } }),
    prisma.storePurchase.groupBy({ by: ['kind'], where: activeAddonWhere(storeId), _sum: { quantity: true } }),
  ]);
  const plan = store?.plan ?? null;
  const limits = {} as Record<PlanLimit, LimitInfo>;
  for (const k of LIMIT_KINDS) {
    const base = plan ? plan[PLAN_FIELD[k]] : null;
    const extra = addons.find((a) => a.kind === k)?._sum.quantity ?? 0;
    limits[k] = { base, extra, max: base == null ? null : base + extra };
  }
  return { plan, limits };
}

async function countUsage(prisma: PrismaService, storeId: number, kind: PlanLimit) {
  const monthStart = vnMonthStart();
  switch (kind) {
    case 'products': return prisma.product.count({ where: { storeId } });
    case 'staff': return Math.max(0, (await prisma.user.count({ where: { storeId } })) - 1);
    case 'ordersMonthly': return prisma.order.count({ where: { storeId, createdAt: { gte: monthStart } } });
    default: return prisma.marketingCampaign.count({ where: { storeId, createdAt: { gte: monthStart } } });
  }
}

/** Mức đã dùng (tháng tính theo giờ VN) */
export async function storeUsage(prisma: PrismaService, storeId: number) {
  const [products, staff, ordersMonthly, campaignsMonthly] = await Promise.all(LIMIT_KINDS.map((k) => countUsage(prisma, storeId, k)));
  return { products, staff, ordersMonthly, campaignsMonthly };
}

export async function assertPlanLimit(prisma: PrismaService, storeId: number, kind: PlanLimit) {
  const { plan, limits } = await storeLimits(prisma, storeId);
  const { max, extra } = limits[kind];
  if (!plan || max == null) return;
  const used = await countUsage(prisma, storeId, kind);
  if (used >= max)
    throw new ForbiddenException(
      `Đã đạt giới hạn ${max.toLocaleString('vi-VN')} ${LIMIT_LABEL[kind]} (gói "${plan.name}"${extra ? ` + ${extra.toLocaleString('vi-VN')} mua thêm` : ''}). ` +
      'Chủ cửa hàng vào Gói dịch vụ để mua thêm hạn mức hoặc nâng cấp gói.',
    );
}
