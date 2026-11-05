import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/** Chuyển lỗi Prisma thành HTTP response dễ hiểu */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(e: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const map: Record<string, [number, string]> = {
      P2002: [HttpStatus.CONFLICT, `Giá trị đã tồn tại: ${(e.meta?.target as string[] | undefined)?.join(', ') ?? ''}`],
      P2025: [HttpStatus.NOT_FOUND, 'Không tìm thấy dữ liệu'],
      P2003: [HttpStatus.BAD_REQUEST, 'Dữ liệu liên kết không hợp lệ hoặc đang được sử dụng'],
    };
    const [statusCode, message] = map[e.code] ?? [HttpStatus.INTERNAL_SERVER_ERROR, 'Lỗi cơ sở dữ liệu'];
    res.status(statusCode).json({ statusCode, message, code: e.code });
  }
}
