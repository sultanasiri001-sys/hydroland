import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';

type ReviewStatus = 'VERIFIED' | 'REJECTED';
const REVIEW_STATUSES: ReviewStatus[] = ['VERIFIED', 'REJECTED'];

@Injectable()
export class DiveLogReviewService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  private async reviewerScope(accountId: string) {
    const roles = await this.db.roleAssignment.findMany({
      where: { accountId, status: 'ACTIVE', role: { in: ['ADMIN', 'REVIEWER', 'INSTRUCTOR'] } },
      select: { role: true },
    });
    if (roles.some((entry) => entry.role === 'ADMIN' || entry.role === 'REVIEWER')) {
      return { unrestricted: true, instructorName: null as string | null };
    }
    if (roles.some((entry) => entry.role === 'INSTRUCTOR')) {
      const account = await this.db.account.findUnique({
        where: { id: accountId },
        select: { person: { select: { firstName: true, lastName: true } } },
      });
      if (!account) throw new ForbiddenException('Reviewer account not found.');
      return {
        unrestricted: false,
        instructorName: `${account.person.firstName} ${account.person.lastName}`.trim(),
      };
    }
    throw new ForbiddenException('Dive log review scope required.');
  }

  async pending(reviewerAccountId: string) {
    const scope = await this.reviewerScope(reviewerAccountId);
    return this.db.diveLog.findMany({
      where: {
        status: 'DRAFT',
        ...(scope.unrestricted ? {} : { instructorName: scope.instructorName }),
      },
      orderBy: { diveDate: 'desc' },
      take: 100,
      include: {
        account: { select: { id: true, email: true, person: { select: { firstName: true, lastName: true } } } },
      },
    });
  }

  async decide(reviewerAccountId: string, id: string, status: ReviewStatus, reason?: string) {
    if (!REVIEW_STATUSES.includes(status)) throw new BadRequestException('Invalid dive log review status.');
    const scope = await this.reviewerScope(reviewerAccountId);
    const current = await this.db.diveLog.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Dive log not found.');
    if (current.accountId === reviewerAccountId) throw new BadRequestException('You cannot review your own dive log.');
    if (!scope.unrestricted && current.instructorName !== scope.instructorName) {
      throw new ForbiddenException('This dive log is not assigned to this instructor.');
    }

    const updated = await this.db.diveLog.update({
      where: { id },
      data: {
        status,
        verifiedAt: status === 'VERIFIED' ? new Date() : null,
        notes: reason?.trim() ? [current.notes, `REVIEW:${reason.trim()}`].filter(Boolean).join(' | ') : current.notes,
      },
    });

    await this.audit.record({
      action: 'DIVE_LOG_REVIEWED',
      resource: 'DiveLog',
      resourceId: id,
      metadata: {
        reviewerAccountId,
        ownerAccountId: current.accountId,
        reviewerScope: scope.unrestricted ? 'ADMIN_OR_REVIEWER' : 'INSTRUCTOR',
        previousStatus: current.status,
        status,
        reason: reason?.trim() || null,
      },
    });

    return updated;
  }
}
