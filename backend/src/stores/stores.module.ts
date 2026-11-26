import { Controller, Get, Module, NotFoundException, Param, Query } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { distanceKm, etaMinutes } from '../common/geo';
import { PlatformService } from '../common/platform';
import { quoteShipping } from '../common/shipping';
import { isExpired } from '../common/tenant';
import { PaginationDto } from '../common/pagination.dto';
import { paged, paginate } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

const select = {
  id: true, slug: true, name: true, logo: true, address: true, phone: true, lat: true, lng: true, planExpiresAt: true, createdAt: true,
  _count: { select: { products: { where: { isActive: true } } } },
} satisfies Prisma.StoreSelect;

class NearbyQuery {
  @Type(() => Number) @IsNumber() @Min(-90) @Max(90) lat: number;
  @Type(() => Number) @IsNumber() @Min(-180) @Max(180) lng: number;
  /** bán kính tìm (km) */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.5) @Max(100) radius?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number;
}

/** Danh bạ cửa hàng công khai của nền tảng */
@Controller('stores')
export class StoresController {
  constructor(private prisma: PrismaService, private settings: SettingsService, private platform: PlatformService) {}

  private async present(s: Prisma.StoreGetPayload<{ select: typeof select }>) {
    const st = await this.settings.get(s.id);
    return {
      id: s.id, slug: s.slug, name: st.storeName || s.name, logo: st.logo || s.logo, address: st.address || s.address,
      lat: s.lat, lng: s.lng,
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

  /**
   * Cửa hàng quanh vị trí khách (chỉ cửa hàng đã ghim vị trí trên bản đồ), gần nhất trước.
   * Kèm khoảng cách, thời gian đi ước tính và phí ship để khách so sánh.
   */
  @Get('nearby') async nearby(@Query() q: NearbyQuery) {
    const radius = q.radius ?? 10;
    // khung lọc thô theo vĩ/kinh độ trước khi tính khoảng cách chính xác
    const dLat = radius / 111, dLng = radius / (111 * Math.max(Math.cos((q.lat * Math.PI) / 180), 0.2));
    const rows = await this.prisma.store.findMany({
      where: { status: 'ACTIVE', lat: { gte: q.lat - dLat, lte: q.lat + dLat }, lng: { gte: q.lng - dLng, lte: q.lng + dLng } },
      select,
    });
    const near = rows
      .map((r) => ({ r, km: distanceKm(q, r)! }))
      .filter((x) => x.km != null && x.km <= radius)
      .sort((a, b) => a.km - b.km)
      .slice(0, q.limit ?? 12);
    const tariff = (await this.platform.get()).delivery;
    const items = await Promise.all(near.map(async ({ r, km }) => {
      const st = await this.settings.get(r.id);
      const ship = quoteShipping({ store: r, dropoff: q, mode: st.shippingMode, fixedFee: st.shippingFee, tariff });
      return {
        ...(await this.present(r)), lat: r.lat, lng: r.lng, distanceKm: ship.km ?? km, etaMin: etaMinutes(ship.km ?? km),
        shippingFee: ship.fee, shippingMode: ship.mode, outOfRange: ship.outOfRange, freeShippingThreshold: st.freeShippingThreshold,
      };
    }));
    return { radius, items, unpinned: await this.prisma.store.count({ where: { status: 'ACTIVE', OR: [{ lat: null }, { lng: null }] } }) };
  }

  /** Bảng giá gói dịch vụ cho trang giới thiệu nền tảng */
  @Get('plans') plans() {
    return this.prisma.plan.findMany({
      where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { priceMonthly: 'asc' }],
      select: { id: true, code: true, name: true, description: true, priceMonthly: true, maxProducts: true, maxStaff: true },
    });
  }

  @Get(':slug') async one(@Param('slug') slug: string) {
    const s = await this.prisma.store.findFirst({ where: { slug: slug.toLowerCase(), status: 'ACTIVE' }, select });
    if (!s) throw new NotFoundException('Không tìm thấy cửa hàng hoặc cửa hàng đang tạm ngưng');
    return this.present(s);
  }
}

@Module({ controllers: [StoresController] })
export class StoresModule {}
