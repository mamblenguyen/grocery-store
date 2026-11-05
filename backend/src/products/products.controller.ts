import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { AdminOnly, CurrentUser } from '../common/decorators';
import { QueryProductsDto, SaveProductDto } from './dto/product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private service: ProductsService) {}

  @Get() list(@Query() q: QueryProductsDto) {
    return this.service.list(q);
  }

  @Get('brands') brands() {
    return this.service.brands();
  }

  @Get(':slug') detail(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }
}

@Controller('admin/products')
@AdminOnly()
export class AdminProductsController {
  constructor(private service: ProductsService) {}

  @Get() list(@Query() q: QueryProductsDto) {
    return this.service.list(q, true);
  }

  @Get(':id') detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post() create(@Body() dto: SaveProductDto, @CurrentUser('sub') userId: number) {
    return this.service.save(dto, userId);
  }

  @Put(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: SaveProductDto, @CurrentUser('sub') userId: number) {
    return this.service.save(dto, userId, id);
  }

  @Patch(':id/toggle-active') toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.service.toggle(id, 'isActive');
  }

  @Patch(':id/toggle-featured') toggleFeatured(@Param('id', ParseIntPipe) id: number) {
    return this.service.toggle(id, 'isFeatured');
  }

  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
