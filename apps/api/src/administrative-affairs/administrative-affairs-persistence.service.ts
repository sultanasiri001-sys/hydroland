import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AdministrativeAffairsPersistenceService {
  constructor(private readonly db: DatabaseService) {}

  private async assertPermission(accountId:string, organizationId:string, action:'REGISTER'|'ROUTE'|'ASSIGN'|'DECIDE'|'ARCHIVE'|'SCHEDULE_MEETING', unitIds:string[] = []) {
    const member=await this.db.organizationMember.findFirst({where:{accountId,organizationId,status:'ACTIVE'},select:{role:true}});
    if(!member) throw new ForbiddenException('ADMIN_ORGANIZATION_SCOPE_DENIED');
    const assignments=await this.db.roleAssignment.findMany({where:{accountId,status:'ACTIVE'},select:{role:true,scope:true}});
    const scoped=assignments.filter(a=>{const x=a.scope;if(!x||Array.isArray(x)||typeof x!=='object')return false;const ids=(x as {organizationIds?:unknown}).organizationIds;return Array.isArray(ids)&&ids.includes(organizationId);});
    const roles=new Set<string>([member.role,...scoped.map(a=>a.role)]);
    const globalAuthority=member.role==='OWNER'||member.role==='ADMIN'||roles.has('OWNER')||roles.has('ADMIN');
    if(!globalAuthority&&roles.has('CENTER_MANAGER')&&unitIds.length){
      const unitScoped=scoped.some(a=>{const x=a.scope as {unitIds?:unknown,centerIds?:unknown};const ids=Array.isArray(x.unitIds)?x.unitIds:Array.isArray(x.centerIds)?x.centerIds:[];return unitIds.every(id=>ids.includes(id));});
      if(!unitScoped) throw new ForbiddenException('ADMIN_UNIT_SCOPE_DENIED');
    }
    const allowed:Record<typeof action,string[]>={
      REGISTER:['OWNER','ADMIN','OPERATOR','STAFF','CENTER_MANAGER'],
      ROUTE:['OWNER','ADMIN','OPERATOR','STAFF','CENTER_MANAGER'],
      ASSIGN:['OWNER','ADMIN','CENTER_MANAGER'],
      DECIDE:['OWNER','ADMIN','CENTER_MANAGER','REVIEWER','EXECUTIVE_APPROVER'],
      ARCHIVE:['OWNER','ADMIN','OPERATOR','STAFF','CENTER_MANAGER'],
      SCHEDULE_MEETING:['OWNER','ADMIN','OPERATOR','STAFF','CENTER_MANAGER'],
    };
    if(!allowed[action].some(role=>roles.has(role))) throw new ForbiddenException(`ADMIN_PERMISSION_REQUIRED:${action}`);
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

  async registerRecord(recordId:string, actorAccountId:string) {
    const record=await this.db.administrativeRecord.findUniqueOrThrow({where:{id:recordId},select:{id:true,organizationId:true,unitId:true,status:true}});
    await this.assertPermission(actorAccountId,record.organizationId,'REGISTER',[record.unitId]);
    const result=await this.db.$transaction(async tx=>{
      const updated=await tx.administrativeRecord.updateMany({where:{id:record.id,status:'DRAFT'},data:{status:'REGISTERED'}});
      if(updated.count!==1) throw new ConflictException('ADMIN_RECORD_CONCURRENT_MODIFICATION');
      const actor=await tx.account.findUniqueOrThrow({where:{id:actorAccountId},select:{personId:true}});
      await tx.auditEvent.create({data:{actorId:actor.personId,action:'ADMIN_RECORD_REGISTERED',resource:'AdministrativeRecord',resourceId:record.id,metadata:{organizationId:record.organizationId}}});
      return tx.administrativeRecord.findUniqueOrThrow({where:{id:record.id}});
    });
    return result;
  }

  async archiveRecord(recordId:string, actorAccountId:string) {
    const record=await this.db.administrativeRecord.findUniqueOrThrow({where:{id:recordId},select:{id:true,organizationId:true,unitId:true,status:true}});
    await this.assertPermission(actorAccountId,record.organizationId,'ARCHIVE',[record.unitId]);
    return this.db.$transaction(async tx=>{
      const updated=await tx.administrativeRecord.updateMany({where:{id:record.id,status:'REGISTERED'},data:{status:'ARCHIVED'}});
      if(updated.count!==1) throw new ConflictException('ADMIN_RECORD_CONCURRENT_MODIFICATION');
      const actor=await tx.account.findUniqueOrThrow({where:{id:actorAccountId},select:{personId:true}});
      await tx.auditEvent.create({data:{actorId:actor.personId,action:'ADMIN_RECORD_ARCHIVED',resource:'AdministrativeRecord',resourceId:record.id,metadata:{organizationId:record.organizationId}}});
      return tx.administrativeRecord.findUniqueOrThrow({where:{id:record.id}});
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
      const routing=await tx.administrativeRouting.create({data:{organizationId:record.organizationId,recordId:record.id,fromUnitId:record.unitId,toUnitId,requestedByAccountId:actorAccountId}});
      const actor=await tx.account.findUniqueOrThrow({where:{id:actorAccountId},select:{personId:true}});
      await tx.auditEvent.create({data:{actorId:actor.personId,action:'ADMIN_ROUTING_CREATED',resource:'AdministrativeRouting',resourceId:routing.id,metadata:{organizationId:record.organizationId}}});
      return routing;
    });
  }

  async assign(routingId:string,assigneeAccountId:string,actorAccountId:string) {
    const routing=await this.db.administrativeRouting.findUniqueOrThrow({where:{id:routingId},select:{id:true,organizationId:true,toUnitId:true,decision:true,assignedToAccountId:true}});
    await this.assertPermission(actorAccountId,routing.organizationId,'ASSIGN',[routing.toUnitId]); await this.assertAssigneeEligible(assigneeAccountId,routing.organizationId,routing.toUnitId);
    if(routing.decision) throw new ConflictException('ADMIN_ROUTING_ALREADY_DECIDED');
    return this.db.$transaction(async tx=>{
      const updated=await tx.administrativeRouting.updateMany({where:{id:routing.id,decision:null,assignedToAccountId:routing.assignedToAccountId},data:{assignedToAccountId:assigneeAccountId}});
      if(updated.count!==1) throw new ConflictException('ADMIN_ROUTING_CONCURRENT_MODIFICATION');
      const actor=await tx.account.findUniqueOrThrow({where:{id:actorAccountId},select:{personId:true}});
      await tx.auditEvent.create({data:{actorId:actor.personId,action:'ADMIN_ROUTING_ASSIGNED',resource:'AdministrativeRouting',resourceId:routing.id,metadata:{organizationId:routing.organizationId,assigneeAccountId}}});
      return tx.administrativeRouting.findUniqueOrThrow({where:{id:routing.id}});
    });
  }

  async decide(routingId:string,decision:'APPROVE'|'REJECT',actorAccountId:string) {
    const routing=await this.db.administrativeRouting.findUniqueOrThrow({where:{id:routingId},select:{id:true,organizationId:true,toUnitId:true,requestedByAccountId:true,assignedToAccountId:true,decision:true}});
    await this.assertPermission(actorAccountId,routing.organizationId,'DECIDE',[routing.toUnitId]);
    if(!routing.assignedToAccountId) throw new ConflictException('ADMIN_ROUTING_UNASSIGNED');
    if(routing.assignedToAccountId!==actorAccountId) throw new ForbiddenException('ADMIN_APPROVER_NOT_ASSIGNED');
    if(routing.requestedByAccountId===actorAccountId) throw new ForbiddenException('ADMIN_SELF_APPROVAL_DENIED');
    if(routing.decision) throw new ConflictException('ADMIN_ROUTING_ALREADY_DECIDED');
    return this.db.$transaction(async tx=>{
      const updated=await tx.administrativeRouting.updateMany({where:{id:routing.id,decision:null,assignedToAccountId:actorAccountId},data:{decision,decidedByAccountId:actorAccountId,decidedAt:new Date()}});
      if(updated.count!==1) throw new ConflictException('ADMIN_ROUTING_CONCURRENT_MODIFICATION');
      const actor=await tx.account.findUniqueOrThrow({where:{id:actorAccountId},select:{personId:true}});
      await tx.auditEvent.create({data:{actorId:actor.personId,action:`ADMIN_ROUTING_${decision}`,resource:'AdministrativeRouting',resourceId:routing.id,metadata:{organizationId:routing.organizationId}}});
      return tx.administrativeRouting.findUniqueOrThrow({where:{id:routing.id}});
    });
  }
}
