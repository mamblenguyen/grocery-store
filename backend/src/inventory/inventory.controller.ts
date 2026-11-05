import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { InventoryReason, Prisma } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, NotEquals } from 'class-validator';
import { AdminOnly, CurrentUser } from '../common/decorators';
import { PaginationDto } from '../common/pagination.dto';
import { paged, paginate } from '../common/utils';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class AdjustStockDto {
  @IsInt() variantId: number;
  /** Số lượng thay đổi: dương = nhập, âm = xuất */
  @IsInt() @NotEquals(0) change: number;
  @IsOptional() @IsIn(['IMPORT', 'ADJUST']) reason?: 'IMPORT' | 'ADJUST';
  @IsOptional() @IsString() note?: string;
}

export class QueryStockDto extends PaginationDto {
  @IsOptional() @IsIn(['all', 'low', 'out']) filter?: string;
}

export class QueryLogsDto extends PaginationDto {
  @IsOptional() @IsInt() variantId?: number;
  @IsOptional() @IsEnum(InventoryReason) reason?: InventoryReason;
}

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async stock(q: QueryStockDto) {
    const { skip, take, page, limit } = paginate(q.page, q.limit);
    const search = q.search ? `%${q.search}%` : null;
    // So sánh stock <= lowStockThreshold giữa 2 cột -> dùng raw SQL
    const cond = Prisma.sql`
      WHERE 1=1
      ${q.filter === 'low' ? Prisma.sql`AND v.stock > 0 AND v.stock <= v."lowStockThreshold"` : Prisma.empty}
      ${q.filter === 'out' ? Prisma.sql`AND v.stock <= 0` : Prisma.empty}
      ${search ? Prisma.sql`AND (p.name ILIKE ${search} OR v.sku ILIKE ${search} OR v.name ILIKE ${search})` : Prisma.empty}`;
    const items = await this.prisma.$queryRaw<any[]>`
      SELECT v.id, v.sku, v.name, v.stock, v."lowStockThreshold", v.price, v."costPrice", v."isActive",
             p.id AS "productId", p.name AS "productName", p.thumbnail
      FROM "ProductVariant" v JOIN "Product" p ON p.id = v."productId"
      ${cond}
      ORDER BY v.stock ASC, p.name ASC
      LIMIT ${take} OFFSET ${skip}`;
    const [{ count }] = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM "ProductVariant" v JOIN "Product" p ON p.id = v."productId" ${cond}`;
    return paged(items, Number(count), page, limit);
  }

  async logs(q: QueryLogsDto) {
    const { skip, take, page, limit } = paginate(q.page, q.limit);
    const where: Prisma.InventoryLogWhereInput = {
      ...(q.variantId && { variantId: q.variantId }),
      ...(q.reason && { reason: q.reason }),
      ...(q.search && {
        OR: [
          { variant: { sku: { contains: q.search, mode: 'insensitive' } } },
          { variant: { product: { name: { contains: q.search, mode: 'insensitive' } } } },
          { note: { contains: q.search, mode: 'insensitive' } },
        ],
      }),
    };
    const [items, total] = await Promise.all([
      this.prisma.inventoryLog.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: {
          variant: { select: { sku: true, name: true, product: { select: { name: true } } } },
          user: { select: { fullName: true } },
        },
      }),
      this.prisma.inventoryLog.count({ where }),
    ]);
    return paged(items, total, page, limit);
  }

  async adjust(dto: AdjustStockDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const v = await tx.productVariant.findUniqueOrThrow({ where: { id: dto.variantId } });
      if (v.stock + dto.change < 0) throw new BadRequestException(`Tồn kho hiện tại chỉ có ${v.stock}`);
      const updated = await tx.productVariant.update({ where: { id: v.id }, data: { stock: { increment: dto.change } } });
      await tx.inventoryLog.create({
        data: {
          variantId: v.id, change: dto.change, stockAfter: updated.stock, userId,
          reason: dto.reason ?? (dto.change > 0 ? 'IMPORT' : 'ADJUST'), note: dto.note,
        },
      });
      return updated;
    });
  }
}

@Controller('admin/inventory')
@AdminOnly()
export class InventoryController {
  constructor(private service: InventoryService) {}

  @Get() stock(@Query() q: QueryStockDto) {
    return this.service.stock(q);
  }

  @Get('logs') logs(@Query() q: QueryLogsDto) {
    return this.service.logs(q);
  }

  @Post('adjust') adjust(@Body() dto: AdjustStockDto, @CurrentUser('sub') userId: number) {
    return this.service.adjust(dto, userId);
  }
}
