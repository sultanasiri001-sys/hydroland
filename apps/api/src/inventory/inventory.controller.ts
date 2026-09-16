import { Body,Controller,Get,Param,Patch,Post,Req,UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { InventoryService } from './inventory.service';

type RequestWithAuth={auth:{accountId:string}};
@Controller('inventory')
export class InventoryController{
  constructor(private readonly inventory:InventoryService){}
  @Get('catalog') catalog(){return this.inventory.catalog()}
  @UseGuards(AccessTokenGuard,AdminGuard) @Get('admin/catalog') adminCatalog(){return this.inventory.adminCatalog()}
  @UseGuards(AccessTokenGuard,AdminGuard) @Post('admin/items') create(@Req()r:RequestWithAuth,@Body()b:Record<string,unknown>){return this.inventory.upsertItem(b,r.auth.accountId)}
  @UseGuards(AccessTokenGuard,AdminGuard) @Patch('admin/items/:id') update(@Req()r:RequestWithAuth,@Param('id')id:string,@Body()b:Record<string,unknown>){return this.inventory.upsertItem(b,r.auth.accountId,id)}
  @UseGuards(AccessTokenGuard) @Post('rentals') reserve(@Req()r:RequestWithAuth,@Body()b:{itemId:string;quantity:number;startsAt:string;endsAt:string}){return this.inventory.reserve(r.auth.accountId,b)}
  @UseGuards(AccessTokenGuard) @Get('rentals/mine') mine(@Req()r:RequestWithAuth){return this.inventory.mine(r.auth.accountId)}
  @UseGuards(AccessTokenGuard) @Post('rentals/:id/cancel') cancel(@Req()r:RequestWithAuth,@Param('id')id:string){return this.inventory.cancel(r.auth.accountId,id)}
}
