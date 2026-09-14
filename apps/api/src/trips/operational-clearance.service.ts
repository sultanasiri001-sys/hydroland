import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { CalendarAllocationService } from './calendar-allocation.service';

type ClearanceEvent = { id:string; action:string; occurredAt:Date };
type ChangeRow = { changedAt: Date | null };

@Injectable()
export class OperationalClearanceService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly calendar:CalendarAllocationService) {}

  private async latestEvent(tripId:string){return this.db.auditEvent.findFirst({where:{resource:'Trip',resourceId:tripId,action:{in:['OPERATIONAL_CLEARANCE_GRANTED','OPERATIONAL_REVIEW_APPROVED','OPERATIONAL_CLEARANCE_REVOKED']}},orderBy:{occurredAt:'desc'},select:{id:true,action:true,occurredAt:true}}) as Promise<ClearanceEvent|null>;}
  private async latestOperationalChange(tripId:string){const rows=await this.db.$queryRaw<ChangeRow[]>`SELECT GREATEST(t."updatedAt",COALESCE((SELECT MAX(s."updatedAt") FROM "SafetyChecklist" s WHERE s."tripId"=t."id"),TIMESTAMP '1970-01-01'),COALESCE((SELECT MAX(c."updatedAt") FROM "CrewAssignment" c WHERE c."tripId"=t."id"),TIMESTAMP '1970-01-01'),COALESCE((SELECT MAX(a."updatedAt") FROM "CalendarAllocation" a WHERE a."tripId"=t."id"),TIMESTAMP '1970-01-01'),COALESCE((SELECT o."updatedAt" FROM "OperationalSetting" o WHERE o."key"='WEATHER_GATE' LIMIT 1),TIMESTAMP '1970-01-01')) AS "changedAt" FROM "Trip" t WHERE t."id"=${tripId} LIMIT 1`;if(!rows.length)throw new NotFoundException('Trip not found.');return rows[0].changedAt;}

  async grant(reviewerAccountId:string,tripId:string,reason?:string){const readiness=await this.calendar.readinessForTrip(tripId);if(readiness.status==='NOT_READY')throw new ConflictException(`Trip is NOT_READY: ${readiness.blockers.join(', ')}`);if(readiness.status==='REVIEW_REQUIRED'&&(!reason||reason.trim().length<10))throw new ConflictException('A documented review reason of at least 10 characters is required.');const action=readiness.status==='READY'?'OPERATIONAL_CLEARANCE_GRANTED':'OPERATIONAL_REVIEW_APPROVED';const event=await this.audit.record({action,resource:'Trip',resourceId:tripId,metadata:{reviewerAccountId,readiness,reason:reason?.trim()||null}});return {tripId,clearance:'GRANTED',readiness,auditEventId:event.id};}

  async revokeIfStale(tripId:string){const latest=await this.latestEvent(tripId);if(!latest||latest.action==='OPERATIONAL_CLEARANCE_REVOKED')return {revoked:false,reason:'NO_ACTIVE_CLEARANCE'};const changedAt=await this.latestOperationalChange(tripId);if(!changedAt||changedAt<=latest.occurredAt)return {revoked:false,reason:'CURRENT'};const event=await this.audit.record({action:'OPERATIONAL_CLEARANCE_REVOKED',resource:'Trip',resourceId:tripId,metadata:{previousClearanceEventId:latest.id,reason:'OPERATIONAL_STATE_CHANGED',changedAt}});return {revoked:true,auditEventId:event.id,previousClearanceEventId:latest.id,changedAt};}

  async status(tripId:string){await this.revokeIfStale(tripId);const latest=await this.latestEvent(tripId);if(!latest)return {status:'MISSING' as const,event:null};if(latest.action==='OPERATIONAL_CLEARANCE_REVOKED')return {status:'REVOKED' as const,event:latest};return {status:'ACTIVE' as const,event:latest,reviewRequired:latest.action==='OPERATIONAL_REVIEW_APPROVED'};}

  async assertValid(tripId:string){await this.revokeIfStale(tripId);const latest=await this.latestEvent(tripId);if(!latest||latest.action==='OPERATIONAL_CLEARANCE_REVOKED')throw new ConflictException('A current operational clearance is required.');const readiness=await this.calendar.readinessForTrip(tripId);if(readiness.status==='NOT_READY')throw new ConflictException(`Trip is NOT_READY: ${readiness.blockers.join(', ')}`);if(readiness.status==='REVIEW_REQUIRED'&&latest.action!=='OPERATIONAL_REVIEW_APPROVED')throw new ConflictException('Current readiness requires documented administrative review approval.');return {clearance:latest,readiness};}
}