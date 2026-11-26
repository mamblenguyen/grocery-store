import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { assertPlanLimit } from '../common/plan-limits';
import { scope, storeId } from '../common/tenant';
import { paged, paginate } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';

const memberSelect = {
  id: true, email: true, fullName: true, phone: true, role: true, isActive: true, createdAt: true,
  _count: { select: { createdOrders: true } },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ───────────── Nhân viên của cửa hàng ─────────────
  listStaff() {
    return this.prisma.user.findMany({ where: { storeId: storeId() }, orderBy: [{ role: 'asc' }, { createdAt: 'asc' }], select: memberSelect });
  }

  private async member(id: number) {
    const u = await this.prisma.user.findFirst({ where: { id, storeId: storeId() } });
    if (!u) throw new NotFoundException('Không tìm thấy nhân viên của cửa hàng');
    return u;
  }

  async createStaff(dto: { email: string; password: string; fullName: string; phone?: string; role: Role }) {
    const sid = storeId();
    if (!['ADMIN', 'STAFF'].includes(dto.role)) throw new BadRequestException('Vai trò không hợp lệ');
    await assertPlanLimit(this.prisma, sid, 'staff');
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('Email đã được sử dụng trên nền tảng');
    return this.prisma.user.create({
      data: { email, password: await bcrypt.hash(dto.password, 10), fullName: dto.fullName, phone: dto.phone, role: dto.role, storeId: sid },
      select: memberSelect,
    });
  }

  async updateStaff(id: number, dto: { fullName?: string; phone?: string; role?: Role; isActive?: boolean; password?: string }, me: number) {
    const u = await this.member(id);
    if (id === me && (dto.role || dto.isActive === false)) throw new BadRequestException('Không thể tự đổi vai trò / khoá chính mình');
    if (dto.role && !['ADMIN', 'STAFF'].includes(dto.role)) throw new BadRequestException('Vai trò không hợp lệ');
    if ((dto.role === 'STAFF' || dto.isActive === false) && u.role === 'ADMIN') await this.ensureAnotherAdmin(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName, phone: dto.phone, role: dto.role, isActive: dto.isActive,
        ...(dto.password && { password: await bcrypt.hash(dto.password, 10) }),
      },
      select: memberSelect,
    });
  }

  /** Gỡ khỏi cửa hàng: tài khoản trở thành khách hàng thường (lịch sử đơn/phiếu vẫn giữ) */
  async removeStaff(id: number, me: number) {
    const u = await this.member(id);
    if (id === me) throw new BadRequestException('Không thể tự gỡ chính mình');
    if (u.role === 'ADMIN') await this.ensureAnotherAdmin(id);
    await this.prisma.user.update({ where: { id }, data: { storeId: null, role: 'CUSTOMER' } });
    return { success: true };
  }

  private async ensureAnotherAdmin(exceptId: number) {
    const n = await this.prisma.user.count({ where: { storeId: storeId(), role: 'ADMIN', isActive: true, id: { not: exceptId } } });
    if (!n) throw new BadRequestException('Cửa hàng phải còn ít nhất 1 quản lý (ADMIN) đang hoạt động');
  }

  // ───────────── Khách hàng của cửa hàng (đã từng đặt đơn) ─────────────
  async listCustomers(q: { page?: number; limit?: number; search?: string }) {
    const sc = scope();
    const { skip, take, page, limit } = paginate(q.page, q.limit);
    const groups = await this.prisma.order.groupBy({
      by: ['userId'], where: { ...sc, userId: { not: null } }, _count: { _all: true }, _max: { createdAt: true },
    });
    const spent = await this.prisma.order.groupBy({ by: ['userId'], where: { ...sc, userId: { not: null }, status: 'COMPLETED' }, _sum: { total: true } });
    const spentMap = new Map(spent.map((s) => [s.userId, s._sum.total ?? 0]));
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: groups.map((g) => g.userId!) },
        role: 'CUSTOMER',
        ...(q.search && { OR: [{ email: { contains: q.search } }, { fullName: { contains: q.search } }, { phone: { contains: q.search } }] }),
      },
      select: { id: true, email: true, fullName: true, phone: true, isActive: true, createdAt: true },
    });
    const loyalty = await this.prisma.loyaltyAccount.findMany({ where: { ...sc, userId: { in: users.map((u) => u.id) } } });
    const rows = users
      .map((u) => { const g = groups.find((x) => x.userId === u.id)!; const l = loyalty.find((x) => x.userId === u.id); return { ...u, orders: g._count._all, lastOrderAt: g._max.createdAt, totalSpent: spentMap.get(u.id) ?? 0, points: l?.points ?? 0, lifetimePoints: l?.lifetimePoints ?? 0, tier: l?.tier ?? 'MEMBER' }; })
      .sort((a, b) => b.totalSpent - a.totalSpent);
    return paged(rows.slice(skip, skip + take), rows.length, page, limit);
  }

  async customerDetail(id: number) {
    const sc = scope();
    const sid = storeId();
    const orders = await this.prisma.order.findMany({ where: { userId: id, ...sc }, orderBy: { createdAt: 'desc' }, take: 50 });
    if (!orders.length) throw new NotFoundException('Khách hàng chưa mua tại cửa hàng');
    const [user, loyalty, pointHistory, recipients, redemptions] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id }, select: { id: true, email: true, fullName: true, phone: true, address: true, isActive: true, createdAt: true, updatedAt: true, addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] } } }),
      this.prisma.loyaltyAccount.findUnique({ where: { storeId_userId: { storeId: sid, userId: id } } }),
      this.prisma.loyaltyTransaction.findMany({ where: { storeId: sid, userId: id }, orderBy: { createdAt: 'desc' }, take: 100 }),
      this.prisma.couponRecipient.findMany({ where: { userId: id, coupon: { storeId: sid } }, include: { coupon: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.couponRedemption.findMany({ where: { storeId: sid, userId: id } }),
    ]);
    const publicCoupons = await this.prisma.coupon.findMany({ where: { storeId: sid, audienceAll: true, isActive: true }, orderBy: { createdAt: 'desc' } });
    const usedMap = new Map(redemptions.map((x) => [x.couponId, x]));
    const coupons = [...recipients.map((x) => x.coupon), ...publicCoupons]
      .filter((c, i, all) => all.findIndex((x) => x.id === c.id) === i)
      .map((c) => ({ ...c, assigned: !c.audienceAll, usedAt: usedMap.get(c.id)?.createdAt ?? null, redemptionOrderId: usedMap.get(c.id)?.orderId ?? null }));
    const totalSpent = orders.filter((o) => o.status === 'COMPLETED').reduce((s, o) => s + o.total, 0);
    return { ...user, orders, totalSpent, loyalty: loyalty ?? { points: 0, lifetimePoints: 0, tier: 'MEMBER', joinedAt: null }, pointHistory, coupons };
  }
}
