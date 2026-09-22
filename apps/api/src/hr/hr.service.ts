import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { assertEmploymentTransition, assertHrActionForEmploymentTransition, assertHrAuthorization, HrAction, HrActor, HrRequestContext } from './hr-policy';

@Injectable()
export class HrService {
  constructor(private readonly db: DatabaseService) {}

  authorize(actor: HrActor, action: HrAction, context: HrRequestContext): void {
    assertHrAuthorization(actor, action, context);
  }

  validateEmploymentTransition(from: string, to: string): void {
    assertEmploymentTransition(from, to);
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
        await tx.session.updateMany({
          where: { accountId: input.actor.accountId === employment.id ? undefined : undefined },
          data: {},
        });
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
        if (offboarding) {
          await tx.offboardingCase.update({
            where: { id: offboarding.id },
            data: { status: 'CLOSED', iamRevokedAt: revokedAt, closedAt: revokedAt },
          });
        } else {
          await tx.offboardingCase.create({
            data: { employmentId: employment.id, status: 'CLOSED', iamRevokedAt: revokedAt, closedAt: revokedAt },
          });
        }
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
