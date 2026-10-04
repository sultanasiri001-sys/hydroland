import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { hasInstructorCenterAccess } from './training-center-scope';

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

  private async isAdmin(accountId: string, db:Prisma.TransactionClient=this.db) {
    return Boolean(await db.roleAssignment.findFirst({
      where: { accountId, status: 'ACTIVE', role: 'ADMIN', account:{status:'ACTIVE'} },
      select: { id: true },
    }));
  }

  private async isAssignedInstructor(accountId: string, enrollment: EnrollmentScope, db:Prisma.TransactionClient=this.db) {
    if (enrollment.instructorAccountId !== accountId) return false;
    const active=Boolean(await db.roleAssignment.findFirst({
      where: { accountId, status: 'ACTIVE', role: 'INSTRUCTOR', account:{status:'ACTIVE'} },
      select: { id: true },
    }));
    return active&&await hasInstructorCenterAccess(db,accountId,enrollment.centerOrganizationId);
  }

  private async isCenterOperator(accountId: string, centerOrganizationId: string | null, db:Prisma.TransactionClient=this.db) {
    if (!centerOrganizationId) return false;
    return Boolean(await db.organizationMember.findFirst({
      where: {
        accountId,
        organizationId: centerOrganizationId,
        status: 'ACTIVE',
        role: { in: ['OWNER', 'ADMIN', 'OPERATOR'] },
        account:{status:'ACTIVE',roleAssignments:{some:{role:'DIVE_CENTER',status:'ACTIVE'}}},
        organization:{kind:'DIVE_CENTER',status:'ACTIVE'},
      },
      select: { id: true },
    }));
  }

  private async assertScope(accountId: string, enrollment: EnrollmentScope, allowStudent: boolean, db:Prisma.TransactionClient=this.db) {
    if (allowStudent && enrollment.studentAccountId === accountId) return;
    if (await this.isAdmin(accountId,db)) return;
    if (await this.isAssignedInstructor(accountId, enrollment,db)) return;
    if (await this.isCenterOperator(accountId, enrollment.centerOrganizationId,db)) return;
    this.deny();
  }

  async assertReviewer(accountId: string) {
    const reviewer = await this.db.roleAssignment.findFirst({
      where: { accountId, status: 'ACTIVE', role: { in: ['REVIEWER','ADMIN'] } },
      select: { id: true },
    });
    if (!reviewer) this.deny();
  }

  async assertEnrollmentAccess(accountId: string, enrollmentId: string, allowStudent = false) {
    const enrollment = await this.db.trainingEnrollment.findUnique({
      where: { id: enrollmentId },
      select: { studentAccountId: true, instructorAccountId: true, centerOrganizationId: true },
    });
    if (!enrollment) this.deny();
    await this.assertScope(accountId, enrollment, allowStudent);
  }

  async assertRecordAccess(accountId: string, recordId: string, db:Prisma.TransactionClient=this.db) {
    const record = await db.trainingRecord.findUnique({
      where: { id: recordId },
      select: { enrollment: { select: { studentAccountId: true, instructorAccountId: true, centerOrganizationId: true } } },
    });
    if (!record) this.deny();
    await this.assertScope(accountId, record.enrollment, false,db);
  }

  async assertStageAccess(accountId: string, stageId: string) {
    const stage = await this.db.trainingStage.findUnique({
      where: { id: stageId },
      select: { trainingRecord: { select: { enrollment: { select: { studentAccountId: true, instructorAccountId: true, centerOrganizationId: true } } } } },
    });
    if (!stage) this.deny();
    await this.assertScope(accountId, stage.trainingRecord.enrollment, false);
  }

  async assertSkillAccess(accountId: string, skillId: string) {
    const skill = await this.db.trainingSkill.findUnique({
      where: { id: skillId },
      select: { trainingStage: { select: { trainingRecord: { select: { enrollment: { select: { studentAccountId: true, instructorAccountId: true, centerOrganizationId: true } } } } } } },
    });
    if (!skill) this.deny();
    await this.assertScope(accountId, skill.trainingStage.trainingRecord.enrollment, false);
  }

  async assertSessionAccess(accountId: string, sessionId: string, db:Prisma.TransactionClient=this.db) {
    const session = await db.trainingSession.findUnique({
      where: { id: sessionId },
      select: {
        instructorAccountId: true,
        trainingRecord: { select: { enrollment: { select: { studentAccountId: true, instructorAccountId: true, centerOrganizationId: true } } } },
      },
    });
    if (!session) this.deny();

    if (await this.isAssignedInstructor(accountId,{...session.trainingRecord.enrollment,instructorAccountId:session.instructorAccountId},db)) return;

    await this.assertScope(accountId, session.trainingRecord.enrollment, false,db);
  }

  async assertAdministrativeEnrollmentAccess(accountId: string, enrollmentId: string, db:Prisma.TransactionClient=this.db) {
    const enrollment = await db.trainingEnrollment.findUnique({
      where: { id: enrollmentId },
      select: { centerOrganizationId: true },
    });
    if (!enrollment) this.deny();
    if (await this.isAdmin(accountId,db)) return;
    if (await this.isCenterOperator(accountId, enrollment.centerOrganizationId,db)) return;
    this.deny();
  }
}
