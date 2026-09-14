import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { InventoryStocktakeService } from './inventory-stocktake.service';

@UseGuards(AccessTokenGuard,AdminGuard)
@Controller('trips/admin/inventory-stocktakes')
export class InventoryStocktakeController{
  constructor(private readonly stocktakes:InventoryStocktakeService){}
  @Get() list(){return this.stocktakes.list();}
  @Post() start(@Req()req:{auth:{accountId:string}},@Body()body:{location?:string|null}){return this.stocktakes.start(req.auth.accountId,body);}
  @Post(':id/scans') scan(@Req()req:{auth:{accountId:string}},@Param('id')id:string,@Body()body:{code?:string;observedLocation?:string|null}){return this.stocktakes.scan(req.auth.accountId,id,body);}
  @Get(':id') summary(@Param('id')id:string){return this.stocktakes.summary(id);}
  @Post(':id/complete') complete(@Req()req:{auth:{accountId:string}},@Param('id')id:string){return this.stocktakes.complete(req.auth.accountId,id);}
}
