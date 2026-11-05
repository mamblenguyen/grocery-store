import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { Auth, CurrentUser } from '../common/decorators';
import { PaginationDto } from '../common/pagination.dto';
import { UsersService } from './users.service';

export class QueryUsersDto extends PaginationDto {
  @IsOptional() @IsEnum(Role) role?: Role;
}

export class UpdateUserDto {
  @IsOptional() @IsEnum(Role) role?: Role;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@Controller('admin/users')
@Auth(Role.ADMIN)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get() list(@Query() q: QueryUsersDto) {
    return this.users.list(q);
  }

  @Get(':id') detail(@Param('id', ParseIntPipe) id: number) {
    return this.users.detail(id);
  }

  @Patch(':id') update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser('sub') me: number,
  ) {
    return this.users.update(id, dto, me);
  }
}
