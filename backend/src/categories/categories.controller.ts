import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { AdminOnly } from '../common/decorators';
import { CreateCategoryDto, UpdateCategoryDto } from './categories.dto';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private service: CategoriesService) {}

  @Get() list() {
    return this.service.findPublic();
  }

  @Get(':slug') detail(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }
}

@Controller('admin/categories')
@AdminOnly()
export class AdminCategoriesController {
  constructor(private service: CategoriesService) {}

  @Get() list() {
    return this.service.findAll();
  }

  @Post() create(@Body() dto: CreateCategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
