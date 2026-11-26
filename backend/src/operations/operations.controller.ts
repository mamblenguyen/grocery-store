import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { AdminOnly, Auth, CurrentUser, StoreOwner } from '../common/decorators';
import { CampaignDto, CreateReturnDto, LoyaltyAdjustDto, LoyaltyTierDto, PosLoyaltyTokenDto, PromotionDto, ReconcileDto, ResolvePosLoyaltyDto, SegmentDto, UpdateReturnDto } from './operations.dto';
import { OperationsService } from './operations.service';
import { PlanFeature } from '../common/plan-features';

@Controller('returns') @Auth()
export class ReturnsController {
  constructor(private service: OperationsService) {}
  @Post() create(@CurrentUser('sub') uid: number, @Body() dto: CreateReturnDto) { return this.service.createReturn(uid, dto); }
  @Get('my') mine(@CurrentUser('sub') uid: number) { return this.service.listMyReturns(uid); }
}

@Controller('loyalty') @Auth()
export class LoyaltyController {
  constructor(private service: OperationsService) {}
  @Get('my') mine(@CurrentUser('sub') uid: number) { return this.service.myLoyalty(uid); }
  @Get('pos-options') posOptions(@CurrentUser('sub') uid: number) { return this.service.posOptions(uid); }
  @Post('pos-token') posToken(@CurrentUser('sub') uid: number, @Body() dto: PosLoyaltyTokenDto) { return this.service.createPosToken(uid, dto); }
}

@Controller('admin/operations') @AdminOnly()
export class AdminOperationsController {
  constructor(private service: OperationsService) {}

  @Get('returns') @PlanFeature('RETURNS') returns(@Query() q: any) { return this.service.listReturns(q); }
  @Patch('returns/:id') @PlanFeature('RETURNS') updateReturn(@Param('id', ParseIntPipe) id: number, @CurrentUser('sub') uid: number, @Body() dto: UpdateReturnDto) { return this.service.updateReturn(id, uid, dto); }

  @Post('reconciliations/preview') @PlanFeature('RECONCILIATION') previewReconciliation(@Body() dto: ReconcileDto) { return this.service.previewReconciliation(dto); }
  @Get('reconciliations') @PlanFeature('RECONCILIATION') reconciliations() { return this.service.listReconciliations(); }
  @Post('reconciliations') @PlanFeature('RECONCILIATION') createReconciliation(@CurrentUser('sub') uid: number, @Body() dto: ReconcileDto) { return this.service.createReconciliation(uid, dto); }
  @Patch('reconciliations/:id/confirm') @PlanFeature('RECONCILIATION') confirmReconciliation(@Param('id', ParseIntPipe) id: number, @CurrentUser('sub') uid: number) { return this.service.confirmReconciliation(id, uid); }

  @Get('loyalty') @PlanFeature('LOYALTY') loyalty() { return this.service.listLoyalty(); }
  @Post('loyalty/resolve-pos-token') @PlanFeature('LOYALTY') resolvePosToken(@Body() dto: ResolvePosLoyaltyDto) { return this.service.resolvePosToken(dto); }
  @Post('loyalty/adjust') @PlanFeature('LOYALTY') adjustLoyalty(@CurrentUser('sub') uid: number, @Body() dto: LoyaltyAdjustDto) { return this.service.adjustLoyalty(uid, dto); }
  @Get('loyalty/tiers') @PlanFeature('LOYALTY') loyaltyTiers() { return this.service.listLoyaltyTiers(); }
  @Put('loyalty/tiers/:key') @PlanFeature('LOYALTY') saveLoyaltyTier(@Body() dto: LoyaltyTierDto) { return this.service.saveLoyaltyTier(dto); }

  @Get('promotions') @PlanFeature('ADVANCED_PROMOTIONS') promotions() { return this.service.listPromotions(); }
  @Post('promotions') @PlanFeature('ADVANCED_PROMOTIONS') createPromotion(@Body() dto: PromotionDto) { return this.service.savePromotion(null, dto); }
  @Put('promotions/:id') @PlanFeature('ADVANCED_PROMOTIONS') updatePromotion(@Param('id', ParseIntPipe) id: number, @Body() dto: PromotionDto) { return this.service.savePromotion(id, dto); }
  @Delete('promotions/:id') @PlanFeature('ADVANCED_PROMOTIONS') deletePromotion(@Param('id', ParseIntPipe) id: number) { return this.service.removePromotion(id); }

  @Get('segments') @PlanFeature('CRM') segments() { return this.service.listSegments(); }
  @Post('segments') @PlanFeature('CRM') createSegment(@Body() dto: SegmentDto) { return this.service.saveSegment(null, dto); }
  @Put('segments/:id') @PlanFeature('CRM') updateSegment(@Param('id', ParseIntPipe) id: number, @Body() dto: SegmentDto) { return this.service.saveSegment(id, dto); }
  @Get('campaigns') @PlanFeature('CRM') campaigns() { return this.service.listCampaigns(); }
  @Post('campaigns') @PlanFeature('CRM') createCampaign(@CurrentUser('sub') uid: number, @Body() dto: CampaignDto) { return this.service.saveCampaign(dto, uid); }
  @Post('campaigns/:id/send') @PlanFeature('CRM') sendCampaign(@Param('id', ParseIntPipe) id: number) { return this.service.sendCampaign(id); }

  @Get('audit') @StoreOwner() @PlanFeature('AUDIT_LOG') audit(@Query() q: any) { return this.service.listAudit(q); }
}
