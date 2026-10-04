import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TrainingSessionStatus } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import { TrainingAuthorizationService } from './training-authorization.service';
import { hasInstructorCenterAccess } from './training-center-scope';
import { courseSchedulable, sessionControls, sessionEvidence, sessionRevision } from './training-session-policy';

const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const recordInclude={certificate:{select:{id:true}},enrollment:true} satisfies Prisma.TrainingRecordInclude;

@Injectable()
export class TrainingSessionService {
 constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly authorization:TrainingAuthorizationService){}
 private fields(body:Record<string,unknown>,allowed:string[]){
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!allowed.includes(key)))throw new BadRequestException('حقول الجلسة غير صالحة.');
 }
 private revision(value:unknown){
  if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw new BadRequestException('حدّث بيانات الجلسة قبل الحفظ.');
  return new Date(value);
 }
 private reason(value:unknown){
  if(typeof value!=='string'||!value.trim()||value.trim().length>1000)throw new BadRequestException('سبب الإجراء مطلوب، بحد أقصى 1000 حرف.');
  return value.trim();
 }
 private dates(body:Record<string,unknown>){
  const parse=(value:unknown)=>{
   if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value)))throw new BadRequestException('أدخل تاريخًا ووقتًا صالحين مع المنطقة الزمنية.');
   const day=value.slice(0,10),calendar=new Date(day+'T00:00:00Z');
   if(!Number.isFinite(calendar.getTime())||calendar.toISOString().slice(0,10)!==day||Number(value.slice(11,13))>23||Number(value.slice(14,16))>59)throw new BadRequestException('تاريخ الجلسة غير صالح.');
   return new Date(value);
  };
  const startsAt=parse(body.startsAt),endsAt=parse(body.endsAt);
  if(startsAt<=new Date()||endsAt<=startsAt)throw new BadRequestException('اختر موعد بداية قادمًا ونهاية بعد البداية.');
  return {startsAt,endsAt};
 }
 private async center(tx:Prisma.TransactionClient,actorId:string){
  const member=await tx.organizationMember.findFirst({where:{accountId:actorId,status:'ACTIVE',role:{in:['OWNER','ADMIN']},organization:{kind:'DIVE_CENTER',status:'ACTIVE'},account:{status:'ACTIVE',roleAssignments:{some:{role:'DIVE_CENTER',status:'ACTIVE'}}}},select:{organizationId:true},orderBy:{createdAt:'asc'}});
  if(!member)throw new ForbiddenException('يتطلب الإجراء إدارة مركز غوص نشط.');return member.organizationId;
 }
 private async eligible(tx:Prisma.TransactionClient,instructorId:string,centerId:string|null){
  const active=await tx.roleAssignment.findFirst({where:{accountId:instructorId,role:'INSTRUCTOR',status:'ACTIVE',account:{status:'ACTIVE'}},select:{id:true}});
  if(!active||!await hasInstructorCenterAccess(tx,instructorId,centerId))throw new ConflictException('المدرب غير مؤهل حاليًا أو عضويته غير نشطة في المركز.');
 }
 async assertAvailable(tx:Prisma.TransactionClient,instructorId:string,studentId:string,startsAt:Date,endsAt:Date,excludeId?:string){
  const conflict=await tx.trainingSession.findFirst({where:{...(excludeId?{id:{not:excludeId}}:{}),status:{in:['SCHEDULED','CHECK_IN_OPEN','IN_PROGRESS']},AND:[{OR:[{instructorAccountId:instructorId},{trainingRecord:{enrollment:{studentAccountId:studentId}}}]},{OR:[{status:'IN_PROGRESS'},{startsAt:{lt:endsAt},OR:[{endsAt:{gt:startsAt}},{endsAt:null}]}]}]},select:{id:true}});
  if(conflict)throw new ConflictException('يوجد تعارض في جدول المدرب أو المتدرب، أو جلسة مفتوحة بلا وقت انتهاء. راجع المواعيد.');
 }
 private async notify(tx:Prisma.TransactionClient,ids:string[],payload:Prisma.InputJsonObject){
  const accounts=await tx.account.findMany({where:{id:{in:[...new Set(ids)]}},select:{id:true}});
  await tx.notification.createMany({data:accounts.map(row=>({accountId:row.id,type:'TRAINING_SESSION_CHANGED',status:'SENT',sentAt:new Date(),payload}))});
 }
 private async touch(tx:Prisma.TransactionClient,enrollment:{id:string;updatedAt:Date},activate=false){
  const updatedAt=sessionRevision(enrollment.updatedAt);
  const changed=await tx.trainingEnrollment.updateMany({where:{id:enrollment.id,updatedAt:enrollment.updatedAt},data:{updatedAt,...(activate?{status:'ACTIVE'}:{})}});
  if(changed.count!==1)throw new ConflictException('تغيرت الدورة. حدّث القائمة قبل الحفظ.');return updatedAt;
 }

 async create(actorId:string,id:string,body:Record<string,unknown>,centerPortal=true){
  this.fields(body,['instructorAccountId','startsAt','endsAt','trainingStageId','reason','requestId','expectedUpdatedAt']);
  if(!uuid(body.instructorAccountId)||!uuid(body.requestId)||(body.trainingStageId!==undefined&&!uuid(body.trainingStageId)))throw new BadRequestException('معرّف المدرب أو الجلسة أو المرحلة غير صالح.');
  const instructorId=body.instructorAccountId,requestId=body.requestId,stageId=body.trainingStageId as string|undefined;
  const reason=this.reason(body.reason),revision=this.revision(body.expectedUpdatedAt);
  // Check committed requests before future-time validation so an exact retry
  // remains recoverable after its original scheduled start.
  const fingerprint=createHash('sha256').update(JSON.stringify({actorId,id,centerPortal,instructorId,stageId:stageId||null,startsAt:body.startsAt,endsAt:body.endsAt,reason,revision:revision.toISOString()})).digest('hex');
  const work=async(tx:Prisma.TransactionClient)=>{
   const centerId=centerPortal?await this.center(tx,actorId):null;
   if(!centerPortal)await this.authorization.assertRecordAccess(actorId,id,tx);
   const enrollment=await tx.trainingEnrollment.findFirst({where:centerPortal?{id,centerOrganizationId:centerId!}:{record:{id}},include:{record:{include:{certificate:{select:{id:true}}}}}});
   if(!enrollment)throw new NotFoundException('الدورة غير موجودة في المركز.');
   const replay=await tx.trainingSession.findUnique({where:{id:requestId},select:{id:true,status:true,updatedAt:true,trainingRecord:{select:{enrollmentId:true}}}});
   if(replay){
    const original=replay.trainingRecord.enrollmentId===enrollment.id&&await tx.auditEvent.findFirst({where:{resourceId:requestId,action:'training.session_created',metadata:{path:['requestFingerprint'],equals:fingerprint}},select:{id:true}});
    if(!original)throw new ConflictException('معرّف الحفظ مستخدم لطلب آخر.');return {id:replay.id,status:replay.status,updatedAt:replay.updatedAt,replayed:true};
   }
   if(enrollment.updatedAt.getTime()!==revision.getTime())throw new ConflictException('تغيرت الدورة. حدّث القائمة قبل إضافة الجلسة.');
   if(!courseSchedulable(enrollment))throw new ConflictException('لا يمكن جدولة دورة موقوفة أو منتهية أو لها شهادة.');
   await this.eligible(tx,instructorId,enrollment.centerOrganizationId);
   const dates=this.dates(body);
   if(stageId&&!await tx.trainingStage.findFirst({where:{id:stageId,trainingRecord:{enrollmentId:enrollment.id}},select:{id:true}}))throw new BadRequestException('المرحلة ليست ضمن سجل هذه الدورة.');
   await this.assertAvailable(tx,instructorId,enrollment.studentAccountId,dates.startsAt,dates.endsAt);
   const record=enrollment.record||await tx.trainingRecord.create({data:{enrollmentId:enrollment.id}});
   const session=await tx.trainingSession.create({data:{id:requestId,trainingRecordId:record.id,instructorAccountId:instructorId,trainingStageId:stageId,...dates}});
   if(record.status==='NOT_STARTED')await tx.trainingRecord.update({where:{id:record.id},data:{status:'SCHEDULED'}});
   await this.touch(tx,enrollment);
   await this.audit.record({actorId,action:'training.session_created',resource:'trainingSession',resourceId:session.id,metadata:{enrollmentId:enrollment.id,instructorAccountId:instructorId,startsAt:dates.startsAt.toISOString(),endsAt:dates.endsAt.toISOString(),reason,requestFingerprint:fingerprint}},tx);
   await this.notify(tx,[enrollment.studentAccountId,instructorId],{title:'جلسة تدريب جديدة',message:'تمت جدولة جلسة للدورة '+enrollment.courseCode+'.',enrollmentId:enrollment.id,sessionId:session.id});
   return {id:session.id,status:session.status,updatedAt:session.updatedAt,replayed:false};
  };
  try{return await this.db.serializable(work)}catch(error){
   // Concurrent first sessions can also collide on the record's unique key.
   // Re-read the committed request/revision instead of returning a server error.
   if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002')return this.db.serializable(work);
   throw error;
  }
 }

 async reschedule(actorId:string,id:string,body:Record<string,unknown>){
  this.fields(body,['startsAt','endsAt','reason','expectedUpdatedAt']);
  const reason=this.reason(body.reason),revision=this.revision(body.expectedUpdatedAt),dates=this.dates(body);
  return this.db.serializable(async tx=>{
   const centerId=await this.center(tx,actorId);
   const row=await tx.trainingSession.findFirst({where:{id,trainingRecord:{enrollment:{centerOrganizationId:centerId}}},include:{trainingRecord:{include:recordInclude}}});
   if(!row)throw new NotFoundException('الجلسة غير موجودة في المركز.');
   if(row.updatedAt.getTime()!==revision.getTime())throw new ConflictException('تغيرت الجلسة. حدّث القائمة قبل تعديل الموعد.');
   const course={...row.trainingRecord.enrollment,record:row.trainingRecord};
   if(!sessionControls(course,row).canReschedule)throw new ConflictException('يمكن تعديل موعد الجلسة المجدولة قبل فتح الحضور فقط.');
   await this.eligible(tx,row.instructorAccountId,centerId);
   await this.assertAvailable(tx,row.instructorAccountId,course.studentAccountId,dates.startsAt,dates.endsAt,id);
   if(row.startsAt.getTime()===dates.startsAt.getTime()&&row.endsAt?.getTime()===dates.endsAt.getTime())return {id,updatedAt:row.updatedAt,status:row.status};
   const updatedAt=sessionRevision(row.updatedAt);
   const changed=await tx.trainingSession.updateMany({where:{id,updatedAt:revision},data:{...dates,updatedAt}});
   if(changed.count!==1)throw new ConflictException('تغيرت الجلسة. حدّث القائمة.');
   await this.touch(tx,course);
   await this.audit.record({actorId,action:'training.session_rescheduled',resource:'trainingSession',resourceId:id,metadata:{enrollmentId:course.id,reason,from:{startsAt:row.startsAt.toISOString(),endsAt:row.endsAt?.toISOString()||null},to:{startsAt:dates.startsAt.toISOString(),endsAt:dates.endsAt.toISOString()}}},tx);
   await this.notify(tx,[course.studentAccountId,row.instructorAccountId],{title:'تعديل موعد التدريب',message:'تم تعديل موعد جلسة الدورة '+course.courseCode+'.',enrollmentId:course.id,sessionId:id});
   return {id,status:row.status,updatedAt};
  });
 }

 async act(actorId:string,id:string,body:Record<string,unknown>,scope:'center'|'professional'|'legacy'='center'){
  this.fields(body,scope==='professional'?['action','expectedUpdatedAt']:['action','expectedUpdatedAt','reason']);
  const action=body.action;
  if(typeof action!=='string'||!['OPEN','INSTRUCTOR_CHECK_IN','STUDENT_CHECK_IN','START','COMPLETE','CANCEL'].includes(action)||(scope==='professional'&&!['OPEN','INSTRUCTOR_CHECK_IN'].includes(action)))throw new BadRequestException('إجراء الجلسة غير صالح.');
  const revision=this.revision(body.expectedUpdatedAt),reason=scope==='professional'?'إجراء صاحب التكليف من بوابة المدرب':this.reason(body.reason);
  return this.db.serializable(async tx=>{
   const centerId=scope==='center'?await this.center(tx,actorId):null;
   if(scope!=='center')await this.authorization.assertSessionAccess(actorId,id,tx);
   const row=await tx.trainingSession.findFirst({where:{id,...(centerId?{trainingRecord:{enrollment:{centerOrganizationId:centerId}}}:{})},include:{trainingRecord:{include:recordInclude}}});
   if(!row)throw new NotFoundException('الجلسة غير موجودة في المركز.');
   const course={...row.trainingRecord.enrollment,record:row.trainingRecord};
   if(scope==='professional'){
    if(row.instructorAccountId!==actorId)throw new ForbiddenException('تسجيل الحضور الذاتي لصاحب تكليف الجلسة فقط.');
    await this.eligible(tx,actorId,course.centerOrganizationId);
   }
   if(row.updatedAt.getTime()!==revision.getTime())throw new ConflictException('تغيرت الجلسة. حدّث القائمة قبل الحفظ.');
   const now=new Date(),controls=sessionControls(course,row,now);
   if(!controls.actions.includes(action))throw new ConflictException('الإجراء غير متاح في حالة الجلسة الحالية. يفتح الحضور قبل الموعد بـ30 دقيقة، ويبدأ التدريب بعد تسجيل الحضورين وحلول الموعد.');
   if(action!=='CANCEL')await this.eligible(tx,row.instructorAccountId,course.centerOrganizationId);
   if(action==='START')await this.assertAvailable(tx,row.instructorAccountId,course.studentAccountId,row.startsAt,row.endsAt!,id);
   const evidence:Prisma.JsonObject={...sessionEvidence(row.evidence)},at=now.toISOString(),updatedAt=sessionRevision(row.updatedAt);
   let status:TrainingSessionStatus=row.status;
   if(action==='OPEN'){status='CHECK_IN_OPEN';evidence.checkInOpenedAt=at;evidence.checkInOpenedByAccountId=actorId;}
   if(action.endsWith('_CHECK_IN')){
    const prefix=action==='INSTRUCTOR_CHECK_IN'?'instructor':'student';evidence[prefix+'CheckInAt']=at;evidence[prefix+'CheckInByAccountId']=actorId;evidence[prefix+'CheckInSource']=scope==='professional'?'SELF':scope==='center'?'CENTER':'AUTHORIZED_OPERATOR';
   }
   if(action==='START'){status='IN_PROGRESS';evidence.startedAt=at;evidence.startedByAccountId=actorId;}
   if(action==='COMPLETE'){status='COMPLETED';evidence.endedAt=at;evidence.completedByAccountId=actorId;}
   if(action==='CANCEL'){status='CANCELLED';evidence.cancelledAt=at;evidence.cancelledByAccountId=actorId;}
   const changed=await tx.trainingSession.updateMany({where:{id,updatedAt:revision,status:row.status},data:{status,evidence,updatedAt}});
   if(changed.count!==1)throw new ConflictException('تغيرت الجلسة. حدّث القائمة.');
   await this.touch(tx,course,action==='START'&&course.status==='PENDING');
   if(action==='START')await tx.trainingRecord.update({where:{id:row.trainingRecordId},data:{status:'IN_PROGRESS',startedAt:row.trainingRecord.startedAt||now}});
   await this.audit.record({actorId,action:'training.session_action',resource:'trainingSession',resourceId:id,metadata:{enrollmentId:course.id,action,reason,source:scope,from:row.status,to:status}},tx);
   if(action==='CANCEL')await this.notify(tx,[course.studentAccountId,row.instructorAccountId],{title:'إلغاء جلسة تدريب',message:'أُلغيت جلسة للدورة '+course.courseCode+' مع حفظ سجلها.',enrollmentId:course.id,sessionId:id});
   return {id,status,updatedAt,attendance:sessionControls(course,{...row,status,evidence}).attendance};
  });
 }
 legacyStatus(actorId:string,id:string,body:Record<string,unknown>){
  this.fields(body,['status','expectedUpdatedAt','reason']);
  const action=({CHECK_IN_OPEN:'OPEN',IN_PROGRESS:'START',COMPLETED:'COMPLETE',CANCELLED:'CANCEL'} as Record<string,string>)[String(body.status)];
  return this.act(actorId,id,{action,expectedUpdatedAt:body.expectedUpdatedAt,reason:body.reason},'legacy');
 }
}
