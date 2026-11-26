/**
 * Thuế suất GTGT áp dụng cho hàng hoá (Luật Thuế GTGT 48/2024/QH15, sửa đổi bởi Luật 149/2025/QH15):
 *  - 0%  : hàng xuất khẩu (bán lẻ trong nước gần như không dùng)
 *  - 5%  : nhóm hàng thiết yếu (vd. nước sạch sinh hoạt, đường, thực phẩm tươi sống/sơ chế ở khâu thương mại…)
 *  - 10% : mức phổ thông
 *  - 8%  : mức 10% được GIẢM 2% theo NQ 204/2025/QH15 + NĐ 174/2025/NĐ-CP, chỉ cho hoá đơn lập từ 01/07/2025 đến hết 31/12/2026,
 *          trừ hàng thuộc Phụ lục I, II của NĐ 174 (vd. từ 01/01/2026 nước giải khát có đường > 5g/100ml không được giảm)
 *  - KCT : không chịu thuế GTGT (vd. sản phẩm trồng trọt/chăn nuôi chưa chế biến do người sản xuất tự bán)
 *  - KKKNT: không phải kê khai, tính nộp thuế GTGT
 * Chủ cửa hàng tự chịu trách nhiệm chọn đúng thuế suất cho từng mặt hàng (đối chiếu biểu thuế / hỏi cơ quan thuế).
 */
export const VAT_RATES = ['0', '5', '8', '10', 'KCT', 'KKKNT'] as const;
export type VatRate = (typeof VAT_RATES)[number];

export const VAT_LABEL: Record<string, string> = {
  '0': '0%', '5': '5%', '8': '8% (giảm từ 10%)', '10': '10%', KCT: 'Không chịu thuế (KCT)', KKKNT: 'Không kê khai, tính nộp (KKKNT)',
  NA: 'Chưa khai báo thuế suất',
};

/** Hạn cuối áp dụng mức giảm 10% → 8% (NQ 204/2025/QH15) */
export const REDUCED_VAT_UNTIL = '2026-12-31';

/** Tách thuế từ số tiền ĐÃ GỒM thuế (giá bán lẻ niêm yết đã gồm VAT) */
export function splitVat(gross: number, rate?: string | null) {
  const r = rate != null && /^\d+$/.test(rate) ? Number(rate) : 0;
  if (!r) return { preTax: gross, vat: 0 };
  const preTax = Math.round((gross * 100) / (100 + r));
  return { preTax, vat: gross - preTax };
}
