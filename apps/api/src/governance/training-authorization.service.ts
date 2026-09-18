import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

type EnrollmentScope = {
  studentAccountId: string;
  instructorAccountId: string | null;
  centerOrganizationId: string | null;
};

@Injectable()
export class TrainingAuthorizationService {
  constructor(private readonly db: DatabaseService) {}

  private deny(): never {
    throw new ForbiddenException('Training resource access denied.');
  }

  private async isAdmin(accountId: string) {
    return Boolean(await this.db.roleAssignment.findFirst({
      where: { accountId, status: 'ACTIVE', role: 'ADMIN' },
      select: { id: true },
    }));
  }

  private async isAssignedInstructor(accountId: string, enrollment: EnrollmentScope) {
    if (enrollment.instructorAccountId !== accountId) return false;
    return Boolean(await this.db.roleAssignment.findFirst({
      where: { accountId, status: 'ACTIVE', role: 'INSTRUCTOR' },
      select: { id: true },
    }));
  }

  private async isCenterOperator(accountId: string, centerOrganizationId: string | null) {
    if (!centerOrganizationId) return false;
    return Boolean(await this.db.organizationMember.findFirst({
      where: {
        accountId,
        organizationId: centerOrganizationId,
        status: 'ACTIVE',
        role: { in: ['OWNER', 'ADMIN', 'OPERATOR'] },
      },
      select: { id: true },
    }));
  }

  private async assertScope(accountId: string, enrollment: EnrollmentScope, allowStudent: boolean) {
    if (allowStudent && enrollment.studentAccountId === accountId) return;
    if (await this.isAdmin(accountId)) return;
    if (await this.isAssignedInstructor(accountId, enrollment)) return;
    if (await this.isCenterOperator(accountId, enrollment.centerOrganizationId)) return;
    this.deny();
  }

  async assertEnrollmentAccess(accountId: string, enrollmentId: string, allowStudent = false) {
    const enrollment = await this.db.trainingEnrollment.findUnique({
      where: { id: enrollmentId },
      select: { studentAccountId: true, instructorAccountId: true, centerOrganizationId: true },
    });
    if (!enrollment) this.deny();
    await this.assertScope(accountId, enrollment, allowStudent);
  }

  async assertRecordAccess(accountId: string, recordId: string) {
    const record = await this.db.trainingRecord.findUnique({
      where: { id: recordId },
      select: { enrollment: { select: { studentAccountId: true, instructorAccountId: true, centerOrganizationId: true } } },
    });
    if (!record) this.deny();
    await this.assertScope(accountId, record.enrollment, false);
  }

  async assertStageAccess(accountId: string, stageId: string) {
    const stage = await this.db.trainingStage.findUnique({
      where: { id: stageId },
      select: { trainingRecord: { select: { enrollment: { select: { studentAccountId: true, instructorAccountId: true, centerOrganizationId: true } } } } },
    });
    if (!stage) this.deny();
    await this.assertScope(accountId, stage.trainingRecord.enrollment, false);
  }

  async assertSessionAccess(accountId: string, sessionId: string) {
    const session = await this.db.trainingSession.findUnique({
      where: { id: sessionId },
      select: {
        instructorAccountId: true,
        trainingRecord: { select: { enrollment: { select: { studentAccountId: true, instructorAccountId: true, centerOrganizationId: true } } } },
      },
    });
    if (!session) this.deny();

    if (session.instructorAccountId === accountId) {
      const activeInstructor = await this.db.roleAssignment.findFirst({
        where: { accountId, status: 'ACTIVE', role: 'INSTRUCTOR' },
        select: { id: true },
      });
      if (activeInstructor) return;
    }

    await this.assertScope(accountId, session.trainingRecord.enrollment, false);
  }

  async assertAdministrativeEnrollmentAccess(accountId: string, enrollmentId: string) {
    const enrollment = await this.db.trainingEnrollment.findUnique({
      where: { id: enrollmentId },
      select: { centerOrganizationId: true },
    });
    if (!enrollment) this.deny();
    if (await this.isAdmin(accountId)) return;
    if (await this.isCenterOperator(accountId, enrollment.centerOrganizationId)) return;
    this.deny();
  }
}
