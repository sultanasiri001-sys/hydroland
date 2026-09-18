import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ReviewGuard } from '../admin/review.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { EquipmentInspectionService } from './equipment-inspection.service';

@UseGuards(AccessTokenGuard,ReviewGuard)
@Controller('trips/admin/equipment')
export class EquipmentInspectionController{
  constructor(private readonly equipment:EquipmentInspectionService){}

  @Get(':resourceId/inspections')
  history(@Param('resourceId') resourceId:string){return this.equipment.history(resourceId);}

  @Post(':resourceId/inspections')
  record(@Req() req:{auth:{accountId:string}},@Param('resourceId') resourceId:string,@Body() body:{status?:'PASS'|'REVIEW'|'FAIL';inspectedAt?:string;serviceExpiresAt?:string|null;notes?:string|null}){return this.equipment.record(req.auth.accountId,resourceId,body);}
}
