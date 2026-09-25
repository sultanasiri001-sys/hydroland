import {BadRequestException,Injectable,NotFoundException} from '@nestjs/common';
import {AuditService} from '../audit/audit.service';
import {DatabaseService} from '../database/database.service';

type IncidentSeverity='LOW'|'MEDIUM'|'HIGH'|'CRITICAL';
type IncidentStatus='OPEN'|'UNDER_REVIEW'|'RESOLVED'|'CLOSED';
const severities:IncidentSeverity[]=['LOW','MEDIUM','HIGH','CRITICAL'];
const statuses:IncidentStatus[]=['OPEN','UNDER_REVIEW','RESOLVED','CLOSED'];

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
 mine(accountId:string){
  return this.db.safetyIncident.findMany({where:{reportedByAccountId:accountId},include:{trip:{select:{id:true,title:true,status:true}}},orderBy:{createdAt:'desc'},take:100});
 }
 adminQueue(){
  return this.db.safetyIncident.findMany({include:{trip:{select:{id:true,title:true,status:true}},reportedBy:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}},resolvedBy:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}}},orderBy:[{status:'asc'},{createdAt:'desc'}],take:200});
 }
 async decide(adminAccountId:string,incidentId:string,input:{status:IncidentStatus;resolutionNotes?:string}){
  if(!statuses.includes(input.status)||input.status==='OPEN')throw new BadRequestException('Invalid incident status decision.');
  const incident=await this.db.safetyIncident.findUnique({where:{id:incidentId}});
  if(!incident)throw new NotFoundException('Safety incident not found.');
  const terminal=input.status==='RESOLVED'||input.status==='CLOSED';
  const notes=this.optional(input.resolutionNotes,5000);
  if(terminal&&!notes)throw new BadRequestException('Resolution notes are required to resolve or close an incident.');
  const updated=await this.db.safetyIncident.update({where:{id:incidentId},data:{status:input.status,resolutionNotes:notes??incident.resolutionNotes,resolvedByAccountId:terminal?adminAccountId:null,resolvedAt:terminal?new Date():null}});
  await this.audit.record({action:'SAFETY_INCIDENT_STATUS_SET',resource:'SafetyIncident',resourceId:incidentId,metadata:{adminAccountId,previousStatus:incident.status,status:input.status,terminal}});
  return updated;
 }
}