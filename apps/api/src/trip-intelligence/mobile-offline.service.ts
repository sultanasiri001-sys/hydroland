import {BadRequestException,ConflictException,ForbiddenException,Injectable,UnauthorizedException} from '@nestjs/common';
import {Prisma} from '@prisma/client';
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {AuthService,ACCESS_TOKEN_TTL_SECONDS} from '../auth/auth.service';
import {AuditService} from '../audit/audit.service';
import {DatabaseService} from '../database/database.service';
import {OfflineTripAuthorizationService,OfflineTripReader} from './offline-trip-authorization.service';
import {TripIntelligenceService} from './trip-intelligence.service';

type Tx=Prisma.TransactionClient;
const stable=(v:unknown):string=>Array.isArray(v)?'['+v.map(stable).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable((v as Record<string,unknown>)[k])).join(',')+'}':JSON.stringify(v);
const hash=(v:unknown)=>createHash('sha256').update(stable(v)).digest('hex');
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const id=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=160;
const authors=['ADMIN','REVIEWER','INSTRUCTOR','DIVE_CENTER','STAFF'] as const;
type LeaseClaims={version:1;accountId:string;sessionId:string;tripId:string;resourceKind:'PACKAGE'|'DRAFT'|'DRAFTS';resourceId:string;sourceRevision:string;issuedAt:string;expiresAt:string};
type Draft={id:string;tripId:string;version:number;status:string;title:string|null;summary:Prisma.JsonValue;updatedAt:Date;createdByAccountId:string};
type Operation={operationId:string;kind:string;tripId?:unknown;briefingId?:unknown;expectedRevision?:unknown;patch?:unknown;leaseToken?:unknown};
const revision=(row:Draft)=>hash({id:row.id,status:row.status,version:row.version,title:row.title,summary:row.summary,updatedAt:row.updatedAt.toISOString()});
const online=(operationId:string,reason:string)=>({operationId,status:'NEEDS_ONLINE_VERIFICATION',reason});

@Injectable()
export class MobileOfflineService{
 constructor(private readonly db:DatabaseService,private readonly auth:AuthService,private readonly audit:AuditService,private readonly access:OfflineTripAuthorizationService,private readonly trips:TripIntelligenceService){}
 private secret(){const key=process.env.JWT_SECRET;if(!key||key.length<32)throw new UnauthorizedException('Offline verification unavailable.');return key}
 private signature(payload:string){return createHmac('sha256',this.secret()).update('hydroland-offline-access-v1.'+payload).digest('base64url')}
 private async lease(reader:OfflineTripReader,bearer:string,tripId:string,resourceKind:LeaseClaims['resourceKind'],resourceId:string,sourceRevision:string){
  const checked=this.auth.verifyAccessToken(bearer);if(checked.accountId!==reader.accountId||checked.sessionId!==reader.sessionId)throw new UnauthorizedException('Active session required.');
  // exp is read only after native signature/expiry verification, never from a client claim.
  const exp=JSON.parse(Buffer.from(bearer.split('.')[1],'base64url').toString()).exp as number;
  const session=await this.db.session.findFirst({where:{id:reader.sessionId,accountId:reader.accountId,revokedAt:null},select:{expiresAt:true}});
  const now=Date.now(),end=Math.min(exp*1000,session?.expiresAt.getTime()??0,now+ACCESS_TOKEN_TTL_SECONDS*1000);
  if(end<=now)throw new UnauthorizedException('Active session required.');
  const claims:LeaseClaims={version:1,...reader,tripId,resourceKind,resourceId,sourceRevision,issuedAt:new Date(now).toISOString(),expiresAt:new Date(end).toISOString()};
  const payload=Buffer.from(stable(claims)).toString('base64url');return{...claims,token:payload+'.'+this.signature(payload)};
 }
 private verifyLease(value:unknown,reader:OfflineTripReader,tripId:string,briefingId:string):LeaseClaims|null{
  if(typeof value!=='string'||value.length>4096)return null;const parts=value.split('.');if(parts.length!==2)return null;
  const expected=this.signature(parts[0]);if(parts[1].length!==expected.length||!timingSafeEqual(Buffer.from(parts[1]),Buffer.from(expected)))return null;
  try{const c=JSON.parse(Buffer.from(parts[0],'base64url').toString()) as LeaseClaims;const issued=Date.parse(c.issuedAt),end=Date.parse(c.expiresAt),now=Date.now();
   return c.version===1&&c.accountId===reader.accountId&&c.sessionId===reader.sessionId&&c.tripId===tripId&&c.resourceKind==='DRAFT'&&c.resourceId===briefingId&&typeof c.sourceRevision==='string'&&Number.isFinite(issued)&&issued<=now&&end>now&&end-issued<=ACCESS_TOKEN_TTL_SECONDS*1000?c:null;
  }catch{return null}
 }
 async packageStatus(reader:OfflineTripReader,bearer:string,tripId:string){
  return this.access.read(reader,tripId,async()=>{const status=await this.trips.packageStatus(reader,tripId);if(status.status!=='READY'||!status.checksum)return status;
   const current=await this.trips.packageContent(reader,tripId);return{tripId,status:'READY',briefingVersion:current.briefingVersion,checksum:current.checksum,generatedAt:current.generatedAt,accessLease:await this.lease(reader,bearer,tripId,'PACKAGE',tripId,current.checksum!)};});
 }
 async packageContent(reader:OfflineTripReader,bearer:string,tripId:string){return this.access.read(reader,tripId,async()=>{
  const content=await this.trips.packageContent(reader,tripId);
  const briefing=await this.db.tripBriefing.findFirst({where:{tripId,version:content.briefingVersion,status:'PUBLISHED'},select:{title:true,summary:true}});
  if(!briefing)throw new ForbiddenException('Offline source is unavailable.');
  return{...content,briefing,accessLease:await this.lease(reader,bearer,tripId,'PACKAGE',tripId,content.checksum!)};
 })}
 private async author(reader:OfflineTripReader,tx:Tx=this.db){if(!await tx.roleAssignment.findFirst({where:{accountId:reader.accountId,status:'ACTIVE',role:{in:[...authors]}},select:{id:true}}))throw new ForbiddenException('Trip draft author required.')}
 async drafts(reader:OfflineTripReader,bearer:string,tripId:string){return this.access.read(reader,tripId,async()=>{
  await this.author(reader);const rows=await this.db.tripBriefing.findMany({where:{tripId,createdByAccountId:reader.accountId,status:'DRAFT'},orderBy:{version:'desc'},take:20});
  const items=await Promise.all(rows.map(async row=>({...this.publicDraft(row),accessLease:await this.lease(reader,bearer,tripId,'DRAFT',row.id,revision(row))})));
  const accessLease=await this.lease(reader,bearer,tripId,'DRAFTS',tripId,hash(items.map(row=>({id:row.id,revision:row.revision}))));await this.author(reader);return{tripId,items,accessLease};
 })}
 async draft(reader:OfflineTripReader,bearer:string,tripId:string,briefingId:string){return this.access.read(reader,tripId,async()=>{
  await this.author(reader);const row=await this.db.tripBriefing.findFirst({where:{id:briefingId,tripId,createdByAccountId:reader.accountId,status:'DRAFT'}});if(!row)throw new ForbiddenException('Draft is unavailable.');
  const accessLease=await this.lease(reader,bearer,tripId,'DRAFT',row.id,revision(row));await this.author(reader);return{...this.publicDraft(row),accessLease};
 })}
 private publicDraft(row:Draft){return{id:row.id,tripId:row.tripId,version:row.version,title:row.title,summary:row.summary,revision:revision(row),status:'DRAFT'}}
 private async lock(reader:OfflineTripReader,tripIds:string[],tx:Tx){
  await tx.$queryRaw`SELECT id FROM "Account" WHERE id::text=${reader.accountId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "Session" WHERE id::text=${reader.sessionId} FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "RoleAssignment" WHERE "accountId"::text=${reader.accountId} ORDER BY id FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "OrganizationMember" WHERE "accountId"::text=${reader.accountId} ORDER BY id FOR SHARE`;
  await tx.$queryRaw`SELECT o.id FROM "Organization" o JOIN "OrganizationMember" m ON m."organizationId"=o.id WHERE m."accountId"::text=${reader.accountId} ORDER BY o.id FOR SHARE OF o`;
  for(const tripId of [...new Set(tripIds)].sort()){await tx.$queryRaw`SELECT id FROM "Trip" WHERE id::text=${tripId} FOR SHARE`;await this.access.assertAccess(reader,tripId,tx)}
  await this.author(reader,tx);
 }
 async sync(reader:OfflineTripReader,input:unknown){
  if(!object(input)||Object.keys(input).some(k=>k!=='operations')||!Array.isArray(input.operations)||input.operations.length<1||input.operations.length>20||Buffer.byteLength(JSON.stringify(input))>65536)throw new BadRequestException('A bounded operations batch is required.');
  const operations=input.operations as Operation[];
  if(operations.some(op=>!object(op)||typeof op.operationId!=='string'||!/^[A-Za-z0-9:_-]{16,100}$/.test(op.operationId)||typeof op.kind!=='string')||new Set(operations.map(op=>op.operationId)).size!==operations.length)throw new BadRequestException('Unique operation IDs are required.');
  const valid=operations.filter(op=>op.kind==='PATCH_BRIEFING_DRAFT'&&id(op.tripId)&&id(op.briefingId));
  if(!valid.length)return{results:operations.map(op=>online(op.operationId,'CRITICAL_OR_UNSUPPORTED_OPERATION'))};
  return this.db.serializable(async tx=>{
   await this.lock(reader,valid.map(op=>op.tripId as string),tx);const results:Record<string,unknown>[]=[],acceptedLeases:LeaseClaims[]=[];
   for(const op of operations){
    if(!valid.includes(op)){results.push(online(op.operationId,'CRITICAL_OR_UNSUPPORTED_OPERATION'));continue}
    const patch=op.patch;
    if(Object.keys(op).some(k=>!['operationId','kind','tripId','briefingId','expectedRevision','patch','leaseToken'].includes(k))||!object(patch)||Object.keys(patch).some(k=>!['title','summary'].includes(k))||typeof patch.title!=='string'||patch.title.length<1||patch.title.length>200||!object(patch.summary)||Object.keys(patch.summary).some(k=>k!=='notes')||typeof patch.summary.notes!=='string'||patch.summary.notes.length>4000||typeof op.expectedRevision!=='string'||!/^[a-f0-9]{64}$/.test(op.expectedRevision)){results.push(online(op.operationId,'UNSUPPORTED_DRAFT_FIELDS'));continue}
    await tx.$queryRaw`SELECT id FROM "TripBriefing" WHERE id::text=${op.briefingId as string} FOR UPDATE`;
    const row=await tx.tripBriefing.findFirst({where:{id:op.briefingId as string,tripId:op.tripId as string,createdByAccountId:reader.accountId}});
    if(!row)throw new ForbiddenException('Draft is unavailable.');
    const lease=this.verifyLease(op.leaseToken,reader,row.tripId,row.id);if(!lease){results.push(online(op.operationId,'EXPIRED_OR_INVALID_SOURCE'));continue}acceptedLeases.push(lease);
    const fingerprint=hash({kind:op.kind,tripId:op.tripId,briefingId:op.briefingId,expectedRevision:op.expectedRevision,patch});
    const [receipt]=await tx.$queryRaw<Array<{fingerprint:string;result:Prisma.JsonObject}>>`SELECT fingerprint,result FROM "MobileOfflineMutation" WHERE "accountId"::text=${reader.accountId} AND "operationId"=${op.operationId}`;
    if(receipt){results.push(receipt.fingerprint===fingerprint?{...receipt.result,replayed:true}:online(op.operationId,'IDEMPOTENCY_KEY_REUSE'));continue}
    if(row.status!=='DRAFT'){results.push(online(op.operationId,'DRAFT_NO_LONGER_EDITABLE'));continue}
    if(row.summary!==null&&(!object(row.summary)||Object.keys(row.summary).some(k=>k!=='notes')||(row.summary.notes!==undefined&&typeof row.summary.notes!=='string'))){results.push(online(op.operationId,'STRUCTURED_SUMMARY_REQUIRES_ONLINE_EDITOR'));continue}
    let result:Record<string,unknown>;
    if(revision(row)!==op.expectedRevision||lease.sourceRevision!==revision(row)){result={operationId:op.operationId,status:'CONFLICT',briefingId:row.id,currentRevision:revision(row)};}
    else{
     const updated=await tx.tripBriefing.update({where:{id:row.id},data:{title:patch.title,summary:{notes:patch.summary.notes},updatedAt:new Date(Math.max(Date.now(),row.updatedAt.getTime()+1))}});
     result={operationId:op.operationId,status:'APPLIED',briefingId:row.id,revision:revision(updated)};
     await this.audit.record({actorId:reader.accountId,action:'MOBILE_OFFLINE_DRAFT_APPLIED',resource:'TripBriefing',resourceId:row.id,metadata:{operationId:op.operationId,baseRevision:op.expectedRevision,revision:result.revision}},tx);
    }
    await tx.$executeRaw`INSERT INTO "MobileOfflineMutation" ("accountId","briefingId","operationId",fingerprint,result) SELECT a.id,b.id,${op.operationId},${fingerprint},${JSON.stringify(result)}::jsonb FROM "Account" a,"TripBriefing" b WHERE a.id::text=${reader.accountId} AND b.id::text=${row.id}`;
    results.push(result);
   }
   for(const tripId of [...new Set(valid.map(op=>op.tripId as string))])await this.access.assertAccess(reader,tripId,tx);
   if(acceptedLeases.some(lease=>Date.parse(lease.expiresAt)<=Date.now()))throw new ConflictException({code:'NEEDS_ONLINE_VERIFICATION',message:'Source authorization expired before batch completion.'});
   return{results};
  });
 }
}
