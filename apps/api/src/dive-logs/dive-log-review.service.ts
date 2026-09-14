import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';

type ReviewStatus = 'VERIFIED' | 'REJECTED';
type ReviewerRole = { role: 'ADMIN' | 'REVIEWER' | 'INSTRUCTOR' };
const REVIEW_STATUSES: ReviewStatus[] = ['VERIFIED', 'REJECTED'];

@Injectable()
export class DiveLogReviewService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  private async reviewerScope(accountId: string) {
    const roles = (await this.db.roleAssignment.findMany({
      where: { accountId, status: 'ACTIVE', role: { in: ['ADMIN', 'REVIEWER', 'INSTRUCTOR'] } },
      select: { role: true },
    })) as ReviewerRole[];
    if (roles.some((entry: ReviewerRole) => entry.role === 'ADMIN' || entry.role === 'REVIEWER')) {
      return { unrestricted: true, instructorName: null as string | null };
    }
    if (roles.some((entry: ReviewerRole) => entry.role === 'INSTRUCTOR')) {
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

  private async instructorAssignedToTrip(accountId:string,tripId:string|null){
    if(!tripId)return false;
    const assignment=await this.db.crewAssignment.findFirst({where:{tripId,accountId,status:'ACCEPTED',roleType:'INSTRUCTOR'},select:{id:true}});
    return Boolean(assignment);
  }

  async pending(reviewerAccountId: string) {
    const scope = await this.reviewerScope(reviewerAccountId);
    if(scope.unrestricted){
      return this.db.diveLog.findMany({where:{status:'DRAFT'},orderBy:{diveDate:'desc'},take:100,include:{account:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}}}});
    }
    const tripAssignments=await this.db.crewAssignment.findMany({where:{accountId:reviewerAccountId,status:'ACCEPTED',roleType:'INSTRUCTOR'},select:{tripId:true}});
    const tripIds=[...new Set(tripAssignments.map(item=>item.tripId))];
    return this.db.diveLog.findMany({
      where:{status:'DRAFT',OR:[...(tripIds.length?[{sourceTripId:{in:tripIds}}]:[]),{sourceTripId:null,instructorName:scope.instructorName}]},
      orderBy:{diveDate:'desc'},take:100,
      include:{account:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}}},
    });
  }

  async decide(reviewerAccountId: string, id: string, status: ReviewStatus, reason?: string) {
    if (!REVIEW_STATUSES.includes(status)) throw new BadRequestException('Invalid dive log review status.');
    if(status==='REJECTED'&&!reason?.trim())throw new BadRequestException('A rejection reason is required.');
    const scope = await this.reviewerScope(reviewerAccountId);
    const current = await this.db.diveLog.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Dive log not found.');
    if(current.status!=='DRAFT')throw new ConflictException('Only draft dive logs can be reviewed.');
    if (current.accountId === reviewerAccountId) throw new BadRequestException('You cannot review your own dive log.');
    if (!scope.unrestricted) {
      const assigned=await this.instructorAssignedToTrip(reviewerAccountId,current.sourceTripId);
      const legacyManualMatch=!current.sourceTripId&&current.instructorName===scope.instructorName;
      if(!assigned&&!legacyManualMatch)throw new ForbiddenException('This dive log is not assigned to this instructor.');
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
        sourceTripId:current.sourceTripId,
        reviewerScope: scope.unrestricted ? 'ADMIN_OR_REVIEWER' : 'INSTRUCTOR',
        previousStatus: current.status,
        status,
        reason: reason?.trim() || null,
      },
    });

    return updated;
  }
}
