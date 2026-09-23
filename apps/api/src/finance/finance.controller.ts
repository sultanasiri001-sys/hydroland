import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { FinanceEntryType } from '@prisma/client';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { PaymentsService } from '../payments/payments.service';
import { FinancePersistenceService } from './finance-persistence.service';
import { FinanceShiftsService } from './finance-shifts.service';
import { FinanceReceivablesService } from './finance-receivables.service';

type AuthenticatedRequest = { auth: { accountId: string } };

@UseGuards(AccessTokenGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly payments: PaymentsService, private readonly finance: FinancePersistenceService, private readonly shifts: FinanceShiftsService, private readonly receivables: FinanceReceivablesService) {}

  @Get('mine/payments')
  mine(@Req() request: AuthenticatedRequest) { return this.payments.mine(request.auth.accountId); }

  @Post('shifts/open')
  openShift(@Req() request: AuthenticatedRequest, @Body() body: { centerOrgUnitId: string; openingBalanceMinor: number }) {
    return this.shifts.openShift(request.auth.accountId, body.centerOrgUnitId, body.openingBalanceMinor);
  }

  @Post('shifts/:shiftId/entries')
  recordShiftEntry(@Req() request: AuthenticatedRequest, @Param('shiftId') shiftId: string, @Body() body: { type: 'REVENUE'|'EXPENSE'|'REFUND'|'ADJUSTMENT'; amountMinor: number; paymentId?: string; referenceType?: string; referenceId?: string; description?: string }) {
    return this.shifts.recordEntry(request.auth.accountId, shiftId, body);
  }

  @Post('shifts/:shiftId/handover')
  requestHandover(@Req() request: AuthenticatedRequest, @Param('shiftId') shiftId: string, @Body() body: { toAccountantId: string; actualCashMinor: number; varianceReason?: string }) {
    return this.shifts.requestHandover(request.auth.accountId, shiftId, body.toAccountantId, body.actualCashMinor, body.varianceReason);
  }

  @Post('shifts/handovers/:handoverId/accept')
  acceptHandover(@Req() request: AuthenticatedRequest, @Param('handoverId') handoverId: string) {
    return this.shifts.acceptHandover(request.auth.accountId, handoverId);
  }

  @Post('receivables')
  createReceivable(@Req() request: AuthenticatedRequest, @Body() body: { invoiceId: string; customerAccountId: string; centerOrgUnitId: string; totalMinor: number; paidMinor?: number; dueAt: string; creditLimitMinor?: number; installments?: Array<{ sequence: number; amountMinor: number; dueAt: string }> }) {
    return this.receivables.createDeferredInvoice(request.auth.accountId, { ...body, dueAt: new Date(body.dueAt), installments: body.installments?.map((item) => ({ ...item, dueAt: new Date(item.dueAt) })) });
  }

  @Post('receivables/:receivableId/collections')
  collectReceivable(@Req() request: AuthenticatedRequest, @Param('receivableId') receivableId: string, @Body() body: { paymentId: string; amountMinor: number; receiptNumber: string; installmentId?: string }) {
    return this.receivables.collect(request.auth.accountId, receivableId, body);
  }

  @Get('centers/:centerOrgUnitId/receivables')
  branchReceivables(@Req() request: AuthenticatedRequest, @Param('centerOrgUnitId') centerOrgUnitId: string) {
    return this.receivables.branchAr(request.auth.accountId, centerOrgUnitId);
  }

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
  post(@Req() request: AuthenticatedRequest, @Param('entryId') entryId: string) { return this.finance.postEntry(entryId, request.auth.accountId); }
}
