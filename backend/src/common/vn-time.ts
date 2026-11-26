/**
 * Mốc thời gian theo giờ Việt Nam (UTC+7, không có giờ mùa hè).
 * Server (Vercel) chạy UTC → không dùng getDate()/setHours() của giờ máy chủ để gom số liệu theo ngày,
 * nếu không đơn lúc 0h–7h sáng sẽ bị tính sang ngày hôm trước.
 */
const OFFSET = 7 * 3_600_000;
const pad = (n: number) => String(n).padStart(2, '0');

/** Các thành phần ngày theo giờ VN */
export function vnParts(d: Date) {
  const x = new Date(d.getTime() + OFFSET);
  return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate() };
}

/** yyyy-mm-dd theo giờ VN */
export const vnDayKey = (d: Date) => {
  const p = vnParts(d);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
};

/** yyyy-mm theo giờ VN */
export const vnMonthKey = (d: Date) => {
  const p = vnParts(d);
  return `${p.y}-${pad(p.m)}`;
};

/** 00:00 giờ VN của ngày (y, m 1-12, d) → Date (UTC) */
export const vnDate = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d) - OFFSET);

/** "yyyy-mm-dd" → 00:00:00.000 giờ VN */
export const vnStartOfDay = (ymd: string) => {
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number);
  return vnDate(y, m, d);
};

/** "yyyy-mm-dd" → 23:59:59.999 giờ VN */
export const vnEndOfDay = (ymd: string) => new Date(vnStartOfDay(ymd).getTime() + 86_400_000 - 1);

/** 00:00 giờ VN của hôm nay, lùi `back` ngày */
export const vnToday = (back = 0) => {
  const p = vnParts(new Date());
  return vnDate(p.y, p.m, p.d - back);
};

/** Ngày đầu tháng (giờ VN) của thời điểm d */
export const vnMonthStart = (d = new Date()) => {
  const p = vnParts(d);
  return vnDate(p.y, p.m, 1);
};
