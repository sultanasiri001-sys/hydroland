import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuditService {
  constructor(private readonly db:DatabaseService){}

  private async resolveActorId(actorId:string|undefined,tx:Prisma.TransactionClient){
    if(!actorId)return undefined;
    const person=await tx.person.findUnique({where:{id:actorId},select:{id:true}});
    if(person)return person.id;
    const account=await tx.account.findUnique({where:{id:actorId},select:{personId:true}});
    return account?.personId;
  }

  async record(input:{actorId?:string;action:string;resource:string;resourceId?:string;metadata?:object},tx:Prisma.TransactionClient=this.db){
    const actorId=await this.resolveActorId(input.actorId,tx);
    return tx.auditEvent.create({data:{action:input.action,resource:input.resource,resourceId:input.resourceId,actorId,metadata:input.metadata as never}});
  }

  async recordWebhookOnce(input:{provider:string;eventId:string;eventType:string}){
    const replayKey=`${input.provider}:${input.eventId}`;
    return this.db.$transaction(async tx=>{
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${replayKey})::bigint)`;
      const existing=await tx.auditEvent.findFirst({
        where:{action:'integration.webhook.verified',resource:'integration.webhook',resourceId:replayKey},
        select:{id:true},
      });
      if(existing)return false;
      await tx.auditEvent.create({
        data:{
          action:'integration.webhook.verified',
          resource:'integration.webhook',
          resourceId:replayKey,
          metadata:{provider:input.provider,eventId:input.eventId,eventType:input.eventType},
        },
      });
      return true;
    });
  }

  async recordProviderState(provider:'OBJECT_STORAGE'|'WEATHER_MARINE'|'EMAIL'|'PAYMENT_PSP'|'AI_MODEL',category:'SUCCESS'|'PROVIDER_FAILURE'){
    const resourceId=`a06.provider.${provider}`;
    const state=category==='SUCCESS'?'AVAILABLE':'DEGRADED';
    return this.db.$transaction(async tx=>{
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${resourceId})::bigint)`;
      const latest=await tx.auditEvent.findFirst({
        where:{resource:'integration.provider.health',resourceId},
        orderBy:{occurredAt:'desc'},
        select:{metadata:true},
      });
      const metadata=latest?.metadata;
      if(metadata&&typeof metadata==='object'&&!Array.isArray(metadata)
        &&(metadata as Record<string,unknown>).category===category)return false;
      await tx.auditEvent.create({data:{
        action:'integration.provider.health.observed',
        resource:'integration.provider.health',
        resourceId,
        metadata:{provider,state,category},
      }});
      return true;
    });
  }

  async providerHealth(){
    const providers=['OBJECT_STORAGE','WEATHER_MARINE','EMAIL','PAYMENT_PSP','AI_MODEL'] as const;
    const resourceIds=providers.map(provider=>`a06.provider.${provider}`);
    const events=await this.db.auditEvent.findMany({
      where:{resource:'integration.provider.health',resourceId:{in:resourceIds}},
      orderBy:{occurredAt:'desc'},
      select:{resourceId:true,metadata:true,occurredAt:true},
    });
    const latest=new Map<string,typeof events[number]>();
    for(const event of events)if(event.resourceId&&!latest.has(event.resourceId))latest.set(event.resourceId,event);
    return providers.map(provider=>{
      const event=latest.get(`a06.provider.${provider}`);
      const metadata=event?.metadata;
      const values=metadata&&typeof metadata==='object'&&!Array.isArray(metadata)?metadata as Record<string,unknown>:{};
      const state=values.state==='AVAILABLE'||values.state==='DEGRADED'?values.state:'UNKNOWN';
      const category=values.category==='SUCCESS'||values.category==='PROVIDER_FAILURE'?values.category:null;
      return{provider,state,category,observedAt:event?.occurredAt.toISOString()??null};
    });
  }

  async mine(accountId:string){
    const account=await this.db.account.findUnique({where:{id:accountId},select:{personId:true}});
    if(!account)return [];
    return this.db.auditEvent.findMany({where:{actorId:account.personId},orderBy:{occurredAt:'desc'},take:100});
  }
}
