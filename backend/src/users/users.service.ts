import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { paged, paginate } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';

const userSelect = {
  id: true, email: true, fullName: true, phone: true, address: true,
  role: true, isActive: true, createdAt: true, _count: { select: { orders: true } },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async list(q: { page?: number; limit?: number; search?: string; role?: Role }) {
    const { skip, take, page, limit } = paginate(q.page, q.limit);
    const where: Prisma.UserWhereInput = {
      ...(q.role && { role: q.role }),
      ...(q.search && {
        OR: [
          { email: { contains: q.search, mode: 'insensitive' } },
          { fullName: { contains: q.search, mode: 'insensitive' } },
          { phone: { contains: q.search } },
        ],
      }),
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, select: userSelect }),
      this.prisma.user.count({ where }),
    ]);
    return paged(items, total, page, limit);
  }

  async detail(id: number) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id }, select: userSelect });
    const orders = await this.prisma.order.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 20 });
    const spent = await this.prisma.order.aggregate({ where: { userId: id, status: 'COMPLETED' }, _sum: { total: true } });
    return { ...user, orders, totalSpent: spent._sum.total ?? 0 };
  }

  async update(id: number, dto: { role?: Role; isActive?: boolean }, me: number) {
    if (id === me) throw new BadRequestException('Không thể tự thay đổi quyền / khóa chính mình');
    return this.prisma.user.update({ where: { id }, data: dto, select: userSelect });
  }
}
