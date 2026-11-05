import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StockDocType } from '@prisma/client';
import { paged, paginate } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';
import { QueryStockDocsDto, SaveStockDocDto, SupplierDto } from './stock.dto';

const PREFIX: Record<StockDocType, string> = { IMPORT: 'PN', EXPORT: 'PX', STOCKTAKE: 'KK' };
export const REASON_LABEL: Record<string, string> = {
  DAMAGED: 'Hàng hư hỏng', EXPIRED: 'Hàng hết hạn', RETURN_SUPPLIER: 'Trả nhà cung cấp', INTERNAL: 'Sử dụng nội bộ', OTHER: 'Khác',
};

const docInclude = {
  supplier: true,
  createdBy: { select: { id: true, fullName: true } },
  completedBy: { select: { id: true, fullName: true } },
  items: {
    orderBy: { id: 'asc' },
    include: {
      variant: {
        select: {
          id: true, sku: true, barcode: true, name: true, stock: true, costPrice: true, price: true,
          product: { select: { id: true, name: true, unit: true, thumbnail: true } },
        },
      },
    },
  },
} satisfies Prisma.StockDocumentInclude;

type Tx = Prisma.TransactionClient;

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  // ───────────────────────── Tra cứu mã (quét QR / mã vạch) ─────────────────────────
  /** Nhận: mã vạch, SKU, hoặc nội dung QR dạng "SKU:<sku>" / URL có ?sku= */
  async lookup(raw: string) {
    let code = (raw ?? '').trim();
    if (!code) throw new BadRequestException('Thiếu mã');
    const m = code.match(/(?:^SKU:|[?&]sku=)([^&\s]+)/i);
    if (m) code = decodeURIComponent(m[1]);
    const v = await this.prisma.productVariant.findFirst({
      where: { OR: [{ barcode: code }, { sku: code }] },
      include: { product: { select: { id: true, name: true, unit: true, thumbnail: true, isActive: true } } },
    });
    if (!v) throw new NotFoundException(`Không tìm thấy sản phẩm có mã "${code}"`);
    return v;
  }

  /** Tìm biến thể để thêm vào phiếu / POS */
  searchVariants(search: string, limit = 20) {
    return this.prisma.productVariant.findMany({
      where: search
        ? { OR: [{ sku: { contains: search } }, { barcode: search }, { name: { contains: search } }, { product: { name: { contains: search } } }] }
        : {},
      take: limit,
      orderBy: [{ product: { name: 'asc' } }, { position: 'asc' }],
      include: { product: { select: { id: true, name: true, unit: true, thumbnail: true, isActive: true } } },
    });
  }

  byIds(ids: number[]) {
    return this.prisma.productVariant.findMany({
      where: { id: { in: ids } },
      include: { product: { select: { id: true, name: true, unit: true, thumbnail: true, isActive: true } } },
    });
  }

  async summary() {
    const threshold = this.prisma.productVariant.fields.lowStockThreshold;
    const [variants, low, out] = await Promise.all([
      this.prisma.productVariant.findMany({ select: { stock: true, costPrice: true, price: true } }),
      this.prisma.productVariant.count({ where: { isActive: true, stock: { gt: 0, lte: threshold } } }),
      this.prisma.productVariant.count({ where: { isActive: true, stock: { lte: 0 } } }),
    ]);
    return {
      skus: variants.length,
      units: variants.reduce((s, v) => s + Math.max(0, v.stock), 0),
      costValue: variants.reduce((s, v) => s + Math.max(0, v.stock) * (v.costPrice ?? 0), 0),
      retailValue: variants.reduce((s, v) => s + Math.max(0, v.stock) * v.price, 0),
      lowStock: low,
      outOfStock: out,
    };
  }

  // ───────────────────────── Nhà cung cấp ─────────────────────────
  suppliers(search?: string) {
    return this.prisma.supplier.findMany({
      where: search ? { OR: [{ name: { contains: search } }, { phone: { contains: search } }, { taxCode: { contains: search } }] } : {},
      orderBy: { name: 'asc' },
      include: { _count: { select: { documents: true } } },
    });
  }

  saveSupplier(dto: SupplierDto, id?: number) {
    return id ? this.prisma.supplier.update({ where: { id }, data: dto }) : this.prisma.supplier.create({ data: dto });
  }

  async removeSupplier(id: number) {
    const used = await this.prisma.stockDocument.count({ where: { supplierId: id } });
    if (used) return this.prisma.supplier.update({ where: { id }, data: { isActive: false } }); // có chứng từ → chỉ ngừng hoạt động
    return this.prisma.supplier.delete({ where: { id } });
  }

  // ───────────────────────── Phiếu kho ─────────────────────────
  async list(q: QueryStockDocsDto) {
    const { skip, take, page, limit } = paginate(q.page, q.limit);
    const where: Prisma.StockDocumentWhereInput = {
      ...(q.type && { type: q.type }),
      ...(q.status && { status: q.status }),
      ...(q.supplierId && { supplierId: q.supplierId }),
      ...((q.from || q.to) && {
        createdAt: { ...(q.from && { gte: new Date(q.from) }), ...(q.to && { lte: new Date(q.to + 'T23:59:59') }) },
      }),
      ...(q.search && {
        OR: [{ code: { contains: q.search } }, { invoiceNo: { contains: q.search } }, { note: { contains: q.search } }, { supplier: { name: { contains: q.search } } }],
      }),
    };
    const [items, total] = await Promise.all([
      this.prisma.stockDocument.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: { supplier: { select: { id: true, name: true } }, createdBy: { select: { fullName: true } }, _count: { select: { items: true } } },
      }),
      this.prisma.stockDocument.count({ where }),
    ]);
    return paged(items, total, page, limit);
  }

  async findOne(id: number) {
    const doc = await this.prisma.stockDocument.findUnique({ where: { id }, include: docInclude });
    if (!doc) throw new NotFoundException('Không tìm thấy phiếu kho');
    return doc;
  }

  private async nextCode(tx: Tx, type: StockDocType) {
    const d = new Date();
    const ymd = `${d.getFullYear() % 100}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const prefix = `${PREFIX[type]}${ymd}-`;
    const last = await tx.stockDocument.findFirst({ where: { code: { startsWith: prefix } }, orderBy: { code: 'desc' }, select: { code: true } });
    const seq = last ? Number(last.code.slice(prefix.length)) + 1 : 1;
    return `${prefix}${String(seq).padStart(3, '0')}`;
  }

  private validate(dto: SaveStockDocDto) {
    if (dto.type !== 'STOCKTAKE' && dto.items.some((i) => i.quantity <= 0)) throw new BadRequestException('Số lượng phải lớn hơn 0');
    if (dto.type === 'EXPORT' && !dto.reason) throw new BadRequestException('Vui lòng chọn lý do xuất kho');
    if (dto.type === 'STOCKTAKE') {
      const ids = dto.items.map((i) => i.variantId);
      if (new Set(ids).size !== ids.length) throw new BadRequestException('Mỗi sản phẩm chỉ xuất hiện 1 lần trong phiếu kiểm kê');
    }
  }

  private itemsData(dto: SaveStockDocDto) {
    return dto.items.map((i) => {
      const unitCost = dto.type === 'IMPORT' ? i.unitCost ?? 0 : 0;
      return {
        variantId: i.variantId, quantity: i.quantity, unitCost, total: dto.type === 'IMPORT' ? unitCost * i.quantity : 0,
        lotNo: i.lotNo || null, expiryDate: i.expiryDate ? new Date(i.expiryDate.slice(0, 10) + 'T00:00:00Z') : null, note: i.note || null,
      };
    });
  }

  /** Tạo phiếu (nháp hoặc hoàn tất luôn) */
  async create(dto: SaveStockDocDto, userId: number) {
    this.validate(dto);
    const id = await this.prisma.$transaction(async (tx) => {
      const items = this.itemsData(dto);
      const doc = await tx.stockDocument.create({
        data: {
          code: await this.nextCode(tx, dto.type), type: dto.type,
          supplierId: dto.type === 'STOCKTAKE' ? null : dto.supplierId ?? null,
          reason: dto.type === 'EXPORT' ? dto.reason : null, invoiceNo: dto.invoiceNo, note: dto.note,
          createdById: userId,
          totalQuantity: items.reduce((s, i) => s + i.quantity, 0),
          totalAmount: items.reduce((s, i) => s + i.total, 0),
          items: { create: items },
        },
      });
      if (dto.complete) await this.applyComplete(tx, doc.id, userId);
      return doc.id;
    });
    return this.findOne(id);
  }

  /** Sửa phiếu nháp (thay toàn bộ dòng hàng) */
  async update(id: number, dto: SaveStockDocDto, userId: number) {
    this.validate(dto);
    await this.prisma.$transaction(async (tx) => {
      const doc = await tx.stockDocument.findUniqueOrThrow({ where: { id } });
      if (doc.status !== 'DRAFT') throw new BadRequestException('Chỉ sửa được phiếu nháp');
      if (doc.type !== dto.type) throw new BadRequestException('Không thể đổi loại phiếu');
      const items = this.itemsData(dto);
      await tx.stockDocumentItem.deleteMany({ where: { documentId: id } });
      await tx.stockDocument.update({
        where: { id },
        data: {
          supplierId: dto.type === 'STOCKTAKE' ? null : dto.supplierId ?? null,
          reason: dto.type === 'EXPORT' ? dto.reason : null, invoiceNo: dto.invoiceNo, note: dto.note,
          totalQuantity: items.reduce((s, i) => s + i.quantity, 0),
          totalAmount: items.reduce((s, i) => s + i.total, 0),
          items: { create: items },
        },
      });
      if (dto.complete) await this.applyComplete(tx, id, userId);
    });
    return this.findOne(id);
  }

  async complete(id: number, userId: number) {
    await this.prisma.$transaction((tx) => this.applyComplete(tx, id, userId));
    return this.findOne(id);
  }

  /** Áp phiếu vào tồn kho */
  private async applyComplete(tx: Tx, id: number, userId: number) {
    const doc = await tx.stockDocument.findUniqueOrThrow({ where: { id }, include: { items: { include: { variant: { include: { product: true } } } } } });
    if (doc.status !== 'DRAFT') throw new BadRequestException('Phiếu đã được xử lý');
    const label = `${doc.type === 'IMPORT' ? 'Nhập' : doc.type === 'EXPORT' ? 'Xuất' : 'Kiểm kê'} theo phiếu ${doc.code}`;

    if (doc.type === 'EXPORT') {
      // Kiểm tra tổng xuất theo từng biến thể (một biến thể có thể nằm ở nhiều dòng)
      const need = new Map<number, number>();
      doc.items.forEach((i) => need.set(i.variantId, (need.get(i.variantId) ?? 0) + i.quantity));
      for (const [vid, qty] of need) {
        const v = doc.items.find((i) => i.variantId === vid)!.variant;
        const cur = await tx.productVariant.findUniqueOrThrow({ where: { id: vid }, select: { stock: true } });
        if (cur.stock < qty) throw new BadRequestException(`"${v.product.name} - ${v.name}" chỉ còn ${cur.stock}, không đủ xuất ${qty}`);
      }
    }

    let totalAmount = 0;
    let totalQuantity = 0;
    for (const it of doc.items) {
      const v = await tx.productVariant.findUniqueOrThrow({ where: { id: it.variantId } });
      if (doc.type === 'IMPORT') {
        const newStock = v.stock + it.quantity;
        // Giá vốn bình quân gia quyền
        const base = Math.max(0, v.stock);
        const newCost = base > 0 && v.costPrice != null
          ? Math.round((base * v.costPrice + it.quantity * it.unitCost) / (base + it.quantity))
          : it.unitCost;
        await tx.productVariant.update({ where: { id: v.id }, data: { stock: newStock, costPrice: newCost } });
        await tx.inventoryLog.create({
          data: { variantId: v.id, change: it.quantity, stockAfter: newStock, unitCost: it.unitCost, reason: 'IMPORT', note: label, userId, documentId: doc.id },
        });
        totalAmount += it.total;
        totalQuantity += it.quantity;
      } else if (doc.type === 'EXPORT') {
        const r = await tx.productVariant.updateMany({ where: { id: v.id, stock: { gte: it.quantity } }, data: { stock: { decrement: it.quantity } } });
        if (r.count === 0) throw new BadRequestException(`"${it.variant.product.name} - ${v.name}" không đủ tồn để xuất`);
        const cost = v.costPrice ?? 0;
        await tx.stockDocumentItem.update({ where: { id: it.id }, data: { unitCost: cost, total: cost * it.quantity } });
        await tx.inventoryLog.create({
          data: { variantId: v.id, change: -it.quantity, stockAfter: v.stock - it.quantity, unitCost: cost, reason: 'EXPORT', note: label, userId, documentId: doc.id },
        });
        totalAmount += cost * it.quantity;
        totalQuantity += it.quantity;
      } else {
        // Kiểm kê: số đếm thực tế → tồn mới
        const diff = it.quantity - v.stock;
        const cost = v.costPrice ?? 0;
        await tx.stockDocumentItem.update({ where: { id: it.id }, data: { systemQty: v.stock, unitCost: cost, total: diff * cost } });
        if (diff !== 0) {
          await tx.productVariant.update({ where: { id: v.id }, data: { stock: it.quantity } });
          await tx.inventoryLog.create({
            data: { variantId: v.id, change: diff, stockAfter: it.quantity, unitCost: cost, reason: 'STOCKTAKE', note: label, userId, documentId: doc.id },
          });
        }
        totalAmount += diff * cost;
        totalQuantity += diff;
      }
    }
    await tx.stockDocument.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date(), completedById: userId, totalAmount, totalQuantity },
    });
  }

  /** Huỷ phiếu: nháp → huỷ; đã hoàn tất → đảo ngược tồn kho */
  async cancel(id: number, reason: string, userId: number) {
    await this.prisma.$transaction(async (tx) => {
      const doc = await tx.stockDocument.findUniqueOrThrow({ where: { id }, include: { items: { include: { variant: { include: { product: true } } } } } });
      if (doc.status === 'CANCELLED') throw new BadRequestException('Phiếu đã bị huỷ');
      if (doc.status === 'COMPLETED') {
        const note = `Huỷ phiếu ${doc.code}: ${reason}`;
        for (const it of doc.items) {
          const v = await tx.productVariant.findUniqueOrThrow({ where: { id: it.variantId } });
          // Lượng cần đảo: nhập → trừ lại; xuất → cộng lại; kiểm kê → trừ phần chênh lệch
          const change = doc.type === 'IMPORT' ? -it.quantity : doc.type === 'EXPORT' ? it.quantity : -(it.quantity - (it.systemQty ?? it.quantity));
          if (change === 0) continue;
          const newStock = v.stock + change;
          if (newStock < 0)
            throw new BadRequestException(`Không thể huỷ: "${it.variant.product.name} - ${v.name}" chỉ còn ${v.stock}, cần trừ ${-change}`);
          let costPrice = v.costPrice;
          if (doc.type === 'IMPORT' && newStock > 0 && v.costPrice != null) {
            // Đảo bình quân gia quyền
            const c = Math.round((v.stock * v.costPrice - it.quantity * it.unitCost) / newStock);
            costPrice = c > 0 ? c : v.costPrice;
          }
          await tx.productVariant.update({ where: { id: v.id }, data: { stock: newStock, costPrice } });
          await tx.inventoryLog.create({
            data: {
              variantId: v.id, change, stockAfter: newStock, unitCost: it.unitCost,
              reason: doc.type === 'STOCKTAKE' ? 'STOCKTAKE' : doc.type, note, userId, documentId: doc.id,
            },
          });
        }
      }
      await tx.stockDocument.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason } });
    });
    return this.findOne(id);
  }

  async remove(id: number) {
    const doc = await this.prisma.stockDocument.findUniqueOrThrow({ where: { id } });
    if (doc.status !== 'DRAFT') throw new BadRequestException('Chỉ xoá được phiếu nháp. Phiếu đã hoàn tất hãy dùng chức năng Huỷ.');
    return this.prisma.stockDocument.delete({ where: { id } });
  }
}
