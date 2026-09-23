import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { DatabaseService } from '../database/database.service';
import { HrService } from './hr.service';
import { HrAction, HrRequestContext } from './hr-policy';

@Controller('hr/employments')
@UseGuards(AccessTokenGuard)
export class HrController {
  private async actorFor(accountId: string, organizationId: string) {
    const assignments = await this.db.roleAssignment.findMany({ where: { accountId, status: 'ACTIVE' }, select: { role: true, scope: true } });
    const membership = await this.db.organizationMember.findFirst({ where: { accountId, organizationId, status: 'ACTIVE' }, select: { role: true } });
    if (!membership) throw new ForbiddenException('HR_ORGANIZATION_SCOPE_DENIED');
    const scoped = assignments.filter((a) => { const s=a.scope; if(!s||Array.isArray(s)||typeof s!=='object')return false; const ids=(s as {organizationIds?:unknown}).organizationIds; return Array.isArray(ids)&&ids.includes(organizationId); });
    const centerScopeIds = scoped.flatMap((a) => { const s=a.scope as {centerIds?:unknown}; return Array.isArray(s.centerIds)?s.centerIds.filter((id): id is string => typeof id==='string'):[]; });
    return { accountId, roles:[...scoped.map(a=>a.role),membership.role], organizationId, centerScopeIds };
  }

  private mapWorkflowError(error: unknown): never {
    const code=error instanceof Error?error.message:'';
    if (code.includes('SCOPE_DENIED')||code.includes('PERMISSION_REQUIRED')||code.includes('APPROVAL_REQUIRED')||code.includes('SELF_APPROVAL_DENIED')||code.includes('SEGREGATION_OF_DUTIES_DENIED')) throw new ForbiddenException(code);
    if (code.includes('SEPARATION_CONTEXT_REQUIRED')||code.includes('NOT_APPROVABLE')||code.includes('CONCURRENT_MODIFICATION')||code.includes('DECISION_REQUIRED')) throw new ConflictException(code);
    throw error;
  }
  constructor(
    private readonly hr: HrService,
    private readonly db: DatabaseService,
  ) {}

  @Patch('candidates/:candidateId/verify')
  async verifyCandidate(@Req() request:{auth:{accountId:string}},@Param('candidateId') candidateId:string,@Body() body:{notes?:string;context?:HrRequestContext}) {
    const candidate=await this.db.hrCandidate.findUniqueOrThrow({where:{id:candidateId},select:{organizationId:true}});
    const actor=await this.actorFor(request.auth.accountId,candidate.organizationId);
    try { return await this.hr.verifyCandidate({candidateId,notes:body?.notes,actor,context:{organizationId:candidate.organizationId,centerId:body?.context?.centerId}}); } catch(e){ this.mapWorkflowError(e); }
  }

  @Post(':employmentId/relations')
  async openRelationsCase(@Req() request:{auth:{accountId:string}},@Param('employmentId') employmentId:string,@Body() body:{caseType?:string;summary?:string;context?:HrRequestContext}) {
    if(!body?.caseType || typeof body.caseType!=='string') throw new BadRequestException('HR relations case type is required.');
    const employment=await this.db.employment.findUniqueOrThrow({where:{id:employmentId},select:{organizationId:true}});
    const actor=await this.actorFor(request.auth.accountId,employment.organizationId);
    try { return await this.hr.openEmployeeRelationsCase({employmentId,caseType:body.caseType,summary:body.summary,actor,context:{organizationId:employment.organizationId,centerId:body.context?.centerId}}); } catch(e){ this.mapWorkflowError(e); }
  }

  @Patch('compensation/:compensationTermId/approve')
  async approveCompensation(@Req() request:{auth:{accountId:string}},@Param('compensationTermId') id:string,@Body() body:{context?:HrRequestContext}) {
    const term=await this.db.compensationTerm.findUniqueOrThrow({where:{id},select:{employment:{select:{organizationId:true}}}});
    const actor=await this.actorFor(request.auth.accountId,term.employment.organizationId);
    try { return await this.hr.approveCompensation({compensationTermId:id,actor,context:{organizationId:term.employment.organizationId,centerId:body?.context?.centerId,approverAccountId:request.auth.accountId}}); } catch(e){ this.mapWorkflowError(e); }
  }

  @Patch('relations/:relationsCaseId/disciplinary-approval')
  async approveDisciplinary(@Req() request:{auth:{accountId:string}},@Param('relationsCaseId') id:string,@Body() body:{context?:HrRequestContext}) {
    const record=await this.db.employeeRelationsCase.findUniqueOrThrow({where:{id},select:{employment:{select:{organizationId:true}}}});
    const actor=await this.actorFor(request.auth.accountId,record.employment.organizationId);
    try { return await this.hr.approveDisciplinaryDecision({relationsCaseId:id,actor,context:{organizationId:record.employment.organizationId,centerId:body?.context?.centerId,approverAccountId:request.auth.accountId}}); } catch(e){ this.mapWorkflowError(e); }
  }

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
      'STAFFING_REQUEST', 'APPROVE_APPOINTMENT', 'CHANGE_EMPLOYMENT',
      'APPROVE_TERMINATION', 'APPLY_IAM_CHANGE',
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
          type: body.action === 'APPROVE_APPOINTMENT' ? 'APPOINTMENT' : 'TERMINATION',
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
          code.includes('ACTION_REQUIRED') || code.includes('ACTION_NOT_EMPLOYMENT_STATUS_TRANSITION') || code.includes('REQUESTER_REQUIRED') ||
          code.includes('SEPARATION_CONTEXT_REQUIRED') || code.startsWith('HR_COMPLIANCE_') ||
          code.startsWith('HR_OFFBOARDING_')) {
        throw new ConflictException(code);
      }
      throw error;
    }
  }
}
