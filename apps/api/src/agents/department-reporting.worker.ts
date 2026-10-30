import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import { EmailDeliveryService, ReportEmailError } from '../integrations/email-delivery.service';
import { lockAdminIdentities } from '../admin/admin-authorization';
import { record } from '../hr/staffing-catalog';
import { DepartmentReportingService } from './department-reporting.service';
import { GovernanceReviewInboxService } from './governance-review-inbox.service';
import { executiveReportContext, parseReportCycle, REPORT_NOTIFICATION, REPORT_OFFICE_LABELS, REPORT_PREFIX, requireReportOwner } from './executive-report.domain';

const json=(value:unknown):Prisma.InputJsonValue=>JSON.parse(JSON.stringify(value));

@Injectable()
export class DepartmentReportingWorker implements OnModuleInit,OnModuleDestroy {
  private readonly logger=new Logger(DepartmentReportingWorker.name);
  private timer?:NodeJS.Timeout;
  private inflight?:Promise<void>;
  private stopping=false;
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly reporting:DepartmentReportingService,private readonly inbox:GovernanceReviewInboxService,private readonly email:EmailDeliveryService){}
  onModuleInit(){if(process.env.NODE_ENV==='test'&&process.env.HYDROLAND_AI_TEST_MANUAL_WORKER==='1')return;this.poll();this.timer=setInterval(()=>this.poll(),15_000);this.timer.unref?.();}
  async onModuleDestroy(){this.stopping=true;if(this.timer)clearInterval(this.timer);await this.inflight;}
  private poll(){if(this.stopping||this.inflight)return;this.inflight=this.tick().finally(()=>{this.inflight=undefined;});}
  private async tick(){
    try{await this.reporting.advance();}catch{this.logger.warn('Department report compilation needs attention; sources and saved results remain unchanged.');}
    if(this.stopping)return;
    try{await this.deliverNext();}catch{this.logger.warn('Department report delivery needs attention; uncertain attempts are never replayed automatically.');}
  }

  async deliverNext(){
    const now=new Date().toISOString();
    const pending=await this.db.notification.findFirst({where:{type:REPORT_NOTIFICATION,status:'PENDING',OR:[{payload:{path:['nextAttemptAt'],equals:Prisma.AnyNull}},{payload:{path:['nextAttemptAt'],lte:now}}]},select:{id:true},orderBy:[{createdAt:'asc'},{id:'asc'}]});
    if(!pending)return;
    const claim=await this.db.serializable(async tx=>{
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`report-email:${pending.id}`})::bigint)`;
      const row=await tx.notification.findUnique({where:{id:pending.id}});if(!row||row.type!==REPORT_NOTIFICATION||row.status!=='PENDING')return null;
      const payload=record(row.payload);
      if(typeof payload.nextAttemptAt==='string'&&Date.parse(payload.nextAttemptAt)>Date.now())return null;
      if(payload.deliveryState==='ATTEMPTING'){
        await tx.notification.update({where:{id:row.id},data:{status:'FAILED',payload:json({...payload,deliveryState:'UNCERTAIN',manualReconciliationRequired:true})}});
        const setting=typeof payload.cycleId==='string'?await tx.operationalSetting.findUnique({where:{key:REPORT_PREFIX+payload.cycleId}}):null;
        if(setting){const cycle=parseReportCycle(setting.value);if(cycle.notificationId===row.id&&cycle.state==='EMAIL_PENDING'){cycle.state='ATTENTION_REQUIRED';cycle.reason='EMAIL_UNCERTAIN';await tx.operationalSetting.update({where:{key:setting.key},data:{value:json(cycle),updatedAt:new Date()}});}}
        return null;
      }
      if(!['PENDING','DEFERRED'].includes(String(payload.deliveryState)))return null;
      await lockAdminIdentities(tx,row.accountId);await requireReportOwner(tx,row.accountId);
      const task=typeof payload.executiveTaskId==='string'?await tx.aiAgentTask.findUnique({where:{id:payload.executiveTaskId}}):null;
      if(!task||task.state!=='COMPLETED'||!task.result||task.revision!==payload.executiveRevision)throw new Error('Report output changed.');
      const {cycle,bundle}=await executiveReportContext(tx,task,this.inbox);
      if(!cycle.sendEmail||cycle.ownerId!==row.accountId||cycle.state!=='EMAIL_PENDING'||cycle.notificationId!==row.id||cycle.id!==payload.cycleId||cycle.bundleDigest!==payload.bundleDigest)throw new Error('Report email binding changed.');
      const owner=await tx.account.findUnique({where:{id:cycle.ownerId},select:{email:true}});if(!owner)throw new Error('Owner unavailable.');
      const attemptId=randomUUID(),attempts=Number(payload.attempts)||0;
      // All retries finish within one hour, well inside the provider's idempotency window.
      if(attempts>=5||Date.now()-row.createdAt.getTime()>60*60_000){await tx.notification.update({where:{id:row.id},data:{status:'FAILED',payload:json({...payload,deliveryState:'EXPIRED',manualReconciliationRequired:true})}});return null;}
      const updated={...payload,deliveryState:'ATTEMPTING',attemptId,attempts:attempts+1,nextAttemptAt:new Date(Date.now()+120_000).toISOString()};
      await tx.notification.update({where:{id:row.id},data:{payload:json(updated)}});
      await this.audit.record({action:'EXECUTIVE_REPORT_EMAIL_DISPATCHED',resource:'Notification',resourceId:row.id,metadata:{cycleId:cycle.id,attemptId,approved:false}},tx);
      const manifest=bundle.entries.map(e=>`${e.departmentName}: ${REPORT_OFFICE_LABELS[e.officeStatus]||'تحتاج مراجعة'}`).join('\n');
      return{id:row.id,cycleId:cycle.id,attemptId,attempts:attempts+1,to:owner.email,text:`تقرير عبدالله عن إدارات هيدرولاند\n\n${task.result}\n\nحالات مكتب الحوكمة والامتثال والجودة كما سُجلت:\n${manifest}\n\nالتقرير للمتابعة واتخاذ القرار. الاعتماد النهائي لسلطان؛ لم ينفذ هذا التقرير أي إجراء.`,payload:updated};
    });
    if(!claim)return;
    let delivery:{provider:string;messageId:string}|undefined,disposition:'RETRYABLE'|'PERMANENT'|'UNCERTAIN'='UNCERTAIN';
    try{delivery=await this.email.sendExecutiveReport({notificationId:claim.id,to:claim.to,text:claim.text});}catch(error){disposition=error instanceof ReportEmailError?error.disposition:'UNCERTAIN';}
    // Persistence retries can never repeat the network request above.
    await this.db.serializable(async tx=>{
      const row=await tx.notification.findUnique({where:{id:claim.id}}),payload=record(row?.payload);
      if(!row||row.status!=='PENDING'||payload.deliveryState!=='ATTEMPTING'||payload.attemptId!==claim.attemptId)return;
      const retry=!delivery&&disposition==='RETRYABLE'&&claim.attempts<5;
      const deliveryState=delivery?'PROVIDER_ACCEPTED':retry?'DEFERRED':disposition;
      await tx.notification.update({where:{id:row.id},data:{status:delivery?'SENT':retry?'PENDING':'FAILED',...(delivery?{sentAt:new Date()}:{}),payload:json({...payload,deliveryState,...(delivery?{provider:delivery.provider,providerMessageId:delivery.messageId}:{}),nextAttemptAt:retry?new Date(Date.now()+30_000*2**claim.attempts).toISOString():null,manualReconciliationRequired:!delivery&&!retry})}});
      const setting=await tx.operationalSetting.findUnique({where:{key:REPORT_PREFIX+claim.cycleId}}),cycle=parseReportCycle(setting?.value);
      if(delivery){cycle.state='COMPLETE';}else if(!retry){cycle.state='ATTENTION_REQUIRED';cycle.reason='EMAIL_'+disposition;}
      await tx.operationalSetting.update({where:{key:REPORT_PREFIX+cycle.id},data:{value:json(cycle),updatedAt:new Date()}});
      await this.audit.record({action:delivery?'EXECUTIVE_REPORT_EMAIL_ACCEPTED':'EXECUTIVE_REPORT_EMAIL_NOT_ACCEPTED',resource:'Notification',resourceId:row.id,metadata:{cycleId:cycle.id,deliveryState,approved:false,inboxDeliveryVerified:false}},tx);
    });
  }
}
