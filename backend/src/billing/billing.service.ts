import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PurchaseStatus, StorePurchase } from '@prisma/client';
import { defaultPlan, LIMIT_KINDS, LIMIT_LABEL, PlanLimit, storeLimits, storeUsage } from '../common/plan-limits';
import { PlatformService } from '../common/platform';
import { clearStoreCache } from '../common/tenant.middleware';
import { paged, paginate, slugify } from '../common/utils';
import { vnParts } from '../common/vn-time';
import { NotificationsService } from '../notifications/notifications.module';
import { PrismaService } from '../prisma/prisma.service';
import { addMonths, SuperService } from '../super/super.service';

export interface AddonChoice { packId: number; units: number }
/** Một dòng gói mua thêm (snapshot giá tại thời điểm báo giá / ký hợp đồng) */
export interface AddonLine {
  packId: number; code: string; name: string; kind: string; quantity: number; units: number; unitPrice: number; price: number; months: number;
}

export interface PackInput {
  code?: string; name: string; description?: string | null; kind: PlanLimit; quantity: number; price: number; months: number;
  isActive?: boolean; sortOrder?: number;
}

const MAX_UNITS = 20;
const MAX_PENDING = 5;
const rand = (n: number) => Array.from({ length: n }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
const pad = (n: number) => String(n).padStart(2, '0');

const purchaseInclude = {
  store: { select: { id: true, name: true, slug: true } },
  plan: { select: { id: true, name: true } },
  pack: { select: { id: true, name: true, code: true } },
} satisfies Prisma.StorePurchaseInclude;

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private superService: SuperService,
    private notifications: NotificationsService,
    private platform: PlatformService,
  ) {}

  private safe(fn: () => Promise<unknown>) { fn().catch(() => {}); }

  /** Mã đơn – dùng làm nội dung chuyển khoản (không dấu, không khoảng trắng) */
  private code(type: 'ADDON' | 'PLAN') {
    const d = vnParts(new Date());
    return `${type === 'PLAN' ? 'GH' : 'MT'}${String(d.y).slice(2)}${pad(d.m)}${pad(d.d)}${rand(5)}`;
  }

  // ───────────── Bảng giá gói mua thêm ─────────────
  listPacks(activeOnly = false) {
    return this.prisma.addonPack.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
      include: activeOnly ? undefined : { _count: { select: { purchases: true } } },
    });
  }

  private validatePack(dto: Partial<PackInput>) {
    if (dto.kind !== undefined && !LIMIT_KINDS.includes(dto.kind)) throw new BadRequestException('Loại hạn mức không hợp lệ');
    if (dto.quantity !== undefined && !(dto.quantity >= 1)) throw new BadRequestException('Số lượng cộng thêm tối thiểu 1');
    if (dto.months !== undefined && !(dto.months >= 0 && dto.months <= 36)) throw new BadRequestException('Thời hạn 0–36 tháng (0 = không thời hạn)');
  }

  async createPack(dto: PackInput) {
    this.validatePack(dto);
    const code = slugify(dto.code || dto.name);
    if (await this.prisma.addonPack.findUnique({ where: { code } })) throw new ConflictException('Mã gói đã tồn tại');
    return this.prisma.addonPack.create({ data: { ...dto, code } });
  }

  async updatePack(id: number, dto: Partial<PackInput>) {
    this.validatePack(dto);
    if (!(await this.prisma.addonPack.findUnique({ where: { id } }))) throw new NotFoundException('Không tìm thấy gói mua thêm');
    const data = { ...dto };
    if (dto.code) {
      data.code = slugify(dto.code);
      if (await this.prisma.addonPack.findFirst({ where: { code: data.code, id: { not: id } } })) throw new ConflictException('Mã gói đã tồn tại');
    }
    return this.prisma.addonPack.update({ where: { id }, data });
  }

  async removePack(id: number) {
    const p = await this.prisma.addonPack.findUnique({ where: { id }, include: { _count: { select: { purchases: true } } } });
    if (!p) throw new NotFoundException('Không tìm thấy gói mua thêm');
    if (p._count.purchases) throw new BadRequestException(`Gói đã có ${p._count.purchases} lượt mua – hãy ngừng bán thay vì xoá`);
    await this.prisma.addonPack.delete({ where: { id } });
    return { ok: true };
  }

  // ───────────── Báo giá (dùng cho hồ sơ đối tác & hợp đồng) ─────────────
  /** Gộp các lựa chọn trùng gói, kiểm tra gói đang bán → dòng báo giá */
  async addonLines(choices?: AddonChoice[] | null, activeOnly = true): Promise<AddonLine[]> {
    const merged = new Map<number, number>();
    for (const c of choices ?? []) {
      const units = Math.floor(Number(c.units));
      if (!(units >= 1 && units <= MAX_UNITS)) throw new BadRequestException(`Số lượng mỗi gói mua thêm từ 1 đến ${MAX_UNITS}`);
      merged.set(Number(c.packId), Math.min(MAX_UNITS, (merged.get(Number(c.packId)) ?? 0) + units));
    }
    if (!merged.size) return [];
    const packs = await this.prisma.addonPack.findMany({ where: { id: { in: [...merged.keys()] }, ...(activeOnly && { isActive: true }) } });
    if (packs.length !== merged.size) throw new BadRequestException('Có gói mua thêm không tồn tại hoặc đã ngừng bán');
    return packs
      .sort((a, b) => a.sortOrder - b.sortOrder || a.price - b.price)
      .map((p) => {
        const units = merged.get(p.id)!;
        return { packId: p.id, code: p.code, name: p.name, kind: p.kind, quantity: p.quantity * units, units, unitPrice: p.price, price: p.price * units, months: p.months };
      });
  }

  /** Báo giá gói chính + gói mua thêm. Không chọn gói → gói Miễn phí; gói 0đ → không thời hạn (months = 0). */
  async quote(planId: number | null | undefined, months: number, choices?: AddonChoice[] | null) {
    const plan = planId ? await this.prisma.plan.findUnique({ where: { id: planId } }) : await defaultPlan(this.prisma);
    if (planId && !plan) throw new BadRequestException('Gói dịch vụ không tồn tại');
    const m = !plan || plan.priceMonthly === 0 ? 0 : Math.max(1, Math.floor(months));
    const lines = await this.addonLines(choices);
    const planAmount = (plan?.priceMonthly ?? 0) * m;
    const addonsAmount = lines.reduce((s, l) => s + l.price, 0);
    return { plan, months: m, lines, planAmount, addonsAmount, total: planAmount + addonsAmount };
  }

  /** Ghi các gói mua thêm đã ký kèm hợp đồng vào cửa hàng vừa kích hoạt (+ phiếu thu phần phí mua thêm) */
  async grantContractAddons(storeId: number, lines: AddonLine[], o: { paidAt: Date | null; ref: string; amount: number; method?: string | null; actorId: number }) {
    if (!lines.length) return;
    const now = new Date();
    for (const l of lines)
      await this.prisma.storePurchase.create({
        data: {
          code: this.code('ADDON'), storeId, type: 'ADDON', status: 'ACTIVE', name: l.units > 1 ? `${l.name} × ${l.units}` : l.name, packId: l.packId,
          kind: l.kind, units: l.units, quantity: l.quantity, months: l.months, amount: l.price, startsAt: now,
          expiresAt: l.months > 0 ? addMonths(now, l.months) : null, paidAt: l.price > 0 ? o.paidAt ?? now : null, paymentMethod: o.method || 'Kèm hợp đồng',
          note: `Kèm hợp đồng ${o.ref}`, source: 'CONTRACT', confirmedById: o.actorId,
        },
      });
    if (o.amount > 0)
      await this.prisma.storePayment.create({
        data: {
          storeId, months: 0, amount: o.amount, periodFrom: now, periodTo: now, method: o.method,
          note: `Gói mua thêm kèm hợp đồng ${o.ref}: ${lines.map((l) => l.name + (l.units > 1 ? ` × ${l.units}` : '')).join(', ')}`, createdById: o.actorId,
        },
      });
  }

  // ───────────── Cửa hàng: gói đang dùng, mua thêm, đổi gói ─────────────
  async subscription(storeId: number) {
    const [store, usage, { limits }, payments, purchases, plans, packs, platform] = await Promise.all([
      this.prisma.store.findUniqueOrThrow({
        where: { id: storeId }, select: { id: true, slug: true, name: true, status: true, planExpiresAt: true, createdAt: true, plan: true },
      }),
      storeUsage(this.prisma, storeId),
      storeLimits(this.prisma, storeId),
      this.prisma.storePayment.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' }, take: 50, include: { plan: { select: { name: true } } } }),
      this.prisma.storePurchase.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' }, take: 50, include: purchaseInclude }),
      this.prisma.plan.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { priceMonthly: 'asc' }] }),
      this.listPacks(true),
      this.platform.get(),
    ]);
    const daysLeft = store.planExpiresAt ? Math.ceil((store.planExpiresAt.getTime() - Date.now()) / 86400000) : null;
    return { store: { ...store, daysLeft }, usage, limits, payments, purchases, plans, packs, bank: platform.bank };
  }

  async request(storeId: number, userId: number, dto: { type: 'ADDON' | 'PLAN'; packId?: number; units?: number; planId?: number; months?: number; note?: string }) {
    if ((await this.prisma.storePurchase.count({ where: { storeId, status: 'PENDING' } })) >= MAX_PENDING)
      throw new BadRequestException(`Đang có ${MAX_PENDING} đơn chờ thanh toán – hãy thanh toán hoặc huỷ bớt trước khi tạo đơn mới`);
    const store = await this.prisma.store.findUniqueOrThrow({ where: { id: storeId }, include: { plan: true } });
    let data: Prisma.StorePurchaseUncheckedCreateInput;

    if (dto.type === 'ADDON') {
      const [line] = await this.addonLines([{ packId: Number(dto.packId), units: dto.units ?? 1 }]);
      const { limits } = await storeLimits(this.prisma, storeId);
      if (store.plan && limits[line.kind as PlanLimit]?.base == null)
        throw new BadRequestException(`Gói "${store.plan.name}" đã không giới hạn ${LIMIT_LABEL[line.kind as PlanLimit]} – không cần mua thêm`);
      data = {
        code: this.code('ADDON'), storeId, type: 'ADDON', name: line.units > 1 ? `${line.name} × ${line.units}` : line.name, packId: line.packId,
        kind: line.kind, units: line.units, quantity: line.quantity, months: line.months, amount: line.price, requestedById: userId, note: dto.note,
      };
    } else {
      const plan = await this.prisma.plan.findFirst({ where: { id: Number(dto.planId), isActive: true } });
      if (!plan) throw new BadRequestException('Gói dịch vụ không tồn tại hoặc đã ngừng bán');
      const months = plan.priceMonthly === 0 ? 0 : Math.floor(dto.months ?? 1);
      if (plan.priceMonthly > 0 && !(months >= 1 && months <= 36)) throw new BadRequestException('Số tháng từ 1 đến 36');
      const same = plan.id === store.planId;
      data = {
        code: this.code('PLAN'), storeId, type: 'PLAN', planId: plan.id, months, amount: plan.priceMonthly * months, requestedById: userId, note: dto.note,
        name: plan.priceMonthly === 0 ? `Chuyển sang gói ${plan.name}` : `${same ? 'Gia hạn' : 'Đổi sang'} gói ${plan.name} – ${months} tháng`,
      };
    }

    const p = await this.prisma.storePurchase.create({ data });
    // 0đ (vd. chuyển về gói Miễn phí) → áp dụng ngay, không cần thanh toán
    if (p.amount === 0) await this.activate(p, { amount: 0, method: 'Miễn phí', actorId: userId });
    else
      this.safe(() => this.notifications.notifySuper({
        type: 'PARTNER', title: `🛒 ${store.name} đặt mua: ${p.name}`, body: `${p.code} · ${p.amount.toLocaleString('vi-VN')}đ – chờ xác nhận thanh toán`,
        data: { url: '/super/addons?tab=orders' },
      }));
    return this.subscription(storeId);
  }

  async cancelMine(storeId: number, id: number) {
    const r = await this.prisma.storePurchase.updateMany({ where: { id, storeId, status: 'PENDING' }, data: { status: 'CANCELLED', note: 'Cửa hàng huỷ đơn' } });
    if (!r.count) throw new BadRequestException('Chỉ huỷ được đơn đang chờ thanh toán');
    return this.subscription(storeId);
  }

  // ───────────── Super admin ─────────────
  async listPurchases(q: { page?: number; limit?: number; status?: PurchaseStatus; storeId?: number; search?: string }) {
    const { skip, take, page, limit } = paginate(q.page, q.limit);
    const where: Prisma.StorePurchaseWhereInput = {
      ...(q.status && { status: q.status }),
      ...(q.storeId && { storeId: Number(q.storeId) }),
      ...(q.search && { OR: [{ code: { contains: q.search } }, { name: { contains: q.search } }, { store: { name: { contains: q.search } } }] }),
    };
    const [items, total, counts] = await Promise.all([
      this.prisma.storePurchase.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: purchaseInclude }),
      this.prisma.storePurchase.count({ where }),
      this.prisma.storePurchase.groupBy({ by: ['status'], _count: true }),
    ]);
    return { ...paged(items, total, page, limit), counts: Object.fromEntries(counts.map((c) => [c.status, c._count])) };
  }

  /** Gói mua thêm & hạn mức thực tế của 1 cửa hàng (trang chi tiết cửa hàng của super admin) */
  async storeAddons(storeId: number) {
    const [{ limits }, usage, purchases] = await Promise.all([
      storeLimits(this.prisma, storeId),
      storeUsage(this.prisma, storeId),
      this.prisma.storePurchase.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' }, take: 100, include: purchaseInclude }),
    ]);
    return { limits, usage, purchases };
  }

  async confirm(id: number, dto: { amount?: number; method: string; ref?: string; note?: string }, actorId: number) {
    const p = await this.prisma.storePurchase.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Không tìm thấy đơn mua');
    if (p.status !== 'PENDING') throw new BadRequestException('Đơn không ở trạng thái chờ thanh toán');
    await this.activate(p, { amount: dto.amount ?? p.amount, method: dto.method, ref: dto.ref, note: dto.note, actorId });
    return this.prisma.storePurchase.findUniqueOrThrow({ where: { id }, include: purchaseInclude });
  }

  /** Huỷ đơn chờ / thu hồi hạn mức đã cấp */
  async cancel(id: number, note: string | undefined, actorId: number) {
    const p = await this.prisma.storePurchase.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Không tìm thấy đơn mua');
    if (p.status === 'CANCELLED') throw new BadRequestException('Đơn đã huỷ');
    if (p.status === 'ACTIVE' && p.type === 'PLAN') throw new BadRequestException('Đơn đổi gói đã áp dụng – chỉnh gói tại trang cửa hàng (Chỉnh tay)');
    const revoked = p.status === 'ACTIVE';
    await this.prisma.storePurchase.update({
      where: { id },
      data: { status: 'CANCELLED', confirmedById: actorId, note: [p.note, `${revoked ? 'Thu hồi' : 'Huỷ'} bởi quản trị sàn${note ? `: ${note}` : ''}`].filter(Boolean).join(' · ') },
    });
    this.safe(() => this.notifications.notifyStaff(p.storeId, {
      type: 'PARTNER', title: `${revoked ? 'Đã thu hồi' : 'Đơn mua đã bị huỷ'}: ${p.name}`, body: note || p.code, data: { url: '/admin/subscription' },
    }));
    return this.prisma.storePurchase.findUniqueOrThrow({ where: { id }, include: purchaseInclude });
  }

  /** Super admin cấp trực tiếp gói mua thêm cho cửa hàng (tặng / bán ngoài hệ thống) */
  async grant(storeId: number, dto: { packId: number; units: number; amount?: number; method?: string; ref?: string; note?: string }, actorId: number) {
    await this.prisma.store.findUniqueOrThrow({ where: { id: storeId } }).catch(() => { throw new NotFoundException('Không tìm thấy cửa hàng'); });
    const [line] = await this.addonLines([{ packId: dto.packId, units: dto.units }], false);
    const p = await this.prisma.storePurchase.create({
      data: {
        code: this.code('ADDON'), storeId, type: 'ADDON', name: line.units > 1 ? `${line.name} × ${line.units}` : line.name, packId: line.packId,
        kind: line.kind, units: line.units, quantity: line.quantity, months: line.months, amount: dto.amount ?? line.price, source: 'SUPER',
        requestedById: actorId, note: dto.note,
      },
    });
    await this.activate(p, { amount: p.amount, method: dto.method || (p.amount ? 'Chuyển khoản' : 'Miễn phí / khuyến mãi'), ref: dto.ref, actorId });
    return this.storeAddons(storeId);
  }

  /** Kích hoạt đơn: ghi phiếu thu, cộng hạn mức (ADDON) hoặc đổi / gia hạn gói (PLAN). Khoá bằng trạng thái để không kích hoạt 2 lần. */
  private async activate(p: StorePurchase, o: { amount: number; method: string; ref?: string; note?: string; actorId: number }) {
    const now = new Date();
    const lock = await this.prisma.storePurchase.updateMany({
      where: { id: p.id, status: 'PENDING' },
      data: { status: 'ACTIVE', amount: o.amount, paymentMethod: o.method, paymentRef: o.ref?.trim() || null, paidAt: o.amount > 0 ? now : null, confirmedById: o.actorId, startsAt: now },
    });
    if (!lock.count) throw new ConflictException('Đơn đang được xử lý');

    try {
      if (p.type === 'ADDON') {
        const expiresAt = p.months > 0 ? addMonths(now, p.months) : null;
        await this.prisma.storePurchase.update({ where: { id: p.id }, data: { expiresAt, ...(o.note && { note: [p.note, o.note].filter(Boolean).join(' · ') }) } });
        if (o.amount > 0)
          await this.prisma.storePayment.create({
            data: {
              storeId: p.storeId, months: p.months, amount: o.amount, periodFrom: now, periodTo: expiresAt ?? now, method: o.method,
              note: `Mua thêm: ${p.name} (${p.code})${o.ref ? ` · ${o.ref}` : ''}`, createdById: o.actorId,
            },
          });
      } else {
        const store = await this.superService.renew(p.storeId, {
          planId: p.planId!, months: p.months, amount: o.amount, method: o.method, note: `Đơn ${p.code}${o.ref ? ` · ${o.ref}` : ''}`,
        }, o.actorId);
        await this.prisma.storePurchase.update({ where: { id: p.id }, data: { expiresAt: store.planExpiresAt } });
      }
    } catch (e) {
      await this.prisma.storePurchase.update({ where: { id: p.id }, data: { status: 'PENDING', paidAt: null, startsAt: null, confirmedById: null } });
      throw e;
    }
    const s = await this.prisma.store.findUnique({ where: { id: p.storeId }, select: { slug: true } });
    if (s) clearStoreCache(s.slug);
    if (p.source !== 'CONTRACT')
      this.safe(() => this.notifications.notifyStaff(p.storeId, {
        type: 'PARTNER', title: `✅ Đã kích hoạt: ${p.name}`,
        body: p.type === 'ADDON' ? `+${p.quantity.toLocaleString('vi-VN')} ${LIMIT_LABEL[p.kind as PlanLimit] ?? ''}` : 'Gói dịch vụ đã được cập nhật',
        data: { url: '/admin/subscription' },
      }));
  }
}
