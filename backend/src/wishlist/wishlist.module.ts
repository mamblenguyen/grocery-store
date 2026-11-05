import { Controller, Delete, Get, Module, Param, ParseIntPipe, Post } from '@nestjs/common';
import { Auth, CurrentUser } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { toImages } from '../products/products.service';

@Controller('wishlist')
@Auth()
export class WishlistController {
  constructor(private prisma: PrismaService) {}

  @Get() async list(@CurrentUser('sub') userId: number) {
    const rows = await this.prisma.wishlistItem.findMany({
      where: { userId, product: { isActive: true, store: { status: 'ACTIVE' } } },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
            store: { select: { id: true, slug: true, name: true } },
            variants: { where: { isActive: true }, orderBy: { position: 'asc' } },
          },
        },
      },
    });
    return rows.map((r) => ({ ...r.product, images: toImages(r.product.images) }));
  }

  @Get('ids') async ids(@CurrentUser('sub') userId: number) {
    const rows = await this.prisma.wishlistItem.findMany({ where: { userId }, select: { productId: true } });
    return rows.map((r) => r.productId);
  }

  @Post(':productId') async add(@CurrentUser('sub') userId: number, @Param('productId', ParseIntPipe) productId: number) {
    await this.prisma.wishlistItem.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
    return { success: true };
  }

  @Delete(':productId') async remove(@CurrentUser('sub') userId: number, @Param('productId', ParseIntPipe) productId: number) {
    await this.prisma.wishlistItem.deleteMany({ where: { userId, productId } });
    return { success: true };
  }
}

@Module({ controllers: [WishlistController] })
export class WishlistModule {}
