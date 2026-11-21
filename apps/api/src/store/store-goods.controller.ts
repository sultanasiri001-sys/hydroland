import {Body, Controller, Get, Param, Post, Query, Req, UseGuards} from '@nestjs/common';
import {AccessTokenGuard} from '../auth/access-token.guard';
import {StoreGoodsService} from './store-goods.service';

type Request = {auth: {accountId: string}};
@Controller('store')
@UseGuards(AccessTokenGuard)
export class StoreGoodsController {
  constructor(private readonly goods: StoreGoodsService) {}
  @Get('provider/fulfillment')
  fulfillmentQueue(@Req() req:Request){return this.goods.fulfillmentQueue(req.auth.accountId)}
  @Post('provider/fulfillment/:id')
  shipment(@Req() req:Request,@Param('id') id:string,@Body() body:Record<string,unknown>){return this.goods.setFulfillment(req.auth.accountId,id,body)}
  @Get('orders/:orderId/fulfillment')
  orderTracking(@Req() req:Request,@Param('orderId') id:string){return this.goods.customerFulfillment(req.auth.accountId,id)}

  @Post('orders/:orderId/items/:itemId/deliveries')
  delivery(@Req() req: Request, @Param('orderId') order: string, @Param('itemId') item: string, @Body() input: {quantity?: number; receivedAt?: string; requestId?: string}) {
    return this.goods.delivery(req.auth.accountId, order, item, input);
  }
  @Post('deliveries/:id/returns')
  requestReturn(@Req() req: Request, @Param('id') id: string, @Body() input: {quantity?: number; reason?: string; requestId?: string}) {
    return this.goods.requestReturn(req.auth.accountId, id, input);
  }
  @Get('provider/returns')
  list(@Req() req: Request, @Query('stage') stage?:string) { return this.goods.listReturns(req.auth.accountId,stage==='received'); }
  @Post('provider/returns/:id/remedy')
  remedy(@Req() req: Request, @Param('id') id: string, @Body() input: {basis?: string; evidenceReference?: string}) {
    return this.goods.verifyRemedy(req.auth.accountId,id,input);
  }
  @Post('provider/returns/:id/receipt')
  receive(@Req() req: Request, @Param('id') id: string, @Body() input: {receivedAt?: string}) {
    return this.goods.receiveReturn(req.auth.accountId, id, input);
  }
}
