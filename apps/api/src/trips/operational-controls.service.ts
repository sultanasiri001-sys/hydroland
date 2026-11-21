import { requireCatalogOwner } from './operational-control-owner';
import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import { OPERATIONAL_CONTROLS } from './operational-controls.catalog';
import { mandatoryBindingStatus } from './mandatory-policy.domain';

type Row={category:string;ruleKey:string;state:string;metadata?:unknown;updatedAt:Date};
export async function readOperationalControls(tx:Prisma.TransactionClient){
  const rows=await tx.$queryRaw<Row[]>`SELECT "category","ruleKey","state","metadata","updatedAt" FROM "PolicyControl"`;
  const settings=await tx.$queryRaw<Array<{value:Prisma.JsonObject;updatedAt:Date}>>`SELECT "value","updatedAt" FROM "OperationalSetting" WHERE "key"='WEATHER_GATE'`;
  return OPERATIONAL_CONTROLS.map(control=>{
   const row=rows.find(row=>row.category===control.category&&row.ruleKey===control.ruleKey);
   const policyState=row?.state||'ENABLED';
   const weather=control.category==='WEATHER'?settings[0]:undefined;
   const bindingStatus=mandatoryBindingStatus(control.category,control.ruleKey,row?.metadata);
   const state=bindingStatus==='MANDATORY'?'ENABLED':bindingStatus==='REVIEW_REQUIRED'?'REVIEW':control.category==='WEATHER'?(policyState==='ENABLED'&&weather?.value?.enabled===true&&weather.value.mode==='ENFORCE'?'ENABLED':'DISABLED'):policyState;
   const revision=createHash('sha256').update(JSON.stringify([row||null,control.category==='WEATHER'?weather||null:null])).digest('hex');
   return {...control,state,policyState,revision,mandatoryBindingStatus:bindingStatus,canDisable:bindingStatus==='OPTIONAL',updatedAt:row?.updatedAt||null};
  });
 }

type ControlRequestLink = {technologyRequestId:string; requestRevision:number; approvedByAccountId:string; rollback:boolean};

export async function changeOperationalControl(tx:Prisma.TransactionClient, audit:AuditService,
  accountId:string, id:string, input:Record<string,unknown>, request?:ControlRequestLink) {
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['state','reason','expectedRevision'].includes(k))||!['ENABLED','DISABLED'].includes(String(input.state)))throw new BadRequestException('اختر تشغيل أو إيقاف الضابط.');
  if(typeof input.reason!=='string'||input.reason.trim().length<10||input.reason.trim().length>500)throw new BadRequestException('اكتب سبب التغيير من 10 إلى 500 حرف.');
  if(typeof input.expectedRevision!=='string'||!/^[a-f0-9]{64}$/.test(input.expectedRevision))throw new BadRequestException('حدّث الحالة قبل الحفظ.');
  const control=OPERATIONAL_CONTROLS.find(control=>control.id===id);
  if(!control)throw new NotFoundException('الضابط غير موجود.');
  const state=String(input.state),reason=input.reason.trim();
   const admin=await tx.roleAssignment.findFirst({where:{accountId,role:'ADMIN',status:'ACTIVE',account:{status:'ACTIVE'}},select:{id:true}});
   if(!admin)throw new ForbiddenException('يتطلب التغيير حساب مسؤول نشط.');
   const previous=(await readOperationalControls(tx)).find(row=>row.id===id)!;
   if(previous.revision!==input.expectedRevision)throw new ConflictException('تغير الإعداد بواسطة مسؤول آخر. حدّث الحالة قبل الحفظ.');
   if(state==='DISABLED'&&!previous.canDisable)throw new ForbiddenException('لا يمكن تعطيل متطلب إلزامي أو مصدر معلق بالمراجعة عبر إعداد عام.');
   if(previous.state===state)return {control:previous,receipt:null};
   await tx.$executeRaw`
    INSERT INTO "PolicyControl" ("id","category","ruleKey","labelAr","state","description","updatedByAccountId","createdAt","updatedAt")
    VALUES (gen_random_uuid()::text,${control.category},${control.ruleKey},${control.labelAr},${state},${control.description},${accountId}::uuid,(CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),(CURRENT_TIMESTAMP AT TIME ZONE 'UTC'))
    ON CONFLICT ("category","ruleKey") DO UPDATE SET "state"=EXCLUDED."state","updatedByAccountId"=EXCLUDED."updatedByAccountId","updatedAt"=(clock_timestamp() AT TIME ZONE 'UTC')
   `;
   if(control.category==='WEATHER'){
    const value={enabled:state==='ENABLED',mode:state==='ENABLED'?'ENFORCE':'ADVISORY',provider:'STORMGLASS'};
    await tx.$executeRaw`INSERT INTO "OperationalSetting" ("key","value","updatedAt") VALUES ('WEATHER_GATE',${JSON.stringify(value)}::jsonb,(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')) ON CONFLICT ("key") DO UPDATE SET "value"=EXCLUDED."value","updatedAt"=(clock_timestamp() AT TIME ZONE 'UTC')`;
   }
   const current=(await readOperationalControls(tx)).find(row=>row.id===id)!;
   const receipt=await audit.record({actorId:accountId,action:'OPERATIONAL_CONTROL_CHANGED',resource:'PolicyControl',resourceId:id,metadata:{...request,accountId,category:control.category,ruleKey:control.ruleKey,previousState:previous.state,previousPolicyState:previous.policyState,state,reason,previousRevision:previous.revision,revision:current.revision}},tx);
   return {control:current,receipt};
}

@Injectable()
export class OperationalControlsService {
 constructor(private readonly db:DatabaseService,private readonly audit:AuditService){}
 list(){return this.db.serializable(tx=>readOperationalControls(tx));}
 async change(accountId:string,id:string,input:Record<string,unknown>){
   return this.db.serializable(async tx=>{
     const control=OPERATIONAL_CONTROLS.find(item=>item.id===id);
     if(!control)throw new NotFoundException('الضابط غير موجود.');
     await requireCatalogOwner(tx,accountId,control.category,control.ruleKey);
     return (await changeOperationalControl(tx,this.audit,accountId,id,input)).control;
   });
 }
}
