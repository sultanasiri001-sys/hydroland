import { Body, Controller, Get, Header, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { UnifiedStoreOrdersService } from './unified-store-orders.service';

@Controller('store/unified-orders')
@UseGuards(AccessTokenGuard)
export class UnifiedStoreOrdersController {
  constructor(private readonly orders: UnifiedStoreOrdersService) {}

  @Post()
  create(@Req() req: { auth: { accountId: string } }, @Body() body: unknown) {
    return this.orders.create(req.auth.accountId, body);
  }

  @Get()
  @Header('Cache-Control', 'private, no-store')
  list(@Req() req: { auth: { accountId: string } }) { return this.orders.list(req.auth.accountId); }

  @Get(':id')
  @Header('Cache-Control', 'private, no-store')
  get(@Req() req: { auth: { accountId: string } }, @Param('id') id: string) { return this.orders.get(req.auth.accountId, id); }
}
