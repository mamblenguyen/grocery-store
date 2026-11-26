import { BadRequestException, Controller, Get, Header, Module, Param, ParseIntPipe, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { geocode } from './geocode';
import { listDistricts, listProvinces, listWards, unitNames } from './vn-address';

/** Danh mục đơn vị hành chính (công khai, dữ liệu tĩnh → cho phép cache lâu) */
@Controller('geo')
export class GeoController {
  @Get('provinces') @Header('Cache-Control', 'public, max-age=86400')
  provinces() { return listProvinces(); }

  @Get('provinces/:code/districts') @Header('Cache-Control', 'public, max-age=86400')
  districts(@Param('code', ParseIntPipe) code: number) { return listDistricts(code); }

  @Get('districts/:code/wards') @Header('Cache-Control', 'public, max-age=86400')
  wards(@Param('code', ParseIntPipe) code: number) { return listWards(code); }

  /**
   * Gợi ý toạ độ cho địa chỉ (để căn bản đồ khi ghim vị trí). Nhận MÃ đơn vị hành chính – tên do server tra,
   * nên không dùng được như proxy tìm kiếm tự do. { lat, lng, precision, label } hoặc null.
   */
  @Get('geocode') @Throttle({ default: { limit: 30, ttl: 60_000 } }) @Header('Cache-Control', 'private, max-age=3600')
  async geocode(@Query('provinceCode') p?: string, @Query('districtCode') d?: string, @Query('wardCode') w?: string, @Query('street') street?: string) {
    const num = (v?: string) => (v && /^\d+$/.test(v) ? Number(v) : null);
    const names = unitNames(num(p), num(d), num(w));
    if (!names) throw new BadRequestException('Chọn Tỉnh/Thành phố');
    return { result: await geocode({ ...names, street: street?.trim().slice(0, 120) || null }) };
  }
}

@Module({ controllers: [GeoController] })
export class GeoModule {}
