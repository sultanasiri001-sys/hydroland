import { TrainingSessionService } from './training-session.service';
import { courseSchedulable, sessionControls } from './training-session-policy';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import { TrainingAuthorizationService } from './training-authorization.service';
import { hasInstructorCenterAccess } from './training-center-scope';

const recordSelection={id:true,status:true,certificate:{select:{id:true}},sessions:{orderBy:{startsAt:'asc' as const},select:{id:true,instructorAccountId:true,status:true,startsAt:true,endsAt:true,updatedAt:true,evidence:true}}} satisfies Prisma.TrainingRecordSelect;
type SessionState={status:string;startsAt:Date;evidence:Prisma.JsonValue|null};
const hasEvidence=(value:Prisma.JsonValue|null)=>value!==null&&(typeof value!=='object'||Object.keys(value).length>0);
const movableSession=(row:SessionState,now:Date)=>row.status==='SCHEDULED'&&row.startsAt>now&&!hasEvidence(row.evidence);
const openSession=(row:SessionState,now:Date)=>!['COMPLETED','CANCELLED'].includes(row.status)&&!movableSession(row,now);
const mutableEnrollment=(row:{status:string;record:{status:string;certificate:unknown}|null})=>['PENDING','ACTIVE','SUSPENDED'].includes(row.status)&&row.record?.status!=='COMPLETED'&&!row.record?.certificate;
const nextRevision=(previous:Date)=>new Date(Math.max(Date.now(),previous.getTime()+1));

@Injectable()
export class TrainingAssignmentService {
 constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly authorization:TrainingAuthorizationService,private readonly sessions:TrainingSessionService){}

 private async center(tx:Prisma.TransactionClient,accountId:string){
  const role=await tx.roleAssignment.findFirst({where:{accountId,role:'DIVE_CENTER',status:'ACTIVE',account:{status:'ACTIVE'}},select:{id:true}});
  const member=await tx.organizationMember.findFirst({where:{accountId,status:'ACTIVE',role:{in:['OWNER','ADMIN']},organization:{kind:'DIVE_CENTER',status:'ACTIVE'}},select:{organization:{select:{id:true,displayName:true}}},orderBy:{createdAt:'asc'}});
  if(!role||!member)throw new ForbiddenException('يتطلب الإجراء إدارة مركز غوص نشط.');return member.organization;
 }
 private input(input:Record<string,unknown>,enrollment:boolean){
  const keys=['instructorAccountId','reason','expectedUpdatedAt',...(enrollment?['transferUpcomingSessions']:[])];
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!keys.includes(key)))throw new BadRequestException('حقول التكليف غير صالحة.');
  if(typeof input.instructorAccountId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.instructorAccountId))throw new BadRequestException('اختر المدرب من قائمة المركز.');
  if(typeof input.reason!=='string'||!input.reason.trim()||input.reason.trim().length>1000)throw new BadRequestException('سبب التكليف مطلوب، بحد أقصى 1000 حرف.');
  if(typeof input.expectedUpdatedAt!=='string'||!Number.isFinite(Date.parse(input.expectedUpdatedAt)))throw new BadRequestException('حدّث بيانات التكليف قبل الحفظ.');
  if(enrollment&&typeof input.transferUpcomingSessions!=='boolean')throw new BadRequestException('حدد هل تريد نقل الجلسات القادمة.');
  return {instructorAccountId:input.instructorAccountId,reason:input.reason.trim(),revision:new Date(input.expectedUpdatedAt),transfer:input.transferUpcomingSessions===true};
 }
 private async eligible(tx:Prisma.TransactionClient,accountId:string,centerId:string|null){
  const role=await tx.roleAssignment.findFirst({where:{accountId,role:'INSTRUCTOR',status:'ACTIVE',account:{status:'ACTIVE'}},select:{id:true}});
  if(!role||!await hasInstructorCenterAccess(tx,accountId,centerId))throw new ConflictException('المدرب غير مؤهل حاليًا أو عضويته غير نشطة في المركز. حدّث القائمة.');
 }
 private async notify(tx:Prisma.TransactionClient,accountIds:Array<string|null>,payload:Prisma.InputJsonObject){
  const accounts=await tx.account.findMany({where:{id:{in:[...new Set(accountIds.filter((id):id is string=>Boolean(id)))]}},select:{id:true}});
  await tx.notification.createMany({data:accounts.map(row=>({accountId:row.id,type:'TRAINING_ASSIGNMENT_CHANGED',status:'SENT',sentAt:new Date(),payload}))});
 }

 async listCenter(accountId:string,cursor?:string){
  if(cursor!==undefined&&(typeof cursor!=='string'||cursor.length>100))throw new BadRequestException('مؤشر الصفحة غير صالح.');
  return this.db.serializable(async tx=>{
   const center=await this.center(tx,accountId),now=new Date();
   const anchor=cursor?await tx.trainingEnrollment.findFirst({where:{id:cursor,centerOrganizationId:center.id},select:{id:true,enrolledAt:true}}):null;
   if(cursor&&!anchor)throw new NotFoundException('الصفحة غير موجودة في المركز.');
   const rows=await tx.trainingEnrollment.findMany({where:{centerOrganizationId:center.id,...(anchor?{OR:[{enrolledAt:{lt:anchor.enrolledAt}},{enrolledAt:anchor.enrolledAt,id:{lt:anchor.id}}]}:{})},select:{id:true,studentAccountId:true,instructorAccountId:true,courseCode:true,status:true,enrolledAt:true,updatedAt:true,record:{select:recordSelection}},orderBy:[{enrolledAt:'desc'},{id:'desc'}],take:51});
   const page=rows.slice(0,50);
   const members=await tx.organizationMember.findMany({where:{organizationId:center.id,status:'ACTIVE',role:{in:['OWNER','ADMIN','INSTRUCTOR']},account:{status:'ACTIVE',roleAssignments:{some:{role:'INSTRUCTOR',status:'ACTIVE'}}}},select:{accountId:true,account:{select:{person:{select:{firstName:true,lastName:true}}}}},orderBy:{createdAt:'asc'}});
   const ids=[...new Set(page.flatMap(row=>[row.studentAccountId,...(row.instructorAccountId?[row.instructorAccountId]:[]),...(row.record?.sessions.map(item=>item.instructorAccountId)??[])]))];
   const accounts=await tx.account.findMany({where:{id:{in:ids}},select:{id:true,person:{select:{firstName:true,lastName:true}}}});
   const name=(person:{firstName:string;lastName:string|null})=>[person.firstName,person.lastName].filter(Boolean).join(' ').trim()||'مستخدم';
   const names=new Map(accounts.map(row=>[row.id,name(row.person)])),eligibleIds=new Set(members.map(row=>row.accountId));
   const instructor=(id:string|null)=>id?{accountId:id,displayName:names.get(id)||'مدرب سابق',eligible:eligibleIds.has(id)}:null;
   return {center:{displayName:center.displayName},timeZone:'Asia/Riyadh',instructors:members.map(row=>({accountId:row.accountId,displayName:name(row.account.person)})),enrollments:page.map(row=>({id:row.id,courseCode:row.courseCode,status:row.status,enrolledAt:row.enrolledAt,updatedAt:row.updatedAt,student:{displayName:names.get(row.studentAccountId)||'متدرب'},instructor:instructor(row.instructorAccountId),canCreateSession:courseSchedulable(row),canAssign:mutableEnrollment(row)&&!row.record?.sessions.some(item=>openSession(item,now)),record:row.record?{id:row.record.id,status:row.record.status,sessions:row.record.sessions.map(item=>({id:item.id,status:item.status,startsAt:item.startsAt,endsAt:item.endsAt,updatedAt:item.updatedAt,instructor:instructor(item.instructorAccountId),...sessionControls(row,item,now),canAssign:mutableEnrollment(row)&&movableSession(item,now)}))}:null})),nextCursor:rows.length>50?page[page.length-1].id:null};
  });
 }

 async assignEnrollment(actorId:string,id:string,body:Record<string,unknown>,centerPortal=false){
  const input=this.input(body,true);
  return this.db.serializable(async tx=>{
   const center=centerPortal?await this.center(tx,actorId):null;
   if(!centerPortal)await this.authorization.assertAdministrativeEnrollmentAccess(actorId,id,tx);
   const row=await tx.trainingEnrollment.findFirst({where:{id,...(center?{centerOrganizationId:center.id}:{})},include:{record:{select:recordSelection}}});
   if(!row)throw new NotFoundException('الدورة غير موجودة في المركز.');
   if(row.updatedAt.getTime()!==input.revision.getTime())throw new ConflictException('تغير التكليف. حدّث القائمة قبل الحفظ.');
   await this.eligible(tx,input.instructorAccountId,row.centerOrganizationId);
   const now=new Date();
   if(!mutableEnrollment(row))throw new ConflictException('لا يمكن تغيير تكليف دورة منتهية أو لها سجل شهادة.');
   if(row.record?.sessions.some(item=>openSession(item,now)))throw new ConflictException('أغلق الجلسة الجارية أو التي تجاوزت موعدها قبل تغيير مدرب الدورة.');
   if(row.instructorAccountId===input.instructorAccountId)return {id,instructorAccountId:row.instructorAccountId,updatedAt:row.updatedAt,transferredSessionCount:0};
   const updatedAt=nextRevision(row.updatedAt);
   const changed=await tx.trainingEnrollment.updateMany({where:{id,updatedAt:input.revision},data:{instructorAccountId:input.instructorAccountId,updatedAt}});
   if(changed.count!==1)throw new ConflictException('تغير التكليف. حدّث القائمة.');
   const sessions=input.transfer?(row.record?.sessions.filter(item=>item.instructorAccountId===row.instructorAccountId&&movableSession(item,now))??[]):[];
   for(const session of sessions){
    if(!session.endsAt||session.endsAt<=session.startsAt)throw new ConflictException('حدد وقت نهاية الجلسة قبل نقل تكليفها.');
    await this.sessions.assertAvailable(tx,input.instructorAccountId,row.studentAccountId,session.startsAt,session.endsAt,session.id);
    const moved=await tx.trainingSession.updateMany({where:{id:session.id,updatedAt:session.updatedAt,status:'SCHEDULED'},data:{instructorAccountId:input.instructorAccountId,updatedAt:nextRevision(session.updatedAt)}});
    if(moved.count!==1)throw new ConflictException('تغيرت إحدى الجلسات. حدّث القائمة قبل إعادة المحاولة.');
   }
   await this.audit.record({actorId,action:'training.instructor_assigned',resource:'trainingEnrollment',resourceId:id,metadata:{from:row.instructorAccountId,to:input.instructorAccountId,centerOrganizationId:row.centerOrganizationId,reason:input.reason,transferredSessionIds:sessions.map(item=>item.id)}},tx);
   await this.notify(tx,[row.studentAccountId,row.instructorAccountId,input.instructorAccountId],{title:'تحديث تكليف التدريب',message:'تم تحديث مدرب الدورة '+row.courseCode+'.',enrollmentId:id,courseCode:row.courseCode,transferredSessionCount:sessions.length});
   return {id,instructorAccountId:input.instructorAccountId,updatedAt,transferredSessionCount:sessions.length};
  });
 }

 async assignSession(actorId:string,id:string,body:Record<string,unknown>){
  const input=this.input(body,false);
  return this.db.serializable(async tx=>{
   const center=await this.center(tx,actorId),now=new Date();
   const row=await tx.trainingSession.findFirst({where:{id,trainingRecord:{enrollment:{centerOrganizationId:center.id}}},include:{trainingRecord:{include:{certificate:{select:{id:true}},enrollment:true}}}});
   if(!row)throw new NotFoundException('الجلسة غير موجودة في المركز.');
   const enrollment=row.trainingRecord.enrollment;
   if(row.updatedAt.getTime()!==input.revision.getTime())throw new ConflictException('تغيرت الجلسة. حدّث القائمة قبل الحفظ.');
   if(!mutableEnrollment({...enrollment,record:row.trainingRecord})||!movableSession(row,now))throw new ConflictException('يمكن تغيير مدرب جلسة قادمة مجدولة لم يبدأ تسجيل حضورها فقط.');
   await this.eligible(tx,input.instructorAccountId,center.id);
   if(row.instructorAccountId===input.instructorAccountId)return {id,instructorAccountId:row.instructorAccountId,updatedAt:row.updatedAt};
   if(!row.endsAt||row.endsAt<=row.startsAt)throw new ConflictException('حدد وقت نهاية الجلسة قبل نقل تكليفها.');
   await this.sessions.assertAvailable(tx,input.instructorAccountId,enrollment.studentAccountId,row.startsAt,row.endsAt,id);
   const updatedAt=nextRevision(row.updatedAt);
   const changed=await tx.trainingSession.updateMany({where:{id,updatedAt:input.revision,status:'SCHEDULED'},data:{instructorAccountId:input.instructorAccountId,updatedAt}});
   if(changed.count!==1)throw new ConflictException('تغيرت الجلسة. حدّث القائمة.');
   const parent=await tx.trainingEnrollment.updateMany({where:{id:enrollment.id,updatedAt:enrollment.updatedAt},data:{updatedAt:nextRevision(enrollment.updatedAt)}});
   if(parent.count!==1)throw new ConflictException('تغيرت الدورة. حدّث القائمة.');
   await this.audit.record({actorId,action:'training.session_instructor_assigned',resource:'trainingSession',resourceId:id,metadata:{enrollmentId:enrollment.id,centerOrganizationId:center.id,from:row.instructorAccountId,to:input.instructorAccountId,reason:input.reason}},tx);
   await this.notify(tx,[enrollment.studentAccountId,row.instructorAccountId,input.instructorAccountId],{title:'تحديث مدرب الجلسة',message:'تم تحديث مدرب جلسة الدورة '+enrollment.courseCode+' مع بقاء موعدها.',enrollmentId:enrollment.id,sessionId:id,courseCode:enrollment.courseCode});
   return {id,instructorAccountId:input.instructorAccountId,updatedAt};
  });
 }
}
