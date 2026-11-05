import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto, LoginDto, RegisterDto, UpdateProfileDto } from './dto/auth.dto';

export function toPublicUser(u: User) {
  const { password, ...rest } = u;
  return rest;
}

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  private sign(u: User) {
    return {
      accessToken: this.jwt.sign({ sub: u.id, email: u.email, role: u.role }),
      user: toPublicUser(u),
    };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('Email đã được sử dụng');
    const user = await this.prisma.user.create({
      data: { ...dto, email, password: await bcrypt.hash(dto.password, 10) },
    });
    return this.sign(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(dto.password, user.password)))
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    if (!user.isActive) throw new UnauthorizedException('Tài khoản đã bị khóa');
    return this.sign(user);
  }

  async me(id: number) {
    return toPublicUser(await this.prisma.user.findUniqueOrThrow({ where: { id } }));
  }

  async updateProfile(id: number, dto: UpdateProfileDto) {
    return toPublicUser(await this.prisma.user.update({ where: { id }, data: dto }));
  }

  async changePassword(id: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    if (!(await bcrypt.compare(dto.currentPassword, user.password)))
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    await this.prisma.user.update({ where: { id }, data: { password: await bcrypt.hash(dto.newPassword, 10) } });
    return { success: true };
  }
}
