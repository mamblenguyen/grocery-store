import {
  BadRequestException, Body, Controller, Delete, Get, Module, Param, ParseIntPipe, Patch, Post, Query, Req, Res, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { PartialType } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import { Auth, CurrentUser, SuperOnly } from '../common/decorators';
import { BillingModule } from '../billing/billing.module';
import { SuperModule } from '../super/super.module';
import { ApplicationDto, AppQuery, ApproveDto, NoteDto, OfflineSignDto, PaymentDto, PlanChangeDto, SignDto, UploadDocDto, VerifyDto } from './partners.dto';
import { PartnersService } from './partners.service';

class UpdateApplicationDto extends PartialType(ApplicationDto) {}

/** Đăng ký làm đối tác (người dùng đã đăng nhập) */
@Controller('partner')
export class PartnerController {
  constructor(private s: PartnersService) {}

  /** Thông tin công khai: pháp nhân sàn, bảng giá gói, danh mục giấy tờ */
  @Get('info') info() { return this.s.publicInfo(); }

  @Auth() @Get('application') mine(@CurrentUser('sub') uid: number) { return this.s.mine(uid); }
  @Auth() @Post('application') create(@CurrentUser('sub') uid: number, @Body() dto: ApplicationDto, @Req() req: Request) {
    return this.s.create(uid, dto, req.ip);
  }
  @Auth() @Patch('application') update(@CurrentUser('sub') uid: number, @Body() dto: UpdateApplicationDto) {
    // đồng ý điều khoản chỉ cần lúc tạo
    const { agreeTerms, agreePrivacy, ...rest } = dto;
    return this.s.update(uid, rest);
  }

  @Auth() @Post('application/documents')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 4 * 1024 * 1024 } }))
  upload(@CurrentUser('sub') uid: number, @Body() dto: UploadDocDto, @UploadedFile() file?: Express.Multer.File) {
    return this.s.uploadDoc(uid, dto.type, file);
  }
  @Auth() @Delete('application/documents/:id') removeDoc(@CurrentUser('sub') uid: number, @Param('id', ParseIntPipe) id: number) {
    return this.s.deleteDoc(uid, id);
  }
  /** Đổi gói / gói mua thêm trực tiếp (kể cả khi đang thẩm định, hoặc đã duyệt nhưng chưa ký) */
  @Auth() @Patch('application/plan') changePlan(@CurrentUser('sub') uid: number, @Body() dto: PlanChangeDto) { return this.s.changePlanMine(uid, dto); }
  @Auth() @Post('application/submit') submit(@CurrentUser('sub') uid: number) { return this.s.submit(uid); }
  @Auth() @Post('application/cancel') cancel(@CurrentUser('sub') uid: number) { return this.s.cancel(uid); }
  @Auth() @Post('application/sign') sign(@CurrentUser('sub') uid: number, @Body() dto: SignDto, @Req() req: Request) {
    return this.s.sign(uid, dto, req.ip, req.headers['user-agent']);
  }

  /** Xem file giấy tờ (chủ hồ sơ / super admin). Không cache, không cho trình duyệt đoán kiểu */
  @Auth() @Get('documents/:id') async doc(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { sub: number; role: string }, @Res() res: Response) {
    const d = await this.s.getDoc(id, user);
    res.set({
      'Content-Type': d.mimeType, 'Content-Length': String(d.size), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(d.fileName)}`,
    });
    res.end(Buffer.from(d.data));
  }
}

/** Super admin thẩm định hồ sơ đối tác */
@Controller('super/partner-applications')
@SuperOnly()
export class SuperPartnerController {
  constructor(private s: PartnersService) {}

  @Get() list(@Query() q: AppQuery) { return this.s.list(q); }
  @Get(':id') detail(@Param('id', ParseIntPipe) id: number) { return this.s.detail(id); }
  @Post(':id/request-info') requestInfo(@Param('id', ParseIntPipe) id: number, @Body() dto: NoteDto, @CurrentUser('sub') me: number) {
    return this.s.requestInfo(id, dto.note, me);
  }
  @Post(':id/reject') reject(@Param('id', ParseIntPipe) id: number, @Body() dto: NoteDto, @CurrentUser('sub') me: number) {
    return this.s.reject(id, dto.note, me);
  }
  @Post(':id/verify-identity') verify(@Param('id', ParseIntPipe) id: number, @Body() dto: VerifyDto, @CurrentUser('sub') me: number) {
    return this.s.verifyIdentity(id, dto, me);
  }
  @Post(':id/approve') approve(@Param('id', ParseIntPipe) id: number, @Body() dto: ApproveDto, @CurrentUser('sub') me: number) {
    return this.s.approve(id, dto, me);
  }
  @Patch(':id/plan') changePlan(@Param('id', ParseIntPipe) id: number, @Body() dto: PlanChangeDto, @CurrentUser('sub') me: number) {
    return this.s.changePlan(id, dto, me);
  }
  @Post(':id/offline-sign') offlineSign(@Param('id', ParseIntPipe) id: number, @Body() dto: OfflineSignDto, @CurrentUser('sub') me: number) {
    return this.s.offlineSign(id, dto, me);
  }
  @Post(':id/payment') payment(@Param('id', ParseIntPipe) id: number, @Body() dto: PaymentDto, @CurrentUser('sub') me: number) {
    return this.s.confirmPayment(id, dto, me);
  }
  @Post(':id/activate') activate(@Param('id', ParseIntPipe) id: number, @CurrentUser('sub') me: number) {
    if (!Number.isInteger(id)) throw new BadRequestException();
    return this.s.activate(id, me);
  }
}

@Module({ imports: [SuperModule, BillingModule], controllers: [PartnerController, SuperPartnerController], providers: [PartnersService] })
export class PartnersModule {}
