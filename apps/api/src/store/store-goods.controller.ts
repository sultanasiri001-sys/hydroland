import {Body, Controller, Get, Param, Post, Req, UseGuards} from '@nestjs/common';
import {AccessTokenGuard} from '../auth/access-token.guard';
import {StoreGoodsService} from './store-goods.service';

type Request = {auth: {accountId: string}};
@Controller('store')
@UseGuards(AccessTokenGuard)
export class StoreGoodsController {
  constructor(private readonly goods: StoreGoodsService) {}
  @Post('orders/:orderId/items/:itemId/deliveries')
  delivery(@Req() req: Request, @Param('orderId') order: string, @Param('itemId') item: string, @Body() input: {quantity?: number; receivedAt?: string; requestId?: string}) {
    return this.goods.delivery(req.auth.accountId, order, item, input);
  }
  @Post('deliveries/:id/returns')
  requestReturn(@Req() req: Request, @Param('id') id: string, @Body() input: {quantity?: number; reason?: string; requestId?: string}) {
    return this.goods.requestReturn(req.auth.accountId, id, input);
  }
  @Get('provider/returns')
  list(@Req() req: Request) { return this.goods.listReturns(req.auth.accountId); }
  @Post('provider/returns/:id/receipt')
  receive(@Req() req: Request, @Param('id') id: string, @Body() input: {receivedAt?: string}) {
    return this.goods.receiveReturn(req.auth.accountId, id, input);
  }
}
