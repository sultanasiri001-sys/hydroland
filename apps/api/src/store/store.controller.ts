import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { StoreService } from './store.service';

type ProductStatus='DRAFT'|'ACTIVE'|'INACTIVE';
type ProductInput={sku:string;nameAr:string;nameEn?:string;description?:string;priceMinor:number;currency?:string;stockQuantity:number;status?:ProductStatus};
type ProductPatch=Partial<ProductInput>;

@Controller('store')
export class StoreController {
 constructor(private readonly store:StoreService){}
 @Get('products') products(){return this.store.listProducts()}
 @UseGuards(AccessTokenGuard) @Post('orders') order(@Req() req:any,@Body() body:{items:{productId:string;quantity:number}[]}){return this.store.createOrder(req.auth.accountId,body.items)}
 @UseGuards(AccessTokenGuard) @Get('orders/mine') mine(@Req() req:any){return this.store.listMine(req.auth.accountId)}
 @UseGuards(AccessTokenGuard,AdminGuard) @Get('admin/products') adminProducts(){return this.store.listAdminProducts()}
 @UseGuards(AccessTokenGuard,AdminGuard) @Post('admin/products') createProduct(@Body() body:ProductInput){return this.store.createProduct(body)}
 @UseGuards(AccessTokenGuard,AdminGuard) @Patch('admin/products/:productId') updateProduct(@Param('productId') productId:string,@Body() body:ProductPatch){return this.store.updateProduct(productId,body)}
}
