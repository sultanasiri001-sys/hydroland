import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly crewAssignments:CrewAssignmentService,private readonly clearance:OperationalClearanceService,private readonly participants:BookingParticipantService,private readonly policies:PolicyControlService,private readonly notifications:NotificationsService,private readonly weatherGate:WeatherGateService,private readonly weatherReviews:TripWeatherReviewService) {}

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

  async confirmBooking(reviewerAccountId:string,tripId:string,bookingId:string){
    const initial=await this.db.booking.findUnique({where:{id:bookingId},select:{tripId:true,seats:true,status:true}});if(!initial||initial.tripId!==tripId)throw new NotFoundException('Booking not found for this trip.');
    const participantPolicy=initial.status==='CONFIRMED'?{policyState:'ENABLED',reviewRequired:false,bypassed:false,issues:[],incompleteParticipants:0}:await this.participants.assertConfirmable(bookingId,initial.seats);
    const [safetyPolicy,weatherPolicy,capacityPolicy,gateSettings]=await Promise.all([this.policies.decision('BOOKING','SAFETY_APPROVAL'),this.policies.decision('WEATHER','WEATHER_GATE'),this.policies.decision('BOOKING','CAPACITY_LIMIT'),this.weatherGate.settings()]);
    const reviewIssues=[...participantPolicy.issues];
    let weatherState:Awaited<ReturnType<TripWeatherReviewService['refresh']>>|null=null;
    let weatherOutcome=this.weatherGate.evaluate(null,gateSettings);
    if(gateSettings.enabled){
      try{weatherState=await this.weatherReviews.refresh(reviewerAccountId,tripId);weatherOutcome=this.weatherGate.evaluateReview(weatherState.review.snapshot,weatherState.review.status,gateSettings);}catch(error){weatherOutcome={...this.weatherGate.evaluate(null,gateSettings),reason:error instanceof Error?error.message:'Weather data unavailable.'};}
      if(weatherOutcome.blocking){if(weatherPolicy.enforce)throw new ConflictException(weatherOutcome.reason||'Trip requires an approved weather review before confirmation.');if(weatherPolicy.review)reviewIssues.push('WEATHER_GATE');}
    }
    let newlyConfirmed=false;
    const updated=await this.db.serializable(async tx=>{
      const booking=await tx.booking.findUnique({where:{id:bookingId},include:{trip:true}});if(!booking||booking.tripId!==tripId)throw new NotFoundException('Booking not found for this trip.');if(booking.status==='CONFIRMED')return booking;if(booking.status!=='PENDING')throw new ConflictException('Only pending bookings can be confirmed.');if(booking.trip.status!=='OPEN'&&booking.trip.status!=='CLOSED')throw new ConflictException('Trip is not available for booking confirmation.');if(booking.trip.startsAt<=new Date())throw new ConflictException('Trip already started.');
      const latestSafety=await tx.safetyChecklist.findFirst({where:{tripId},orderBy:{createdAt:'desc'},select:{decision:true}});if(latestSafety?.decision!=='ALLOWED'){if(safetyPolicy.enforce)throw new ConflictException('Trip requires an ALLOWED safety decision before confirmation.');if(safetyPolicy.review)reviewIssues.push('SAFETY_APPROVAL');}
      if(gateSettings.enabled&&gateSettings.mode==='ENFORCE'&&weatherPolicy.enforce){const rows=await tx.$queryRaw<Array<{status:string;snapshotHash:string}>>`SELECT "status","snapshotHash" FROM "TripWeatherReview" WHERE "id"::text=${weatherState?.review.id??''} AND "tripId"::text=${tripId} LIMIT 1`;if(rows[0]?.status!=='APPROVED'||rows[0].snapshotHash!==weatherState?.review.snapshotHash)throw new ConflictException('Fresh weather forecast requires human operational approval before confirmation.');}
      const confirmed=await tx.booking.aggregate({where:{tripId,status:'CONFIRMED'},_sum:{seats:true}}),usedSeats=confirmed._sum.seats??0;if(usedSeats+booking.seats>booking.trip.capacity){if(capacityPolicy.enforce)throw new ConflictException('Trip capacity reached.');if(capacityPolicy.review)reviewIssues.push('CAPACITY_LIMIT');}
      newlyConfirmed=true;return tx.booking.update({where:{id:bookingId},data:{status:'CONFIRMED'}});
    });
    const crewNotification=newlyConfirmed?await this.crewAssignments.dispatchForConfirmedBooking(tripId,bookingId):{tripId,bookingId,notifiedCrew:0};
    const policyReview={required:reviewIssues.length>0,issues:[...new Set(reviewIssues)],states:{participant:participantPolicy.policyState,safety:safetyPolicy.state,weather:weatherPolicy.state,capacity:capacityPolicy.state},weatherGate:{enabled:gateSettings.enabled,mode:gateSettings.mode,provider:gateSettings.provider,decision:weatherOutcome.decision,reviewStatus:weatherState?.review.status??null,forecastAt:weatherState?.review.forecastAt??null}};
    await this.audit.record({action:'BOOKING_CONFIRMED',resource:'Booking',resourceId:bookingId,metadata:{reviewerAccountId,tripId,accountId:updated.accountId,seats:updated.seats,notifiedCrew:crewNotification.notifiedCrew,newlyConfirmed,policyReview}});
    if(newlyConfirmed)await this.notifyQuietly(updated.accountId,'BOOKING_CONFIRMED',{bookingId,tripId,seats:updated.seats});
    return {...updated,crewNotification,policyReview};
  }

  async setParticipantEligibility(reviewerAccountId:string,tripId:string,bookingId:string,participantId:string,status:'ELIGIBLE'|'REJECTED'){
    const booking=await this.db.booking.findUnique({where:{id:bookingId},select:{tripId:true,status:true,accountId:true}});
    if(!booking||booking.tripId!==tripId)throw new NotFoundException('Booking not found for this trip.');
    if(booking.status==='CANCELLED')throw new ConflictException('Cancelled booking cannot be reviewed.');
    const existing=await this.db.$queryRaw<Array<{id:string;bookingId:string;accountId:string|null;eligibilityStatus:string}>>`SELECT "id","bookingId","accountId","eligibilityStatus" FROM "BookingParticipant" WHERE "id"=${participantId} AND "bookingId"::text=${bookingId} LIMIT 1`;
    if(!existing[0])throw new NotFoundException('Participant not found.');
    const rows=await this.participants.setEligibility(bookingId,participantId,status);
    const payload={participantId,bookingId,tripId,status,previousStatus:existing[0].eligibilityStatus};
    const recipients=new Set<string>([booking.accountId]);if(existing[0].accountId)recipients.add(existing[0].accountId);
    await Promise.all([...recipients].map(accountId=>this.notifyQuietly(accountId,'PARTICIPANT_ELIGIBILITY_CHANGED',payload)));
    await this.audit.record({action:'BOOKING_PARTICIPANT_ELIGIBILITY_CHANGED',resource:'BookingParticipant',resourceId:participantId,metadata:{reviewerAccountId,tripId,bookingId,previousStatus:existing[0].eligibilityStatus,status,notifiedAccounts:recipients.size}});
    return rows;
  }

  async cancelBooking(reviewerAccountId:string,tripId:string,bookingId:string){const booking=await this.db.booking.findUnique({where:{id:bookingId},include:{trip:true}});if(!booking||booking.tripId!==tripId)throw new NotFoundException('Booking not found for this trip.');if(booking.status==='CANCELLED')return booking;if(booking.trip.status==='COMPLETED'||booking.trip.status==='CANCELLED')throw new ConflictException('Booking cannot be cancelled after trip closure.');if(booking.trip.startsAt<=new Date())throw new ConflictException('Booking cannot be cancelled after the trip starts.');const updated=await this.db.booking.update({where:{id:bookingId},data:{status:'CANCELLED'}});await this.audit.record({action:'BOOKING_CANCELLED',resource:'Booking',resourceId:bookingId,metadata:{reviewerAccountId,tripId,accountId:booking.accountId,seats:booking.seats,previousStatus:booking.status}});await this.notifyQuietly(booking.accountId,'BOOKING_CANCELLED',{bookingId,tripId,seats:booking.seats});return updated;}

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

  async setStatus(reviewerAccountId:string,id:string,status:TripStatusValue){
    if(!TRIP_STATUSES.includes(status))throw new BadRequestException('Invalid trip status.');
    if(status==='COMPLETED')throw new BadRequestException('Use the governed trip completion workflow.');
    const trip=await this.db.trip.findUnique({where:{id}});if(!trip)throw new NotFoundException('Trip not found.');
    if(status==='OPEN'&&trip.startsAt<=new Date())throw new ConflictException('A trip that already started cannot be opened.');
    if(status==='OPEN'){const price=await this.tripPrice(id);if(!price.configured)throw new ConflictException('Trip price must be configured before opening the trip.');}
    if(status==='CLOSED')await this.clearance.assertValid(id);
    if(trip.status===status)return trip;
    const affectedBookings:AffectedBooking[]=status==='CANCELLED'?await this.db.booking.findMany({where:{tripId:id,status:{not:'CANCELLED'}},select:{id:true,accountId:true,seats:true,status:true}}):[];
    const updated=await this.db.serializable(async tx=>{
      const current=await tx.trip.findUnique({where:{id}});if(!current)throw new NotFoundException('Trip not found.');
      if(status==='CANCELLED'){
        await tx.$executeRaw`UPDATE "CalendarAllocation" a SET "status"='INACTIVE',"updatedAt"=NOW() FROM "CalendarEvent" e WHERE e."id"=a."eventId" AND e."referenceType"='TRIP' AND e."referenceId"=${id} AND a."status"='ACTIVE'`;
        await tx.$executeRaw`UPDATE "CalendarEvent" SET "status"='INACTIVE',"updatedAt"=NOW() WHERE "referenceType"='TRIP' AND "referenceId"=${id} AND "status"='ACTIVE'`;
        await tx.booking.updateMany({where:{tripId:id,status:{not:'CANCELLED'}},data:{status:'CANCELLED'}});
      }
      return tx.trip.update({where:{id},data:{status}});
    });
    if(status==='CANCELLED')await Promise.all(affectedBookings.map((booking:AffectedBooking)=>this.notifyQuietly(booking.accountId,'TRIP_CANCELLED',{tripId:id,bookingId:booking.id,seats:booking.seats,previousBookingStatus:booking.status,bookingStatus:'CANCELLED',startsAt:trip.startsAt,title:trip.title})));
    await this.audit.record({action:'TRIP_STATUS_CHANGED',resource:'Trip',resourceId:id,metadata:{reviewerAccountId,previousStatus:trip.status,status,releasedCalendarResources:status==='CANCELLED',cancelledBookings:status==='CANCELLED'?affectedBookings.length:0,notifiedBookings:status==='CANCELLED'?affectedBookings.length:0,financialActionExecuted:false}});
    return updated;
  }
}