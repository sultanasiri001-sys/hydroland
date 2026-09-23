import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { assertEmploymentTransition, assertHrActionForEmploymentTransition, assertHrAuthorization, HrAction, HrActor, HrRequestContext } from './hr-policy';
import { assertHrProductionCompliance, HrComplianceControl } from './hr-compliance';

@Injectable()
export class HrService {
  constructor(private readonly db: DatabaseService) {}

  authorize(actor: HrActor, action: HrAction, context: HrRequestContext): void {
    assertHrAuthorization(actor, action, context);
  }

  validateEmploymentTransition(from: string, to: string): void {
    assertEmploymentTransition(from, to);
  }

  async approveCompensation(input: { compensationTermId: string; actor: HrActor; context: HrRequestContext }) {
    const term = await this.db.compensationTerm.findUniqueOrThrow({
      where: { id: input.compensationTermId },
      select: { id: true, status: true, employment: { select: { organizationId: true } }, requestedByAccountId: true, reviewedByAccountId: true },
    });
    if (term.employment.organizationId !== input.context.organizationId) throw new Error('HR_ORGANIZATION_SCOPE_DENIED');
    if (!term.requestedByAccountId || !term.reviewedByAccountId) throw new Error('HR_SEPARATION_CONTEXT_REQUIRED');
    this.authorize(input.actor, 'APPROVE_COMPENSATION_CHANGE', { ...input.context, requesterAccountId: term.requestedByAccountId, reviewerAccountId: term.reviewedByAccountId });
    if (!['HR_REVIEW', 'APPROVAL_REQUIRED'].includes(term.status)) throw new Error('HR_COMPENSATION_NOT_APPROVABLE');
    return this.db.$transaction(async (tx) => {
      const updated = await tx.compensationTerm.updateMany({ where: { id: term.id, status: term.status }, data: { status: 'APPROVED', approvedByAccountId: input.actor.accountId } });
      if (updated.count !== 1) throw new Error('HR_COMPENSATION_CONCURRENT_MODIFICATION');
      const auditActor = await tx.account.findUniqueOrThrow({ where: { id: input.actor.accountId }, select: { personId: true } });
      await tx.auditEvent.create({ data: { actorId: auditActor.personId, action: 'HR_COMPENSATION_APPROVED', resource: 'CompensationTerm', resourceId: term.id, metadata: { organizationId: term.employment.organizationId } as never } });
      return tx.compensationTerm.findUniqueOrThrow({ where: { id: term.id } });
    });
  }

  async approveDisciplinaryDecision(input: { relationsCaseId: string; actor: HrActor; context: HrRequestContext }) {
    const record = await this.db.employeeRelationsCase.findUniqueOrThrow({ where: { id: input.relationsCaseId }, select: { id: true, status: true, openedByAccountId: true, reviewedByAccountId: true, decision: true, employment: { select: { organizationId: true } } } });
    if (record.employment.organizationId !== input.context.organizationId) throw new Error('HR_ORGANIZATION_SCOPE_DENIED');
    if (!record.reviewedByAccountId) throw new Error('HR_SEPARATION_CONTEXT_REQUIRED');
    if (!record.decision?.trim()) throw new Error('HR_DISCIPLINARY_DECISION_REQUIRED');
    this.authorize(input.actor, 'APPROVE_DISCIPLINARY_DECISION', { ...input.context, requesterAccountId: record.openedByAccountId, reviewerAccountId: record.reviewedByAccountId });
    if (!['HR_REVIEW', 'APPROVAL_REQUIRED'].includes(record.status)) throw new Error('HR_DISCIPLINARY_NOT_APPROVABLE');
    return this.db.$transaction(async (tx) => {
      const updated = await tx.employeeRelationsCase.updateMany({ where: { id: record.id, status: record.status }, data: { status: 'APPROVED', approvedByAccountId: input.actor.accountId } });
      if (updated.count !== 1) throw new Error('HR_DISCIPLINARY_CONCURRENT_MODIFICATION');
      const auditActor = await tx.account.findUniqueOrThrow({ where: { id: input.actor.accountId }, select: { personId: true } });
      await tx.auditEvent.create({ data: { actorId: auditActor.personId, action: 'HR_DISCIPLINARY_DECISION_APPROVED', resource: 'EmployeeRelationsCase', resourceId: record.id, metadata: { organizationId: record.employment.organizationId } as never } });
      return tx.employeeRelationsCase.findUniqueOrThrow({ where: { id: record.id } });
    });
  }

  async applyEmploymentStatus(input: {
    employmentId: string;
    nextStatus: string;
    actor: HrActor;
    action: HrAction;
    context: HrRequestContext;
  }) {
    const employment = await this.db.employment.findUniqueOrThrow({
      where: { id: input.employmentId },
      select: { id: true, status: true, organizationId: true },
    });
    if (employment.organizationId !== input.context.organizationId) throw new Error('HR_ORGANIZATION_SCOPE_DENIED');
    this.authorize(input.actor, input.action, input.context);
    this.validateEmploymentTransition(employment.status, input.nextStatus);
    assertHrActionForEmploymentTransition(input.action, employment.status, input.nextStatus);
    if (['APPROVE_APPOINTMENT', 'APPROVE_COMPENSATION_CHANGE', 'APPROVE_DISCIPLINARY_DECISION', 'APPROVE_TERMINATION', 'APPLY_IAM_CHANGE'].includes(input.action)) {
      const rows = await this.db.policyControl.findMany({
        where: { category: 'HR_COMPLIANCE', state: 'ENABLED' },
        select: { ruleKey: true, metadata: true },
      });
      const controls: HrComplianceControl[] = rows.map((row) => {
        const m = row.metadata;
        if (!m || Array.isArray(m) || typeof m !== 'object') {
          return { controlId: row.ruleKey, mandatory: true, applicable: true, evidenceIds: [], validationStatus: 'MISSING' };
        }
        const x = m as Record<string, unknown>;
        return {
          controlId: row.ruleKey,
          mandatory: x.mandatory !== false,
          applicable: x.applicable !== false,
          regulatoryRequirementId: typeof x.regulatoryRequirementId === 'string' ? x.regulatoryRequirementId : undefined,
          regulatoryVersion: typeof x.regulatoryVersion === 'string' ? x.regulatoryVersion : undefined,
          evidenceIds: Array.isArray(x.evidenceIds) ? x.evidenceIds.filter((v): v is string => typeof v === 'string') : [],
          validationStatus: ['VALID','INVALID','MISSING','EXPIRED'].includes(String(x.validationStatus)) ? x.validationStatus as HrComplianceControl['validationStatus'] : 'MISSING',
          blockingFinding: x.blockingFinding === true,
        };
      });
      if (controls.length === 0) throw new Error('HR_COMPLIANCE_CONTROLS_MISSING');
      assertHrProductionCompliance(controls);
    }
    return this.db.$transaction(async (tx) => {
      const current = await tx.employment.findUniqueOrThrow({
        where: { id: employment.id },
        select: { status: true },
      });
      if (current.status !== employment.status) throw new Error('HR_EMPLOYMENT_CONCURRENT_MODIFICATION');
      const updated = await tx.employment.updateMany({
        where: { id: employment.id, status: employment.status as never },
        data: { status: input.nextStatus as never },
      });
      if (updated.count !== 1) throw new Error('HR_EMPLOYMENT_CONCURRENT_MODIFICATION');
      if (input.action === 'APPLY_IAM_CHANGE' && employment.status === 'TERMINATED' && input.nextStatus === 'OFFBOARDED') {
        const revokedAt = new Date();
        const target = await tx.employment.findUniqueOrThrow({
          where: { id: employment.id },
          select: { accountId: true },
        });
        await tx.session.updateMany({
          where: { accountId: target.accountId, revokedAt: null },
          data: { revokedAt },
        });
        await tx.roleAssignment.updateMany({
          where: { accountId: target.accountId, status: 'ACTIVE' },
          data: { status: 'ARCHIVED', endedAt: revokedAt },
        });
        const offboarding = await tx.offboardingCase.findFirst({
          where: { employmentId: employment.id },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        if (!offboarding) throw new Error('HR_OFFBOARDING_CASE_REQUIRED');
        const offboardingRecord = await tx.offboardingCase.findUniqueOrThrow({
          where: { id: offboarding.id },
          select: { status: true, clearance: true },
        });
        if (offboardingRecord.status !== 'APPROVED') {
          throw new Error('HR_OFFBOARDING_APPROVAL_REQUIRED');
        }
        const clearance = offboardingRecord.clearance;
        if (!clearance || Array.isArray(clearance) || typeof clearance !== 'object' ||
            (clearance as Record<string, unknown>).completed !== true) {
          throw new Error('HR_OFFBOARDING_CLEARANCE_REQUIRED');
        }
        await tx.offboardingCase.update({
          where: { id: offboarding.id },
          data: { status: 'CLOSED', iamRevokedAt: revokedAt, closedAt: revokedAt },
        });
      }
      const auditActor = await tx.account.findUniqueOrThrow({
        where: { id: input.actor.accountId },
        select: { personId: true },
      });
      await tx.auditEvent.create({
        data: {
          actorId: auditActor.personId,
          action: 'HR_EMPLOYMENT_STATUS_CHANGED',
          resource: 'Employment',
          resourceId: employment.id,
          metadata: {
            organizationId: employment.organizationId,
            fromStatus: employment.status,
            toStatus: input.nextStatus,
            hrAction: input.action,
          } as never,
        },
      });
      return tx.employment.findUniqueOrThrow({ where: { id: employment.id } });
    });
  }
}
