import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.module';
import { SettingsService } from '../settings/settings.service';
import { vnpBuildUrl, vnpDate, vnpVerify, VNP_MESSAGES } from './vnpay';

const VNP_URL = () => process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const RETURN_URL = () => process.env.VNPAY_RETURN_URL || 'http://localhost:3000/payment/vnpay-return';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService, private settings: SettingsService, private notifications: NotificationsService) {}

  /** Tạo link thanh toán VNPay cho đơn hàng của chính khách */
  async createVnpayUrl(orderId: number, userId: number, ip: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== userId) throw new NotFoundException('Không tìm thấy đơn hàng');
    const s = await this.settings.getPublic(order.storeId);
    if (!s.payment.vnpay) throw new BadRequestException('Cửa hàng chưa bật thanh toán VNPay');
    if (order.paymentStatus === 'PAID') throw new BadRequestException('Đơn hàng đã được thanh toán');
    if (order.status === 'CANCELLED') throw new BadRequestException('Đơn hàng đã bị huỷ');

    const txnRef = `${order.code}-${Date.now().toString().slice(-6)}`;
    await this.prisma.$transaction([
      this.prisma.paymentTransaction.create({
        data: { orderId: order.id, provider: 'VNPAY', amount: order.total, txnRef },
      }),
      // khách có thể đổi từ COD/chuyển khoản sang VNPay
      this.prisma.order.update({ where: { id: order.id }, data: { paymentMethod: 'VNPAY' } }),
    ]);

    const now = new Date();
    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: process.env.VNPAY_TMN_CODE!,
      vnp_Amount: String(order.total * 100),
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Thanh toan don hang ${order.code}`,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: RETURN_URL(),
      vnp_IpAddr: (ip || '127.0.0.1').replace('::ffff:', '').replace('::1', '127.0.0.1'),
      vnp_CreateDate: vnpDate(now),
      vnp_ExpireDate: vnpDate(new Date(now.getTime() + 15 * 60 * 1000)),
    };
    return { paymentUrl: vnpBuildUrl(VNP_URL(), params, process.env.VNPAY_HASH_SECRET!), txnRef };
  }

  /**
   * Xử lý kết quả VNPay (dùng chung cho Return URL và IPN). Idempotent: gọi nhiều lần không cập nhật trùng.
   * Trả về mã theo chuẩn IPN của VNPay.
   */
  async handleVnpayResult(query: Record<string, string>) {
    if (!process.env.VNPAY_HASH_SECRET || !vnpVerify(query, process.env.VNPAY_HASH_SECRET))
      return { RspCode: '97', Message: 'Invalid signature' } as const;

    const txn = await this.prisma.paymentTransaction.findUnique({
      where: { txnRef: query.vnp_TxnRef },
      include: { order: true },
    });
    if (!txn) return { RspCode: '01', Message: 'Order not found' } as const;
    if (Number(query.vnp_Amount) !== txn.amount * 100) return { RspCode: '04', Message: 'Invalid amount', orderId: txn.orderId } as const;
    if (txn.status !== 'PENDING') return { RspCode: '02', Message: 'Order already confirmed', orderId: txn.orderId, success: txn.status === 'SUCCESS' } as const;

    const success = query.vnp_ResponseCode === '00' && query.vnp_TransactionStatus === '00';
    await this.prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.update({
        where: { id: txn.id },
        data: {
          status: success ? 'SUCCESS' : 'FAILED',
          transactionNo: query.vnp_TransactionNo,
          bankCode: query.vnp_BankCode,
          responseCode: query.vnp_ResponseCode,
          message: VNP_MESSAGES[query.vnp_ResponseCode] ?? `Mã lỗi ${query.vnp_ResponseCode}`,
          rawData: query as Prisma.InputJsonValue,
        },
      });
      if (success)
        await tx.order.update({
          where: { id: txn.orderId },
          data: {
            paymentStatus: 'PAID',
            paidAt: new Date(),
            // Đơn chờ xác nhận + đã thanh toán online → tự xác nhận
            ...(txn.order.status === 'PENDING' && { status: 'CONFIRMED' }),
          },
        });
    });
    if (success) {
      const o = txn.order;
      const data = { orderId: o.id, url: `/orders/${o.id}` };
      if (o.userId) this.notifications.notify([o.userId], { type: 'PAYMENT', title: 'Thanh toán thành công', body: `Đơn ${o.code} đã được thanh toán ${o.total.toLocaleString('vi-VN')}₫ qua VNPay`, data }).catch(() => {});
      this.notifications.notifyStaff(o.storeId, { type: 'PAYMENT', title: `💳 VNPay: ${o.code}`, body: `Đã nhận ${o.total.toLocaleString('vi-VN')}₫`, data: { ...data, url: `/admin/orders/${o.id}` } }).catch(() => {});
    }
    return { RspCode: '00', Message: 'Confirm Success', orderId: txn.orderId, success } as const;
  }

  /** Admin ghi nhận đã nhận tiền (chuyển khoản / tiền mặt) – tạo bản ghi giao dịch */
  async recordManualPayment(orderId: number, note?: string) {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    if (order.paymentStatus === 'PAID') return order;
    return this.prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.create({
        data: {
          orderId, provider: order.paymentMethod, amount: order.total, status: 'SUCCESS',
          txnRef: `${order.code}-M${Date.now().toString().slice(-6)}`, message: note ?? 'Xác nhận thủ công',
        },
      });
      return tx.order.update({ where: { id: orderId }, data: { paymentStatus: 'PAID', paidAt: new Date() } });
    });
  }

  listForOrder(orderId: number) {
    return this.prisma.paymentTransaction.findMany({ where: { orderId }, orderBy: { createdAt: 'desc' } });
  }
}
