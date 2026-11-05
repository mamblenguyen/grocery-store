import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { InventoryReason, Prisma } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, NotEquals } from 'class-validator';
import { AdminOnly, CurrentUser } from '../common/decorators';
import { PaginationDto } from '../common/pagination.dto';
import { paged, paginate } from '../common/utils';
import { BadRequestException, Injectable } from '@nestjs/common';
import { storeId } from '../common/tenant';
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
    const threshold = this.prisma.productVariant.fields.lowStockThreshold;
    const where: Prisma.ProductVariantWhereInput = {
      ...(q.filter === 'low' && { stock: { gt: 0, lte: threshold } }),
      ...(q.filter === 'out' && { stock: { lte: 0 } }),
      storeId: storeId(),
      ...(q.search && {
        OR: [
          { sku: { contains: q.search } },
          { name: { contains: q.search } },
          { product: { name: { contains: q.search } } },
        ],
      }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.productVariant.findMany({
        where, skip, take,
        orderBy: [{ stock: 'asc' }, { product: { name: 'asc' } }],
        include: { product: { select: { id: true, name: true, thumbnail: true } } },
      }),
      this.prisma.productVariant.count({ where }),
    ]);
    const items = rows.map((v) => ({
      id: v.id, sku: v.sku, name: v.name, stock: v.stock, lowStockThreshold: v.lowStockThreshold,
      price: v.price, costPrice: v.costPrice, isActive: v.isActive,
      productId: v.product.id, productName: v.product.name, thumbnail: v.product.thumbnail,
    }));
    return paged(items, total, page, limit);
  }

  async logs(q: QueryLogsDto) {
    const { skip, take, page, limit } = paginate(q.page, q.limit);
    const where: Prisma.InventoryLogWhereInput = {
      variant: { storeId: storeId() },
      ...(q.variantId && { variantId: q.variantId }),
      ...(q.reason && { reason: q.reason }),
      ...(q.search && {
        OR: [
          { variant: { sku: { contains: q.search }, storeId: storeId() } },
          { variant: { product: { name: { contains: q.search } } } },
          { note: { contains: q.search } },
          { document: { code: { contains: q.search } } },
        ],
      }),
    };
    const [items, total] = await Promise.all([
      this.prisma.inventoryLog.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: {
          variant: { select: { sku: true, name: true, product: { select: { name: true } } } },
          user: { select: { fullName: true } },
          document: { select: { id: true, code: true } },
        },
      }),
      this.prisma.inventoryLog.count({ where }),
    ]);
    return paged(items, total, page, limit);
  }

  async adjust(dto: AdjustStockDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const v = await tx.productVariant.findFirstOrThrow({ where: { id: dto.variantId, storeId: storeId() } });
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
