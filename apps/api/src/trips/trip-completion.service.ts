import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { OperationalClearanceService } from './operational-clearance.service';

type CompleteTripInput = { siteName?:string;regionCode?:string;maxDepthM?:number;durationMin?:number;instructorName?:string;notes?:string };
type ParticipantDiveRow = { participantId:string; bookingId:string; accountId:string|null; fullName:string; eligibilityStatus:string };

@Injectable()
export class TripCompletionService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly clearance:OperationalClearanceService) {}

  async complete(reviewerAccountId:string,tripId:string,input:CompleteTripInput){
    const siteName=input.siteName?.trim();
    if(!siteName)throw new BadRequestException('Dive site is required.');
    if(!Number.isFinite(input.maxDepthM)||Number(input.maxDepthM)<=0||Number(input.maxDepthM)>150)throw new BadRequestException('Invalid max depth.');
    if(!Number.isInteger(input.durationMin)||Number(input.durationMin)<1||Number(input.durationMin)>600)throw new BadRequestException('Invalid duration.');

    const operational=await this.clearance.assertValid(tripId);
    const result=await this.db.$transaction(async(tx:Prisma.TransactionClient)=>{
      const trip=await tx.trip.findUnique({where:{id:tripId}});if(!trip)throw new NotFoundException('Trip not found.');
      if(trip.status==='CANCELLED')throw new ConflictException('Cancelled trip cannot be completed.');
      if(trip.status==='COMPLETED'){
        const existing=await tx.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*)::bigint AS "count" FROM "DiveLog" WHERE "sourceTripId"=${tripId}`;
        const participants=await tx.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*)::bigint AS "count" FROM "BookingParticipant" bp JOIN "Booking" b ON b."id"=bp."bookingId" WHERE b."tripId"=${tripId} AND b."status"='CONFIRMED'`;
        const totalParticipants=Number(participants[0]?.count??0n),existingDiveLogs=Number(existing[0]?.count??0n);
        return{trip,createdDiveLogs:0,existingDiveLogs,confirmedParticipants:totalParticipants,confirmedSeats:totalParticipants,alreadyCompleted:true};
      }
      if(trip.startsAt>new Date())throw new ConflictException('Trip has not started yet.');
      const latestSafety=await tx.safetyChecklist.findFirst({where:{tripId},orderBy:{createdAt:'desc'},select:{decision:true}});if(latestSafety?.decision!=='ALLOWED')throw new ConflictException('Trip requires an ALLOWED safety decision before completion.');

      const bookings=await tx.booking.findMany({where:{tripId,status:'CONFIRMED'},select:{id:true,seats:true}});if(!bookings.length)throw new ConflictException('Trip has no confirmed participants.');
      const confirmedSeats=bookings.reduce((sum:number,booking:{seats:number})=>sum+booking.seats,0);if(confirmedSeats>trip.capacity)throw new ConflictException('Confirmed participants exceed trip capacity.');

      const participants=await tx.$queryRaw<ParticipantDiveRow[]>`
        SELECT bp."id" AS "participantId",bp."bookingId",bp."accountId",bp."fullName",bp."eligibilityStatus"
        FROM "BookingParticipant" bp
        JOIN "Booking" b ON b."id"=bp."bookingId"
        WHERE b."tripId"=${tripId} AND b."status"='CONFIRMED'
        ORDER BY b."createdAt",bp."createdAt"
      `;
      if(participants.length!==confirmedSeats)throw new ConflictException('Confirmed seat count does not match participant records.');
      const ineligible=participants.filter((participant:ParticipantDiveRow)=>participant.eligibilityStatus!=='ELIGIBLE');
      if(ineligible.length)throw new ConflictException(`${ineligible.length} participant(s) are not eligible for trip completion.`);

      let createdDiveLogs=0;const marker=`HYDROLAND_TRIP:${tripId}`;
      for(const participant of participants){
        const id=randomUUID();
        const participantMarker=`HYDROLAND_PARTICIPANT:${participant.participantId}`;
        const noteText=[marker,participantMarker,participant.fullName,input.notes?.trim()].filter(Boolean).join(' | ');
        const inserted=await tx.$executeRawUnsafe(
          `INSERT INTO "DiveLog" ("id","accountId","siteName","regionCode","diveDate","maxDepthM","durationMin","instructorName","notes","status","createdAt","updatedAt","sourceTripId","sourceParticipantId")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'DRAFT',NOW(),NOW(),$10,$11)
           ON CONFLICT ("sourceTripId","sourceParticipantId") WHERE "sourceParticipantId" IS NOT NULL DO NOTHING`,
          id,participant.accountId,siteName,input.regionCode?.trim()||null,trip.startsAt,Number(input.maxDepthM),Number(input.durationMin),input.instructorName?.trim()||null,noteText,tripId,participant.participantId,
        );
        createdDiveLogs+=inserted;
      }
      const completedTrip=await tx.trip.update({where:{id:tripId},data:{status:'COMPLETED'}});
      return{trip:completedTrip,createdDiveLogs,existingDiveLogs:participants.length-createdDiveLogs,confirmedParticipants:participants.length,confirmedSeats,alreadyCompleted:false};
    });
    await this.audit.record({action:'TRIP_COMPLETED',resource:'Trip',resourceId:tripId,metadata:{reviewerAccountId,operationalClearanceEventId:operational.clearance.id,readiness:operational.readiness,confirmedParticipants:result.confirmedParticipants,confirmedSeats:result.confirmedSeats,createdDiveLogs:result.createdDiveLogs,existingDiveLogs:result.existingDiveLogs}});
    return {...result,readiness:operational.readiness,operationalClearanceEventId:operational.clearance.id};
  }
}
