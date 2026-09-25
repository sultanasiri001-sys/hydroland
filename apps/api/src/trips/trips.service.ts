import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TripStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { BookingParticipantService } from './booking-participant.service';
import { PolicyControlService } from './policy-control.service';
import { WeatherGateService, WeatherSnapshot } from './weather-gate.service';

type TripListRow={id:string;title:string;status:string;startsAt:Date;capacity:number;bookings:Array<{seats:number}>;safetyChecklists:Array<{id:string;decision:string;items:unknown;notes:string|null;decidedAt:Date|null;createdAt:Date}>;[key:string]:unknown};

@Injectable()
export class TripsService {
  constructor(private readonly db:DatabaseService,private readonly weatherGate:WeatherGateService,private readonly participants:BookingParticipantService,private readonly policies:PolicyControlService,private readonly audit:AuditService) {}
  private weatherFromItems(items:unknown):WeatherSnapshot|null{if(!items||Array.isArray(items)||typeof items!=='object')return null;const weather=(items as Record<string,unknown>).weather;if(!weather||Array.isArray(weather)||typeof weather!=='object')return null;return weather as WeatherSnapshot;}

  async list(){const gateSettings=await this.weatherGate.settings();const trips=(await this.db.trip.findMany({where:{status:TripStatus.OPEN},orderBy:{startsAt:'asc'},include:{bookings:{where:{status:{in:['PENDING','CONFIRMED']}},select:{seats:true}},safetyChecklists:{orderBy:{createdAt:'desc'},take:1,select:{id:true,decision:true,items:true,notes:true,decidedAt:true,createdAt:true}}}})) as TripListRow[];return trips.map((trip:TripListRow)=>{const bookedSeats=trip.bookings.reduce((sum:number,booking:{seats:number})=>sum+booking.seats,0),latestSafety=trip.safetyChecklists[0]??null,weatherSnapshot=latestSafety?this.weatherFromItems(latestSafety.items):null,weather=this.weatherGate.evaluate(weatherSnapshot,gateSettings),{bookings,safetyChecklists,...base}=trip;return {...base,bookedSeats,remainingSeats:Math.max(0,trip.capacity-bookedSeats),safety:latestSafety,weather:{snapshot:weatherSnapshot,gate:gateSettings,evaluation:weather}};});}

  async book(accountId:string,tripId:string,seats:number){
    if(!Number.isInteger(seats)||seats<1)throw new BadRequestException('Invalid seats.');
    const gateSettings=await this.weatherGate.settings();
    const [safetyPolicy,weatherPolicy,capacityPolicy]=await Promise.all([this.policies.decision('BOOKING','SAFETY_APPROVAL'),this.policies.decision('WEATHER','WEATHER_GATE'),this.policies.decision('BOOKING','CAPACITY_LIMIT')]);
    const reviewIssues:string[]=[];
    const result=await this.db.serializable(async tx=>{
      const trip=await tx.trip.findUnique({where:{id:tripId}});if(!trip||trip.status!==TripStatus.OPEN)throw new NotFoundException('Trip unavailable.');if(trip.startsAt<=new Date())throw new ConflictException('Trip already started.');
      const existing=await tx.booking.findUnique({where:{tripId_accountId:{tripId,accountId}}});
      if(existing&&existing.status!=='CANCELLED')throw new ConflictException('An active booking already exists for this trip.');
      const latestSafety=await tx.safetyChecklist.findFirst({where:{tripId},orderBy:{createdAt:'desc'},select:{decision:true,items:true}});
      if(!latestSafety||latestSafety.decision!=='ALLOWED'){if(safetyPolicy.enforce)throw new ConflictException('Trip requires safety approval before booking.');if(safetyPolicy.review)reviewIssues.push('SAFETY_APPROVAL');}
      const weatherSnapshot=latestSafety?this.weatherFromItems(latestSafety.items):null,weather=this.weatherGate.evaluate(weatherSnapshot,gateSettings);if(weather.blocking){if(weatherPolicy.enforce)throw new ConflictException(weather.reason||'Trip is unavailable because of weather conditions.');if(weatherPolicy.review)reviewIssues.push('WEATHER_GATE');}
      const used=await tx.booking.aggregate({where:{tripId,status:{in:['PENDING','CONFIRMED']}},_sum:{seats:true}});if((used._sum.seats??0)+seats>trip.capacity){if(capacityPolicy.enforce)throw new ConflictException('Trip capacity reached.');if(capacityPolicy.review)reviewIssues.push('CAPACITY_LIMIT');}
      let booking;
      if(existing){
        await tx.bookingParticipant.deleteMany({where:{bookingId:existing.id}});
        booking=await tx.booking.update({where:{id:existing.id},data:{seats,status:'PENDING'}});
      }else{
        booking=await tx.booking.create({data:{tripId,accountId,seats,status:'PENDING'}});
      }
      const participantRows=await this.participants.ensureForBooking(booking.id,accountId,seats,tx);
      return{booking,participantRows,rebooked:Boolean(existing)};
    });
    return {...result.booking,participants:result.participantRows,rebooked:result.rebooked,policyReview:{required:reviewIssues.length>0,issues:[...new Set(reviewIssues)],states:{safety:safetyPolicy.state,weather:weatherPolicy.state,capacity:capacityPolicy.state}}};
  }

  mine(accountId:string){return this.db.booking.findMany({where:{accountId},include:{trip:true},orderBy:{createdAt:'desc'}});}

  async cancelMine(accountId:string,bookingId:string){
    const booking=await this.db.booking.findFirst({where:{id:bookingId,accountId},include:{trip:true}});
    if(!booking)throw new NotFoundException('Booking not found.');
    if(booking.status==='CANCELLED')return booking;
    if(booking.trip.status!==TripStatus.OPEN)throw new ConflictException('Booking cannot be cancelled after trip closure.');
    if(booking.trip.startsAt<=new Date())throw new ConflictException('Booking cannot be cancelled after the trip starts.');
    const updated=await this.db.booking.update({where:{id:bookingId},data:{status:'CANCELLED'}});
    await this.audit.record({actorId:accountId,action:'BOOKING_SELF_CANCELLED',resource:'Booking',resourceId:bookingId,metadata:{accountId,tripId:booking.tripId,seats:booking.seats,previousStatus:booking.status}});
    return updated;
  }

  participantsForBooking(accountId:string,bookingId:string){return this.participants.listForOwner(accountId,bookingId);}
  updateParticipant(accountId:string,bookingId:string,participantId:string,input:{fullName?:string;certificationTitle?:string|null;certificationNumber?:string|null;certificationIssuer?:string|null}){return this.participants.updateForOwner(accountId,bookingId,participantId,input);}
}