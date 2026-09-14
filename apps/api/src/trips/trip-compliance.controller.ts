import { Body,Controller,Get,Param,Patch,Req,UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { TripComplianceService } from './trip-compliance.service';

@UseGuards(AccessTokenGuard,AdminGuard)
@Controller('trips/admin/compliance')
export class TripComplianceController{
  constructor(private readonly compliance:TripComplianceService){}
  @Get(':tripId') get(@Param('tripId')tripId:string){return this.compliance.get(tripId);}
  @Patch(':tripId') update(@Req()req:{auth:{accountId:string}},@Param('tripId')tripId:string,@Body()body:{regulatoryStatus?:string;permitStatus?:string;permitReference?:string|null;authorityReference?:string|null;notes?:string|null}){return this.compliance.update(req.auth.accountId,tripId,body);}
}
