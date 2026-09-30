import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class TrainingProfessionalProfileService {
  constructor(private readonly db: DatabaseService) {}

  async get(accountId: string) {
    const role = await this.db.roleAssignment.findUnique({
      where: { accountId_role: { accountId, role: 'INSTRUCTOR' } },
      select: { status: true, activeAt: true },
    });
    if (!role || role.status !== 'ACTIVE') throw new ForbiddenException('Active instructor role required.');

    const account = await this.db.account.findUnique({
      where: { id: accountId },
      select: {
        status: true,
        person: {
          select: {
            firstName: true,
            lastName: true,
            professional: { select: { headline: true, bio: true, regionCode: true } },
            credentials: {
              select: { id: true, issuer: true, title: true, issuedAt: true, expiresAt: true, verificationStatus: true },
              orderBy: { updatedAt: 'desc' },
              take: 50,
            },
          },
        },
      },
    });
    if (!account || account.status !== 'ACTIVE') throw new ForbiddenException('Active account required.');

    const [studentRows, sessionsToday, completedSessions] = await Promise.all([
      this.db.trainingEnrollment.findMany({
        where: { instructorAccountId: accountId, status: { in: ['ACTIVE', 'COMPLETED'] } },
        select: { studentAccountId: true },
        distinct: ['studentAccountId'],
      }),
      this.db.trainingSession.count({
        where: {
          instructorAccountId: accountId,
          startsAt: { gte: new Date(new Date().setHours(0,0,0,0)), lt: new Date(new Date().setHours(24,0,0,0)) },
          status: { in: ['SCHEDULED','CHECK_IN_OPEN','IN_PROGRESS'] },
        },
      }),
      this.db.trainingSession.count({ where: { instructorAccountId: accountId, status: 'COMPLETED' } }),
    ]);

    const credentials = account.person.credentials.map(item => ({
      id: item.id, issuer: item.issuer, title: item.title, issuedAt: item.issuedAt,
      expiresAt: item.expiresAt, verificationStatus: item.verificationStatus,
    }));
    return {
      profile: {
        displayName: [account.person.firstName, account.person.lastName].filter(Boolean).join(' ').trim(),
        headline: account.person.professional?.headline ?? null,
        bio: account.person.professional?.bio ?? null,
        regionCode: account.person.professional?.regionCode ?? null,
        instructorActiveAt: role.activeAt,
      },
      credentials,
      metrics: {
        activeStudents: studentRows.length,
        sessionsToday,
        completedSessions,
        verifiedCredentials: credentials.filter(item => ['VERIFIED','DOCUMENT_VERIFIED'].includes(item.verificationStatus)).length,
      },
      privacy: {
        excludesMedicalData: true,
        excludesIdentityData: true,
        excludesEmergencyContacts: true,
      },
    };
  }
}
