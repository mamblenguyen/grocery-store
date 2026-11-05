import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { storeId } from '../common/tenant';
import { slugify } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './categories.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  findPublic() {
    return this.prisma.category.findMany({
      where: { storeId: storeId(), isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: { where: { isActive: true } } } } },
    });
  }

  findAll() {
    return this.prisma.category.findMany({
      where: { storeId: storeId() },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { parent: { select: { id: true, name: true } }, _count: { select: { products: true } } },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.category.findUniqueOrThrow({ where: { storeId_slug: { storeId: storeId(), slug } } });
  }

  /** Lấy danh mục thuộc cửa hàng hiện tại (404 nếu của cửa hàng khác) */
  private own(id: number) {
    return this.prisma.category.findFirstOrThrow({ where: { id, storeId: storeId() } });
  }

  private async ensureSlug(slug: string, excludeId?: number) {
    const exist = await this.prisma.category.findUnique({ where: { storeId_slug: { storeId: storeId(), slug } } });
    if (exist && exist.id !== excludeId) throw new ConflictException('Slug danh mục đã tồn tại');
  }

  private async checkParent(parentId?: number | null, selfId?: number) {
    if (!parentId) return;
    if (parentId === selfId) throw new BadRequestException('Danh mục cha không hợp lệ');
    await this.own(parentId);
  }

  async create(dto: CreateCategoryDto) {
    const slug = slugify(dto.slug || dto.name);
    await this.ensureSlug(slug);
    await this.checkParent(dto.parentId);
    return this.prisma.category.create({ data: { ...dto, slug, storeId: storeId() } });
  }

  async update(id: number, dto: UpdateCategoryDto) {
    const current = await this.own(id);
    await this.checkParent(dto.parentId, id);
    const data: any = { ...dto };
    if (dto.slug !== undefined || dto.name !== undefined) {
      data.slug = slugify(dto.slug || current.slug);
      await this.ensureSlug(data.slug, id);
    }
    return this.prisma.category.update({ where: { id }, data });
  }

  async remove(id: number) {
    await this.own(id);
    return this.prisma.category.delete({ where: { id } });
  }
}
