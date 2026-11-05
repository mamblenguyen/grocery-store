import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { slugify } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './categories.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  findPublic() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: { where: { isActive: true } } } } },
    });
  }

  findAll() {
    return this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { parent: { select: { id: true, name: true } }, _count: { select: { products: true } } },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.category.findUniqueOrThrow({ where: { slug } });
  }

  private async ensureSlug(slug: string, excludeId?: number) {
    const exist = await this.prisma.category.findUnique({ where: { slug } });
    if (exist && exist.id !== excludeId) throw new ConflictException('Slug danh mục đã tồn tại');
  }

  async create(dto: CreateCategoryDto) {
    const slug = slugify(dto.slug || dto.name);
    await this.ensureSlug(slug);
    return this.prisma.category.create({ data: { ...dto, slug } });
  }

  async update(id: number, dto: UpdateCategoryDto) {
    if (dto.parentId === id) throw new BadRequestException('Danh mục cha không hợp lệ');
    const data: any = { ...dto };
    if (dto.slug !== undefined || dto.name !== undefined) {
      const current = await this.prisma.category.findUniqueOrThrow({ where: { id } });
      data.slug = slugify(dto.slug || current.slug);
      await this.ensureSlug(data.slug, id);
    }
    return this.prisma.category.update({ where: { id }, data });
  }

  remove(id: number) {
    return this.prisma.category.delete({ where: { id } });
  }
}
