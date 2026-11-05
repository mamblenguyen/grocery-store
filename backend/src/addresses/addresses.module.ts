import { Body, Controller, Delete, Get, Injectable, Module, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { Auth, CurrentUser } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

class AddressDto {
  @IsOptional() @IsString() label?: string;
  @IsString() @MinLength(2) fullName: string;
  @IsString() @Matches(/^[0-9+\s]{9,15}$/, { message: 'Số điện thoại không hợp lệ' }) phone: string;
  @IsString() @MinLength(5) address: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

@Injectable()
export class AddressesService {
  constructor(private prisma: PrismaService) {}

  list(userId: number) {
    return this.prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
  }

  async save(userId: number, dto: AddressDto, id?: number) {
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.address.count({ where: { userId } });
      const isDefault = dto.isDefault || count === 0 || (id === undefined ? false : undefined);
      if (dto.isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      if (id) {
        await tx.address.findFirstOrThrow({ where: { id, userId } });
        return tx.address.update({ where: { id }, data: { ...dto, ...(isDefault !== undefined && { isDefault }) } });
      }
      return tx.address.create({ data: { ...dto, userId, isDefault: !!isDefault } });
    });
  }

  async remove(userId: number, id: number) {
    const a = await this.prisma.address.findFirstOrThrow({ where: { id, userId } });
    await this.prisma.address.delete({ where: { id } });
    // Xoá địa chỉ mặc định → chọn địa chỉ mới nhất làm mặc định
    if (a.isDefault) {
      const next = await this.prisma.address.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
      if (next) await this.prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
    return { success: true };
  }
}

@Controller('addresses')
@Auth()
export class AddressesController {
  constructor(private service: AddressesService) {}

  @Get() list(@CurrentUser('sub') userId: number) {
    return this.service.list(userId);
  }

  @Post() create(@CurrentUser('sub') userId: number, @Body() dto: AddressDto) {
    return this.service.save(userId, dto);
  }

  @Patch(':id') update(@CurrentUser('sub') userId: number, @Param('id', ParseIntPipe) id: number, @Body() dto: AddressDto) {
    return this.service.save(userId, dto, id);
  }

  @Delete(':id') remove(@CurrentUser('sub') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(userId, id);
  }
}

@Module({ controllers: [AddressesController], providers: [AddressesService] })
export class AddressesModule {}
