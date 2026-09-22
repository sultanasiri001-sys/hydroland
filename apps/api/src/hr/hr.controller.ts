import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Param, Patch, Req, UseGuards } from '@nestjs/common';
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
    if (!body || typeof body !== 'object') throw new BadRequestException('HR request body is required.');
    if (!body.context || typeof body.context !== 'object') throw new BadRequestException('HR request context is required.');
    const allowedActions: HrAction[] = [
      'STAFFING_REQUEST', 'VERIFY_CANDIDATE', 'APPROVE_APPOINTMENT', 'CHANGE_EMPLOYMENT',
      'APPROVE_COMPENSATION_CHANGE', 'OPEN_EMPLOYEE_RELATIONS_CASE',
      'APPROVE_DISCIPLINARY_DECISION', 'APPROVE_TERMINATION', 'APPLY_IAM_CHANGE',
    ];
    const allowedStatuses = ['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'OFFBOARDED'];
    if (!allowedActions.includes(body.action)) throw new BadRequestException('Invalid HR action.');
    if (!allowedStatuses.includes(body.nextStatus)) throw new BadRequestException('Invalid employment status.');
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
    if (!membership) throw new ForbiddenException('HR_ORGANIZATION_SCOPE_DENIED');
    const scopedAssignments = assignments.filter((assignment) => {
      const scope = assignment.scope;
      if (!scope || Array.isArray(scope) || typeof scope !== 'object') return false;
      const organizationIds = (scope as { organizationIds?: unknown }).organizationIds;
      return Array.isArray(organizationIds) && organizationIds.includes(employment.organizationId);
    });
    const roles = [
      ...scopedAssignments.map((assignment) => assignment.role),
      membership.role,
    ];
    const centerScopeIds = scopedAssignments.flatMap((assignment) => {
      const scope = assignment.scope;
      if (!scope || Array.isArray(scope) || typeof scope !== 'object') return [];
      const ids = (scope as { centerIds?: unknown }).centerIds;
      return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
    });

    let requesterAccountId: string | undefined;
    let reviewerAccountId: string | undefined;
    if (['APPROVE_APPOINTMENT', 'APPROVE_TERMINATION'].includes(body.action)) {
      const movement = await this.db.employmentMovement.findFirst({
        where: {
          employmentId,
          status: { in: ['HR_REVIEW', 'APPROVAL_REQUIRED', 'APPROVED'] },
        },
        orderBy: { createdAt: 'desc' },
        select: { requestedByAccountId: true, reviewedByAccountId: true },
      });
      if (!movement) throw new ConflictException('HR_PERSISTED_APPROVAL_CONTEXT_REQUIRED');
      requesterAccountId = movement.requestedByAccountId;
      reviewerAccountId = movement.reviewedByAccountId ?? undefined;
    }

    try {
      return await this.hr.applyEmploymentStatus({
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
        organizationId: employment.organizationId,
        centerId: body.context.centerId,
        requesterAccountId,
        reviewerAccountId,
        approverAccountId: request.auth.accountId,
      },
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      if (code.includes('SCOPE_DENIED') || code.includes('PERMISSION_REQUIRED') ||
          code.includes('APPROVAL_REQUIRED') || code.includes('SELF_APPROVAL_DENIED') ||
          code.includes('SEGREGATION_OF_DUTIES_DENIED') || code.includes('IAM_SERVICE_REQUIRED')) {
        throw new ForbiddenException(code);
      }
      if (code.includes('CONCURRENT_MODIFICATION') || code.includes('INVALID_EMPLOYMENT_TRANSITION') ||
          code.includes('ACTION_REQUIRED') || code.includes('REQUESTER_REQUIRED') ||
          code.includes('SEPARATION_CONTEXT_REQUIRED')) {
        throw new ConflictException(code);
      }
      throw error;
    }
  }
}
