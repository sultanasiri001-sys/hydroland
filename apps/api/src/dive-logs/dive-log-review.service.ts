import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';

type ReviewStatus = 'VERIFIED' | 'REJECTED';
type ReviewerRole = { role: 'ADMIN' | 'REVIEWER' | 'INSTRUCTOR' };
type TripAssignment = { tripId: string };
const REVIEW_STATUSES: ReviewStatus[] = ['VERIFIED', 'REJECTED'];

@Injectable()
export class DiveLogReviewService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  private async reviewerScope(accountId: string, db: Prisma.TransactionClient = this.db) {
    const roles = (await db.roleAssignment.findMany({
      where: { accountId, status: 'ACTIVE', role: { in: ['ADMIN', 'REVIEWER', 'INSTRUCTOR'] } },
      select: { role: true },
    })) as ReviewerRole[];
    if (roles.some((entry: ReviewerRole) => entry.role === 'ADMIN' || entry.role === 'REVIEWER')) {
      return { unrestricted: true, instructorName: null as string | null };
    }
    if (roles.some((entry: ReviewerRole) => entry.role === 'INSTRUCTOR')) {
      const account = await db.account.findUnique({
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
    if(scope.unrestricted){
      return this.db.diveLog.findMany({where:{status:'DRAFT'},orderBy:{diveDate:'desc'},take:100,include:{account:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}}}});
    }
    const tripAssignments=(await this.db.crewAssignment.findMany({where:{accountId:reviewerAccountId,status:'ACCEPTED',roleType:'INSTRUCTOR'},select:{tripId:true}})) as TripAssignment[];
    const tripIds=[...new Set(tripAssignments.map((item:TripAssignment)=>item.tripId))];
    return this.db.diveLog.findMany({
      where:{status:'DRAFT',OR:[...(tripIds.length?[{sourceTripId:{in:tripIds}}]:[]),{sourceTripId:null,instructorName:scope.instructorName}]},
      orderBy:{diveDate:'desc'},take:100,
      include:{account:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}}},
    });
  }

  async decide(reviewerAccountId: string, id: string, status: ReviewStatus, reason?: string) {
    if (!REVIEW_STATUSES.includes(status)) throw new BadRequestException('Invalid dive log review status.');
    if (reason != null && typeof reason !== 'string') throw new BadRequestException('Review reason must be text.');
    const note = reason?.trim();
    if (status === 'REJECTED' && !note) throw new BadRequestException('A rejection reason is required.');
    return this.db.serializable(async tx => {
      const scope = await this.reviewerScope(reviewerAccountId, tx);
      const current = await tx.diveLog.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Dive log not found.');
      if (current.status !== 'DRAFT') throw new ConflictException('Only draft dive logs can be reviewed.');
      if (current.accountId === reviewerAccountId) throw new BadRequestException('You cannot review your own dive log.');
      if (!scope.unrestricted) {
        const assigned = current.sourceTripId
          ? await tx.crewAssignment.findFirst({ where: { tripId: current.sourceTripId, accountId: reviewerAccountId, status: 'ACCEPTED', roleType: 'INSTRUCTOR' }, select: { id: true } })
          : current.instructorName === scope.instructorName;
        if (!assigned) throw new ForbiddenException('This dive log is not assigned to this instructor.');
      }

      const result = await tx.diveLog.updateMany({
        where: { id, status: 'DRAFT' },
        data: {
          status,
          verifiedAt: status === 'VERIFIED' ? new Date() : null,
          notes: note ? [current.notes, `REVIEW:${note}`].filter(Boolean).join(' | ') : current.notes,
        },
      });
      if (result.count !== 1) throw new ConflictException('Only draft dive logs can be reviewed.');
      await this.audit.record({
        actorId: reviewerAccountId, action: 'DIVE_LOG_REVIEWED', resource: 'DiveLog', resourceId: id,
        metadata: {
          reviewerAccountId, ownerAccountId: current.accountId, sourceTripId: current.sourceTripId,
          reviewerScope: scope.unrestricted ? 'ADMIN_OR_REVIEWER' : 'INSTRUCTOR',
          previousStatus: current.status, status, reason: note || null,
        },
      }, tx);
      return tx.diveLog.findUniqueOrThrow({ where: { id } });
    });
  }
}
