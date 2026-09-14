import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { EquipmentRentalService } from './equipment-rental.service';

@UseGuards(AccessTokenGuard)
@Controller('trips/equipment-rentals')
export class EquipmentRentalController{
  constructor(private readonly rentals:EquipmentRentalService){}

  @Get('mine')
  mine(@Req()req:{auth:{accountId:string}}){return this.rentals.mine(req.auth.accountId);}

  @Get(':id')
  get(@Param('id')id:string){return this.rentals.get(id);}

  @UseGuards(AdminGuard)
  @Post()
  create(@Req()req:{auth:{accountId:string}},@Body()body:{renterAccountId?:string;whatsappPhone?:string|null;items?:Array<{resourceId?:string;equipmentType?:string|null;size?:string|null;unitPriceSar?:number}>}){return this.rentals.create(req.auth.accountId,body);}

  @UseGuards(AdminGuard)
  @Post(':id/paid')
  markPaid(@Req()req:{auth:{accountId:string}},@Param('id')id:string){return this.rentals.markPaid(req.auth.accountId,id);}

  @UseGuards(AdminGuard)
  @Post(':id/share')
  share(@Req()req:{auth:{accountId:string}},@Param('id')id:string,@Body()body:{accountId?:string;channel?:'IN_APP'|'WHATSAPP'}){return this.rentals.shareInvoice(req.auth.accountId,id,body);}
}
