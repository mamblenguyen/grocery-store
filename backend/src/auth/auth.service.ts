import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { MailService } from '../mail/mail.service';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto, ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto, UpdateProfileDto } from './dto/auth.dto';

export function toPublicUser(u: User) {
  const { password, resetTokenHash, resetTokenExp, ...rest } = u;
  return rest;
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService, private mail: MailService) {}

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
    const u = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: { store: { include: { plan: { select: { id: true, name: true, maxProducts: true, maxStaff: true } } } } },
    });
    const { store, ...rest } = u;
    return {
      ...toPublicUser(rest as any),
      store: store && {
        id: store.id, slug: store.slug, name: store.name, status: store.status, logo: store.logo,
        planExpiresAt: store.planExpiresAt, plan: store.plan,
        daysLeft: store.planExpiresAt ? Math.ceil((store.planExpiresAt.getTime() - Date.now()) / 86400000) : null,
      },
    };
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

  /** Luôn trả cùng một thông báo để không lộ email nào tồn tại */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (user?.isActive) {
      const token = randomBytes(32).toString('hex');
      await this.prisma.user.update({
        where: { id: user.id },
        data: { resetTokenHash: sha256(token), resetTokenExp: new Date(Date.now() + 30 * 60 * 1000) },
      });
      const link = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
      await this.mail.send(user.email, 'Đặt lại mật khẩu', `<p>Xin chào ${user.fullName},</p><p>Nhấn vào liên kết sau để đặt lại mật khẩu (hiệu lực 30 phút):</p><p><a href="${link}">${link}</a></p><p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`);
    }
    return { message: 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({ where: { resetTokenHash: sha256(dto.token), resetTokenExp: { gt: new Date() } } });
    if (!user) throw new BadRequestException('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(dto.newPassword, 10), resetTokenHash: null, resetTokenExp: null },
    });
    return { success: true };
  }
}
