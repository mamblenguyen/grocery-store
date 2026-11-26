import { Global, Logger, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { AuthGuard } from '../common/auth.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const MIN_JWT_SECRET_LENGTH = 32;

/**
 * Production: bắt buộc JWT_SECRET >= 32 ký tự, thiếu thì throw để app dừng.
 * Dev: chỉ cảnh báo; nếu thiếu thì sinh secret ngẫu nhiên cho tiến trình này
 * (token sẽ mất hiệu lực khi restart) thay vì dùng secret cố định đoán được.
 */
export function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const problem = !secret
    ? 'JWT_SECRET chưa được cấu hình'
    : secret.length < MIN_JWT_SECRET_LENGTH
      ? `JWT_SECRET quá ngắn (${secret.length} ký tự, cần tối thiểu ${MIN_JWT_SECRET_LENGTH})`
      : null;

  if (!problem) return secret!;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `${problem}. Đặt JWT_SECRET là chuỗi ngẫu nhiên dài (vd: openssl rand -hex 32) trước khi chạy production.`,
    );
  }

  const logger = new Logger('AuthModule');
  if (!secret) {
    logger.warn(`${problem} — dùng secret ngẫu nhiên tạm thời (token mất hiệu lực khi restart). KHÔNG dùng cho production.`);
    return randomBytes(32).toString('hex');
  }
  logger.warn(`${problem}. Production sẽ từ chối khởi động với secret này.`);
  return secret;
}

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: resolveJwtSecret(),
        signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  exports: [JwtModule, AuthGuard],
})
export class AuthModule {}
