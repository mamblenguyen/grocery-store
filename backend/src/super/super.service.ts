import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role, StoreStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { clearStoreCache } from '../common/tenant.middleware';
import { paged, paginate, slugify } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

/** Slug không được dùng vì trùng đường dẫn hệ thống */
const RESERVED = new Set(['admin', 'super', 'api', 's', 'print', 'login', 'register', 'account', 'orders', 'cart', 'checkout', 'stores', 'payment', 'www', 'app']);
const DAY = 86_400_000;

export const addMonths = (d: Date, m: number) => {
  const r = new Date(d);
  r.setMonth(r.getMonth() + m);
  return r;
};

const storeListSelect = {
  id: true, slug: true, name: true, phone: true, email: true, address: true, logo: true, status: true,
  planId: true, planExpiresAt: true, note: true, createdAt: true,
  plan: { select: { id: true, code: true, name: true, priceMonthly: true, maxProducts: true, maxStaff: true } },
  _count: { select: { products: true, orders: true, members: true } },
} satisfies Prisma.StoreSelect;

const memberSelect = { id: true, email: true, fullName: true, phone: true, role: true, isActive: true, createdAt: true } satisfies Prisma.UserSelect;

export interface CreateStoreInput {
  name: string; slug?: string; phone?: string; email?: string; address?: string; note?: string;
  planId?: number; months?: number; amount?: number; method?: string;
  owner: { email: string; password?: string; fullName: string; phone?: string };
}

@Injectable()
export class SuperService {
  constructor(private prisma: PrismaService, private settings: SettingsService) {}

  // ───────────── Tổng quan nền tảng ─────────────
  async dashboard() {
    const now = new Date();
    const soon = new Date(Date.now() + 7 * DAY);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [byStatus, expiringSoon, expired, gmv, gmvMonth, revenue, revenueMonth, users, activeStores, recentStores, top] = await Promise.all([
      this.prisma.store.groupBy({ by: ['status'], _count: true }),
      this.prisma.store.findMany({
        where: { status: 'ACTIVE', planExpiresAt: { gte: now, lte: soon } },
        select: storeListSelect, orderBy: { planExpiresAt: 'asc' },
      }),
      this.prisma.store.count({ where: { status: 'ACTIVE', planExpiresAt: { lt: now } } }),
      this.prisma.order.aggregate({ where: { status: { not: 'CANCELLED' } }, _sum: { total: true }, _count: true }),
      this.prisma.order.aggregate({ where: { status: { not: 'CANCELLED' }, createdAt: { gte: monthStart } }, _sum: { total: true }, _count: true }),
      this.prisma.storePayment.aggregate({ _sum: { amount: true } }),
      this.prisma.storePayment.aggregate({ where: { createdAt: { gte: monthStart } }, _sum: { amount: true } }),
      this.prisma.user.groupBy({ by: ['role'], _count: true }),
      this.prisma.store.findMany({ where: { status: 'ACTIVE' }, select: { planExpiresAt: true, plan: { select: { priceMonthly: true } } } }),
      this.prisma.store.findMany({ select: storeListSelect, orderBy: { createdAt: 'desc' }, take: 5 }),
      this.prisma.order.groupBy({
        by: ['storeId'], where: { status: { not: 'CANCELLED' }, createdAt: { gte: monthStart } },
        _sum: { total: true }, _count: true, orderBy: { _sum: { total: 'desc' } }, take: 5,
      }),
    ]);
    // MRR = tổng phí tháng của các cửa hàng đang hoạt động & còn hạn
    const mrr = activeStores
      .filter((s) => !s.planExpiresAt || s.planExpiresAt >= now)
      .reduce((sum, s) => sum + (s.plan?.priceMonthly ?? 0), 0);
    const topStores = await this.prisma.store.findMany({ where: { id: { in: top.map((t) => t.storeId) } }, select: { id: true, name: true, slug: true } });
    const stores = Object.fromEntries(Object.values(StoreStatus).map((s) => [s, 0])) as Record<StoreStatus, number>;
    byStatus.forEach((r) => (stores[r.status] = r._count));
    return {
      stores: { ...stores, total: Object.values(stores).reduce((a, b) => a + b, 0), expired, expiringSoon: expiringSoon.length },
      users: Object.fromEntries(users.map((u) => [u.role, u._count])),
      gmv: { total: gmv._sum.total ?? 0, orders: gmv._count, month: gmvMonth._sum.total ?? 0, monthOrders: gmvMonth._count },
      revenue: { total: revenue._sum.amount ?? 0, month: revenueMonth._sum.amount ?? 0, mrr },
      expiringSoon,
      recentStores,
      topStores: top.map((t) => ({ store: topStores.find((s) => s.id === t.storeId), revenue: t._sum.total ?? 0, orders: t._count })),
    };
  }

  // ───────────── Gói dịch vụ ─────────────
  listPlans() {
    return this.prisma.plan.findMany({ orderBy: [{ sortOrder: 'asc' }, { priceMonthly: 'asc' }], include: { _count: { select: { stores: true } } } });
  }

  async createPlan(dto: Prisma.PlanCreateInput) {
    const code = slugify(dto.code || dto.name);
    if (await this.prisma.plan.findUnique({ where: { code } })) throw new ConflictException('Mã gói đã tồn tại');
    return this.prisma.plan.create({ data: { ...dto, code } });
  }

  async updatePlan(id: number, dto: Prisma.PlanUpdateInput) {
    await this.plan(id);
    if (dto.code) {
      const code = slugify(String(dto.code));
      const dup = await this.prisma.plan.findFirst({ where: { code, id: { not: id } } });
      if (dup) throw new ConflictException('Mã gói đã tồn tại');
      dto.code = code;
    }
    return this.prisma.plan.update({ where: { id }, data: dto });
  }

  async removePlan(id: number) {
    const p = await this.prisma.plan.findUnique({ where: { id }, include: { _count: { select: { stores: true } } } });
    if (!p) throw new NotFoundException('Không tìm thấy gói');
    if (p._count.stores) throw new BadRequestException(`Gói đang được ${p._count.stores} cửa hàng sử dụng – hãy ngừng bán gói thay vì xoá`);
    await this.prisma.plan.delete({ where: { id } });
    return { ok: true };
  }

  private async plan(id: number) {
    const p = await this.prisma.plan.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Không tìm thấy gói dịch vụ');
    return p;
  }

  // ───────────── Cửa hàng (đối tác) ─────────────
  async listStores(q: { page?: number; limit?: number; search?: string; status?: StoreStatus; planId?: number; expiry?: 'expired' | 'soon' }) {
    const { skip, take, page, limit } = paginate(q.page, q.limit);
    const now = new Date();
    const where: Prisma.StoreWhereInput = {
      ...(q.status && { status: q.status }),
      ...(q.planId && { planId: Number(q.planId) }),
      ...(q.expiry === 'expired' && { planExpiresAt: { lt: now } }),
      ...(q.expiry === 'soon' && { planExpiresAt: { gte: now, lte: new Date(Date.now() + 7 * DAY) } }),
      ...(q.search && {
        OR: [
          { name: { contains: q.search } }, { slug: { contains: q.search } }, { phone: { contains: q.search } },
          { email: { contains: q.search } }, { members: { some: { email: { contains: q.search } } } },
        ],
      }),
    };
    const [items, total] = await Promise.all([
      this.prisma.store.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        select: { ...storeListSelect, members: { where: { role: 'ADMIN' }, select: { id: true, email: true, fullName: true }, take: 1, orderBy: { createdAt: 'asc' } } },
      }),
      this.prisma.store.count({ where }),
    ]);
    return paged(items.map((s) => ({ ...s, owner: s.members[0] ?? null, members: undefined })), total, page, limit);
  }

  private async uniqueSlug(base: string, exceptId?: number) {
    const s = slugify(base);
    if (!s || s.length < 3) throw new BadRequestException('Đường dẫn cửa hàng (slug) tối thiểu 3 ký tự a-z, 0-9, -');
    if (RESERVED.has(s)) throw new BadRequestException(`"${s}" là đường dẫn hệ thống, hãy chọn tên khác`);
    const dup = await this.prisma.store.findFirst({ where: { slug: s, ...(exceptId && { id: { not: exceptId } }) } });
    if (dup) throw new ConflictException(`Đường dẫn "${s}" đã có cửa hàng khác sử dụng`);
    return s;
  }

  async createStore(dto: CreateStoreInput, actorId: number) {
    const slug = await this.uniqueSlug(dto.slug || dto.name);
    const plan = dto.planId ? await this.plan(dto.planId) : null;
    const months = Math.max(0, Math.floor(dto.months ?? 1));
    const email = dto.owner.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing && (existing.role !== 'CUSTOMER' || existing.storeId))
      throw new ConflictException('Email chủ cửa hàng đã là tài khoản quản trị của nơi khác');
    if (!existing && !dto.owner.password) throw new BadRequestException('Nhập mật khẩu cho tài khoản chủ cửa hàng');

    const now = new Date();
    const expires = months > 0 ? addMonths(now, months) : null;
    const amount = dto.amount ?? (plan ? plan.priceMonthly * months : 0);
    const password = dto.owner.password ? await bcrypt.hash(dto.owner.password, 10) : undefined;

    const store = await this.prisma.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: {
          slug, name: dto.name.trim(), phone: dto.phone, email: dto.email, address: dto.address, note: dto.note,
          planId: plan?.id, planExpiresAt: expires,
        },
      });
      if (existing) {
        await tx.user.update({ where: { id: existing.id }, data: { role: Role.ADMIN, storeId: store.id, isActive: true, ...(password && { password }) } });
      } else {
        await tx.user.create({
          data: { email, password: password!, fullName: dto.owner.fullName, phone: dto.owner.phone, role: Role.ADMIN, storeId: store.id },
        });
      }
      if (months > 0)
        await tx.storePayment.create({
          data: { storeId: store.id, planId: plan?.id, months, amount, periodFrom: now, periodTo: expires!, method: dto.method, note: 'Đăng ký mới', createdById: actorId },
        });
      return store;
    });
    return this.storeDetail(store.id);
  }

  async storeDetail(id: number) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      select: {
        ...storeListSelect,
        members: { select: memberSelect, orderBy: [{ role: 'asc' }, { createdAt: 'asc' }] },
        payments: { orderBy: { createdAt: 'desc' }, take: 50, include: { plan: { select: { name: true } }, createdBy: { select: { fullName: true } } } },
      },
    });
    if (!store) throw new NotFoundException('Không tìm thấy cửa hàng');
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [all, month, customers, variants] = await Promise.all([
      this.prisma.order.aggregate({ where: { storeId: id, status: { not: 'CANCELLED' } }, _sum: { total: true }, _count: true }),
      this.prisma.order.aggregate({ where: { storeId: id, status: { not: 'CANCELLED' }, createdAt: { gte: monthStart } }, _sum: { total: true }, _count: true }),
      this.prisma.order.findMany({ where: { storeId: id, userId: { not: null } }, distinct: ['userId'], select: { userId: true } }),
      this.prisma.productVariant.count({ where: { storeId: id } }),
    ]);
    return {
      ...store,
      stats: {
        revenue: all._sum.total ?? 0, orders: all._count, monthRevenue: month._sum.total ?? 0, monthOrders: month._count,
        customers: customers.length, variants,
      },
    };
  }

  async updateStore(id: number, dto: {
    name?: string; slug?: string; phone?: string; email?: string; address?: string; logo?: string; note?: string;
    status?: StoreStatus; planId?: number | null; planExpiresAt?: string | null;
  }) {
    const old = await this.prisma.store.findUnique({ where: { id } });
    if (!old) throw new NotFoundException('Không tìm thấy cửa hàng');
    const slug = dto.slug && dto.slug !== old.slug ? await this.uniqueSlug(dto.slug, id) : undefined;
    if (dto.planId) await this.plan(dto.planId);
    const store = await this.prisma.store.update({
      where: { id },
      data: {
        name: dto.name?.trim() || undefined, slug, phone: dto.phone, email: dto.email, address: dto.address, logo: dto.logo, note: dto.note,
        status: dto.status,
        ...(dto.planId !== undefined && { planId: dto.planId }),
        ...(dto.planExpiresAt !== undefined && { planExpiresAt: dto.planExpiresAt ? new Date(dto.planExpiresAt) : null }),
      },
    });
    // Tên cửa hàng trong cài đặt riêng (nếu đã lưu) cũng đổi theo
    if (dto.name) {
      const row = await this.prisma.setting.findUnique({ where: { storeId_key: { storeId: id, key: 'store' } } });
      if (row?.value && typeof row.value === 'object')
        await this.prisma.setting.update({ where: { storeId_key: { storeId: id, key: 'store' } }, data: { value: { ...(row.value as object), storeName: store.name } } });
    }
    clearStoreCache(old.slug);
    clearStoreCache(store.slug);
    this.settings.invalidate(id);
    return this.storeDetail(id);
  }

  /** Gia hạn: cộng thêm tháng từ max(hôm nay, ngày hết hạn hiện tại) */
  async renew(id: number, dto: { months: number; planId?: number; amount?: number; method?: string; note?: string }, actorId: number) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('Không tìm thấy cửa hàng');
    const months = Math.floor(dto.months);
    if (!(months >= 1 && months <= 60)) throw new BadRequestException('Số tháng gia hạn từ 1 đến 60');
    const planId = dto.planId ?? store.planId;
    const plan = planId ? await this.plan(planId) : null;
    const now = new Date();
    const from = store.planExpiresAt && store.planExpiresAt > now ? store.planExpiresAt : now;
    const to = addMonths(from, months);
    await this.prisma.$transaction([
      this.prisma.store.update({ where: { id }, data: { planId: plan?.id ?? null, planExpiresAt: to } }),
      this.prisma.storePayment.create({
        data: {
          storeId: id, planId: plan?.id, months, amount: dto.amount ?? (plan?.priceMonthly ?? 0) * months,
          periodFrom: from, periodTo: to, method: dto.method, note: dto.note, createdById: actorId,
        },
      }),
    ]);
    clearStoreCache(store.slug);
    return this.storeDetail(id);
  }

  async addMember(storeId: number, dto: { email: string; password: string; fullName: string; phone?: string; role: Role }) {
    await this.storeDetail(storeId);
    if (!['ADMIN', 'STAFF'].includes(dto.role)) throw new BadRequestException('Vai trò không hợp lệ');
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing && (existing.role !== 'CUSTOMER' || existing.storeId)) throw new ConflictException('Email đã là tài khoản quản trị');
    const password = await bcrypt.hash(dto.password, 10);
    if (existing)
      return this.prisma.user.update({ where: { id: existing.id }, data: { role: dto.role, storeId, password, isActive: true }, select: memberSelect });
    return this.prisma.user.create({
      data: { email, password, fullName: dto.fullName, phone: dto.phone, role: dto.role, storeId }, select: memberSelect,
    });
  }

  async updateMember(storeId: number, userId: number, dto: { fullName?: string; phone?: string; role?: Role; isActive?: boolean; password?: string }) {
    const u = await this.prisma.user.findFirst({ where: { id: userId, storeId } });
    if (!u) throw new NotFoundException('Không tìm thấy tài khoản của cửa hàng');
    if (dto.role && !['ADMIN', 'STAFF'].includes(dto.role)) throw new BadRequestException('Vai trò không hợp lệ');
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName, phone: dto.phone, role: dto.role, isActive: dto.isActive,
        ...(dto.password && { password: await bcrypt.hash(dto.password, 10), resetTokenHash: null, resetTokenExp: null }),
      },
      select: memberSelect,
    });
  }

  async removeMember(storeId: number, userId: number) {
    const u = await this.prisma.user.findFirst({ where: { id: userId, storeId } });
    if (!u) throw new NotFoundException('Không tìm thấy tài khoản của cửa hàng');
    await this.prisma.user.update({ where: { id: userId }, data: { role: Role.CUSTOMER, storeId: null } });
    await this.prisma.pushToken.deleteMany({ where: { userId } });
    return { ok: true };
  }

  // ───────────── Thanh toán phí dịch vụ ─────────────
  async payments(q: { page?: number; limit?: number; storeId?: number; from?: string; to?: string }) {
    const { skip, take, page, limit } = paginate(q.page, q.limit);
    const where: Prisma.StorePaymentWhereInput = {
      ...(q.storeId && { storeId: Number(q.storeId) }),
      ...((q.from || q.to) && { createdAt: { ...(q.from && { gte: new Date(q.from) }), ...(q.to && { lte: new Date(`${q.to}T23:59:59`) }) } }),
    };
    const [items, total, sum] = await Promise.all([
      this.prisma.storePayment.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: { store: { select: { id: true, name: true, slug: true } }, plan: { select: { name: true } }, createdBy: { select: { fullName: true } } },
      }),
      this.prisma.storePayment.count({ where }),
      this.prisma.storePayment.aggregate({ where, _sum: { amount: true } }),
    ]);
    return { ...paged(items, total, page, limit), sum: sum._sum.amount ?? 0 };
  }

  async removePayment(id: number) {
    const p = await this.prisma.storePayment.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Không tìm thấy phiếu thu');
    await this.prisma.storePayment.delete({ where: { id } });
    return { ok: true };
  }

  // ───────────── Người dùng toàn nền tảng ─────────────
  async users(q: { page?: number; limit?: number; search?: string; role?: Role }) {
    const { skip, take, page, limit } = paginate(q.page, q.limit);
    const where: Prisma.UserWhereInput = {
      ...(q.role && { role: q.role }),
      ...(q.search && { OR: [{ email: { contains: q.search } }, { fullName: { contains: q.search } }, { phone: { contains: q.search } }] }),
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        select: { ...memberSelect, store: { select: { id: true, name: true, slug: true } }, _count: { select: { orders: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);
    return paged(items, total, page, limit);
  }

  async updateUser(id: number, dto: { isActive?: boolean; password?: string }, me: number) {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new NotFoundException('Không tìm thấy người dùng');
    if (id === me && dto.isActive === false) throw new BadRequestException('Không thể tự khoá chính mình');
    return this.prisma.user.update({
      where: { id },
      data: { isActive: dto.isActive, ...(dto.password && { password: await bcrypt.hash(dto.password, 10), resetTokenHash: null, resetTokenExp: null }) },
      select: memberSelect,
    });
  }
}
