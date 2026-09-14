import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';

const RESOURCE_TYPES=['BOAT','INSTRUCTOR','CREW','CAPTAIN','SITE','EQUIPMENT'] as const;
type ResourceType=typeof RESOURCE_TYPES[number];
type ResourceRow={id:string;type:ResourceType;name:string;referenceId:string|null;active:boolean;createdAt:Date;updatedAt:Date};

@Injectable()
export class CalendarResourceService{
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService){}

  private normalizeType(value?:string):ResourceType{
    const type=value?.trim().toUpperCase();
    if(!type||!RESOURCE_TYPES.includes(type as ResourceType))throw new BadRequestException('Invalid calendar resource type.');
    return type as ResourceType;
  }

  async create(reviewerAccountId:string,input:{type?:string;name?:string;referenceId?:string|null}){
    const type=this.normalizeType(input.type),name=input.name?.trim(),referenceId=input.referenceId?.trim()||null;
    if(!name||name.length<2)throw new BadRequestException('Resource name is required.');
    if(['INSTRUCTOR','CREW','CAPTAIN'].includes(type)){
      if(!referenceId)throw new BadRequestException('Human resources require an account reference.');
      const account=await this.db.account.findUnique({where:{id:referenceId},select:{id:true,status:true}});
      if(!account||account.status!=='ACTIVE')throw new BadRequestException('Referenced account is missing or inactive.');
      const duplicate=await this.db.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "CalendarResource" WHERE "type"=${type} AND "referenceId"=${referenceId} AND "active"=TRUE LIMIT 1`;
      if(duplicate.length)throw new ConflictException('An active resource already exists for this account and type.');
    }
    const rows=await this.db.$queryRaw<ResourceRow[]>`INSERT INTO "CalendarResource"("id","type","name","referenceId","active","createdAt","updatedAt") VALUES(gen_random_uuid()::text,${type},${name},${referenceId},TRUE,NOW(),NOW()) RETURNING *`;
    const resource=rows[0];
    await this.audit.record({actorId:reviewerAccountId,action:'CALENDAR_RESOURCE_CREATED',resource:'CalendarResource',resourceId:resource.id,metadata:{type,name,referenceId}});
    return resource;
  }

  async setActive(reviewerAccountId:string,resourceId:string,active:boolean){
    const rows=await this.db.$queryRaw<ResourceRow[]>`SELECT * FROM "CalendarResource" WHERE "id"=${resourceId} LIMIT 1`;
    const current=rows[0];if(!current)throw new NotFoundException('Calendar resource not found.');
    if(current.active===active)return current;
    if(!active){
      const allocations=await this.db.$queryRaw<Array<{id:string;tripId:string}>>`SELECT a."id",a."tripId" FROM "CalendarAllocation" a JOIN "Trip" t ON t."id"=a."tripId" WHERE a."resourceId"=${resourceId} AND a."status"='ACTIVE' AND t."status" IN ('OPEN','CLOSED','DRAFT') AND t."endsAt">NOW() LIMIT 1`;
      if(allocations.length)throw new ConflictException('Resource has an active future allocation and cannot be disabled.');
    }
    const updated=await this.db.$queryRaw<ResourceRow[]>`UPDATE "CalendarResource" SET "active"=${active},"updatedAt"=NOW() WHERE "id"=${resourceId} RETURNING *`;
    await this.audit.record({actorId:reviewerAccountId,action:'CALENDAR_RESOURCE_STATUS_CHANGED',resource:'CalendarResource',resourceId,metadata:{previousActive:current.active,active,type:current.type,name:current.name,referenceId:current.referenceId}});
    return updated[0];
  }
}
