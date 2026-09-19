import {Body,Controller,Get,Param,Post,Req,UseGuards} from '@nestjs/common';
import {AccessTokenGuard} from '../auth/access-token.guard';
import {TripIntelligenceService} from './trip-intelligence.service';

@UseGuards(AccessTokenGuard)
@Controller('trip-intelligence')
export class TripIntelligenceController {
  constructor(private readonly service:TripIntelligenceService){}
  @Post(':tripId/briefings')
  create(@Req() req:any,@Param('tripId') tripId:string){return this.service.createDraft(req.auth.accountId,tripId);}
  @Post(':tripId/dive-plans')
  divePlan(@Param('tripId') tripId:string,@Body() plan:Record<string,unknown>){return this.service.saveDivePlan(tripId,plan);}
  @Post(':tripId/emergency-plans')
  emergencyPlan(@Param('tripId') tripId:string,@Body() plan:Record<string,unknown>){return this.service.saveEmergencyPlan(tripId,plan);}
  @Post('briefings/:briefingId/translations')
  translation(@Param('briefingId') briefingId:string,@Body() input:{languageCode:string;content:Record<string,unknown>;level:string}){return this.service.upsertTranslation(briefingId,input);}
  @Get(':tripId/offline-package')
  packageStatus(@Param('tripId') tripId:string){return this.service.packageStatus(tripId);}
}
