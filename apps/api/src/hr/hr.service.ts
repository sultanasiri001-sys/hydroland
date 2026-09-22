import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { assertEmploymentTransition, assertHrAuthorization, HrAction, HrActor, HrRequestContext } from './hr-policy';

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
    this.authorize(input.actor, input.action, input.context);
    const employment = await this.db.employment.findUniqueOrThrow({
      where: { id: input.employmentId },
      select: { id: true, status: true, organizationId: true },
    });
    if (employment.organizationId !== input.context.organizationId) throw new Error('HR_ORGANIZATION_SCOPE_DENIED');
    this.validateEmploymentTransition(employment.status, input.nextStatus);
    return this.db.employment.update({
      where: { id: employment.id },
      data: { status: input.nextStatus as never },
    });
  }
}
