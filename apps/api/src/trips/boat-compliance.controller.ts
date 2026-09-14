import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { BoatComplianceService } from './boat-compliance.service';

@UseGuards(AccessTokenGuard,AdminGuard)
@Controller('trips/admin/boats')
export class BoatComplianceController{
  constructor(private readonly boats:BoatComplianceService){}

  @Get(':resourceId/compliance')
  get(@Param('resourceId') resourceId:string){return this.boats.get(resourceId);}

  @Put(':resourceId/compliance')
  upsert(@Param('resourceId') resourceId:string,@Body() body:{registrationNumber?:string|null;registrationStatus?:'PENDING'|'VERIFIED'|'REJECTED';navigationLicenseNumber?:string|null;navigationLicenseExpiresAt?:string|null;safetyCertificateExpiresAt?:string|null;passengerLimit?:number|null;notes?:string|null}){return this.boats.upsert(resourceId,body);}
}
