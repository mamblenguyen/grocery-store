import { Controller, Get, Module, NotFoundException, Param, Query } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isExpired } from '../common/tenant';
import { PaginationDto } from '../common/pagination.dto';
import { paged, paginate } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

const select = {
  id: true, slug: true, name: true, logo: true, address: true, phone: true, planExpiresAt: true, createdAt: true,
  _count: { select: { products: { where: { isActive: true } } } },
} satisfies Prisma.StoreSelect;

/** Danh bạ cửa hàng công khai của nền tảng */
@Controller('stores')
export class StoresController {
  constructor(private prisma: PrismaService, private settings: SettingsService) {}

  private async present(s: Prisma.StoreGetPayload<{ select: typeof select }>) {
    const st = await this.settings.get(s.id);
    return {
      id: s.id, slug: s.slug, name: st.storeName || s.name, logo: st.logo || s.logo, address: st.address || s.address,
      hotline: st.hotline || s.phone, slogan: st.slogan, openingHours: st.openingHours,
      banner: st.banners?.[0]?.image ?? null, productCount: s._count.products,
      acceptingOrders: !isExpired(s), createdAt: s.createdAt,
    };
  }

  @Get() async list(@Query() q: PaginationDto) {
    const { skip, take, page, limit } = paginate(q.page, q.limit ?? 24);
    const where: Prisma.StoreWhereInput = {
      status: 'ACTIVE',
      ...(q.search && { OR: [{ name: { contains: q.search } }, { address: { contains: q.search } }, { slug: { contains: q.search } }] }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.store.findMany({ where, select, skip, take, orderBy: [{ createdAt: 'asc' }] }),
      this.prisma.store.count({ where }),
    ]);
    return paged(await Promise.all(rows.map((r) => this.present(r))), total, page, limit);
  }

  @Get(':slug') async one(@Param('slug') slug: string) {
    const s = await this.prisma.store.findFirst({ where: { slug: slug.toLowerCase(), status: 'ACTIVE' }, select });
    if (!s) throw new NotFoundException('Không tìm thấy cửa hàng hoặc cửa hàng đang tạm ngưng');
    return this.present(s);
  }
}

@Module({ controllers: [StoresController] })
export class StoresModule {}
