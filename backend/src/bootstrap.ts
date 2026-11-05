import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
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
  // Header bảo mật (cho phép frontend khác domain tải ảnh /uploads; tắt CSP vì đây là API JSON + Swagger UI)
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
  app.set('trust proxy', 1);
  app.enableCors({ origin: corsMatcher(), credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  // Tài liệu API: /api/docs (JSON: /api/docs-json)
  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Tạp Hoá Xanh API')
      .setDescription('API cho web cửa hàng, trang quản trị và app điện thoại. Bấm "Authorize" và dán accessToken từ /api/auth/login.')
      .setVersion('2.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('api/docs', app, doc, { swaggerOptions: { persistAuthorization: true } });
  return app;
}
