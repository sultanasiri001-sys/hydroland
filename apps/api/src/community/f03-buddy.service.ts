import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { f03Consent, f03Hash, f03Object, f03Text } from './f03-program.domain';
import { F03ProgramService } from './f03-program.service';

type Member={id:string;programId:string;accountId:string;sourceHash:string;alias:string;region:string;state:string;revision:number;consentedAt:Date;withdrawnAt:Date|null};
type Match={id:string;programId:string;requesterAccountId:string;recipientAccountId:string;requesterMembershipId:string;recipientMembershipId:string;requesterRevision:number;recipientRevision:number;sourceHash:string;status:string;requestKey:string;requestDigest:string;createdAt:Date;respondedAt:Date|null};
@Injectable()
export class F03BuddyService {
  constructor(private readonly db:DatabaseService,private readonly programs:F03ProgramService,private readonly audit:AuditService){}
  private async member(tx:Prisma.TransactionClient,programId:string,actor:string){const [m]=await tx.$queryRaw<Member[]>`SELECT * FROM "CommunityBuddyMembership" WHERE "programId"=${programId} AND "accountId"::text=${actor}`;return m??null;}
  private async activeMember(tx:Prisma.TransactionClient,programId:string,actor:string,hash:string){await this.programs.account(tx,actor);const m=await this.member(tx,programId,actor);if(!m||m.state!=='ACTIVE'||m.sourceHash!==hash)throw new ConflictException('Current opt-in matching consent is required.');return m;}
  private async buddyProgram(tx:Prisma.TransactionClient,id:string,locking=false){const p=await this.programs.current(tx,id,locking);if(!p.payload.buddyMatching)throw new ConflictException('Matching is not in this program.');return p;}
  join(actor:string,id:string,value:unknown){return this.programs.serial(actor,async tx=>{
    const input=f03Object(value,['alias','region','consent']),p=await this.buddyProgram(tx,id,true);f03Consent(input.consent,p.sourceHash);
    const alias=f03Text(input.alias,'Choose a display alias.',3,60),region=f03Text(input.region,'Choose a broad meeting area.',3,80),old=await this.member(tx,id,actor);
    if(old?.state==='ACTIVE'&&old.sourceHash===p.sourceHash&&old.alias===alias&&old.region===region)return {id:old.id,state:'ACTIVE',revision:old.revision};
    const memberId=old?.id??randomUUID();
    await tx.$executeRaw`INSERT INTO "CommunityBuddyMembership" (id,"programId","accountId","sourceHash",alias,region) SELECT ${memberId},${id},id,${p.sourceHash},${alias},${region} FROM "Account" WHERE id::text=${actor} ON CONFLICT ("programId","accountId") DO UPDATE SET "sourceHash"=EXCLUDED."sourceHash",alias=EXCLUDED.alias,region=EXCLUDED.region,state='ACTIVE',revision="CommunityBuddyMembership".revision+1,"consentedAt"=now(),"withdrawnAt"=NULL`;
    if(old)await tx.$executeRaw`UPDATE "CommunityBuddyRequest" SET status='WITHDRAWN',"respondedAt"=now() WHERE ("requesterMembershipId"=${memberId} OR "recipientMembershipId"=${memberId}) AND status IN ('PENDING','ACCEPTED')`;
    await this.audit.record({actorId:actor,action:'F03_BUDDY_CONSENT_RECORDED',resource:'CommunityBuddyMembership',resourceId:memberId,metadata:{programId:id,sourceHash:p.sourceHash,revision:(old?.revision??0)+1,consent:true,safetyAcknowledged:true}},tx);
    return {id:memberId,state:'ACTIVE',revision:(old?.revision??0)+1};
  });}
  leave(actor:string,id:string){return this.programs.serial(actor,async tx=>{
    const m=await this.member(tx,id,actor);if(!m||m.state==='WITHDRAWN')return {state:'WITHDRAWN'};
    await tx.$executeRaw`UPDATE "CommunityBuddyMembership" SET state='WITHDRAWN',revision=revision+1,"withdrawnAt"=now() WHERE id=${m.id}`;
    await tx.$executeRaw`UPDATE "CommunityBuddyRequest" SET status='WITHDRAWN',"respondedAt"=now() WHERE ("requesterMembershipId"=${m.id} OR "recipientMembershipId"=${m.id}) AND status IN ('PENDING','ACCEPTED')`;
    await this.audit.record({actorId:actor,action:'F03_BUDDY_CONSENT_WITHDRAWN',resource:'CommunityBuddyMembership',resourceId:m.id,metadata:{programId:id,previousRevision:m.revision,revision:m.revision+1}},tx);return {state:'WITHDRAWN'};
  });}
  async directory(actor:string,id:string){return this.programs.serial(actor,async tx=>{
    const p=await this.buddyProgram(tx,id,true),mine=await this.activeMember(tx,id,actor,p.sourceHash);
    const rows=await tx.$queryRaw<Array<{id:string;alias:string;region:string}>>`SELECT m.id,m.alias,m.region FROM "CommunityBuddyMembership" m JOIN "Account" a ON a.id=m."accountId" JOIN "Account" me ON me.id::text=${actor} WHERE m."programId"=${id} AND m.state='ACTIVE' AND m."sourceHash"=${p.sourceHash} AND m.id<>${mine.id} AND a.status='ACTIVE' AND a."emailVerifiedAt" IS NOT NULL AND a."personId"<>me."personId" ORDER BY m.alias,m.id LIMIT 101`;
    if(rows.length>100)throw new ConflictException('Narrow the program before viewing its directory.');return {programId:id,sourceHash:p.sourceHash,members:rows};
  });}
  request(actor:string,id:string,value:unknown){return this.programs.serial(actor,async tx=>{
    const input=f03Object(value,['recipientMembershipId','requestKey','consent']),p=await this.buddyProgram(tx,id,true);f03Consent(input.consent,p.sourceHash);
    const recipientId=f03Text(input.recipientMembershipId,'Select an opted-in member.',3,100),key=f03Text(input.requestKey,'A stable request key is required.',8,120),digest=f03Hash({programId:id,recipientId,sourceHash:p.sourceHash});
    const [existing]=await tx.$queryRaw<Match[]>`SELECT * FROM "CommunityBuddyRequest" WHERE "requesterAccountId"::text=${actor} AND "requestKey"=${key}`;
    if(existing){if(existing.requestDigest!==digest)throw new ConflictException('Request key was used for another action.');return {id:existing.id,status:existing.status};}
    const mine=await this.activeMember(tx,id,actor,p.sourceHash),[target]=await tx.$queryRaw<Member[]>`SELECT * FROM "CommunityBuddyMembership" WHERE id=${recipientId} AND "programId"=${id}`;
    if(!target||target.state!=='ACTIVE'||target.sourceHash!==p.sourceHash||target.accountId===actor)throw new ConflictException('The selected member is no longer available.');
    const person=await this.programs.account(tx,actor),other=await this.programs.account(tx,target.accountId);if(person.personId===other.personId)throw new BadRequestException('Matching requires two different people.');
    const pairKey=f03Hash([actor,target.accountId].sort()),[pending]=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "CommunityBuddyRequest" WHERE "programId"=${id} AND "pairKey"=${pairKey} AND status IN ('PENDING','ACCEPTED')`;
    if(pending)throw new ConflictException('A current matching request already exists for these two members.');
    const requestId=randomUUID();await tx.$executeRaw`INSERT INTO "CommunityBuddyRequest" (id,"programId","requesterAccountId","recipientAccountId","requesterMembershipId","recipientMembershipId","requesterRevision","recipientRevision","sourceHash","pairKey","requestKey","requestDigest") SELECT ${requestId},${id},a.id,b.id,${mine.id},${target.id},${mine.revision},${target.revision},${p.sourceHash},${pairKey},${key},${digest} FROM "Account" a,"Account" b WHERE a.id::text=${actor} AND b.id::text=${target.accountId}`;
    await this.audit.record({actorId:actor,action:'F03_BUDDY_REQUESTED',resource:'CommunityBuddyRequest',resourceId:requestId,metadata:{programId:id,sourceHash:p.sourceHash,requesterRevision:mine.revision,recipientRevision:target.revision,consent:true,safetyAcknowledged:true}},tx);return {id:requestId,status:'PENDING'};
  });}
  decide(actor:string,id:string,value:unknown){return this.programs.serial(actor,async tx=>{
    const input=f03Object(value,['action','consent']);if(!['ACCEPT','DECLINE','WITHDRAW'].includes(String(input.action)))throw new BadRequestException('Select a matching decision.');
    const [r]=await tx.$queryRaw<Match[]>`SELECT * FROM "CommunityBuddyRequest" WHERE id=${id} AND ("requesterAccountId"::text=${actor} OR "recipientAccountId"::text=${actor})`;
    if(!r)throw new NotFoundException('Matching request not found.');
    if(input.action!=='WITHDRAW'&&r.recipientAccountId!==actor)throw new ForbiddenException('Only the invited member can decide.');
    const status=({ACCEPT:'ACCEPTED',DECLINE:'DECLINED',WITHDRAW:'WITHDRAWN'} as Record<string,string>)[String(input.action)];
    if(r.status===status)return {id,status};
    if((input.action!=='WITHDRAW'&&r.status!=='PENDING')||(input.action==='WITHDRAW'&&!['PENDING','ACCEPTED'].includes(r.status)))throw new ConflictException('This matching request is already resolved.');
    if(input.action==='ACCEPT'){
      const p=await this.buddyProgram(tx,r.programId,true);f03Consent(input.consent,p.sourceHash);
      const a=await this.activeMember(tx,r.programId,r.requesterAccountId,p.sourceHash),b=await this.activeMember(tx,r.programId,r.recipientAccountId,p.sourceHash);
      if(r.sourceHash!==p.sourceHash||r.requesterMembershipId!==a.id||r.recipientMembershipId!==b.id||r.requesterRevision!==a.revision||r.recipientRevision!==b.revision)throw new ConflictException('One member or the program changed; obtain new consent.');
    }
    await tx.$executeRaw`UPDATE "CommunityBuddyRequest" SET status=${status},"respondedAt"=now() WHERE id=${id}`;
    await this.audit.record({actorId:actor,action:'F03_BUDDY_'+status,resource:'CommunityBuddyRequest',resourceId:id,metadata:{programId:r.programId,sourceHash:r.sourceHash,previousStatus:r.status,status,...(status==='ACCEPTED'?{consent:true,safetyAcknowledged:true}:{})}},tx);return {id,status};
  });}
  async mine(actor:string){return this.programs.serial(actor,async tx=>{
    const memberships=await tx.$queryRaw<Member[]>`SELECT * FROM "CommunityBuddyMembership" WHERE "accountId"::text=${actor} ORDER BY "consentedAt" DESC LIMIT 101`;
    const requests=await tx.$queryRaw<Match[]>`SELECT * FROM "CommunityBuddyRequest" WHERE "requesterAccountId"::text=${actor} OR "recipientAccountId"::text=${actor} ORDER BY "createdAt" DESC LIMIT 201`;
    if(memberships.length>100||requests.length>200)throw new ConflictException('Matching history requires pagination.');
    const current=new Map<string,string|null>();for(const id of new Set([...memberships.map(m=>m.programId),...requests.map(r=>r.programId)])){try{current.set(id,(await this.buddyProgram(tx,id,true)).sourceHash)}catch{current.set(id,null)}}
    const own=memberships.map(m=>({id:m.id,programId:m.programId,alias:m.alias,region:m.region,state:m.state,revision:m.revision,current:m.state==='ACTIVE'&&current.get(m.programId)===m.sourceHash}));
    const result=[];for(const r of requests){let otherAlias:string|null=null,otherRegion:string|null=null,visible=false;
      if(current.get(r.programId)===r.sourceHash&&['PENDING','ACCEPTED'].includes(r.status)){
        const members=await tx.$queryRaw<Member[]>`SELECT m.* FROM "CommunityBuddyMembership" m JOIN "Account" a ON a.id=m."accountId" WHERE m.id IN (${r.requesterMembershipId},${r.recipientMembershipId}) AND m.state='ACTIVE' AND a.status='ACTIVE' AND a."emailVerifiedAt" IS NOT NULL`;
        const a=members.find(m=>m.id===r.requesterMembershipId),b=members.find(m=>m.id===r.recipientMembershipId);
        visible=!!a&&!!b&&a.revision===r.requesterRevision&&b.revision===r.recipientRevision&&a.sourceHash===r.sourceHash&&b.sourceHash===r.sourceHash;
        if(visible){const peer=r.requesterAccountId===actor?b!:a!;otherAlias=peer.alias;otherRegion=peer.region;}
      }
      result.push({id:r.id,programId:r.programId,status:r.status,current:visible,incoming:r.recipientAccountId===actor,otherAlias,otherRegion,createdAt:r.createdAt,respondedAt:r.respondedAt,canAccept:visible&&r.status==='PENDING'&&r.recipientAccountId===actor,canWithdraw:['PENDING','ACCEPTED'].includes(r.status)});
    }
    return {memberships:own,requests:result,managedProgramIds:await this.programs.manageable(actor),externalCertificate:false,diveClearance:false};
  });}
}
