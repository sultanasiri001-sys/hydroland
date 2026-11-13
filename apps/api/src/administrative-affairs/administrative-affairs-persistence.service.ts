import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { Prisma } from '@prisma/client';
import { DocumentPersistenceService } from '../document-forms/document-persistence.service';

@Injectable()
export class AdministrativeAffairsPersistenceService {
  constructor(private readonly db: DatabaseService, private readonly documents: DocumentPersistenceService) {}

  private async lockRegisteredRecord(tx:Prisma.TransactionClient,recordId:string) {
    await tx.$queryRaw`SELECT "id" FROM "AdministrativeRecord" WHERE "id"::text=${recordId} FOR UPDATE`;
    const record=await tx.administrativeRecord.findUniqueOrThrow({where:{id:recordId},select:{status:true}});
    if(record.status==='ARCHIVED')throw new ConflictException('ADMIN_RECORD_ARCHIVED');
    if(record.status!=='REGISTERED')throw new ConflictException('ADMIN_RECORD_NOT_REGISTERED');
  }

  private async assertPermission(accountId:string, organizationId:string, action:'READ'|'REGISTER'|'ROUTE'|'ASSIGN'|'DECIDE'|'ARCHIVE'|'SCHEDULE_MEETING', unitIds:string[] = [], client:DatabaseService|Prisma.TransactionClient=this.db) {
    const member=await client.organizationMember.findFirst({where:{accountId,organizationId,status:'ACTIVE'},select:{role:true}});
    if(!member) throw new ForbiddenException('ADMIN_ORGANIZATION_SCOPE_DENIED');
    const assignments=await client.roleAssignment.findMany({where:{accountId,status:'ACTIVE'},select:{role:true,scope:true}});
    const scoped=assignments.filter(a=>{const x=a.scope;if(!x||Array.isArray(x)||typeof x!=='object')return false;const ids=(x as {organizationIds?:unknown}).organizationIds;return Array.isArray(ids)&&ids.includes(organizationId);});
    const roles=new Set<string>([member.role,...scoped.map(a=>a.role)]);
    const globalAuthority=member.role==='OWNER'||member.role==='ADMIN'||roles.has('OWNER')||roles.has('ADMIN');
    if(!globalAuthority&&roles.has('CENTER_MANAGER')&&unitIds.length){
      const unitScoped=scoped.some(a=>{const x=a.scope as {unitIds?:unknown,centerIds?:unknown};const ids=Array.isArray(x.unitIds)?x.unitIds:Array.isArray(x.centerIds)?x.centerIds:[];return unitIds.every(id=>ids.includes(id));});
      if(!unitScoped) throw new ForbiddenException('ADMIN_UNIT_SCOPE_DENIED');
    }
    const allowed:Record<typeof action,string[]>={
      READ:['OWNER','ADMIN','OPERATOR','INSTRUCTOR','STAFF','VIEWER','CENTER_MANAGER','REVIEWER','EXECUTIVE_APPROVER'],
      REGISTER:['OWNER','ADMIN','OPERATOR','STAFF','CENTER_MANAGER'],
      ROUTE:['OWNER','ADMIN','OPERATOR','STAFF','CENTER_MANAGER'],
      ASSIGN:['OWNER','ADMIN','CENTER_MANAGER'],
      DECIDE:['OWNER','ADMIN','CENTER_MANAGER','REVIEWER','EXECUTIVE_APPROVER'],
      ARCHIVE:['OWNER','ADMIN','OPERATOR','STAFF','CENTER_MANAGER'],
      SCHEDULE_MEETING:['OWNER','ADMIN','OPERATOR','STAFF','CENTER_MANAGER'],
    };
    if(!allowed[action].some(role=>roles.has(role))) throw new ForbiddenException(`ADMIN_PERMISSION_REQUIRED:${action}`);
  }

  private async readUnitScope(accountId:string,organizationId:string):Promise<string[]|null>{
    const member=await this.db.organizationMember.findFirst({where:{accountId,organizationId,status:'ACTIVE'},select:{role:true}});
    if(!member) throw new ForbiddenException('ADMIN_ORGANIZATION_SCOPE_DENIED');
    const assignments=await this.db.roleAssignment.findMany({where:{accountId,status:'ACTIVE'},select:{role:true,scope:true}});
    const scoped=assignments.filter(a=>{const x=a.scope;if(!x||Array.isArray(x)||typeof x!=='object')return false;const ids=(x as {organizationIds?:unknown}).organizationIds;return Array.isArray(ids)&&ids.includes(organizationId);});
    const roles=new Set<string>([member.role,...scoped.map(a=>a.role)]);
    if(member.role==='OWNER'||member.role==='ADMIN'||roles.has('OWNER')||roles.has('ADMIN')||!roles.has('CENTER_MANAGER'))return null;
    const unitIds=[...new Set(scoped.filter(a=>a.role==='CENTER_MANAGER').flatMap(a=>{const x=a.scope as {unitIds?:unknown,centerIds?:unknown};const ids=Array.isArray(x.unitIds)?x.unitIds:Array.isArray(x.centerIds)?x.centerIds:[];return ids.filter((id):id is string=>typeof id==='string');}))];
    if(!unitIds.length) throw new ForbiddenException('ADMIN_UNIT_SCOPE_DENIED');
    return unitIds;
  }

  async createRecordFromDocument(actorAccountId:string,input:{organizationId:string;unitId:string;managedDocumentId:string}){
    if(!input.organizationId?.trim()||!input.unitId?.trim()||!input.managedDocumentId?.trim())throw new BadRequestException('ADMIN_DOCUMENT_RECORD_REQUIRED_FIELDS');
    await this.assertPermission(actorAccountId,input.organizationId,'REGISTER',[input.unitId]);
    const unit=await this.db.orgUnit.findUniqueOrThrow({where:{id:input.unitId},select:{organizationId:true,active:true}});
    if(unit.organizationId!==input.organizationId||!unit.active)throw new ForbiddenException('ADMIN_RECORD_UNIT_SCOPE_DENIED');
    const source=await this.db.managedDocument.findFirst({where:{id:input.managedDocumentId,organizationId:input.organizationId},include:{template:true}});
    if(!source)throw new ForbiddenException('ADMIN_DOCUMENT_ORGANIZATION_SCOPE_DENIED');
    if(source.template.department!=='ADMIN_AFFAIRS_RECORDS')throw new BadRequestException('ADMIN_DOCUMENT_TEMPLATE_REQUIRED');
    if(source.status!=='SIGNED')throw new ConflictException('ADMIN_DOCUMENT_MUST_BE_SIGNED');
    const sourcePayload=source.payload&&typeof source.payload==='object'&&!Array.isArray(source.payload)?source.payload as Record<string,unknown>:{};
    const subjectCandidate=[sourcePayload.subject,sourcePayload.title,sourcePayload.summary,sourcePayload.recipientAndSubject,sourcePayload.outgoingRef,sourcePayload.incomingRef]
      .find(value=>typeof value==='string'&&value.trim().length>0);
    const subject=String(subjectCandidate??source.template.titleAr).trim().slice(0,500);
    return this.db.serializable(async tx=>{
      await this.assertPermission(actorAccountId,input.organizationId,'REGISTER',[input.unitId],tx);
      const target=await tx.orgUnit.findUniqueOrThrow({where:{id:input.unitId},select:{organizationId:true,active:true}});
      if(target.organizationId!==input.organizationId||!target.active)throw new ForbiddenException('ADMIN_RECORD_UNIT_SCOPE_DENIED');
      await tx.$queryRaw`SELECT "id" FROM "ManagedDocument" WHERE "id"::text=${input.managedDocumentId} FOR UPDATE`;
      const document=await tx.managedDocument.findFirst({where:{id:input.managedDocumentId,organizationId:input.organizationId},include:{template:true}});
      if(!document||document.template.department!=='ADMIN_AFFAIRS_RECORDS')throw new ForbiddenException('ADMIN_DOCUMENT_ORGANIZATION_SCOPE_DENIED');
      if(document.status!=='SIGNED'||document.version!==source.version||document.contentHash!==source.contentHash)throw new ConflictException('ADMIN_DOCUMENT_SNAPSHOT_CHANGED');
      const revision=await tx.documentRevision.findUnique({where:{documentId_version:{documentId:document.id,version:document.version}}});
      if(!revision||revision.contentHash!==document.contentHash)throw new ConflictException('ADMIN_DOCUMENT_REVISION_MISSING');
      const duplicate=await tx.administrativeRecord.findFirst({where:{organizationId:input.organizationId,referenceNumber:document.referenceNumber},select:{id:true}});
      if(duplicate)throw new ConflictException('ADMIN_DOCUMENT_ALREADY_REGISTERED');
      const created=await tx.administrativeRecord.create({data:{
        organizationId:input.organizationId,unitId:input.unitId,type:document.template.code,
        referenceNumber:document.referenceNumber,subject,status:'DRAFT',ownerAccountId:actorAccountId,
        managedDocumentId:document.id,managedDocumentVersion:document.version,managedDocumentContentHash:document.contentHash,
      }});
      const actor=await tx.account.findUniqueOrThrow({where:{id:actorAccountId},select:{personId:true}});
      await tx.auditEvent.create({data:{actorId:actor.personId,action:'ADMIN_RECORD_CREATED_FROM_DOCUMENT',resource:'AdministrativeRecord',resourceId:created.id,metadata:{organizationId:input.organizationId,managedDocumentId:document.id,version:document.version}}});
      return tx.administrativeRecord.findUniqueOrThrow({where:{id:created.id},include:{managedDocument:{include:{template:true,revisions:{orderBy:{version:'asc'}}}}}});
    });
  }

  async listRecords(accountId:string,organizationId:string,filters:{q?:string;status?:string}={}){
    if(!organizationId?.trim())throw new BadRequestException('ADMIN_ORGANIZATION_REQUIRED');
    const q=String(filters.q??'').trim();
    if(q.length>160)throw new BadRequestException('ADMIN_SEARCH_QUERY_TOO_LONG');
    const allowedStatuses=['DRAFT','REGISTERED','ARCHIVED'];
    if(filters.status&&!allowedStatuses.includes(filters.status))throw new BadRequestException('ADMIN_RECORD_STATUS_INVALID');
    const scope=await this.readUnitScope(accountId,organizationId);
    await this.assertPermission(accountId,organizationId,'READ',scope??[]);
    const where:any={organizationId,...(filters.status?{status:filters.status}:{}),...(scope?{unitId:{in:scope}}:{}),...(q?{OR:[
      {referenceNumber:{contains:q,mode:'insensitive'}},{subject:{contains:q,mode:'insensitive'}},{type:{contains:q,mode:'insensitive'}},
    ]}:{})};
    return this.db.administrativeRecord.findMany({where,orderBy:[{updatedAt:'desc'},{createdAt:'desc'}],take:100,include:{
      managedDocument:{include:{template:true,revisions:{orderBy:{version:'asc'}}}},
      routings:{orderBy:{createdAt:'desc'}},
    }});
  }

  async getRecord(accountId:string,recordId:string){
    const record=await this.db.administrativeRecord.findUnique({where:{id:recordId},select:{id:true,organizationId:true,unitId:true}});
    if(!record)throw new BadRequestException('ADMIN_RECORD_NOT_FOUND');
    const scope=await this.readUnitScope(accountId,record.organizationId);
    await this.assertPermission(accountId,record.organizationId,'READ',[record.unitId],this.db);
    if(scope&&!scope.includes(record.unitId))throw new ForbiddenException('ADMIN_UNIT_SCOPE_DENIED');
    return this.db.administrativeRecord.findUniqueOrThrow({where:{id:record.id},include:{
      managedDocument:{include:{template:true,revisions:{orderBy:{version:'asc'}}}},
      routings:{orderBy:{createdAt:'desc'}},
    }});
  }

  async assertMember(accountId:string, organizationId:string) {
    const member=await this.db.organizationMember.findFirst({where:{accountId,organizationId,status:'ACTIVE'},select:{id:true}});
    if(!member) throw new ForbiddenException('ADMIN_ORGANIZATION_SCOPE_DENIED');
  }

  private async assertAssigneeEligible(accountId:string, organizationId:string, unitId:string) {
    const member=await this.db.organizationMember.findFirst({where:{accountId,organizationId,status:'ACTIVE'},select:{role:true}});
    if(!member) throw new ForbiddenException('ADMIN_ASSIGNEE_NOT_ELIGIBLE');
    if(member.role==='OWNER'||member.role==='ADMIN') return;
    const assignments=await this.db.roleAssignment.findMany({where:{accountId,status:'ACTIVE'},select:{role:true,scope:true}});
    const eligible=assignments.some(a=>{
      if(!['CENTER_MANAGER','REVIEWER','EXECUTIVE_APPROVER','STAFF','OPERATOR'].includes(a.role)) return false;
      const x=a.scope;
      if(!x||Array.isArray(x)||typeof x!=='object') return false;
      const scope=x as {organizationIds?:unknown,unitIds?:unknown,centerIds?:unknown};
      if(!Array.isArray(scope.organizationIds)||!scope.organizationIds.includes(organizationId)) return false;
      const ids=Array.isArray(scope.unitIds)?scope.unitIds:Array.isArray(scope.centerIds)?scope.centerIds:[];
      return ids.includes(unitId);
    });
    if(!eligible) throw new ForbiddenException('ADMIN_ASSIGNEE_NOT_ELIGIBLE');
  }

  async registerRecord(recordId:string, actorAccountId:string, expectedLicense?:{updatedAt:Date;licenseAssetId:string|null;licenseIssuedAt:Date|null;licenseExpiresAt:Date|null}) {
    const record=await this.db.administrativeRecord.findUniqueOrThrow({where:{id:recordId},select:{id:true,organizationId:true,unitId:true,status:true}});
    await this.assertPermission(actorAccountId,record.organizationId,'REGISTER',[record.unitId]);
    const result=await this.db.$transaction(async tx=>{
      const updated=await tx.administrativeRecord.updateMany({where:{id:record.id,status:'DRAFT',...expectedLicense},data:{status:'REGISTERED'}});
      if(updated.count!==1) throw new ConflictException('ADMIN_RECORD_CONCURRENT_MODIFICATION');
      const actor=await tx.account.findUniqueOrThrow({where:{id:actorAccountId},select:{personId:true}});
      await tx.auditEvent.create({data:{actorId:actor.personId,action:'ADMIN_RECORD_REGISTERED',resource:'AdministrativeRecord',resourceId:record.id,metadata:{organizationId:record.organizationId}}});
      return tx.administrativeRecord.findUniqueOrThrow({where:{id:record.id}});
    });
    return result;
  }

  async archiveRecord(recordId:string, actorAccountId:string) {
    const record=await this.db.administrativeRecord.findUniqueOrThrow({where:{id:recordId},select:{id:true,organizationId:true,unitId:true,status:true,licenseReviewStatus:true,managedDocumentId:true,managedDocumentVersion:true,managedDocumentContentHash:true}});
    await this.assertPermission(actorAccountId,record.organizationId,'ARCHIVE',[record.unitId]);
    if(record.licenseReviewStatus==='PENDING')throw new ConflictException('License is awaiting platform review.');
    return this.db.serializable(async tx=>{
      await this.lockRegisteredRecord(tx,record.id);
      if(record.managedDocumentId){
        const incomplete=await tx.administrativeRouting.findFirst({where:{recordId:record.id,OR:[{decision:null},{decision:{not:null},deliveredAt:null}]},select:{id:true}});
        if(incomplete)throw new ConflictException('ADMIN_ARCHIVE_ROUTING_INCOMPLETE');
        if(!record.managedDocumentVersion||!record.managedDocumentContentHash)throw new ConflictException('ADMIN_DOCUMENT_SNAPSHOT_MISSING');
        await this.documents.archiveInTransaction(tx,actorAccountId,record.managedDocumentId,record.managedDocumentVersion,record.managedDocumentContentHash);
      }
      const updated=await tx.administrativeRecord.updateMany({where:{id:record.id,status:'REGISTERED',OR:[{licenseReviewStatus:null},{licenseReviewStatus:{not:'PENDING'}}]},data:{status:'ARCHIVED'}});
      if(updated.count!==1) throw new ConflictException('ADMIN_RECORD_CONCURRENT_MODIFICATION');
      const actor=await tx.account.findUniqueOrThrow({where:{id:actorAccountId},select:{personId:true}});
      await tx.auditEvent.create({data:{actorId:actor.personId,action:'ADMIN_RECORD_ARCHIVED',resource:'AdministrativeRecord',resourceId:record.id,metadata:{organizationId:record.organizationId,managedDocumentId:record.managedDocumentId}}});
      return tx.administrativeRecord.findUniqueOrThrow({where:{id:record.id},include:{managedDocument:true}});
    });
  }

  async scheduleMeeting(input:{organizationId:string,unitId:string,title:string,startsAt:Date,endsAt:Date,participantAccountIds:string[],resourceIds?:string[]}, actorAccountId:string) {
    if(!input.title?.trim()||!(input.startsAt instanceof Date)||!(input.endsAt instanceof Date)||input.endsAt<=input.startsAt) throw new BadRequestException('ADMIN_MEETING_TIME_INVALID');
    await this.assertPermission(actorAccountId,input.organizationId,'SCHEDULE_MEETING',[input.unitId]);
    const unit=await this.db.orgUnit.findUniqueOrThrow({where:{id:input.unitId},select:{organizationId:true,active:true}});
    if(unit.organizationId!==input.organizationId||!unit.active) throw new ForbiddenException('ADMIN_MEETING_UNIT_SCOPE_DENIED');
    for(const accountId of new Set([actorAccountId,...input.participantAccountIds])) await this.assertMember(accountId,input.organizationId);
    const resourceIds=[...new Set(input.resourceIds??[])].sort();
    return this.db.serializable(async tx=>{
      if(resourceIds.length){
        const locked=await tx.$queryRawUnsafe<Array<{id:string}>>(
          `SELECT "id" FROM "CalendarResource" WHERE "id" = ANY($1::text[]) AND "active" = true ORDER BY "id" FOR UPDATE`,
          resourceIds,
        );
        if(locked.length!==resourceIds.length) throw new BadRequestException('ADMIN_MEETING_RESOURCE_INVALID');
        const conflict=await tx.calendarAllocation.findFirst({where:{resourceId:{in:resourceIds},status:'ACTIVE',startsAt:{lt:input.endsAt},endsAt:{gt:input.startsAt}},select:{id:true}});
        if(conflict) throw new ConflictException('CALENDAR_RESOURCE_CONFLICT');
      }
      const meeting=await tx.administrativeMeeting.create({data:{organizationId:input.organizationId,unitId:input.unitId,title:input.title.trim(),scheduledAt:input.startsAt,organizerAccountId:actorAccountId,participantAccountIds:input.participantAccountIds}});
      const event=await tx.calendarEvent.create({data:{organizationId:input.organizationId,type:'ADMINISTRATIVE_MEETING',referenceType:'ADMINISTRATIVE_MEETING',referenceId:meeting.id,title:meeting.title,startsAt:input.startsAt,endsAt:input.endsAt}});
      if(resourceIds.length) await tx.calendarAllocation.createMany({data:resourceIds.map(resourceId=>({eventId:event.id,resourceId,startsAt:input.startsAt,endsAt:input.endsAt,status:'ACTIVE'}))});
      const actor=await tx.account.findUniqueOrThrow({where:{id:actorAccountId},select:{personId:true}});
      await tx.auditEvent.create({data:{actorId:actor.personId,action:'ADMIN_MEETING_SCHEDULED',resource:'AdministrativeMeeting',resourceId:meeting.id,metadata:{organizationId:input.organizationId,calendarEventId:event.id}}});
      return {meeting,event};
    });
  }

  async route(recordId:string,toUnitId:string,actorAccountId:string) {
    if(!toUnitId) throw new BadRequestException('ADMIN_ROUTING_TARGET_REQUIRED');
    const record=await this.db.administrativeRecord.findUniqueOrThrow({where:{id:recordId},select:{id:true,organizationId:true,unitId:true,status:true}});
    await this.assertPermission(actorAccountId,record.organizationId,'ROUTE',[record.unitId,toUnitId]);
    if(record.status!=='REGISTERED') throw new ConflictException('ADMIN_RECORD_NOT_REGISTERED');
    if(record.unitId===toUnitId) throw new BadRequestException('ADMIN_ROUTING_DISTINCT_UNITS_REQUIRED');
    const target=await this.db.orgUnit.findUniqueOrThrow({where:{id:toUnitId},select:{organizationId:true,active:true}});
    if(target.organizationId!==record.organizationId||!target.active) throw new ForbiddenException('ADMIN_ROUTING_SCOPE_DENIED');
    return this.db.$transaction(async tx=>{
      await this.lockRegisteredRecord(tx,record.id);
      const routing=await tx.administrativeRouting.create({data:{organizationId:record.organizationId,recordId:record.id,fromUnitId:record.unitId,toUnitId,requestedByAccountId:actorAccountId}});
      const actor=await tx.account.findUniqueOrThrow({where:{id:actorAccountId},select:{personId:true}});
      await tx.auditEvent.create({data:{actorId:actor.personId,action:'ADMIN_ROUTING_CREATED',resource:'AdministrativeRouting',resourceId:routing.id,metadata:{organizationId:record.organizationId}}});
      return routing;
    });
  }

  async reply(routingId:string,replyText:string,actorAccountId:string){
    const text=String(replyText??'').trim();
    if(text.length<3||text.length>5000)throw new BadRequestException('ADMIN_REPLY_TEXT_INVALID');
    const routing=await this.db.administrativeRouting.findUniqueOrThrow({where:{id:routingId},select:{id:true,recordId:true,organizationId:true,toUnitId:true,requestedByAccountId:true,assignedToAccountId:true,decision:true,repliedAt:true}});
    await this.assertPermission(actorAccountId,routing.organizationId,'DECIDE',[routing.toUnitId]);
    if(!routing.assignedToAccountId||routing.assignedToAccountId!==actorAccountId)throw new ForbiddenException('ADMIN_REPLY_ASSIGNEE_REQUIRED');
    if(routing.requestedByAccountId===actorAccountId)throw new ForbiddenException('ADMIN_SELF_REPLY_DENIED');
    if(routing.decision||routing.repliedAt)throw new ConflictException('ADMIN_ROUTING_ALREADY_REPLIED');
    return this.db.serializable(async tx=>{
      await this.lockRegisteredRecord(tx,routing.recordId);
      const updated=await tx.administrativeRouting.updateMany({where:{id:routing.id,decision:null,repliedAt:null,assignedToAccountId:actorAccountId},data:{replyText:text,repliedByAccountId:actorAccountId,repliedAt:new Date()}});
      if(updated.count!==1)throw new ConflictException('ADMIN_ROUTING_CONCURRENT_MODIFICATION');
      const actor=await tx.account.findUniqueOrThrow({where:{id:actorAccountId},select:{personId:true}});
      await tx.auditEvent.create({data:{actorId:actor.personId,action:'ADMIN_ROUTING_REPLIED',resource:'AdministrativeRouting',resourceId:routing.id,metadata:{organizationId:routing.organizationId}}});
      return tx.administrativeRouting.findUniqueOrThrow({where:{id:routing.id}});
    });
  }

  async assign(routingId:string,assigneeAccountId:string,actorAccountId:string) {
    const routing=await this.db.administrativeRouting.findUniqueOrThrow({where:{id:routingId},select:{id:true,recordId:true,organizationId:true,toUnitId:true,decision:true,assignedToAccountId:true}});
    await this.assertPermission(actorAccountId,routing.organizationId,'ASSIGN',[routing.toUnitId]); await this.assertAssigneeEligible(assigneeAccountId,routing.organizationId,routing.toUnitId);
    if(routing.decision) throw new ConflictException('ADMIN_ROUTING_ALREADY_DECIDED');
    return this.db.$transaction(async tx=>{
      await this.lockRegisteredRecord(tx,routing.recordId);
      const updated=await tx.administrativeRouting.updateMany({where:{id:routing.id,decision:null,assignedToAccountId:routing.assignedToAccountId},data:{assignedToAccountId:assigneeAccountId}});
      if(updated.count!==1) throw new ConflictException('ADMIN_ROUTING_CONCURRENT_MODIFICATION');
      const actor=await tx.account.findUniqueOrThrow({where:{id:actorAccountId},select:{personId:true}});
      await tx.auditEvent.create({data:{actorId:actor.personId,action:'ADMIN_ROUTING_ASSIGNED',resource:'AdministrativeRouting',resourceId:routing.id,metadata:{organizationId:routing.organizationId,assigneeAccountId}}});
      return tx.administrativeRouting.findUniqueOrThrow({where:{id:routing.id}});
    });
  }

  async deliver(routingId:string,actorAccountId:string){
    const routing=await this.db.administrativeRouting.findUniqueOrThrow({where:{id:routingId},select:{id:true,recordId:true,organizationId:true,fromUnitId:true,requestedByAccountId:true,decision:true,replyText:true,deliveredAt:true}});
    await this.assertPermission(actorAccountId,routing.organizationId,'ROUTE',[routing.fromUnitId]);
    if(routing.requestedByAccountId!==actorAccountId)throw new ForbiddenException('ADMIN_DELIVERY_REQUESTER_REQUIRED');
    if(!routing.decision||!routing.replyText)throw new ConflictException('ADMIN_ROUTING_REPLY_REQUIRED');
    if(routing.deliveredAt)throw new ConflictException('ADMIN_ROUTING_ALREADY_DELIVERED');
    return this.db.serializable(async tx=>{
      await this.lockRegisteredRecord(tx,routing.recordId);
      const updated=await tx.administrativeRouting.updateMany({where:{id:routing.id,decision:{not:null},replyText:{not:null},deliveredAt:null,requestedByAccountId:actorAccountId},data:{deliveredByAccountId:actorAccountId,deliveredAt:new Date()}});
      if(updated.count!==1)throw new ConflictException('ADMIN_ROUTING_CONCURRENT_MODIFICATION');
      const actor=await tx.account.findUniqueOrThrow({where:{id:actorAccountId},select:{personId:true}});
      await tx.auditEvent.create({data:{actorId:actor.personId,action:'ADMIN_ROUTING_DELIVERED',resource:'AdministrativeRouting',resourceId:routing.id,metadata:{organizationId:routing.organizationId,decision:routing.decision}}});
      return tx.administrativeRouting.findUniqueOrThrow({where:{id:routing.id}});
    });
  }

  async decide(routingId:string,decision:'APPROVE'|'REJECT',actorAccountId:string) {
    const routing=await this.db.administrativeRouting.findUniqueOrThrow({where:{id:routingId},select:{id:true,recordId:true,organizationId:true,toUnitId:true,requestedByAccountId:true,assignedToAccountId:true,decision:true,replyText:true,repliedByAccountId:true}});
    await this.assertPermission(actorAccountId,routing.organizationId,'DECIDE',[routing.toUnitId]);
    if(!routing.assignedToAccountId) throw new ConflictException('ADMIN_ROUTING_UNASSIGNED');
    if(routing.assignedToAccountId!==actorAccountId) throw new ForbiddenException('ADMIN_APPROVER_NOT_ASSIGNED');
    if(routing.requestedByAccountId===actorAccountId) throw new ForbiddenException('ADMIN_SELF_APPROVAL_DENIED');
    const parent=await this.db.administrativeRecord.findUnique({where:{id:routing.recordId},select:{managedDocumentId:true}});
    if(parent?.managedDocumentId&&(!routing.replyText||routing.repliedByAccountId!==actorAccountId))throw new ConflictException('ADMIN_ROUTING_REPLY_REQUIRED');
    if(routing.decision) throw new ConflictException('ADMIN_ROUTING_ALREADY_DECIDED');
    return this.db.serializable(async tx=>{
      await this.lockRegisteredRecord(tx,routing.recordId);
      const updated=await tx.administrativeRouting.updateMany({where:{id:routing.id,decision:null,assignedToAccountId:actorAccountId,...(parent?.managedDocumentId?{replyText:{not:null},repliedByAccountId:actorAccountId}:{})},data:{decision,decidedByAccountId:actorAccountId,decidedAt:new Date()}});
      if(updated.count!==1) throw new ConflictException('ADMIN_ROUTING_CONCURRENT_MODIFICATION');
      const actor=await tx.account.findUniqueOrThrow({where:{id:actorAccountId},select:{personId:true}});
      await tx.auditEvent.create({data:{actorId:actor.personId,action:`ADMIN_ROUTING_${decision}`,resource:'AdministrativeRouting',resourceId:routing.id,metadata:{organizationId:routing.organizationId}}});
      return tx.administrativeRouting.findUniqueOrThrow({where:{id:routing.id}});
    });
  }
}
