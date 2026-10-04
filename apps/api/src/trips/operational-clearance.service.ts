import { Prisma } from '@prisma/client';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { CalendarAllocationService } from './calendar-allocation.service';

type ClearanceEvent = { id:string; action:string; occurredAt:Date };
type ChangeRow = { changedAt: Date | null };
type ReadinessLike={status:'READY'|'REVIEW_REQUIRED'|'NOT_READY';checks:{safety:boolean;compliance:boolean;[key:string]:boolean};blockers:string[];policyReview?:{issues:string[]}};

@Injectable()
export class OperationalClearanceService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly calendar:CalendarAllocationService) {}

  private async latestEvent(tripId:string,tx:Prisma.TransactionClient=this.db){return tx.auditEvent.findFirst({where:{resource:'Trip',resourceId:tripId,action:{in:['OPERATIONAL_CLEARANCE_GRANTED','OPERATIONAL_REVIEW_APPROVED','OPERATIONAL_CLEARANCE_REVOKED']}},orderBy:{occurredAt:'desc'},select:{id:true,action:true,occurredAt:true}}) as Promise<ClearanceEvent|null>;}
  private assertHardBlocks(readiness:ReadinessLike){
    if(!readiness.checks.safety)throw new ConflictException('Operational clearance blocked by safety.');
    if(!readiness.checks.compliance)throw new ConflictException('Operational clearance blocked by compliance.');
    const hard=(readiness.policyReview?.issues??[]).filter((issue:string)=>['SAFETY_DEFERRED','COMPLIANCE_DEFERRED','REGULATORY_BLOCK'].includes(issue));
    if(hard.length)throw new ConflictException(`Operational clearance blocked: ${hard.join(', ')}`);
  }
  private async latestOperationalChange(tripId:string,tx:Prisma.TransactionClient=this.db){
    const rows=await tx.$queryRaw<ChangeRow[]>`
      SELECT GREATEST(
        t."updatedAt",
        COALESCE((SELECT MAX(bp."updatedAt") FROM "BookingParticipant" bp JOIN "Booking" b ON b."id"=bp."bookingId" WHERE b."tripId"=t."id"),TIMESTAMP '1970-01-01'),
        COALESCE((SELECT MAX(e."updatedAt") FROM "CalendarEvent" e WHERE e."referenceType"='TRIP' AND e."referenceId"=t."id"::text),TIMESTAMP '1970-01-01'),
        COALESCE((SELECT MAX(cr."updatedAt") FROM "CalendarAllocation" a JOIN "CalendarEvent" e ON e."id"=a."eventId" JOIN "CalendarResource" cr ON cr."id"=a."resourceId" WHERE e."referenceType"='TRIP' AND e."referenceId"=t."id"::text AND a."status"='ACTIVE'),TIMESTAMP '1970-01-01'),
        COALESCE((SELECT MAX(i."createdAt") FROM "CalendarAllocation" a JOIN "CalendarEvent" e ON e."id"=a."eventId" JOIN "EquipmentInspection" i ON i."resourceId"=a."resourceId" WHERE e."referenceType"='TRIP' AND e."referenceId"=t."id"::text AND a."status"='ACTIVE'),TIMESTAMP '1970-01-01'),
        COALESCE((SELECT MAX(w."updatedAt") FROM "TripWeatherReview" w WHERE w."tripId"=t."id"),TIMESTAMP '1970-01-01'),
        COALESCE((SELECT l."updatedAt" FROM "TripOperationalLocation" l WHERE l."tripId"=t."id"),TIMESTAMP '1970-01-01'),
        COALESCE((SELECT MAX(s."updatedAt") FROM "SafetyChecklist" s WHERE s."tripId"=t."id"),TIMESTAMP '1970-01-01'),
        COALESCE((SELECT MAX(c."updatedAt") FROM "CrewAssignment" c WHERE c."tripId"=t."id"),TIMESTAMP '1970-01-01'),
        COALESCE((SELECT MAX(a."updatedAt") FROM "CalendarAllocation" a JOIN "CalendarEvent" e ON e."id"=a."eventId" WHERE e."referenceType"='TRIP' AND e."referenceId"=t."id"::text),TIMESTAMP '1970-01-01'),
        COALESCE((SELECT MAX(b."updatedAt") FROM "Booking" b WHERE b."tripId"=t."id"),TIMESTAMP '1970-01-01'),
        COALESCE((SELECT r."updatedAt" FROM "TripComplianceReview" r WHERE r."tripId"=t."id" LIMIT 1),TIMESTAMP '1970-01-01'),
        COALESCE((SELECT MAX(brc."updatedAt") FROM "CalendarAllocation" a JOIN "CalendarEvent" e ON e."id"=a."eventId" JOIN "CalendarResource" cr ON cr."id"=a."resourceId" JOIN "BoatResourceCompliance" brc ON brc."resourceId"=cr."id" WHERE e."referenceType"='TRIP' AND e."referenceId"=t."id"::text AND a."status"='ACTIVE' AND cr."type"='BOAT'),TIMESTAMP '1970-01-01'),
        COALESCE((SELECT MAX(ma."updatedAt") FROM "CalendarAllocation" a JOIN "CalendarEvent" e ON e."id"=a."eventId" JOIN "MarineAsset" ma ON ma."calendarResourceId"=a."resourceId" WHERE e."referenceType"='TRIP' AND e."referenceId"=t."id"::text AND a."status"='ACTIVE'),TIMESTAMP '1970-01-01'),
        COALESCE((SELECT MAX(md."updatedAt") FROM "CalendarAllocation" a JOIN "CalendarEvent" e ON e."id"=a."eventId" JOIN "MarineAsset" ma ON ma."calendarResourceId"=a."resourceId" JOIN "MarineAssetDocument" md ON md."marineAssetId"=ma."id" WHERE e."referenceType"='TRIP' AND e."referenceId"=t."id"::text AND a."status"='ACTIVE'),TIMESTAMP '1970-01-01'),
        COALESCE((SELECT MAX(mm."updatedAt") FROM "CalendarAllocation" a JOIN "CalendarEvent" e ON e."id"=a."eventId" JOIN "MarineAsset" ma ON ma."calendarResourceId"=a."resourceId" JOIN "MarineMaintenanceRecord" mm ON mm."marineAssetId"=ma."id" WHERE e."referenceType"='TRIP' AND e."referenceId"=t."id"::text AND a."status"='ACTIVE'),TIMESTAMP '1970-01-01'),
        COALESCE((SELECT MAX(p."updatedAt") FROM "PolicyControl" p WHERE p."category" IN ('TRIP','CREW','WEATHER','BOAT','COMPLIANCE','BOOKING','EQUIPMENT','DIVE_LOG','MARINE')),TIMESTAMP '1970-01-01'),
        COALESCE((SELECT o."updatedAt" FROM "OperationalSetting" o WHERE o."key"='WEATHER_GATE' LIMIT 1),TIMESTAMP '1970-01-01')
      ) AS "changedAt"
      FROM "Trip" t WHERE t."id"=${tripId} LIMIT 1
    `;
    if(!rows.length)throw new NotFoundException('Trip not found.');return rows[0].changedAt;
  }

  async grant(reviewerAccountId:string,tripId:string,reason?:string){
    const observedChange=await this.latestOperationalChange(tripId);
    const readiness=await this.calendar.readinessForTrip(tripId);this.assertHardBlocks(readiness);
    if(readiness.status==='NOT_READY')throw new ConflictException(`Trip is NOT_READY: ${readiness.blockers.join(', ')}`);
    if(readiness.status==='REVIEW_REQUIRED'&&(!reason||reason.trim().length<10))throw new ConflictException('A documented review reason of at least 10 characters is required.');
    const action=readiness.status==='READY'?'OPERATIONAL_CLEARANCE_GRANTED':'OPERATIONAL_REVIEW_APPROVED';
    const event=await this.db.serializable(async tx=>{
      const trip=await tx.trip.findUnique({where:{id:tripId},select:{status:true}});
      if(!trip||['CANCELLED','COMPLETED'].includes(trip.status))throw new ConflictException('Terminal trips cannot receive operational clearance.');
      const current=await this.latestOperationalChange(tripId,tx);
      if(current?.getTime()!==observedChange?.getTime())throw new ConflictException('Operational state changed during review. Repeat the readiness review.');
      return this.audit.record({actorId:reviewerAccountId,action,resource:'Trip',resourceId:tripId,metadata:{reviewerAccountId,readiness,reason:reason?.trim()||null}},tx);
    });
    return {tripId,clearance:'GRANTED',readiness,auditEventId:event.id};
  }

  async currentStatus(tripId:string,tx:Prisma.TransactionClient=this.db){
    const latest=await this.latestEvent(tripId,tx);
    if(!latest)return {status:'MISSING',eventId:null};
    if(latest.action==='OPERATIONAL_CLEARANCE_REVOKED')return {status:'REVOKED',eventId:latest.id};
    const changedAt=await this.latestOperationalChange(tripId,tx);
    return {status:changedAt&&changedAt>latest.occurredAt?'STALE':'ACTIVE',eventId:latest.id};
  }

  async assertCurrent(tripId:string,eventId:string,tx:Prisma.TransactionClient){
    const current=await this.currentStatus(tripId,tx);
    if(current.status!=='ACTIVE'||current.eventId!==eventId)throw new ConflictException('تغيرت الجاهزية التشغيلية. يلزم إعادة مراجعة واعتماد التشغيل.');
  }

  async revokeIfStale(tripId:string){const latest=await this.latestEvent(tripId);if(!latest||latest.action==='OPERATIONAL_CLEARANCE_REVOKED')return {revoked:false,reason:'NO_ACTIVE_CLEARANCE'};const changedAt=await this.latestOperationalChange(tripId);if(!changedAt||changedAt<=latest.occurredAt)return {revoked:false,reason:'CURRENT'};const event=await this.audit.record({action:'OPERATIONAL_CLEARANCE_REVOKED',resource:'Trip',resourceId:tripId,metadata:{previousClearanceEventId:latest.id,reason:'OPERATIONAL_STATE_CHANGED',changedAt}});return {revoked:true,auditEventId:event.id,previousClearanceEventId:latest.id,changedAt};}

  async status(tripId:string){await this.revokeIfStale(tripId);const latest=await this.latestEvent(tripId);if(!latest)return {status:'MISSING' as const,event:null};if(latest.action==='OPERATIONAL_CLEARANCE_REVOKED')return {status:'REVOKED' as const,event:latest};return {status:'ACTIVE' as const,event:latest,reviewRequired:latest.action==='OPERATIONAL_REVIEW_APPROVED'};}

  async assertValid(tripId:string){await this.revokeIfStale(tripId);const latest=await this.latestEvent(tripId);if(!latest||latest.action==='OPERATIONAL_CLEARANCE_REVOKED')throw new ConflictException('A current operational clearance is required.');const readiness=await this.calendar.readinessForTrip(tripId);this.assertHardBlocks(readiness);if(readiness.status==='NOT_READY')throw new ConflictException(`Trip is NOT_READY: ${readiness.blockers.join(', ')}`);if(readiness.status==='REVIEW_REQUIRED'&&latest.action!=='OPERATIONAL_REVIEW_APPROVED')throw new ConflictException('Current readiness requires documented administrative review approval.');return {clearance:latest,readiness};}
}