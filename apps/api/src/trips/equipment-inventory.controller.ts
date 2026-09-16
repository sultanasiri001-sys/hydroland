import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { EquipmentInventoryService } from './equipment-inventory.service';

type TagMethod='ADHESIVE_LABEL'|'HANG_TAG'|'MICRO_QR'|'DATA_MATRIX'|'NFC_RFID';
type TagBody={tagMethod?:TagMethod;tagPlacement?:string|null;tagMaterial?:string|null;tagNotes?:string|null};

@UseGuards(AccessTokenGuard,AdminGuard)
@Controller('trips/admin/equipment')
export class EquipmentInventoryController{
  constructor(private readonly inventory:EquipmentInventoryService){}
  @Get() list(){return this.inventory.list();}
  @Post() register(@Req()req:{auth:{accountId:string}},@Body()body:{name?:string;serialNumber?:string|null;sku?:string|null;location?:string|null;acquisitionCostSar?:number|null}){return this.inventory.register(req.auth.accountId,body);}
  @Get('lookup') lookup(@Query('code')code?:string){return this.inventory.lookup(code??'');}
  @Get(':resourceId') get(@Param('resourceId')resourceId:string){return this.inventory.get(resourceId);}
  @Get(':resourceId/history') history(@Param('resourceId')resourceId:string){return this.inventory.history(resourceId);}
  @Get(':resourceId/custody') custody(@Param('resourceId')resourceId:string){return this.inventory.custody(resourceId);}
  @Put(':resourceId/code') assignCode(@Req()req:{auth:{accountId:string}},@Param('resourceId')resourceId:string,@Body()body:{assetCode?:string;barcodeValue?:string;qrValue?:string;serialNumber?:string|null;sku?:string|null;location?:string|null;acquisitionCostSar?:number|null}){return this.inventory.assignCode(req.auth.accountId,resourceId,body);}
  @Put(':resourceId/tag') updateTag(@Req()req:{auth:{accountId:string}},@Param('resourceId')resourceId:string,@Body()body:TagBody){return this.inventory.updateTag(req.auth.accountId,resourceId,body);}
  @Post(':resourceId/movements') move(@Req()req:{auth:{accountId:string}},@Param('resourceId')resourceId:string,@Body()body:{movementType?:'CHECK_IN'|'CHECK_OUT'|'TRANSFER'|'MAINTENANCE'|'QUARANTINE'|'RELEASE'|'RETIRE';toLocation?:string|null;tripId?:string|null;assignedAccountId?:string|null;notes?:string|null}){return this.inventory.move(req.auth.accountId,resourceId,body);}
}
