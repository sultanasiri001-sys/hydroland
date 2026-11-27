import { ConflictException, Injectable, OnApplicationBootstrap, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { erasureDigest, PrivateErasureJournal } from './erasure-journal';
import { applyNativeErasure, inspectNativeRecord, nativeErasureSatisfied, NativePlan } from './record-disposition';
import type { ErasureIntent } from './privacy-erasure.service';

type Terminal = {version:number;id:string;intentHash:string;executionAuditId:string;appliedAt:string};
const object=(x:unknown):Record<string,unknown>=>x&&typeof x==='object'&&!Array.isArray(x)?x as Record<string,unknown>:{};
const fail=():never=>{throw new ConflictException('سجل المحو غير محسوم أو غير مطابق؛ تبقى الخدمة مغلقة إلى مراجعة الاستعادة.');};
const text=(x:unknown)=>typeof x==='string'&&x.length>0&&x.length<=200;
const date=(x:unknown)=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
export const baselineId='00000000-0000-4000-8000-000000000015';
export const baselineKey='PRIVACY_RECOVERY_BASELINE:v1';
function intentValue(value:unknown,id:string):ErasureIntent {
  const x=object(value),p=object(x.plan),i=object(p.identity);
  if(x.version!==1||x.id!==id||!date(x.createdAt)||!text(p.accountId)||!text(p.recordRef)||!(p.centerId===null||text(p.centerId))
    ||!['ACCOUNT','BOOKINGS','PAYMENTS','SENT_MESSAGES'].includes(String(p.domain))||!text(p.scope)||!date(p.dueAt)
    ||typeof p.sourceHash!=='string'||!/^[a-f0-9]{64}$/.test(p.sourceHash)||!Array.isArray(p.relatedIds)||!p.relatedIds.every(text)||!text(i.id))return fail();
  const scopes:Record<string,string>={ACCOUNT:'ACCOUNT_CONTACT_AND_PUBLIC_PROFILE_CONTENT',BOOKINGS:'BOOKING_AND_UNREFERENCED_PARTICIPANTS',PAYMENTS:'PAYMENT_AND_ITS_NATIVE_INVOICE',SENT_MESSAGES:'PRIVATE_MESSAGE_AND_RESTRICTED_CONTENT'};
  if(scopes[String(p.domain)]!==p.scope||i.id!==p.recordRef)return fail();
  return x as ErasureIntent;
}

/** On every start with the durable recovery marker, native records must agree
 * with the external ledger BEFORE Nest binds the listening socket. The repair
 * method is only called by the explicit, offline restore command, never HTTP. */
@Injectable()
export class PrivacyRecoveryService implements OnApplicationBootstrap {
  private ready=false;
  constructor(private readonly db:DatabaseService,private readonly journal:PrivateErasureJournal){}
  assertReady(){if(!this.ready)throw new ServiceUnavailableException('لم ينجح تحقق سجل المحو عند تشغيل الخدمة.');}
  private async baseline(){
    const stored=await this.db.operationalSetting.findUnique({where:{key:baselineKey}}),value=object(stored?.value);
    if(typeof value.nonce!=='string'||!/^[a-f0-9-]{36}$/.test(value.nonce)||!date(value.createdAt))return fail();
    return {version:1,kind:'A15_RECOVERY_BASELINE',nonce:value.nonce,createdAt:value.createdAt};
  }
  async initialize(){
    if(process.env.HYDROLAND_PRIVACY_JOURNAL_INITIALIZE!=='INITIALIZE_EMPTY_JOURNAL_ONCE')throw new ServiceUnavailableException('تهيئة السجل الخارجي تحتاج إجراء إعداد صريحًا.');
    const baseline=await this.baseline(),entries=await this.journal.entries(),existing=entries.filter(e=>e.phase==='baseline');
    if(existing.length===1&&existing[0].id===baselineId&&erasureDigest(existing[0].value)===erasureDigest(baseline))return {initialized:false};
    if(entries.length||(await this.db.$queryRaw<Array<{n:bigint}>>`SELECT count(*) AS n FROM "PrivacyErasureOperation"`)[0].n)return fail();
    await this.journal.put(baselineId,'baseline',baseline);return {initialized:true};
  }
  async onApplicationBootstrap(){
    const configured=['HYDROLAND_PRIVACY_RECOVERY_REQUIRED','HYDROLAND_PRIVACY_JOURNAL_NAMESPACE','HYDROLAND_PRIVACY_JOURNAL_KEY','HYDROLAND_PRIVACY_ERASURE_ENABLED']
      .some(k=>process.env[k]&&process.env[k]!=='false');
    const [table]=await this.db.$queryRaw<Array<{present:boolean}>>`SELECT to_regclass('"PrivacyErasureOperation"') IS NOT NULL AS present`;
    const local=table.present?(await this.db.$queryRaw<Array<{n:bigint}>>`SELECT count(*) AS n FROM "PrivacyErasureOperation"`)[0].n:0n;
    if(!configured&&!local)return;
    if(process.env.HYDROLAND_PRIVACY_RECOVERY_REQUIRED!=='true')throw new ServiceUnavailableException('يلزم استعادة إعداد سجل المحو الخارجي قبل تشغيل الخدمة.');
    if(process.env.HYDROLAND_PRIVACY_JOURNAL_INITIALIZE==='INITIALIZE_EMPTY_JOURNAL_ONCE')await this.initialize();
    await this.reconcile(false);
  }
  async reconcile(apply=false){
    this.ready=false;
    if(process.env.HYDROLAND_PRIVACY_RECOVERY_REQUIRED!=='true')throw new ServiceUnavailableException('بوابة استعادة المحو غير مفعلة.');
    const all=await this.journal.entries(),baselines=all.filter(e=>e.phase==='baseline'),baseline=await this.baseline();
    if(baselines.length!==1||baselines[0].id!==baselineId||erasureDigest(baselines[0].value)!==erasureDigest(baseline))return fail();
    const entries=all.filter(e=>e.phase!=='baseline'),groups=new Map<string,Map<string,unknown>>();
    for(const e of entries){const g=groups.get(e.id)??new Map<string,unknown>();if(g.has(e.phase))return fail();g.set(e.phase,e.value);groups.set(e.id,g);}
    const local=await this.db.$queryRaw<Array<{id:string;state:string;intent:unknown;intentHash:string;receipt:unknown;receiptHash:string|null}>>`SELECT id,state,intent,"intentHash",receipt,"receiptHash" FROM "PrivacyErasureOperation"`;
    for(const row of local)if(!groups.has(row.id)){
      // A crash before durable intent publication cannot authorize erasure.
      // During explicit offline repair only, cancel an unchanged preparation;
      // preserve both intent and cancellation externally, then allow restart.
      if(!apply||!['PREPARED','ABORTED'].includes(row.state)||row.receipt||row.receiptHash)return fail();
      const intent=intentValue(row.intent,row.id);if(erasureDigest(intent)!==row.intentHash)return fail();
      await this.db.serializable(async tx=>{
        const [current]=await tx.$queryRaw<Array<{state:string;intentHash:string;receipt:unknown}>>`SELECT state,"intentHash",receipt FROM "PrivacyErasureOperation" WHERE id=${row.id} FOR UPDATE`;
        if(!current||current.intentHash!==row.intentHash||current.receipt||!['PREPARED','ABORTED'].includes(current.state))return fail();
        if(current.state==='PREPARED'){
          const native=await inspectNativeRecord(tx,intent.plan,intent.disposition);
          if(erasureDigest(native)!==erasureDigest(intent.plan)||await tx.auditEvent.count({where:{resource:'PrivacyErasureOperation',resourceId:row.id,action:'PERSONAL_DATA_ERASED'}}))return fail();
          await tx.$executeRaw`UPDATE "PrivacyErasureOperation" SET state='ABORTED' WHERE id=${row.id}`;
        }
      });
      const abort={version:1,id:row.id,intentHash:row.intentHash,reason:'LOCAL_EXECUTION_NOT_APPLIED'};
      await this.journal.put(row.id,'intent',intent);await this.journal.put(row.id,'abort',abort);
      row.state='ABORTED';groups.set(row.id,new Map<string,unknown>([['intent',intent],['abort',abort]]));
    }
    let verified=0,replayed=0,aborted=0;
    for(const [id,g] of [...groups.entries()].sort(([a],[b])=>a.localeCompare(b))){
      const intent=intentValue(g.get('intent'),id),hash=erasureDigest(intent),row=local.find(r=>r.id===id);
      if(row&&row.intentHash!==hash)return fail();
      if(g.has('abort')){
        const terminal=object(g.get('abort'));
        if(g.has('commit')||terminal.id!==id||terminal.version!==1||terminal.intentHash!==hash||row&&row.state!=='ABORTED')return fail();
        aborted++;continue;
      }
      if(!g.has('commit')){
        if(apply&&row?.state==='ABORTED'){
          await this.journal.put(id,'abort',{version:1,id,intentHash:hash,reason:'LOCAL_EXECUTION_NOT_APPLIED'});
          aborted++;continue;
        }
        // A locally committed operation may have lost only its publication.
        // Without that exact local receipt the intent is ambiguous and blocked.
        if(!apply||!row||!['APPLIED_LOCAL','PUBLISHED'].includes(row.state)||!row.receipt||erasureDigest(row.receipt)!==row.receiptHash)return fail();
        if(!await this.db.serializable(tx=>nativeErasureSatisfied(tx,intent.plan)))return fail();
        await this.journal.put(id,'commit',row.receipt);g.set('commit',row.receipt);
      }
      const commit=object(g.get('commit'));
      if(commit.version!==1||commit.id!==id||commit.intentHash!==hash||!text(commit.executionAuditId)||!date(commit.appliedAt)||Date.parse(String(commit.appliedAt))<Date.parse(intent.createdAt)
        ||row?.state==='ABORTED'||row?.receiptHash&&row.receiptHash!==erasureDigest(commit))return fail();
      const satisfied=await this.db.serializable(tx=>nativeErasureSatisfied(tx,intent.plan));
      if(!satisfied){if(!apply)return fail();await this.replay(intent,commit as Terminal);replayed++;}
      else if(apply)await this.persistRecovered(intent,commit as Terminal);
      verified++;
    }
    if(!apply)this.ready=true;
    return {verified,replayed,aborted,unresolved:0,journalExternal:true};
  }
  private async replay(intent:ErasureIntent,commit:Terminal){
    await this.db.serializable(async tx=>{
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext('A15_RECOVERY_RECONCILIATION')::bigint)`;
      const current=await inspectNativeRecord(tx,intent.plan,intent.disposition);
      if(erasureDigest(current)!==erasureDigest(intent.plan))return fail();
      await applyNativeErasure(tx,intent.plan as NativePlan);
      if(!await nativeErasureSatisfied(tx,intent.plan))return fail();
      await this.persist(tx,intent,commit);
    });
  }
  private persistRecovered(intent:ErasureIntent,commit:Terminal){return this.db.serializable(tx=>this.persist(tx,intent,commit));}
  private async persist(tx:Parameters<Parameters<DatabaseService['serializable']>[0]>[0],intent:ErasureIntent,commit:Terminal){
    const digest=erasureDigest(intent),receiptHash=erasureDigest(commit);
    const [existing]=await tx.$queryRaw<Array<{state:string;intentHash:string;receiptHash:string|null}>>`SELECT state,"intentHash","receiptHash" FROM "PrivacyErasureOperation" WHERE id=${intent.id} FOR UPDATE`;
    if(existing&&(existing.intentHash!==digest||existing.state==='ABORTED'||existing.receiptHash&&existing.receiptHash!==receiptHash))return fail();
    if(!existing)await tx.$executeRaw`INSERT INTO "PrivacyErasureOperation" (id,"requestId","accountId",domain,"recordRef",scope,state,intent,"intentHash",receipt,"receiptHash","executionAuditId","createdAt","appliedAt","publishedAt")
      VALUES (${intent.id},${intent.requestId},${intent.plan.accountId},${intent.plan.domain},${intent.plan.recordRef},${intent.plan.scope},'PUBLISHED',${JSON.stringify(intent)}::jsonb,${digest},${JSON.stringify(commit)}::jsonb,${receiptHash},${commit.executionAuditId},${new Date(intent.createdAt)},${new Date(commit.appliedAt)},clock_timestamp())`;
    else await tx.$executeRaw`UPDATE "PrivacyErasureOperation" SET state='PUBLISHED',receipt=${JSON.stringify(commit)}::jsonb,"receiptHash"=${receiptHash},"executionAuditId"=${commit.executionAuditId},"appliedAt"=${new Date(commit.appliedAt)},"publishedAt"=COALESCE("publishedAt",clock_timestamp()) WHERE id=${intent.id}`;
    // The original audit remains the original event. Recovery records a new
    // event instead of forging it if the restored database predates that event.
    if(!await tx.auditEvent.count({where:{action:'privacy.erasure_recovery_verified',resource:'PrivacyErasureOperation',resourceId:intent.id}}))
      await tx.auditEvent.create({data:{action:'privacy.erasure_recovery_verified',resource:'PrivacyErasureOperation',resourceId:intent.id,metadata:{intentHash:digest,externalReceiptHash:receiptHash,originalAuditId:commit.executionAuditId}}});
  }
}
