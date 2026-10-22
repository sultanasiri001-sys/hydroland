import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import { TrainingAuthorizationService } from './training-authorization.service';
import { trainingCompletion, trainingRecordEditable } from './training-completion-policy';
import { sessionRevision } from './training-session-policy';

const graph={enrollment:true,certificate:{select:{id:true}},stages:{include:{skills:true},orderBy:{sequence:'asc' as const}},sessions:{select:{status:true}}} satisfies Prisma.TrainingRecordInclude;
type TrainingGraph=Prisma.TrainingRecordGetPayload<{include:typeof graph}>;
@Injectable()
export class TrainingCourseProgressService {
 constructor(private readonly db:DatabaseService,private readonly authorization:TrainingAuthorizationService,private readonly audit:AuditService){}
 private fields(body:Record<string,unknown>,allowed:string[]){if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!allowed.includes(key)))throw new BadRequestException('حقول خطة التدريب غير صالحة.');}
 private text(value:unknown,name:string,max:number){if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw new BadRequestException(name+' مطلوب، بحد أقصى '+max+' حرف.');return value.trim();}
 private revision(value:unknown){if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw new BadRequestException('حدّث خطة الدورة قبل الحفظ.');return new Date(value);}
 private editable(record:TrainingGraph){return trainingRecordEditable(record);}
 private view(record:TrainingGraph){
  const completion=trainingCompletion(record),canEdit=this.editable(record),reasons=[...completion.reasons];
  if(record.status==='COMPLETED'&&record.enrollment.status==='COMPLETED'&&completion.ready)reasons.push('اكتمل سجل الدورة. الشهادة تتطلب توصية ومراجعة مستقلة.');
  else{if(record.enrollment.status!=='ACTIVE')reasons.push('يجب أن تكون الدورة نشطة لإتمامها.');if(!canEdit)reasons.push('السجل مغلق أو موقوف ولا يقبل تعديلات.');}
  return {enrollmentId:record.enrollmentId,courseCode:record.enrollment.courseCode,enrollmentStatus:record.enrollment.status,record:{id:record.id,status:record.status,updatedAt:record.updatedAt,progressPercent:completion.progressPercent},stages:record.stages.map(stage=>({id:stage.id,stageType:stage.stageType,deliveryMode:stage.deliveryMode,sequence:stage.sequence,skills:stage.skills.map(skill=>({id:skill.id,skillCode:skill.skillCode,name:skill.name,status:skill.status,signedOffAt:skill.signedOffAt}))})),canEdit,canComplete:reasons.length===0,completionReasons:reasons};
 }
 async plan(actorId:string,enrollmentId:string){
  await this.authorization.assertProfessionalEnrollmentAccess(actorId,enrollmentId);
  const record=await this.db.trainingRecord.findUnique({where:{enrollmentId},include:graph});
  if(record)return this.view(record);
  const enrollment=await this.db.trainingEnrollment.findUniqueOrThrow({where:{id:enrollmentId}});
  return {enrollmentId,courseCode:enrollment.courseCode,enrollmentStatus:enrollment.status,record:null,updatedAt:enrollment.updatedAt,stages:[],canEdit:['PENDING','ACTIVE'].includes(enrollment.status),canComplete:false,completionReasons:['أضف مهارة واحدة على الأقل إلى خطة التدريب.','أكمل جلسة تدريب واحدة على الأقل.']};
 }
 async addPlanSkill(actorId:string,enrollmentId:string,body:Record<string,unknown>){
  this.fields(body,['requestId','expectedUpdatedAt','stageId','stageType','deliveryMode','skillCode','name','reason']);
  if(typeof body.requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.requestId))throw new BadRequestException('معرّف الحفظ غير صالح.');
  const requestId=body.requestId,revision=this.revision(body.expectedUpdatedAt),skillCode=this.text(body.skillCode,'رمز المهارة',80),name=this.text(body.name,'اسم المهارة',200),reason=this.text(body.reason,'ملاحظة الخطة',1000);
  const stageId=body.stageId===undefined?null:this.text(body.stageId,'معرّف المرحلة',80),stageType=stageId?null:this.text(body.stageType,'اسم المرحلة',80),deliveryMode=stageId?null:this.text(body.deliveryMode,'طريقة التدريب',40);
  if(!stageId&&!['THEORY','PRACTICAL','ONLINE','BLENDED'].includes(deliveryMode!))throw new BadRequestException('طريقة التدريب غير صالحة.');
  const fingerprint=createHash('sha256').update(JSON.stringify({actorId,enrollmentId,revision:revision.toISOString(),stageId,stageType,deliveryMode,skillCode,name,reason})).digest('hex');
  const work=async(tx:Prisma.TransactionClient)=>{
   await this.authorization.assertProfessionalEnrollmentAccess(actorId,enrollmentId,tx);
   let record=await tx.trainingRecord.findUnique({where:{enrollmentId},include:graph});
   const replay=await tx.trainingSkill.findUnique({where:{id:requestId},select:{id:true}});
   if(replay){if(!await tx.auditEvent.findFirst({where:{action:'training.plan_skill_added',resourceId:requestId,metadata:{path:['requestFingerprint'],equals:fingerprint}},select:{id:true}}))throw new ConflictException('معرّف الحفظ مستخدم لطلب آخر.');return {enrollmentId,replayed:true};}
   const enrollment=record?.enrollment||await tx.trainingEnrollment.findUniqueOrThrow({where:{id:enrollmentId}});
   if((record?.updatedAt||enrollment.updatedAt).getTime()!==revision.getTime())throw new ConflictException('تغيرت خطة الدورة. حدّثها قبل الحفظ.');
   if(!['PENDING','ACTIVE'].includes(enrollment.status)||record&&!this.editable(record))throw new ConflictException('السجل مغلق أو موقوف ولا يقبل تعديل الخطة.');
   if(!record)record=await tx.trainingRecord.create({data:{enrollmentId},include:graph});
   if(record.stages.flatMap(stage=>stage.skills).length>=200)throw new ConflictException('وصلت الخطة إلى الحد الأقصى للمهارات.');
   let stage=stageId?record.stages.find(item=>item.id===stageId):undefined;
   if(stageId&&!stage)throw new BadRequestException('المرحلة ليست ضمن سجل هذه الدورة.');
   if(!stage){if(record.stages.length>=50)throw new ConflictException('وصلت الخطة إلى الحد الأقصى للمراحل.');stage=await tx.trainingStage.create({data:{id:randomUUID(),trainingRecordId:record.id,stageType:stageType!,deliveryMode:deliveryMode!,sequence:1+Math.max(0,...record.stages.map(item=>item.sequence))},include:{skills:true}});}
   if(stage.skills.some(skill=>skill.skillCode===skillCode))throw new ConflictException('رمز المهارة موجود في هذه المرحلة.');
   await tx.trainingSkill.create({data:{id:requestId,trainingStageId:stage.id,skillCode,name}});
   const updated=await tx.trainingRecord.findUniqueOrThrow({where:{id:record.id},include:graph});
   await tx.trainingRecord.update({where:{id:record.id},data:{progressPercent:trainingCompletion(updated).progressPercent,updatedAt:sessionRevision(record.updatedAt)}});
   await tx.trainingEnrollment.update({where:{id:enrollmentId},data:{updatedAt:sessionRevision(enrollment.updatedAt)}});
   await this.audit.record({actorId,action:'training.plan_skill_added',resource:'trainingSkill',resourceId:requestId,metadata:{enrollmentId,stageId:stage.id,reason,requestFingerprint:fingerprint}},tx);
   return {enrollmentId,replayed:false};
  };
  try{return await this.db.serializable(work)}catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002')return this.db.serializable(work);throw error;}
 }
 async assessSkill(actorId:string,id:string,status:string){
  if(!['IN_PROGRESS','COMPETENT','NEEDS_REVIEW'].includes(status))throw new BadRequestException('حالة المهارة غير صالحة.');
  return this.db.serializable(async tx=>{
   const current=await tx.trainingSkill.findUniqueOrThrow({where:{id},include:{trainingStage:{include:{trainingRecord:{include:graph}}}}});
   const record=current.trainingStage.trainingRecord;
   await this.authorization.assertProfessionalEnrollmentAccess(actorId,record.enrollmentId,tx);
   if(!this.editable(record))throw new ConflictException('السجل مغلق أو موقوف ولا يقبل تقييم المهارات.');
   const skill=await tx.trainingSkill.update({where:{id},data:{status,signedOffByInstructorId:status==='COMPETENT'?actorId:null,signedOffAt:status==='COMPETENT'?new Date():null}});
   const updated=await tx.trainingRecord.findUniqueOrThrow({where:{id:record.id},include:graph}),completion=trainingCompletion(updated);
   await tx.trainingRecord.update({where:{id:record.id},data:{progressPercent:completion.progressPercent,updatedAt:sessionRevision(record.updatedAt)}});
   for(const stage of updated.stages){const ready=trainingCompletion({stages:[stage],sessions:[]});await tx.trainingStage.update({where:{id:stage.id},data:{progressPercent:ready.progressPercent,status:ready.skillCount&&ready.signedSkillCount===ready.skillCount?'COMPLETED':ready.signedSkillCount?'IN_PROGRESS':'NOT_STARTED'}});}
   await this.audit.record({actorId,action:'training.skill_assessed',resource:'trainingSkill',resourceId:id,metadata:{enrollmentId:record.enrollmentId,status,progressPercent:completion.progressPercent}},tx);
   return skill;
  });
 }
 async complete(actorId:string,enrollmentId:string,body:Record<string,unknown>){
  this.fields(body,['expectedUpdatedAt','reason','reviewed']);const revision=this.revision(body.expectedUpdatedAt),reason=this.text(body.reason,'ملاحظات الإتمام',1000);
  if(body.reviewed!==true)throw new BadRequestException('أكد مراجعة المهارات والجلسات قبل إتمام الدورة.');
  return this.db.serializable(async tx=>{
   await this.authorization.assertProfessionalEnrollmentAccess(actorId,enrollmentId,tx);
   const record=await tx.trainingRecord.findUnique({where:{enrollmentId},include:graph});
   if(!record)throw new ConflictException('سجل التدريب غير موجود.');
   const completion=trainingCompletion(record);
   if(record.status==='COMPLETED'&&record.enrollment.status==='COMPLETED'&&completion.ready)return {enrollmentId,status:'COMPLETED',replayed:true};
   if(record.updatedAt.getTime()!==revision.getTime())throw new ConflictException('تغير سجل التدريب. حدّث الخطة قبل الإتمام.');
   const view=this.view(record);if(!view.canComplete)throw new ConflictException(view.completionReasons.join(' '));
   const now=new Date();await tx.trainingRecord.update({where:{id:record.id},data:{status:'COMPLETED',progressPercent:100,completedAt:now,updatedAt:sessionRevision(record.updatedAt)}});
   await tx.trainingEnrollment.update({where:{id:enrollmentId},data:{status:'COMPLETED',completedAt:now,updatedAt:sessionRevision(record.enrollment.updatedAt)}});
   await this.audit.record({actorId,action:'training.course_completed',resource:'trainingEnrollment',resourceId:enrollmentId,metadata:{trainingRecordId:record.id,reason,skillCount:completion.skillCount}},tx);
   return {enrollmentId,status:'COMPLETED',replayed:false};
  });
 }
}
