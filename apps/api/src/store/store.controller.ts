import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StoreService } from './store.service';
@Controller('store')
export class StoreController {
 constructor(private readonly store:StoreService){}
 @Get('products') products(){return this.store.listProducts()}
 @UseGuards(JwtAuthGuard) @Post('orders') order(@Req() req:any,@Body() body:{items:{productId:string;quantity:number}[]}){return this.store.createOrder(req.user.accountId,body.items)}
 @UseGuards(JwtAuthGuard) @Get('orders/mine') mine(@Req() req:any){return this.store.listMine(req.user.accountId)}
}
