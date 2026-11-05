import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/** MySQL trả tên index (vd "ProductVariant_sku_key"), PostgreSQL trả mảng cột */
function uniqueTarget(t: unknown) {
  if (Array.isArray(t)) return t.join(', ');
  if (typeof t === 'string') return t.replace(/^[A-Za-z]+_/, '').replace(/_key$/, '');
  return '';
}

/** Chuyển lỗi Prisma thành HTTP response dễ hiểu */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(e: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const map: Record<string, [number, string]> = {
      P2002: [HttpStatus.CONFLICT, `Giá trị đã tồn tại: ${uniqueTarget(e.meta?.target)}`],
      P2025: [HttpStatus.NOT_FOUND, 'Không tìm thấy dữ liệu'],
      P2003: [HttpStatus.BAD_REQUEST, 'Dữ liệu liên kết không hợp lệ hoặc đang được sử dụng'],
    };
    const [statusCode, message] = map[e.code] ?? [HttpStatus.INTERNAL_SERVER_ERROR, 'Lỗi cơ sở dữ liệu'];
    res.status(statusCode).json({ statusCode, message, code: e.code });
  }
}
