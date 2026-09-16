import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { WorkforceService } from './workforce.service';

type AuthenticatedRequest = { auth: { accountId: string } };

@UseGuards(AccessTokenGuard)
@Controller('workforce')
export class WorkforceHiringController {
  constructor(private readonly workforce: WorkforceService) {}

  @Get('hr/context')
  context(@Req() request: AuthenticatedRequest) {
    return this.workforce.hiringContext(request.auth.accountId);
  }

  @Get('center-access/mine')
  centerAccess(@Req() request: AuthenticatedRequest) {
    return this.workforce.myCenterAccess(request.auth.accountId);
  }

  @Post('hr/hiring-requests')
  createHiringRequest(@Req() request: AuthenticatedRequest, @Body() body: { organizationId?: string; positionId?: string; candidateAccountId?: string; justification?: string }) {
    return this.workforce.createHiringRequest(request.auth.accountId, body);
  }
}
