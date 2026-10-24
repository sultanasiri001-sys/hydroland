import { BookingManagementService } from './booking-management.service';
import { TripLifecycleService } from './trip-lifecycle.service';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BookingParticipantService } from './booking-participant.service';
import { CrewAssignmentService } from './crew-assignment.service';
import { OperationalClearanceService } from './operational-clearance.service';
import { PolicyControlService } from './policy-control.service';
import { TripWeatherReviewService } from './trip-weather-review.service';
import { WeatherGateService } from './weather-gate.service';

export type TripStatusValue='DRAFT'|'OPEN'|'CLOSED'|'CANCELLED'|'COMPLETED';
const TRIP_STATUSES:TripStatusValue[]=['DRAFT','OPEN','CLOSED','CANCELLED','COMPLETED'];
type CreateTripInput={title?:string;type?:string;startsAt?:string;endsAt?:string;capacity?:number;status?:TripStatusValue;locationName?:string;latitude?:number;longitude?:number;pricePerSeatMinor?:number};
type AdminTripRow={id:string;title:string;type:string;startsAt:Date;endsAt:Date;capacity:number;status:TripStatusValue;createdAt:Date;updatedAt:Date};
type AdminBookingRow={id:string;tripId:string;accountId:string;status:string;seats:number;createdAt:Date;updatedAt:Date;account:unknown};
type AffectedBooking={id:string;accountId:string;seats:number;status:string};
type TripPrice={pricePerSeatMinor:number;currency:'SAR';configured:boolean};

@Injectable()
export class TripAdminService {
  constructor(private readonly bookingManagement:BookingManagementService,private readonly lifecycle:TripLifecycleService,private readonly db:DatabaseService,private readonly audit:AuditService,private readonly crewAssignments:CrewAssignmentService,private readonly clearance:OperationalClearanceService,private readonly participants:BookingParticipantService,private readonly policies:PolicyControlService,private readonly notifications:NotificationsService,private readonly weatherGate:WeatherGateService,private readonly weatherReviews:TripWeatherReviewService) {}

  private async notifyQuietly(accountId:string,type:string,payload:Record<string,unknown>){try{await this.notifications.notify(accountId,type,payload);}catch{return;}}
  private priceKey(tripId:string){return `trip-price:${tripId}`;}
  private async tripPrice(tripId:string):Promise<TripPrice>{
    const row=await this.db.operationalSetting.findUnique({where:{key:this.priceKey(tripId)},select:{value:true}});
    if(!row?.value||typeof row.value!=='object'||Array.isArray(row.value))return{pricePerSeatMinor:0,currency:'SAR',configured:false};
    const value=row.value as Record<string,unknown>,amount=typeof value.pricePerSeatMinor==='number'?value.pricePerSeatMinor:Number.NaN,currency=typeof value.currency==='string'?value.currency.toUpperCase():'';
    if(!Number.isSafeInteger(amount)||amount<0||currency!=='SAR')return{pricePerSeatMinor:0,currency:'SAR',configured:false};
    return{pricePerSeatMinor:amount,currency:'SAR',configured:true};
  }
  private async writeTripPrice(tripId:string,pricePerSeatMinor:number){
    const value={pricePerSeatMinor,currency:'SAR'};
    await this.db.operationalSetting.upsert({where:{key:this.priceKey(tripId)},create:{key:this.priceKey(tripId),value},update:{value,updatedAt:new Date()}});
    return{...value,configured:true} as TripPrice;
  }

  async list(){const trips=(await this.db.trip.findMany({orderBy:{startsAt:'desc'}})) as AdminTripRow[];return Promise.all(trips.map(async(trip:AdminTripRow)=>{const[operationalClearance,location,weatherReview,price]=await Promise.all([this.clearance.status(trip.id),this.weatherReviews.location(trip.id),this.weatherReviews.latest(trip.id),this.tripPrice(trip.id)]);return{...trip,operationalClearance,location,weatherReview,price};}));}
  operationalClearance(reviewerAccountId:string,tripId:string,reason?:string){return this.clearance.grant(reviewerAccountId,tripId,reason);}
  location(reviewerAccountId:string,tripId:string,input:{locationName?:string;latitude?:number;longitude?:number}){return this.weatherReviews.setLocation(reviewerAccountId,tripId,input);}

  async setPrice(reviewerAccountId:string,tripId:string,pricePerSeatMinor:number){
    if(!Number.isSafeInteger(pricePerSeatMinor)||pricePerSeatMinor<0)throw new BadRequestException('Trip price must be a non-negative integer in halalas.');
    const trip=await this.db.trip.findUnique({where:{id:tripId},select:{id:true,status:true,startsAt:true}});if(!trip)throw new NotFoundException('Trip not found.');
    if(['COMPLETED','CANCELLED'].includes(trip.status)||trip.startsAt<=new Date())throw new ConflictException('Trip price cannot be changed after trip closure or start.');
    const bookingIds=(await this.db.booking.findMany({where:{tripId},select:{id:true}})).map(row=>row.id);
    const paymentCount=bookingIds.length?await this.db.payment.count({where:{bookingId:{in:bookingIds}}}):0;
    if(paymentCount>0)throw new ConflictException('Trip price cannot be changed after a payment has been created.');
    const previous=await this.tripPrice(tripId),price=await this.writeTripPrice(tripId,pricePerSeatMinor);
    await this.audit.record({action:'TRIP_PRICE_CHANGED',resource:'Trip',resourceId:tripId,metadata:{reviewerAccountId,previousPricePerSeatMinor:previous.pricePerSeatMinor,previousConfigured:previous.configured,pricePerSeatMinor,currency:'SAR',financialActionExecuted:false}});
    return price;
  }

  async bookings(tripId:string){const trip=await this.db.trip.findUnique({where:{id:tripId},select:{id:true}});if(!trip)throw new NotFoundException('Trip not found.');const bookings=(await this.db.booking.findMany({where:{tripId},orderBy:{createdAt:'asc'},include:{account:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}},participants:true}})) as Array<AdminBookingRow&{participants:unknown[]}>;return bookings;}

  confirmBooking(reviewerAccountId:string,tripId:string,bookingId:string){return this.bookingManagement.legacy(reviewerAccountId,bookingId,'CONFIRM','admin',tripId);}

  async setParticipantEligibility(reviewerAccountId:string,tripId:string,bookingId:string,participantId:string,input:{status:'ELIGIBLE'|'REJECTED';expectedUpdatedAt:string;reason:string;reviewed:boolean}){
    const status=input?.status,reason=typeof input?.reason==='string'?input.reason.trim():'';
    const expectedAt=typeof input?.expectedUpdatedAt==='string'?new Date(input.expectedUpdatedAt):new Date(NaN);
    if(!['ELIGIBLE','REJECTED'].includes(status)||input?.reviewed!==true||reason.length<5||reason.length>1000||!Number.isFinite(expectedAt.getTime()))throw new BadRequestException('اختر القرار وأكد المراجعة وأضف ملاحظات من 5 إلى 1000 حرف.');
    const result=await this.db.serializable(async tx=>{
      const admin=await tx.roleAssignment.findFirst({where:{accountId:reviewerAccountId,role:'ADMIN',status:'ACTIVE',account:{status:'ACTIVE'}},select:{id:true}});
      if(!admin)throw new ForbiddenException('تتطلب مراجعة الأهلية حساب إدارة نشطًا.');
      const booking=await tx.booking.findFirst({where:{id:bookingId,tripId},select:{id:true,status:true,accountId:true,updatedAt:true,trip:{select:{status:true,startsAt:true}}}});
      if(!booking)throw new NotFoundException('Booking not found for this trip.');
      if(booking.status!=='PENDING'||['CANCELLED','COMPLETED'].includes(booking.trip.status)||booking.trip.startsAt<=new Date())throw new ConflictException('تقتصر مراجعة الأهلية على الحجوزات المنتظرة قبل بدء الرحلة.');
      const participant=await tx.bookingParticipant.findFirst({where:{id:participantId,bookingId}});
      if(!participant)throw new NotFoundException('Participant not found.');
      if(participant.updatedAt.getTime()!==expectedAt.getTime())throw new ConflictException('تغيرت بيانات المشارك؛ حدّث الحجوزات وراجعها مجددًا.');
      await tx.bookingParticipant.update({where:{id:participantId},data:{eligibilityStatus:status,updatedAt:new Date(Math.max(Date.now(),participant.updatedAt.getTime()+1))}});
      await tx.booking.update({where:{id:bookingId},data:{updatedAt:new Date(Math.max(Date.now(),booking.updatedAt.getTime()+1))}});
      const recipients=[...new Set([booking.accountId,...(participant.accountId?[participant.accountId]:[])])];
      await this.audit.record({actorId:reviewerAccountId,action:'BOOKING_PARTICIPANT_ELIGIBILITY_CHANGED',resource:'BookingParticipant',resourceId:participantId,metadata:{reviewerAccountId,tripId,bookingId,previousStatus:participant.eligibilityStatus,status,reason,reviewed:true}},tx);
      return {rows:await tx.bookingParticipant.findMany({where:{bookingId},orderBy:{createdAt:'asc'}}),recipients};
    });
    await Promise.all(result.recipients.map(accountId=>this.notifyQuietly(accountId,'PARTICIPANT_ELIGIBILITY_CHANGED',{participantId,bookingId,tripId,status})));
    return result.rows;
  }

  cancelBooking(reviewerAccountId:string,tripId:string,bookingId:string){return this.bookingManagement.legacy(reviewerAccountId,bookingId,'CANCEL','admin',tripId);}

  async create(reviewerAccountId:string,input:CreateTripInput){
    if(!input.title?.trim()||!input.type?.trim()||!input.startsAt||!input.endsAt)throw new BadRequestException('Trip title, type, startsAt and endsAt are required.');
    if(!Number.isInteger(input.capacity)||Number(input.capacity)<1)throw new BadRequestException('Trip capacity must be a positive integer.');
    if(input.pricePerSeatMinor!==undefined&&(!Number.isSafeInteger(input.pricePerSeatMinor)||input.pricePerSeatMinor<0))throw new BadRequestException('Trip price must be a non-negative integer in halalas.');
    if(input.status&&!TRIP_STATUSES.includes(input.status))throw new BadRequestException('Invalid trip status.');
    if(input.status==='COMPLETED')throw new BadRequestException('Use the governed trip completion workflow.');
    const startsAt=new Date(input.startsAt),endsAt=new Date(input.endsAt);if(Number.isNaN(startsAt.getTime())||Number.isNaN(endsAt.getTime())||endsAt<=startsAt)throw new BadRequestException('Trip date range is invalid.');
    const suppliedLocation=input.locationName!==undefined||input.latitude!==undefined||input.longitude!==undefined;
    const pricePerSeatMinor=input.pricePerSeatMinor??0;
    const trip=await this.db.trip.create({data:{title:input.title.trim(),type:input.type.trim(),startsAt,endsAt,capacity:Number(input.capacity),status:input.status??'DRAFT'}});
    let location=null;try{await this.writeTripPrice(trip.id,pricePerSeatMinor);if(suppliedLocation)location=await this.weatherReviews.setLocation(reviewerAccountId,trip.id,{locationName:input.locationName,latitude:input.latitude,longitude:input.longitude});}catch(error){await this.db.operationalSetting.deleteMany({where:{key:this.priceKey(trip.id)}});await this.db.trip.delete({where:{id:trip.id}});throw error;}
    const price=await this.tripPrice(trip.id);
    await this.audit.record({action:'TRIP_CREATED',resource:'Trip',resourceId:trip.id,metadata:{reviewerAccountId,title:trip.title,type:trip.type,startsAt:trip.startsAt,endsAt:trip.endsAt,capacity:trip.capacity,status:trip.status,pricePerSeatMinor:price.pricePerSeatMinor,currency:price.currency,location}});
    return{...trip,price,location};
  }

  lifecyclePreview(accountId:string,id:string){return this.lifecycle.preview(accountId,id,'admin');}
  async setStatus(reviewerAccountId:string,id:string,input:Record<string,unknown>){
    if(!input||typeof input!=='object'||Array.isArray(input))throw new BadRequestException('Invalid lifecycle input.');
    const {status,...details}=input;
    if(!['OPEN','CLOSED','CANCELLED'].includes(String(status)))throw new BadRequestException('Use the governed lifecycle; terminal trips cannot be reset.');
    const trip=await this.db.trip.findUnique({where:{id}});if(!trip)throw new NotFoundException('Trip not found.');
    const action=status==='OPEN'?'REOPEN':status==='CLOSED'?'CLOSE':'CANCEL';
    const result=await this.lifecycle.apply(reviewerAccountId,id,{...details,action},'admin');
    return {...(result as unknown as {trip:object}).trip,...result};
  }
}
