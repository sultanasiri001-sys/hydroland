import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { BookingParticipantService } from './booking-participant.service';
import { CrewAssignmentService } from './crew-assignment.service';
import { OperationalClearanceService } from './operational-clearance.service';

export type TripStatusValue = 'DRAFT' | 'OPEN' | 'CLOSED' | 'CANCELLED' | 'COMPLETED';
const TRIP_STATUSES: TripStatusValue[] = ['DRAFT', 'OPEN', 'CLOSED', 'CANCELLED', 'COMPLETED'];
type CreateTripInput = { title?: string; type?: string; startsAt?: string; endsAt?: string; capacity?: number; status?: TripStatusValue };
type AdminTripRow = { id:string; title:string; type:string; startsAt:Date; endsAt:Date; capacity:number; status:TripStatusValue; createdAt:Date; updatedAt:Date };
type AdminBookingRow = { id:string; tripId:string; accountId:string; status:string; seats:number; createdAt:Date; updatedAt:Date; account:unknown };

@Injectable()
export class TripAdminService {
  constructor(
    private readonly db:DatabaseService,
    private readonly audit:AuditService,
    private readonly crewAssignments:CrewAssignmentService,
    private readonly clearance:OperationalClearanceService,
    private readonly participants:BookingParticipantService,
  ) {}

  async list(){const trips=(await this.db.trip.findMany({orderBy:{startsAt:'desc'}})) as AdminTripRow[];return Promise.all(trips.map(async (trip:AdminTripRow)=>({...trip,operationalClearance:await this.clearance.status(trip.id)})));}
  operationalClearance(reviewerAccountId:string,tripId:string,reason?:string){return this.clearance.grant(reviewerAccountId,tripId,reason);}

  async bookings(tripId:string){const trip=await this.db.trip.findUnique({where:{id:tripId},select:{id:true}});if(!trip)throw new NotFoundException('Trip not found.');const bookings=(await this.db.booking.findMany({where:{tripId},orderBy:{createdAt:'asc'},include:{account:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}}}})) as AdminBookingRow[];return Promise.all(bookings.map(async (booking:AdminBookingRow)=>({...booking,participants:await this.db.$queryRaw`SELECT * FROM "BookingParticipant" WHERE "bookingId"=${booking.id} ORDER BY "createdAt" ASC`})));}

  async confirmBooking(reviewerAccountId:string,tripId:string,bookingId:string){
    const initial=await this.db.booking.findUnique({where:{id:bookingId},select:{tripId:true,seats:true,status:true}});if(!initial||initial.tripId!==tripId)throw new NotFoundException('Booking not found for this trip.');if(initial.status!=='CONFIRMED')await this.participants.assertConfirmable(bookingId,initial.seats);
    let newlyConfirmed=false;
    const updated=await this.db.$transaction(async(tx:Prisma.TransactionClient)=>{const booking=await tx.booking.findUnique({where:{id:bookingId},include:{trip:true}});if(!booking||booking.tripId!==tripId)throw new NotFoundException('Booking not found for this trip.');if(booking.status==='CONFIRMED')return booking;if(booking.status!=='PENDING')throw new ConflictException('Only pending bookings can be confirmed.');if(booking.trip.status!=='OPEN'&&booking.trip.status!=='CLOSED')throw new ConflictException('Trip is not available for booking confirmation.');if(booking.trip.startsAt<=new Date())throw new ConflictException('Trip already started.');const latestSafety=await tx.safetyChecklist.findFirst({where:{tripId},orderBy:{createdAt:'desc'},select:{decision:true}});if(latestSafety?.decision!=='ALLOWED')throw new ConflictException('Trip requires an ALLOWED safety decision before confirmation.');const confirmed=await tx.booking.aggregate({where:{tripId,status:'CONFIRMED'},_sum:{seats:true}}),usedSeats=confirmed._sum.seats??0;if(usedSeats+booking.seats>booking.trip.capacity)throw new ConflictException('Trip capacity reached.');newlyConfirmed=true;return tx.booking.update({where:{id:bookingId},data:{status:'CONFIRMED'}});});
    const crewNotification=newlyConfirmed?await this.crewAssignments.dispatchForConfirmedBooking(tripId,bookingId):{tripId,bookingId,notifiedCrew:0};await this.audit.record({action:'BOOKING_CONFIRMED',resource:'Booking',resourceId:bookingId,metadata:{reviewerAccountId,tripId,accountId:updated.accountId,seats:updated.seats,notifiedCrew:crewNotification.notifiedCrew,newlyConfirmed}});return {...updated,crewNotification};
  }

  setParticipantEligibility(bookingId:string,participantId:string,status:'ELIGIBLE'|'REJECTED'){return this.participants.setEligibility(bookingId,participantId,status);}

  async cancelBooking(reviewerAccountId:string,tripId:string,bookingId:string){const booking=await this.db.booking.findUnique({where:{id:bookingId},include:{trip:true}});if(!booking||booking.tripId!==tripId)throw new NotFoundException('Booking not found for this trip.');if(booking.status==='CANCELLED')return booking;if(booking.trip.status==='COMPLETED'||booking.trip.status==='CANCELLED')throw new ConflictException('Booking cannot be cancelled after trip closure.');if(booking.trip.startsAt<=new Date())throw new ConflictException('Booking cannot be cancelled after the trip starts.');const updated=await this.db.booking.update({where:{id:bookingId},data:{status:'CANCELLED'}});await this.audit.record({action:'BOOKING_CANCELLED',resource:'Booking',resourceId:bookingId,metadata:{reviewerAccountId,tripId,accountId:booking.accountId,seats:booking.seats,previousStatus:booking.status}});return updated;}

  create(input:CreateTripInput){if(!input.title?.trim()||!input.type?.trim()||!input.startsAt||!input.endsAt)throw new BadRequestException('Trip title, type, startsAt and endsAt are required.');if(!Number.isInteger(input.capacity)||Number(input.capacity)<1)throw new BadRequestException('Trip capacity must be a positive integer.');if(input.status&&!TRIP_STATUSES.includes(input.status))throw new BadRequestException('Invalid trip status.');if(input.status==='COMPLETED')throw new BadRequestException('Use the governed trip completion workflow.');const startsAt=new Date(input.startsAt),endsAt=new Date(input.endsAt);if(Number.isNaN(startsAt.getTime())||Number.isNaN(endsAt.getTime())||endsAt<=startsAt)throw new BadRequestException('Trip date range is invalid.');return this.db.trip.create({data:{title:input.title.trim(),type:input.type.trim(),startsAt,endsAt,capacity:Number(input.capacity),status:input.status??'DRAFT'}});}

  async setStatus(id:string,status:TripStatusValue){if(!TRIP_STATUSES.includes(status))throw new BadRequestException('Invalid trip status.');if(status==='COMPLETED')throw new BadRequestException('Use the governed trip completion workflow.');const trip=await this.db.trip.findUnique({where:{id}});if(!trip)throw new NotFoundException('Trip not found.');if(status==='OPEN'&&trip.startsAt<=new Date())throw new ConflictException('A trip that already started cannot be opened.');return this.db.trip.update({where:{id},data:{status}});}
}
