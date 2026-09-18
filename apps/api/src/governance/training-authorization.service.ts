import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class TrainingAuthorizationService {
  constructor(private readonly db: DatabaseService) {}

  async assertEnrollmentAccess(accountId: string, enrollmentId: string) {
    const enrollment = await this.db.trainingEnrollment.findUnique({
      where: { id: enrollmentId },
      select: { studentAccountId: true, instructorAccountId: true, centerOrganizationId: true },
    });
    if (!enrollment) throw new ForbiddenException('Training enrollment access denied.');
    if (enrollment.studentAccountId === accountId || enrollment.instructorAccountId === accountId) return enrollment;

    const admin = await this.db.roleAssignment.findFirst({
      where: { accountId, status: 'ACTIVE', role: 'ADMIN' },
      select: { id: true },
    });
    if (admin) return enrollment;

    if (enrollment.centerOrganizationId) {
      const member = await this.db.organizationMember.findFirst({
        where: {
          accountId,
          organizationId: enrollment.centerOrganizationId,
          status: 'ACTIVE',
          role: { in: ['OWNER', 'ADMIN', 'OPERATOR', 'INSTRUCTOR'] },
        },
        select: { id: true },
      });
      if (member) return enrollment;
    }

    throw new ForbiddenException('Training enrollment access denied.');
  }

  async assertTrainingOperator(accountId: string) {
    const role = await this.db.roleAssignment.findFirst({
      where: { accountId, status: 'ACTIVE', role: { in: ['ADMIN', 'INSTRUCTOR', 'DIVE_CENTER'] } },
      select: { id: true },
    });
    if (!role) throw new ForbiddenException('Training operator scope required.');
  }
}
