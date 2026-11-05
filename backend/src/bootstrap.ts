import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';

/**
 * CORS_ORIGIN: danh sách phân cách bởi dấu phẩy, hỗ trợ wildcard "*"
 * vd: "https://grocery-web.vercel.app,https://grocery-web-*.vercel.app"
 */
function corsMatcher() {
  const patterns = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((p) => new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$'));
  return (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) =>
    cb(null, !origin || patterns.some((r) => r.test(origin)));
}

/** Tạo Nest app dùng chung cho server thường (main.ts) và Vercel serverless (api/index.js) */
export async function createApp() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: process.env.VERCEL ? ['error', 'warn'] : undefined,
  });
  app.setGlobalPrefix('api');
  app.enableCors({ origin: corsMatcher(), credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  return app;
}
