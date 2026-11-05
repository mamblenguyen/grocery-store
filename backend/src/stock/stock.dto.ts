import { StockDocStatus, StockDocType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsBoolean, IsDateString, IsEmail, IsEnum, IsIn, IsInt, IsOptional, IsString, Min, MinLength, ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../common/pagination.dto';

export const EXPORT_REASONS = ['DAMAGED', 'EXPIRED', 'RETURN_SUPPLIER', 'INTERNAL', 'OTHER'] as const;

export class StockItemDto {
  @IsInt() variantId: number;
  /** Nhập/Xuất: số lượng (>0). Kiểm kê: số lượng đếm thực tế (>=0) */
  @IsInt() @Min(0) quantity: number;
  /** Phiếu nhập: giá nhập / đơn vị */
  @IsOptional() @IsInt() @Min(0) unitCost?: number;
  @IsOptional() @IsString() lotNo?: string;
  @IsOptional() @IsDateString() expiryDate?: string;
  @IsOptional() @IsString() note?: string;
}

export class SaveStockDocDto {
  @IsEnum(StockDocType) type: StockDocType;
  @IsOptional() @IsInt() supplierId?: number | null;
  @IsOptional() @IsIn(EXPORT_REASONS) reason?: string;
  @IsOptional() @IsString() invoiceNo?: string;
  @IsOptional() @IsString() note?: string;
  @IsArray() @ArrayMinSize(1, { message: 'Phiếu phải có ít nhất 1 dòng hàng' })
  @ValidateNested({ each: true }) @Type(() => StockItemDto)
  items: StockItemDto[];
  /** true = lưu & hoàn tất luôn (cập nhật tồn kho) */
  @IsOptional() @IsBoolean() complete?: boolean;
}

export class QueryStockDocsDto extends PaginationDto {
  @IsOptional() @IsEnum(StockDocType) type?: StockDocType;
  @IsOptional() @IsEnum(StockDocStatus) status?: StockDocStatus;
  @IsOptional() @IsInt() supplierId?: number;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class CancelDocDto {
  @IsString() @MinLength(3, { message: 'Vui lòng nhập lý do huỷ' }) reason: string;
}

export class SupplierDto {
  @IsString() @MinLength(2) name: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() taxCode?: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
