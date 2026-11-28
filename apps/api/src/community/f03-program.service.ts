import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { lockAccountIdentities, requireVerifiedAdmin } from '../admin/admin-authorization';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { DocumentPersistenceService } from '../document-forms/document-persistence.service';
import { reviewSource } from '../document-forms/internal-document-review.domain';
import { decisionDigest } from '../document-forms/owner-administrative-decision.domain';
import { validateDocumentPayload } from '../document-forms/document-payload';
import { PLATFORM_STAFFING_KEY, platformOrganization } from '../hr/staffing-catalog';
import { COMMUNITY_POLICY_KEY, CommunityPolicyService } from './community-policy.service';
import { F03Activity, F03_TEMPLATE, f03ActivityEnabled, f03Consent, f03Fields, f03Hash, f03Object, f03Payload } from './f03-program.domain';

export type F03ProgramRow={id:string;documentId:string;organizationId:string;version:number;contentHash:string;sourceHash:string;ownerAccountId:string;adoptedByAccountId:string;adoptedAt:Date;state:string};
@Injectable()
export class F03ProgramService {
  constructor(private readonly db:DatabaseService,private readonly documents:DocumentPersistenceService,private readonly audit:AuditService,private readonly policy:CommunityPolicyService){}
  async serial<T>(actor:string,work:(tx:Prisma.TransactionClient)=>Promise<T>){for(let attempt=0;attempt<3;attempt++){try{return await this.db.serializable(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('HYDROLAND_F03_PROGRAM_COMMANDS',0))`;
    await this.account(tx,actor);return work(tx);
  });}catch(error){const e=error as {code?:string;meta?:{code?:string}};if(e.code!=='P2010'||e.meta?.code!=='23505')throw error;if(attempt===2)throw new ConflictException('A concurrent program action already exists.');}}throw new ConflictException('Retry the program action.');}
  async account(tx:Prisma.TransactionClient,actor:string){
    await lockAccountIdentities(tx,[actor]);
    const account=await tx.account.findFirst({where:{id:actor,status:'ACTIVE',emailVerifiedAt:{not:null}},select:{id:true,personId:true}});
    if(!account)throw new ForbiddenException('An active verified account is required.');return account;
  }
  private async owner(tx:Prisma.TransactionClient,actor:string){await requireVerifiedAdmin(tx,actor);const platform=await platformOrganization(tx);if(!platform||platform.ownerId!==actor)throw new ForbiddenException('The platform owner is required.');return platform;}
  async authoring(actor:string){const platform=await this.owner(this.db,actor),people=await this.db.account.findMany({where:{status:'ACTIVE',emailVerifiedAt:{not:null},roleAssignments:{some:{role:'ADMIN',status:'ACTIVE'}}},select:{id:true,person:{select:{firstName:true,lastName:true}}},take:100});return {organizationId:platform.id,coordinators:people.map(p=>({id:p.id,label:(p.person.firstName+' '+p.person.lastName).trim()}))};}
  async draft(actor:string,value:unknown){
    const org=await this.owner(this.db,actor),payload=f03Payload(value);await requireVerifiedAdmin(this.db,payload.coordinatorAccountId);
    let template=await this.db.documentTemplate.findFirst({where:{organizationId:org.id,code:F03_TEMPLATE,status:'ACTIVE'},orderBy:{version:'desc'}});
    if(!template)template=await this.documents.createTemplate(actor,{organizationId:org.id,code:F03_TEMPLATE,titleAr:'برنامج الأكاديمية والبيئة والتطوع ومطابقة الزملاء',titleEn:'Academy, environment, volunteering and buddy program',department:'EXECUTIVE_GOVERNANCE',fields:f03Fields});
    if(decisionDigest(template.fields)!==decisionDigest(f03Fields))throw new ConflictException('The native program template changed.');
    validateDocumentPayload(template.fields,payload);
    const contentHash='sha256:'+f03Hash(payload),existing=await this.db.managedDocument.findFirst({where:{organizationId:org.id,templateId:template.id,createdByAccountId:actor,status:'DRAFT',contentHash}});
    const doc=existing??await this.documents.createDocument(actor,{organizationId:org.id,templateId:template.id,department:'EXECUTIVE_GOVERNANCE',contentHash,payload});
    return {organizationId:org.id,documentId:doc.id,referenceNumber:doc.referenceNumber,status:doc.status};
  }
  private async source(tx:Prisma.TransactionClient,documentId:string,locking=false){
    const org=await platformOrganization(tx);if(!org)throw new ConflictException('F03_PROGRAM_SOURCE_REQUIRED');
    if(locking){
      await tx.$queryRaw`SELECT key FROM "OperationalSetting" WHERE key=${PLATFORM_STAFFING_KEY} FOR SHARE`;
      await tx.$queryRaw`SELECT id FROM "Organization" WHERE id::text=${org.id} FOR SHARE`;
      await tx.$queryRaw`SELECT id FROM "ManagedDocument" WHERE id::text=${documentId} FOR SHARE`;
      await tx.$queryRaw`SELECT t.id FROM "DocumentTemplate" t JOIN "ManagedDocument" d ON d."templateId"=t.id WHERE d.id::text=${documentId} FOR SHARE OF t`;
      await tx.$queryRaw`SELECT id FROM "DocumentRevision" WHERE "documentId"::text=${documentId} FOR SHARE`;
      await tx.$queryRaw`SELECT id FROM "DocumentLifecycleEvent" WHERE "documentId"::text=${documentId} FOR SHARE`;
    }
    await requireVerifiedAdmin(tx,org.ownerId);
    const source=await reviewSource(tx,org.id,documentId),d=source.d;
    if(!['APPROVED','SIGNED'].includes(d.status)||d.template.status!=='ACTIVE'||d.template.code!==F03_TEMPLATE||decisionDigest(d.template.fields)!==decisionDigest(f03Fields))throw new ConflictException('F03_PROGRAM_SOURCE_REQUIRED');
    const payload=f03Payload(d.payload);
    if(locking){await lockAccountIdentities(tx,[org.ownerId,payload.coordinatorAccountId]);await requireVerifiedAdmin(tx,org.ownerId);}
    await requireVerifiedAdmin(tx,payload.coordinatorAccountId);
    return {org,d,payload,sourceHash:source.sourceHash};
  }
  private async activePolicy(tx:Prisma.TransactionClient,locking:boolean){
    const candidate=await this.policy.requireActive(tx);if(!locking)return candidate;
    // Preserve the inherited D16 gate through commit, including revocation that
    // commits after the Serializable snapshot but before these locking reads.
    await lockAccountIdentities(tx,[candidate.ownerId,candidate.moderatorAccountId]);
    await tx.$queryRaw`SELECT key FROM "OperationalSetting" WHERE key IN (${COMMUNITY_POLICY_KEY},${PLATFORM_STAFFING_KEY}) ORDER BY key FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM "Organization" WHERE id::text=${candidate.organizationId} FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM "ManagedDocument" WHERE id::text=${candidate.documentId} FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM "DocumentTemplate" WHERE id::text=${candidate.templateId} FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM "DocumentRevision" WHERE "documentId"::text=${candidate.documentId} FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM "DocumentLifecycleEvent" WHERE "documentId"::text=${candidate.documentId} FOR SHARE`;
    const current=await this.policy.requireActive(tx);
    if(current.documentId!==candidate.documentId||current.version!==candidate.version||current.contentHash!==candidate.contentHash||current.ownerId!==candidate.ownerId||current.moderatorAccountId!==candidate.moderatorAccountId)throw new ConflictException('The community policy changed.');
    return current;
  }
  async sources(actor:string){const org=await this.owner(this.db,actor),docs=await this.db.managedDocument.findMany({where:{organizationId:org.id,status:{in:['APPROVED','SIGNED']},template:{code:F03_TEMPLATE}},orderBy:{updatedAt:'desc'},take:101});if(docs.length>100)throw new ConflictException('Reduce the program source list before selection.');const result=[];for(const doc of docs){try{const s=await this.source(this.db,doc.id);result.push({id:doc.id,referenceNumber:doc.referenceNumber,version:doc.version,contentHash:doc.contentHash,titleAr:s.payload.titleAr,titleEn:s.payload.titleEn})}catch{continue}}return result;}
  adopt(actor:string,value:unknown){return this.serial(actor,async tx=>{
    const org=await this.owner(tx,actor),p=f03Object(value,['documentId','expectedVersion','expectedHash']);
    if(typeof p.documentId!=='string'||typeof p.expectedHash!=='string'||!Number.isInteger(p.expectedVersion))throw new BadRequestException('Select the current approved source.');
    const s=await this.source(tx,p.documentId,true);if(s.d.version!==p.expectedVersion||s.d.contentHash!==p.expectedHash)throw new ConflictException('The program source changed.');
    if(new Date().toISOString()>=s.payload.validUntil)throw new ConflictException('The approved program has expired.');
    const [existing]=await tx.$queryRaw<F03ProgramRow[]>`SELECT * FROM "CommunityProgram" WHERE "documentId"::text=${s.d.id} AND version=${s.d.version}`;
    if(existing){if(existing.state!=='ACTIVE'||existing.sourceHash!==s.sourceHash)throw new ConflictException('A withdrawn or changed program needs a new source edition.');return {id:existing.id,state:existing.state};}
    const id=randomUUID();await tx.$executeRaw(Prisma.sql`INSERT INTO "CommunityProgram" (id,"documentId","organizationId",version,"contentHash","sourceHash","ownerAccountId","adoptedByAccountId") SELECT ${id},d.id,o.id,${s.d.version},${s.d.contentHash},${s.sourceHash},a.id,a.id FROM "ManagedDocument" d,"Organization" o,"Account" a WHERE d.id::text=${s.d.id} AND o.id::text=${org.id} AND a.id::text=${actor}`);
    await this.audit.record({actorId:actor,action:'F03_PROGRAM_ADOPTED',resource:'CommunityProgram',resourceId:id,metadata:{documentId:s.d.id,version:s.d.version,sourceHash:s.sourceHash}},tx);return {id,state:'ACTIVE'};
  });}
  withdraw(actor:string,id:string){return this.serial(actor,async tx=>{await this.owner(tx,actor);const row=await this.row(tx,id);if(row.state==='WITHDRAWN')return {id,state:row.state};await tx.$executeRaw`UPDATE "CommunityProgram" SET state='WITHDRAWN' WHERE id=${id}`;await tx.$executeRaw`UPDATE "CommunityBuddyRequest" SET status='WITHDRAWN',"respondedAt"=now() WHERE "programId"=${id} AND status IN ('PENDING','ACCEPTED')`;await this.audit.record({actorId:actor,action:'F03_PROGRAM_WITHDRAWN',resource:'CommunityProgram',resourceId:id},tx);return {id,state:'WITHDRAWN'};});}
  async row(tx:Prisma.TransactionClient,id:string){const [r]=await tx.$queryRaw<F03ProgramRow[]>`SELECT * FROM "CommunityProgram" WHERE id=${id}`;if(!r)throw new NotFoundException('Program not found.');return r;}
  async current(tx:Prisma.TransactionClient,id:string,locking=false){
    const row=await this.row(tx,id);if(row.state!=='ACTIVE')throw new ConflictException('F03_PROGRAM_SOURCE_REQUIRED');
    if(locking)await tx.$queryRaw`SELECT id FROM "CommunityProgram" WHERE id=${id} FOR SHARE`;
    const s=await this.source(tx,row.documentId,locking),now=new Date().toISOString();
    if(row.organizationId!==s.org.id||row.ownerAccountId!==s.org.ownerId||row.version!==s.d.version||row.contentHash!==s.d.contentHash||row.sourceHash!==s.sourceHash||now<s.payload.validFrom||now>=s.payload.validUntil)throw new ConflictException('F03_PROGRAM_SOURCE_REQUIRED');
    await this.activePolicy(tx,locking);return {...s,row};
  }
  async packet(tx:Prisma.TransactionClient,id:string){const s=await this.current(tx,id);return {id,documentReference:s.d.referenceNumber,version:s.row.version,sourceHash:s.sourceHash,...s.payload,coordinatorAccountId:undefined};}
  async manageable(actor:string){try{await this.policy.moderator(this.db,actor)}catch{return []}const rows=await this.db.$queryRaw<Array<{id:string}>>`SELECT id FROM "CommunityProgram" WHERE state='ACTIVE' ORDER BY "adoptedAt" DESC LIMIT 101`;if(rows.length>100)throw new ConflictException('Program list requires pagination.');const result=[];for(const row of rows){try{const p=await this.current(this.db,row.id);if(actor===p.org.ownerId||actor===p.payload.coordinatorAccountId)result.push(row.id)}catch{continue}}return result;}
  async catalog(){const rows=await this.db.$queryRaw<Array<{id:string}>>`SELECT id FROM "CommunityProgram" WHERE state='ACTIVE' ORDER BY "adoptedAt" DESC LIMIT 101`;if(rows.length>100)throw new ConflictException('Program list requires pagination.');const programs=[];for(const r of rows){try{const p=await this.packet(this.db,r.id),events=await this.db.$queryRaw`SELECT e.id,e.title,e.description,e."locationName",e."startsAt",e."endsAt",e.capacity,b.activity FROM "CommunityEventProgram" b JOIN "CommunityEvent" e ON e.id=b."eventId" WHERE b."programId"=${r.id} AND e.status='PUBLISHED' ORDER BY e."startsAt" LIMIT 100`;programs.push({...p,events})}catch{continue}}return {programs,decision:'D19_SOURCE_REQUIRED',externalCertificate:false,diveClearance:false};}
  async bindNewEvent(tx:Prisma.TransactionClient,actor:string,eventId:string,programId:unknown,activity:unknown){
    if(programId===undefined||programId===null||programId===''){if(activity!==undefined)throw new BadRequestException('Select the activity program.');return;}
    if(typeof programId!=='string'||!['ACADEMY','ENVIRONMENT','VOLUNTEER'].includes(String(activity)))throw new BadRequestException('Select the program activity.');
    const s=await this.current(tx,programId,true);if(actor!==s.org.ownerId&&actor!==s.payload.coordinatorAccountId)throw new ForbiddenException('The program coordinator is required.');if(!f03ActivityEnabled(s.payload,activity as F03Activity))throw new ConflictException('This activity is outside the adopted program.');
    const event=await tx.communityEvent.findUniqueOrThrow({where:{id:eventId}});this.eventDates(s.payload,event.startsAt,event.endsAt);
    await tx.$executeRaw`INSERT INTO "CommunityEventProgram" ("eventId","programId",activity) SELECT id,${programId},${String(activity)} FROM "CommunityEvent" WHERE id::text=${eventId}`;
  }
  async eventBinding(tx:Prisma.TransactionClient,eventId:string){const [b]=await tx.$queryRaw<Array<{programId:string;activity:F03Activity}>>`SELECT "programId",activity FROM "CommunityEventProgram" WHERE "eventId"::text=${eventId}`;return b??null;}
  eventDates(payload:{validFrom:string;validUntil:string},starts:Date,ends:Date){if(starts.toISOString()<payload.validFrom||ends.toISOString()>payload.validUntil)throw new ConflictException('The activity is outside the approved program dates.');}
  async requireEvent(tx:Prisma.TransactionClient,eventId:string){const b=await this.eventBinding(tx,eventId);if(!b)return null;const s=await this.current(tx,b.programId,true);if(!f03ActivityEnabled(s.payload,b.activity))throw new ConflictException('The event program is inactive.');return {...s,activity:b.activity};}
  async registerConsent(tx:Prisma.TransactionClient,eventId:string,registrationId:string,consent:unknown){const s=await this.requireEvent(tx,eventId);if(!s)return;f03Consent(consent,s.sourceHash);await tx.$executeRaw`INSERT INTO "CommunityVolunteerConsent" ("registrationId","programId","sourceHash") SELECT id,${s.row.id},${s.sourceHash} FROM "CommunityVolunteerRegistration" WHERE id::text=${registrationId} ON CONFLICT ("registrationId") DO UPDATE SET "programId"=EXCLUDED."programId","sourceHash"=EXCLUDED."sourceHash","consentedAt"=now()`;return {programId:s.row.id,sourceHash:s.sourceHash,consent:true,safetyAcknowledged:true};}
  async requireVolunteerConsent(tx:Prisma.TransactionClient,eventId:string,registrationId:string){const s=await this.requireEvent(tx,eventId);if(!s)return;const [c]=await tx.$queryRaw<Array<{sourceHash:string;programId:string}>>`SELECT "sourceHash","programId" FROM "CommunityVolunteerConsent" WHERE "registrationId"::text=${registrationId}`;if(!c||c.programId!==s.row.id||c.sourceHash!==s.sourceHash)throw new ConflictException('Current participant program consent is required.');}
}
