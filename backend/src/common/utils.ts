export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function paginate(page?: number, limit?: number) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  return { skip: (p - 1) * l, take: l, page: p, limit: l };
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const VN_OFFSET = '+07:00';

/**
 * Khoảng thời gian cho bộ lọc createdAt.
 * - Chuỗi YYYY-MM-DD hiểu theo giờ Asia/Ho_Chi_Minh (+07:00): `from` → gte đầu ngày,
 *   `to` → lt đầu ngày kế tiếp (bao trọn cả ngày).
 * - Chuỗi khác (ISO đầy đủ) được parse trực tiếp; `to` khi đó dùng lte.
 */
export function buildDateRange(from?: string, to?: string): { gte?: Date; lt?: Date; lte?: Date } | undefined {
  if (!from && !to) return undefined;
  const range: { gte?: Date; lt?: Date; lte?: Date } = {};
  if (from) range.gte = DATE_ONLY.test(from) ? new Date(`${from}T00:00:00${VN_OFFSET}`) : new Date(from);
  if (to) {
    if (DATE_ONLY.test(to)) {
      const start = new Date(`${to}T00:00:00${VN_OFFSET}`);
      range.lt = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    } else {
      range.lte = new Date(to);
    }
  }
  return range;
}

export function paged<T>(items: T[], total: number, page: number, limit: number) {
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}
