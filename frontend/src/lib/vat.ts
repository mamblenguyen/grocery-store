/** Thuế suất GTGT – đồng bộ với backend/src/common/vat.ts */
export const VAT_OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: '8', label: '8% (giảm từ 10%)', hint: 'Hàng chịu 10% được giảm 2% đến hết 31/12/2026 (NQ 204/2025/QH15, NĐ 174/2025) – trừ hàng thuộc Phụ lục I, II NĐ 174 (vd. nước giải khát có đường > 5g/100ml từ 01/01/2026)' },
  { value: '10', label: '10%', hint: 'Mức phổ thông; hàng thuộc danh mục không được giảm thuế' },
  { value: '5', label: '5%', hint: 'Nhóm hàng thiết yếu: nước sạch sinh hoạt, đường, thực phẩm tươi sống / sơ chế ở khâu kinh doanh thương mại…' },
  { value: '0', label: '0%', hint: 'Hàng xuất khẩu – bán lẻ trong nước gần như không dùng' },
  { value: 'KCT', label: 'Không chịu thuế (KCT)', hint: 'Đối tượng không chịu thuế GTGT theo Điều 5 Luật Thuế GTGT' },
  { value: 'KKKNT', label: 'Không kê khai, tính nộp (KKKNT)', hint: 'Trường hợp không phải kê khai, tính nộp thuế GTGT' },
];
export const VAT_LABEL: Record<string, string> = Object.fromEntries(VAT_OPTIONS.map((o) => [o.value, o.label]));
export const vatShort = (r?: string | null) => (r == null ? '—' : /^\d+$/.test(r) ? `${r}%` : r);

/** Tách thuế từ số tiền đã gồm thuế */
export function splitVat(gross: number, rate?: string | null) {
  const r = rate != null && /^\d+$/.test(rate) ? Number(rate) : 0;
  if (!r) return { preTax: gross, vat: 0 };
  const preTax = Math.round((gross * 100) / (100 + r));
  return { preTax, vat: gross - preTax };
}

export const TAX_METHODS: Record<string, { label: string; invoice: string; hint: string }> = {
  KHAU_TRU: {
    label: 'Phương pháp khấu trừ',
    invoice: 'Hoá đơn GTGT (mẫu số 1)',
    hint: 'Doanh nghiệp / HKD đăng ký nộp thuế theo phương pháp khấu trừ. Hoá đơn ghi giá chưa thuế, thuế suất và tiền thuế từng mức.',
  },
  TRUC_TIEP: {
    label: 'Phương pháp trực tiếp (tỷ lệ % trên doanh thu)',
    invoice: 'Hoá đơn bán hàng (mẫu số 2)',
    hint: 'Hộ kinh doanh / doanh nghiệp tính thuế trực tiếp. Hoá đơn bán hàng KHÔNG ghi thuế suất GTGT. HKD phân phối hàng hoá: GTGT 1% + TNCN 0,5% trên doanh thu (tham khảo, đối chiếu NĐ 68/2026 hiện hành).',
  },
  MIEN: {
    label: 'HKD dưới ngưỡng chịu thuế',
    invoice: 'Không bắt buộc hoá đơn điện tử',
    hint: 'HKD có doanh thu năm không vượt ngưỡng không chịu thuế GTGT, TNCN (1 tỷ đồng/năm theo NĐ 141/2026 sửa NĐ 68/2026) – vẫn phải thông báo doanh thu với cơ quan thuế.',
  },
};

/**
 * Bảng tổng hợp thuế theo thuế suất của một đơn (giá đã gồm thuế).
 * Giảm giá của đơn được phân bổ cho từng dòng theo tỉ lệ thành tiền (dòng cuối nhận phần dư làm tròn).
 * Phí giao hàng không đưa vào bảng (dịch vụ vận chuyển có thể do bên khác cung cấp).
 */
export function vatBreakdown(items: { total: number; vatRate?: string | null }[], subtotal: number, discount: number, fallbackRate: string) {
  const goods = subtotal - discount;
  const rows = new Map<string, { rate: string; gross: number; preTax: number; vat: number }>();
  let allocated = 0;
  items.forEach((it, i) => {
    const share = i === items.length - 1 ? goods - allocated : subtotal ? Math.round((it.total / subtotal) * goods) : 0;
    allocated += share;
    const rate = it.vatRate ?? fallbackRate;
    const sp = splitVat(share, rate);
    const r = rows.get(rate) ?? { rate, gross: 0, preTax: 0, vat: 0 };
    r.gross += share; r.preTax += sp.preTax; r.vat += sp.vat;
    rows.set(rate, r);
  });
  const list = [...rows.values()].sort((a, b) => (Number(b.rate) || -1) - (Number(a.rate) || -1));
  return { rows: list, preTax: list.reduce((a, r) => a + r.preTax, 0), vat: list.reduce((a, r) => a + r.vat, 0), gross: goods };
}

/** Ngày hết hiệu lực mức thuế suất 8% */
export const REDUCED_VAT_UNTIL = '2026-12-31';
