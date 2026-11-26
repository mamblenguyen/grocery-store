import { Body, Controller, Delete, Get, Module, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { AdminOnly, CurrentUser } from '../common/decorators';
import { CancelDocDto, QueryStockDocsDto, SaveStockDocDto, SupplierDto } from './stock.dto';
import { StockService } from './stock.service';

@Controller('admin/stock')
@AdminOnly()
export class StockController {
  constructor(private service: StockService) {}

  /** Tra mã vạch / SKU / QR */
  @Get('lookup') lookup(@Query('code') code: string) {
    return this.service.lookup(code);
  }

  @Get('variants/by-ids') byIds(@Query('ids') ids = '') {
    return this.service.byIds(ids.split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 500));
  }

  @Get('variants') variants(
    @Query('search') search = '',
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('sellable') sellable?: string,
  ) {
    return this.service.searchVariants(search.trim(), {
      limit: Number(limit) || 20,
      categoryId: Number(categoryId) || undefined,
      sellable: sellable === '1' || sellable === 'true',
    });
  }

  @Get('expiring') expiring(@Query('days') days?: string) {
    return this.service.expiring(Math.min(365, Math.max(1, Number(days) || 30)));
  }

  @Get('summary') summary() {
    return this.service.summary();
  }

  @Get('documents') list(@Query() q: QueryStockDocsDto) {
    return this.service.list(q);
  }

  @Get('documents/:id') detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post('documents') create(@Body() dto: SaveStockDocDto, @CurrentUser('sub') userId: number) {
    return this.service.create(dto, userId);
  }

  @Put('documents/:id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: SaveStockDocDto, @CurrentUser('sub') userId: number) {
    return this.service.update(id, dto, userId);
  }

  @Post('documents/:id/complete') complete(@Param('id', ParseIntPipe) id: number, @CurrentUser('sub') userId: number) {
    return this.service.complete(id, userId);
  }

  @Post('documents/:id/cancel') cancel(@Param('id', ParseIntPipe) id: number, @Body() dto: CancelDocDto, @CurrentUser('sub') userId: number) {
    return this.service.cancel(id, dto.reason, userId);
  }

  @Delete('documents/:id') remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

@Controller('admin/suppliers')
@AdminOnly()
export class SuppliersController {
  constructor(private service: StockService) {}

  @Get() list(@Query('search') search?: string) {
    return this.service.suppliers(search);
  }

  @Post() create(@Body() dto: SupplierDto) {
    return this.service.saveSupplier(dto);
  }

  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: SupplierDto) {
    return this.service.saveSupplier(dto, id);
  }

  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeSupplier(id);
  }
}

@Module({ controllers: [StockController, SuppliersController], providers: [StockService] })
export class StockModule {}
