import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AdministrativeAffairsPersistenceService {
  constructor(private readonly db: DatabaseService) {}

  async assertMember(accountId:string, organizationId:string) {
    const member=await this.db.organizationMember.findFirst({where:{accountId,organizationId,status:'ACTIVE'},select:{id:true}});
    if(!member) throw new ForbiddenException('ADMIN_ORGANIZATION_SCOPE_DENIED');
  }

  async registerRecord(recordId:string, actorAccountId:string) {
    const record=await this.db.administrativeRecord.findUniqueOrThrow({where:{id:recordId},select:{id:true,organizationId:true,status:true}});
    await this.assertMember(actorAccountId,record.organizationId);
    const result=await this.db.$transaction(async tx=>{
      const updated=await tx.administrativeRecord.updateMany({where:{id:record.id,status:'DRAFT'},data:{status:'REGISTERED'}});
      if(updated.count!==1) throw new ConflictException('ADMIN_RECORD_CONCURRENT_MODIFICATION');
      const actor=await tx.account.findUniqueOrThrow({where:{id:actorAccountId},select:{personId:true}});
      await tx.auditEvent.create({data:{actorId:actor.personId,action:'ADMIN_RECORD_REGISTERED',resource:'AdministrativeRecord',resourceId:record.id,metadata:{organizationId:record.organizationId}}});
      return tx.administrativeRecord.findUniqueOrThrow({where:{id:record.id}});
    });
    return result;
  }

  async route(recordId:string,toUnitId:string,actorAccountId:string) {
    if(!toUnitId) throw new BadRequestException('ADMIN_ROUTING_TARGET_REQUIRED');
    const record=await this.db.administrativeRecord.findUniqueOrThrow({where:{id:recordId},select:{id:true,organizationId:true,unitId:true,status:true}});
    await this.assertMember(actorAccountId,record.organizationId);
    if(record.status!=='REGISTERED') throw new ConflictException('ADMIN_RECORD_NOT_REGISTERED');
    if(record.unitId===toUnitId) throw new BadRequestException('ADMIN_ROUTING_DISTINCT_UNITS_REQUIRED');
    const target=await this.db.administrativeUnit.findUniqueOrThrow({where:{id:toUnitId},select:{organizationId:true,active:true}});
    if(target.organizationId!==record.organizationId||!target.active) throw new ForbiddenException('ADMIN_ROUTING_SCOPE_DENIED');
    return this.db.$transaction(async tx=>{
      const routing=await tx.administrativeRouting.create({data:{organizationId:record.organizationId,recordId:record.id,fromUnitId:record.unitId,toUnitId,requestedByAccountId:actorAccountId}});
      const actor=await tx.account.findUniqueOrThrow({where:{id:actorAccountId},select:{personId:true}});
      await tx.auditEvent.create({data:{actorId:actor.personId,action:'ADMIN_ROUTING_CREATED',resource:'AdministrativeRouting',resourceId:routing.id,metadata:{organizationId:record.organizationId}}});
      return routing;
    });
  }

  async assign(routingId:string,assigneeAccountId:string,actorAccountId:string) {
    const routing=await this.db.administrativeRouting.findUniqueOrThrow({where:{id:routingId},select:{id:true,organizationId:true,decision:true,assignedToAccountId:true}});
    await this.assertMember(actorAccountId,routing.organizationId); await this.assertMember(assigneeAccountId,routing.organizationId);
    if(routing.decision) throw new ConflictException('ADMIN_ROUTING_ALREADY_DECIDED');
    const updated=await this.db.administrativeRouting.updateMany({where:{id:routing.id,decision:null,assignedToAccountId:routing.assignedToAccountId},data:{assignedToAccountId:assigneeAccountId}});
    if(updated.count!==1) throw new ConflictException('ADMIN_ROUTING_CONCURRENT_MODIFICATION');
    return this.db.administrativeRouting.findUniqueOrThrow({where:{id:routing.id}});
  }

  async decide(routingId:string,decision:'APPROVE'|'REJECT',actorAccountId:string) {
    const routing=await this.db.administrativeRouting.findUniqueOrThrow({where:{id:routingId},select:{id:true,organizationId:true,requestedByAccountId:true,assignedToAccountId:true,decision:true}});
    await this.assertMember(actorAccountId,routing.organizationId);
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
