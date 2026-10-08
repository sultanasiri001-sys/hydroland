import { BookingManagementService } from './booking-management.service';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { BookingParticipantService } from './booking-participant.service';
import { PolicyControlService } from './policy-control.service';
import { TripWeatherReviewService } from './trip-weather-review.service';
import { WeatherGateService, WeatherSnapshot } from './weather-gate.service';
import { createHash } from 'node:crypto';

type TripListRow={id:string;title:string;status:string;startsAt:Date;capacity:number;bookings:Array<{seats:number}>;safetyChecklists:Array<{id:string;decision:string;items:unknown;notes:string|null;decidedAt:Date|null;createdAt:Date}>;[key:string]:unknown};
type WeatherReviewRow={status:'PENDING'|'APPROVED'|'REJECTED';snapshot:WeatherSnapshot;forecastAt:Date;fetchedAt:Date};
type TripPrice={pricePerSeatMinor:number;currency:'SAR';configured:boolean};

@Injectable()
export class TripsService {
  constructor(private readonly bookingManagement:BookingManagementService,private readonly db:DatabaseService,private readonly weatherGate:WeatherGateService,private readonly weatherReviews:TripWeatherReviewService,private readonly participants:BookingParticipantService,private readonly policies:PolicyControlService,private readonly audit:AuditService) {}

  private async tripPrice(tripId:string):Promise<TripPrice>{
    const row=await this.db.operationalSetting.findUnique({where:{key:`trip-price:${tripId}`},select:{value:true}});
    if(!row?.value||typeof row.value!=='object'||Array.isArray(row.value))return{pricePerSeatMinor:0,currency:'SAR',configured:false};
    const value=row.value as Record<string,unknown>,amount=typeof value.pricePerSeatMinor==='number'?value.pricePerSeatMinor:Number.NaN,currency=typeof value.currency==='string'?value.currency.toUpperCase():'';
    if(!Number.isSafeInteger(amount)||amount<0||currency!=='SAR')return{pricePerSeatMinor:0,currency:'SAR',configured:false};
    return{pricePerSeatMinor:amount,currency:'SAR',configured:true};
  }

  async list(){const gateSettings=await this.weatherGate.settings();const trips=(await this.db.trip.findMany({where:{status:'OPEN'},orderBy:{startsAt:'asc'},include:{bookings:{where:{status:{in:['PENDING','CONFIRMED']}},select:{seats:true}},safetyChecklists:{orderBy:{createdAt:'desc'},take:1,select:{id:true,decision:true,items:true,notes:true,decidedAt:true,createdAt:true}}}})) as TripListRow[];return Promise.all(trips.map(async(trip:TripListRow)=>{const bookedSeats=trip.bookings.reduce((sum:number,booking:{seats:number})=>sum+booking.seats,0),latestSafety=trip.safetyChecklists[0]??null,[location,review,price]=await Promise.all([this.weatherReviews.location(trip.id),this.weatherReviews.latest(trip.id),this.tripPrice(trip.id)]),weather=this.weatherGate.evaluateReview(review?.snapshot,review?.status,gateSettings),{bookings,safetyChecklists,...base}=trip;return {...base,bookedSeats,remainingSeats:Math.max(0,trip.capacity-bookedSeats),price,safety:latestSafety,location,weather:{snapshot:review?.snapshot??null,reviewStatus:review?.status??null,forecastAt:review?.forecastAt??null,fetchedAt:review?.fetchedAt??null,gate:gateSettings,evaluation:weather}};}));}

  async book(accountId:string,tripId:string,seats:number){
    if(!Number.isInteger(seats)||seats<1)throw new BadRequestException('Invalid seats.');
    const gateSettings=await this.weatherGate.settings();
    const [safetyPolicy,weatherPolicy,capacityPolicy]=await Promise.all([this.policies.decision('BOOKING','SAFETY_APPROVAL'),this.policies.decision('WEATHER','WEATHER_GATE'),this.policies.decision('BOOKING','CAPACITY_LIMIT')]);
    const reviewIssues:string[]=[];
    const result=await this.db.serializable(async tx=>{
      const trip=await tx.trip.findUnique({where:{id:tripId}});if(!trip||trip.status!=='OPEN')throw new NotFoundException('Trip unavailable.');if(trip.startsAt<=new Date())throw new ConflictException('Trip already started.');
      const existing=await tx.booking.findFirst({where:{tripId,accountId,organizationId:null},orderBy:{updatedAt:'desc'}});
      if(existing&&existing.status!=='CANCELLED')throw new ConflictException('An active booking already exists for this trip.');
      const latestSafety=await tx.safetyChecklist.findFirst({where:{tripId},orderBy:{createdAt:'desc'},select:{decision:true}});
      if(!latestSafety||latestSafety.decision!=='ALLOWED'){if(safetyPolicy.enforce)throw new ConflictException('Trip requires safety approval before booking.');if(safetyPolicy.review)reviewIssues.push('SAFETY_APPROVAL');}
      const weatherRows=await tx.$queryRaw<WeatherReviewRow[]>`SELECT "status","snapshot","forecastAt","fetchedAt" FROM "TripWeatherReview" WHERE "tripId"::text=${tripId} ORDER BY "fetchedAt" DESC,"createdAt" DESC LIMIT 1`,weatherReview=weatherRows[0]??null,weather=this.weatherGate.evaluateReview(weatherReview?.snapshot,weatherReview?.status,gateSettings);if(weather.blocking){if(weatherPolicy.enforce)throw new ConflictException(weather.reason||'Trip is unavailable because weather review is not approved.');if(weatherPolicy.review)reviewIssues.push('WEATHER_GATE');}
      const used=await tx.booking.aggregate({where:{tripId,status:{in:['PENDING','CONFIRMED']}},_sum:{seats:true}});if((used._sum.seats??0)+seats>trip.capacity){if(capacityPolicy.enforce)throw new ConflictException('Trip capacity reached.');if(capacityPolicy.review)reviewIssues.push('CAPACITY_LIMIT');}
      let booking;
      if(existing){
        await tx.bookingParticipant.deleteMany({where:{bookingId:existing.id}});
        booking=await tx.booking.update({where:{id:existing.id},data:{seats,status:'PENDING'}});
      }else{
        booking=await tx.booking.create({data:{tripId,accountId,seats,status:'PENDING'}});
      }
      const participantRows=await this.participants.ensureForBooking(booking.id,accountId,seats,tx);
      return{booking,participantRows,rebooked:Boolean(existing),weatherReview};
    });
    const price=await this.tripPrice(tripId);
    return {...result.booking,price,participants:result.participantRows,rebooked:result.rebooked,policyReview:{required:reviewIssues.length>0,issues:[...new Set(reviewIssues)],states:{safety:safetyPolicy.state,weather:weatherPolicy.state,capacity:capacityPolicy.state},weatherGate:{enabled:gateSettings.enabled,mode:gateSettings.mode,provider:gateSettings.provider,reviewStatus:result.weatherReview?.status??null,forecastAt:result.weatherReview?.forecastAt??null}}};
  }

  async bookForOrganization(accountId:string,organizationId:string,input:{tripId:string;seats:number;requestKey:string;participantNames?:string[]}){
    if(!organizationId?.trim()||!input.tripId?.trim()||!Number.isInteger(input.seats)||input.seats<1||input.seats>30)throw new BadRequestException('بيانات طلب الحجز غير صالحة.');
    const requestKey=input.requestKey?.trim();
    if(!requestKey||requestKey.length>100)throw new BadRequestException('مفتاح إعادة الطلب غير صالح.');
    const suppliedNames=input.participantNames??[];
    if(!Array.isArray(suppliedNames)||suppliedNames.length!==0&&suppliedNames.length!==input.seats)throw new BadRequestException('عدد أسماء المشاركين يجب أن يطابق عدد المقاعد.');
    const names=suppliedNames.length?suppliedNames.map((value,index)=>{const name=typeof value==='string'?value.trim():'';if(name.length<3||name.length>160)throw new BadRequestException('اسم المشارك رقم '+(index+1)+' غير صالح.');return name;}):Array.from({length:input.seats},(_,index)=>'مشارك '+(index+1)+' - البيانات غير مكتملة');
    const fingerprint=createHash('sha256').update(JSON.stringify([organizationId,input.tripId,input.seats,names])).digest('hex');
    const gateSettings=await this.weatherGate.settings();
    const [safetyPolicy,weatherPolicy,capacityPolicy]=await Promise.all([this.policies.decision('BOOKING','SAFETY_APPROVAL'),this.policies.decision('WEATHER','WEATHER_GATE'),this.policies.decision('BOOKING','CAPACITY_LIMIT')]);
    const reviewIssues:string[]=[];
    const result=await this.db.serializable(async tx=>{
      const membership=await tx.organizationMember.findFirst({where:{organizationId,accountId,status:'ACTIVE',role:{in:['OWNER','ADMIN','OPERATOR']},organization:{status:'ACTIVE'},account:{status:'ACTIVE'}},select:{id:true}});
      if(!membership)throw new ForbiddenException('تتطلب العملية عضوية تشغيل نشطة في الجهة.');
      const replay=await tx.booking.findUnique({where:{bookingRequestKey:requestKey},include:{participants:{select:{id:true,fullName:true,certificationTitle:true,eligibilityStatus:true}}}});
      if(replay){if(replay.organizationId!==organizationId||replay.accountId!==accountId||replay.tripId!==input.tripId||replay.bookingRequestFingerprint!==fingerprint)throw new ConflictException('استُخدم مفتاح الطلب ببيانات مختلفة.');return{booking:replay,participantRows:replay.participants,alreadyApplied:true,rebooked:false,weatherReview:null};}
      const previousCancelled=await tx.booking.findFirst({where:{organizationId,tripId:input.tripId,accountId,status:'CANCELLED'},select:{id:true}});
      const active=await tx.booking.findFirst({where:{organizationId,tripId:input.tripId,status:{in:['PENDING','CONFIRMED']}},select:{id:true}});
      if(active)throw new ConflictException('للجهة حجز قائم لهذه الرحلة. افتح الحجز الحالي لتعديله أو تابع طلبه.');
      const trip=await tx.trip.findUnique({where:{id:input.tripId}});
      if(!trip||trip.status!=='OPEN')throw new NotFoundException('الرحلة غير متاحة.');
      if(trip.startsAt<=new Date())throw new ConflictException('بدأت الرحلة بالفعل.');
      const latestSafety=await tx.safetyChecklist.findFirst({where:{tripId:input.tripId},orderBy:{createdAt:'desc'},select:{decision:true}});
      if(!latestSafety||latestSafety.decision!=='ALLOWED'){if(safetyPolicy.enforce)throw new ConflictException('تتطلب الرحلة اعتماد السلامة قبل الحجز.');if(safetyPolicy.review)reviewIssues.push('SAFETY_APPROVAL');}
      const weatherRows=await tx.$queryRaw<WeatherReviewRow[]>`SELECT "status","snapshot","forecastAt","fetchedAt" FROM "TripWeatherReview" WHERE "tripId"::text=${input.tripId} ORDER BY "fetchedAt" DESC,"createdAt" DESC LIMIT 1`,weatherReview=weatherRows[0]??null,weather=this.weatherGate.evaluateReview(weatherReview?.snapshot,weatherReview?.status,gateSettings);
      if(weather.blocking){if(weatherPolicy.enforce)throw new ConflictException(weather.reason||'الرحلة غير متاحة قبل اعتماد حالة الطقس.');if(weatherPolicy.review)reviewIssues.push('WEATHER_GATE');}
      const used=await tx.booking.aggregate({where:{tripId:input.tripId,status:{in:['PENDING','CONFIRMED']}},_sum:{seats:true}});
      if((used._sum.seats??0)+input.seats>trip.capacity){if(capacityPolicy.enforce)throw new ConflictException('اكتملت سعة الرحلة.');if(capacityPolicy.review)reviewIssues.push('CAPACITY_LIMIT');}
      const booking=await tx.booking.create({data:{tripId:input.tripId,accountId,organizationId,bookingRequestKey:requestKey,bookingRequestFingerprint:fingerprint,seats:input.seats,status:'PENDING'}});
      await tx.bookingParticipant.createMany({data:names.map(fullName=>({bookingId:booking.id,accountId:null,fullName,eligibilityStatus:'PENDING'}))});
      const participantRows=await tx.bookingParticipant.findMany({where:{bookingId:booking.id},select:{id:true,fullName:true,certificationTitle:true,eligibilityStatus:true},orderBy:{createdAt:'asc'}});
      await this.audit.record({actorId:accountId,action:'organization.booking.requested',resource:'Booking',resourceId:booking.id,metadata:{organizationId,tripId:input.tripId,seats:input.seats,participantCount:participantRows.length,requestKey,rebooked:Boolean(previousCancelled)}},tx);
      return{booking,participantRows,alreadyApplied:false,rebooked:Boolean(previousCancelled),weatherReview};
    });
    const price=await this.tripPrice(input.tripId);
    return{...result.booking,price,participants:result.participantRows,rebooked:result.rebooked,alreadyApplied:result.alreadyApplied,policyReview:{required:reviewIssues.length>0,issues:[...new Set(reviewIssues)],states:{safety:safetyPolicy.state,weather:weatherPolicy.state,capacity:capacityPolicy.state},weatherGate:{enabled:gateSettings.enabled,mode:gateSettings.mode,provider:gateSettings.provider,reviewStatus:result.weatherReview?.status??null,forecastAt:result.weatherReview?.forecastAt??null}}};
  }

  async listOrganizationBookings(accountId:string,organizationId:string,requestedPage=1,pageSize=20){
    if(!Number.isInteger(requestedPage)||requestedPage<1||requestedPage>100000||!Number.isInteger(pageSize)||pageSize<1||pageSize>50)throw new BadRequestException('مرشحات الحجوزات غير صالحة.');
    return this.db.serializable(async tx=>{
      const member=await tx.organizationMember.findFirst({where:{organizationId,accountId,status:'ACTIVE',organization:{status:'ACTIVE'}},select:{id:true}});
      if(!member)throw new ForbiddenException('تتطلب العملية عضوية نشطة في الجهة.');
      const where={organizationId};
      const [items,total]=await Promise.all([
        tx.booking.findMany({where,select:{id:true,tripId:true,status:true,seats:true,createdAt:true,updatedAt:true,trip:{select:{id:true,title:true,type:true,status:true,startsAt:true,endsAt:true,capacity:true}},participants:{select:{id:true,fullName:true,certificationTitle:true,eligibilityStatus:true},orderBy:{createdAt:'asc'}}},orderBy:[{createdAt:'desc'},{id:'asc'}],take:pageSize,skip:(requestedPage-1)*pageSize}),
        tx.booking.count({where}),
      ]);
      return{items,total,page:requestedPage,pageSize,totalPages:Math.max(1,Math.ceil(total/pageSize))};
    });
  }

  async organizationBookingDetail(accountId:string,organizationId:string,bookingId:string){
    return this.db.serializable(async tx=>{
      const member=await tx.organizationMember.findFirst({where:{organizationId,accountId,status:'ACTIVE',organization:{status:'ACTIVE'}},select:{id:true}});
      if(!member)throw new ForbiddenException('تتطلب العملية عضوية نشطة في الجهة.');
      const row=await tx.booking.findFirst({where:{id:bookingId,organizationId},select:{id:true,tripId:true,status:true,seats:true,createdAt:true,updatedAt:true,trip:{select:{id:true,title:true,type:true,status:true,startsAt:true,endsAt:true,capacity:true}},participants:{select:{id:true,fullName:true,certificationTitle:true,eligibilityStatus:true},orderBy:{createdAt:'asc'}}}});
      if(!row)throw new NotFoundException('الحجز غير موجود ضمن هذه الجهة.');
      return row;
    });
  }

  mine(accountId:string){return this.db.booking.findMany({where:{accountId},include:{trip:true},orderBy:{createdAt:'desc'}});}

  cancelMine(accountId:string,bookingId:string){return this.bookingManagement.legacy(accountId,bookingId,'CANCEL','owner');}

  participantsForBooking(accountId:string,bookingId:string){return this.participants.listForOwner(accountId,bookingId);}
  updateParticipant(accountId:string,bookingId:string,participantId:string,input:{fullName?:string;certificationTitle?:string|null;certificationNumber?:string|null;certificationIssuer?:string|null}){return this.participants.updateForOwner(accountId,bookingId,participantId,input);}
}
