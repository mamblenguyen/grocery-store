import { BadRequestException, Controller, Module, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { put } from '@vercel/blob';
import { mkdirSync, writeFileSync } from 'fs';
import { memoryStorage } from 'multer';
import { extname, join } from 'path';
import { AdminOnly } from '../common/decorators';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

/** Đuôi file lấy theo mimetype (không tin tên gốc do người dùng gửi lên) */
const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

@Controller('admin/upload')
@AdminOnly()
export class UploadController {
  /**
   * Upload tối đa 10 ảnh, field name: "files". Trả về danh sách URL.
   * - Có BLOB_READ_WRITE_TOKEN (Vercel): lưu lên Vercel Blob, trả URL tuyệt đối
   * - Không có (local): lưu vào ./uploads, trả "/uploads/<file>"
   */
  @Post()
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memoryStorage(),
      // Vercel giới hạn body request 4.5MB
      limits: { fileSize: 4 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        MIME_EXT[file.mimetype] && ALLOWED_EXT.includes(extname(file.originalname).toLowerCase())
          ? cb(null, true)
          : cb(new BadRequestException('Chỉ chấp nhận ảnh JPG, PNG, WEBP, GIF'), false),
    }),
  )
  async upload(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('Chưa chọn file');
    const urls: string[] = [];
    for (const f of files) {
      const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${MIME_EXT[f.mimetype]}`;
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blob = await put(`products/${name}`, f.buffer, { access: 'public', contentType: f.mimetype });
        urls.push(blob.url);
      } else {
        mkdirSync(UPLOAD_DIR, { recursive: true });
        writeFileSync(join(UPLOAD_DIR, name), f.buffer);
        urls.push(`/uploads/${name}`);
      }
    }
    return { urls };
  }
}

@Module({ controllers: [UploadController] })
export class UploadModule {}
