import {Body,Controller,Get,Param,Post,Req,UseGuards} from '@nestjs/common';
import {AccessTokenGuard} from '../auth/access-token.guard';
import {ReviewGuard} from '../admin/review.guard';
import {TripIntelligenceService} from './trip-intelligence.service';

@UseGuards(AccessTokenGuard)
@Controller('trip-intelligence')
export class TripIntelligenceController {
  constructor(private readonly service:TripIntelligenceService){}
  @Post(':tripId/briefings')
  create(@Req() req:any,@Param('tripId') tripId:string){return this.service.createDraft(req.auth.accountId,tripId);}
  @Post('briefings/:briefingId/submit')
  submit(@Req() req:any,@Param('briefingId') briefingId:string){return this.service.submitForReview(req.auth.accountId,briefingId);}
  @UseGuards(ReviewGuard)
  @Post('briefings/:briefingId/publish')
  publish(@Req() req:any,@Param('briefingId') briefingId:string){return this.service.publish(req.auth.accountId,briefingId);}
  @Post(':tripId/dive-plans')
  divePlan(@Req() req:any,@Param('tripId') tripId:string,@Body() plan:Record<string,unknown>){return this.service.saveDivePlan(req.auth.accountId,tripId,plan);}
  @Post(':tripId/emergency-plans')
  emergencyPlan(@Req() req:any,@Param('tripId') tripId:string,@Body() plan:Record<string,unknown>){return this.service.saveEmergencyPlan(req.auth.accountId,tripId,plan);}
  @UseGuards(ReviewGuard)
  @Post(':tripId/plans/approve')
  approvePlans(@Req() req:any,@Param('tripId') tripId:string){return this.service.approvePlans(req.auth.accountId,tripId);}
  @Post('briefings/:briefingId/translations')
  translation(@Req() req:any,@Param('briefingId') briefingId:string,@Body() input:{languageCode:string;content:Record<string,unknown>;level:string}){return this.service.upsertTranslation(req.auth.accountId,briefingId,input);}
  @UseGuards(ReviewGuard)
  @Post(':tripId/offline-package/generate')
  generatePackage(@Req() req:any,@Param('tripId') tripId:string){return this.service.generateOfflinePackage(req.auth.accountId,tripId);}
  @Get(':tripId/offline-package')
  packageStatus(@Param('tripId') tripId:string){return this.service.packageStatus(tripId);}
}
