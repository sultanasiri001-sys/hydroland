import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { StoreService } from './store.service';

type ProductStatus='DRAFT'|'ACTIVE'|'INACTIVE';
type ProductInput={sku:string;nameAr:string;nameEn?:string;description?:string;priceMinor:number;currency?:string;stockQuantity:number;status?:ProductStatus};
type ProductPatch=Partial<ProductInput>;
type OrderStatus='CREATED'|'CONFIRMED'|'CANCELLED'|'FULFILLED';

@Controller('store')
export class StoreController {
 constructor(private readonly store:StoreService){}
 @Get('products') products(){return this.store.listProducts()}
 @UseGuards(AccessTokenGuard) @Post('orders') order(@Req() req:any,@Body() body:{items:{productId:string;quantity:number}[]}){return this.store.createOrder(req.auth.accountId,body.items)}
 @UseGuards(AccessTokenGuard) @Get('orders/mine') mine(@Req() req:any){return this.store.listMine(req.auth.accountId)}
 @UseGuards(AccessTokenGuard) @Post('orders/:orderId/payment') createPayment(@Req() req:any,@Param('orderId') orderId:string,@Body() body:{idempotencyKey:string}){return this.store.createPayment(req.auth.accountId,orderId,body.idempotencyKey)}
 @UseGuards(AccessTokenGuard) @Get('payments/mine') myPayments(@Req() req:any){return this.store.listMyPayments(req.auth.accountId)}
 @UseGuards(AccessTokenGuard,AdminGuard) @Get('admin/products') adminProducts(){return this.store.listAdminProducts()}
 @UseGuards(AccessTokenGuard,AdminGuard) @Post('admin/products') createProduct(@Body() body:ProductInput){return this.store.createProduct(body)}
 @UseGuards(AccessTokenGuard,AdminGuard) @Patch('admin/products/:productId') updateProduct(@Param('productId') productId:string,@Body() body:ProductPatch){return this.store.updateProduct(productId,body)}
 @UseGuards(AccessTokenGuard,AdminGuard) @Get('admin/payments') adminPayments(){return this.store.listAdminPayments()}
 @UseGuards(AccessTokenGuard,AdminGuard) @Get('admin/invoices') adminInvoices(){return this.store.listAdminInvoices()}
 @UseGuards(AccessTokenGuard,AdminGuard) @Get('admin/orders') adminOrders(){return this.store.listAdminOrders()}
 @UseGuards(AccessTokenGuard,AdminGuard) @Patch('admin/orders/:orderId/status') updateOrderStatus(@Param('orderId') orderId:string,@Body() body:{status:OrderStatus}){return this.store.updateOrderStatus(orderId,body.status)}
}
