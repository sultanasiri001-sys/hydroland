import {Controller,Get,Param,Post,Req} from '@nestjs/common';
import {TripIntelligenceService} from './trip-intelligence.service';

@Controller('trip-intelligence')
export class TripIntelligenceController {
  constructor(private readonly service:TripIntelligenceService){}
  @Post(':tripId/briefings')
  create(@Req() req:any,@Param('tripId') tripId:string){return this.service.createDraft(req.user?.accountId??'system',tripId);}
  @Get(':tripId/offline-package')
  packageStatus(@Param('tripId') tripId:string){return{tripId,status:'NOT_READY',reason:'PUBLISHED_BRIEFING_REQUIRED'};}
}
