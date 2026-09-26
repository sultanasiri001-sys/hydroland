import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { StorePaymentProviderService } from './store-payment-provider.service';
import { StoreService } from './store.service';

type ProductStatus='DRAFT'|'ACTIVE'|'INACTIVE';
type ProductInput={sku:string;nameAr:string;nameEn?:string;description?:string;priceMinor:number;currency?:string;stockQuantity:number;status?:ProductStatus};
type ProductPatch=Partial<ProductInput>;
type OrderStatus='CREATED'|'CONFIRMED'|'CANCELLED'|'FULFILLED';

@Controller('store')
export class StoreController {
 constructor(private readonly store:StoreService,private readonly payments:StorePaymentProviderService){}
 @Get('products') products(){return this.store.listProducts()}
 @UseGuards(AccessTokenGuard) @Post('orders') order(@Req() req:any,@Body() body:{items:{productId:string;quantity:number}[]}){return this.store.createOrder(req.auth.accountId,body.items)}
 @UseGuards(AccessTokenGuard) @Get('orders/mine') mine(@Req() req:any){return this.store.listMine(req.auth.accountId)}
 @UseGuards(AccessTokenGuard) @Post('orders/:orderId/payment') createPayment(@Req() req:any,@Param('orderId') orderId:string,@Body() body:{idempotencyKey:string}){return this.payments.create(req.auth.accountId,orderId,body.idempotencyKey)}
 @UseGuards(AccessTokenGuard) @Post('payments/:paymentId/sync') syncPayment(@Req() req:any,@Param('paymentId') paymentId:string,@Body() body:{providerPaymentId:string}){return this.payments.sync(req.auth.accountId,paymentId,body.providerPaymentId)}
 @UseGuards(AccessTokenGuard) @Post('payments/:paymentId/refund-request') requestRefund(@Req() req:any,@Param('paymentId') paymentId:string,@Body() body:{reason:string}){return this.payments.requestRefund(req.auth.accountId,paymentId,body.reason)}
 @UseGuards(AccessTokenGuard) @Get('payments/mine') myPayments(@Req() req:any){return this.store.listMyPayments(req.auth.accountId)}
 @UseGuards(AccessTokenGuard,AdminGuard) @Post('admin/payments/:paymentId/refund') refund(@Req() req:any,@Param('paymentId') paymentId:string){return this.payments.executeRefund(req.auth.accountId,paymentId)}
 @UseGuards(AccessTokenGuard,AdminGuard) @Get('admin/products') adminProducts(){return this.store.listAdminProducts()}
 @UseGuards(AccessTokenGuard,AdminGuard) @Post('admin/products') createProduct(@Body() body:ProductInput){return this.store.createProduct(body)}
 @UseGuards(AccessTokenGuard,AdminGuard) @Patch('admin/products/:productId') updateProduct(@Param('productId') productId:string,@Body() body:ProductPatch){return this.store.updateProduct(productId,body)}
 @UseGuards(AccessTokenGuard,AdminGuard) @Get('admin/finance/summary') financeSummary(){return this.store.adminFinanceSummary()}
 @UseGuards(AccessTokenGuard,AdminGuard) @Get('admin/payments') adminPayments(){return this.store.listAdminPayments()}
 @UseGuards(AccessTokenGuard,AdminGuard) @Get('admin/invoices') adminInvoices(){return this.store.listAdminInvoices()}
 @UseGuards(AccessTokenGuard,AdminGuard) @Get('admin/orders') adminOrders(){return this.store.listAdminOrders()}
 @UseGuards(AccessTokenGuard,AdminGuard) @Patch('admin/orders/:orderId/status') updateOrderStatus(@Param('orderId') orderId:string,@Body() body:{status:OrderStatus}){return this.store.updateOrderStatus(orderId,body.status)}
}
