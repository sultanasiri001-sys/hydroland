import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

  pending() {
    return this.db.diveLog.findMany({
      where: { status: 'DRAFT' },
      orderBy: { diveDate: 'desc' },
      take: 100,
      include: {
        account: { select: { id: true, email: true, person: { select: { firstName: true, lastName: true } } } },
      },
    });
  }

  async decide(reviewerAccountId: string, id: string, status: ReviewStatus, reason?: string) {
    if (!REVIEW_STATUSES.includes(status)) throw new BadRequestException('Invalid dive log review status.');
    const current = await this.db.diveLog.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Dive log not found.');
    if (current.accountId === reviewerAccountId) throw new BadRequestException('You cannot review your own dive log.');

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
        previousStatus: current.status,
        status,
        reason: reason?.trim() || null,
      },
    });

    return updated;
  }
}
