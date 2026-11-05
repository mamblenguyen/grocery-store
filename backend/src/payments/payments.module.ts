import { Body, Controller, Get, Ip, Module, Post, Query } from '@nestjs/common';
import { IsInt } from 'class-validator';
import { Auth, CurrentUser } from '../common/decorators';
import { PaymentsService } from './payments.service';
import { VNP_MESSAGES } from './vnpay';

class CreateVnpayDto {
  @IsInt() orderId: number;
}

@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  /** Khách tạo link thanh toán VNPay cho đơn của mình */
  @Auth() @Post('vnpay/create')
  create(@Body() dto: CreateVnpayDto, @CurrentUser('sub') userId: number, @Ip() ip: string) {
    return this.payments.createVnpayUrl(dto.orderId, userId, ip);
  }

  /** Trang /payment/vnpay-return của frontend gọi endpoint này với toàn bộ query VNPay trả về */
  @Get('vnpay/return')
  async return(@Query() query: Record<string, string>) {
    const r = await this.payments.handleVnpayResult(query);
    const ok = r.RspCode === '00' || r.RspCode === '02';
    return {
      valid: ok,
      success: ok && 'success' in r ? !!r.success : false,
      orderId: 'orderId' in r ? r.orderId : null,
      message: r.RspCode === '97' ? 'Chữ ký không hợp lệ' : VNP_MESSAGES[query.vnp_ResponseCode] ?? r.Message,
    };
  }

  /** IPN: VNPay gọi server-to-server (cấu hình URL này trên merchant portal VNPay) */
  @Get('vnpay/ipn')
  async ipn(@Query() query: Record<string, string>) {
    const { RspCode, Message } = await this.payments.handleVnpayResult(query);
    return { RspCode, Message };
  }
}

@Module({ controllers: [PaymentsController], providers: [PaymentsService], exports: [PaymentsService] })
export class PaymentsModule {}
