import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';

type TripFields={title:string;type:'BOAT'|'SHORE';startsAt:Date;endsAt:Date;capacity:number;pricePerSeatMinor:number;locationName:string;latitude:number;longitude:number};
type Location={tripId:string;locationName:string;latitude:number;longitude:number};
const fields=['title','type','startsAt','endsAt','capacity','pricePerSeatMinor','locationName','latitude','longitude'];
@Injectable()
export class CenterTripManagementService {
 constructor(private readonly db:DatabaseService,private readonly audit:AuditService){}
 private async scope(tx:Prisma.TransactionClient,accountId:string){
  const role=await tx.roleAssignment.findFirst({where:{accountId,role:'DIVE_CENTER',status:'ACTIVE',account:{status:'ACTIVE'}}});
  if(!role)throw new ForbiddenException('يتطلب الإجراء دور مركز غوص نشطًا.');
  const member=await tx.organizationMember.findFirst({where:{accountId,status:'ACTIVE',role:{in:['OWNER','ADMIN']},organization:{kind:'DIVE_CENTER',status:'ACTIVE'}},orderBy:{createdAt:'asc'},select:{organizationId:true}});
  if(!member)throw new ForbiddenException('يتطلب الإجراء إدارة مركز غوص نشط.');return member.organizationId;
 }
 private object(input:Record<string,unknown>,allowed:string[]){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!allowed.includes(key)))throw new BadRequestException('حقول الرحلة غير صالحة.');}
 private revision(value:unknown){if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw new BadRequestException('حدّث الرحلة قبل الحفظ.');return new Date(value);}
 private validate(input:Record<string,unknown>):TripFields{
  const text=(key:string,max:number)=>{const value=input[key];if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw new BadRequestException('أكمل عنوان الرحلة واسم الموقع ضمن الطول المسموح.');return value.trim()};
  const title=text('title',240),locationName=text('locationName',240),type=input.type;
  if(type!=='BOAT'&&type!=='SHORE')throw new BadRequestException('اختر رحلة بحرية أو غوصًا من الشاطئ.');
  if(typeof input.startsAt!=='string'||typeof input.endsAt!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(input.startsAt)||!/(Z|[+-]\d{2}:\d{2})$/.test(input.endsAt))throw new BadRequestException('أدخل مواعيد الرحلة مع المنطقة الزمنية.');
  const startsAt=new Date(input.startsAt),endsAt=new Date(input.endsAt);
  if(!Number.isFinite(startsAt.getTime())||!Number.isFinite(endsAt.getTime())||startsAt<=new Date()||endsAt<=startsAt)throw new BadRequestException('يجب أن تبدأ الرحلة مستقبلًا وتنتهي بعد بدايتها.');
  const {capacity,pricePerSeatMinor,latitude,longitude}=input;
  if(typeof capacity!=='number'||!Number.isSafeInteger(capacity)||capacity<1||capacity>2147483647)throw new BadRequestException('أدخل سعة صحيحة أكبر من صفر.');
  if(typeof pricePerSeatMinor!=='number'||!Number.isSafeInteger(pricePerSeatMinor)||pricePerSeatMinor<0)throw new BadRequestException('أدخل سعر المقعد بالهللات، أو صفرًا للرحلة المجانية.');
  if(typeof latitude!=='number'||!Number.isFinite(latitude)||latitude< -90||latitude>90||typeof longitude!=='number'||!Number.isFinite(longitude)||longitude< -180||longitude>180)throw new BadRequestException('إحداثيات الموقع غير صالحة.');
  return {title,type,startsAt,endsAt,capacity,pricePerSeatMinor,locationName,latitude,longitude};
 }
 private async details(tx:Prisma.TransactionClient,id:string){
  const trip=await tx.trip.findUniqueOrThrow({where:{id},include:{_count:{select:{bookings:true}}}});
  const price=await tx.operationalSetting.findUnique({where:{key:'trip-price:'+id},select:{value:true}});
  const locations=await tx.$queryRaw<Location[]>`SELECT "tripId","locationName","latitude","longitude" FROM "TripOperationalLocation" WHERE "tripId"::text=${id}`;
  return {...trip,price:price?.value??null,location:locations[0]??null};
 }
 async list(accountId:string){return this.db.serializable(async tx=>{
  const organizationId=await this.scope(tx,accountId),rows=await tx.trip.findMany({where:{organizationId},orderBy:{startsAt:'desc'},take:200,include:{_count:{select:{bookings:true}}}});
  const prices=await tx.operationalSetting.findMany({where:{key:{in:rows.map(row=>'trip-price:'+row.id)}},select:{key:true,value:true}}),priceMap=new Map(prices.map(row=>[row.key,row.value]));
  const locations=rows.length?await tx.$queryRaw<Location[]>`SELECT l."tripId",l."locationName",l."latitude",l."longitude" FROM "TripOperationalLocation" l WHERE l."tripId"::text IN (${Prisma.join(rows.map(row=>row.id))})`:[];
  const locationMap=new Map(locations.map(row=>[row.tripId,row]));return rows.map(row=>({...row,price:priceMap.get('trip-price:'+row.id)??null,location:locationMap.get(row.id)??null}));
 });}
 async save(accountId:string,input:Record<string,unknown>,id?:string,retryUnique=true):Promise<unknown>{
  this.object(input,[...fields,...(id?['expectedUpdatedAt']:['requestId'])]);const value=this.validate(input),revision=id?this.revision(input.expectedUpdatedAt):null;
  if(!id&&(typeof input.requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)))throw new BadRequestException('معرّف طلب الحفظ غير صالح.');
  const tripId=id||String(input.requestId);
  try{return await this.db.serializable(async tx=>{
   const organizationId=await this.scope(tx,accountId),before=await tx.trip.findUnique({where:{id:tripId}});
   if(id&&(!before||before.organizationId!==organizationId))throw new NotFoundException('الرحلة غير موجودة في المركز.');
   if(before){
    if(before.organizationId!==organizationId)throw new ConflictException('تعذر إعادة استخدام طلب الحفظ.');
    if(!id){const current=await this.details(tx,tripId),price=current.price as {pricePerSeatMinor?:number}|null;const same=before.title===value.title&&before.type===value.type&&before.startsAt.getTime()===value.startsAt.getTime()&&before.endsAt.getTime()===value.endsAt.getTime()&&before.capacity===value.capacity&&price?.pricePerSeatMinor===value.pricePerSeatMinor&&current.location?.locationName===value.locationName&&current.location?.latitude===value.latitude&&current.location?.longitude===value.longitude;if(same)return current;throw new ConflictException('سبق حفظ هذا الطلب ببيانات مختلفة. حدّث قائمة الرحلات.');}
    if(before.status!=='DRAFT'||await tx.booking.count({where:{tripId}}))throw new ConflictException('يمكن تعديل الرحلة المحفوظة قبل نشرها ووجود حجوزات فقط.');
    const allocations=await tx.$queryRaw<Array<{id:string}>>`SELECT a."id" FROM "CalendarAllocation" a JOIN "CalendarEvent" e ON e."id"=a."eventId" WHERE e."referenceType"='TRIP' AND e."referenceId"=${tripId} AND a."status"='ACTIVE' LIMIT 1`;if(allocations.length)throw new ConflictException('تتطلب الرحلة إعادة جدولة الموارد المرتبطة قبل تعديل بياناتها.');
    if(before.updatedAt.getTime()!==revision!.getTime())throw new ConflictException('تغيرت الرحلة. أعد تحميلها قبل الحفظ.');
   }
   const {title,type,startsAt,endsAt,capacity}=value,data={title,type,startsAt,endsAt,capacity};
   if(id){const changed=await tx.trip.updateMany({where:{id:tripId,organizationId,status:'DRAFT',updatedAt:revision!},data});if(changed.count!==1)throw new ConflictException('تغيرت الرحلة. أعد تحميلها قبل الحفظ.');}
   else await tx.trip.create({data:{id:tripId,organizationId,...data,status:'DRAFT'}});
   const price={pricePerSeatMinor:value.pricePerSeatMinor,currency:'SAR'};await tx.operationalSetting.upsert({where:{key:'trip-price:'+tripId},create:{key:'trip-price:'+tripId,value:price},update:{value:price,updatedAt:new Date()}});
   await tx.$executeRaw`INSERT INTO "TripOperationalLocation"("tripId","locationName","latitude","longitude","createdAt","updatedAt") SELECT t."id",${value.locationName},${value.latitude},${value.longitude},NOW(),NOW() FROM "Trip" t WHERE t."id"::text=${tripId} ON CONFLICT("tripId") DO UPDATE SET "locationName"=EXCLUDED."locationName","latitude"=EXCLUDED."latitude","longitude"=EXCLUDED."longitude","updatedAt"=NOW()`;
   if(id)await tx.$executeRaw`UPDATE "TripWeatherReview" SET "status"='PENDING',"reviewedByAccountId"=NULL,"reviewedAt"=NULL,"notes"='Trip schedule or location changed; weather review must be repeated.',"updatedAt"=NOW() WHERE "tripId"::text=${tripId} AND "status"='APPROVED'`;
   await this.audit.record({actorId:accountId,action:id?'CENTER_TRIP_UPDATED':'CENTER_TRIP_CREATED',resource:'Trip',resourceId:tripId,metadata:{organizationId,title,status:'DRAFT',pricePerSeatMinor:value.pricePerSeatMinor,currency:'SAR'}},tx);
   return this.details(tx,tripId);
  });}catch(error){if(!id&&retryUnique&&typeof error==='object'&&error!==null&&'code' in error&&error.code==='P2002')return this.save(accountId,input,undefined,false);throw error}
 }
 async publish(accountId:string,id:string,input:Record<string,unknown>){
  this.object(input,['expectedUpdatedAt']);const revision=this.revision(input.expectedUpdatedAt);
  return this.db.serializable(async tx=>{
   const organizationId=await this.scope(tx,accountId),trip=await tx.trip.findFirst({where:{id,organizationId}});if(!trip)throw new NotFoundException('الرحلة غير موجودة في المركز.');
   if(trip.updatedAt.getTime()!==revision.getTime())throw new ConflictException('تغيرت الرحلة. أعد تحميلها قبل النشر.');
   if(trip.status!=='DRAFT'||trip.startsAt<=new Date())throw new ConflictException('يمكن نشر رحلة محفوظة لم تبدأ بعد فقط.');
   const detail=await this.details(tx,id),price=detail.price as {pricePerSeatMinor?:number;currency?:string}|null;
   if(!price||!Number.isSafeInteger(price.pricePerSeatMinor)||Number(price.pricePerSeatMinor)<0||price.currency!=='SAR'||!detail.location)throw new ConflictException('أكمل السعر والموقع قبل فتح الحجز.');
   // Publishing does not grant safety, weather, participant, payment or operational approval.
   // Existing booking and completion services retain those independent gates.
   const updated=await tx.trip.updateMany({where:{id,organizationId,status:'DRAFT',updatedAt:revision},data:{status:'OPEN'}});if(updated.count!==1)throw new ConflictException('تغيرت الرحلة. أعد تحميلها قبل النشر.');
   await this.audit.record({actorId:accountId,action:'CENTER_TRIP_PUBLISHED',resource:'Trip',resourceId:id,metadata:{organizationId,previousStatus:'DRAFT',status:'OPEN',operationalApprovalGranted:false}},tx);
   return this.details(tx,id);
  });
 }
}
