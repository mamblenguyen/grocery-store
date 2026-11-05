import { BadRequestException, Controller, Module, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { AdminOnly } from '../common/decorators';

const UPLOAD_DIR = join(process.cwd(), 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

@Controller('admin/upload')
@AdminOnly()
export class UploadController {
  /** Upload tối đa 10 ảnh, field name: "files". Trả về danh sách URL */
  @Post()
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) =>
          cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname).toLowerCase()}`),
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)
          ? cb(null, true)
          : cb(new BadRequestException('Chỉ chấp nhận ảnh JPG, PNG, WEBP, GIF'), false),
    }),
  )
  upload(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('Chưa chọn file');
    return { urls: files.map((f) => `/uploads/${f.filename}`) };
  }
}

@Module({ controllers: [UploadController] })
export class UploadModule {}
