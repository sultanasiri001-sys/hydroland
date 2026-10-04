import { createHash } from 'node:crypto';
import { centerReportRange, riyadhToday } from './center-report-range';
import {CenterLicensePlatformReviewService} from './center-license-platform-review.service';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { EquipmentInspectionService } from '../trips/equipment-inspection.service';
import { CenterLicenseService, LicenseAttachmentInput, LicenseRecordInput } from './center-license.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class DiveCenterPortalService {
  constructor(
    private readonly db: DatabaseService,
    private readonly inspections: EquipmentInspectionService,
    private readonly audit: AuditService,
    private readonly licenses: CenterLicenseService,
    private readonly platformReview: CenterLicensePlatformReviewService,
  ) {}

  async updateBusinessProfile(accountId:string,id:string,input:Record<string,unknown>){
    const allowed=['displayName','legalName','registrationNumber','regionCode','expectedUpdatedAt'];
    if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!allowed.includes(key)))throw new BadRequestException('يُسمح بتعديل بيانات الملف التجاري فقط.');
    if(typeof input.expectedUpdatedAt!=='string'||!Number.isFinite(Date.parse(input.expectedUpdatedAt)))throw new BadRequestException('حدّث بيانات المركز قبل الحفظ.');
    const expectedUpdatedAt=new Date(input.expectedUpdatedAt);
    const clean=(value:unknown,max:number,required=false)=>{
      if(value===null&&!required)return null;
      if(typeof value!=='string'||value.trim().length>max||(required&&!value.trim()))throw new BadRequestException('تحقق من الحقول وأطوالها؛ اسم المركز مطلوب.');
      return value.trim()||null;
    };
    try{return await this.db.serializable(async tx=>{
      const role=await tx.roleAssignment.findFirst({where:{accountId,role:'DIVE_CENTER',status:'ACTIVE',account:{status:'ACTIVE'}}});
      if(!role)throw new ForbiddenException('Active dive center role required.');
      const member=await tx.organizationMember.findFirst({where:{accountId,organizationId:id,status:'ACTIVE',role:{in:['OWNER','ADMIN']},organization:{kind:'DIVE_CENTER'}},include:{organization:true}});
      if(!member)throw new ForbiddenException('لا تملك صلاحية تعديل هذا المركز.');
      const before=member.organization;
      if(!['ACTIVE','PENDING_REVIEW','REJECTED'].includes(before.status))throw new ConflictException('لا يمكن تعديل مركز موقوف أو مؤرشف.');
      if(before.updatedAt.getTime()!==expectedUpdatedAt.getTime())throw new ConflictException('تغيرت بيانات المركز. أعد تحميلها قبل الحفظ.');
      const displayName=input.displayName===undefined?before.displayName:clean(input.displayName,240,true)!;
      const legalName=input.legalName===undefined?before.legalName:clean(input.legalName,240);
      const registrationNumber=input.registrationNumber===undefined?before.registrationNumber:clean(input.registrationNumber,120);
      let regionCode=input.regionCode===undefined?before.regionCode:clean(input.regionCode,32);
      if(regionCode==='عسير'||regionCode?.toUpperCase()==='ASIR')regionCode='ASIR';
      const data={displayName,legalName,registrationNumber,regionCode};
      const changedFields=(Object.keys(data) as Array<keyof typeof data>).filter(key=>data[key]!==before[key]);
      if(!changedFields.length)return {id:before.id,...data,status:before.status,updatedAt:before.updatedAt};
      // Editing business metadata cannot activate a center or transfer ownership.
      const review=before.status==='REJECTED'?{status:'PENDING_REVIEW' as const,reviewedAt:null,reviewedById:null}:{};
      const claimed=await tx.organization.updateMany({where:{id,updatedAt:expectedUpdatedAt,status:before.status},data:{...data,...review}});
      if(claimed.count!==1)throw new ConflictException('تغيرت بيانات المركز. أعد تحميلها قبل الحفظ.');
      await this.audit.record({actorId:accountId,action:'CENTER_BUSINESS_PROFILE_UPDATED',resource:'organization',resourceId:id,metadata:{changedFields,previousStatus:before.status,status:review.status||before.status}},tx);
      return tx.organization.findUniqueOrThrow({where:{id},select:{id:true,displayName:true,legalName:true,registrationNumber:true,regionCode:true,status:true,updatedAt:true}});
    });}catch(error){if(typeof error==='object'&&error!==null&&'code' in error&&error.code==='P2002')throw new ConflictException('رقم السجل مستخدم لدى مركز أو جهة أخرى.');throw error}
  }

  private async managedCenter(accountId: string) {
    const role = await this.db.roleAssignment.findUnique({
      where: { accountId_role: { accountId, role: 'DIVE_CENTER' } },
      select: { status: true },
    });
    if (role?.status !== 'ACTIVE') {
      throw new ForbiddenException('Active dive-center role required.');
    }
    const membership=await this.db.organizationMember.findFirst({
      where:{accountId,status:'ACTIVE',role:{in:['OWNER','ADMIN']},organization:{kind:{contains:'DIVE',mode:'insensitive'},status:'ACTIVE'}},
      select:{organization:{select:{id:true,displayName:true,legalName:true,registrationNumber:true,regionCode:true,status:true,documentBrandNameAr:true,documentBrandNameEn:true}}},
      orderBy:{createdAt:'asc'},
    });
    if(!membership)throw new ForbiddenException('Active dive-center manager membership required.');
    return membership.organization;
  }

  async overview(accountId:string){
    const center=await this.managedCenter(accountId),today=riyadhToday();
    const [newBookings,tripsToday,memberCount,tripCount]=await Promise.all([
      this.db.booking.count({where:{trip:{organizationId:center.id},status:'PENDING'}}),
      this.db.trip.count({where:{organizationId:center.id,startsAt:{gte:today.start,lt:today.end},status:{in:['DRAFT','OPEN','CLOSED','COMPLETED']}}}),
      this.db.organizationMember.count({where:{organizationId:center.id,status:'ACTIVE'}}),
      this.db.trip.count({where:{organizationId:center.id}}),
    ]);
    return {center,timeZone:'Asia/Riyadh',date:today.date,metrics:{newBookings,tripsToday,activeMembers:memberCount,totalTrips:tripCount}};
  }

  async reports(accountId:string,from?:string,to?:string){
    const period=centerReportRange(from,to),center=await this.managedCenter(accountId),tripFilter={organizationId:center.id,startsAt:{gte:period.start,lt:period.end}};
    return this.db.$transaction(async tx=>{
      const trips=await tx.trip.groupBy({by:['status'],where:tripFilter,_count:{_all:true},_sum:{capacity:true}});
      const bookings=await tx.booking.groupBy({by:['status'],where:{trip:tripFilter},_count:{_all:true},_sum:{seats:true}});
      const payments=await tx.payment.groupBy({by:['currency','status'],where:{booking:{trip:tripFilter}},_count:{_all:true},_sum:{amountMinor:true},orderBy:[{currency:'asc'},{status:'asc'}]});
      return {center:{id:center.id,displayName:center.displayName},period:{from:period.from,to:period.to,timeZone:period.timeZone,basis:period.basis},generatedAt:new Date(),trips:trips.map(row=>({status:row.status,count:row._count._all,capacity:row._sum.capacity??0})),bookings:bookings.map(row=>({status:row.status,count:row._count._all,seats:row._sum.seats??0})),payments:payments.map(row=>({currency:row.currency,status:row.status,count:row._count._all,amountMinor:row._sum.amountMinor??0}))};
    },{isolationLevel:'RepeatableRead'});
  }

  async safety(accountId:string){
    const center=await this.managedCenter(accountId);
    const [checklists,incidents]=await Promise.all([
      this.db.safetyChecklist.findMany({where:{trip:{organizationId:center.id}},select:{id:true,tripId:true,decision:true,notes:true,decidedAt:true,updatedAt:true,trip:{select:{title:true,startsAt:true,status:true}}},orderBy:{updatedAt:'desc'},take:200}),
      this.db.safetyIncident.findMany({where:{trip:{organizationId:center.id}},select:{id:true,tripId:true,severity:true,title:true,status:true,locationName:true,createdAt:true,resolvedAt:true,trip:{select:{title:true,startsAt:true}}},orderBy:{createdAt:'desc'},take:200}),
    ]);
    return {checklists,incidents};
  }

  async documents(accountId:string){
    const center=await this.managedCenter(accountId);
    const [assets,records,units,reviewers]=await Promise.all([
      this.db.organizationDocumentAsset.findMany({where:{organizationId:center.id},select:{id:true,kind:true,mimeType:true,byteSize:true,sha256:true,createdAt:true},orderBy:{createdAt:'desc'},take:200}),
      this.db.administrativeRecord.findMany({where:{organizationId:center.id,type:{in:['LICENSE','PERMIT','CERTIFICATE','REGULATORY_APPROVAL']}},select:{id:true,type:true,referenceNumber:true,subject:true,status:true,createdAt:true,updatedAt:true,unitId:true,licenseAssetId:true,licenseIssuedAt:true,licenseExpiresAt:true,licenseReviewStatus:true,licenseReviewSubmittedAt:true,licenseReviewDecidedAt:true,licenseReviewReason:true,routings:{select:{id:true,decision:true,decidedAt:true,createdAt:true,requestedByAccountId:true,assignedToAccountId:true,assignedTo:{select:{person:{select:{firstName:true,lastName:true}}}},toUnit:{select:{nameAr:true,nameEn:true}}},orderBy:{createdAt:'desc'}}},orderBy:{updatedAt:'desc'},take:200}),
      this.db.orgUnit.findMany({where:{organizationId:center.id,active:true},select:{id:true,nameAr:true,nameEn:true,type:true},orderBy:{nameAr:'asc'}}),
      this.licenses.reviewers(center.id),
    ]);
    return {assets,units,licenses:records.map(({unitId,routings,...record})=>({...record,
      reviewUnits:units.filter(unit=>unit.id!==unitId),
      routings:routings.map(({requestedByAccountId,assignedToAccountId,assignedTo,toUnit,...routing})=>({...routing,
        unitName:toUnit.nameAr||toUnit.nameEn,reviewerName:assignedTo?[assignedTo.person.firstName,assignedTo.person.lastName].filter(Boolean).join(' ').trim()||'مراجع المركز':null,
        canDecide:!routing.decision&&assignedToAccountId===accountId&&requestedByAccountId!==accountId,
        reviewerOptions:routing.decision?[]:reviewers.filter(x=>x.id!==requestedByAccountId),
      })),
    }))};
  }

  async submitLicense(accountId:string,id:string){const center=await this.managedCenter(accountId);return this.platformReview.submit(accountId,center.id,id);}
  async registerLicense(accountId:string,id:string){const center=await this.managedCenter(accountId);return this.licenses.register(accountId,center.id,id);}
  async routeLicense(accountId:string,id:string,toUnitId:unknown){const center=await this.managedCenter(accountId);return this.licenses.route(accountId,center.id,id,toUnitId);}
  async assignLicenseReview(accountId:string,id:string,assignee:unknown){const center=await this.managedCenter(accountId);return this.licenses.assign(accountId,center.id,id,assignee);}
  async decideLicenseReview(accountId:string,id:string,decision:unknown){const center=await this.managedCenter(accountId);return this.licenses.decide(accountId,center.id,id,decision);}

  async saveLicense(accountId:string,input:LicenseRecordInput & LicenseAttachmentInput){
    const center=await this.managedCenter(accountId);
    return this.licenses.save(accountId,center.id,input);
  }
  async createLicense(accountId:string,input:LicenseRecordInput,renewalId?:string){
    const center=await this.managedCenter(accountId);
    return this.licenses.create(accountId,center.id,input,renewalId);
  }
  async attachLicense(accountId:string,id:string,input:LicenseAttachmentInput){
    const center=await this.managedCenter(accountId);
    return this.licenses.attach(accountId,center.id,id,input);
  }
  async downloadLicense(accountId:string,id:string){
    const center=await this.managedCenter(accountId);
    return this.licenses.download(center.id,id);
  }

  async equipmentLookup(accountId:string,code:string){
    const center=await this.managedCenter(accountId);const clean=code?.trim();if(!clean)throw new BadRequestException('Equipment code is required.');
    const rows=await this.db.$queryRaw<Array<{resourceId:string;assetCode:string;barcodeValue:string;qrValue:string;serialNumber:string|null;sku:string|null;location:string|null;stockStatus:string;resourceName:string;active:boolean}>>`
      SELECT b."resourceId",b."assetCode",b."barcodeValue",b."qrValue",b."serialNumber",b."sku",b."location",b."stockStatus",b."updatedAt",r."name" AS "resourceName",r."active"
      FROM "EquipmentBarcode" b JOIN "CalendarResource" r ON r."id"=b."resourceId"
      WHERE b."organizationId"=(jsonb_populate_record(NULL::"EquipmentBarcode", jsonb_build_object('organizationId', ${center.id}::text)))."organizationId" AND r."type"='EQUIPMENT' AND (b."assetCode"=${clean} OR b."barcodeValue"=${clean} OR b."qrValue"=${clean} OR b."serialNumber"=${clean}) LIMIT 1`;
    if(!rows.length)throw new NotFoundException('Equipment code not found in managed dive center.');return rows[0];
  }

  async equipment(accountId:string){
    const center=await this.managedCenter(accountId);
    return this.db.$queryRaw<Array<{resourceId:string;assetCode:string;serialNumber:string|null;sku:string|null;location:string|null;stockStatus:string;resourceName:string;active:boolean}>>`
      SELECT b."resourceId",b."assetCode",b."serialNumber",b."sku",b."location",b."stockStatus",b."updatedAt",r."name" AS "resourceName",r."active"
      FROM "EquipmentBarcode" b JOIN "CalendarResource" r ON r."id"=b."resourceId"
      WHERE b."organizationId"=(jsonb_populate_record(NULL::"EquipmentBarcode", jsonb_build_object('organizationId', ${center.id}::text)))."organizationId" AND r."type"='EQUIPMENT'
      ORDER BY r."name",b."assetCode"`;
  }

  async moveEquipment(accountId:string,resourceId:string,input:Record<string,unknown>,retry=true):Promise<unknown>{
    if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['movementType','toLocation','tripId','notes','requestId','expectedUpdatedAt'].includes(key)))throw new BadRequestException('حقول حركة المعدة غير صالحة.');
    const movementType=input.movementType;
    if(typeof movementType!=='string'||!['CHECK_IN','CHECK_OUT','TRANSFER','MAINTENANCE','QUARANTINE','RELEASE','RETIRE'].includes(movementType))throw new BadRequestException('نوع الحركة غير صالح.');
    const clean=(key:string,max:number)=>{const value=input[key];if(value===undefined||value===null)return null;if(typeof value!=='string'||value.trim().length>max)throw new BadRequestException('تحقق من بيانات الحركة وطول الحقول.');return value.trim()||null};
    const toLocation=clean('toLocation',240),tripId=clean('tripId',120),notes=clean('notes',2000),requestId=clean('requestId',36)?.toLowerCase();
    if(requestId&&!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(requestId))throw new BadRequestException('معرّف طلب الحفظ غير صالح.');
    if(movementType==='TRANSFER'&&!toLocation)throw new BadRequestException('حدد الموقع الجديد لنقل المعدة.');
    const revision=input.expectedUpdatedAt===undefined?null:new Date(String(input.expectedUpdatedAt));
    if(revision&&(typeof input.expectedUpdatedAt!=='string'||!Number.isFinite(revision.getTime())))throw new BadRequestException('حدّث بيانات المعدة قبل الحفظ.');
    const fingerprint=createHash('sha256').update(JSON.stringify({resourceId,movementType,toLocation,tripId,notes,revision:revision?.toISOString()??null})).digest('hex');
    const center=await this.managedCenter(accountId);
    try{return await this.db.serializable(async tx=>{
      const role=await tx.roleAssignment.findFirst({where:{accountId,role:'DIVE_CENTER',status:'ACTIVE',account:{status:'ACTIVE'}}});
      const member=await tx.organizationMember.findFirst({where:{accountId,organizationId:center.id,status:'ACTIVE',role:{in:['OWNER','ADMIN']},organization:{kind:'DIVE_CENTER',status:'ACTIVE'}}});
      if(!role||!member)throw new ForbiddenException('يتطلب الإجراء صلاحية إدارة مركز غوص نشط.');
      const owned=await tx.$queryRaw<Array<{stockStatus:string;location:string|null;updatedAt:Date;active:boolean}>>`SELECT b."stockStatus",b."location",b."updatedAt",r."active" FROM "EquipmentBarcode" b JOIN "CalendarResource" r ON r."id"=b."resourceId" WHERE b."resourceId"=${resourceId} AND r."type"='EQUIPMENT' AND b."organizationId"=(jsonb_populate_record(NULL::"EquipmentBarcode",jsonb_build_object('organizationId',${center.id}::text)))."organizationId" FOR UPDATE OF b`;
      if(!owned.length)throw new NotFoundException('المعدة غير موجودة في المركز.');
      const current=owned[0],key=requestId?'center-equipment-move:'+requestId:null;
      if(key){const previous=await tx.operationalSetting.findUnique({where:{key}});if(previous){const value=previous.value as {organizationId:string;fingerprint:string;movementId:string;stockStatus:string};if(value.organizationId!==center.id||value.fingerprint!==fingerprint)throw new ConflictException('سبق استخدام طلب الحركة ببيانات مختلفة.');return {movement:{id:value.movementId},stockStatus:value.stockStatus};}}
      if(!current.active||current.stockStatus==='RETIRED')throw new ConflictException('المعدة مستبعدة أو غير مفعلة.');
      if(revision&&current.updatedAt.getTime()!==revision.getTime())throw new ConflictException('تغيرت بيانات المعدة. حدّث القائمة قبل الحفظ.');
      if(tripId){const trip=await tx.trip.findFirst({where:{id:tripId,organizationId:center.id},select:{status:true}});if(!trip)throw new NotFoundException('الرحلة غير موجودة في المركز.');if(['CANCELLED','COMPLETED'].includes(trip.status))throw new ConflictException('لا يمكن ربط الحركة برحلة ملغاة أو مكتملة.');}
      if(movementType==='CHECK_OUT'&&current.stockStatus!=='AVAILABLE')throw new ConflictException('يمكن إخراج المعدات المتاحة فقط.');
      if(movementType==='CHECK_IN'&&current.stockStatus!=='CHECKED_OUT')throw new ConflictException('يمكن إرجاع المعدات المعارة فقط.');
      if(movementType==='RELEASE'&&!['MAINTENANCE','QUARANTINED'].includes(current.stockStatus))throw new ConflictException('الإتاحة تخص المعدات المحجوزة أو تحت الصيانة.');
      if(movementType==='CHECK_OUT'){const inspection=await this.inspections.evaluate([resourceId],tx);if(inspection.blocked)throw new ConflictException('الفحص أو صلاحية الصيانة يمنعان إخراج المعدة.');}
      const next=movementType==='TRANSFER'?current.stockStatus:movementType==='CHECK_OUT'?'CHECKED_OUT':movementType==='MAINTENANCE'?'MAINTENANCE':movementType==='QUARANTINE'?'QUARANTINED':movementType==='RETIRE'?'RETIRED':'AVAILABLE';
      const rows=await tx.$queryRaw<Array<{id:string}>>`INSERT INTO "EquipmentMovement"("id","resourceId","movementType","fromLocation","toLocation","tripId","assignedAccountId","notes","actorAccountId","occurredAt") VALUES(gen_random_uuid()::text,${resourceId},${movementType},${current.location},${toLocation},${tripId},NULL,${notes},${accountId},NOW()) RETURNING *`;
      await tx.$executeRaw`UPDATE "EquipmentBarcode" SET "stockStatus"=${next},"location"=COALESCE(${toLocation},"location"),"updatedAt"=NOW() WHERE "resourceId"=${resourceId}`;
      await this.audit.record({actorId:accountId,action:'EQUIPMENT_INVENTORY_MOVED',resource:'CalendarResource',resourceId,metadata:{organizationId:center.id,movementId:rows[0].id,movementType,fromLocation:current.location,toLocation,tripId,assignedAccountId:null,previousStatus:current.stockStatus,stockStatus:next,notes}},tx);
      if(key)await tx.operationalSetting.create({data:{key,value:{organizationId:center.id,fingerprint,movementId:rows[0].id,stockStatus:next}}});
      return {movement:rows[0],stockStatus:next};
    });}catch(error){const e=error as {code?:string};if(requestId&&retry&&e.code==='P2002')return this.moveEquipment(accountId,resourceId,input,false);throw error;}
  }

  async equipmentHistory(accountId:string,resourceId:string){
    const center=await this.managedCenter(accountId);
    const owned=await this.db.$queryRaw<Array<{resourceId:string}>>`SELECT "resourceId" FROM "EquipmentBarcode" WHERE "resourceId"=${resourceId} AND "organizationId"=(jsonb_populate_record(NULL::"EquipmentBarcode", jsonb_build_object('organizationId', ${center.id}::text)))."organizationId" LIMIT 1`;
    if(!owned.length)throw new NotFoundException('Equipment not found in managed dive center.');
    return this.db.$queryRaw`SELECT m."id",m."movementType",m."fromLocation",m."toLocation",m."tripId",m."assignedAccountId",m."notes",m."occurredAt",t."title" AS "tripTitle" FROM "EquipmentMovement" m LEFT JOIN "Trip" t ON t."id"::text=m."tripId" AND t."organizationId"::text=${center.id} WHERE m."resourceId"=${resourceId} ORDER BY m."occurredAt" DESC LIMIT 200`;
  }

  async customers(accountId:string){
    const center=await this.managedCenter(accountId);
    const bookings=await this.db.booking.findMany({where:{trip:{organizationId:center.id}},select:{accountId:true,status:true,seats:true,createdAt:true,account:{select:{person:{select:{firstName:true,lastName:true}}}}},orderBy:{createdAt:'desc'},take:1000});
    const grouped=new Map<string,{displayName:string;bookingCount:number;confirmedBookings:number;totalSeats:number;lastBookingAt:Date}>();
    for(const booking of bookings){const current=grouped.get(booking.accountId)??{displayName:[booking.account.person.firstName,booking.account.person.lastName].filter(Boolean).join(' ').trim()||'عميل',bookingCount:0,confirmedBookings:0,totalSeats:0,lastBookingAt:booking.createdAt};current.bookingCount+=1;current.totalSeats+=booking.seats;if(booking.status==='CONFIRMED')current.confirmedBookings+=1;if(booking.createdAt>current.lastBookingAt)current.lastBookingAt=booking.createdAt;grouped.set(booking.accountId,current)}
    return [...grouped.values()].sort((a,b)=>b.lastBookingAt.getTime()-a.lastBookingAt.getTime());
  }

  async team(accountId:string){
    const center=await this.managedCenter(accountId);
    const members=await this.db.organizationMember.findMany({where:{organizationId:center.id,status:{in:['ACTIVE','PENDING','SUSPENDED']}},select:{id:true,accountId:true,role:true,status:true,createdAt:true,updatedAt:true,account:{select:{status:true,person:{select:{firstName:true,lastName:true,professional:{select:{headline:true,regionCode:true}},_count:{select:{credentials:{where:{verificationStatus:{in:['VERIFIED','DOCUMENT_VERIFIED']}}}}}}},roleAssignments:{where:{role:'INSTRUCTOR'},select:{status:true,activeAt:true}}}}},orderBy:{createdAt:'asc'}});
    const ids=members.map(row=>row.accountId);
    const [enrollments,sessions]=ids.length?await Promise.all([
      this.db.trainingEnrollment.groupBy({by:['instructorAccountId'],where:{centerOrganizationId:center.id,instructorAccountId:{in:ids},status:{in:['PENDING','ACTIVE','SUSPENDED']}},_count:{_all:true}}),
      this.db.trainingSession.groupBy({by:['instructorAccountId'],where:{instructorAccountId:{in:ids},status:{in:['SCHEDULED','CHECK_IN_OPEN','IN_PROGRESS']},trainingRecord:{enrollment:{centerOrganizationId:center.id}}},_count:{_all:true}}),
    ]):[[],[]];
    const enrollmentCounts=new Map(enrollments.map(row=>[row.instructorAccountId,row._count._all])),sessionCounts=new Map(sessions.map(row=>[row.instructorAccountId,row._count._all]));
    return members.map(member=>{
      const ordinary=['OPERATOR','INSTRUCTOR','STAFF','VIEWER'].includes(member.role)&&member.accountId!==accountId;
      return {membershipId:member.id,role:member.role,status:member.status,accountStatus:member.account.status,updatedAt:member.updatedAt,canCancelInvitation:ordinary&&member.status==='PENDING',canChangeRole:ordinary&&['ACTIVE','SUSPENDED'].includes(member.status),canSuspend:ordinary&&member.status==='ACTIVE',canReactivate:ordinary&&member.status==='SUSPENDED',openTrainingEnrollments:enrollmentCounts.get(member.accountId)||0,openTrainingSessions:sessionCounts.get(member.accountId)||0,person:{displayName:[member.account.person.firstName,member.account.person.lastName].filter(Boolean).join(' ').trim()||'عضو',headline:member.account.person.professional?.headline??null,regionCode:member.account.person.professional?.regionCode??null},professional:{instructorStatus:member.account.roleAssignments[0]?.status??null,instructorActiveAt:member.account.roleAssignments[0]?.activeAt??null,verifiedCredentials:member.account.person._count.credentials}};
    });
  }

  async professionals(accountId:string){
    const center=await this.managedCenter(accountId);
    const memberships=await this.db.organizationMember.findMany({where:{organizationId:center.id,status:'ACTIVE',role:'INSTRUCTOR',account:{status:'ACTIVE',roleAssignments:{some:{role:'INSTRUCTOR',status:'ACTIVE'}}}},select:{accountId:true,account:{select:{person:{select:{firstName:true,lastName:true,professional:{select:{headline:true,regionCode:true}},_count:{select:{credentials:{where:{verificationStatus:{in:['VERIFIED','DOCUMENT_VERIFIED']}}}}}}}}}}});
    const ids=memberships.map(row=>row.accountId);
    const assignmentCounts=ids.length?await this.db.trainingEnrollment.groupBy({by:['instructorAccountId'],where:{centerOrganizationId:center.id,instructorAccountId:{in:ids},status:{in:['ACTIVE','COMPLETED']}},_count:{_all:true}}):[];
    const counts=new Map(assignmentCounts.map(row=>[row.instructorAccountId,row._count._all]));
    return memberships.map(row=>({accountId:row.accountId,displayName:[row.account.person.firstName,row.account.person.lastName].filter(Boolean).join(' ').trim()||'محترف غوص',headline:row.account.person.professional?.headline??null,regionCode:row.account.person.professional?.regionCode??null,verifiedCredentials:row.account.person._count.credentials,assignedTrainingCount:counts.get(row.accountId)||0}));
  }

  async bookings(accountId:string,tripId:string){
    const center=await this.managedCenter(accountId);
    const trip=await this.db.trip.findFirst({where:{id:tripId,organizationId:center.id},select:{id:true}});
    if(!trip)throw new NotFoundException('Trip not found in managed dive center.');
    return this.db.booking.findMany({where:{tripId},select:{id:true,status:true,seats:true,createdAt:true,account:{select:{person:{select:{firstName:true,lastName:true}}}},participants:{select:{id:true,fullName:true,eligibilityStatus:true}}},orderBy:{createdAt:'desc'}});
  }
}
