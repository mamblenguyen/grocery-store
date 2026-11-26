import { createHash } from 'crypto';
import type { AddonLine } from '../billing/billing.service';
import type { PlatformInfo } from '../common/platform';

/**
 * Mẫu "Hợp đồng cung cấp dịch vụ nền tảng thương mại điện tử" giữa sàn (Bên A) và đối tác bán hàng (Bên B).
 * Nội dung được sinh 1 lần khi duyệt hồ sơ, lưu snapshot + SHA-256 để chứng minh không bị sửa sau khi ký.
 *
 * LƯU Ý: đây là mẫu tham khảo do phần mềm sinh ra – trước khi dùng chính thức, doanh nghiệp vận hành sàn
 * cần cho luật sư / bộ phận pháp chế rà soát và điều chỉnh theo mô hình kinh doanh thực tế.
 */
export interface ContractParty {
  name: string; taxCode: string; address: string; representative: string; title: string; phone: string; email: string;
  idNumber?: string; licenseNo?: string; licenseDate?: string | null; licensePlace?: string | null;
  bankName?: string; bankAccountNo?: string; bankAccountName?: string;
}
export interface PartnerContract {
  title: string;
  no: string;
  createdAt: string;
  bases: string[];
  partyA: ContractParty;
  /** Số đăng ký sàn TMĐT với Bộ Công Thương (nếu có) */
  ecommerceRegistration?: string | null;
  partyB: ContractParty & { storeName: string; storeAddress: string; businessType: string };
  /** months = 0: gói miễn phí, không thời hạn. addons: gói mua thêm hạn mức ký kèm */
  commercial: {
    planName: string; priceMonthly: number; months: number; amount: number; settlementDays: number; startRule: string;
    planAmount?: number; addons?: AddonLine[];
  };
  articles: { title: string; items: string[] }[];
}

const money = (n: number) => `${n.toLocaleString('vi-VN')} đồng`;
const d = (v?: Date | null) => (v ? v.toISOString().slice(0, 10) : null);

export function buildContract(input: {
  no: string;
  platform: PlatformInfo;
  app: {
    businessType: string; businessName: string; taxCode: string; licenseNo: string; licenseDate: Date | null; licensePlace: string | null;
    businessAddress: string | null; storeAddress: string; storeName: string; representative: string; representativeTitle: string | null;
    representativeId: string; representativePhone: string; representativeEmail: string; bankName: string; bankAccountNo: string; bankAccountName: string;
  };
  plan: { name: string; priceMonthly: number } | null;
  months: number;
  amount: number;
  addons?: AddonLine[];
}): PartnerContract {
  const { platform: p, app: a } = input;
  const addons = input.addons ?? [];
  const free = !input.plan?.priceMonthly;
  const planAmount = (input.plan?.priceMonthly ?? 0) * input.months;
  const planText = free
    ? `Gói dịch vụ: ${input.plan?.name ?? 'Miễn phí'} – không thu phí, không thời hạn (Bên A được điều chỉnh hạn mức của gói miễn phí sau khi thông báo trước 30 ngày).`
    : `Gói dịch vụ: ${input.plan?.name}; đơn giá ${money(input.plan!.priceMonthly)}/tháng; thời hạn ${input.months} tháng; thành tiền ${money(planAmount)}.`;
  const addonText = addons.length
    ? `Gói mua thêm hạn mức: ${addons.map((l) => `${l.name}${l.units > 1 ? ` × ${l.units}` : ''} (${l.months ? `hiệu lực ${l.months} tháng` : 'không thời hạn'}) – ${money(l.price)}`).join('; ')}.`
    : null;
  const btype = a.businessType === 'CONG_TY' ? 'Doanh nghiệp' : 'Hộ kinh doanh';
  return {
    title: 'HỢP ĐỒNG CUNG CẤP DỊCH VỤ NỀN TẢNG THƯƠNG MẠI ĐIỆN TỬ',
    no: input.no,
    createdAt: new Date().toISOString(),
    bases: [
      'Bộ luật Dân sự số 91/2015/QH13;',
      'Luật Thương mại số 36/2005/QH11 và các văn bản sửa đổi, bổ sung;',
      'Luật Giao dịch điện tử số 20/2023/QH15;',
      'Luật Thương mại điện tử số 122/2025/QH15 và Nghị định số 248/2026/NĐ-CP hướng dẫn thi hành;',
      'Luật Bảo vệ quyền lợi người tiêu dùng số 19/2023/QH15;',
      'Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 và văn bản hướng dẫn;',
      'Pháp luật về thuế, quản lý thuế và hoá đơn, chứng từ hiện hành;',
      'Nhu cầu và khả năng của hai Bên.',
    ],
    partyA: {
      name: p.legalName, taxCode: p.taxCode, address: p.address, representative: p.representative, title: p.representativeTitle,
      phone: p.phone, email: p.email,
    },
    ecommerceRegistration: p.ecommerceRegistration || null,
    partyB: {
      name: a.businessName, businessType: btype, taxCode: a.taxCode, address: a.businessAddress || a.storeAddress,
      licenseNo: a.licenseNo, licenseDate: d(a.licenseDate), licensePlace: a.licensePlace,
      representative: a.representative, title: a.representativeTitle || (a.businessType === 'CONG_TY' ? 'Người đại diện theo pháp luật' : 'Chủ hộ kinh doanh'),
      idNumber: a.representativeId, phone: a.representativePhone, email: a.representativeEmail,
      bankName: a.bankName, bankAccountNo: a.bankAccountNo, bankAccountName: a.bankAccountName,
      storeName: a.storeName, storeAddress: a.storeAddress,
    },
    commercial: {
      planName: input.plan?.name ?? 'Theo thoả thuận', priceMonthly: input.plan?.priceMonthly ?? 0, months: input.months, amount: input.amount,
      settlementDays: p.settlementDays,
      startRule: `Từ ngày Bên A kích hoạt gian hàng sau khi Hợp đồng được ký${input.amount > 0 ? ' và Bên B thanh toán phí' : ''}`,
      planAmount, ...(addons.length && { addons }),
    },
    articles: [
      {
        title: 'Điều 1. Đối tượng của Hợp đồng',
        items: [
          `Bên A cung cấp cho Bên B quyền sử dụng nền tảng thương mại điện tử "${p.name}" (website và ứng dụng di động) để mở gian hàng "${a.storeName}", đăng bán hàng hoá, nhận và xử lý đơn hàng, quản lý kho, bán hàng tại quầy (POS) và các tính năng theo gói dịch vụ đã đăng ký.`,
          'Bên B là người bán hàng trên nền tảng, tự chịu trách nhiệm về hàng hoá, giá bán, giao dịch với người mua và các nghĩa vụ pháp lý của người bán theo quy định.',
        ],
      },
      {
        title: 'Điều 2. Phí dịch vụ và phương thức thanh toán',
        items: [
          planText,
          ...(addonText ? [addonText] : []),
          `Tổng phí kỳ đầu: ${money(input.amount)} (đã bao gồm thuế GTGT nếu có).`,
          `${input.amount > 0 ? 'Bên B thanh toán phí bằng chuyển khoản vào tài khoản của Bên A trước khi gian hàng được kích hoạt. ' : ''}Phí gia hạn thanh toán trước kỳ sử dụng tiếp theo theo bảng giá công bố tại thời điểm gia hạn.`,
          'Trong thời gian sử dụng, Bên B được mua thêm hạn mức (số sản phẩm, đơn hàng/tháng, tài khoản nhân viên, chiến dịch…) hoặc đổi sang gói khác theo bảng giá Bên A công bố tại thời điểm mua. Hạn mức mua thêm có hiệu lực từ khi Bên A xác nhận thanh toán, theo thời hạn ghi tại từng gói, không quy đổi thành tiền và không chuyển nhượng cho gian hàng khác.',
          'Bên A lập và gửi hoá đơn điện tử cho khoản phí dịch vụ Bên B đã thanh toán theo quy định về hoá đơn, chứng từ.',
          'Phí đã thanh toán không được hoàn lại, trừ trường hợp Bên A không cung cấp được dịch vụ do lỗi của Bên A; khi đó Bên A hoàn phần phí tương ứng thời gian chưa sử dụng.',
        ],
      },
      {
        title: 'Điều 3. Thời hạn Hợp đồng',
        items: [
          free
            ? 'Hợp đồng có hiệu lực từ ngày ký và không xác định thời hạn đối với gói miễn phí; khi Bên B nâng cấp lên gói trả phí, thời hạn sử dụng gói trả phí tính đến hết số tháng đã thanh toán.'
            : 'Hợp đồng có hiệu lực từ ngày ký. Thời hạn sử dụng dịch vụ tính từ ngày Bên A kích hoạt gian hàng đến hết số tháng đã thanh toán và được gia hạn tương ứng mỗi lần Bên B thanh toán phí gia hạn.',
          'Khi hết hạn mà Bên B không gia hạn, Bên A được tạm ngưng nhận đơn trực tuyến của gian hàng; dữ liệu của Bên B được lưu giữ tối thiểu 30 ngày để Bên B gia hạn hoặc trích xuất.',
        ],
      },
      {
        title: 'Điều 4. Quyền và nghĩa vụ của Bên A',
        items: [
          'Duy trì hệ thống hoạt động ổn định, an toàn; thông báo trước cho Bên B khi bảo trì theo kế hoạch.',
          'Xác thực danh tính, thông tin của Bên B trước khi cho phép mở gian hàng theo quy định của pháp luật về thương mại điện tử; được từ chối hoặc tạm ngưng gian hàng khi thông tin không trung thực, không đầy đủ.',
          'Công khai quy chế hoạt động của nền tảng; tiếp nhận, xử lý phản ánh, khiếu nại của người mua; gỡ bỏ thông tin hàng hoá vi phạm pháp luật trong thời hạn luật định khi phát hiện hoặc có yêu cầu của cơ quan có thẩm quyền.',
          p.vnpayEnabled
            ? 'Cung cấp thông tin về Bên B và giao dịch trên nền tảng cho cơ quan nhà nước có thẩm quyền theo quy định; thực hiện nghĩa vụ khấu trừ, khai thay, nộp thay thuế cho Bên B (nếu thuộc trường hợp áp dụng) đối với giao dịch thanh toán qua nền tảng.'
            : 'Cung cấp thông tin về Bên B và giao dịch trên nền tảng cho cơ quan quản lý thuế và cơ quan nhà nước có thẩm quyền theo quy định.',
          'Bảo mật thông tin, dữ liệu của Bên B; chỉ sử dụng cho mục đích thực hiện Hợp đồng và theo quy định pháp luật.',
          p.vnpayEnabled
            ? `Đối với tiền hàng người mua thanh toán qua cổng thanh toán của nền tảng, Bên A đối soát và chuyển cho Bên B trong vòng ${p.settlementDays} ngày làm việc kể từ khi đơn hàng hoàn thành, sau khi trừ các khoản thuế đã khấu trừ theo quy định (nếu có) và khoản hoàn tiền cho người mua (nếu có).`
            : 'Bên A không thu hộ tiền hàng: người mua thanh toán trực tiếp cho Bên B (tiền mặt khi nhận hàng hoặc chuyển khoản vào tài khoản của Bên B). Bên B tự chịu trách nhiệm thu tiền, hoàn tiền cho người mua và nghĩa vụ thuế phát sinh.',
        ],
      },
      {
        title: 'Điều 5. Quyền và nghĩa vụ của Bên B',
        items: [
          'Cung cấp thông tin, giấy tờ trung thực, chính xác, đầy đủ và cập nhật khi có thay đổi; chịu trách nhiệm trước pháp luật về tính hợp pháp của các giấy tờ đã cung cấp.',
          'Chỉ kinh doanh hàng hoá được phép lưu thông; không kinh doanh hàng cấm, hàng giả, hàng nhập lậu, hàng không rõ nguồn gốc; đáp ứng điều kiện an toàn thực phẩm; có giấy phép đối với hàng hoá kinh doanh có điều kiện (rượu, thuốc lá…) trước khi đăng bán.',
          'Thông tin hàng hoá, giá bán (đã gồm thuế), khuyến mại phải chính xác, rõ ràng; thực hiện đúng chính sách đổi trả, bảo hành đã công bố; giải quyết khiếu nại của người mua theo pháp luật về bảo vệ quyền lợi người tiêu dùng.',
          `Lập, giao hoá đơn cho người mua theo quy định về hoá đơn, chứng từ (sử dụng hoá đơn điện tử, hoá đơn điện tử khởi tạo từ máy tính tiền khi thuộc trường hợp bắt buộc); tự kê khai, nộp thuế và chịu trách nhiệm về nghĩa vụ thuế của mình${p.vnpayEnabled ? ', trừ phần thuế đã được Bên A khấu trừ, nộp thay theo quy định' : ''}.`,
          'Chỉ sử dụng dữ liệu cá nhân của người mua để thực hiện giao dịch; bảo mật tài khoản quản trị và tự chịu trách nhiệm với thao tác của nhân viên do Bên B cấp quyền.',
          'Thanh toán phí dịch vụ đầy đủ, đúng hạn.',
        ],
      },
      {
        title: 'Điều 6. Bảo vệ dữ liệu cá nhân',
        items: [
          'Mỗi Bên là bên kiểm soát dữ liệu cá nhân đối với dữ liệu do mình thu thập; tuân thủ pháp luật về bảo vệ dữ liệu cá nhân, chỉ xử lý dữ liệu trong phạm vi mục đích đã thông báo và được sự đồng ý của chủ thể dữ liệu.',
          'Bên B đồng ý để Bên A xử lý thông tin, giấy tờ tuỳ thân của người đại diện Bên B nhằm mục đích xác thực người bán, thực hiện Hợp đồng và nghĩa vụ báo cáo, cung cấp thông tin theo quy định của pháp luật.',
          'Khi phát hiện sự cố lộ, mất dữ liệu, Bên phát hiện thông báo cho Bên kia và cơ quan có thẩm quyền trong thời hạn luật định.',
        ],
      },
      {
        title: 'Điều 7. Tạm ngưng và chấm dứt Hợp đồng',
        items: [
          'Bên A được tạm ngưng gian hàng khi Bên B vi phạm Điều 5, khi có yêu cầu của cơ quan có thẩm quyền, hoặc khi Bên B không gia hạn phí.',
          'Mỗi Bên được đơn phương chấm dứt Hợp đồng khi Bên kia vi phạm nghiêm trọng nghĩa vụ và không khắc phục trong 15 ngày kể từ ngày nhận được thông báo; hoặc chấm dứt theo thoả thuận, với thông báo trước tối thiểu 30 ngày.',
          'Khi chấm dứt, các Bên hoàn tất đối soát, thanh toán các khoản còn tồn đọng; Bên A hỗ trợ Bên B trích xuất dữ liệu trong 30 ngày.',
        ],
      },
      {
        title: 'Điều 8. Bất khả kháng',
        items: ['Các Bên không chịu trách nhiệm khi không thực hiện được nghĩa vụ do sự kiện bất khả kháng theo Bộ luật Dân sự, nhưng phải thông báo cho Bên kia trong vòng 03 ngày và áp dụng mọi biện pháp cần thiết để khắc phục.'],
      },
      {
        title: 'Điều 9. Giải quyết tranh chấp',
        items: ['Tranh chấp phát sinh được giải quyết trước hết bằng thương lượng, hoà giải. Trường hợp không thương lượng được trong 30 ngày, một Bên có quyền khởi kiện tại Toà án nhân dân có thẩm quyền nơi Bên A đặt trụ sở chính.'],
      },
      {
        title: 'Điều 10. Hình thức giao kết và hiệu lực',
        items: [
          'Hợp đồng được giao kết dưới hình thức thông điệp dữ liệu theo Luật Giao dịch điện tử. Bên B ký Hợp đồng bằng chữ ký điện tử trên nền tảng: đăng nhập tài khoản đã đăng ký, đọc toàn văn, nhập đúng họ tên người đại diện và xác nhận đồng ý. Thời điểm, địa chỉ IP, thiết bị và mã băm (SHA-256) nội dung Hợp đồng được hệ thống ghi nhận làm chứng cứ.',
          'Các Bên có thể ký bổ sung bằng chữ ký số hoặc bản giấy; các bản có nội dung như nhau và có giá trị pháp lý như nhau.',
          'Mọi sửa đổi, bổ sung Hợp đồng phải được lập thành văn bản (bao gồm thông điệp dữ liệu) có xác nhận của hai Bên.',
        ],
      },
    ],
  };
}

/** Mã băm nội dung hợp đồng (ổn định theo thứ tự khoá) */
export function contractHash(c: PartnerContract) {
  const stable = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(stable) : v && typeof v === 'object'
      ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, stable((v as Record<string, unknown>)[k])]))
      : v;
  return createHash('sha256').update(JSON.stringify(stable(c))).digest('hex');
}
