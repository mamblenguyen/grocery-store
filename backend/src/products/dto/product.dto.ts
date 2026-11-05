import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Min, MinLength, ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../common/pagination.dto';

export class ProductOptionDto {
  @IsString() @MinLength(1) name: string;
  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) values: string[];
}

export class ProductVariantDto {
  @IsOptional() @IsInt() id?: number;
  @IsString() @MinLength(1) sku: string;
  @IsOptional() @IsString() barcode?: string;
  @IsInt() @Min(0) price: number;
  @IsOptional() @IsInt() @Min(0) compareAtPrice?: number | null;
  @IsOptional() @IsInt() @Min(0) costPrice?: number | null;
  @IsInt() @Min(0) stock: number;
  @IsOptional() @IsInt() @Min(0) lowStockThreshold?: number;
  @IsOptional() @IsString() image?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  /** Giá trị option theo đúng thứ tự mảng options, vd: ["1kg", "Cay"] */
  @IsArray() @IsString({ each: true }) optionValues: string[];
}

export class SaveProductDto {
  @IsString() @MinLength(2) name: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsString() thumbnail?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
  @IsOptional() @IsInt() categoryId?: number | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isFeatured?: boolean;

  @IsArray() @ValidateNested({ each: true }) @Type(() => ProductOptionDto)
  options: ProductOptionDto[];

  @IsArray() @ArrayMinSize(1, { message: 'Sản phẩm phải có ít nhất 1 biến thể' })
  @ValidateNested({ each: true }) @Type(() => ProductVariantDto)
  variants: ProductVariantDto[];
}

export class QueryProductsDto extends PaginationDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsInt() categoryId?: number;
  @IsOptional() @IsInt() @Min(0) minPrice?: number;
  @IsOptional() @IsInt() @Min(0) maxPrice?: number;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsIn(['newest', 'price_asc', 'price_desc', 'name', 'best_selling']) sort?: string;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsBoolean() inStock?: boolean;
  /** chỉ dùng cho admin */
  @IsOptional() @IsIn(['active', 'inactive', 'all']) status?: string;
}
