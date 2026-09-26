import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { PolicyControlService } from './policy-control.service';

type CrewResourceRow={id:string;type:string;name:string;referenceId:string};
type AssignmentRow={id:string;tripId:string;resourceId:string;accountId:string;roleType:string;status:string;replacesAssignmentId:string|null;respondedAt:Date|null;createdAt:Date;updatedAt:Date};
type AssignmentWithTripRow=AssignmentRow&{tripTitle:string;tripType:string;startsAt:Date;endsAt:Date};
type PendingAssignmentRow=AssignmentRow&{tripTitle:string;startsAt:Date;endsAt:Date};
type QualificationPolicy={master:string;instructorRole:string;instructorCredential:string;captainRole:string;captainLicense:string;crewRole:string};

@Injectable()
export class CrewAssignmentService{
  constructor(private readonly db:DatabaseService,private readonly policies:PolicyControlService,private readonly audit:AuditService){}
  private notify(accountId:string,type:string,payload:Record<string,unknown>){return this.db.notification.create({data:{accountId,type,payload:payload as Prisma.InputJsonValue,status:'PENDING'}});}
  private async notifyAdmins(type:string,payload:Record<string,unknown>){const admins=await this.db.roleAssignment.findMany({where:{role:'ADMIN',status:'ACTIVE'},select:{accountId:true}});await Promise.all(admins.map((admin:{accountId:string})=>this.notify(admin.accountId,type,payload)));}
  private async hasOverdueAlert(assignmentId:string){const rows=await this.db.$queryRaw<Array<{exists:boolean}>>`SELECT EXISTS(SELECT 1 FROM "Notification" WHERE "type"='CREW_RESPONSE_OVERDUE' AND "payload"->>'assignmentId'=${assignmentId}) AS "exists"`;return rows[0]?.exists===true;}
  private async qualificationPolicy():Promise<QualificationPolicy>{const [master,instructorRole,instructorCredential,captainRole,captainLicense,crewRole]=await Promise.all([this.policies.state('CREW','QUALIFICATION'),this.policies.state('INSTRUCTOR','ACTIVE_ROLE'),this.policies.state('INSTRUCTOR','VERIFIED_CREDENTIAL'),this.policies.state('CAPTAIN','ACTIVE_ROLE'),this.policies.state('CAPTAIN','VERIFIED_LICENSE'),this.policies.state('CREW','ACTIVE_ROLE')]);return{master,instructorRole,instructorCredential,captainRole,captainLicense,crewRole};}
  private enforce(master:string,state:string){return master==='ENABLED'&&state==='ENABLED';}
  private review(master:string,state:string){return master==='REVIEW'||(master==='ENABLED'&&state==='REVIEW');}

  private async eligibleResources(tripId:string,excludeResourceId?:string,excludeAccountId?:string){
    const trip=await this.db.trip.findUnique({where:{id:tripId},select:{startsAt:true,endsAt:true}});if(!trip)throw new NotFoundException('Trip not found.');
    const policy=await this.qualificationPolicy();
    const ir=this.enforce(policy.master,policy.instructorRole),ic=this.enforce(policy.master,policy.instructorCredential),cr=this.enforce(policy.master,policy.captainRole),cl=this.enforce(policy.master,policy.captainLicense),er=this.enforce(policy.master,policy.crewRole);
    const rows=await this.db.$queryRaw<CrewResourceRow[]>`
      SELECT r."id",r."type",r."name",r."referenceId"
      FROM "CalendarResource" r JOIN "Account" ac ON ac."id"::text=r."referenceId"
      WHERE r."active"=TRUE AND r."referenceId" IS NOT NULL AND r."type" IN ('INSTRUCTOR','CREW','CAPTAIN') AND ac."status"='ACTIVE'
        AND (${excludeResourceId??null}::text IS NULL OR r."id"<>${excludeResourceId??null})
        AND (${excludeAccountId??null}::text IS NULL OR r."referenceId"<>${excludeAccountId??null})
        AND NOT EXISTS(
          SELECT 1 FROM "CalendarAllocation" a
          JOIN "CalendarEvent" e ON e."id"=a."eventId"
          WHERE a."resourceId"=r."id" AND a."status"='ACTIVE'
            AND (e."referenceType"<>'TRIP' OR e."referenceId"<>${tripId})
            AND a."startsAt"<${trip.endsAt} AND a."endsAt">${trip.startsAt}
        )
        AND NOT EXISTS(SELECT 1 FROM "CrewAssignment" ca WHERE ca."tripId"::text=${tripId} AND ca."accountId"::text=r."referenceId" AND ca."status" IN ('PENDING','ACCEPTED'))
        AND (r."type"<>'INSTRUCTOR' OR ((NOT ${ir}) OR EXISTS(SELECT 1 FROM "RoleAssignment" ra WHERE ra."accountId"=ac."id" AND ra."role"='INSTRUCTOR' AND ra."status"='ACTIVE')))
        AND (r."type"<>'INSTRUCTOR' OR ((NOT ${ic}) OR EXISTS(SELECT 1 FROM "Credential" c WHERE c."personId"=ac."personId" AND c."verificationStatus" IN ('VERIFIED','DOCUMENT_VERIFIED') AND (c."expiresAt" IS NULL OR c."expiresAt">NOW()))))
        AND (r."type"<>'CAPTAIN' OR ((NOT ${cr}) OR EXISTS(SELECT 1 FROM "RoleAssignment" ra WHERE ra."accountId"=ac."id" AND ra."role" IN ('BOAT_OWNER','STAFF') AND ra."status"='ACTIVE')))
        AND (r."type"<>'CAPTAIN' OR ((NOT ${cl}) OR EXISTS(SELECT 1 FROM "Credential" c WHERE c."personId"=ac."personId" AND c."verificationStatus" IN ('VERIFIED','DOCUMENT_VERIFIED') AND (c."expiresAt" IS NULL OR c."expiresAt">NOW()))))
        AND (r."type"<>'CREW' OR ((NOT ${er}) OR EXISTS(SELECT 1 FROM "RoleAssignment" ra WHERE ra."accountId"=ac."id" AND ra."role" IN ('STAFF','BOAT_OWNER') AND ra."status"='ACTIVE')))
      ORDER BY r."name" ASC`;
    const reviews:string[]=[];
    if(this.review(policy.master,policy.instructorRole))reviews.push('INSTRUCTOR_ACTIVE_ROLE');
    if(this.review(policy.master,policy.instructorCredential))reviews.push('INSTRUCTOR_VERIFIED_CREDENTIAL');
    if(this.review(policy.master,policy.captainRole))reviews.push('CAPTAIN_ACTIVE_ROLE');
    if(this.review(policy.master,policy.captainLicense))reviews.push('CAPTAIN_VERIFIED_LICENSE');
    if(this.review(policy.master,policy.crewRole))reviews.push('CREW_ACTIVE_ROLE');
    return{rows,policy,reviews};
  }

  async dispatchForConfirmedBooking(tripId:string,bookingId:string){
    const trip=await this.db.trip.findUnique({where:{id:tripId}});if(!trip)throw new NotFoundException('Trip not found.');
    const qualified=await this.eligibleResources(tripId),qualifiedIds=qualified.rows.map((r:CrewResourceRow)=>r.id);
    const allocated=qualifiedIds.length?await this.db.$queryRaw<CrewResourceRow[]>`SELECT r."id",r."type",r."name",r."referenceId" FROM "CalendarAllocation" a JOIN "CalendarEvent" e ON e."id"=a."eventId" JOIN "CalendarResource" r ON r."id"=a."resourceId" WHERE e."referenceType"='TRIP' AND e."referenceId"=${tripId} AND a."status"='ACTIVE' AND r."id"=ANY(${qualifiedIds}::text[])`:[];
    for(const resource of allocated){
      const existing=await this.db.$queryRaw<AssignmentRow[]>`SELECT * FROM "CrewAssignment" WHERE "tripId"::text=${tripId} AND "resourceId"=${resource.id} AND "status" IN ('PENDING','ACCEPTED') ORDER BY "createdAt" DESC LIMIT 1`;
      if(!existing.length){
        const created=await this.db.$queryRaw<AssignmentRow[]>`
          INSERT INTO "CrewAssignment"("id","tripId","resourceId","accountId","roleType","status","createdAt","updatedAt")
          SELECT gen_random_uuid(),t."id",${resource.id},ac."id",${resource.type},'PENDING',NOW(),NOW()
          FROM "Trip" t JOIN "Account" ac ON ac."id"::text=${resource.referenceId}
          WHERE t."id"::text=${tripId}
          RETURNING *`;
        if(!created[0])throw new ConflictException('Crew assignment could not be created.');
        await this.notify(resource.referenceId,'TRIP_CREW_ASSIGNMENT',{assignmentId:created[0].id,tripId,bookingId,tripTitle:trip.title,startsAt:trip.startsAt,endsAt:trip.endsAt,roleType:resource.type,resourceName:resource.name,actionRequired:true,policyReview:qualified.reviews});
      }else await this.notify(existing[0].accountId,'TRIP_BOOKING_CONFIRMED',{assignmentId:existing[0].id,tripId,bookingId,tripTitle:trip.title,startsAt:trip.startsAt,endsAt:trip.endsAt,roleType:existing[0].roleType,actionRequired:existing[0].status==='PENDING',policyReview:qualified.reviews});
    }
    return{tripId,bookingId,notifiedCrew:allocated.length,policyReview:{required:qualified.reviews.length>0,issues:qualified.reviews,states:qualified.policy}};
  }

  mine(accountId:string){return this.db.$queryRaw<AssignmentWithTripRow[]>`SELECT c.*,t."title" AS "tripTitle",t."type" AS "tripType",t."startsAt",t."endsAt" FROM "CrewAssignment" c JOIN "Trip" t ON t."id"=c."tripId" WHERE c."accountId"::text=${accountId} ORDER BY t."startsAt" ASC,c."createdAt" DESC LIMIT 100`;}

  async escalatePending(hoursBefore=24){const responsePolicy=await this.policies.decision('CREW','RESPONSE_REQUIRED');if(responsePolicy.bypass)return{checked:0,reassigned:0,adminRequired:0,hoursBefore,policyState:responsePolicy.state};const boundedHours=Math.min(168,Math.max(1,Math.trunc(hoursBefore))),deadline=new Date(Date.now()+boundedHours*3600000);const pending=await this.db.$queryRaw<PendingAssignmentRow[]>`SELECT c.*,t."title" AS "tripTitle",t."startsAt",t."endsAt" FROM "CrewAssignment" c JOIN "Trip" t ON t."id"=c."tripId" WHERE c."status"='PENDING' AND t."status" IN ('OPEN','CLOSED') AND t."startsAt">NOW() AND t."startsAt"<=${deadline} ORDER BY t."startsAt" ASC`;let reassigned=0,adminRequired=0;for(const assignment of pending){if(responsePolicy.review){if(!(await this.hasOverdueAlert(assignment.id))){await this.notifyAdmins('CREW_RESPONSE_REVIEW_REQUIRED',{assignmentId:assignment.id,tripId:assignment.tripId,tripTitle:assignment.tripTitle,accountId:assignment.accountId,roleType:assignment.roleType,startsAt:assignment.startsAt});adminRequired+=1;}continue;}const replacement=await this.findReplacement(assignment);if(replacement){const created=await this.replaceAssignment(assignment,replacement,'REASSIGNED');if(created){await this.notify(assignment.accountId,'CREW_ASSIGNMENT_ESCALATED',{assignmentId:assignment.id,tripId:assignment.tripId,tripTitle:assignment.tripTitle,reason:'NO_RESPONSE_BEFORE_DEADLINE',startsAt:assignment.startsAt});reassigned+=1;}}else if(!(await this.hasOverdueAlert(assignment.id))){await this.notifyAdmins('CREW_RESPONSE_OVERDUE',{assignmentId:assignment.id,tripId:assignment.tripId,tripTitle:assignment.tripTitle,accountId:assignment.accountId,roleType:assignment.roleType,startsAt:assignment.startsAt,hoursBefore:boundedHours});adminRequired+=1;}}return{checked:pending.length,reassigned,adminRequired,hoursBefore:boundedHours,policyState:responsePolicy.state};}

  async respond(accountId:string,assignmentId:string,response:'ACCEPTED'|'REJECTED'){
    const rows=await this.db.$queryRaw<AssignmentRow[]>`SELECT * FROM "CrewAssignment" WHERE "id"::text=${assignmentId} LIMIT 1`,assignment=rows[0];
    if(!assignment||assignment.accountId!==accountId)throw new NotFoundException('Crew assignment not found.');
    if(assignment.status!=='PENDING')throw new ConflictException('Crew assignment already answered.');
    if(response==='ACCEPTED'){
      await this.db.$executeRaw`UPDATE "CrewAssignment" SET "status"='ACCEPTED',"respondedAt"=NOW(),"updatedAt"=NOW() WHERE "id"::text=${assignmentId} AND "status"='PENDING'`;
      await this.audit.record({action:'CREW_ASSIGNMENT_ACCEPTED',resource:'CrewAssignment',resourceId:assignmentId,metadata:{accountId,tripId:assignment.tripId,resourceId:assignment.resourceId,roleType:assignment.roleType}});await this.notifyAdmins('CREW_ASSIGNMENT_ACCEPTED',{assignmentId,tripId:assignment.tripId,accountId});return{assignmentId,status:'ACCEPTED'};
    }
    await this.db.$executeRaw`UPDATE "CrewAssignment" SET "status"='REJECTED',"respondedAt"=NOW(),"updatedAt"=NOW() WHERE "id"::text=${assignmentId} AND "status"='PENDING'`;
    await this.audit.record({action:'CREW_ASSIGNMENT_REJECTED',resource:'CrewAssignment',resourceId:assignmentId,metadata:{accountId,tripId:assignment.tripId,resourceId:assignment.resourceId,roleType:assignment.roleType}});
    const replacement=await this.findReplacement(assignment);
    if(!replacement){await this.notifyAdmins('CREW_REPLACEMENT_REQUIRED',{assignmentId,tripId:assignment.tripId,roleType:assignment.roleType,rejectedByAccountId:accountId});return{assignmentId,status:'REJECTED',replacement:null,requiresAdminAction:true};}
    const replacementAssignment=await this.replaceAssignment(assignment,replacement);if(!replacementAssignment)throw new ConflictException('Crew replacement could not be created.');return{assignmentId,status:'REJECTED',replacement:{assignmentId:replacementAssignment.id,accountId:replacement.referenceId,resourceId:replacement.id,resourceName:replacement.name}};
  }

  private async findReplacement(assignment:AssignmentRow):Promise<CrewResourceRow|null>{
    const trip=await this.db.trip.findUnique({where:{id:assignment.tripId}});if(!trip)return null;
    const qualified=await this.eligibleResources(assignment.tripId,assignment.resourceId,assignment.accountId),ids=qualified.rows.filter((r:CrewResourceRow)=>r.type===assignment.roleType).map((r:CrewResourceRow)=>r.id);if(!ids.length)return null;
    const candidates=await this.db.$queryRaw<CrewResourceRow[]>`SELECT r."id",r."type",r."name",r."referenceId" FROM "CalendarResource" r WHERE r."id"=ANY(${ids}::text[]) AND NOT EXISTS(SELECT 1 FROM "CalendarAllocation" a JOIN "CalendarEvent" e ON e."id"=a."eventId" WHERE a."resourceId"=r."id" AND a."status"='ACTIVE' AND a."startsAt"<${trip.endsAt} AND a."endsAt">${trip.startsAt} AND (e."referenceType"<>'TRIP' OR e."referenceId"<>${assignment.tripId})) AND NOT EXISTS(SELECT 1 FROM "CrewAssignment" c WHERE c."tripId"::text=${assignment.tripId} AND c."accountId"::text=r."referenceId" AND c."status" IN ('PENDING','ACCEPTED')) ORDER BY r."name" ASC LIMIT 1`;
    return candidates[0]??null;
  }

  private async replaceAssignment(assignment:AssignmentRow,replacement:CrewResourceRow,previousStatus?:'REASSIGNED'):Promise<AssignmentRow|null>{
    const created=await this.db.$transaction(async(tx:Prisma.TransactionClient)=>{
      if(previousStatus){const changed=await tx.$executeRaw`UPDATE "CrewAssignment" SET "status"=${previousStatus},"respondedAt"=NOW(),"updatedAt"=NOW() WHERE "id"::text=${assignment.id} AND "status"='PENDING'`;if(!changed)return null;}
      await tx.$executeRaw`UPDATE "CalendarAllocation" a SET "resourceId"=${replacement.id},"updatedAt"=NOW() FROM "CalendarEvent" e WHERE e."id"=a."eventId" AND e."referenceType"='TRIP' AND e."referenceId"=${assignment.tripId} AND a."resourceId"=${assignment.resourceId} AND a."status"='ACTIVE'`;
      const rows=await tx.$queryRaw<AssignmentRow[]>`
        INSERT INTO "CrewAssignment"("id","tripId","resourceId","accountId","roleType","status","replacesAssignmentId","createdAt","updatedAt")
        SELECT gen_random_uuid(),t."id",${replacement.id},ac."id",${assignment.roleType},'PENDING',old."id",NOW(),NOW()
        FROM "Trip" t
        JOIN "Account" ac ON ac."id"::text=${replacement.referenceId}
        JOIN "CrewAssignment" old ON old."id"::text=${assignment.id}
        WHERE t."id"::text=${assignment.tripId}
        RETURNING *`;
      return rows[0]??null;
    });
    if(!created)return null;
    await this.audit.record({action:'CREW_ASSIGNMENT_REASSIGNED',resource:'CrewAssignment',resourceId:created.id,metadata:{tripId:assignment.tripId,previousAssignmentId:assignment.id,previousAccountId:assignment.accountId,replacementAccountId:replacement.referenceId,previousResourceId:assignment.resourceId,replacementResourceId:replacement.id,roleType:assignment.roleType}});
    const trip=await this.db.trip.findUnique({where:{id:assignment.tripId}});
    await this.notify(replacement.referenceId,'TRIP_CREW_ASSIGNMENT',{assignmentId:created.id,tripId:assignment.tripId,tripTitle:trip?.title??'HYDROLAND Trip',startsAt:trip?.startsAt??null,endsAt:trip?.endsAt??null,roleType:assignment.roleType,resourceName:replacement.name,replacementForAssignmentId:assignment.id,actionRequired:true});
    await this.notifyAdmins('CREW_REASSIGNED',{tripId:assignment.tripId,rejectedAssignmentId:assignment.id,replacementAssignmentId:created.id,replacementAccountId:replacement.referenceId,roleType:assignment.roleType});
    return created;
  }
}
