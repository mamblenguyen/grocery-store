import type { AddonChoice, AddonLine, AddonPack } from './billing';
import type { AddressParts } from './vn-address';

export type AppStatus = 'DRAFT' | 'SUBMITTED' | 'NEED_INFO' | 'APPROVED' | 'ACTIVATED' | 'REJECTED' | 'CANCELLED';
export const APP_STATUS: Record<AppStatus, { label: string; cls: string }> = {
  DRAFT: { label: 'Đang soạn', cls: 'bg-slate-200 text-slate-700' },
  SUBMITTED: { label: 'Chờ thẩm định', cls: 'bg-amber-100 text-amber-800' },
  NEED_INFO: { label: 'Cần bổ sung', cls: 'bg-orange-100 text-orange-800' },
  APPROVED: { label: 'Đã duyệt – chờ ký HĐ', cls: 'bg-sky-100 text-sky-800' },
  ACTIVATED: { label: 'Đã kích hoạt', cls: 'bg-emerald-100 text-emerald-800' },
  REJECTED: { label: 'Từ chối', cls: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Đã rút', cls: 'bg-slate-200 text-slate-600' },
};
export const IDENTITY_METHOD: Record<string, string> = {
  VNEID: 'Xác thực qua VNeID', EKYC: 'eKYC đối chiếu CSDL dân cư', TRUC_TIEP: 'Đối chiếu bản gốc trực tiếp',
};

export interface PartnerDoc { id: number; type: string; fileName: string; mimeType: string; size: number; createdAt: string }
export interface ContractParty {
  name: string; taxCode: string; address: string; representative: string; title: string; phone: string; email: string;
  idNumber?: string; licenseNo?: string; licenseDate?: string | null; licensePlace?: string | null;
  bankName?: string; bankAccountNo?: string; bankAccountName?: string;
}
export interface PartnerContract {
  title: string; no: string; createdAt: string; bases: string[];
  partyA: ContractParty; ecommerceRegistration?: string | null; partyB: ContractParty & { storeName: string; storeAddress: string; businessType: string };
  /** months = 0: gói miễn phí không thời hạn */
  commercial: { planName: string; priceMonthly: number; months: number; amount: number; settlementDays: number; startRule: string; planAmount?: number; addons?: AddonLine[] };
  articles: { title: string; items: string[] }[];
}
export interface PartnerApplication {
  id: number; code: string; status: AppStatus;
  storeName: string; desiredSlug?: string | null; storePhone: string; storeEmail?: string | null;
  storeAddressParts: AddressParts; storeAddress: string; categories?: string | null;
  businessType: 'HKD' | 'CONG_TY'; businessName: string; taxCode: string; licenseNo: string; licenseDate?: string | null; licensePlace?: string | null;
  businessAddressParts?: AddressParts | null; businessAddress?: string | null;
  representative: string; representativeTitle?: string | null; representativeId: string; representativeIdDate?: string | null;
  representativePhone: string; representativeEmail: string; bankName: string; bankAccountNo: string; bankAccountName: string;
  planId?: number | null; months: number; plan?: { id: number; name: string; priceMonthly: number } | null; addons?: AddonChoice[] | null;
  agreedTermsAt: string; reviewNote?: string | null; rejectReason?: string | null;
  identityMethod?: string | null; identityVerifiedAt?: string | null; reviewedAt?: string | null; reviewedBy?: { id: number; fullName: string } | null;
  contractNo?: string | null; contractData?: PartnerContract | null; contractHash?: string | null; contractSentAt?: string | null;
  contractSignedAt?: string | null; contractSignerName?: string | null; contractSignerIp?: string | null; contractSignerUa?: string | null;
  paymentAmount?: number | null; paymentMethod?: string | null; paymentRef?: string | null; paidAt?: string | null;
  storeId?: number | null; store?: { id: number; slug: string; name: string } | null; activatedAt?: string | null;
  history?: { at: string; by: string; action: string; note?: string }[] | null;
  documents: PartnerDoc[];
  user?: { id: number; email: string; fullName: string; phone?: string | null; role: string; storeId?: number | null };
  createdAt: string; updatedAt: string;
  // chỉ có ở API super admin
  requiredDocs?: string[]; platformMissing?: string[];
}
export interface PartnerInfo {
  platform: { name: string; legalName: string; taxCode: string; address: string; phone: string; email: string; ecommerceRegistration?: string;
    bank: { bankBin: string; bankName: string; accountNo: string; accountName: string } };
  plans: { id: number; code: string; name: string; description?: string | null; priceMonthly: number; maxProducts: number | null; maxStaff: number | null; maxOrdersMonthly: number | null; maxCampaignsMonthly: number | null }[];
  addonPacks: AddonPack[];
  documents: { type: string; label: string; required: boolean }[];
}
