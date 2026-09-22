import { Body, Controller, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { DatabaseService } from '../database/database.service';
import { HrService } from './hr.service';
import { HrAction, HrRequestContext } from './hr-policy';

@Controller('hr/employments')
@UseGuards(AccessTokenGuard)
export class HrController {
  constructor(
    private readonly hr: HrService,
    private readonly db: DatabaseService,
  ) {}

  @Patch(':employmentId/status')
  async changeStatus(
    @Req() request: { auth: { accountId: string } },
    @Param('employmentId') employmentId: string,
    @Body() body: {
      nextStatus: string;
      action: HrAction;
      context: HrRequestContext;
    },
  ) {
    const employment = await this.db.employment.findUniqueOrThrow({
      where: { id: employmentId },
      select: { organizationId: true },
    });
    const assignments = await this.db.roleAssignment.findMany({
      where: { accountId: request.auth.accountId, status: 'ACTIVE' },
      select: { role: true, scope: true },
    });
    const membership = await this.db.organizationMember.findFirst({
      where: {
        accountId: request.auth.accountId,
        organizationId: employment.organizationId,
        status: 'ACTIVE',
      },
      select: { role: true },
    });
    if (!membership) throw new Error('HR_ORGANIZATION_SCOPE_DENIED');
    const roles = [
      ...assignments.map((assignment) => assignment.role),
      membership.role,
    ];
    const centerScopeIds = assignments.flatMap((assignment) => {
      const scope = assignment.scope;
      if (!scope || Array.isArray(scope) || typeof scope !== 'object') return [];
      const ids = (scope as { centerIds?: unknown }).centerIds;
      return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
    });

    return this.hr.applyEmploymentStatus({
      employmentId,
      nextStatus: body.nextStatus,
      actor: {
        accountId: request.auth.accountId,
        roles,
        organizationId: employment.organizationId,
        centerScopeIds,
      },
      action: body.action,
      context: {
        ...body.context,
        organizationId: employment.organizationId,
      },
    });
  }
}
