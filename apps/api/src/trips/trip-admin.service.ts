import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BookingParticipantService } from './booking-participant.service';
import { CrewAssignmentService } from './crew-assignment.service';
import { OperationalClearanceService } from './operational-clearance.service';
import { PolicyControlService } from './policy-control.service';

export type TripStatusValue='DRAFT'|'OPEN'|'CLOSED'|'CANCELLED'|'COMPLETED';
const TRIP_STATUSES:TripStatusValue[]=['DRAFT','OPEN','CLOSED','CANCELLED','COMPLETED'];
type CreateTripInput={title?:string;type?:string;startsAt?:string;endsAt?:string;capacity?:number;status?:TripStatusValue};
type AdminTripRow={id:string;title:string;type:string;startsAt:Date;endsAt:Date;capacity:number;status:TripStatusValue;createdAt:Date;updatedAt:Date};
type AdminBookingRow={id:string;tripId:string;accountId:string;status:string;seats:number;createdAt:Date;updatedAt:Date;account:unknown};
type AffectedBooking={id:string;accountId:string;seats:number;status:string};

@Injectable()
export class TripAdminService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly crewAssignments:CrewAssignmentService,private readonly clearance:OperationalClearanceService,private readonly participants:BookingParticipantService,private readonly policies:PolicyControlService,private readonly notifications:NotificationsService) {}

  private async notifyQuietly(accountId:string,type:string,payload:Record<string,unknown>){try{await this.notifications.notify(accountId,type,payload);}catch{return;}}

  async list(){const trips=(await this.db.trip.findMany({orderBy:{startsAt:'desc'}})) as AdminTripRow[];return Promise.all(trips.map(async(trip:AdminTripRow)=>({...trip,operationalClearance:await this.clearance.status(trip.id)})));}
  operationalClearance(reviewerAccountId:string,tripId:string,reason?:string){return this.clearance.grant(reviewerAccountId,tripId,reason);}

  async bookings(tripId:string){const trip=await this.db.trip.findUnique({where:{id:tripId},select:{id:true}});if(!trip)throw new NotFoundException('Trip not found.');const bookings=(await this.db.booking.findMany({where:{tripId},orderBy:{createdAt:'asc'},include:{account:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}},participants:true}})) as Array<AdminBookingRow&{participants:unknown[]}>;return bookings;}

  async confirmBooking(reviewerAccountId:string,tripId:string,bookingId:string){
    const initial=await this.db.booking.findUnique({where:{id:bookingId},select:{tripId:true,seats:true,status:true}});if(!initial||initial.tripId!==tripId)throw new NotFoundException('Booking not found for this trip.');
    const participantPolicy=initial.status==='CONFIRMED'?{policyState:'ENABLED',reviewRequired:false,bypassed:false,issues:[],incompleteParticipants:0}:await this.participants.assertConfirmable(bookingId,initial.seats);
    const [safetyPolicy,capacityPolicy]=await Promise.all([this.policies.decision('BOOKING','SAFETY_APPROVAL'),this.policies.decision('BOOKING','CAPACITY_LIMIT')]);
    const reviewIssues=[...participantPolicy.issues];let newlyConfirmed=false;
    const updated=await this.db.serializable(async tx=>{
      const booking=await tx.booking.findUnique({where:{id:bookingId},include:{trip:true}});if(!booking||booking.tripId!==tripId)throw new NotFoundException('Booking not found for this trip.');if(booking.status==='CONFIRMED')return booking;if(booking.status!=='PENDING')throw new ConflictException('Only pending bookings can be confirmed.');if(booking.trip.status!=='OPEN'&&booking.trip.status!=='CLOSED')throw new ConflictException('Trip is not available for booking confirmation.');if(booking.trip.startsAt<=new Date())throw new ConflictException('Trip already started.');
      const latestSafety=await tx.safetyChecklist.findFirst({where:{tripId},orderBy:{createdAt:'desc'},select:{decision:true}});if(latestSafety?.decision!=='ALLOWED'){if(safetyPolicy.enforce)throw new ConflictException('Trip requires an ALLOWED safety decision before confirmation.');if(safetyPolicy.review)reviewIssues.push('SAFETY_APPROVAL');}
      const confirmed=await tx.booking.aggregate({where:{tripId,status:'CONFIRMED'},_sum:{seats:true}}),usedSeats=confirmed._sum.seats??0;if(usedSeats+booking.seats>booking.trip.capacity){if(capacityPolicy.enforce)throw new ConflictException('Trip capacity reached.');if(capacityPolicy.review)reviewIssues.push('CAPACITY_LIMIT');}
      newlyConfirmed=true;return tx.booking.update({where:{id:bookingId},data:{status:'CONFIRMED'}});
    });
    const crewNotification=newlyConfirmed?await this.crewAssignments.dispatchForConfirmedBooking(tripId,bookingId):{tripId,bookingId,notifiedCrew:0};
    const policyReview={required:reviewIssues.length>0,issues:[...new Set(reviewIssues)],states:{participant:participantPolicy.policyState,safety:safetyPolicy.state,capacity:capacityPolicy.state}};
    await this.audit.record({action:'BOOKING_CONFIRMED',resource:'Booking',resourceId:bookingId,metadata:{reviewerAccountId,tripId,accountId:updated.accountId,seats:updated.seats,notifiedCrew:crewNotification.notifiedCrew,newlyConfirmed,policyReview}});
    if(newlyConfirmed)await this.notifyQuietly(updated.accountId,'BOOKING_CONFIRMED',{bookingId,tripId,seats:updated.seats});
    return {...updated,crewNotification,policyReview};
  }

  async setParticipantEligibility(reviewerAccountId:string,tripId:string,bookingId:string,participantId:string,status:'ELIGIBLE'|'REJECTED'){
    const booking=await this.db.booking.findUnique({where:{id:bookingId},select:{tripId:true,status:true,accountId:true}});
    if(!booking||booking.tripId!==tripId)throw new NotFoundException('Booking not found for this trip.');
    if(booking.status==='CANCELLED')throw new ConflictException('Cancelled booking cannot be reviewed.');
    const existing=await this.db.$queryRaw<Array<{id:string;bookingId:string;accountId:string|null;eligibilityStatus:string}>>`SELECT "id","bookingId","accountId","eligibilityStatus" FROM "BookingParticipant" WHERE "id"=${participantId} AND "bookingId"=${bookingId} LIMIT 1`;
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
    if(input.status&&!TRIP_STATUSES.includes(input.status))throw new BadRequestException('Invalid trip status.');
    if(input.status==='COMPLETED')throw new BadRequestException('Use the governed trip completion workflow.');
    const startsAt=new Date(input.startsAt),endsAt=new Date(input.endsAt);if(Number.isNaN(startsAt.getTime())||Number.isNaN(endsAt.getTime())||endsAt<=startsAt)throw new BadRequestException('Trip date range is invalid.');
    const trip=await this.db.trip.create({data:{title:input.title.trim(),type:input.type.trim(),startsAt,endsAt,capacity:Number(input.capacity),status:input.status??'DRAFT'}});
    await this.audit.record({action:'TRIP_CREATED',resource:'Trip',resourceId:trip.id,metadata:{reviewerAccountId,title:trip.title,type:trip.type,startsAt:trip.startsAt,endsAt:trip.endsAt,capacity:trip.capacity,status:trip.status}});
    return trip;
  }

  async setStatus(reviewerAccountId:string,id:string,status:TripStatusValue){
    if(!TRIP_STATUSES.includes(status))throw new BadRequestException('Invalid trip status.');
    if(status==='COMPLETED')throw new BadRequestException('Use the governed trip completion workflow.');
    const trip=await this.db.trip.findUnique({where:{id}});if(!trip)throw new NotFoundException('Trip not found.');
    if(status==='OPEN'&&trip.startsAt<=new Date())throw new ConflictException('A trip that already started cannot be opened.');
    if(status==='CLOSED')await this.clearance.assertValid(id);
    if(trip.status===status)return trip;
    const affectedBookings:AffectedBooking[]=status==='CANCELLED'?await this.db.booking.findMany({where:{tripId:id,status:{not:'CANCELLED'}},select:{id:true,accountId:true,seats:true,status:true}}):[];
    const updated=await this.db.serializable(async tx=>{
      const current=await tx.trip.findUnique({where:{id}});if(!current)throw new NotFoundException('Trip not found.');
      if(status==='CANCELLED'){
        await tx.$executeRaw`UPDATE "CalendarAllocation" SET "status"='INACTIVE',"updatedAt"=NOW() WHERE "tripId"=${id} AND "status"='ACTIVE'`;
        await tx.booking.updateMany({where:{tripId:id,status:{not:'CANCELLED'}},data:{status:'CANCELLED'}});
      }
      return tx.trip.update({where:{id},data:{status}});
    });
    if(status==='CANCELLED')await Promise.all(affectedBookings.map((booking:AffectedBooking)=>this.notifyQuietly(booking.accountId,'TRIP_CANCELLED',{tripId:id,bookingId:booking.id,seats:booking.seats,previousBookingStatus:booking.status,bookingStatus:'CANCELLED',startsAt:trip.startsAt,title:trip.title})));
    await this.audit.record({action:'TRIP_STATUS_CHANGED',resource:'Trip',resourceId:id,metadata:{reviewerAccountId,previousStatus:trip.status,status,releasedCalendarResources:status==='CANCELLED',cancelledBookings:status==='CANCELLED'?affectedBookings.length:0,notifiedBookings:status==='CANCELLED'?affectedBookings.length:0,financialActionExecuted:false}});
    return updated;
  }
}
