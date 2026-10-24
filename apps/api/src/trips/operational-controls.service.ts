import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import { OPERATIONAL_CONTROLS } from './operational-controls.catalog';

type Row={category:string;ruleKey:string;state:string;updatedAt:Date};
@Injectable()
export class OperationalControlsService {
 constructor(private readonly db:DatabaseService,private readonly audit:AuditService){}
 private async snapshot(tx:Prisma.TransactionClient){
  const rows=await tx.$queryRaw<Row[]>`SELECT "category","ruleKey","state","updatedAt" FROM "PolicyControl"`;
  const settings=await tx.$queryRaw<Array<{value:Prisma.JsonObject;updatedAt:Date}>>`SELECT "value","updatedAt" FROM "OperationalSetting" WHERE "key"='WEATHER_GATE'`;
  return OPERATIONAL_CONTROLS.map(control=>{
   const row=rows.find(row=>row.category===control.category&&row.ruleKey===control.ruleKey);
   const policyState=row?.state||'ENABLED';
   const weather=control.category==='WEATHER'?settings[0]:undefined;
   const state=control.category==='WEATHER'?(policyState==='ENABLED'&&weather?.value?.enabled===true&&weather.value.mode==='ENFORCE'?'ENABLED':'DISABLED'):policyState;
   const revision=createHash('sha256').update(JSON.stringify([row||null,control.category==='WEATHER'?weather||null:null])).digest('hex');
   return {...control,state,policyState,revision,updatedAt:row?.updatedAt||null};
  });
 }
 list(){return this.db.serializable(tx=>this.snapshot(tx));}
 async change(accountId:string,id:string,input:Record<string,unknown>){
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['state','reason','expectedRevision'].includes(k))||!['ENABLED','DISABLED'].includes(String(input.state)))throw new BadRequestException('اختر تشغيل أو إيقاف الضابط.');
  if(typeof input.reason!=='string'||input.reason.trim().length<10||input.reason.trim().length>500)throw new BadRequestException('اكتب سبب التغيير من 10 إلى 500 حرف.');
  if(typeof input.expectedRevision!=='string'||!/^[a-f0-9]{64}$/.test(input.expectedRevision))throw new BadRequestException('حدّث الحالة قبل الحفظ.');
  const control=OPERATIONAL_CONTROLS.find(control=>control.id===id);
  if(!control)throw new NotFoundException('الضابط غير موجود.');
  const state=String(input.state),reason=input.reason.trim();
  return this.db.serializable(async tx=>{
   const admin=await tx.roleAssignment.findFirst({where:{accountId,role:'ADMIN',status:'ACTIVE',account:{status:'ACTIVE'}},select:{id:true}});
   if(!admin)throw new ForbiddenException('يتطلب التغيير حساب مسؤول نشط.');
   const previous=(await this.snapshot(tx)).find(row=>row.id===id)!;
   if(previous.revision!==input.expectedRevision)throw new ConflictException('تغير الإعداد بواسطة مسؤول آخر. حدّث الحالة قبل الحفظ.');
   if(previous.state===state)return previous;
   await tx.$executeRaw`
    INSERT INTO "PolicyControl" ("id","category","ruleKey","labelAr","state","description","updatedByAccountId","createdAt","updatedAt")
    VALUES (gen_random_uuid()::text,${control.category},${control.ruleKey},${control.labelAr},${state},${control.description},${accountId}::uuid,NOW(),NOW())
    ON CONFLICT ("category","ruleKey") DO UPDATE SET "state"=EXCLUDED."state","updatedByAccountId"=EXCLUDED."updatedByAccountId","updatedAt"=clock_timestamp()
   `;
   if(control.category==='WEATHER'){
    const value={enabled:state==='ENABLED',mode:state==='ENABLED'?'ENFORCE':'ADVISORY',provider:'STORMGLASS'};
    await tx.$executeRaw`INSERT INTO "OperationalSetting" ("key","value","updatedAt") VALUES ('WEATHER_GATE',${JSON.stringify(value)}::jsonb,NOW()) ON CONFLICT ("key") DO UPDATE SET "value"=EXCLUDED."value","updatedAt"=clock_timestamp()`;
   }
   const current=(await this.snapshot(tx)).find(row=>row.id===id)!;
   await this.audit.record({actorId:accountId,action:'OPERATIONAL_CONTROL_CHANGED',resource:'PolicyControl',resourceId:id,metadata:{accountId,category:control.category,ruleKey:control.ruleKey,previousState:previous.state,previousPolicyState:previous.policyState,state,reason,previousRevision:previous.revision,revision:current.revision}},tx);
   return current;
  });
 }
}
