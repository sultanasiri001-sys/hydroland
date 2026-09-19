import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { MarineOperationsService } from '../marine-operations/marine-operations.service';
import { BoatComplianceService } from './boat-compliance.service';
import { EquipmentInspectionService } from './equipment-inspection.service';
import { PolicyControlService } from './policy-control.service';
import { TripComplianceService } from './trip-compliance.service';
import { WeatherGateService, WeatherSnapshot } from './weather-gate.service';

type ResourceRow={id:string;type:string;name:string;active:boolean};
type AllocationRow={id:string;tripId:string;resourceId:string;startsAt:Date;endsAt:Date;status:string};
type AllocationWithResourceRow=AllocationRow&{resourceType:string;resourceName:string};
type JsonLike=Record<string,unknown>|unknown[]|string|number|boolean|null;
type CalendarTripRow={id:string;title:string;type:string;startsAt:Date;endsAt:Date;capacity:number;status:string;bookings:Array<{seats:number}>;safetyChecklists:Array<{decision:string;items:JsonLike;notes:string|null;decidedAt:Date|null;createdAt:Date}>};
type CrewReadinessRow={id:string;tripId:string;accountId:string;resourceId:string;roleType:string;status:string;resourceName:string;firstName:string|null;lastName:string|null};
export type OperationalReadiness={status:'READY'|'REVIEW_REQUIRED'|'NOT_READY';checks:{crew:boolean;safety:boolean;weather:boolean;resources:boolean;boat:boolean;marine:boolean;equipment:boolean;compliance:boolean};blockers:string[];missingResourceTypes:string[];policyReview?:{required:boolean;issues:string[];states:Record<string,string>}};

@Injectable()
export class CalendarAllocationService{
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly weatherGate:WeatherGateService,private readonly policies:PolicyControlService,private readonly boats:BoatComplianceService,private readonly equipment:EquipmentInspectionService,private readonly compliance:TripComplianceService,private readonly marine:MarineOperationsService){}
  resources(){return this.db.$queryRaw<ResourceRow[]>`SELECT "id","type","name","active" FROM "CalendarResource" ORDER BY "type","name"`;}
  tripAllocations(tripId:string){return this.db.$queryRaw<AllocationWithResourceRow[]>`SELECT a."id",a."tripId",a."resourceId",a."startsAt",a."endsAt",a."status",r."type" AS "resourceType",r."name" AS "resourceName" FROM "CalendarAllocation" a JOIN "CalendarResource" r ON r."id"=a."resourceId" WHERE a."tripId"=${tripId} AND a."status"='ACTIVE' ORDER BY r."type",r."name"`;}
  private weatherFromItems(items:JsonLike):WeatherSnapshot|null{if(!items||Array.isArray(items)||typeof items!=='object')return null;const weather=(items as Record<string,unknown>).weather;if(!weather||Array.isArray(weather)||typeof weather!=='object')return null;return weather as WeatherSnapshot;}
  private requiredResourceTypes(type:string){const normalized=type.toUpperCase();if(normalized.includes('BOAT'))return['BOAT'];if(normalized.includes('SHORE'))return['SITE'];return[];}

  async readinessForTrip(tripId:string):Promise<OperationalReadiness>{const trip=await this.db.trip.findUnique({where:{id:tripId},select:{startsAt:true,endsAt:true}});if(!trip)throw new NotFoundException('Trip not found.');const from=new Date(trip.startsAt.getTime()-60000),to=new Date(trip.endsAt.getTime()+60000),rows=await this.calendar(from.toISOString(),to.toISOString()),row=rows.find((item:{id:string;readiness:OperationalReadiness})=>item.id===tripId);if(!row)throw new NotFoundException('Trip readiness unavailable.');return row.readiness;}

  async calendar(fromRaw:string,toRaw:string){
    const from=new Date(fromRaw),to=new Date(toRaw);if(Number.isNaN(from.getTime())||Number.isNaN(to.getTime())||to<=from)throw new BadRequestException('Invalid calendar date range.');
    const [gate,resourcePolicy,crewPolicy,safetyPolicy,weatherPolicy]=await Promise.all([this.weatherGate.settings(),this.policies.decision('TRIP','RESOURCE_READINESS'),this.policies.decision('CREW','RESPONSE_REQUIRED'),this.policies.decision('TRIP','SAFETY_CLEARANCE'),this.policies.decision('WEATHER','WEATHER_GATE')]);
    const trips=(await this.db.trip.findMany({where:{startsAt:{lt:to},endsAt:{gt:from}},orderBy:{startsAt:'asc'},include:{bookings:{where:{status:{in:['PENDING','CONFIRMED']}},select:{seats:true}},safetyChecklists:{orderBy:{createdAt:'desc'},take:1,select:{decision:true,items:true,notes:true,decidedAt:true,createdAt:true}}}})) as CalendarTripRow[];
    const allocations=await this.db.$queryRaw<AllocationWithResourceRow[]>`SELECT a."id",a."tripId",a."resourceId",a."startsAt",a."endsAt",a."status",r."type" AS "resourceType",r."name" AS "resourceName" FROM "CalendarAllocation" a JOIN "CalendarResource" r ON r."id"=a."resourceId" WHERE a."startsAt"<${to} AND a."endsAt">${from} AND a."status"='ACTIVE' ORDER BY a."startsAt"`;
    const crew=await this.db.$queryRaw<CrewReadinessRow[]>`SELECT ca."id",ca."tripId",ca."accountId",ca."resourceId",ca."roleType",ca."status",r."name" AS "resourceName",p."firstName",p."lastName" FROM "CrewAssignment" ca JOIN "Trip" t ON t."id"=ca."tripId" JOIN "CalendarResource" r ON r."id"=ca."resourceId" LEFT JOIN "Account" ac ON ac."id"=ca."accountId" LEFT JOIN "Person" p ON p."id"=ac."personId" WHERE t."startsAt"<${to} AND t."endsAt">${from} AND NOT EXISTS(SELECT 1 FROM "CrewAssignment" child WHERE child."replacesAssignmentId"=ca."id") ORDER BY ca."createdAt"`;
    return Promise.all(trips.map(async(trip:CalendarTripRow)=>{
      const bookedSeats=trip.bookings.reduce((sum:number,b:{seats:number})=>sum+b.seats,0),latestSafety=trip.safetyChecklists[0]??null,snapshot=latestSafety?this.weatherFromItems(latestSafety.items):null,weather=this.weatherGate.evaluate(snapshot,gate),tripCrew=crew.filter((m:CrewReadinessRow)=>m.tripId===trip.id),tripResources=allocations.filter((a:AllocationWithResourceRow)=>a.tripId===trip.id);
      const crewSummary={total:tripCrew.length,accepted:tripCrew.filter((m:CrewReadinessRow)=>m.status==='ACCEPTED').length,pending:tripCrew.filter((m:CrewReadinessRow)=>m.status==='PENDING').length,rejected:tripCrew.filter((m:CrewReadinessRow)=>m.status==='REJECTED').length,replacementRequired:tripCrew.filter((m:CrewReadinessRow)=>m.status==='REJECTED'||m.status==='REASSIGNED').length,ready:tripCrew.length>0&&tripCrew.every((m:CrewReadinessRow)=>m.status==='ACCEPTED')};
      const required=this.requiredResourceTypes(trip.type),allocatedTypes=new Set(tripResources.map((r:AllocationWithResourceRow)=>r.resourceType)),missing=required.filter((type:string)=>!allocatedTypes.has(type)),boatIds=tripResources.filter((r:AllocationWithResourceRow)=>r.resourceType==='BOAT').map((r:AllocationWithResourceRow)=>r.resourceId),equipmentIds=tripResources.filter((r:AllocationWithResourceRow)=>r.resourceType==='EQUIPMENT').map((r:AllocationWithResourceRow)=>r.resourceId),boatRequired=trip.type.toUpperCase().includes('BOAT'),boatCompliance=boatRequired?await this.boats.evaluate(boatIds,bookedSeats):{ready:true,blocked:false,reviewRequired:false,issues:[] as string[],states:{}};
      const marineResults=boatRequired?await Promise.all(boatIds.map(id=>this.marine.readinessForCalendarResource(id,trip.id))):[],marineReady=marineResults.every(r=>r.status!=='NOT_READY'),marineReview=marineResults.flatMap(r=>r.status==='NEEDS_REVIEW'?r.reasonCodes:[]),equipmentReadiness=await this.equipment.evaluate(equipmentIds),tripCompliance=await this.compliance.get(trip.id),complianceReview=tripCompliance.policyReview;
      const raw={crew:crewSummary.ready,safety:latestSafety?.decision==='ALLOWED',weather:weather.decision==='ALLOWED'||(!gate.enabled&&weather.decision!=='DEFERRED'),resources:required.length===0||missing.length===0,boat:!boatCompliance.blocked,marine:marineReady,equipment:!equipmentReadiness.blocked,compliance:!complianceReview.blocked};
      const issues:string[]=[...marineReview,...(boatCompliance.reviewRequired?boatCompliance.issues:[]),...(equipmentReadiness.reviewRequired?equipmentReadiness.issues:[]),...(complianceReview.required?complianceReview.issues:[])];
      const apply=(name:'crew'|'safety'|'weather'|'resources',ok:boolean,policy:{enforce:boolean;review:boolean;bypass:boolean})=>{if(ok||policy.bypass)return true;if(policy.review){issues.push(String(name).toUpperCase());return true;}return false;};
      const checks={crew:apply('crew',raw.crew,crewPolicy),safety:apply('safety',raw.safety,safetyPolicy),weather:apply('weather',raw.weather,weatherPolicy),resources:apply('resources',raw.resources,resourcePolicy),boat:raw.boat,equipment:raw.equipment,compliance:raw.compliance};
      const blockers=Object.entries(checks).filter((entry:[string,boolean])=>!entry[1]).map((entry:[string,boolean])=>entry[0]),hardDeferred=(latestSafety?.decision==='DEFERRED'&&safetyPolicy.enforce)||(weather.decision==='DEFERRED'&&weatherPolicy.enforce),readinessStatus:OperationalReadiness['status']=blockers.length?'NOT_READY':issues.length||hardDeferred?'REVIEW_REQUIRED':'READY';
      const readiness:OperationalReadiness={status:readinessStatus,checks,blockers,missingResourceTypes:missing,policyReview:{required:issues.length>0,issues:[...new Set(issues)],states:{crew:crewPolicy.state,safety:safetyPolicy.state,weather:weatherPolicy.state,resources:resourcePolicy.state,...boatCompliance.states,equipmentInspection:equipmentReadiness.states.inspection,equipmentServiceExpiry:equipmentReadiness.states.serviceExpiry,complianceRegulatory:complianceReview.states.regulatory,compliancePermit:complianceReview.states.permit}}};
      return{id:trip.id,title:trip.title,type:trip.type,startsAt:trip.startsAt,endsAt:trip.endsAt,capacity:trip.capacity,status:trip.status,bookedSeats,remainingSeats:Math.max(0,trip.capacity-bookedSeats),safety:latestSafety,weather:{snapshot,gate,evaluation:weather},boatCompliance,equipmentReadiness,tripCompliance,readiness,crew:{summary:crewSummary,members:tripCrew.map((m:CrewReadinessRow)=>({assignmentId:m.id,accountId:m.accountId,resourceId:m.resourceId,roleType:m.roleType,status:m.status,name:[m.firstName,m.lastName].filter(Boolean).join(' ')||m.resourceName,resourceName:m.resourceName}))},resources:tripResources.map((a:AllocationWithResourceRow)=>({id:a.id,resourceId:a.resourceId,startsAt:a.startsAt,endsAt:a.endsAt,status:a.status,resource:{type:a.resourceType,name:a.resourceName}}))};
    }));
  }

  async assertResourcesAvailable(resourceIds:string[],startsAt:Date,endsAt:Date,excludeTripId?:string){for(const resourceId of resourceIds){const rows=await this.db.$queryRaw<Array<{id:string;tripId:string}>>`SELECT a."id",a."tripId" FROM "CalendarAllocation" a JOIN "CalendarResource" r ON r."id"=a."resourceId" WHERE a."resourceId"=${resourceId} AND r."active"=TRUE AND a."status"='ACTIVE' AND a."startsAt"<${endsAt} AND a."endsAt">${startsAt} AND (${excludeTripId??null}::text IS NULL OR a."tripId"<>${excludeTripId??null}) LIMIT 1`;if(rows.length)throw new ConflictException('Calendar resource conflict detected.');}}

  async allocate(actorAccountId:string,tripId:string,resourceIds:string[]){
    const unique=[...new Set(resourceIds.filter((id:string)=>Boolean(id)))];
    const result=await this.db.serializable(async tx=>{
      const trip=await tx.trip.findUnique({where:{id:tripId}});if(!trip)throw new NotFoundException('Trip not found.');
      const previous=await tx.$queryRaw<Array<{resourceId:string}>>`SELECT "resourceId" FROM "CalendarAllocation" WHERE "tripId"=${tripId} AND "status"='ACTIVE' ORDER BY "resourceId"`;
      if(unique.length){const valid=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "CalendarResource" WHERE "active"=TRUE AND "id"=ANY(${unique}::text[])`;if(valid.length!==unique.length)throw new BadRequestException('One or more calendar resources are invalid or inactive.');}
      for(const resourceId of unique){const conflicts=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "CalendarAllocation" WHERE "resourceId"=${resourceId} AND "status"='ACTIVE' AND "startsAt"<${trip.endsAt} AND "endsAt">${trip.startsAt} AND "tripId"<>${tripId} LIMIT 1`;if(conflicts.length)throw new ConflictException('Calendar resource conflict detected.');}
      await tx.$executeRaw`UPDATE "CalendarAllocation" SET "status"='INACTIVE',"updatedAt"=NOW() WHERE "tripId"=${tripId} AND "status"='ACTIVE'`;
      for(const resourceId of unique)await tx.$executeRaw`INSERT INTO "CalendarAllocation"("id","tripId","resourceId","startsAt","endsAt","status","createdAt","updatedAt") VALUES(gen_random_uuid()::text,${tripId},${resourceId},${trip.startsAt},${trip.endsAt},'ACTIVE',NOW(),NOW())`;
      return{previousResourceIds:previous.map((row:{resourceId:string})=>row.resourceId),newResourceIds:[...unique]};
    });
    const previousSet=new Set(result.previousResourceIds),nextSet=new Set(result.newResourceIds);
    const added=result.newResourceIds.filter((id:string)=>!previousSet.has(id)),removed=result.previousResourceIds.filter((id:string)=>!nextSet.has(id));
    await this.audit.record({action:'TRIP_CALENDAR_RESOURCES_CHANGED',resource:'Trip',resourceId:tripId,metadata:{actorAccountId,previousResourceIds:result.previousResourceIds,newResourceIds:result.newResourceIds,addedResourceIds:added,removedResourceIds:removed}});
    return this.tripAllocations(tripId);
  }
}
