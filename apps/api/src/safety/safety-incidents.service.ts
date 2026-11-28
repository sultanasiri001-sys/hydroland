import {BadRequestException,ConflictException,ForbiddenException,Injectable,NotFoundException} from '@nestjs/common';
import {AuditService} from '../audit/audit.service';
import {DatabaseService} from '../database/database.service';
import { lockAccountIdentities, requireVerifiedAdmin } from '../admin/admin-authorization';
import { evidenceDigest, evidenceId } from '../trips/trip-return.domain';
import { closureEvidence, incidentClosureContext, incidentDecision, incidentPack } from './safety-incident-closure';

type IncidentSeverity='LOW'|'MEDIUM'|'HIGH'|'CRITICAL';
const severities:IncidentSeverity[]=['LOW','MEDIUM','HIGH','CRITICAL'];

@Injectable()
export class SafetyIncidentsService{
 constructor(private readonly db:DatabaseService,private readonly audit:AuditService){}
 private clean(value:unknown,label:string,min:number,max:number){
  const text=typeof value==='string'?value.trim():'';
  if(text.length<min||text.length>max)throw new BadRequestException(label+' must be between '+min+' and '+max+' characters.');
  return text;
 }
 private optional(value:unknown,max:number){
  if(value===undefined||value===null)return null;
  const text=typeof value==='string'?value.trim():'';
  if(!text)return null;
  if(text.length>max)throw new BadRequestException('Value is too long.');
  return text;
 }
 async create(accountId:string,input:{tripId?:string;severity:IncidentSeverity;title:string;description:string;locationName?:string}){
  if(!severities.includes(input.severity))throw new BadRequestException('Invalid incident severity.');
  if(input.tripId){const trip=await this.db.trip.findUnique({where:{id:input.tripId},select:{id:true}});if(!trip)throw new NotFoundException('Trip not found.');}
  const incident=await this.db.safetyIncident.create({data:{tripId:input.tripId||null,reportedByAccountId:accountId,severity:input.severity,title:this.clean(input.title,'Incident title',3,160),description:this.clean(input.description,'Incident description',3,5000),locationName:this.optional(input.locationName,160)}});
  await this.audit.record({action:'SAFETY_INCIDENT_REPORTED',resource:'SafetyIncident',resourceId:incident.id,metadata:{accountId,tripId:incident.tripId,severity:incident.severity}});
  return incident;
 }

 async listForOrganization(accountId:string,organizationId:string){
  return this.db.serializable(async tx=>{
   const membership=await tx.organizationMember.findFirst({where:{organizationId,accountId,status:'ACTIVE',role:{in:['OWNER','ADMIN','OPERATOR','STAFF']},organization:{status:'ACTIVE'}},select:{id:true}});
   if(!membership)throw new ForbiddenException('تتطلب العملية دور تشغيل نشطًا في الجهة.');
   return tx.safetyIncident.findMany({where:{booking:{organizationId}},select:{id:true,bookingId:true,tripId:true,severity:true,title:true,description:true,locationName:true,status:true,createdAt:true,updatedAt:true,trip:{select:{id:true,title:true,startsAt:true,status:true}}},orderBy:[{createdAt:'desc'},{id:'asc'}],take:100});
  });
 }

 async createForOrganization(accountId:string,organizationId:string,input:{bookingId:string;severity:IncidentSeverity;title:string;description:string;locationName?:string}){
  if(!severities.includes(input.severity))throw new BadRequestException('Invalid incident severity.');
  return this.db.serializable(async tx=>{
   const membership=await tx.organizationMember.findFirst({where:{organizationId,accountId,status:'ACTIVE',role:{in:['OWNER','ADMIN','OPERATOR','STAFF']},organization:{status:'ACTIVE'},account:{status:'ACTIVE'}},select:{id:true}});
   if(!membership)throw new ForbiddenException('تتطلب العملية عضوية نشطة تملك صلاحية الإبلاغ.');
   const booking=await tx.booking.findFirst({where:{id:input.bookingId,organizationId},select:{id:true,tripId:true}});
   if(!booking)throw new NotFoundException('الحجز غير موجود ضمن هذه الجهة.');
   const incident=await tx.safetyIncident.create({data:{bookingId:booking.id,tripId:booking.tripId,reportedByAccountId:accountId,severity:input.severity,title:this.clean(input.title,'Incident title',3,160),description:this.clean(input.description,'Incident description',3,5000),locationName:this.optional(input.locationName,160)},select:{id:true,bookingId:true,tripId:true,severity:true,title:true,description:true,locationName:true,status:true,createdAt:true,updatedAt:true}});
   await this.audit.record({actorId:accountId,action:'organization.safety_incident.reported',resource:'SafetyIncident',resourceId:incident.id,metadata:{organizationId,bookingId:booking.id,tripId:booking.tripId,severity:incident.severity}},tx);
   return incident;
  });
 }
 mine(accountId:string){
  return this.db.safetyIncident.findMany({where:{reportedByAccountId:accountId},include:{trip:{select:{id:true,title:true,status:true}}},orderBy:{createdAt:'desc'},take:100});
 }
 adminQueue(){
  return this.db.safetyIncident.findMany({include:{trip:{select:{id:true,title:true,status:true}},reportedBy:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}},resolvedBy:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}}},orderBy:[{status:'asc'},{createdAt:'desc'}],take:200});
 }
 closureContext(actor:string,id:string){return this.db.serializable(tx=>incidentClosureContext(tx,actor,id));}
 pack(actor:string,id:string){return this.db.serializable(tx=>incidentPack(tx,actor,id));}
 async decide(adminAccountId:string,incidentId:string,input:unknown){
  evidenceId(incidentId);const command=incidentDecision(input),fingerprint=evidenceDigest({adminAccountId,incidentId,command});
  return this.db.serializable(async tx=>{
   await lockAccountIdentities(tx,[adminAccountId]);await requireVerifiedAdmin(tx,adminAccountId);
   await tx.$queryRaw`SELECT "id" FROM "SafetyIncident" WHERE "id"::text=${incidentId} FOR UPDATE`;
   const incident=await tx.safetyIncident.findUnique({where:{id:incidentId}});
   if(!incident)throw new NotFoundException('Safety incident not found.');
   const prior=await tx.auditEvent.findFirst({where:{action:'SAFETY_INCIDENT_STATUS_SET',resource:'SafetyIncident',resourceId:incidentId,metadata:{path:['requestId'],equals:command.requestId}},select:{metadata:true}});
   if(prior){const saved=prior.metadata as Record<string,any>;if(saved.fingerprint!==fingerprint)throw new ConflictException('استُخدم طلب القرار نفسه ببيانات مختلفة.');return{...saved.result,alreadyApplied:true};}
   if(incident.status==='CLOSED'||incident.updatedAt.getTime()!==Date.parse(command.expectedUpdatedAt))throw new ConflictException('تغير البلاغ أو أُغلق؛ حدّث التفاصيل قبل القرار.');
   const closure=await closureEvidence(tx,adminAccountId,incident,command),updatedAt=new Date(Math.max(Date.now(),incident.updatedAt.getTime()+1));
   const updated=await tx.safetyIncident.update({where:{id:incidentId},data:{status:command.status,resolutionNotes:command.resolutionNotes??incident.resolutionNotes,resolvedByAccountId:command.terminal?adminAccountId:null,resolvedAt:command.terminal?updatedAt:null,updatedAt}});
   const result={id:updated.id,tripId:updated.tripId,status:updated.status,updatedAt:updatedAt.toISOString(),resolvedByAccountId:updated.resolvedByAccountId,resolvedAt:updated.resolvedAt?.toISOString()??null,closure,alreadyApplied:false};
   await this.audit.record({actorId:adminAccountId,action:'SAFETY_INCIDENT_STATUS_SET',resource:'SafetyIncident',resourceId:incidentId,metadata:{requestId:command.requestId,fingerprint,adminAccountId,previousStatus:incident.status,status:command.status,terminal:command.terminal,resolutionNotes:command.resolutionNotes,result}},tx);
   return result;
  });
 }
}
