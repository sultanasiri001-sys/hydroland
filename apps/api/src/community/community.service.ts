import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { lockAccountIdentities, requireVerifiedAdmin } from '../admin/admin-authorization';
import { platformOrganization } from '../hr/staffing-catalog';
import { CommunityPolicyService } from './community-policy.service';
import { F03ProgramService } from './f03-program.service';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';

type CommunityPostDecision='PUBLISHED'|'REJECTED'|'ARCHIVED';
type CommunityEventStatus='DRAFT'|'PUBLISHED'|'CANCELLED'|'COMPLETED';
type CommunityEngagementType='CONSULTATION'|'MEETING';
type CommunityEngagementDecision='UNDER_REVIEW'|'SCHEDULED'|'RESOLVED'|'REJECTED';
type CommunityVolunteerDecision='ATTENDED'|'REJECTED';

const postDecisions:CommunityPostDecision[]=['PUBLISHED','REJECTED','ARCHIVED'];
const eventStatuses:CommunityEventStatus[]=['DRAFT','PUBLISHED','CANCELLED','COMPLETED'];
const engagementTypes:CommunityEngagementType[]=['CONSULTATION','MEETING'];
const engagementDecisions:CommunityEngagementDecision[]=['UNDER_REVIEW','SCHEDULED','RESOLVED','REJECTED'];
const volunteerDecisions:CommunityVolunteerDecision[]=['ATTENDED','REJECTED'];

@Injectable()
export class CommunityService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly policy:CommunityPolicyService,private readonly programs:F03ProgramService){}

  private mutate<T>(accountId:string,admin:boolean,work:(tx:Prisma.TransactionClient)=>Promise<T>,requireActivation=true){
    return this.db.serializable(async tx=>{
      // Share the identity lock order used by account/role administration so a
      // revoked actor cannot pass an earlier HTTP guard and then commit here.
      await lockAccountIdentities(tx,[accountId]);
      if(admin)await requireVerifiedAdmin(tx,accountId);
      else if(!await tx.account.findFirst({where:{id:accountId,status:'ACTIVE',emailVerifiedAt:{not:null}},select:{id:true}}))
        throw new ForbiddenException('An active verified account is required.');
      if(requireActivation)await this.policy.requireActive(tx);
      if(admin&&requireActivation)await this.policy.moderator(tx,accountId);
      return work(tx);
    });
  }

  private text(value:unknown,label:string,min:number,max:number){
    const result=typeof value==='string'?value.trim():'';
    if(result.length<min||result.length>max)throw new BadRequestException(label+' must be between '+min+' and '+max+' characters.');
    return result;
  }

  private optionalText(value:unknown,max:number){
    if(value===undefined||value===null)return null;
    const result=typeof value==='string'?value.trim():'';
    if(!result)return null;
    if(result.length>max)throw new BadRequestException('Value is too long.');
    return result;
  }

  private date(value:unknown,label:string){
    const parsed=new Date(typeof value==='string'?value:'');
    if(Number.isNaN(parsed.getTime()))throw new BadRequestException(label+' must be a valid date and time.');
    return parsed;
  }

  private optionalDate(value:unknown,label:string){
    if(value===undefined||value===null||value==='')return null;
    return this.date(value,label);
  }

  private positiveInteger(value:unknown,label:string,max:number,optional=false){
    if(optional&&(value===undefined||value===null||value===''))return null;
    const parsed=typeof value==='number'?value:Number(value);
    if(!Number.isInteger(parsed)||parsed<1||parsed>max)throw new BadRequestException(label+' must be a whole number between 1 and '+max+'.');
    return parsed;
  }

  private eventTiming(startsAt:unknown,endsAt:unknown){
    const starts=this.date(startsAt,'Event start');
    const ends=this.date(endsAt,'Event end');
    if(ends<=starts)throw new BadRequestException('Event end must be after its start.');
    return {starts,ends};
  }

  async publicPosts(){
    if(!await this.policy.active(this.db))return [];
    return this.db.communityPost.findMany({
      where:{status:'PUBLISHED'},
      select:{id:true,title:true,body:true,status:true,publishedAt:true,createdAt:true,updatedAt:true,
        author:{select:{id:true,person:{select:{firstName:true,lastName:true}}}}},
      orderBy:[{publishedAt:'desc'},{createdAt:'desc'}],
      take:100,
    });
  }

  async publicEvents(){
    if(!await this.policy.active(this.db))return [];
    const events=await this.db.communityEvent.findMany({
      where:{status:'PUBLISHED',endsAt:{gte:new Date()}},
      include:{_count:{select:{volunteerRegistrations:true}}},
      orderBy:{startsAt:'asc'},
      take:100,
    });
    const visible=[];for(const event of events){const binding=await this.programs.eventBinding(this.db,event.id);if(!binding){visible.push(event);continue;}try{const program=await this.programs.packet(this.db,binding.programId);visible.push({...event,program:{...program,activity:binding.activity}})}catch{continue}}return visible;
  }

  async myPosts(accountId:string){
    const hidden=await this.db.$queryRaw<{postId:string}[]>`SELECT "postId" FROM "CommunityPostLifecycle" WHERE "withdrawnAt" IS NOT NULL`;
    return this.db.communityPost.findMany({where:{authorAccountId:accountId,id:{notIn:hidden.map(row=>row.postId)}},orderBy:{createdAt:'desc'},take:100});
  }

  async createPost(accountId:string,input:{title:string;body:string}){
    return this.mutate(accountId, false, async tx => {
      const post=await tx.communityPost.create({data:{authorAccountId:accountId,title:this.text(input.title,'Post title',3,160),body:this.text(input.body,'Post body',3,5000)}});
      const policy=await this.policy.requireActive(tx);
      await tx.$executeRaw`INSERT INTO "CommunityPostLifecycle" ("postId","policyDocumentId","policyVersion","policyHash","retentionDays") VALUES (${post.id},${policy.documentId},${policy.version},${policy.contentHash},${policy.retentionDays})`;
      await this.audit.record({actorId:accountId,action:'COMMUNITY_POST_CREATED',resource:'CommunityPost',resourceId:post.id,metadata:{status:post.status}}, tx);
      return post;
    });
  }

  async editPost(accountId:string,postId:string,input:{title?:unknown;body?:unknown;expectedUpdatedAt?:unknown}){
    return this.mutate(accountId,false,async tx=>{
      const post=await tx.communityPost.findFirst({where:{id:postId,authorAccountId:accountId}});if(!post)throw new NotFoundException();
      const [life]=await tx.$queryRaw<{withdrawnAt:Date|null}[]>`SELECT "withdrawnAt" FROM "CommunityPostLifecycle" WHERE "postId"=${postId}`;
      if(life?.withdrawnAt)throw new ConflictException('Deleted posts cannot be edited.');
      if(typeof input.expectedUpdatedAt!=='string'||new Date(input.expectedUpdatedAt).getTime()!==post.updatedAt.getTime())throw new ConflictException('The post changed. Reload it before editing.');
      await tx.$executeRaw`INSERT INTO "CommunityPostRevision" ("postId","changedByAccountId",title,body,"previousStatus") VALUES (${postId},${accountId},${post.title},${post.body},${post.status}::text)`;
      const updated=await tx.communityPost.update({where:{id:postId},data:{title:this.text(input.title,'Post title',3,160),body:this.text(input.body,'Post body',3,5000),status:'PENDING_REVIEW',reviewedByAccountId:null,reviewedAt:null,reviewNotes:null,publishedAt:null}});
      await this.audit.record({actorId:accountId,action:'COMMUNITY_POST_EDITED',resource:'CommunityPost',resourceId:postId,metadata:{previousStatus:post.status,status:'PENDING_REVIEW'}},tx);return updated;
    });
  }
  async withdrawPost(accountId:string,postId:string){
    return this.mutate(accountId,false,async tx=>{
      const post=await tx.communityPost.findFirst({where:{id:postId,authorAccountId:accountId}});if(!post)throw new NotFoundException();
      const [life]=await tx.$queryRaw<{retentionDays:number|null;policyDocumentId:string|null;policyVersion:number|null;policyHash:string|null}[]>`SELECT "retentionDays","policyDocumentId","policyVersion","policyHash" FROM "CommunityPostLifecycle" WHERE "postId"=${postId}`;
      const active=life?null:await this.policy.active(tx),policy=life||{retentionDays:active?.retentionDays??null,policyDocumentId:active?.documentId??null,policyVersion:active?.version??null,policyHash:active?.contentHash??null};
      await tx.$executeRaw`INSERT INTO "CommunityPostLifecycle" ("postId","withdrawnAt","purgeAfter","policyDocumentId","policyVersion","policyHash","retentionDays")
        VALUES (${postId},now(),CASE WHEN ${policy.retentionDays}::int IS NULL THEN NULL ELSE now()+make_interval(days=>${policy.retentionDays}::int) END,${policy.policyDocumentId},${policy.policyVersion},${policy.policyHash},${policy.retentionDays})
        ON CONFLICT ("postId") DO UPDATE SET "withdrawnAt"=COALESCE("CommunityPostLifecycle"."withdrawnAt",excluded."withdrawnAt"),"purgeAfter"=COALESCE("CommunityPostLifecycle"."purgeAfter",excluded."purgeAfter")`;
      await tx.communityPost.update({where:{id:postId},data:{status:'ARCHIVED'}});
      await this.audit.record({actorId:accountId,action:'COMMUNITY_POST_WITHDRAWN',resource:'CommunityPost',resourceId:postId,metadata:{policyDocumentId:policy.policyDocumentId,policyVersion:policy.policyVersion}},tx);return {id:postId,hidden:true};
    },false);
  }
  async reportPost(accountId:string,postId:string,input:{reason?:unknown}){
    const reason=this.text(input.reason,'Report reason',5,2000);
    return this.mutate(accountId,false,async tx=>{
      const post=await tx.communityPost.findUnique({where:{id:postId}});if(!post||post.status!=='PUBLISHED')throw new NotFoundException();
      const [previous]=await tx.$queryRaw<{caseId:string}[]>`SELECT "caseId" FROM "CommunityPostReport" WHERE "postId"=${postId} AND "reporterId"=${accountId}`;if(previous)return previous;
      const ticket=await tx.customerCase.create({data:{customerId:accountId,type:'COMPLAINT',priority:'HIGH',subject:'بلاغ محتوى مجتمعي',description:reason,referenceType:'COMMUNITY_POST_REPORT',referenceId:postId},select:{id:true}});
      await tx.$executeRaw`INSERT INTO "CommunityPostReport" ("caseId","postId","reporterId","reportedTitle","reportedBody") VALUES (${ticket.id},${postId},${accountId},${post.title},${post.body})`;
      await this.audit.record({actorId:accountId,action:'COMMUNITY_POST_REPORTED',resource:'CustomerCase',resourceId:ticket.id,metadata:{postId}},tx);return {caseId:ticket.id};
    });
  }
  reports(actor:string){return this.mutate(actor,true,async tx=>{const platform=await platformOrganization(tx);const rows=await tx.$queryRaw<{caseId:string}[]>`SELECT r."caseId",r."postId",CASE WHEN r."releasedAt" IS NULL THEN r."reportedTitle" ELSE '[released]' END AS "reportedTitle",CASE WHEN r."releasedAt" IS NULL THEN r."reportedBody" ELSE '[released]' END AS "reportedBody",r."releasedAt",c.status,c.description FROM "CommunityPostReport" r JOIN "CustomerCase" c ON c.id::text=r."caseId" WHERE (c."assignedAccountId"::text=${actor} OR ${platform?.ownerId===actor}) ORDER BY c."createdAt" DESC LIMIT 200`;for(const row of rows)await this.audit.record({actorId:actor,action:'COMMUNITY_REPORT_EVIDENCE_READ',resource:'CustomerCase',resourceId:row.caseId},tx);return rows;},false);}
  releaseReport(actor:string,caseId:string){
    return this.mutate(actor,true,async tx=>{
      const reviewer=await requireVerifiedAdmin(tx,actor),platform=await platformOrganization(tx);const ticket=await tx.customerCase.findUnique({where:{id:caseId}});if(!ticket||(ticket.assignedAccountId!==actor&&platform?.ownerId!==actor))throw new ForbiddenException();const [report]=await tx.$queryRaw<{releasePersonId:string|null;releasedAt:Date|null;status:string}[]>`SELECT r."releasePersonId",r."releasedAt",c.status FROM "CommunityPostReport" r JOIN "CustomerCase" c ON c.id::text=r."caseId" WHERE r."caseId"=${caseId} FOR UPDATE OF r`;
      if(!report)throw new NotFoundException();if(report.releasedAt)return {released:true};if(report.status!=='CLOSED')throw new ConflictException('Close the customer service report first.');
      if(report.releasePersonId===reviewer.personId)throw new ConflictException('Another authorized reviewer must confirm release.');
      if(report.releasePersonId)await tx.$executeRaw`UPDATE "CommunityPostReport" SET "releasedAt"=now() WHERE "caseId"=${caseId}`;
      else await tx.$executeRaw`UPDATE "CommunityPostReport" SET "releasePersonId"=${reviewer.personId} WHERE "caseId"=${caseId}`;
      await this.audit.record({actorId:actor,action:'COMMUNITY_REPORT_RELEASE_REVIEWED',resource:'CustomerCase',resourceId:caseId,metadata:{released:!!report.releasePersonId}},tx);return {released:!!report.releasePersonId};
    },false);
  }
  purgePosts(actor:string,input:{confirm?:unknown}){
    return this.mutate(actor,true,async tx=>{
      const platform=await platformOrganization(tx);if(platform?.ownerId!==actor)throw new ForbiddenException('The platform owner must confirm retention purge.');
      const rows=await tx.$queryRaw<{postId:string}[]>`SELECT l."postId" FROM "CommunityPostLifecycle" l JOIN "CommunityPost" p ON p.id::text=l."postId" WHERE l."withdrawnAt" IS NOT NULL AND l."purgeAfter"<=now()
        AND NOT EXISTS(SELECT 1 FROM "CommunityPostReport" r WHERE r."postId"=l."postId" AND r."releasedAt" IS NULL) ORDER BY l."purgeAfter" LIMIT 100 FOR UPDATE OF p`;
      if(input.confirm!==true)return {due:rows.map(row=>row.postId),purged:0};
      for(const row of rows){await tx.$executeRaw`DELETE FROM "CommunityPostRevision" WHERE "postId"=${row.postId}`;await tx.$executeRaw`UPDATE "CommunityPostReport" SET "reportedTitle"='[purged]',"reportedBody"='[purged]' WHERE "postId"=${row.postId} AND "releasedAt" IS NOT NULL`;await tx.communityPost.delete({where:{id:row.postId}});await tx.$executeRaw`DELETE FROM "CommunityPostLifecycle" WHERE "postId"=${row.postId}`;}
      await this.audit.record({actorId:actor,action:'COMMUNITY_POST_CONTENT_PURGED',resource:'CommunityPost',metadata:{count:rows.length}},tx);return {purged:rows.length};
    },false);
  }

  async adminPosts(actor:string){
    await this.policy.moderator(this.db,actor);
    const hidden=await this.db.$queryRaw<{postId:string}[]>`SELECT "postId" FROM "CommunityPostLifecycle" WHERE "withdrawnAt" IS NOT NULL`;
    return this.db.communityPost.findMany({
      where:{id:{notIn:hidden.map(row=>row.postId)}},
      include:{
        author:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}},
        reviewedBy:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}},
      },
      orderBy:[{status:'asc'},{createdAt:'desc'}],
      take:200,
    });
  }

  async decidePost(adminAccountId:string,postId:string,input:{status:CommunityPostDecision;reviewNotes?:string}){
    return this.mutate(adminAccountId, true, async tx => {
      if(!postDecisions.includes(input.status))throw new BadRequestException('Invalid post decision.');
      const post=await tx.communityPost.findUnique({where:{id:postId}});
      if(!post)throw new NotFoundException('Community post not found.');
      const [withdrawn]=await tx.$queryRaw<{withdrawnAt:Date|null}[]>`SELECT "withdrawnAt" FROM "CommunityPostLifecycle" WHERE "postId"=${postId}`;
      if(withdrawn?.withdrawnAt)throw new ConflictException('A deleted post cannot be republished.');
      if(post.authorAccountId===adminAccountId)throw new ForbiddenException('A different moderator must review this post.');
      const reviewNotes=this.optionalText(input.reviewNotes,2000);
      if(input.status==='REJECTED'&&!reviewNotes)throw new BadRequestException('Review notes are required when rejecting a post.');
      const now=new Date();
      const updated=await tx.communityPost.update({
        where:{id:postId},
        data:{
          status:input.status,
          reviewNotes:reviewNotes??post.reviewNotes,
          reviewedByAccountId:adminAccountId,
          reviewedAt:now,
          publishedAt:input.status==='PUBLISHED'?now:post.publishedAt,
        },
      });
      await this.audit.record({actorId:adminAccountId,action:'COMMUNITY_POST_REVIEWED',resource:'CommunityPost',resourceId:postId,metadata:{previousStatus:post.status,status:input.status}}, tx);
      return updated;
    });
  }

  async adminEvents(actor:string){
    await this.policy.moderator(this.db,actor);
    const events=await this.db.communityEvent.findMany({
      include:{createdBy:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}},_count:{select:{volunteerRegistrations:true}}},
      orderBy:{startsAt:'desc'},
      take:200,
    });
    return Promise.all(events.map(async event=>({...event,programBinding:await this.programs.eventBinding(this.db,event.id)})));
  }

  async createEvent(adminAccountId:string,input:{title:string;description:string;locationName:string;startsAt:string;endsAt:string;capacity?:number;status?:'DRAFT'|'PUBLISHED';programId?:unknown;activity?:unknown}){
    return this.mutate(adminAccountId, true, async tx => {
      const {starts,ends}=this.eventTiming(input.startsAt,input.endsAt);
      const status=input.status||'DRAFT';
      if(status!=='DRAFT'&&status!=='PUBLISHED')throw new BadRequestException('Invalid initial event status.');
      const event=await tx.communityEvent.create({
        data:{
          createdByAccountId:adminAccountId,
          title:this.text(input.title,'Event title',3,160),
          description:this.text(input.description,'Event description',3,5000),
          locationName:this.text(input.locationName,'Event location',3,160),
          startsAt:starts,
          endsAt:ends,
          capacity:this.positiveInteger(input.capacity,'Event capacity',100000,true),
          status,
        },
      });
      await this.programs.bindNewEvent(tx,adminAccountId,event.id,input.programId,input.activity);
      await this.audit.record({actorId:adminAccountId,action:'COMMUNITY_EVENT_CREATED',resource:'CommunityEvent',resourceId:event.id,metadata:{status:event.status,capacity:event.capacity}}, tx);
      return event;
    });
  }

  async updateEvent(adminAccountId:string,eventId:string,input:{title?:string;description?:string;locationName?:string;startsAt?:string;endsAt?:string;capacity?:number|null;status?:CommunityEventStatus}){
    return this.mutate(adminAccountId, true, async tx => {
      const event=await tx.communityEvent.findUnique({where:{id:eventId}});
      if(!event)throw new NotFoundException('Community event not found.');
      if(input.status!==undefined&&!eventStatuses.includes(input.status))throw new BadRequestException('Invalid event status.');
      const program=input.status!=='CANCELLED'?await this.programs.requireEvent(tx,eventId):null;
      const starts=input.startsAt===undefined?event.startsAt:this.date(input.startsAt,'Event start');
      const ends=input.endsAt===undefined?event.endsAt:this.date(input.endsAt,'Event end');
      if(ends<=starts)throw new BadRequestException('Event end must be after its start.');
      if(program)this.programs.eventDates(program.payload,starts,ends);
      const capacity=input.capacity===undefined?event.capacity:this.positiveInteger(input.capacity,'Event capacity',100000,true);
      if(capacity!==null){
        const active=await tx.communityVolunteerRegistration.count({where:{eventId,status:{in:['REGISTERED','ATTENDED']}}});
        if(capacity<active)throw new ConflictException('Event capacity cannot be lower than active volunteer registrations.');
      }
      const data:Record<string,unknown>={
        startsAt:starts,
        endsAt:ends,
        capacity,
      };
      if(input.title!==undefined)data.title=this.text(input.title,'Event title',3,160);
      if(input.description!==undefined)data.description=this.text(input.description,'Event description',3,5000);
      if(input.locationName!==undefined)data.locationName=this.text(input.locationName,'Event location',3,160);
      if(input.status!==undefined)data.status=input.status;
      const updated=await tx.communityEvent.update({where:{id:eventId},data:data as never});
      await this.audit.record({actorId:adminAccountId,action:'COMMUNITY_EVENT_UPDATED',resource:'CommunityEvent',resourceId:eventId,metadata:{previousStatus:event.status,status:updated.status}}, tx);
      return updated;
    });
  }

  async registerVolunteer(accountId:string,eventId:string,programConsent?:unknown){
    return this.mutate(accountId,false,async tx=>{
      const event=await tx.communityEvent.findUnique({where:{id:eventId}});
      if(!event)throw new NotFoundException('Community event not found.');
      if(event.status!=='PUBLISHED')throw new ConflictException('Volunteer registration is available only for published events.');
      if(event.startsAt<=new Date())throw new ConflictException('Volunteer registration is closed after the event starts.');
      const existing=await tx.communityVolunteerRegistration.findUnique({where:{eventId_accountId:{eventId,accountId}}});
      if(existing&&(existing.status==='REGISTERED'||existing.status==='ATTENDED'))throw new ConflictException('You are already registered for this event.');
      if(event.capacity!==null){
        const active=await tx.communityVolunteerRegistration.count({where:{eventId,status:{in:['REGISTERED','ATTENDED']}}});
        if(active>=event.capacity)throw new ConflictException('Volunteer capacity has been reached.');
      }
      const registration=existing
        ?await tx.communityVolunteerRegistration.update({where:{id:existing.id},data:{status:'REGISTERED',approvedMinutes:null,reviewNotes:null,reviewedByAccountId:null,reviewedAt:null,attendedAt:null}})
        :await tx.communityVolunteerRegistration.create({data:{eventId,accountId}});
      const programConsentEvidence=await this.programs.registerConsent(tx,eventId,registration.id,programConsent);
      await this.audit.record({actorId:accountId,action:'COMMUNITY_VOLUNTEER_REGISTERED',resource:'CommunityVolunteerRegistration',resourceId:registration.id,metadata:{eventId,...(programConsentEvidence?{programConsent:programConsentEvidence}:{})}},tx);
      return registration;
    });
  }

  async myVolunteerWork(accountId:string){
    const registrations=await this.db.communityVolunteerRegistration.findMany({
      where:{accountId},
      include:{event:true},
      orderBy:{createdAt:'desc'},
      take:100,
    });
    const approvedMinutes=registrations.reduce((total,item)=>total+(item.status==='ATTENDED'?(item.approvedMinutes||0):0),0);
    const ids=registrations.map(r=>r.id),events=await this.db.auditEvent.findMany({where:{action:'COMMUNITY_VOLUNTEER_REVIEWED',resource:'CommunityVolunteerRegistration',resourceId:{in:ids}},orderBy:[{occurredAt:'asc'},{id:'asc'}]});
    const history=events.map(e=>{const m=e.metadata&&typeof e.metadata==='object'&&!Array.isArray(e.metadata)?e.metadata as Record<string,unknown>:{};return {id:e.id,registrationId:e.resourceId,occurredAt:e.occurredAt,previousMinutes:m.previousMinutes??null,approvedMinutes:m.approvedMinutes??null,reason:m.reason??null,reviewerAccountId:m.reviewerAccountId??null}});
    return {registrations,approvedMinutes,history};
  }

  async cancelVolunteer(accountId:string,registrationId:string){
    return this.mutate(accountId, false, async tx => {
      const registration=await tx.communityVolunteerRegistration.findFirst({where:{id:registrationId,accountId},include:{event:true}});
      if(!registration)throw new NotFoundException('Volunteer registration not found.');
      if(registration.status!=='REGISTERED')throw new ConflictException('Only an active volunteer registration can be cancelled.');
      if(registration.event.startsAt<=new Date())throw new ConflictException('Volunteer registration cannot be cancelled after the event starts.');
      const updated=await tx.communityVolunteerRegistration.update({where:{id:registrationId},data:{status:'CANCELLED'}});
      await this.audit.record({actorId:accountId,action:'COMMUNITY_VOLUNTEER_CANCELLED',resource:'CommunityVolunteerRegistration',resourceId:registrationId,metadata:{eventId:registration.eventId}}, tx);
      return updated;
    },false);
  }

  async adminVolunteers(actor:string){
    await this.policy.moderator(this.db,actor);
    return this.db.communityVolunteerRegistration.findMany({
      include:{
        event:true,
        account:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}},
        reviewedBy:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}},
      },
      orderBy:{createdAt:'desc'},
      take:300,
    });
  }

  async decideVolunteer(adminAccountId:string,registrationId:string,input:{status:CommunityVolunteerDecision;approvedMinutes?:number;reviewNotes?:string;expectedUpdatedAt?:unknown}){
    return this.mutate(adminAccountId, true, async tx => {
      if(!volunteerDecisions.includes(input.status))throw new BadRequestException('Invalid volunteer decision.');
      const registration=await tx.communityVolunteerRegistration.findUnique({where:{id:registrationId}});
      if(!registration)throw new NotFoundException('Volunteer registration not found.');
      if(registration.status==='CANCELLED')throw new ConflictException('Cancelled volunteer registrations cannot be reviewed.');
      if(input.expectedUpdatedAt!==undefined&&(typeof input.expectedUpdatedAt!=='string'||input.expectedUpdatedAt!==registration.updatedAt.toISOString()))throw new ConflictException('The volunteer record changed.');
      const reviewNotes=this.optionalText(input.reviewNotes,2000);
      const approvedMinutes=input.status==='ATTENDED'?this.positiveInteger(input.approvedMinutes,'Approved volunteer minutes',1440):null;
      if(input.status==='REJECTED'&&!reviewNotes)throw new BadRequestException('Review notes are required when rejecting a volunteer registration.');
      if(registration.status==='ATTENDED'&&approvedMinutes!==registration.approvedMinutes&&!reviewNotes)throw new BadRequestException('A reason is required when correcting approved volunteer minutes.');
      await this.programs.requireVolunteerConsent(tx,registration.eventId,registrationId);
      if(registration.status===input.status&&registration.approvedMinutes===approvedMinutes&&registration.reviewNotes===(reviewNotes??registration.reviewNotes))return registration;
      const now=new Date();
      const updated=await tx.communityVolunteerRegistration.update({
        where:{id:registrationId},
        data:{status:input.status,approvedMinutes,reviewNotes:reviewNotes??registration.reviewNotes,reviewedByAccountId:adminAccountId,reviewedAt:now,attendedAt:input.status==='ATTENDED'?(registration.attendedAt??now):registration.attendedAt},
      });
      await this.audit.record({actorId:adminAccountId,action:'COMMUNITY_VOLUNTEER_REVIEWED',resource:'CommunityVolunteerRegistration',resourceId:registrationId,metadata:{previousStatus:registration.status,status:input.status,previousMinutes:registration.approvedMinutes,approvedMinutes,reason:reviewNotes??null,previousReason:registration.reviewNotes,reviewerAccountId:adminAccountId}}, tx);
      return updated;
    });
  }

  myEngagementRequests(accountId:string){
    return this.db.communityEngagementRequest.findMany({where:{requesterAccountId:accountId},orderBy:{createdAt:'desc'},take:100});
  }

  async createEngagementRequest(accountId:string,input:{type:CommunityEngagementType;subject:string;description:string;requestedFor?:string}){
    return this.mutate(accountId, false, async tx => {
      if(!engagementTypes.includes(input.type))throw new BadRequestException('Invalid engagement request type.');
      const request=await tx.communityEngagementRequest.create({
        data:{
          requesterAccountId:accountId,
          type:input.type,
          subject:this.text(input.subject,'Request subject',3,160),
          description:this.text(input.description,'Request description',3,5000),
          requestedFor:this.optionalDate(input.requestedFor,'Requested time'),
        },
      });
      await this.audit.record({actorId:accountId,action:'COMMUNITY_ENGAGEMENT_REQUESTED',resource:'CommunityEngagementRequest',resourceId:request.id,metadata:{type:request.type}}, tx);
      return request;
    });
  }

  async cancelEngagementRequest(accountId:string,requestId:string){
    return this.mutate(accountId, false, async tx => {
      const request=await tx.communityEngagementRequest.findFirst({where:{id:requestId,requesterAccountId:accountId}});
      if(!request)throw new NotFoundException('Community engagement request not found.');
      if(['RESOLVED','REJECTED','CANCELLED'].includes(request.status))throw new ConflictException('This engagement request can no longer be cancelled.');
      const updated=await tx.communityEngagementRequest.update({where:{id:requestId},data:{status:'CANCELLED'}});
      await this.audit.record({actorId:accountId,action:'COMMUNITY_ENGAGEMENT_CANCELLED',resource:'CommunityEngagementRequest',resourceId:requestId,metadata:{previousStatus:request.status}}, tx);
      return updated;
    },false);
  }

  async adminEngagementRequests(actor:string){
    await this.policy.moderator(this.db,actor);
    return this.db.communityEngagementRequest.findMany({
      include:{
        requester:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}},
        decidedBy:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}},
      },
      orderBy:[{status:'asc'},{createdAt:'desc'}],
      take:300,
    });
  }

  async decideEngagementRequest(adminAccountId:string,requestId:string,input:{status:CommunityEngagementDecision;scheduledAt?:string;decisionNotes?:string}){
    return this.mutate(adminAccountId, true, async tx => {
      if(!engagementDecisions.includes(input.status))throw new BadRequestException('Invalid engagement decision.');
      const request=await tx.communityEngagementRequest.findUnique({where:{id:requestId}});
      if(!request)throw new NotFoundException('Community engagement request not found.');
      if(request.status==='CANCELLED')throw new ConflictException('Cancelled engagement requests cannot be reviewed.');
      const decisionNotes=input.decisionNotes===undefined?request.decisionNotes:this.optionalText(input.decisionNotes,2000);
      const scheduledAt=input.scheduledAt===undefined?request.scheduledAt:this.optionalDate(input.scheduledAt,'Scheduled time');
      if(input.status==='SCHEDULED'&&!scheduledAt)throw new BadRequestException('Scheduled time is required when scheduling an engagement request.');
      if((input.status==='RESOLVED'||input.status==='REJECTED')&&!decisionNotes)throw new BadRequestException('Decision notes are required for final engagement decisions.');
      const now=new Date();
      const updated=await tx.communityEngagementRequest.update({
        where:{id:requestId},
        data:{status:input.status,scheduledAt,decisionNotes,decidedByAccountId:adminAccountId,decidedAt:now},
      });
      await this.audit.record({actorId:adminAccountId,action:'COMMUNITY_ENGAGEMENT_DECIDED',resource:'CommunityEngagementRequest',resourceId:requestId,metadata:{previousStatus:request.status,status:input.status,scheduledAt}}, tx);
      return updated;
    });
  }
}
