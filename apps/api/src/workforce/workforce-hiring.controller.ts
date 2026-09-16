import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
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

  @Get('recruitment/context')
  recruitmentContext(@Req() request: AuthenticatedRequest) {
    return this.workforce.recruitmentContext(request.auth.accountId);
  }

  @Post('recruitment/requests')
  submitRecruitmentRequest(@Req() request: AuthenticatedRequest, @Body() body: { organizationId?: string; positionId?: string; candidateAccountId?: string; justification?: string }) {
    return this.workforce.createHiringRequest(request.auth.accountId, body);
  }

  @Patch('recruitment/requests/:requestId/resubmit')
  resubmitRecruitmentRequest(@Req() request: AuthenticatedRequest, @Param('requestId') requestId: string, @Body() body: { justification?: string }) {
    return this.workforce.resubmitHiringRequest(request.auth.accountId, requestId, body.justification);
  }

  @Post('hr/hiring-requests')
  createHiringRequest(@Req() request: AuthenticatedRequest, @Body() body: { organizationId?: string; positionId?: string; candidateAccountId?: string; justification?: string }) {
    return this.workforce.createHiringRequest(request.auth.accountId, body);
  }

  @Patch('hr/hiring-requests/:requestId/review')
  reviewHiringRequestByHr(
    @Req() request: AuthenticatedRequest,
    @Param('requestId') requestId: string,
    @Body() body: {
      decision?: 'FORWARD' | 'RETURN' | 'REJECT';
      note?: string;
      verification?: {
        identityVerified?: boolean;
        documentsComplete?: boolean;
        credentialsVerified?: boolean;
        qualificationMatched?: boolean;
        positionRequirementsMet?: boolean;
      };
    },
  ) {
    return this.workforce.reviewHiringRequestByHr(request.auth.accountId, requestId, body);
  }
}
