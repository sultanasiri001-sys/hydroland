import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { revealSecret } from '../auth/mfa-crypto';
import { DatabaseService } from '../database/database.service';
import { ChannelDispatch, CUSTOMER_CHANNEL_POLICY, NoticePreference, channelPolicy, eventAllowed, isQuiet, privateDigest, recipientAllowed, reserveChannelBudget } from '../notifications/customer-channel.domain';
import { issuedPurchase, lockInvoiceForCustomerNotice } from '../notifications/customer-notice-source';
import { CustomerChannelTransport, ChannelTransportResult } from './customer-channel.transport';
import { smsBinding } from './unifonic-dlr';

type Tx = Prisma.TransactionClient;
type Policy = NonNullable<ReturnType<typeof channelPolicy>>;
type Context = {destination:string;policy:Policy} | {reason:string;defer?:boolean};

/** Optional channels have their own single-use outbox. A provider attempt is never replayed. */
@Injectable()
export class CustomerChannelWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger=new Logger(CustomerChannelWorker.name);
  private timer?:NodeJS.Timeout;
  private running=false;
  constructor(private readonly db:DatabaseService,private readonly transport:CustomerChannelTransport) {}
  onModuleInit(){void this.poll();this.timer=setInterval(()=>void this.poll(),15_000);this.timer.unref();}
  onModuleDestroy(){if(this.timer)clearInterval(this.timer);}
  async poll(){
    // Existing installations/fixtures need no optional-channel tables while policy is off.
    if(this.running||process.env.HYDROLAND_CUSTOMER_CHANNEL_POLICY!==CUSTOMER_CHANNEL_POLICY
      || !['SMS','WHATSAPP','PUSH'].some(c=>process.env[`HYDROLAND_CUSTOMER_CHANNEL_${c}_ENABLED`]==='true'))return;
    this.running=true;
    try{
      await this.db.$executeRaw`UPDATE "CustomerChannelDispatch" SET state='REVIEW_REQUIRED',reason='ATTEMPT_OUTCOME_UNKNOWN',"updatedAt"=timezone('UTC',clock_timestamp())
        WHERE state='RESERVED' AND "updatedAt"<timezone('UTC',clock_timestamp())-INTERVAL '2 minutes'`;
      for(let i=0;i<25;i++){
        const [row]=await this.db.$queryRaw<ChannelDispatch[]>`UPDATE "CustomerChannelDispatch" SET "nextAttemptAt"=timezone('UTC',clock_timestamp())+INTERVAL '2 minutes'
          WHERE id=(SELECT id FROM "CustomerChannelDispatch" WHERE state IN ('PENDING','PROVIDER_ACCEPTED') AND "nextAttemptAt"<=timezone('UTC',clock_timestamp())
          ORDER BY "nextAttemptAt",id FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`;
        if(!row)break;
        if(row.state==='PROVIDER_ACCEPTED')await this.reconcile(row);
        else await this.deliver(row);
      }
    }catch{this.logger.warn('Optional customer channel poll deferred.');}
    finally{this.running=false;}
  }

  private async transition(tx:Tx,row:ChannelDispatch,state:string,reason:string|null){
    await tx.$executeRaw`UPDATE "CustomerChannelDispatch" SET state=${state},reason=${reason},"updatedAt"=timezone('UTC',clock_timestamp()) WHERE id=${row.id}`;
    await tx.auditEvent.create({data:{action:'CUSTOMER_CHANNEL_'+state,resource:'CustomerChannelDispatch',resourceId:row.id,
      metadata:{accountId:row.accountId,event:row.event,channel:row.channel,reason,policy:CUSTOMER_CHANNEL_POLICY}}});
  }
  private async defer(tx:Tx,row:ChannelDispatch,reason:string,minutes=5){
    await tx.$executeRaw`UPDATE "CustomerChannelDispatch" SET reason=${reason},"nextAttemptAt"=timezone('UTC',clock_timestamp())+${minutes}::int*INTERVAL '1 minute',"updatedAt"=timezone('UTC',clock_timestamp()) WHERE id=${row.id}`;
  }
  private async context(tx:Tx,row:ChannelDispatch):Promise<Context>{
    const [account]=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "Account" WHERE id::text=${row.accountId} AND status='ACTIVE' AND "emailVerifiedAt" IS NOT NULL FOR UPDATE`;
    if(!account)return {reason:'ACCOUNT_UNAVAILABLE'};
    const [p]=await tx.$queryRaw<NoticePreference[]>`SELECT * FROM "CustomerNoticePreference" WHERE "accountId"::text=${row.accountId} FOR UPDATE`;
    if(!p||p.revision!==row.preferenceRevision||!eventAllowed(p,row.event)||!p[row.channel.toLowerCase() as 'sms'|'whatsapp'|'push'])return {reason:'CONSENT_CHANGED'};
    const [notice]=await tx.$queryRaw<Array<{type:string;payload:Record<string,string>}>>`SELECT type,payload FROM "Notification" WHERE id::text=${row.notificationId} AND "accountId"::text=${row.accountId} FOR SHARE`;
    if(!notice||notice.type!==row.event)return {reason:'SOURCE_UNAVAILABLE'};
    if(row.event==='BOOKING_CONFIRMED'){
      const [booking]=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "Booking" WHERE id::text=${row.sourceId} AND "accountId"::text=${row.accountId} AND status='CONFIRMED' FOR SHARE`;
      if(row.sourceType!=='BOOKING'||notice.payload.bookingId!==row.sourceId||!booking)return {reason:'SOURCE_UNAVAILABLE'};
    }else{
      if(notice.payload.sourceType!==row.sourceType||notice.payload.sourceId!==row.sourceId)return {reason:'SOURCE_UNAVAILABLE'};
      const invoice=await lockInvoiceForCustomerNotice(tx,row.accountId,row);
      if(!issuedPurchase(invoice))return {reason:'SOURCE_UNAVAILABLE'};
    }
    const policy=channelPolicy(row.channel,row.accountId,row.event);
    if(!policy)return {reason:'CHANNEL_UNAVAILABLE',defer:true};
    if(isQuiet(p))return {reason:'QUIET_HOURS',defer:true};
    let destination:string;
    try{
      if(row.channel==='PUSH'){
        const [session]=await tx.$queryRaw<Array<{id:string;pushTokenHash:string;pushTokenCiphertext:string}>>`SELECT id,"pushTokenHash","pushTokenCiphertext" FROM "Session"
          WHERE "accountId"::text=${row.accountId} AND "pushRegistrationId"=${row.bindingId} AND "revokedAt" IS NULL
            AND "expiresAt">timezone('UTC',clock_timestamp()) AND "tokenHash" NOT LIKE 'mfa:%' FOR UPDATE`;
        if(!session?.pushTokenCiphertext||!session.pushTokenHash)return {reason:'DEVICE_REVOKED'};
        destination=revealSecret(session.pushTokenCiphertext,'push-device:'+session.id);
        if(!/^(?:Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$/.test(destination)||createHash('sha256').update(destination).digest('hex')!==session.pushTokenHash||session.pushTokenHash!==row.recipientHash)return {reason:'DEVICE_REVOKED'};
      }else{
        if(!p.phoneCiphertext||!p.phoneHash||p.phoneProofId!==row.bindingId||p.phoneHash!==row.recipientHash)return {reason:'PHONE_PROOF_CHANGED'};
        destination=revealSecret(p.phoneCiphertext,'customer-phone:'+row.accountId);
        if(!/^\+[1-9]\d{7,14}$/.test(destination)||privateDigest('phone',destination)!==p.phoneHash)return {reason:'PHONE_PROOF_CHANGED'};
      }
    }catch{return {reason:'RECIPIENT_UNAVAILABLE'};}
    if(!recipientAllowed(row.channel,destination,policy))return {reason:'RECIPIENT_NOT_APPROVED',defer:true};
    return {destination,policy};
  }

  private async deliver(row:ChannelDispatch){
    const reserved=await this.db.serializable(async tx=>{
      const [current]=await tx.$queryRaw<ChannelDispatch[]>`SELECT * FROM "CustomerChannelDispatch" WHERE id=${row.id} FOR UPDATE`;
      if(!current||current.state!=='PENDING')return false;
      if(Date.now()-current.createdAt.getTime()>7*24*60*60_000){await this.transition(tx,current,'SUPPRESSED','EVENT_EXPIRED');return false;}
      const context=await this.context(tx,current);
      if('reason' in context){
        if(context.defer)await this.defer(tx,current,context.reason,context.reason==='QUIET_HOURS'?5:60);
        else await this.transition(tx,current,'SUPPRESSED',context.reason);
        return false;
      }
      if(!await reserveChannelBudget(tx,current.channel,context.policy.cap,context.policy.cost)){await this.defer(tx,current,'BUDGET_LIMIT',60);return false;}
      await tx.$executeRaw`UPDATE "CustomerChannelDispatch" SET state='RESERVED',reason=NULL,"providerScope"=${context.policy.scope},"updatedAt"=timezone('UTC',clock_timestamp()) WHERE id=${current.id}`;
      return true;
    });
    if(!reserved)return;
    try{
      // The reservation is committed first; transport never runs in the retrying helper.
      await this.db.$transaction(async tx=>{
        const [current]=await tx.$queryRaw<ChannelDispatch[]>`SELECT * FROM "CustomerChannelDispatch" WHERE id=${row.id} FOR UPDATE`;
        if(!current||current.state!=='RESERVED')return;
        const context=await this.context(tx,current);
        if('reason' in context||context.policy.scope!==current.providerScope){await this.transition(tx,current,'SUPPRESSED','reason' in context?context.reason:'PROVIDER_CHANGED');return;}
        const result=await this.transport.send(current,context.destination,context.policy);
        if(result.state==='ACCEPTED'&&result.providerId){
          const key=JSON.stringify([current.channel,current.providerScope,result.providerId]);
          await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${key},0))`;
          const [other]=await tx.$queryRaw<ChannelDispatch[]>`SELECT * FROM "CustomerChannelDispatch" WHERE channel=${current.channel} AND "providerScope"=${current.providerScope} AND "providerId"=${result.providerId} AND id<>${current.id} FOR UPDATE`;
          if(other){
            await this.transition(tx,other,'REVIEW_REQUIRED','PROVIDER_ID_REUSED');
            await this.transition(tx,current,'REVIEW_REQUIRED','PROVIDER_ID_REUSED');
            return;
          }
          await tx.$executeRaw`UPDATE "CustomerChannelDispatch" SET "providerId"=${result.providerId},"submittedAt"=timezone('UTC',clock_timestamp()),"nextAttemptAt"=timezone('UTC',clock_timestamp())+INTERVAL '15 minutes' WHERE id=${current.id}`;
          await this.transition(tx,current,'PROVIDER_ACCEPTED',null);
        }else{
          if(result.state==='UNREGISTERED')await this.unregister(tx,current);
          await this.transition(tx,current,['UNREGISTERED','REJECTED'].includes(result.state)?'PROVIDER_REJECTED':'REVIEW_REQUIRED',result.state==='UNREGISTERED'?'DEVICE_NOT_REGISTERED':'ATTEMPT_OUTCOME_UNKNOWN');
        }
      },{timeout:15000});
    }catch{
      // Includes a timeout/crash after acceptance. No reset to PENDING and no second send.
      await this.db.$executeRaw`UPDATE "CustomerChannelDispatch" SET state='REVIEW_REQUIRED',reason='ATTEMPT_OUTCOME_UNKNOWN',"updatedAt"=timezone('UTC',clock_timestamp()) WHERE id=${row.id} AND state='RESERVED'`;
    }
  }
  private unregister(tx:Tx,row:ChannelDispatch){
    return tx.$executeRaw`UPDATE "Session" SET "pushTokenHash"=NULL,"pushTokenCiphertext"=NULL,"pushRegistrationId"=NULL
      WHERE "accountId"::text=${row.accountId} AND "pushRegistrationId"=${row.bindingId} AND "pushTokenHash"=${row.recipientHash}`;
  }
  private async smsReceipt(tx:Tx,row:ChannelDispatch):Promise<ChannelTransportResult>{
    if(process.env.UNIFONIC_SMS_DLR_ACCOUNT_ID?.trim()!==row.providerScope)return {state:'PENDING'};
    const [p]=await tx.$queryRaw<NoticePreference[]>`SELECT * FROM "CustomerNoticePreference" WHERE "accountId"::text=${row.accountId}`;
    if(!p?.phoneCiphertext||p.phoneProofId!==row.bindingId||p.phoneHash!==row.recipientHash)return {state:'UNCERTAIN'};
    let destination:string;
    try{destination=revealSecret(p.phoneCiphertext,'customer-phone:'+row.accountId);}catch{return {state:'UNCERTAIN'};}
    const binding=smsBinding(row.providerId,'hydroland-notice/'+row.id,destination.slice(1));
    if(!binding)return {state:'UNCERTAIN'};
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${binding.message},0))`;
    const where={resource:'unifonic.sms',resourceId:binding.message};
    if(await tx.auditEvent.findFirst({where:{...where,action:'ambiguous'}}))return {state:'UNCERTAIN'};
    const receipt=await tx.auditEvent.findFirst({where:{...where,action:'delivered',metadata:{path:['binding'],equals:binding.binding}}});
    return {state:receipt?'DELIVERED':'PENDING'};
  }
  private async reconcile(row:ChannelDispatch){
    try{
      await this.db.$transaction(async tx=>{
        const [current]=await tx.$queryRaw<ChannelDispatch[]>`SELECT * FROM "CustomerChannelDispatch" WHERE id=${row.id} FOR UPDATE`;
        if(!current||current.state!=='PROVIDER_ACCEPTED')return;
        const policy=channelPolicy(current.channel,current.accountId,current.event);
        if(!current.submittedAt||current.receiptChecks>=12||Date.now()-current.submittedAt.getTime()>23*60*60_000){await this.transition(tx,current,'REVIEW_REQUIRED','RECEIPT_UNCONFIRMED');return;}
        if(!policy||policy.scope!==current.providerScope){await this.defer(tx,current,'CHANNEL_UNAVAILABLE',60);return;}
        // Read-only reconciliation cannot cause another send and does not require continued opt-in.
        const result=current.channel==='SMS'?await this.smsReceipt(tx,current):await this.transport.receipt(current);
        await tx.$executeRaw`UPDATE "CustomerChannelDispatch" SET "receiptChecks"="receiptChecks"+1,"nextAttemptAt"=timezone('UTC',clock_timestamp())+INTERVAL '15 minutes',"updatedAt"=timezone('UTC',clock_timestamp()) WHERE id=${current.id}`;
        if(result.state==='PENDING')return;
        if(result.state==='UNREGISTERED')await this.unregister(tx,current);
        const state=result.state==='DELIVERED'?'PROVIDER_DELIVERED':result.state==='PUSH_CONFIRMED'?'PUSH_SERVICE_CONFIRMED':['REJECTED','UNREGISTERED'].includes(result.state)?'PROVIDER_REJECTED':'REVIEW_REQUIRED';
        await this.transition(tx,current,state,state==='REVIEW_REQUIRED'?'RECEIPT_MISMATCH':result.state==='UNREGISTERED'?'DEVICE_NOT_REGISTERED':null);
      },{timeout:10000});
    }catch{
      // A receipt read can be retried, but is finite and never returns to the sending queue.
      await this.db.$executeRaw`UPDATE "CustomerChannelDispatch" SET "receiptChecks"=LEAST(12,"receiptChecks"+1),reason='RECEIPT_UNAVAILABLE',"nextAttemptAt"=timezone('UTC',clock_timestamp())+INTERVAL '15 minutes',"updatedAt"=timezone('UTC',clock_timestamp()) WHERE id=${row.id} AND state='PROVIDER_ACCEPTED'`;
    }
  }
}
