import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CustomerNoticeEmail } from '@prisma/client';
import { createHash } from 'node:crypto';
import { emailTrialRecipient } from '../auth/email-trial-policy';
import { DatabaseService } from '../database/database.service';
import { invoiceRegister, InvoiceRow } from '../payments/account-invoice-register';
import { EmailDeliveryService, ReportEmailError } from './email-delivery.service';
import { emailPreference } from '../notifications/customer-channel.domain';
import { issuedPurchase, lockInvoiceForCustomerNotice } from '../notifications/customer-notice-source';

@Injectable()
export class CustomerNoticeEmailWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger=new Logger(CustomerNoticeEmailWorker.name);
  private timer?:NodeJS.Timeout;
  private running=false;

  constructor(private readonly db:DatabaseService,private readonly email:EmailDeliveryService){}

  onModuleInit(){
    void this.poll();
    this.timer=setInterval(()=>void this.poll(),15_000);
    this.timer.unref();
  }

  onModuleDestroy(){if(this.timer)clearInterval(this.timer);}

  async poll(){
    if(this.running||!this.email.publicConfig().enabled)return;
    this.running=true;
    try{
      for(let i=0;i<25;i++){
        // Claim one at a time. A stopped process releases its claim when the lease expires.
        const [row]=await this.db.$queryRaw<CustomerNoticeEmail[]>`
          UPDATE "CustomerNoticeEmail" SET "nextAttemptAt"=timezone('UTC', CURRENT_TIMESTAMP)+INTERVAL '2 minutes',attempts=attempts+1
          WHERE id=(SELECT id FROM "CustomerNoticeEmail" WHERE state='PENDING' AND "nextAttemptAt"<=timezone('UTC', CURRENT_TIMESTAMP)
            ORDER BY "nextAttemptAt",id FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`;
        if(!row)break;
        await this.deliver(row);
      }
    }catch{this.logger.warn('Customer email poll deferred.');}
    finally{this.running=false;}
  }

  private async deliver(row:CustomerNoticeEmail){
    const claim={id:row.id,attempts:row.attempts,state:'PENDING'};
    const finish=(state:string)=>this.db.customerNoticeEmail.updateMany({where:claim,data:{state}});
    const later=(delay:number)=>this.db.customerNoticeEmail.updateMany({where:claim,data:{nextAttemptAt:new Date(Date.now()+delay)}});
    const account=await this.db.account.findUnique({where:{id:row.accountId},select:{email:true,emailVerifiedAt:true,status:true}});
    if(!account||account.status==='SUSPENDED'||account.status==='ARCHIVED'){await finish('SUPPRESSED');return;}
    const event=row.event;
    if(event==='INVOICE_ISSUED'){
      const [invoice]=await this.db.$queryRaw<InvoiceRow[]>(invoiceRegister(row.accountId,{sourceType:row.sourceType,sourceId:row.sourceId}));
      if(!invoice?.isPurchase||invoice.nativeStatus==='VOID'){await finish('SUPPRESSED');return;}
      // Older uploads may already have queued an organizational draft notice.
      // Keep its identity/history and retry after approval, without contacting
      // the provider or charging the email budget while the native invoice is a draft.
      // Previously issued invoices retain their own provenance and need no new finalization.
      if(invoice.sourceType==='TRIP_PAYMENT'&&invoice.buyerOrganizationId
        && !['ISSUED','PAID'].includes(invoice.nativeStatus||'')){
        await later(60_000);return;
      }
      if(!invoice.number){await finish('SUPPRESSED');return;}
    }else if(event==='BOOKING_CONFIRMED'){
      const booking=await this.db.booking.findUnique({where:{id:row.sourceId},select:{accountId:true,status:true}});
      if(booking?.accountId!==row.accountId||booking.status!=='CONFIRMED'){await finish('SUPPRESSED');return;}
    }else{await finish('SUPPRESSED');return;}

    const preference=await emailPreference(this.db,row.accountId,event);
    if(preference==='SUPPRESS'){await finish('SUPPRESSED');return;}
    if(preference==='QUIET'){await later(5*60_000);return;}

    const trial=emailTrialRecipient();
    if(!account.emailVerifiedAt||account.status!=='ACTIVE'||(trial&&account.email.trim().toLowerCase()!==trial)){
      await later(60*60_000);return;
    }
    const hash=createHash('sha256').update(account.email).digest('hex');
    // Keep ambiguous retries within the provider key's lifetime and bound to the same recipient.
    if((row.firstAttemptAt&&Date.now()-row.firstAttemptAt.getTime()>23*60*60_000)||(row.recipientHash&&row.recipientHash!==hash)){
      await finish('REVIEW_REQUIRED');return;
    }
    // Charge a conservative upper bound for each transport attempt, including ambiguous retries.
    // Both values are configured in SAR halalas. Without an approved bound the notice stays queued.
    const cap = Number(process.env.HYDROLAND_CUSTOMER_EMAIL_MONTHLY_CAP_HALALAS);
    const cost = Number(process.env.HYDROLAND_CUSTOMER_EMAIL_MAX_ATTEMPT_HALALAS);
    if (!Number.isSafeInteger(cap) || cap > 2147483647 || !Number.isSafeInteger(cost) || cost <= 0 || cost > cap) {
      await later(60 * 60_000);
      return;
    }
    const reserved = await this.db.$executeRaw`
      WITH owner AS (
        SELECT id FROM "CustomerNoticeEmail"
        WHERE id = ${row.id} AND attempts = ${row.attempts}::int AND state = 'PENDING'
        FOR UPDATE
      ), budget AS (
        INSERT INTO "CustomerNoticeEmailBudget" ("month", "reservedHalalas")
        SELECT to_char(now() AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM'), ${cost}::int FROM owner
        ON CONFLICT ("month") DO UPDATE
          SET "reservedHalalas" = "CustomerNoticeEmailBudget"."reservedHalalas" + EXCLUDED."reservedHalalas"
          WHERE "CustomerNoticeEmailBudget"."reservedHalalas" <= ${cap - cost}::int
        RETURNING "month"
      )
      UPDATE "CustomerNoticeEmail" SET "recipientHash" = ${hash},
        "firstAttemptAt" = COALESCE("firstAttemptAt", timezone('UTC', CURRENT_TIMESTAMP))
      FROM budget WHERE id = ${row.id}`;
    if (!reserved) {
      await later(60 * 60_000);
      return;
    }
    try{
      // Lock the account even when no preference row exists, so an initial opt-out
      // cannot commit between the final consent check and the provider request.
      // Keep the existing provider idempotency key and durable budget reservation.
      await this.db.$transaction(async tx=>{
        const [currentAccount]=await tx.$queryRaw<Array<{email:string;status:string;emailVerifiedAt:Date|null}>>`SELECT email,status,"emailVerifiedAt" FROM "Account" WHERE id::text=${row.accountId} FOR UPDATE`;
        const [current]=await tx.$queryRaw<CustomerNoticeEmail[]>`SELECT * FROM "CustomerNoticeEmail" WHERE id=${row.id} AND attempts=${row.attempts}::int AND state='PENDING' FOR UPDATE`;
        if(!current)return;
        if(!currentAccount||currentAccount.status!=='ACTIVE'||!currentAccount.emailVerifiedAt){await tx.customerNoticeEmail.updateMany({where:claim,data:{state:'SUPPRESSED'}});return;}
        if(currentAccount.email!==account.email){await tx.customerNoticeEmail.updateMany({where:claim,data:{state:'REVIEW_REQUIRED'}});return;}
        const finalPreference=await emailPreference(tx,row.accountId,event);
        if(finalPreference==='SUPPRESS'){await tx.customerNoticeEmail.updateMany({where:claim,data:{state:'SUPPRESSED'}});return;}
        if(finalPreference==='QUIET'){await tx.customerNoticeEmail.updateMany({where:claim,data:{nextAttemptAt:new Date(Date.now()+5*60_000)}});return;}
        if(event==='BOOKING_CONFIRMED'){
          const booking=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "Booking" WHERE id::text=${row.sourceId} AND "accountId"::text=${row.accountId} AND status='CONFIRMED' FOR SHARE`;
          if(!booking.length){await tx.customerNoticeEmail.updateMany({where:claim,data:{state:'SUPPRESSED'}});return;}
        }else{
          const invoice=await lockInvoiceForCustomerNotice(tx,row.accountId,row);
          if(!issuedPurchase(invoice)){await tx.customerNoticeEmail.updateMany({where:claim,data:{state:'SUPPRESSED'}});return;}
        }
        const receipt=await this.email.sendCustomerNotice({id:row.id,to:account.email,event,sourceType:row.sourceType,sourceId:row.sourceId});
        await tx.customerNoticeEmail.updateMany({where:claim,data:{state:'PROVIDER_ACCEPTED',providerMessageId:receipt.messageId}});
      },{timeout:15000});
    }catch(error){
      if(error instanceof ReportEmailError&&error.disposition==='PERMANENT'){await finish('REVIEW_REQUIRED');return;}
      await later(Math.min(15*60_000,30_000*2**Math.min(row.attempts-1,5)));
    }
  }
}
