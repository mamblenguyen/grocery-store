import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PartnerAppStatus, Prisma } from '@prisma/client';
import { AddonChoice, BillingService } from '../billing/billing.service';
import { missingPlatformInfo, PlatformService } from '../common/platform';
import { paged, paginate, slugify } from '../common/utils';
import { AddressPartsDto, businessAddressData, storeAddressData } from '../geo/vn-address';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.module';
import { PrismaService } from '../prisma/prisma.service';
import { SuperService } from '../super/super.service';
import { buildContract, contractHash, PartnerContract } from './contract';
import { ApplicationDto, ApproveDto, OfflineSignDto, PaymentDto, PlanChangeDto, SignDto, VerifyDto } from './partners.dto';

/** Hồ sơ còn hiệu lực (chưa kết thúc) – mỗi tài khoản chỉ có 1 */
const OPEN: PartnerAppStatus[] = ['DRAFT', 'SUBMITTED', 'NEED_INFO', 'APPROVED'];
/** Đối tác được sửa hồ sơ / giấy tờ */
const EDITABLE: PartnerAppStatus[] = ['DRAFT', 'NEED_INFO'];

export const DOC_LABEL: Record<string, string> = {
  DKKD: 'Giấy chứng nhận đăng ký hộ kinh doanh / doanh nghiệp',
  CCCD_TRUOC: 'CCCD người đại diện – mặt trước',
  CCCD_SAU: 'CCCD người đại diện – mặt sau',
  ATTP: 'Giấy chứng nhận cơ sở đủ điều kiện ATTP / Bản cam kết ATTP',
  UY_QUYEN: 'Giấy uỷ quyền ký hợp đồng (nếu người ký không phải đại diện theo pháp luật / chủ hộ)',
  GP_RUOU: 'Giấy phép bán lẻ rượu (nếu kinh doanh rượu)',
  GP_THUOC_LA: 'Giấy phép bán lẻ sản phẩm thuốc lá (nếu kinh doanh thuốc lá)',
  NGAN_HANG: 'Xác nhận tài khoản ngân hàng đứng tên hộ / doanh nghiệp',
  KHAC: 'Giấy tờ khác',
};
export const REQUIRED_DOCS = ['DKKD', 'CCCD_TRUOC', 'CCCD_SAU'];
const MIME_OK = /^(image\/(jpeg|png|webp)|application\/pdf)$/;
const MAX_FILE = 4 * 1024 * 1024;

const docMeta = { id: true, type: true, fileName: true, mimeType: true, size: true, createdAt: true } satisfies Prisma.PartnerDocumentSelect;
const appInclude = {
  documents: { select: docMeta, orderBy: { createdAt: 'asc' } },
  plan: { select: { id: true, name: true, priceMonthly: true } },
  user: { select: { id: true, email: true, fullName: true, phone: true, role: true, storeId: true } },
  reviewedBy: { select: { id: true, fullName: true } },
  store: { select: { id: true, slug: true, name: true } },
} satisfies Prisma.PartnerApplicationInclude;

/** So sánh họ tên không phân biệt hoa thường / dấu / khoảng trắng */
const normName = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').replace(/\s+/g, ' ').trim().toLowerCase();
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

type History = { at: string; by: string; action: string; note?: string }[];

@Injectable()
export class PartnersService {
  constructor(
    private prisma: PrismaService,
    private superService: SuperService,
    private mail: MailService,
    private notifications: NotificationsService,
    private platform: PlatformService,
    private billing: BillingService,
  ) {}

  private appUrl(path: string) {
    return `${(process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')}${path}`;
  }

  private log(app: { history: Prisma.JsonValue | null }, by: string, action: string, note?: string) {
    const h = (Array.isArray(app.history) ? app.history : []) as History;
    return [...h, { at: new Date().toISOString(), by, action, ...(note && { note }) }] as unknown as Prisma.InputJsonValue;
  }

  private safe(fn: () => Promise<unknown>) {
    fn().catch(() => {});
  }

  private async notifyApplicant(app: { userId: number; representativeEmail: string; code: string }, title: string, html: string) {
    this.safe(() => this.notifications.notify([app.userId], { type: 'PARTNER', title, body: `Hồ sơ ${app.code}`, data: { url: '/partner/register' } }));
    this.safe(async () => this.mail.send(app.representativeEmail, `[${(await this.platform.get()).name}] ${title} – hồ sơ ${app.code}`,
      `${html}<p>Xem chi tiết: <a href="${this.appUrl('/partner/register')}">${this.appUrl('/partner/register')}</a></p>`));
  }

  // ───────────── Công khai ─────────────
  async publicInfo() {
    const p = await this.platform.get();
    const plans = await this.prisma.plan.findMany({
      where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { priceMonthly: 'asc' }],
      select: { id: true, code: true, name: true, description: true, priceMonthly: true, maxProducts: true, maxStaff: true, maxOrdersMonthly: true, maxCampaignsMonthly: true },
    });
    const addonPacks = await this.billing.listPacks(true);
    return {
      addonPacks,
      platform: { name: p.name, legalName: p.legalName, taxCode: p.taxCode, address: p.address, phone: p.phone, email: p.email, ecommerceRegistration: p.ecommerceRegistration, bank: p.bank },
      plans,
      documents: Object.entries(DOC_LABEL).map(([type, label]) => ({ type, label, required: REQUIRED_DOCS.includes(type) })),
    };
  }

  // ───────────── Người đăng ký ─────────────
  private async myOpen(userId: number) {
    const app = await this.prisma.partnerApplication.findFirst({ where: { userId, status: { in: OPEN } }, orderBy: { createdAt: 'desc' } });
    if (!app) throw new NotFoundException('Bạn chưa có hồ sơ đăng ký đối tác đang xử lý');
    return app;
  }

  private async myEditable(userId: number) {
    const app = await this.myOpen(userId);
    if (!EDITABLE.includes(app.status)) throw new BadRequestException('Hồ sơ đang được thẩm định / đã duyệt – không thể chỉnh sửa');
    return app;
  }

  /** Hồ sơ gần nhất (kể cả đã kết thúc) để hiển thị trạng thái */
  async mine(userId: number) {
    return this.prisma.partnerApplication.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, include: appInclude });
  }

  private async toData(dto: Partial<ApplicationDto>) {
    const data: Prisma.PartnerApplicationUncheckedUpdateInput = {};
    const str = (v?: string | null) => (v === undefined ? undefined : v?.trim() || null);
    if (dto.storeName !== undefined) data.storeName = dto.storeName.trim();
    if (dto.desiredSlug !== undefined) {
      const s = dto.desiredSlug ? slugify(dto.desiredSlug) : null;
      if (s && s.length < 3) throw new BadRequestException('Đường dẫn cửa hàng tối thiểu 3 ký tự');
      if (s && (await this.prisma.store.findUnique({ where: { slug: s } }))) throw new ConflictException(`Đường dẫn "${s}" đã có cửa hàng sử dụng`);
      data.desiredSlug = s;
    }
    if (dto.storePhone !== undefined) data.storePhone = dto.storePhone.trim();
    if (dto.storeEmail !== undefined) data.storeEmail = str(dto.storeEmail)?.toLowerCase() ?? null;
    if (dto.storeAddressParts) {
      const a = storeAddressData(dto.storeAddressParts, 'Địa chỉ cửa hàng');
      const { address, ...parts } = a;
      data.storeAddress = address;
      data.storeAddressParts = parts as unknown as Prisma.InputJsonObject;
    }
    if (dto.categories !== undefined) data.categories = str(dto.categories);
    if (dto.businessType !== undefined) data.businessType = dto.businessType;
    if (dto.businessName !== undefined) data.businessName = dto.businessName.trim();
    if (dto.taxCode !== undefined) data.taxCode = dto.taxCode.trim();
    if (dto.licenseNo !== undefined) data.licenseNo = dto.licenseNo.trim();
    if (dto.licenseDate !== undefined) data.licenseDate = dto.licenseDate ? new Date(dto.licenseDate.slice(0, 10) + 'T00:00:00Z') : null;
    if (dto.licensePlace !== undefined) data.licensePlace = str(dto.licensePlace);
    if (dto.businessAddressParts !== undefined) Object.assign(data, businessAddressData(dto.businessAddressParts));
    if (dto.representative !== undefined) data.representative = dto.representative.trim().replace(/\s+/g, ' ');
    if (dto.representativeTitle !== undefined) data.representativeTitle = str(dto.representativeTitle);
    if (dto.representativeId !== undefined) data.representativeId = dto.representativeId.trim();
    if (dto.representativeIdDate !== undefined) data.representativeIdDate = dto.representativeIdDate ? new Date(dto.representativeIdDate.slice(0, 10) + 'T00:00:00Z') : null;
    if (dto.representativePhone !== undefined) data.representativePhone = dto.representativePhone.trim();
    if (dto.representativeEmail !== undefined) data.representativeEmail = dto.representativeEmail.trim().toLowerCase();
    if (dto.bankName !== undefined) data.bankName = dto.bankName.trim();
    if (dto.bankAccountNo !== undefined) data.bankAccountNo = dto.bankAccountNo.trim();
    if (dto.bankAccountName !== undefined) data.bankAccountName = dto.bankAccountName.trim().toUpperCase();
    if (dto.planId !== undefined) {
      if (dto.planId) {
        const plan = await this.prisma.plan.findFirst({ where: { id: dto.planId, isActive: true } });
        if (!plan) throw new BadRequestException('Gói dịch vụ không tồn tại hoặc đã ngừng bán');
      }
      data.planId = dto.planId ?? null;
    }
    if (dto.months !== undefined) data.months = dto.months;
    if (dto.addons !== undefined) {
      const lines = await this.billing.addonLines(dto.addons);
      data.addons = lines.length ? lines.map((l) => ({ packId: l.packId, units: l.units })) : Prisma.DbNull;
    }
    return data;
  }

  async create(userId: number, dto: ApplicationDto, ip?: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.role !== 'CUSTOMER' || user.storeId)
      throw new ForbiddenException('Tài khoản này đã là tài khoản quản trị / nhân viên / tài xế. Hãy dùng một tài khoản khách hàng riêng để đăng ký đối tác.');
    if (await this.prisma.partnerApplication.findFirst({ where: { userId, status: { in: OPEN } } }))
      throw new ConflictException('Bạn đang có hồ sơ đăng ký chưa xử lý xong');
    const data = (await this.toData(dto)) as Prisma.PartnerApplicationUncheckedCreateInput;
    const now = new Date();
    const d = new Date(now.getTime() + 7 * 3_600_000);
    const code = `DT${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    return this.prisma.partnerApplication.create({
      data: {
        ...data, code, userId, status: 'DRAFT', agreedTermsAt: now, agreedPrivacyAt: now, submittedIp: ip?.slice(0, 64),
        history: [{ at: now.toISOString(), by: user.fullName, action: 'Tạo hồ sơ' }],
      },
      include: appInclude,
    });
  }

  async update(userId: number, dto: Partial<ApplicationDto>) {
    const app = await this.myEditable(userId);
    return this.prisma.partnerApplication.update({ where: { id: app.id }, data: await this.toData(dto), include: appInclude });
  }

  async uploadDoc(userId: number, type: string, file?: Express.Multer.File) {
    const app = await this.myEditable(userId);
    if (!file) throw new BadRequestException('Chưa chọn file');
    if (!MIME_OK.test(file.mimetype)) throw new BadRequestException('Chỉ nhận ảnh JPG, PNG, WEBP hoặc file PDF');
    if (file.size > MAX_FILE) throw new BadRequestException('File tối đa 4MB');
    if ((await this.prisma.partnerDocument.count({ where: { applicationId: app.id } })) >= 20) throw new BadRequestException('Tối đa 20 file mỗi hồ sơ');
    await this.prisma.partnerDocument.create({
      data: { applicationId: app.id, type, fileName: file.originalname.slice(0, 180), mimeType: file.mimetype, size: file.size, data: file.buffer },
    });
    return this.mine(userId);
  }

  async deleteDoc(userId: number, docId: number) {
    const app = await this.myEditable(userId);
    const r = await this.prisma.partnerDocument.deleteMany({ where: { id: docId, applicationId: app.id } });
    if (!r.count) throw new NotFoundException('Không tìm thấy file');
    return this.mine(userId);
  }

  /** File giấy tờ: chỉ chủ hồ sơ hoặc super admin */
  async getDoc(docId: number, user: { sub: number; role: string }) {
    const doc = await this.prisma.partnerDocument.findUnique({ where: { id: docId }, include: { application: { select: { userId: true } } } });
    if (!doc || (user.role !== 'SUPER_ADMIN' && doc.application.userId !== user.sub)) throw new NotFoundException('Không tìm thấy file');
    return doc;
  }

  async submit(userId: number) {
    const app = await this.myEditable(userId);
    const docs = await this.prisma.partnerDocument.findMany({ where: { applicationId: app.id }, select: { type: true } });
    const missing = REQUIRED_DOCS.filter((t) => !docs.some((d) => d.type === t));
    if (missing.length) throw new BadRequestException(`Còn thiếu giấy tờ bắt buộc: ${missing.map((t) => DOC_LABEL[t]).join('; ')}`);
    const updated = await this.prisma.partnerApplication.update({
      where: { id: app.id },
      data: { status: 'SUBMITTED', history: this.log(app, app.representative, app.status === 'NEED_INFO' ? 'Nộp bổ sung hồ sơ' : 'Nộp hồ sơ') },
      include: appInclude,
    });
    this.safe(() => this.notifications.notifySuper({
      type: 'PARTNER', title: `📝 Hồ sơ đối tác ${app.status === 'NEED_INFO' ? 'bổ sung' : 'mới'}: ${app.storeName}`,
      body: `${app.code} · ${app.businessName}`, data: { url: `/super/applications/${app.id}` },
    }));
    this.notifyApplicant(app, 'Đã nhận hồ sơ đăng ký đối tác',
      `<p>Chào ${esc(app.representative)},</p><p>${esc((await this.platform.get()).name)} đã nhận hồ sơ <b>${app.code}</b> của cửa hàng <b>${esc(app.storeName)}</b>. Chúng tôi sẽ thẩm định trong 1–3 ngày làm việc.</p>`);
    return updated;
  }

  async cancel(userId: number) {
    const app = await this.myOpen(userId);
    return this.prisma.partnerApplication.update({
      where: { id: app.id }, data: { status: 'CANCELLED', history: this.log(app, app.representative, 'Đối tác rút hồ sơ') }, include: appInclude,
    });
  }

  /** Ký hợp đồng điện tử */
  async sign(userId: number, dto: SignDto, ip?: string, ua?: string) {
    const app = await this.myOpen(userId);
    if (app.status !== 'APPROVED' || !app.contractData) throw new BadRequestException('Hồ sơ chưa được duyệt hoặc chưa có hợp đồng');
    if (app.contractSignedAt) throw new BadRequestException('Hợp đồng đã được ký');
    if (normName(dto.fullName) !== normName(app.representative))
      throw new BadRequestException(`Họ tên ký phải trùng với người đại diện trên hồ sơ: ${app.representative}`);
    if (contractHash(app.contractData as unknown as PartnerContract) !== app.contractHash)
      throw new BadRequestException('Nội dung hợp đồng không khớp mã băm – vui lòng liên hệ quản trị sàn');
    const now = new Date();
    const updated = await this.prisma.partnerApplication.update({
      where: { id: app.id },
      data: {
        contractSignedAt: now, contractSignerName: dto.fullName.trim(), contractSignerIp: ip?.slice(0, 64), contractSignerUa: ua?.slice(0, 500),
        history: this.log(app, dto.fullName.trim(), 'Ký hợp đồng điện tử', `IP ${ip ?? '?'} · SHA-256 ${app.contractHash}`),
      },
      include: appInclude,
    });
    this.safe(() => this.notifications.notifySuper({
      type: 'PARTNER', title: `✍️ Đối tác đã ký hợp đồng: ${app.storeName}`, body: `${app.contractNo}`, data: { url: `/super/applications/${app.id}` },
    }));
    return updated;
  }

  // ───────────── Super admin ─────────────
  async list(q: { page?: number; limit?: number; search?: string; status?: PartnerAppStatus }) {
    const { skip, take, page, limit } = paginate(q.page, q.limit);
    const where: Prisma.PartnerApplicationWhereInput = {
      ...(q.status ? { status: q.status } : { status: { not: 'DRAFT' } }),
      ...(q.search && {
        OR: [
          { code: { contains: q.search } }, { storeName: { contains: q.search } }, { businessName: { contains: q.search } },
          { taxCode: { contains: q.search } }, { representative: { contains: q.search } }, { representativePhone: { contains: q.search } },
        ],
      }),
    };
    const [items, total, counts] = await Promise.all([
      this.prisma.partnerApplication.findMany({
        where, skip, take, orderBy: { updatedAt: 'desc' },
        select: {
          id: true, code: true, status: true, storeName: true, businessName: true, businessType: true, taxCode: true, representative: true,
          representativePhone: true, storeAddress: true, createdAt: true, updatedAt: true, contractSignedAt: true, paidAt: true,
          plan: { select: { name: true } }, _count: { select: { documents: true } },
        },
      }),
      this.prisma.partnerApplication.count({ where }),
      this.prisma.partnerApplication.groupBy({ by: ['status'], _count: true }),
    ]);
    return { ...paged(items, total, page, limit), counts: Object.fromEntries(counts.map((c) => [c.status, c._count])) };
  }

  async detail(id: number) {
    const app = await this.prisma.partnerApplication.findUnique({ where: { id }, include: appInclude });
    if (!app) throw new NotFoundException('Không tìm thấy hồ sơ');
    return { ...app, requiredDocs: REQUIRED_DOCS, platformMissing: missingPlatformInfo(await this.platform.get()) };
  }

  private async get(id: number) {
    const app = await this.prisma.partnerApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Không tìm thấy hồ sơ');
    return app;
  }

  private async actor(id: number) {
    return (await this.prisma.user.findUnique({ where: { id }, select: { fullName: true } }))?.fullName ?? `#${id}`;
  }

  async requestInfo(id: number, note: string, actorId: number) {
    const app = await this.get(id);
    if (app.status !== 'SUBMITTED') throw new BadRequestException('Chỉ yêu cầu bổ sung với hồ sơ đang chờ duyệt');
    const r = await this.prisma.partnerApplication.update({
      where: { id },
      data: { status: 'NEED_INFO', reviewNote: note, reviewedById: actorId, reviewedAt: new Date(), history: this.log(app, await this.actor(actorId), 'Yêu cầu bổ sung', note) },
    });
    this.notifyApplicant(app, 'Hồ sơ cần bổ sung thông tin', `<p>Hồ sơ <b>${app.code}</b> cần bổ sung:</p><blockquote>${esc(note)}</blockquote>`);
    return this.detail(r.id);
  }

  async reject(id: number, reason: string, actorId: number) {
    const app = await this.get(id);
    if (!['SUBMITTED', 'NEED_INFO', 'APPROVED'].includes(app.status)) throw new BadRequestException('Hồ sơ không ở trạng thái có thể từ chối');
    await this.prisma.partnerApplication.update({
      where: { id },
      data: { status: 'REJECTED', rejectReason: reason, reviewedById: actorId, reviewedAt: new Date(), history: this.log(app, await this.actor(actorId), 'Từ chối', reason) },
    });
    this.notifyApplicant(app, 'Hồ sơ đăng ký đối tác không được duyệt', `<p>Lý do:</p><blockquote>${esc(reason)}</blockquote><p>Bạn có thể tạo hồ sơ mới sau khi khắc phục.</p>`);
    return this.detail(id);
  }

  /** Ghi nhận đã xác thực danh tính người bán (Luật TMĐT 2025 – bắt buộc trước khi mở gian hàng) */
  async verifyIdentity(id: number, dto: VerifyDto, actorId: number) {
    const app = await this.get(id);
    if (!['SUBMITTED', 'NEED_INFO'].includes(app.status)) throw new BadRequestException('Chỉ xác thực khi hồ sơ đang thẩm định');
    const label = { VNEID: 'Xác thực qua VNeID', EKYC: 'eKYC (đối chiếu CSDL quốc gia về dân cư)', TRUC_TIEP: 'Đối chiếu bản gốc trực tiếp' }[dto.method];
    await this.prisma.partnerApplication.update({
      where: { id },
      data: { identityMethod: dto.method, identityVerifiedAt: new Date(), history: this.log(app, await this.actor(actorId), 'Xác thực danh tính', [label, dto.note].filter(Boolean).join(' – ')) },
    });
    return this.detail(id);
  }

  /** Duyệt hồ sơ → sinh hợp đồng (snapshot + SHA-256) và gửi cho đối tác ký */
  async approve(id: number, dto: ApproveDto, actorId: number) {
    const app = await this.get(id);
    if (app.status !== 'SUBMITTED') throw new BadRequestException('Chỉ duyệt hồ sơ đang chờ duyệt');
    if (!app.identityVerifiedAt) throw new BadRequestException('Cần xác thực danh tính người bán trước khi duyệt');
    const docs = await this.prisma.partnerDocument.findMany({ where: { applicationId: id }, select: { type: true } });
    const missing = REQUIRED_DOCS.filter((t) => !docs.some((d) => d.type === t));
    if (missing.length) throw new BadRequestException(`Hồ sơ thiếu: ${missing.map((t) => DOC_LABEL[t]).join('; ')}`);
    const platform = await this.platform.get();
    const lack = missingPlatformInfo(platform);
    if (lack.length) throw new BadRequestException(`Chưa khai báo thông tin pháp nhân của sàn (Bên A) tại Super admin → Cấu hình sàn: ${lack.join(', ')}`);
    const planId = dto.planId === undefined ? app.planId : dto.planId;
    const q = await this.billing.quote(planId, dto.months, dto.addons ?? this.choices(app.addons));

    const y = new Date().getFullYear();
    const contractNo = `${String(id).padStart(4, '0')}/${y}/HĐDV-${slugify(platform.name).replace(/-/g, '').slice(0, 6).toUpperCase() || 'SAN'}`;
    const contract = buildContract({
      no: contractNo, platform, plan: q.plan && { name: q.plan.name, priceMonthly: q.plan.priceMonthly }, months: q.months, amount: dto.amount,
      addons: q.lines, app: { ...app, representativeTitle: app.representativeTitle },
    });
    const hash = contractHash(contract);
    await this.prisma.partnerApplication.update({
      where: { id },
      data: {
        status: 'APPROVED', planId: q.plan?.id ?? null, months: dto.months,
        addons: q.lines.length ? q.lines.map((l) => ({ packId: l.packId, units: l.units })) : Prisma.DbNull, reviewNote: dto.note ?? app.reviewNote, reviewedById: actorId, reviewedAt: new Date(),
        contractNo, contractData: contract as unknown as Prisma.InputJsonObject, contractHash: hash, contractSentAt: new Date(),
        contractSignedAt: null, contractSignerName: null, contractSignerIp: null, contractSignerUa: null,
        history: this.log(app, await this.actor(actorId), 'Duyệt hồ sơ & gửi hợp đồng', `Số HĐ ${contractNo} · ${this.planSummary(q)} · ${dto.amount.toLocaleString('vi-VN')}đ`),
      },
    });
    const b = platform.bank;
    this.notifyApplicant(app, 'Hồ sơ đã được duyệt – mời ký hợp đồng',
      `<p>Hồ sơ <b>${app.code}</b> đã được duyệt. Vui lòng đăng nhập để đọc và ký Hợp đồng số <b>${esc(contractNo)}</b>.</p>` +
      (dto.amount > 0 && b.accountNo
        ? `<p>Phí dịch vụ kỳ đầu: <b>${dto.amount.toLocaleString('vi-VN')}đ</b> – chuyển khoản tới ${esc(b.bankName)} – STK <b>${esc(b.accountNo)}</b> – ${esc(b.accountName)}, nội dung: <b>${app.code}</b>.</p>`
        : ''));
    return this.detail(id);
  }

  /** Đối tác ký bằng chữ ký số / bản giấy ngoài hệ thống → super admin xác nhận */
  async offlineSign(id: number, dto: OfflineSignDto, actorId: number) {
    const app = await this.get(id);
    if (app.status !== 'APPROVED') throw new BadRequestException('Hồ sơ chưa được duyệt');
    if (app.contractSignedAt) throw new BadRequestException('Hợp đồng đã được ký');
    const how = dto.method === 'KY_SO' ? 'chữ ký số' : 'bản giấy';
    await this.prisma.partnerApplication.update({
      where: { id },
      data: {
        contractSignedAt: new Date(), contractSignerName: dto.signerName.trim(), contractSignerUa: `Ký bằng ${how} – super admin #${actorId} xác nhận`,
        history: this.log(app, await this.actor(actorId), `Xác nhận đã ký hợp đồng (${how})`, dto.note),
      },
    });
    return this.detail(id);
  }

  async confirmPayment(id: number, dto: PaymentDto, actorId: number) {
    const app = await this.get(id);
    if (app.status !== 'APPROVED') throw new BadRequestException('Hồ sơ chưa được duyệt');
    await this.prisma.partnerApplication.update({
      where: { id },
      data: {
        paymentAmount: dto.amount, paymentMethod: dto.method, paymentRef: dto.ref?.trim() || null, paidAt: new Date(),
        history: this.log(app, await this.actor(actorId), 'Xác nhận đã nhận phí', `${dto.amount.toLocaleString('vi-VN')}đ · ${dto.method}${dto.ref ? ` · ${dto.ref}` : ''}`),
      },
    });
    return this.detail(id);
  }

  /** Kích hoạt: tạo cửa hàng + cấp quyền quản trị cho tài khoản đã đăng ký */
  async activate(id: number, actorId: number) {
    const app = await this.prisma.partnerApplication.findUnique({ where: { id }, include: { user: true } });
    if (!app) throw new NotFoundException('Không tìm thấy hồ sơ');
    if (app.status !== 'APPROVED') throw new BadRequestException('Hồ sơ chưa được duyệt');
    if (!app.contractSignedAt) throw new BadRequestException('Đối tác chưa ký hợp đồng');
    const contract = app.contractData as unknown as PartnerContract | null;
    const amount = contract?.commercial.amount ?? 0;
    if (amount > 0 && !app.paidAt) throw new BadRequestException('Chưa xác nhận đã nhận phí dịch vụ');

    // khoá chống kích hoạt 2 lần đồng thời
    const lock = await this.prisma.partnerApplication.updateMany({ where: { id, status: 'APPROVED', storeId: null }, data: { status: 'ACTIVATED' } });
    if (!lock.count) throw new ConflictException('Hồ sơ đang được kích hoạt bởi người khác');
    // Tách số đã thu: phần gói mua thêm theo giá hợp đồng, còn lại là phí gói chính
    const addonLines = contract?.commercial.addons ?? [];
    const paid = app.paymentAmount ?? amount;
    const addonsPaid = Math.min(paid, addonLines.reduce((sum, l) => sum + l.price, 0));
    const planPaid = paid - addonsPaid;
    try {
      const parts = app.storeAddressParts as unknown as AddressPartsDto;
      const store = await this.superService.createStore({
        name: app.storeName, slug: app.desiredSlug || undefined, phone: app.storePhone, email: app.storeEmail || undefined,
        addressParts: parts, note: `Tạo từ hồ sơ đăng ký ${app.code}`,
        planId: app.planId ?? undefined, months: contract?.commercial.months ?? app.months, amount: planPaid, method: app.paymentMethod || undefined,
        owner: { email: app.user.email, fullName: app.user.fullName, phone: app.representativePhone },
        businessName: app.businessName, businessType: app.businessType, taxCode: app.taxCode,
        businessAddressParts: (app.businessAddressParts as unknown as AddressPartsDto | null) ?? parts,
        representative: app.representative, representativeId: app.representativeId, representativePhone: app.representativePhone,
        bankName: app.bankName, bankAccountNo: app.bankAccountNo, bankAccountName: app.bankAccountName,
        contractNo: app.contractNo ?? undefined, contractSignedAt: app.contractSignedAt.toISOString(),
      }, actorId);
      await this.billing.grantContractAddons(store.id, addonLines, {
        paidAt: app.paidAt, ref: app.contractNo ?? app.code, amount: addonsPaid, method: app.paymentMethod, actorId,
      });
      await this.prisma.partnerApplication.update({
        where: { id },
        data: { storeId: store.id, activatedAt: new Date(), history: this.log(app, await this.actor(actorId), 'Kích hoạt cửa hàng', `/${store.slug}`) },
      });
      this.notifyApplicant({ ...app, userId: app.userId }, 'Cửa hàng đã được kích hoạt',
        `<p>Chúc mừng! Cửa hàng <b>${esc(store.name)}</b> đã hoạt động trên ${esc((await this.platform.get()).name)}.</p>` +
        `<p>Tài khoản <b>${esc(app.user.email)}</b> của bạn đã được cấp quyền <b>Chủ cửa hàng</b>. Đăng nhập trang quản trị: <a href="${this.appUrl('/admin')}">${this.appUrl('/admin')}</a></p>` +
        `<p>Việc cần làm tiếp: cập nhật thuế suất GTGT cho sản phẩm, khai báo phương pháp tính thuế & nhà cung cấp hoá đơn điện tử tại Cài đặt → Hoá đơn.</p>`);
      return this.detail(id);
    } catch (e) {
      await this.prisma.partnerApplication.update({ where: { id }, data: { status: 'APPROVED' } });
      throw e;
    }
  }

  // ───────────── Gói dịch vụ trên hồ sơ (điều chỉnh trực tiếp trước khi ký) ─────────────
  private choices(v: Prisma.JsonValue | null): AddonChoice[] {
    return Array.isArray(v) ? (v as unknown as AddonChoice[]).filter((x) => x && x.packId) : [];
  }

  private planSummary(q: Awaited<ReturnType<BillingService['quote']>>) {
    const plan = q.plan ? `${q.plan.name}${q.months ? ` ${q.months} tháng` : ' (không thời hạn)'}` : 'Không gói';
    return q.lines.length ? `${plan} + ${q.lines.map((l) => l.name + (l.units > 1 ? ` × ${l.units}` : '')).join(', ')}` : plan;
  }

  /**
   * Đổi gói / số tháng / gói mua thêm. Được đổi khi hồ sơ chưa duyệt, hoặc đã duyệt nhưng CHƯA ký & CHƯA thanh toán
   * – khi đó hợp đồng được sinh lại (cùng số HĐ, mã băm mới) để Bên B ký đúng nội dung mới.
   */
  private async applyPlanChange(id: number, dto: PlanChangeDto, by: string, superAdmin: boolean) {
    const app = await this.get(id);
    if (!OPEN.includes(app.status)) throw new BadRequestException('Hồ sơ đã kết thúc – không thể đổi gói');
    if (app.status === 'APPROVED' && (app.contractSignedAt || app.paidAt))
      throw new BadRequestException('Hợp đồng đã ký hoặc đã thanh toán – đổi gói sau khi kích hoạt cửa hàng (Gói dịch vụ → mua thêm / đổi gói)');
    if (dto.planId) {
      const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
      if (!plan || (!superAdmin && !plan.isActive)) throw new BadRequestException('Gói dịch vụ không tồn tại hoặc đã ngừng bán');
    }
    const q = await this.billing.quote(dto.planId === undefined ? app.planId : dto.planId, dto.months, dto.addons ?? this.choices(app.addons));
    const data: Prisma.PartnerApplicationUncheckedUpdateInput = {
      planId: q.plan?.id ?? null, months: dto.months,
      addons: q.lines.length ? q.lines.map((l) => ({ packId: l.packId, units: l.units })) : Prisma.DbNull,
    };
    let note = this.planSummary(q);
    if (app.status === 'APPROVED') {
      const old = app.contractData as unknown as PartnerContract | null;
      const amount = superAdmin && dto.amount !== undefined ? dto.amount : q.total;
      const contract = buildContract({
        no: app.contractNo!, platform: await this.platform.get(), plan: q.plan && { name: q.plan.name, priceMonthly: q.plan.priceMonthly },
        months: q.months, amount, addons: q.lines, app,
      });
      Object.assign(data, { contractData: contract as unknown as Prisma.InputJsonObject, contractHash: contractHash(contract), contractSentAt: new Date() });
      note += ` · phí kỳ đầu ${old ? `${old.commercial.amount.toLocaleString('vi-VN')}đ → ` : ''}${amount.toLocaleString('vi-VN')}đ · hợp đồng được sinh lại`;
    }
    if (dto.note) note += ` · ${dto.note}`;
    const updated = await this.prisma.partnerApplication.update({ where: { id }, data: { ...data, history: this.log(app, by, 'Đổi gói dịch vụ', note) }, include: appInclude });
    return { app, updated, note };
  }

  /** Người đăng ký tự đổi gói */
  async changePlanMine(userId: number, dto: PlanChangeDto) {
    const mine = await this.myOpen(userId);
    const { app, updated, note } = await this.applyPlanChange(mine.id, { ...dto, amount: undefined }, mine.representative, false);
    if (app.status !== 'DRAFT')
      this.safe(() => this.notifications.notifySuper({
        type: 'PARTNER', title: `🔁 ${app.storeName} đổi gói dịch vụ`, body: `${app.code} · ${note}`, data: { url: `/super/applications/${app.id}` },
      }));
    return updated;
  }

  /** Super admin điều chỉnh gói trực tiếp trên hồ sơ */
  async changePlan(id: number, dto: PlanChangeDto, actorId: number) {
    const { app, note } = await this.applyPlanChange(id, dto, await this.actor(actorId), true);
    if (app.status !== 'DRAFT')
      this.notifyApplicant(app, 'Gói dịch vụ trên hồ sơ đã được điều chỉnh',
        `<p>Quản trị sàn đã điều chỉnh gói dịch vụ trên hồ sơ <b>${app.code}</b>: ${esc(note)}.</p>` +
        (app.status === 'APPROVED' ? '<p>Hợp đồng đã được cập nhật – vui lòng đọc lại trước khi ký.</p>' : ''));
    return this.detail(id);
  }
}
