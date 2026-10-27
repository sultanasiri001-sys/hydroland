import {Body,Controller,Get,Header,Param,Post,Req,UseGuards} from '@nestjs/common';
import {AccessTokenGuard} from '../auth/access-token.guard';
import {ReviewGuard} from '../admin/review.guard';
import {TripIntelligenceService} from './trip-intelligence.service';
import {TranslationMode} from '../translation/translation.domain';
import {OfflineTripReader} from './offline-trip-authorization.service';

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
  @Post('briefings/:briefingId/translate')
  translateBriefing(@Param('briefingId') briefingId:string,@Body() input:{sourceLanguage:string;targetLanguage:string;text:string;mode:TranslationMode}){return this.service.translateBriefingText(briefingId,input);}
  @UseGuards(ReviewGuard)
  @Post('translations/:translationId/approve')
  approveTranslation(@Req() req:any,@Param('translationId') translationId:string){return this.service.approveControlledTranslation(req.auth.accountId,translationId);}
  @UseGuards(ReviewGuard)
  @Post(':tripId/offline-package/generate')
  generatePackage(@Req() req:any,@Param('tripId') tripId:string){return this.service.generateOfflinePackage(req.auth.accountId,tripId);}
  @Header('Cache-Control','private, no-store')
  @Get(':tripId/offline-package')
  packageStatus(@Req() req:{auth:OfflineTripReader},@Param('tripId') tripId:string){return this.service.packageStatus(req.auth,tripId);}
  @Header('Cache-Control','private, no-store')
  @Get(':tripId/offline-package/content')
  packageContent(@Req() req:{auth:OfflineTripReader},@Param('tripId') tripId:string){return this.service.packageContent(req.auth,tripId);}
  @Header('Cache-Control','private, no-store')
  @Get(':tripId/offline-package/payloads/:mediaKey')
  payload(@Req() req:{auth:OfflineTripReader},@Param('tripId') tripId:string,@Param('mediaKey') mediaKey:string){return this.service.payloadDelivery(req.auth,tripId,mediaKey);}
}
