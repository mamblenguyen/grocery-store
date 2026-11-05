import { Controller, Get, Module, Query } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from '../common/pagination.dto';
import { paged, paginate } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';
import { toImages } from '../products/products.service';

class MarketQuery extends PaginationDto {
  /** slug danh mục – gộp các danh mục cùng slug của mọi cửa hàng */
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() store?: string;
  @IsOptional() @IsIn(['newest', 'best_selling', 'price_asc', 'price_desc', 'rating']) sort?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxPrice?: number;
  @IsOptional() @IsIn(['true', 'false', true, false]) featured?: string | boolean;
  @IsOptional() @IsIn(['true', 'false', true, false]) deals?: string | boolean;
}

/** Chỉ cửa hàng đang hoạt động & còn hạn gói mới lên sàn (bán được) */
const liveStore = (): Prisma.StoreWhereInput => ({ status: 'ACTIVE', OR: [{ planExpiresAt: null }, { planExpiresAt: { gte: new Date() } }] });

/** Sàn: hàng hoá của toàn bộ đối tác trên nền tảng */
@Controller('market')
export class MarketController {
  constructor(private prisma: PrismaService) {}

  @Get('products') async products(@Query() q: MarketQuery) {
    const { skip, take, page, limit } = paginate(q.page, q.limit);
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      store: { ...liveStore(), ...(q.store && { slug: q.store }) },
      variants: { some: { isActive: true } },
      ...(q.search && { OR: [{ name: { contains: q.search } }, { brand: { contains: q.search } }, { store: { name: { contains: q.search } } }] }),
      ...(q.category && { category: { OR: [{ slug: q.category }, { parent: { slug: q.category } }] } }),
      ...((q.minPrice !== undefined || q.maxPrice !== undefined) && { minPrice: { ...(q.minPrice !== undefined && { gte: q.minPrice }), ...(q.maxPrice !== undefined && { lte: q.maxPrice }) } }),
      ...(String(q.featured) === 'true' && { isFeatured: true }),
    };
    if (String(q.deals) === 'true') where.variants = { some: { isActive: true, compareAtPrice: { not: null } } };
    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      q.sort === 'price_asc' ? [{ minPrice: 'asc' }] : q.sort === 'price_desc' ? [{ minPrice: 'desc' }]
        : q.sort === 'best_selling' ? [{ soldCount: 'desc' }] : q.sort === 'rating' ? [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }] : [{ createdAt: 'desc' }];
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where, skip, take, orderBy: [...orderBy, { id: 'desc' }],
        include: {
          category: { select: { id: true, name: true, slug: true } },
          store: { select: { id: true, slug: true, name: true } },
          variants: { where: { isActive: true }, orderBy: { position: 'asc' }, select: { id: true, name: true, sku: true, price: true, compareAtPrice: true, stock: true, isActive: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);
    return paged(items.map((p) => ({ ...p, images: toImages(p.images), totalStock: p.variants.reduce((s, v) => s + v.stock, 0) })), total, page, limit);
  }

  /** Danh mục gộp theo slug trên toàn sàn (VD: "do-uong" của mọi cửa hàng) */
  @Get('categories') async categories() {
    const cats = await this.prisma.category.findMany({
      where: { isActive: true, parentId: null, store: liveStore() },
      select: { slug: true, name: true, image: true, sortOrder: true, _count: { select: { products: { where: { isActive: true } } } } },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const map = new Map<string, { slug: string; name: string; image: string | null; productCount: number; stores: number; sortOrder: number }>();
    for (const c of cats) {
      const m = map.get(c.slug);
      if (m) { m.productCount += c._count.products; m.stores++; m.image ??= c.image; }
      else map.set(c.slug, { slug: c.slug, name: c.name, image: c.image, productCount: c._count.products, stores: 1, sortOrder: c.sortOrder });
    }
    return [...map.values()].filter((c) => c.productCount > 0).sort((a, b) => a.sortOrder - b.sortOrder || b.productCount - a.productCount);
  }
}

@Module({ controllers: [MarketController] })
export class MarketModule {}
