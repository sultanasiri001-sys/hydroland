import { BadRequestException, ConflictException, ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { protectSecret, revealSecret } from '../auth/mfa-crypto';
import { CustomerChannelTransport } from '../integrations/customer-channel.transport';
import { CHANNELS, CUSTOMER_CHANNEL_POLICY, NoticePreference, channelPolicy, identifier, objectInput, phoneNumber, preferenceInput, privateDigest, reserveChannelBudget, verificationPolicy } from './customer-channel.domain';

type Tx = Prisma.TransactionClient;
type Challenge = {id:string;accountId:string;sessionId:string;preferenceRevision:number;phoneCiphertext:string;phoneHash:string;codeHash:string;state:string;attempts:number;expiresAt:Date};

@Injectable()
export class CustomerNoticePreferenceService {
  constructor(private readonly db:DatabaseService, private readonly transport:CustomerChannelTransport) {}

  private async actor(tx:Tx,accountId:string,sessionId:string) {
    const [actor] = await tx.$queryRaw<Array<{personId:string}>>`SELECT "personId" FROM "Account"
      WHERE id::text=${accountId} AND status='ACTIVE' AND "emailVerifiedAt" IS NOT NULL FOR UPDATE`;
    const [session] = await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "Session"
      WHERE id::text=${sessionId} AND "accountId"::text=${accountId} AND "revokedAt" IS NULL
        AND "expiresAt">timezone('UTC',clock_timestamp()) AND "tokenHash" NOT LIKE 'mfa:%' FOR UPDATE`;
    if (!actor || !session) throw new UnauthorizedException('يلزم تسجيل دخول حالي ومتحقق.');
    return actor;
  }
  private async preference(tx:Tx,accountId:string,create=false) {
    if (create) await tx.$executeRaw`INSERT INTO "CustomerNoticePreference"("accountId")
      SELECT id FROM "Account" WHERE id::text=${accountId} ON CONFLICT ("accountId") DO NOTHING`;
    const [p] = await tx.$queryRaw<NoticePreference[]>`SELECT * FROM "CustomerNoticePreference" WHERE "accountId"::text=${accountId} FOR UPDATE`;
    return p;
  }
  private view(accountId:string,p?:NoticePreference) {
    let maskedPhone:string|null=null;
    if(p?.phoneCiphertext)try{maskedPhone='••••'+revealSecret(p.phoneCiphertext,'customer-phone:'+accountId).slice(-4);}catch{throw new ConflictException('تعذر قراءة ارتباط الهاتف؛ أعد توثيقه.');}
    return {schemaVersion:1,policy:CUSTOMER_CHANNEL_POLICY,revision:p?.revision??0,
      email:p?.email??true,sms:p?.sms??false,whatsapp:p?.whatsapp??false,push:p?.push??false,bookings:p?.bookings??true,invoices:p?.invoices??true,
      quietStart:p?.quietStart??null,quietEnd:p?.quietEnd??null,timeZone:p?.timeZone??'Asia/Riyadh',phoneVerified:Boolean(p?.phoneProofId),maskedPhone,
      available:Object.fromEntries(CHANNELS.map(c=>[c,Boolean(channelPolicy(c,accountId,'BOOKING_CONFIRMED')&&channelPolicy(c,accountId,'INVOICE_ISSUED'))])),
      phoneVerificationAvailable:process.env.HYDROLAND_CUSTOMER_PHONE_VERIFICATION_ENABLED==='true'&&Boolean(channelPolicy('SMS',accountId)),
      note:'الإشعارات داخل المنصة محفوظة. القنوات الإضافية تعمل بعد تجهيز المزود وموافقتك، وإيصال المزود لا يثبت أنك قرأت الرسالة.'};
  }
  private audit(tx:Tx,actor:{personId:string},accountId:string,action:string,resourceId:string,metadata:object) {
    return tx.auditEvent.create({data:{actorId:actor.personId,action,resource:'CustomerNoticePreference',resourceId,metadata:{accountId,policy:CUSTOMER_CHANNEL_POLICY,...metadata} as Prisma.InputJsonValue}});
  }
  async get(accountId:string,sessionId:string) {
    return this.db.serializable(async tx=>{
      await this.actor(tx,accountId,sessionId);
      const canReview=Boolean(await tx.roleAssignment.findFirst({where:{accountId,role:'ADMIN',status:'ACTIVE'},select:{id:true}}));
      return {...this.view(accountId,await this.preference(tx,accountId)),canReview};
    });
  }
  async update(accountId:string,sessionId:string,body:unknown) {
    const input=preferenceInput(body);
    return this.db.serializable(async tx=>{
      const actor=await this.actor(tx,accountId,sessionId),before=await this.preference(tx,accountId);
      if((before?.revision??0)!==input.expectedRevision)throw new ConflictException('تغيرت الخيارات؛ أعد قراءتها.');
      if((input.sms||input.whatsapp)&&!before?.phoneProofId)throw new BadRequestException('وثّق هاتف الإشعارات قبل الاشتراك في الرسائل النصية أو واتساب.');
      const p=before??await this.preference(tx,accountId,true);
      const next=before?p.revision+1:p.revision;
      await tx.$executeRaw`UPDATE "CustomerNoticePreference" SET revision=${next}::int,email=${input.email},sms=${input.sms},whatsapp=${input.whatsapp},push=${input.push},
        bookings=${input.bookings},invoices=${input.invoices},"quietStart"=${input.quietStart}::int,"quietEnd"=${input.quietEnd}::int,"timeZone"=${input.timeZone},"updatedAt"=timezone('UTC',clock_timestamp())
        WHERE "accountId"::text=${accountId}`;
      await tx.$executeRaw`UPDATE "CustomerPhoneChallenge" SET state='EXPIRED' WHERE "accountId"::text=${accountId} AND state IN ('RESERVED','SENT')`;
      await this.audit(tx,actor,accountId,'CUSTOMER_NOTICE_PREFERENCES_UPDATED',accountId,{revision:next,channels:{email:input.email,sms:input.sms,whatsapp:input.whatsapp,push:input.push},bookings:input.bookings,invoices:input.invoices});
      return this.view(accountId,await this.preference(tx,accountId));
    });
  }
  async removePhone(accountId:string,sessionId:string,body:unknown) {
    const x=objectInput(body,['expectedRevision','confirmed']);
    if(x.confirmed!==true||!Number.isInteger(x.expectedRevision))throw new BadRequestException('أكّد إزالة هاتف الإشعارات.');
    return this.db.serializable(async tx=>{
      const actor=await this.actor(tx,accountId,sessionId),p=await this.preference(tx,accountId);
      if(!p||p.revision!==x.expectedRevision)throw new ConflictException('تغيرت الخيارات؛ أعد قراءتها.');
      await tx.$executeRaw`UPDATE "CustomerNoticePreference" SET revision=revision+1,sms=FALSE,whatsapp=FALSE,"phoneCiphertext"=NULL,"phoneHash"=NULL,"phoneProofId"=NULL,"phoneVerifiedAt"=NULL,"updatedAt"=timezone('UTC',clock_timestamp()) WHERE "accountId"::text=${accountId}`;
      await tx.$executeRaw`UPDATE "CustomerPhoneChallenge" SET state='EXPIRED' WHERE "accountId"::text=${accountId} AND state IN ('RESERVED','SENT')`;
      await this.audit(tx,actor,accountId,'CUSTOMER_NOTICE_PHONE_REMOVED',accountId,{revision:p.revision+1});
      return this.view(accountId,await this.preference(tx,accountId));
    });
  }
  async challenge(accountId:string,sessionId:string,body:unknown) {
    const x=objectInput(body,['phone','confirmed']);
    if(x.confirmed!==true)throw new BadRequestException('أكّد طلب رمز التحقق لهذا الهاتف.');
    const phone=phoneNumber(x.phone),policy=verificationPolicy(accountId,phone);
    if(!policy)throw new ServiceUnavailableException('توثيق الهاتف غير متاح لهذه القناة حاليًا.');
    const id=randomUUID(),code=String(randomInt(0,1000000)).padStart(6,'0'),hash=privateDigest('phone',phone),expiresAt=new Date(Date.now()+10*60_000);
    await this.db.serializable(async tx=>{
      const actor=await this.actor(tx,accountId,sessionId);
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${hash},0))`;
      const [rate]=await tx.$queryRaw<Array<{account:number;phone:number}>>`SELECT
        count(*) FILTER (WHERE "accountId"::text=${accountId})::int AS account,
        count(*) FILTER (WHERE "phoneHash"=${hash})::int AS phone
        FROM "CustomerPhoneChallenge" WHERE "createdAt">timezone('UTC',clock_timestamp())-INTERVAL '1 hour'
          AND ("accountId"::text=${accountId} OR "phoneHash"=${hash})`;
      if(rate.account>=3||rate.phone>=3)throw new ForbiddenException('بلغت حد طلب رموز الهاتف؛ حاول لاحقًا.');
      if(!await reserveChannelBudget(tx,'SMS',policy.cap,policy.cost))throw new ServiceUnavailableException('توقفت القناة عند حد الميزانية؛ حاول لاحقًا.');
      const p=await this.preference(tx,accountId,true);
      await tx.$executeRaw`UPDATE "CustomerPhoneChallenge" SET state='EXPIRED' WHERE "accountId"::text=${accountId} AND state IN ('RESERVED','SENT')`;
      await tx.$executeRaw`INSERT INTO "CustomerPhoneChallenge"(id,"accountId","sessionId","preferenceRevision","phoneCiphertext","phoneHash","codeHash",state,"expiresAt")
        SELECT ${id},a.id,${sessionId},${p.revision}::int,${protectSecret(phone,'customer-phone:'+accountId)},${hash},${privateDigest('phone-code:'+id,code)},'RESERVED',${expiresAt}
        FROM "Account" a WHERE a.id::text=${accountId}`;
      await this.audit(tx,actor,accountId,'CUSTOMER_NOTICE_PHONE_CHALLENGE_RESERVED',id,{expiresAt:expiresAt.toISOString()});
    });
    // Never retry a transaction containing transport. A crash leaves a single-use reservation.
    let accepted=false;
    try {
      accepted=await this.db.$transaction(async tx=>{
        await this.actor(tx,accountId,sessionId);
        const p=await this.preference(tx,accountId);
        const [c]=await tx.$queryRaw<Challenge[]>`SELECT * FROM "CustomerPhoneChallenge" WHERE id=${id} FOR UPDATE`;
        if(!c||c.state!=='RESERVED'||!p||p.revision!==c.preferenceRevision||!verificationPolicy(accountId,phone))return false;
        const sent=await this.transport.sendCode(phone,code,id);
        await tx.$executeRaw`UPDATE "CustomerPhoneChallenge" SET state=${sent?'SENT':'REVIEW_REQUIRED'} WHERE id=${id}`;
        return sent;
      },{timeout:12000});
    } catch { /* Ambiguous provider acceptance is never retried automatically. */ }
    if(!accepted){await this.db.$executeRaw`UPDATE "CustomerPhoneChallenge" SET state='REVIEW_REQUIRED' WHERE id=${id} AND state='RESERVED'`;throw new ServiceUnavailableException('لم يتأكد إرسال الرمز. انتظر قبل طلب رمز جديد.');}
    return {challengeId:id,sessionId,expiresAt:expiresAt.toISOString(),status:'PROVIDER_ACCEPTED',note:'أدخل الرمز الذي يصلك على الهاتف. قبول المزود وحده لا يثبت توثيق الرقم.'};
  }
  async verify(accountId:string,sessionId:string,id:string,body:unknown) {
    identifier(id);const x=objectInput(body,['code','confirmed']);
    if(x.confirmed!==true||typeof x.code!=='string'||!/^\d{6}$/.test(x.code))throw new BadRequestException('أدخل رمز التحقق المكوّن من ستة أرقام.');
    const result=await this.db.serializable(async tx=>{
      const actor=await this.actor(tx,accountId,sessionId),p=await this.preference(tx,accountId);
      const [c]=await tx.$queryRaw<Challenge[]>`SELECT * FROM "CustomerPhoneChallenge" WHERE id=${id} AND "accountId"::text=${accountId} AND "sessionId"=${sessionId} FOR UPDATE`;
      if(!p||!c||c.state!=='SENT'||c.expiresAt<=new Date()||c.attempts>=5||p.revision!==c.preferenceRevision)return {valid:false as const};
      const valid=timingSafeEqual(Buffer.from(c.codeHash),Buffer.from(privateDigest('phone-code:'+id,x.code as string)));
      await tx.$executeRaw`UPDATE "CustomerPhoneChallenge" SET attempts=attempts+1,state=${valid?'CONSUMED':c.attempts===4?'EXPIRED':'SENT'} WHERE id=${id}`;
      if(!valid)return {valid:false as const};
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${c.phoneHash},0))`;
      const [other]=await tx.$queryRaw<Array<{accountId:string}>>`SELECT "accountId" FROM "CustomerNoticePreference" WHERE "phoneHash"=${c.phoneHash} AND "accountId"::text<>${accountId}`;
      if(other)return {valid:false as const};
      await tx.$executeRaw`UPDATE "CustomerNoticePreference" SET revision=revision+1,sms=FALSE,whatsapp=FALSE,"phoneCiphertext"=${c.phoneCiphertext},"phoneHash"=${c.phoneHash},"phoneProofId"=${id},"phoneVerifiedAt"=timezone('UTC',clock_timestamp()),"updatedAt"=timezone('UTC',clock_timestamp()) WHERE "accountId"::text=${accountId}`;
      await this.audit(tx,actor,accountId,'CUSTOMER_NOTICE_PHONE_VERIFIED',id,{revision:p.revision+1});
      return {valid:true as const,preference:this.view(accountId,await this.preference(tx,accountId))};
    }).catch(async(error:unknown)=>{
      // A competing serializable snapshot can report the unique phone claim as
      // 23505 rather than 40001. Consume this challenge without leaking ownership.
      if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2010'&&error.meta?.code==='23505'){
        await this.db.$executeRaw`UPDATE "CustomerPhoneChallenge" SET state='EXPIRED',attempts=LEAST(5,attempts+1)
          WHERE id=${id} AND "accountId"::text=${accountId} AND "sessionId"=${sessionId} AND state='SENT'`;
        throw new BadRequestException('الرمز غير صالح أو انتهى. اطلب رمزًا جديدًا عند الحاجة.');
      }
      throw error;
    });
    if(!result.valid)throw new BadRequestException('الرمز غير صالح أو انتهى. اطلب رمزًا جديدًا عند الحاجة.');
    return result.preference;
  }
  async deliveries(accountId:string,sessionId:string) {
    return this.db.serializable(async tx=>{
      await this.actor(tx,accountId,sessionId);
      const items=await tx.$queryRaw<Array<Record<string,unknown>>>`SELECT id,event,channel,state,reason,"sourceType","sourceId","createdAt","updatedAt" FROM "CustomerChannelDispatch"
        WHERE "accountId"::text=${accountId} ORDER BY "createdAt" DESC,id DESC LIMIT 50`;
      return {schemaVersion:1,items,note:'تأكيد خدمة Push يعني وصولها إلى خدمة الهاتف، ولا يثبت عرض الإشعار أو قراءته على الجهاز.'};
    });
  }
  private async admin(tx:Tx,accountId:string,sessionId:string){
    const actor=await this.actor(tx,accountId,sessionId);
    const roles=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "RoleAssignment" WHERE "accountId"::text=${accountId} AND role='ADMIN' AND status='ACTIVE' FOR SHARE`;
    if(!roles.length)throw new ForbiddenException('هذا السجل متاح للمسؤول المخوّل فقط.');
    return actor;
  }
  async reviewQueue(accountId:string,sessionId:string){
    return this.db.serializable(async tx=>{
      await this.admin(tx,accountId,sessionId);
      const items=await tx.$queryRaw<Array<Record<string,unknown>>>`SELECT id,event,channel,state,reason,"sourceType","sourceId","createdAt","updatedAt"
        FROM "CustomerChannelDispatch" WHERE state='REVIEW_REQUIRED' ORDER BY "createdAt",id LIMIT 50`;
      return {items,note:'إغلاق المراجعة يوثّق قرار المسؤول فقط؛ لا يعيد الإرسال ولا يثبت التسليم.'};
    });
  }
  async closeReview(accountId:string,sessionId:string,id:string,body:unknown){
    identifier(id);const input=objectInput(body,['reason','confirmed']);
    if(input.confirmed!==true||typeof input.reason!=='string'||input.reason.trim().length<10||input.reason.trim().length>1000)throw new BadRequestException('اكتب سبب إغلاق المراجعة وأكّد الإغلاق دون إعادة الإرسال.');
    const reason=input.reason.trim();
    return this.db.serializable(async tx=>{
      const actor=await this.admin(tx,accountId,sessionId);
      const [row]=await tx.$queryRaw<Array<{state:string}>>`SELECT state FROM "CustomerChannelDispatch" WHERE id=${id} FOR UPDATE`;
      if(row?.state!=='REVIEW_REQUIRED')throw new ConflictException('لا توجد مراجعة مفتوحة لهذا السجل.');
      await tx.$executeRaw`UPDATE "CustomerChannelDispatch" SET state='SUPPRESSED',reason='MANUAL_REVIEW_CLOSED',"updatedAt"=timezone('UTC',clock_timestamp()) WHERE id=${id}`;
      await tx.auditEvent.create({data:{actorId:actor.personId,action:'CUSTOMER_CHANNEL_REVIEW_CLOSED',resource:'CustomerChannelDispatch',resourceId:id,metadata:{actorAccountId:accountId,reason,previousState:row.state,deliveryConfirmed:false,resend:false}}});
      return {id,state:'SUPPRESSED',reason:'MANUAL_REVIEW_CLOSED',resend:false};
    });
  }
}
