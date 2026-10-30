import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { DocumentAuthorizationService } from './document-authorization.service';
import { templateFields } from './document-template-input';
import { COOPERATION_CODE } from './cooperation-contract.domain';
import { isLibraryCode } from './contract-library.domain';
import { PLATFORM_SOURCE_KEY, SOURCE_KINDS, SourceKind, SourceReference, SourceRecord, SourceField, SourceValue, SourceSnapshot, sourceBinding, sourceReferences, sourceDigest, sourceSnapshot, validateSourceSnapshot } from './platform-document-source.domain';

const accountSelect={id:true,email:true,status:true,updatedAt:true,person:{select:{firstName:true,lastName:true,phone:true,professional:true}}} as const;
const labels:Record<string,string>={id:'المرجع',email:'البريد الإلكتروني',status:'الحالة',firstName:'الاسم الأول',lastName:'اسم العائلة',fullName:'الاسم',phone:'رقم التواصل',organizationId:'مرجع الجهة',accountId:'مرجع الحساب',employmentId:'مرجع الموظف',courseCode:'رمز الدورة',studentAccountId:'مرجع المتدرب',instructorAccountId:'مرجع المدرب',name:'الاسم',title:'العنوان',registrationNumber:'رقم التسجيل',type:'النوع',startsAt:'وقت البداية',endsAt:'وقت النهاية',siteName:'موقع الغوص',diveDate:'تاريخ الغوص',maxDepthM:'أقصى عمق بالمتر',durationMin:'المدة بالدقائق',passengerCapacity:'سعة الركاب',createdAt:'وقت التسجيل',updatedAt:'آخر تحديث',amountHalala:'المبلغ بالهللات',description:'الوصف',subject:'الموضوع',referenceNumber:'رقم المرجع'};
const config:Record<SourceKind,{delegate:string;scope:(org:string,actor:string)=>object;include?:object}>={
 ACCOUNT:{delegate:'account',scope:(_o,a)=>({id:a})},
 EMPLOYMENT:{delegate:'employment',scope:o=>({organizationId:o}),include:{account:{select:accountSelect},orgUnit:{select:{id:true,code:true,nameAr:true}},position:{select:{id:true,titleAr:true}}}},
 LEAVE_REQUEST:{delegate:'leaveRequest',scope:o=>({employment:{organizationId:o}}),include:{employment:{include:{account:{select:accountSelect}}}}},
 TRAINING_ENROLLMENT:{delegate:'trainingEnrollment',scope:o=>({centerOrganizationId:o})},
 DIVE_LOG:{delegate:'diveLog',scope:(o,a)=>({OR:[{accountId:a},{sourceTrip:{organizationId:o}},{sourceParticipant:{booking:{organizationId:o}}}]}),include:{account:{select:accountSelect},sourceParticipant:{select:{id:true,fullName:true}}}},
 BOOKING_PARTICIPANT:{delegate:'bookingParticipant',scope:o=>({booking:{organizationId:o}}),include:{account:{select:accountSelect}}},
 CUSTOMER_CASE:{delegate:'customerCase',scope:o=>({organizationId:o}),include:{customer:{select:accountSelect}}},
 MARINE_ASSET:{delegate:'marineAsset',scope:o=>({organizationId:o})},
 TRIP:{delegate:'trip',scope:o=>({organizationId:o})},
 BOOKING:{delegate:'booking',scope:o=>({organizationId:o}),include:{account:{select:accountSelect},trip:{select:{id:true,title:true,startsAt:true,endsAt:true}}}},
 FINANCE_ENTRY:{delegate:'financeEntry',scope:o=>({organizationId:o})},
 ADMINISTRATIVE_RECORD:{delegate:'administrativeRecord',scope:o=>({organizationId:o})},
};
// The existing profile endpoint exposes these identity/professional fields. No
// password, session, medical file or private document is queried by this service.
function flatten(input:any,prefix='',result:SourceField[]=[]):SourceField[]{
 for(const [key,raw] of Object.entries(input??{})){
  const path=prefix?prefix+'.'+key:key;
  if(raw instanceof Date)result.push({key:path,labelAr:labels[key]??key,value:raw.toISOString()});
  else if(raw===null||['string','number','boolean'].includes(typeof raw))result.push({key:path,labelAr:prefix?`${labels[prefix.split('.').pop()!]??prefix} / ${labels[key]??key}`:labels[key]??key,value:raw as SourceValue});
  else if(raw&&typeof raw==='object'&&!Array.isArray(raw))flatten(raw,path,result);
 }
 return result;
}
function personFields(account:any,prefix:string,label:string):SourceField[]{
 if(!account)return [{key:prefix+'.fullName',labelAr:label,value:null}];
 const p=account.person;
 return [{key:prefix+'.fullName',labelAr:label,value:[p?.firstName,p?.lastName].filter(Boolean).join(' ')||null},...flatten(account,prefix)];
}
const scalar=(v:any):SourceValue=>v instanceof Date?v.toISOString():v===undefined?null:v;
@Injectable()
export class PlatformDocumentSourceService {
 constructor(private readonly db:DatabaseService,private readonly authz:DocumentAuthorizationService){}
 async owner(tx:Prisma.TransactionClient|DatabaseService,actor:string,org:string){
  const access=await this.authz.assert(actor,org,'DOCUMENT_CREATE',tx);
  if(!('accessBasis' in access)||access.accessBasis!=='PLATFORM_OWNER')throw new ForbiddenException('ربط المصادر الداخلية متاح لمدير منصة هيدرولاند المتحقق.');
 }
 private kind(input:unknown):SourceKind{
  if(typeof input!=='string'||!SOURCE_KINDS.includes(input as SourceKind))throw new BadRequestException('نوع المصدر غير مدعوم.');
  return input as SourceKind;
 }
 private async row(tx:Prisma.TransactionClient,actor:string,org:string,ref:SourceReference){
  const c=config[ref.kind],where={AND:[{id:ref.id},c.scope(org,actor)]};
  const row=await (tx as any)[c.delegate].findFirst({where,...(ref.kind==='ACCOUNT'?{select:accountSelect}:c.include?{include:c.include}:{})});
  if(!row)throw new NotFoundException('المصدر غير متاح في هذه الجهة؛ لا يمكن تعويضه ببيانات افتراضية.');
  return row;
 }
 private async record(tx:Prisma.TransactionClient,actor:string,org:string,ref:SourceReference):Promise<{record:SourceRecord;aliases:Record<string,SourceValue>}>{
  const row=await this.row(tx,actor,org,ref),fields=flatten(Object.fromEntries(Object.entries(row).filter(([,v])=>v===null||v instanceof Date||['string','number','boolean'].includes(typeof v))));
  let aliases:Record<string,SourceValue>={};
  if(ref.kind==='ACCOUNT')fields.push(...personFields(row,'account','اسم صاحب الحساب'));
  if(ref.kind==='EMPLOYMENT'){
   fields.push(...personFields(row.account,'employee','اسم الموظف'),...flatten(row.orgUnit,'department'),...flatten(row.position,'position'));
   aliases={employeeReference:row.id,employeeNo:row.id,departmentCode:row.orgUnit?.code??null,positionTitle:row.position?.titleAr??null};
  }
  if(ref.kind==='LEAVE_REQUEST'){
   fields.push(...personFields(row.employment?.account,'employee','اسم الموظف'));
   aliases={employeeReference:row.employmentId,employeeNo:row.employmentId,leaveReference:row.id,leaveType:row.type,startDate:row.startsAt.toISOString().slice(0,10),endDate:row.endsAt.toISOString().slice(0,10)};
  }
  if(ref.kind==='TRAINING_ENROLLMENT'){
   const student=await tx.account.findUnique({where:{id:row.studentAccountId},select:accountSelect});
   const instructor=row.instructorAccountId?await tx.account.findUnique({where:{id:row.instructorAccountId},select:accountSelect}):null;
   fields.push(...personFields(student,'student','اسم المتدرب'),...personFields(instructor,'instructor','اسم المدرب'));
   aliases={courseCode:row.courseCode,traineeId:row.studentAccountId,instructorId:row.instructorAccountId??null,instructor:instructor?[instructor.person.firstName,instructor.person.lastName].filter(Boolean).join(' '):null};
  }
  if(ref.kind==='DIVE_LOG'){
   fields.push(...personFields(row.account,'diver','اسم الغواص'));
   if(row.sourceParticipant)fields.push({key:'participant.fullName',labelAr:'اسم المشارك المسجل',value:row.sourceParticipant.fullName});
   aliases={diverId:row.accountId??null,site:row.siteName,depth:row.maxDepthM,duration:row.durationMin};
  }
  if(ref.kind==='BOOKING_PARTICIPANT')fields.push(...personFields(row.account,'participant','اسم صاحب الحساب المرتبط'));
  if(ref.kind==='CUSTOMER_CASE'){
   fields.push(...personFields(row.customer,'customer','اسم العميل'));
   aliases={customerId:row.customerId,customerRef:row.customerId,caseNo:row.id,caseRef:row.id};
  }
  if(ref.kind==='BOOKING')fields.push(...personFields(row.account,'customer','اسم صاحب الحجز'),...flatten(row.trip,'trip'));
  if(ref.kind==='TRIP')aliases={tripNo:row.id,tripRef:row.id};
  if(ref.kind==='MARINE_ASSET')aliases={vessel:row.name,vesselRef:row.id};
  if(ref.kind==='ADMINISTRATIVE_RECORD')aliases={recordNo:row.referenceNumber,subject:row.subject};
  return {record:{kind:ref.kind,id:row.id,updatedAt:row.updatedAt?.toISOString()??null,fields},aliases};
 }
 async capture(tx:Prisma.TransactionClient,actor:string,org:string,definitions:unknown,bindingInput:unknown):Promise<SourceSnapshot|null>{
  let binding;try{binding=sourceBinding(bindingInput);}catch(e){throw new BadRequestException((e as Error).message);}
  await this.owner(tx,actor,org);
  if(!binding.references.length)return null;
  const result=await this.resolve(tx,actor,org,definitions,binding.references);
  if(result.fingerprint!==binding.expectedFingerprint)throw new ConflictException('تغيرت بيانات المصدر أو القالب؛ افحصها مجددًا قبل الحفظ.');
  return result;
 }
 async resolve(tx:Prisma.TransactionClient,actor:string,org:string,definitions:unknown,refs:SourceReference[]):Promise<SourceSnapshot>{
  await this.owner(tx,actor,org);
  const defs=templateFields(definitions),allowed=new Set(defs.map(f=>f.key)),records:SourceRecord[]=[],bindings:Record<string,SourceValue>={};
  const author=await tx.account.findUniqueOrThrow({where:{id:actor},select:{id:true,updatedAt:true,person:{select:{firstName:true,lastName:true}}}});
  records.push({kind:'AUTHOR',id:actor,updatedAt:author.updatedAt.toISOString(),fields:[{key:'fullName',labelAr:'الاسم',value:[author.person.firstName,author.person.lastName].filter(Boolean).join(' ')||null},{key:'accountId',labelAr:'مرجع الحساب',value:actor}]});
  for(const ref of refs){
   const {record,aliases}=await this.record(tx,actor,org,ref);records.push(record);
   for(const [key,v] of Object.entries(aliases))if(allowed.has(key)){
    if(Object.hasOwn(bindings,key)&&bindings[key]!==v)throw new BadRequestException(`مصادر متعارضة للحقل ${key}؛ اختر السجل المعني.`);
    bindings[key]=scalar(v);
   }
  }
  if(allowed.has('sourceRecordRef')&&refs.length)bindings.sourceRecordRef=refs[0].id;
  const fingerprint=sourceDigest({organizationId:org,records,bindings});
  const snapshot:SourceSnapshot={schemaVersion:1,organizationId:org,capturedAt:new Date().toISOString(),capturedByAccountId:actor,fingerprint,records,bindings};
  try{validateSourceSnapshot(snapshot);}catch(e){throw new BadRequestException((e as Error).message);}
  return snapshot;
 }
 async preview(actor:string,org:string,templateId:string,input:unknown){
  let refs;try{refs=sourceReferences(input);}catch(e){throw new BadRequestException((e as Error).message);}
  if(!refs.length)throw new BadRequestException('اختر سجلًا محفوظًا للفحص.');
  const result=await this.db.serializable(async tx=>{
   await this.owner(tx,actor,org);
   const t=await tx.documentTemplate.findFirst({where:{id:templateId,organizationId:org}});
   if(!t)throw new NotFoundException('القالب غير متاح في هذه الجهة.');
   if(t.code===COOPERATION_CODE||isLibraryCode(t.code))throw new BadRequestException('تدار مصادر العقود في مسار العقد المتخصص.');
   const snapshot=await this.resolve(tx,actor,org,t.fields,refs);
   return {organizationId:org,templateId:t.id,templateVersion:t.version,references:refs,snapshot};
  });
  await this.owner(this.db,actor,org);return result;
 }
 async candidates(actor:string,org:string,kindInput:unknown,cursorInput?:string){
  const kind=this.kind(kindInput);let cursor:string|undefined;
  if(cursorInput){try{cursor=sourceReferences([{kind,id:cursorInput}])[0].id;}catch{throw new BadRequestException('مرجع الصفحة غير صالح.');}}
  const result=await this.db.serializable(async tx=>{
   await this.owner(tx,actor,org);const c=config[kind];
   if(cursor)await this.row(tx,actor,org,{kind,id:cursor});
   const rows:any[]=await (tx as any)[c.delegate].findMany({where:c.scope(org,actor),orderBy:{id:'asc'},take:51,...(cursor?{cursor:{id:cursor},skip:1}:{}),...(kind==='ACCOUNT'?{select:accountSelect}:c.include?{include:c.include}:{})});
   const students=kind==='TRAINING_ENROLLMENT'?await tx.account.findMany({where:{id:{in:rows.map(r=>r.studentAccountId)}},select:{id:true,person:{select:{firstName:true,lastName:true}}}}):[];
   const items=rows.slice(0,50).map(r=>{
    const p=r.account?.person??r.customer?.person??r.employment?.account?.person??r.person??students.find(a=>a.id===r.studentAccountId)?.person;
    const name=[p?.firstName,p?.lastName].filter(Boolean).join(' ');
    return {id:r.id,label:name?[name,r.courseCode??r.subject??r.type??''].filter(Boolean).join(' | '):r.fullName||r.name||r.title||r.subject||r.referenceNumber||r.courseCode||r.id,updatedAt:r.updatedAt?.toISOString()??null};
   });
   return {organizationId:org,kind,items,hasMore:rows.length>50,nextCursor:rows.length>50?rows[49].id:null};
  });
  await this.owner(this.db,actor,org);return result;
 }
 async audit(actor:string,org:string){
  const result=await this.db.serializable(async tx=>{
   await this.owner(tx,actor,org);
   const docs=await tx.managedDocument.findMany({where:{organizationId:org},select:{id:true,referenceNumber:true,version:true,status:true,payload:true,template:{select:{code:true,titleAr:true,fields:true}}},orderBy:{referenceNumber:'asc'}});
   const items=docs.filter(d=>d.template.code!==COOPERATION_CODE&&!isLibraryCode(d.template.code)).map(d=>{
    let snapshot:SourceSnapshot|null=null,state='SOURCE_NOT_SELECTED';
    try{snapshot=sourceSnapshot(d.payload as Record<string,unknown>,org);if(snapshot)state='LINKED';}catch{state='INVALID_SNAPSHOT';}
    return {documentId:d.id,referenceNumber:d.referenceNumber,documentVersion:d.version,status:d.status,templateCode:d.template.code,titleAr:d.template.titleAr,sourceStatus:state,
      sourceRecordCount:snapshot?.records.filter(r=>r.kind!=='AUTHOR').length??0,sourceCapturedAt:snapshot?.capturedAt??null,
      automaticallyFilledKeys:Object.keys(snapshot?.bindings??{}),documentFieldsNotAutomaticallyFilled:templateFields(d.template.fields).filter(f=>!Object.hasOwn(snapshot?.bindings??{},f.key)).map(f=>f.key)};
   });
   return {organizationId:org,documentCount:items.length,linked:items.filter(d=>d.sourceStatus==='LINKED').length,sourceNotSelected:items.filter(d=>d.sourceStatus==='SOURCE_NOT_SELECTED').length,invalidSnapshots:items.filter(d=>d.sourceStatus==='INVALID_SNAPSHOT').length,items};
  });
  await this.owner(this.db,actor,org);return result;
 }
 withSnapshot(payload:Record<string,unknown>,snapshot:SourceSnapshot|null):Record<string,unknown>{
  const next={...payload};delete next[PLATFORM_SOURCE_KEY];
  if(snapshot){Object.assign(next,snapshot.bindings);next[PLATFORM_SOURCE_KEY]=snapshot;}
  return next;
 }
 retained(payload:Record<string,unknown>,stored:Record<string,unknown>,org:string){
  let snapshot;try{snapshot=sourceSnapshot(stored,org);}catch(e){throw new BadRequestException((e as Error).message);}
  if(snapshot)for(const [key,v] of Object.entries(snapshot.bindings)){
   const incoming=payload[key],same=incoming===v||(v===null&&(incoming===null||incoming===undefined||incoming===''))||(typeof v==='number'&&typeof incoming==='string'&&incoming.trim()!==''&&Number(incoming)===v);
   if(!same)throw new ConflictException('تغير حقل مرتبط بالمصدر؛ اختر السجل وافحصه قبل الحفظ.');
  }
  return this.withSnapshot(payload,snapshot);
 }
}
