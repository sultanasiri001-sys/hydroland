import { Body, Controller, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { HrService } from './hr.service';
import { HrAction, HrRequestContext } from './hr-policy';

@Controller('hr/employments')
@UseGuards(AccessTokenGuard)
export class HrController {
  constructor(private readonly hr: HrService) {}

  @Patch(':employmentId/status')
  changeStatus(
    @Req() request: { auth: { accountId: string } },
    @Param('employmentId') employmentId: string,
    @Body() body: {
      nextStatus: string;
      roles: string[];
      organizationId: string;
      centerScopeIds?: string[];
      action: HrAction;
      context: HrRequestContext;
    },
  ) {
    return this.hr.applyEmploymentStatus({
      employmentId,
      nextStatus: body.nextStatus,
      actor: {
        accountId: request.auth.accountId,
        roles: body.roles,
        organizationId: body.organizationId,
        centerScopeIds: body.centerScopeIds,
      },
      action: body.action,
      context: body.context,
    });
  }
}
