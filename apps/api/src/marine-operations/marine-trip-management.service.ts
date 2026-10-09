import {BadRequestException,ConflictException,ForbiddenException,Injectable,NotFoundException} from '@nestjs/common';
import {Prisma} from '@prisma/client';
import {AuditService} from '../audit/audit.service';
import {DatabaseService} from '../database/database.service';

type TripInput={title:string;startsAt:Date;endsAt:Date;capacity:number;pricePerSeatMinor:number;locationName:string;latitude:number;longitude:number};
type TripLocation={tripId:string;locationName:string;latitude:number;longitude:number};
const editable=['title','startsAt','endsAt','capacity','pricePerSeatMinor','locationName','latitude','longitude'];

@Injectable()
export class MarineTripManagementService{
 constructor(private readonly db:DatabaseService,private readonly audit:AuditService){}
 private async organizations(tx:Prisma.TransactionClient,accountId:string){
  const role=await tx.roleAssignment.findFirst({where:{accountId,role:'BOAT_OWNER',status:'ACTIVE',account:{status:'ACTIVE'}},select:{id:true}});
  if(!role)throw new ForbiddenException('Active marine brokerage role required.');
  const memberships=await tx.organizationMember.findMany({where:{accountId,status:'ACTIVE',role:{in:['OWNER','ADMIN','OPERATOR','STAFF']},organization:{kind:'MARINE_OPERATOR',status:'ACTIVE'}},select:{organizationId:true}});
  if(!memberships.length)throw new ForbiddenException('Active marine operator membership required.');
  return [...new Set(memberships.map(row=>row.organizationId))];
 }
 private object(input:Record<string,unknown>,allowed:string[]){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!allowed.includes(key)))throw new BadRequestException('Trip fields are invalid.');}
 private revision(value:unknown){if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw new BadRequestException('Refresh the trip before saving.');return new Date(value);}
 private validate(input:Record<string,unknown>):TripInput{
  const title=input.title,locationName=input.locationName;
  if(typeof title!=='string'||!title.trim()||title.trim().length>240||typeof locationName!=='string'||!locationName.trim()||locationName.trim().length>240)throw new BadRequestException('Trip title and location are required.');
  if(typeof input.startsAt!=='string'||typeof input.endsAt!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(input.startsAt)||!/(Z|[+-]\d{2}:\d{2})$/.test(input.endsAt))throw new BadRequestException('Trip times must include a timezone.');
  const startsAt=new Date(input.startsAt),endsAt=new Date(input.endsAt);
  if(!Number.isFinite(startsAt.getTime())||!Number.isFinite(endsAt.getTime())||startsAt<=new Date()||endsAt<=startsAt)throw new BadRequestException('Trip must start in the future and end after it starts.');
  const {capacity,pricePerSeatMinor,latitude,longitude}=input;
  if(typeof capacity!=='number'||!Number.isSafeInteger(capacity)||capacity<1||capacity>2147483647)throw new BadRequestException('Capacity must be a positive integer.');
  if(typeof pricePerSeatMinor!=='number'||!Number.isSafeInteger(pricePerSeatMinor)||pricePerSeatMinor<0)throw new BadRequestException('Seat price must be a nonnegative amount in halalas.');
  if(typeof latitude!=='number'||!Number.isFinite(latitude)||latitude< -90||latitude>90||typeof longitude!=='number'||!Number.isFinite(longitude)||longitude< -180||longitude>180)throw new BadRequestException('Trip coordinates are invalid.');
  return{title:title.trim(),startsAt,endsAt,capacity,pricePerSeatMinor,locationName:locationName.trim(),latitude,longitude};
 }
 private async details(tx:Prisma.TransactionClient,id:string){
  const trip=await tx.trip.findUniqueOrThrow({where:{id},include:{_count:{select:{bookings:true}}}});
  const price=await tx.operationalSetting.findUnique({where:{key:'trip-price:'+id},select:{value:true}});
  const locations=await tx.$queryRaw<TripLocation[]>`SELECT "tripId","locationName","latitude","longitude" FROM "TripOperationalLocation" WHERE "tripId"::text=${id}`;
  return{...trip,price:price?.value??null,location:locations[0]??null};
 }
 async list(accountId:string){return this.db.serializable(async tx=>{
  const organizationIds=await this.organizations(tx,accountId),rows=await tx.trip.findMany({where:{organizationId:{in:organizationIds}},orderBy:{startsAt:'desc'},take:200,include:{_count:{select:{bookings:true}}}});
  const prices=rows.length?await tx.operationalSetting.findMany({where:{key:{in:rows.map(row=>'trip-price:'+row.id)}},select:{key:true,value:true}}):[],priceMap=new Map(prices.map(row=>[row.key,row.value]));
  const locations=rows.length?await tx.$queryRaw<TripLocation[]>`SELECT l."tripId",l."locationName",l."latitude",l."longitude" FROM "TripOperationalLocation" l WHERE l."tripId"::text IN (${Prisma.join(rows.map(row=>row.id))})`:[],locationMap=new Map(locations.map(row=>[row.tripId,row]));
  return rows.map(row=>({...row,price:priceMap.get('trip-price:'+row.id)??null,location:locationMap.get(row.id)??null}));
 });}
 async save(accountId:string,input:Record<string,unknown>,id?:string):Promise<unknown>{
  this.object(input,[...editable,'organizationId',...(id?['expectedUpdatedAt']:['requestId'])]);const value=this.validate(input);
  const revision=id?this.revision(input.expectedUpdatedAt):null;
  if(typeof input.organizationId!=='string'||!input.organizationId)throw new BadRequestException('Select a marine organization.');
  if(!id&&(typeof input.requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)))throw new BadRequestException('Invalid save request id.');
  const tripId=id??String(input.requestId);
  try{return await this.db.serializable(async tx=>{
   const organizationIds=await this.organizations(tx,accountId),organizationId=input.organizationId as string;
   if(!organizationIds.includes(organizationId))throw new ForbiddenException('Marine organization access required.');
   const before=await tx.trip.findUnique({where:{id:tripId}});
   if(id&&(!before||before.organizationId!==organizationId))throw new NotFoundException('Trip not found in this marine organization.');
   if(before){
    if(before.organizationId!==organizationId)throw new ConflictException('Save request id already belongs to another trip.');
    if(!id){const current=await this.details(tx,tripId),price=current.price as {pricePerSeatMinor?:number}|null,same=before.title===value.title&&before.startsAt.getTime()===value.startsAt.getTime()&&before.endsAt.getTime()===value.endsAt.getTime()&&before.capacity===value.capacity&&price?.pricePerSeatMinor===value.pricePerSeatMinor&&current.location?.locationName===value.locationName&&current.location?.latitude===value.latitude&&current.location?.longitude===value.longitude;if(same)return current;throw new ConflictException('This save request was already used with different data.');}
    if(before.status!=='DRAFT'||await tx.booking.count({where:{tripId}}))throw new ConflictException('Only an unpublished trip without bookings can be edited.');
    const allocations=await tx.$queryRaw<Array<{id:string}>>`SELECT a."id" FROM "CalendarAllocation" a JOIN "CalendarEvent" e ON e."id"=a."eventId" WHERE e."referenceType"='TRIP' AND e."referenceId"=${tripId} AND a."status"='ACTIVE' LIMIT 1`;if(allocations.length)throw new ConflictException('Release or reschedule linked resources before editing this trip.');
    if(before.updatedAt.getTime()!==revision!.getTime())throw new ConflictException('Trip changed. Refresh before saving.');
   }
   const {title,startsAt,endsAt,capacity}=value;
   if(id){const changed=await tx.trip.updateMany({where:{id:tripId,organizationId,status:'DRAFT',updatedAt:revision!},data:{title,startsAt,endsAt,capacity}});if(changed.count!==1)throw new ConflictException('Trip changed. Refresh before saving.');}
   else await tx.trip.create({data:{id:tripId,organizationId,title,type:'BOAT',startsAt,endsAt,capacity,status:'DRAFT'}});
   await tx.operationalSetting.upsert({where:{key:'trip-price:'+tripId},create:{key:'trip-price:'+tripId,value:{pricePerSeatMinor:value.pricePerSeatMinor,currency:'SAR'}},update:{value:{pricePerSeatMinor:value.pricePerSeatMinor,currency:'SAR'},updatedAt:new Date()}});
   await tx.$executeRaw`INSERT INTO "TripOperationalLocation"("tripId","locationName","latitude","longitude","createdAt","updatedAt") SELECT t."id",${value.locationName},${value.latitude},${value.longitude},NOW(),NOW() FROM "Trip" t WHERE t."id"::text=${tripId} ON CONFLICT("tripId") DO UPDATE SET "locationName"=EXCLUDED."locationName","latitude"=EXCLUDED."latitude","longitude"=EXCLUDED."longitude","updatedAt"=NOW()`;
   if(id)await tx.$executeRaw`UPDATE "TripWeatherReview" SET "status"='PENDING',"reviewedByAccountId"=NULL,"reviewedAt"=NULL,"notes"='Trip schedule or location changed; weather review must be repeated.',"updatedAt"=NOW() WHERE "tripId"::text=${tripId} AND "status"='APPROVED'`;
   await this.audit.record({actorId:accountId,action:id?'MARINE_TRIP_UPDATED':'MARINE_TRIP_CREATED',resource:'Trip',resourceId:tripId,metadata:{organizationId,title,status:'DRAFT',pricePerSeatMinor:value.pricePerSeatMinor,currency:'SAR'}},tx);
   return this.details(tx,tripId);
  });}catch(error){if(!id&&typeof error==='object'&&error!==null&&'code' in error&&error.code==='P2002')return this.save(accountId,input);throw error;}
 }
 async publish(accountId:string,id:string,input:Record<string,unknown>){
  this.object(input,['expectedUpdatedAt']);const revision=this.revision(input.expectedUpdatedAt);
  return this.db.serializable(async tx=>{
   const organizationIds=await this.organizations(tx,accountId),trip=await tx.trip.findFirst({where:{id,organizationId:{in:organizationIds}}});if(!trip)throw new NotFoundException('Trip not found in your marine organizations.');
   if(trip.updatedAt.getTime()!==revision.getTime())throw new ConflictException('Trip changed. Refresh before publishing.');
   if(trip.status!=='DRAFT'||trip.startsAt<=new Date())throw new ConflictException('Only a future draft trip can be published.');
   const detail=await this.details(tx,id),price=detail.price as {pricePerSeatMinor?:number;currency?:string}|null;
   if(!price||!Number.isSafeInteger(price.pricePerSeatMinor)||Number(price.pricePerSeatMinor)<0||price.currency!=='SAR'||!detail.location)throw new ConflictException('Add a price and location before opening bookings.');
   // Publishing opens bookings only; it does not approve safety, weather, or operational clearance.
   const updated=await tx.trip.updateMany({where:{id,organizationId:trip.organizationId,status:'DRAFT',updatedAt:revision},data:{status:'OPEN'}});if(updated.count!==1)throw new ConflictException('Trip changed. Refresh before publishing.');
   await this.audit.record({actorId:accountId,action:'MARINE_TRIP_PUBLISHED',resource:'Trip',resourceId:id,metadata:{organizationId:trip.organizationId,previousStatus:'DRAFT',status:'OPEN',operationalApprovalGranted:false}},tx);
   return this.details(tx,id);
  });
 }
}
