import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { PolicyControlService } from './policy-control.service';
import { calendarBusyAccounts, trainingBusyAccounts } from './calendar-training-availability';
import { CrewAssignmentLifecycle } from './crew-assignment-lifecycle';

type CrewResourceRow={id:string;type:string;name:string;referenceId:string};
type AssignmentRow={id:string;tripId:string;resourceId:string;accountId:string;roleType:string;status:string;replacesAssignmentId:string|null;respondedAt:Date|null;createdAt:Date;updatedAt:Date};
type AssignmentWithTripRow=AssignmentRow&{tripTitle:string;tripType:string;startsAt:Date;endsAt:Date};
type PendingAssignmentRow=AssignmentRow&{tripTitle:string;startsAt:Date;endsAt:Date};
type QualificationDecision=Awaited<ReturnType<PolicyControlService['decision']>>;
type QualificationPolicy={master:QualificationDecision;instructorRole:QualificationDecision;instructorCredential:QualificationDecision;captainRole:QualificationDecision;captainLicense:QualificationDecision;crewRole:QualificationDecision};

@Injectable()
export class CrewAssignmentService{
  private readonly lifecycle:CrewAssignmentLifecycle;
  constructor(private readonly db:DatabaseService,private readonly policies:PolicyControlService,private readonly audit:AuditService){this.lifecycle=new CrewAssignmentLifecycle(db,audit);}
  private async qualificationPolicy(tx:Prisma.TransactionClient=this.db):Promise<QualificationPolicy>{const [master,instructorRole,instructorCredential,captainRole,captainLicense,crewRole]=await Promise.all([this.policies.decision('CREW','QUALIFICATION',tx),this.policies.decision('INSTRUCTOR','ACTIVE_ROLE',tx),this.policies.decision('INSTRUCTOR','VERIFIED_CREDENTIAL',tx),this.policies.decision('CAPTAIN','ACTIVE_ROLE',tx),this.policies.decision('CAPTAIN','VERIFIED_LICENSE',tx),this.policies.decision('CREW','ACTIVE_ROLE',tx)]);return{master,instructorRole,instructorCredential,captainRole,captainLicense,crewRole};}
  private enforce(master:QualificationDecision,state:QualificationDecision){return state.mandatory||master.enforce&&state.enforce;}
  private review(master:QualificationDecision,state:QualificationDecision){return !state.mandatory&&(master.review||master.enforce&&state.review);}

  private async eligibleResources(tripId:string,excludeResourceId?:string,excludeAccountId?:string,tx:Prisma.TransactionClient=this.db){
    const trip=await tx.trip.findUnique({where:{id:tripId},select:{startsAt:true,endsAt:true}});if(!trip)throw new NotFoundException('Trip not found.');
    const policy=await this.qualificationPolicy(tx);
    const ir=this.enforce(policy.master,policy.instructorRole),ic=this.enforce(policy.master,policy.instructorCredential),cr=this.enforce(policy.master,policy.captainRole),cl=this.enforce(policy.master,policy.captainLicense),er=this.enforce(policy.master,policy.crewRole);
    const rows=await tx.$queryRaw<CrewResourceRow[]>`
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
            AND a."startsAt"<(${trip.endsAt}::timestamptz AT TIME ZONE 'UTC') AND a."endsAt">(${trip.startsAt}::timestamptz AT TIME ZONE 'UTC')
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
    const busy=await trainingBusyAccounts(tx,rows.map(row=>row.referenceId),trip.startsAt,trip.endsAt);
    const calendarBusy=await calendarBusyAccounts(tx,rows.map(row=>row.referenceId),trip.startsAt,trip.endsAt,tripId);
    return{rows:rows.filter(row=>!busy.has(row.referenceId)&&!calendarBusy.has(row.referenceId)),policy,reviews};
  }

  // Advisory candidate scheduling only. F02 source-backed commands perform
  // their own current qualification, compensation and calendar checks.
  dispatchForConfirmedBooking(tripId:string,bookingId:string,client?:Prisma.TransactionClient){return this.lifecycle.dispatchForConfirmedBooking(tripId,bookingId,client);}
  mine(accountId:string){return this.lifecycle.mine(accountId);}
  workspace(accountId:string,tripId?:string){return this.lifecycle.workspace(accountId,tripId);}
  propose(accountId:string,tripId:string,body:unknown){return this.lifecycle.propose(accountId,tripId,body);}
  command(accountId:string,id:string,body:unknown){return this.lifecycle.command(accountId,id,body);}
  prepareTemplate(accountId:string,body:unknown){return this.lifecycle.prepareTemplate(accountId,body);}
  respond(accountId:string,id:string,response:'ACCEPTED'|'REJECTED',body:unknown={}){return this.lifecycle.respond(accountId,id,response,body);}
  async escalatePending(hoursBefore=24){
    const policy=await this.policies.decision('CREW','RESPONSE_REQUIRED');
    if(policy.bypass)return {checked:0,reassigned:0,adminRequired:0,hoursBefore,policyState:policy.state};
    return {...await this.lifecycle.escalatePending(hoursBefore),policyState:policy.state};
  }

  // Retain a fail-closed boundary for old internal callers. No code path may
  // silently promote a candidate into a replacement without an independent
  // approval and the substitute's own recorded acceptance.
  private async replaceAssignment(..._legacy:unknown[]):Promise<never>{
    throw new ConflictException({code:'F02_INDEPENDENT_APPROVAL_REQUIRED',message:'F02_INDEPENDENT_APPROVAL_REQUIRED'});
  }
}
