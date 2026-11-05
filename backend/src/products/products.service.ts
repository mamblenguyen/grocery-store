import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paged, paginate, slugify } from '../common/utils';
import { assertPlanLimit } from '../common/plan-limits';
import { storeId } from '../common/tenant';
import { PrismaService } from '../prisma/prisma.service';
import { QueryProductsDto, SaveProductDto } from './dto/product.dto';

const detailInclude = {
  category: { select: { id: true, name: true, slug: true } },
  options: {
    orderBy: { position: 'asc' },
    include: { values: { orderBy: { position: 'asc' } } },
  },
  variants: {
    orderBy: { position: 'asc' },
    include: { optionValues: { include: { optionValue: { select: { id: true, value: true, optionId: true } } } } },
  },
} satisfies Prisma.ProductInclude;

type ProductDetail = Prisma.ProductGetPayload<{ include: typeof detailInclude }>;

/** Cột images kiểu JSON → luôn trả về mảng chuỗi */
export const toImages = (v: Prisma.JsonValue | null): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

const listInclude = {
  category: { select: { id: true, name: true, slug: true } },
  variants: {
    orderBy: { position: 'asc' },
    select: { id: true, name: true, sku: true, price: true, compareAtPrice: true, stock: true, isActive: true, lowStockThreshold: true },
  },
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  /** Chuẩn hoá output: mỗi variant có thêm optionValueIds + options để client dễ chọn */
  private format(p: ProductDetail) {
    return {
      ...p,
      images: toImages(p.images),
      variants: p.variants.map(({ optionValues, ...v }) => ({
        ...v,
        optionValueIds: optionValues.map((o) => o.optionValueId),
        options: Object.fromEntries(
          optionValues.map((o) => [p.options.find((op) => op.id === o.optionValue.optionId)?.name ?? '', o.optionValue.value]),
        ),
      })),
    };
  }

  private async buildWhere(q: QueryProductsDto, admin: boolean): Promise<Prisma.ProductWhereInput> {
    const where: Prisma.ProductWhereInput = { storeId: storeId() };
    if (!admin) where.isActive = true;
    else if (q.status === 'active') where.isActive = true;
    else if (q.status === 'inactive') where.isActive = false;

    if (q.search) {
      where.OR = [
        { name: { contains: q.search } },
        { brand: { contains: q.search } },
        { variants: { some: { OR: [{ sku: { contains: q.search } }, { barcode: q.search }] } } },
      ];
    }
    if (q.category || q.categoryId) {
      const cat = q.categoryId
        ? await this.prisma.category.findFirst({ where: { id: q.categoryId, storeId: storeId() }, include: { children: true } })
        : await this.prisma.category.findUnique({ where: { storeId_slug: { storeId: storeId(), slug: q.category! } }, include: { children: true } });
      where.categoryId = { in: cat ? [cat.id, ...cat.children.map((c) => c.id)] : [-1] };
    }
    if (q.brand) where.brand = { equals: q.brand };
    if (q.minPrice !== undefined || q.maxPrice !== undefined) {
      where.minPrice = { ...(q.minPrice !== undefined && { gte: q.minPrice }), ...(q.maxPrice !== undefined && { lte: q.maxPrice }) };
    }
    if (q.featured) where.isFeatured = true;
    if (q.inStock) where.variants = { some: { isActive: true, stock: { gt: 0 } } };
    return where;
  }

  private orderBy(sort?: string): Prisma.ProductOrderByWithRelationInput {
    switch (sort) {
      case 'price_asc': return { minPrice: 'asc' };
      case 'price_desc': return { minPrice: 'desc' };
      case 'name': return { name: 'asc' };
      case 'best_selling': return { soldCount: 'desc' };
      default: return { createdAt: 'desc' };
    }
  }

  async list(q: QueryProductsDto, admin = false) {
    const { skip, take, page, limit } = paginate(q.page, q.limit);
    const where = await this.buildWhere(q, admin);
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where, skip, take, orderBy: this.orderBy(q.sort),
        include: {
          ...listInclude,
          variants: admin ? listInclude.variants : { ...listInclude.variants, where: { isActive: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);
    const mapped = items.map((p) => ({
      ...p,
      images: toImages(p.images),
      totalStock: p.variants.reduce((s, v) => s + v.stock, 0),
    }));
    return paged(mapped, total, page, limit);
  }

  async brands() {
    const rows = await this.prisma.product.findMany({
      where: { storeId: storeId(), isActive: true, brand: { not: null } }, distinct: ['brand'], select: { brand: true }, orderBy: { brand: 'asc' },
    });
    return rows.map((r) => r.brand);
  }

  async findBySlug(slug: string) {
    const p = await this.prisma.product.findFirst({
      where: { storeId: storeId(), slug, isActive: true },
      include: { ...detailInclude, variants: { ...detailInclude.variants, where: { isActive: true } } },
    });
    if (!p) throw new NotFoundException('Không tìm thấy sản phẩm');
    const related = await this.prisma.product.findMany({
      where: { storeId: p.storeId, isActive: true, categoryId: p.categoryId, id: { not: p.id } },
      take: 8, orderBy: { soldCount: 'desc' }, include: listInclude,
    });
    return { ...this.format(p), related: related.map((r) => ({ ...r, images: toImages(r.images) })) };
  }

  async findById(id: number) {
    const p = await this.prisma.product.findFirst({ where: { id, storeId: storeId() }, include: detailInclude });
    if (!p) throw new NotFoundException('Không tìm thấy sản phẩm');
    return this.format(p);
  }

  /** Kiểm tra tính hợp lệ của options & variants */
  private validate(dto: SaveProductDto) {
    const optNames = dto.options.map((o) => o.name.trim().toLowerCase());
    if (new Set(optNames).size !== optNames.length) throw new BadRequestException('Tên thuộc tính bị trùng');
    dto.options.forEach((o) => {
      const vals = o.values.map((v) => v.trim().toLowerCase());
      if (new Set(vals).size !== vals.length) throw new BadRequestException(`Giá trị của "${o.name}" bị trùng`);
    });
    const skus = new Set<string>();
    const combos = new Set<string>();
    for (const v of dto.variants) {
      if (skus.has(v.sku)) throw new BadRequestException(`SKU "${v.sku}" bị trùng`);
      skus.add(v.sku);
      if (v.optionValues.length !== dto.options.length)
        throw new BadRequestException(`Biến thể ${v.sku} phải có đủ ${dto.options.length} giá trị thuộc tính`);
      v.optionValues.forEach((val, i) => {
        if (!dto.options[i].values.includes(val))
          throw new BadRequestException(`Giá trị "${val}" không thuộc thuộc tính "${dto.options[i].name}"`);
      });
      const key = v.optionValues.join('||');
      if (combos.has(key)) throw new BadRequestException(`Tổ hợp "${v.optionValues.join(' / ')}" bị trùng`);
      combos.add(key);
    }
    if (dto.options.length === 0 && dto.variants.length > 1)
      throw new BadRequestException('Sản phẩm không có thuộc tính chỉ được có 1 biến thể');
  }

  async save(dto: SaveProductDto, userId: number, id?: number) {
    this.validate(dto);
    const sid = storeId();
    if (id) await this.prisma.product.findFirstOrThrow({ where: { id, storeId: sid } }); // chỉ sửa sản phẩm của cửa hàng mình
    else await assertPlanLimit(this.prisma, sid, 'products');
    if (dto.categoryId) await this.prisma.category.findFirstOrThrow({ where: { id: dto.categoryId, storeId: sid } });
    const slug = slugify(dto.slug || dto.name);
    const { options, variants, images, ...rest } = dto;
    const productData = { ...rest, ...(images !== undefined && { images }) };
    const prices = variants.map((v) => v.price);

    const productId = await this.prisma.$transaction(async (tx) => {
      const data = { ...productData, slug, minPrice: Math.min(...prices), maxPrice: Math.max(...prices) };
      const product = id
        ? await tx.product.update({ where: { id }, data })
        : await tx.product.create({ data: { ...data, storeId: sid } });

      // 1. Tạo lại options & values (xoá cũ -> cascade xoá bảng nối)
      await tx.productOption.deleteMany({ where: { productId: product.id } });
      const valueIdMaps: Map<string, number>[] = [];
      for (const [i, o] of options.entries()) {
        const created = await tx.productOption.create({
          data: {
            productId: product.id, name: o.name.trim(), position: i,
            values: { create: o.values.map((value, j) => ({ value, position: j })) },
          },
          include: { values: true },
        });
        valueIdMaps.push(new Map(created.values.map((v) => [v.value, v.id])));
      }

      // 2. Đồng bộ variants: cập nhật theo id, tạo mới, xoá biến thể bị bỏ
      const existing = await tx.productVariant.findMany({ where: { productId: product.id } });
      const existingMap = new Map(existing.map((v) => [v.id, v]));
      const keepIds = variants.filter((v) => v.id && existingMap.has(v.id)).map((v) => v.id!);
      await tx.productVariant.deleteMany({ where: { productId: product.id, id: { notIn: keepIds } } });

      for (const [i, v] of variants.entries()) {
        const { id: vid, optionValues, ...vData } = v;
        const name = optionValues.length ? optionValues.join(' / ') : 'Mặc định';
        const optionLinks = optionValues.map((val, idx) => ({ optionValueId: valueIdMaps[idx].get(val)! }));
        const old = vid ? existingMap.get(vid) : undefined;
        const saved = old
          ? await tx.productVariant.update({
              where: { id: old.id },
              data: { ...vData, name, position: i, optionValues: { create: optionLinks } },
            })
          : await tx.productVariant.create({
              data: { ...vData, name, position: i, productId: product.id, storeId: sid, optionValues: { create: optionLinks } },
            });
        const change = saved.stock - (old?.stock ?? 0);
        if (change !== 0) {
          await tx.inventoryLog.create({
            data: {
              variantId: saved.id, change, stockAfter: saved.stock, userId,
              reason: old ? 'ADJUST' : 'IMPORT', note: old ? 'Cập nhật từ form sản phẩm' : 'Tồn kho ban đầu',
            },
          });
        }
      }
      return product.id;
    });
    return this.findById(productId);
  }

  async toggle(id: number, field: 'isActive' | 'isFeatured') {
    const p = await this.prisma.product.findFirstOrThrow({ where: { id, storeId: storeId() } });
    return this.prisma.product.update({ where: { id }, data: { [field]: !p[field] } });
  }

  async remove(id: number) {
    await this.prisma.product.findFirstOrThrow({ where: { id, storeId: storeId() } });
    return this.prisma.product.delete({ where: { id } });
  }
}
