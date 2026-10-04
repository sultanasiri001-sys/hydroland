import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, OrganizationMemberRole } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';

const ordinaryRoles=['OPERATOR','INSTRUCTOR','STAFF','VIEWER'];
const privilegedRoles=['ADMIN','REVIEWER','HR_REVIEWER','HR_MANAGER','HR_EXECUTIVE','EXECUTIVE_APPROVER','IAM_SERVICE'];
@Injectable()
export class OrganizationMembershipService {
 constructor(private readonly db:DatabaseService,private readonly audit:AuditService){}
 private revision(value:unknown){if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw new BadRequestException('حدّث بيانات الدعوة قبل المتابعة.');return new Date(value);}
 private async center(tx:Prisma.TransactionClient,accountId:string){
  const role=await tx.roleAssignment.findFirst({where:{accountId,role:'DIVE_CENTER',status:'ACTIVE',account:{status:'ACTIVE'}}});
  const member=await tx.organizationMember.findFirst({where:{accountId,role:{in:['OWNER','ADMIN']},status:'ACTIVE',organization:{kind:'DIVE_CENTER',status:'ACTIVE'}},orderBy:{createdAt:'asc'},select:{organizationId:true}});
  if(!role||!member)throw new ForbiddenException('يتطلب الإجراء إدارة مركز غوص نشط.');return member.organizationId;
 }
 private async eligible(tx:Prisma.TransactionClient,accountId:string,role:string,isCenter:boolean){
  const account=await tx.account.findUnique({where:{id:accountId},select:{status:true,roleAssignments:{where:{status:'ACTIVE'},select:{role:true}}}});
  if(!account||account.status!=='ACTIVE')throw new ConflictException('الحساب غير متاح للانضمام.');
  if(isCenter&&account.roleAssignments.some(row=>privilegedRoles.includes(row.role)))throw new ConflictException('حسابات الإدارة والمراجعة مستقلة عن عضوية المركز. استخدم حسابًا عاديًا.');
  if(isCenter&&role==='INSTRUCTOR'&&!account.roleAssignments.some(row=>row.role==='INSTRUCTOR'))throw new ConflictException('يتطلب دور المدرب حساب محترف غوص نشطًا؛ العضوية لا تمنح اعتمادًا مهنيًا.');
 }
 async invite(accountId:string,input:Record<string,unknown>,organizationId?:string,retry=true):Promise<unknown>{
  const emailMode=organizationId===undefined,fields=emailMode?['email','role']:['accountId','role'];
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!fields.includes(key))||typeof input.role!=='string'||![...ordinaryRoles,...(emailMode?[]:['ADMIN'])].includes(input.role))throw new BadRequestException('اختر دورًا مسموحًا لعضو الفريق.');
  if(emailMode&&(typeof input.email!=='string'||input.email.trim().length>254||!/^\S+@\S+\.\S+$/.test(input.email.trim())))throw new BadRequestException('أدخل البريد المسجل في المنصة.');
  if(!emailMode&&(typeof input.accountId!=='string'||!input.accountId.trim()))throw new BadRequestException('الحساب مطلوب.');
  const role=input.role as OrganizationMemberRole;
  try{return await this.db.serializable(async tx=>{
   const orgId=organizationId??await this.center(tx,accountId);
   const manager=await tx.organizationMember.findFirst({where:{organizationId:orgId,accountId,status:'ACTIVE',role:{in:['OWNER','ADMIN']},account:{status:'ACTIVE'}},include:{organization:true}});
   if(!manager)throw new ForbiddenException('صلاحية إدارة الجهة مطلوبة.');
   if(manager.organization.kind==='DIVE_CENTER'&&manager.organization.status==='ACTIVE'&&!await tx.roleAssignment.findFirst({where:{accountId,role:'DIVE_CENTER',status:'ACTIVE'}}))throw new ForbiddenException('دور مركز الغوص غير نشط.');
   if(!['ACTIVE','PENDING_REVIEW'].includes(manager.organization.status))throw new ConflictException('الجهة غير متاحة لإضافة أعضاء.');
   if(role==='ADMIN'&&manager.role!=='OWNER')throw new ForbiddenException('تفويض إدارة الجهة من صلاحيات المالك.');
   const matches=emailMode?await tx.account.findMany({where:{email:{equals:String(input.email).trim(),mode:'insensitive'}},select:{id:true},take:2}):[{id:String(input.accountId)}];
   if(matches.length!==1)throw new NotFoundException('لا يوجد حساب متاح بهذا البريد. يجب التسجيل في المنصة أولًا.');
   const invitedAccountId=matches[0].id;
   if(invitedAccountId===accountId)throw new ConflictException('لا يمكن دعوة حسابك نفسه.');
   await this.eligible(tx,invitedAccountId,role,manager.organization.kind==='DIVE_CENTER');
   const existing=await tx.organizationMember.findUnique({where:{organizationId_accountId:{organizationId:orgId,accountId:invitedAccountId}}});
   if(existing?.status==='PENDING'&&existing.role===role)return existing;
   if(existing&&existing.status!=='REMOVED')throw new ConflictException('الحساب مرتبط بالفعل؛ لا يمكن تغيير دوره عبر دعوة جديدة.');
   const member=existing?await tx.organizationMember.update({where:{id:existing.id},data:{role,status:'PENDING'}}):await tx.organizationMember.create({data:{organizationId:orgId,accountId:invitedAccountId,role,status:'PENDING'}});
   await this.audit.record({actorId:accountId,action:'organization.member_invited',resource:'organization',resourceId:orgId,metadata:{memberId:member.id,invitedAccountId,role}},tx);
   await tx.notification.create({data:{accountId:invitedAccountId,type:'ORGANIZATION_INVITATION',status:'SENT',sentAt:new Date(),payload:{organizationId:orgId,organizationName:manager.organization.displayName,memberId:member.id,role,membershipUpdatedAt:member.updatedAt.toISOString()}}});
   return member;
  });}catch(error){if(retry&&typeof error==='object'&&error!==null&&'code' in error&&error.code==='P2002')return this.invite(accountId,input,organizationId,false);throw error;}
 }
 async cancel(accountId:string,id:string,input:Record<string,unknown>){
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>key!=='expectedUpdatedAt'))throw new BadRequestException('حقول إلغاء الدعوة غير صالحة.');
  const revision=this.revision(input.expectedUpdatedAt);
  return this.db.serializable(async tx=>{
   const organizationId=await this.center(tx,accountId),member=await tx.organizationMember.findFirst({where:{id,organizationId}});
   if(!member)throw new NotFoundException('الدعوة غير موجودة في المركز.');
   if(!ordinaryRoles.includes(member.role)||member.status!=='PENDING'||member.updatedAt.getTime()!==revision.getTime())throw new ConflictException('يمكن إلغاء الدعوة المعلقة فقط. حدّث قائمة الفريق.');
   const claimed=await tx.organizationMember.updateMany({where:{id,organizationId,status:'PENDING',updatedAt:revision},data:{status:'REMOVED'}});
   if(claimed.count!==1)throw new ConflictException('تغيرت الدعوة. حدّث القائمة.');
   await this.audit.record({actorId:accountId,action:'organization.member_invitation_cancelled',resource:'organization',resourceId:organizationId,metadata:{memberId:id,role:member.role}},tx);
   return {id,status:'REMOVED'};
  });
 }
 async manage(accountId:string,id:string,input:Record<string,unknown>){
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['action','role','reason','expectedUpdatedAt'].includes(key)))throw new BadRequestException('حقول تعديل العضوية غير صالحة.');
  const {action}=input;
  if(!['CHANGE_ROLE','SUSPEND','REACTIVATE'].includes(String(action)))throw new BadRequestException('اختر إجراءً صالحًا للعضوية.');
  if(action==='CHANGE_ROLE'?(typeof input.role!=='string'||!ordinaryRoles.includes(input.role)):input.role!==undefined)throw new BadRequestException('اختر دورًا عاديًا داخل المركز.');
  if(typeof input.reason!=='string'||!input.reason.trim()||input.reason.trim().length>1000)throw new BadRequestException('سبب التعديل مطلوب، بحد أقصى 1000 حرف.');
  const revision=this.revision(input.expectedUpdatedAt),reason=input.reason.trim();
  return this.db.serializable(async tx=>{
   const organizationId=await this.center(tx,accountId);
   const member=await tx.organizationMember.findFirst({where:{id,organizationId},include:{organization:{select:{displayName:true}}}});
   if(!member)throw new NotFoundException('العضو غير موجود في المركز.');
   if(member.accountId===accountId||!ordinaryRoles.includes(member.role))throw new ForbiddenException('لا يمكن تعديل عضوية المالك أو الإدارة من هذه الصفحة.');
   if(!['ACTIVE','SUSPENDED'].includes(member.status)||member.updatedAt.getTime()!==revision.getTime())throw new ConflictException('تغيرت العضوية. حدّث قائمة الطاقم قبل التعديل.');
   const role=action==='CHANGE_ROLE'?input.role as OrganizationMemberRole:member.role;
   const status=action==='SUSPEND'?'SUSPENDED':action==='REACTIVATE'?'ACTIVE':member.status;
   if(role===member.role&&status===member.status)throw new ConflictException('لم تتغير العضوية. حدّث القائمة أو اختر إجراءً آخر.');
   if(action!=='SUSPEND')await this.eligible(tx,member.accountId,role,true);
   const updatedAt=new Date(Math.max(Date.now(),member.updatedAt.getTime()+1));
   const changed=await tx.organizationMember.updateMany({where:{id,organizationId,role:member.role,status:member.status,updatedAt:revision},data:{role,status,updatedAt}});
   if(changed.count!==1)throw new ConflictException('تغيرت العضوية. حدّث القائمة قبل إعادة المحاولة.');
   await this.audit.record({actorId:accountId,action:'organization.member_'+(action==='CHANGE_ROLE'?'role_changed':action==='SUSPEND'?'suspended':'reactivated'),resource:'organization',resourceId:organizationId,metadata:{memberId:id,from:{role:member.role,status:member.status},to:{role,status},reason}},tx);
   await tx.notification.create({data:{accountId:member.accountId,type:'ORGANIZATION_MEMBERSHIP_CHANGED',status:'SENT',sentAt:new Date(),payload:{organizationId,organizationName:member.organization.displayName,memberId:id,role,status,reason,message:(action==='SUSPEND'?'تم إيقاف عضويتك في المركز.':action==='REACTIVATE'?'تمت إعادة تفعيل عضويتك في المركز.':'تم تغيير دورك داخل المركز.')+' السبب: '+reason}}});
   return {id,role,status,updatedAt};
  });
 }
 async respond(accountId:string,organizationId:string,accept:unknown,expectedUpdatedAt?:unknown){
  if(typeof accept!=='boolean')throw new BadRequestException('اختر قبول الدعوة أو رفضها صراحة.');
  const revision=expectedUpdatedAt===undefined?null:this.revision(expectedUpdatedAt);
  return this.db.serializable(async tx=>{
   const membership=await tx.organizationMember.findUnique({where:{organizationId_accountId:{organizationId,accountId}},include:{organization:{select:{status:true,kind:true,displayName:true,ownerId:true}}}});
   if(!membership||membership.role==='OWNER'||membership.status!=='PENDING')throw new NotFoundException('لا توجد دعوة معلقة لهذا الحساب.');
   if(revision&&membership.updatedAt.getTime()!==revision.getTime())throw new ConflictException('تغيرت الدعوة. أعد فتحها قبل الرد.');
   if(accept){if(membership.organization.status!=='ACTIVE')throw new ConflictException('لا يمكن قبول الدعوة قبل تفعيل الجهة.');await this.eligible(tx,accountId,membership.role,membership.organization.kind==='DIVE_CENTER');}
   const status=accept?'ACTIVE':'REMOVED';
   const claimed=await tx.organizationMember.updateMany({where:{id:membership.id,status:'PENDING',updatedAt:membership.updatedAt},data:{status}});
   if(claimed.count!==1)throw new ConflictException('تغيرت الدعوة. أعد فتحها.');
   const updated=await tx.organizationMember.findUniqueOrThrow({where:{id:membership.id}});
   await this.audit.record({actorId:accountId,action:accept?'organization.member_invitation_accepted':'organization.member_invitation_declined',resource:'organization',resourceId:organizationId,metadata:{memberId:membership.id,role:membership.role,organizationStatus:membership.organization.status}},tx);
   await tx.notification.create({data:{accountId:membership.organization.ownerId,type:'ORGANIZATION_INVITATION_RESPONSE',status:'SENT',sentAt:new Date(),payload:{organizationId,organizationName:membership.organization.displayName,memberAccountId:accountId,role:membership.role,accepted:accept}}});
   return {...updated,organizationName:membership.organization.displayName};
  });
 }
}
