import {
  BadRequestException, Body, Controller, Delete, Get, Injectable, Module, Param, ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { AdminOnly, Auth, CurrentUser } from '../common/decorators';
import { PaginationDto } from '../common/pagination.dto';
import { paged, paginate } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';

class ReviewDto {
  @IsInt() @Min(1) @Max(5) rating: number;
  @IsOptional() @IsString() @MaxLength(2000) comment?: string;
}

class QueryReviewsDto extends PaginationDto {
  @IsOptional() @IsInt() @Min(1) @Max(5) rating?: number;
  @IsOptional() @IsIn(['visible', 'hidden']) status?: string;
}

const userSelect = { select: { id: true, fullName: true } } as const;

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  /** Tính lại điểm trung bình (chỉ đánh giá đang hiển thị) */
  private async recompute(productId: number, tx: Prisma.TransactionClient = this.prisma) {
    const agg = await tx.review.aggregate({ where: { productId, isVisible: true }, _avg: { rating: true }, _count: true });
    await tx.product.update({
      where: { id: productId },
      data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count },
    });
  }

  async listForProduct(productId: number, page?: number, limit?: number) {
    const p = paginate(page, limit ?? 10);
    const where = { productId, isVisible: true };
    const [items, total, dist] = await Promise.all([
      this.prisma.review.findMany({ where, orderBy: { createdAt: 'desc' }, skip: p.skip, take: p.take, include: { user: userSelect } }),
      this.prisma.review.count({ where }),
      this.prisma.review.groupBy({ by: ['rating'], where, _count: true }),
    ]);
    const distribution = Object.fromEntries([5, 4, 3, 2, 1].map((r) => [r, dist.find((d) => d.rating === r)?._count ?? 0]));
    return { ...paged(items, total, p.page, p.limit), distribution };
  }

  /** Trạng thái của người dùng hiện tại: đã mua chưa, đã đánh giá chưa */
  async myStatus(productId: number, userId: number) {
    const [purchased, review] = await Promise.all([this.hasPurchased(productId, userId), this.prisma.review.findUnique({ where: { productId_userId: { productId, userId } } })]);
    return { canReview: purchased, review };
  }

  private async hasPurchased(productId: number, userId: number) {
    const n = await this.prisma.orderItem.count({ where: { productId, order: { userId, status: 'COMPLETED' } } });
    return n > 0;
  }

  async upsert(productId: number, userId: number, dto: ReviewDto) {
    if (!(await this.hasPurchased(productId, userId)))
      throw new BadRequestException('Bạn chỉ có thể đánh giá sản phẩm đã mua (đơn hàng đã hoàn thành)');
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.review.upsert({
        where: { productId_userId: { productId, userId } },
        create: { productId, userId, ...dto },
        update: { ...dto },
        include: { user: userSelect },
      });
      await this.recompute(productId, tx);
      return r;
    });
  }

  async adminList(q: QueryReviewsDto) {
    const { skip, take, page, limit } = paginate(q.page, q.limit);
    const where: Prisma.ReviewWhereInput = {
      ...(q.rating && { rating: q.rating }),
      ...(q.status && { isVisible: q.status === 'visible' }),
      ...(q.search && { OR: [{ comment: { contains: q.search } }, { product: { name: { contains: q.search } } }, { user: { fullName: { contains: q.search } } }] }),
    };
    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, fullName: true, email: true } }, product: { select: { id: true, name: true, slug: true, thumbnail: true } } },
      }),
      this.prisma.review.count({ where }),
    ]);
    return paged(items, total, page, limit);
  }

  async setVisible(id: number, isVisible: boolean) {
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.review.update({ where: { id }, data: { isVisible } });
      await this.recompute(r.productId, tx);
      return r;
    });
  }

  async remove(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.review.delete({ where: { id } });
      await this.recompute(r.productId, tx);
      return r;
    });
  }
}

@Controller('products/:productId/reviews')
export class ReviewsController {
  constructor(private service: ReviewsService) {}

  @Get() list(@Param('productId', ParseIntPipe) productId: number, @Query() q: PaginationDto) {
    return this.service.listForProduct(productId, q.page, q.limit);
  }

  @Auth() @Get('me') me(@Param('productId', ParseIntPipe) productId: number, @CurrentUser('sub') userId: number) {
    return this.service.myStatus(productId, userId);
  }

  @Auth() @Post() upsert(@Param('productId', ParseIntPipe) productId: number, @CurrentUser('sub') userId: number, @Body() dto: ReviewDto) {
    return this.service.upsert(productId, userId, dto);
  }
}

class VisibleDto {
  @IsBoolean() isVisible: boolean;
}

@Controller('admin/reviews')
@AdminOnly()
export class AdminReviewsController {
  constructor(private service: ReviewsService) {}

  @Get() list(@Query() q: QueryReviewsDto) {
    return this.service.adminList(q);
  }

  @Patch(':id') visible(@Param('id', ParseIntPipe) id: number, @Body() dto: VisibleDto) {
    return this.service.setVisible(id, dto.isVisible);
  }

  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

@Module({ controllers: [ReviewsController, AdminReviewsController], providers: [ReviewsService] })
export class ReviewsModule {}
