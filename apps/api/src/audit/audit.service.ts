import { observeSms, type SmsBinding } from '../integrations/unifonic-dlr';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { MarineReadKey, object, providerReadFailure, ProviderReadUnavailable, ProviderSource } from '../integrations/provider-read-policy';
import { inspectProviderCandidate, lockProviderSource, readProviderSource } from '../integrations/provider-read-source';

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

  providerReadSource(key: MarineReadKey, tx: Prisma.TransactionClient = this.db) { return readProviderSource(tx, key); }
  inspectProviderCandidate(actorId:string,key:MarineReadKey,documentId:string){return this.db.$transaction(tx=>inspectProviderCandidate(tx,actorId,key,documentId));}

  /** Append-only reservations survive transport/receipt failures. Changing a
   * document, API key or configured cap never resets the provider's UTC day. */
  private async reserveProviderRead(key: MarineReadKey, candidate: ProviderSource) {
    return this.db.$transaction(async tx => {
      const source = await lockProviderSource(tx, key, candidate);
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${'d03.provider.read:' + key})::bigint)`;
      const now = new Date(), day = now.toISOString().slice(0, 10), start = new Date(day + 'T00:00:00.000Z');
      const since = new Date(Math.min(start.getTime(),now.getTime()-60_000));
      const rows = await tx.auditEvent.findMany({ where: { resource: 'integration.provider.read', resourceId: key, occurredAt: { gte: since }, action: { in: ['provider.read.reserved','provider.read.result'] } }, select: { action: true, metadata: true, occurredAt: true }, take: 200001 });
      if (rows.length > 200000) return providerReadFailure('PROVIDER_DAILY_LIMIT');
      let count = 0, minute = 0, cost = 0;
      for (const row of rows) {
        const value = object(row.metadata);
        if (row.action === 'provider.read.result') {
          if(row.occurredAt<start)continue;
          if (value.reason === 'PROVIDER_QUOTA_EXHAUSTED') return providerReadFailure('PROVIDER_QUOTA_EXHAUSTED');
          if (value.reason === 'PROVIDER_ENTITLEMENT_REJECTED' && value.policyHash === source.policyHash) return providerReadFailure('PROVIDER_ENTITLEMENT_REJECTED');
          continue;
        }
        if (row.occurredAt.getTime() > now.getTime() - 60_000) minute++;
        if(row.occurredAt<start)continue;
        if (value.currency !== source.policy.currency || !Number.isSafeInteger(value.reservedCostMicros) || Number(value.reservedCostMicros) < 0) return providerReadFailure('PROVIDER_BUDGET_EVIDENCE_INVALID');
        count++; cost += Number(value.reservedCostMicros);
      }
      if (count >= source.policy.maxRequestsPerDay) return providerReadFailure('PROVIDER_DAILY_LIMIT');
      if (minute >= source.policy.maxRequestsPerMinute) return providerReadFailure('PROVIDER_RATE_LIMIT');
      if (!Number.isSafeInteger(cost) || cost + source.policy.maxCostMicrosPerRequest > source.policy.maxCostMicrosPerDay) return providerReadFailure('PROVIDER_COST_LIMIT');
      const event = await tx.auditEvent.create({ data: { action: 'provider.read.reserved', resource: 'integration.provider.read', resourceId: key, occurredAt:now, metadata: { day, policyHash: source.policyHash, documentId: source.documentId, documentVersion: source.version, sourceHash: source.sourceHash, currency: source.policy.currency, reservedCostMicros: source.policy.maxCostMicrosPerRequest, actualBilledCost: null } } });
      return { id: event.id, day, source };
    }, { maxWait: 10_000, timeout: 15_000 });
  }

  async withProviderRead<T>(key: MarineReadKey, operation: (source: ProviderSource) => Promise<T>): Promise<T> {
    const candidate = await this.providerReadSource(key);
    const reservation = await this.reserveProviderRead(key, candidate);
    try {
      // Deliberately not DatabaseService.serializable: a transport is called
      // once. Owner/source revocation is serialized with this bounded read.
      return await this.db.$transaction(async tx => {
        const source = await lockProviderSource(tx, key, reservation.source);
        if (new Date().toISOString().slice(0, 10) !== reservation.day) return providerReadFailure('PROVIDER_RESERVATION_EXPIRED');
        const result = await operation(source);
        if (Date.now() >= Date.parse(source.policy.validUntil)) return providerReadFailure('SOURCE_EXPIRED');
        await tx.auditEvent.create({ data: { action: 'provider.read.result', resource: 'integration.provider.read', resourceId: key, occurredAt:new Date(), metadata: { reservationId: reservation.id, policyHash: source.policyHash, outcome: 'DATA_RECEIVED', actualBilledCost: null } } });
        return result;
      }, { maxWait: 10_000, timeout: 20_000 });
    } catch (error) {
      const reason = error instanceof ProviderReadUnavailable ? error.reason : 'PROVIDER_READ_OR_AUDIT_FAILED';
      try { await this.db.auditEvent.create({ data: { action: 'provider.read.result', resource: 'integration.provider.read', resourceId: key, occurredAt:new Date(), metadata: { reservationId: reservation.id, policyHash: candidate.policyHash, outcome: 'UNAVAILABLE', reason, actualBilledCost: null } } }); } catch { /* Reservation remains charged; never retry a transport to repair its receipt. */ }
      if (error instanceof ProviderReadUnavailable) throw error;
      return providerReadFailure(reason);
    }
  }

  recordSmsSubmission(binding:SmsBinding){
    return this.db.$transaction(tx => observeSms(tx,binding,'submission'));
  }

  async recordWebhookOnce(input:{provider:string;eventId:string;eventType:string}, sms?:SmsBinding){
    const replayKey=`${input.provider}:${input.eventId}`;
    return this.db.$transaction(async tx=>{
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${replayKey})::bigint)`;
      const existing=await tx.auditEvent.findFirst({
        where:{action:'integration.webhook.verified',resource:'integration.webhook',resourceId:replayKey},
        select:{id:true},
      });
      if(existing)return false;
      if(sms) await observeSms(tx,sms,'dlr');
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
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${resourceId})::bigint)`;
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

  async providerHealth(tx: Prisma.TransactionClient = this.db) {
    const providers = ['OBJECT_STORAGE', 'WEATHER_MARINE', 'EMAIL', 'PAYMENT_PSP', 'AI_MODEL'] as const;
    // Each lookup uses the resource / resourceId / occurredAt index. One SQL
    // snapshot keeps the five readings consistent as transitions are recorded.
    const events = await tx.$queryRaw<Array<{
      provider: string; metadata: Prisma.JsonValue; occurredAt: Date | null;
    }>>`
      SELECT p.provider, latest.metadata, latest."occurredAt"
      FROM unnest(ARRAY[${Prisma.join([...providers])}]::text[]) WITH ORDINALITY AS p(provider, ord)
      LEFT JOIN LATERAL (
        SELECT metadata, "occurredAt" FROM "AuditEvent"
        WHERE resource = 'integration.provider.health' AND "resourceId" = 'a06.provider.' || p.provider
        ORDER BY "occurredAt" DESC, id DESC LIMIT 1
      ) latest ON true
      ORDER BY p.ord`;
    return events.map(({provider, metadata, occurredAt}) => {
      const values = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {};
      const state = values.state === 'AVAILABLE' || values.state === 'DEGRADED' ? values.state : 'UNKNOWN';
      const category = values.category === 'SUCCESS' || values.category === 'PROVIDER_FAILURE' ? values.category : null;
      return {provider, state, category, observedAt: occurredAt?.toISOString() ?? null};
    });
  }

  async mine(accountId:string){
    const account=await this.db.account.findUnique({where:{id:accountId},select:{personId:true}});
    if(!account)return [];
    return this.db.auditEvent.findMany({where:{actorId:account.personId},orderBy:{occurredAt:'desc'},take:100});
  }
}
