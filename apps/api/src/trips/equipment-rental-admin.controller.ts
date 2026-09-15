import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { EquipmentRentalAdminService } from './equipment-rental-admin.service';

@UseGuards(AccessTokenGuard,AdminGuard)
@Controller('trips/admin/equipment-rentals')
export class EquipmentRentalAdminController{
  constructor(private readonly rentals:EquipmentRentalAdminService){}
  @Get()
  list(){return this.rentals.list();}
  @Post(':id/handover-scan')
  handoverScan(@Req()req:{auth:{accountId:string}},@Param('id')id:string,@Body()body:{code?:string}){return this.rentals.handoverScan(req.auth.accountId,id,body);}
}
