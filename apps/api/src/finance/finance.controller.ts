import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { PaymentsService } from '../payments/payments.service';

type AuthenticatedRequest = { auth: { accountId: string } };

@UseGuards(AccessTokenGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('mine/payments')
  mine(@Req() request: AuthenticatedRequest) {
    return this.payments.mine(request.auth.accountId);
  }

  @UseGuards(AdminGuard)
  @Get('admin/access-check')
  adminAccess() {
    return { authorized: true, scope: 'FINANCE_ADMIN' };
  }
}
