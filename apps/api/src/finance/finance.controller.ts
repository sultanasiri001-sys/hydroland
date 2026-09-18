import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { FinanceEntryType } from '@prisma/client';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { PaymentsService } from '../payments/payments.service';
import { FinancePersistenceService } from './finance-persistence.service';

type AuthenticatedRequest = { auth: { accountId: string } };

@UseGuards(AccessTokenGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly payments: PaymentsService, private readonly finance: FinancePersistenceService) {}

  @Get('mine/payments')
  mine(@Req() request: AuthenticatedRequest) { return this.payments.mine(request.auth.accountId); }

  @UseGuards(AdminGuard)
  @Post('admin/accounts')
  createAccount(@Body() body: { organizationId: string; name: string; currency?: string }) { return this.finance.createAccount(body); }

  @UseGuards(AdminGuard)
  @Get('admin/organizations/:organizationId/accounts')
  accounts(@Param('organizationId') organizationId: string) { return this.finance.listAccounts(organizationId); }

  @UseGuards(AdminGuard)
  @Post('admin/entries')
  createEntry(@Req() request: AuthenticatedRequest, @Body() body: { organizationId: string; financeAccountId: string; type: FinanceEntryType; amountMinor: number; currency?: string; referenceType: string; referenceId: string; description?: string }) {
    return this.finance.createEntry({ ...body, requestedByAccountId: request.auth.accountId });
  }

  @UseGuards(AdminGuard)
  @Get('admin/organizations/:organizationId/entries')
  entries(@Param('organizationId') organizationId: string) { return this.finance.listEntries(organizationId); }

  @UseGuards(AdminGuard)
  @Post('admin/entries/:entryId/decision')
  decide(@Req() request: AuthenticatedRequest, @Param('entryId') entryId: string, @Body() body: { approved: boolean; note?: string }) { return this.finance.decideEntry(entryId, request.auth.accountId, body.approved, body.note); }

  @UseGuards(AdminGuard)
  @Post('admin/entries/:entryId/post')
  post(@Param('entryId') entryId: string) { return this.finance.postEntry(entryId); }
}
