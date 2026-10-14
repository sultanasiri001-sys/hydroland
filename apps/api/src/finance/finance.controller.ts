import { FinanceReceivablesWorkspaceService } from './finance-receivables-workspace.service';
import { FinanceWorkspaceService } from './finance-workspace.service';
import { financeHttp } from './finance-http';
import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { FinanceEntryType } from '@prisma/client';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { PaymentsService } from '../payments/payments.service';
import { FinancePersistenceService } from './finance-persistence.service';
import { FinanceShiftsService } from './finance-shifts.service';
import { FinanceReceivablesService } from './finance-receivables.service';
import { FinanceShiftCloseService } from './finance-shift-close.service';
import { FinancePeriodCloseService } from './finance-period-close.service';

type AuthenticatedRequest = { auth: { accountId: string } };

@UseGuards(AccessTokenGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly arWorkspace: FinanceReceivablesWorkspaceService, private readonly workspace: FinanceWorkspaceService, private readonly payments: PaymentsService, private readonly finance: FinancePersistenceService, private readonly shifts: FinanceShiftsService, private readonly receivables: FinanceReceivablesService, private readonly shiftClose: FinanceShiftCloseService, private readonly periodClose: FinancePeriodCloseService) {}

  @Get('mine/payments')
  mine(@Req() request: AuthenticatedRequest) { return this.payments.mine(request.auth.accountId); }

  @Get('mine/centers')
  accountantCenters(@Req() request: AuthenticatedRequest) {
    return financeHttp(()=>this.workspace.centers(request.auth.accountId));
  }

  @Get('centers/:centerOrgUnitId/workspace')
  accountantWorkspace(@Req() request: AuthenticatedRequest, @Param('centerOrgUnitId') centerOrgUnitId: string) {
    return financeHttp(()=>this.workspace.workspace(request.auth.accountId,centerOrgUnitId));
  }

  @Post('shifts/open')
  openShift(@Req() request: AuthenticatedRequest, @Body() body: { centerOrgUnitId: string; openingBalanceMinor: number }) {
    return financeHttp(()=>this.shifts.openShift(request.auth.accountId, body?.centerOrgUnitId, body?.openingBalanceMinor));
  }

  @Post('shifts/:shiftId/entries')
  recordShiftEntry(@Req() request: AuthenticatedRequest, @Param('shiftId') shiftId: string, @Body() body: { type: 'REVENUE'|'EXPENSE'|'REFUND'|'ADJUSTMENT'; amountMinor: number; paymentId?: string; referenceType?: string; referenceId?: string; description?: string }) {
    return financeHttp(()=>this.shifts.recordEntry(request.auth.accountId, shiftId, body));
  }

  @Post('shifts/:shiftId/handover')
  requestHandover(@Req() request: AuthenticatedRequest, @Param('shiftId') shiftId: string, @Body() body: { toAccountantId: string; actualCashMinor: number; varianceReason?: string }) {
    return financeHttp(()=>this.shifts.requestHandover(request.auth.accountId, shiftId, body?.toAccountantId, body?.actualCashMinor, body?.varianceReason));
  }

  @Post('shifts/handovers/:handoverId/accept')
  acceptHandover(@Req() request: AuthenticatedRequest, @Param('handoverId') handoverId: string) {
    return financeHttp(()=>this.shifts.acceptHandover(request.auth.accountId, handoverId));
  }

  @Post('centers/:centerOrgUnitId/shifts/:shiftId/close/preview')
  previewShiftClose(@Req() request:AuthenticatedRequest,@Param('centerOrgUnitId') centerId:string,@Param('shiftId') shiftId:string,@Body() body:{actualCashMinor:number;varianceReason?:string}) {
    return financeHttp(()=>this.shiftClose.preview(request.auth.accountId,centerId,shiftId,body?.actualCashMinor,body?.varianceReason));
  }

  @Get('mine/shift-close-centers')
  shiftCloseCenters(@Req() request:AuthenticatedRequest) {
    return financeHttp(()=>this.shiftClose.reviewCenters(request.auth.accountId));
  }

  @Get('mine/period-close-centers')
  periodCloseCenters(@Req() request:AuthenticatedRequest) {
    return financeHttp(()=>this.periodClose.reviewCenters(request.auth.accountId));
  }

  @Post('centers/:centerOrgUnitId/shifts/:shiftId/close')
  submitShiftClose(@Req() request:AuthenticatedRequest,@Param('centerOrgUnitId') centerId:string,@Param('shiftId') shiftId:string,@Body() body:{actualCashMinor:number;varianceReason?:string}) {
    return financeHttp(()=>this.shiftClose.submit(request.auth.accountId,centerId,shiftId,body?.actualCashMinor,body?.varianceReason));
  }

  @Get('centers/:centerOrgUnitId/shift-close-reviews')
  pendingShiftCloseReviews(@Req() request:AuthenticatedRequest,@Param('centerOrgUnitId') centerId:string) {
    return financeHttp(()=>this.shiftClose.pending(request.auth.accountId,centerId));
  }

  @Get('centers/:centerOrgUnitId/daily-close-report')
  centerDailyCloseReport(@Req() request:AuthenticatedRequest,@Param('centerOrgUnitId') centerId:string,@Query('businessDate') businessDate:string) {
    return financeHttp(()=>this.shiftClose.dailyReport(request.auth.accountId,centerId,businessDate));
  }

  @Get('centers/:centerOrgUnitId/period-close-preview')
  periodClosePreview(@Req() request:AuthenticatedRequest,@Param('centerOrgUnitId') centerId:string,@Query('periodType') periodType:'MONTH'|'QUARTER'|'YEAR',@Query('periodKey') periodKey:string) {
    return financeHttp(()=>this.periodClose.preview(request.auth.accountId,centerId,periodType,periodKey));
  }

  @Post('centers/:centerOrgUnitId/period-close-submissions')
  submitPeriodClose(@Req() request:AuthenticatedRequest,@Param('centerOrgUnitId') centerId:string,@Body() body:{periodType:'MONTH'|'QUARTER'|'YEAR';periodKey:string}) {
    return financeHttp(()=>this.periodClose.submit(request.auth.accountId,centerId,body?.periodType,body?.periodKey));
  }

  @Get('centers/:centerOrgUnitId/period-close-reviews')
  periodCloseReviews(@Req() request:AuthenticatedRequest,@Param('centerOrgUnitId') centerId:string) {
    return financeHttp(()=>this.periodClose.pending(request.auth.accountId,centerId));
  }

  @Post('period-close-submissions/:submissionId/decision')
  decidePeriodClose(@Req() request:AuthenticatedRequest,@Param('submissionId') submissionId:string,@Body() body:{decision:'APPROVED'|'REJECTED';note?:string}) {
    return financeHttp(()=>this.periodClose.decide(request.auth.accountId,submissionId,body?.decision,body?.note));
  }

  @Post('shift-close-reviews/:submissionId/decision')
  decideShiftClose(@Req() request:AuthenticatedRequest,@Param('submissionId') submissionId:string,@Body() body:{decision:'APPROVED'|'REJECTED';note?:string}) {
    return financeHttp(()=>this.shiftClose.review(request.auth.accountId,submissionId,body?.decision,body?.note));
  }

  @Get('centers/:centerOrgUnitId/receivables/workspace')
  receivablesWorkspace(@Req() request:AuthenticatedRequest,@Param('centerOrgUnitId') unitId:string,@Query('page') page:unknown,@Query('status') status:unknown) {
    return financeHttp(()=>this.arWorkspace.list(request.auth.accountId,unitId,page,status));
  }

  @Get('centers/:centerOrgUnitId/receivable-invoices')
  receivableInvoices(@Req() request:AuthenticatedRequest,@Param('centerOrgUnitId') unitId:string,@Query('page') page:unknown) {
    return financeHttp(()=>this.arWorkspace.invoices(request.auth.accountId,unitId,page));
  }

  @Get('centers/:centerOrgUnitId/receivables/:receivableId')
  receivableDetail(@Req() request:AuthenticatedRequest,@Param('centerOrgUnitId') unitId:string,@Param('receivableId') receivableId:string,@Query('page') page:unknown) {
    return financeHttp(()=>this.arWorkspace.detail(request.auth.accountId,unitId,receivableId,page));
  }

  @Post('receivables')
  createReceivable(@Req() request: AuthenticatedRequest, @Body() body: { invoiceId: string; customerAccountId: string; centerOrgUnitId: string; totalMinor: number; paidMinor?: number; dueAt: string; creditLimitMinor?: number; installments?: Array<{ sequence: number; amountMinor: number; dueAt: string }> }) {
    return financeHttp(()=>{
      if(body?.installments!=null&&!Array.isArray(body.installments))throw new Error('FINANCE_INSTALLMENT_INVALID');
      return this.receivables.createDeferredInvoice(request.auth.accountId, { ...body, dueAt: new Date(body?.dueAt), installments: body?.installments?.map((item) => ({ ...item, dueAt: new Date(item?.dueAt) })) });
    });
  }

  @Post('receivables/:receivableId/collections')
  collectReceivable(@Req() request: AuthenticatedRequest, @Param('receivableId') receivableId: string, @Body() body: { paymentId: string; amountMinor: number; receiptNumber: string; installmentId?: string }) {
    return financeHttp(()=>this.receivables.collect(request.auth.accountId, receivableId, body));
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
