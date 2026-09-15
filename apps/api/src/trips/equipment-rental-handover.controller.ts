import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { EquipmentRentalHandoverService } from './equipment-rental-handover.service';

@UseGuards(AccessTokenGuard,AdminGuard)
@Controller('trips/admin/equipment-rentals')
export class EquipmentRentalHandoverController{
  constructor(private readonly handover:EquipmentRentalHandoverService){}

  @Get(':id/handover')
  summary(@Param('id')id:string){return this.handover.summary(id);}

  @Post(':id/handover-scan')
  scan(@Req()req:{auth:{accountId:string}},@Param('id')id:string,@Body()body:{code?:string}){return this.handover.scan(req.auth.accountId,id,body);}
}
