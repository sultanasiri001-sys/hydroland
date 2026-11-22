import { Controller, Header, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { InventoryIssueLedgerService } from './inventory-issue-ledger.service';

@Controller('warehouse/custody')
@UseGuards(AccessTokenGuard)
export class WarehouseCustodyController {
  constructor(private readonly ledger: InventoryIssueLedgerService) {}

  @Post(':organizationId/:requestId/acknowledge')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  acknowledge(
    @Param('organizationId') organizationId: string,
    @Param('requestId') requestId: string,
    @Req() request: { auth: { accountId: string } },
  ) {
    return this.ledger.acknowledge(organizationId, requestId, request.auth.accountId);
  }
}
