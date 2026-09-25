import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { StormglassWeatherService } from './stormglass-weather.service';
import { WeatherSnapshot } from './weather-gate.service';

export type TripWeatherReviewStatus='PENDING'|'APPROVED'|'REJECTED';
export type TripLocation={tripId:string;locationName:string;latitude:number;longitude:number;createdAt:Date;updatedAt:Date};
export type TripWeatherReview={id:string;tripId:string;provider:string;forecastAt:Date;fetchedAt:Date;snapshot:WeatherSnapshot;snapshotHash:string;status:TripWeatherReviewStatus;notes:string|null;reviewedByAccountId:string|null;reviewedAt:Date|null;createdAt:Date;updatedAt:Date};

type LocationInput={locationName?:string;latitude?:number;longitude?:number};

@Injectable()
export class TripWeatherReviewService{
  constructor(private readonly db:DatabaseService,private readonly stormglass:StormglassWeatherService,private readonly audit:AuditService){}

  private validateLocation(input:LocationInput){
    const locationName=input.locationName?.trim(),latitude=Number(input.latitude),longitude=Number(input.longitude);
    if(!locationName)throw new BadRequestException('Trip location name is required.');
    if(!Number.isFinite(latitude)||latitude<-90||latitude>90||!Number.isFinite(longitude)||longitude<-180||longitude>180)throw new BadRequestException('Valid trip latitude and longitude are required.');
    return{locationName,latitude,longitude};
  }
  private hash(snapshot:WeatherSnapshot){return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');}
  private async requireTrip(tripId:string){const trip=await this.db.trip.findUnique({where:{id:tripId},select:{id:true,title:true,startsAt:true,status:true}});if(!trip)throw new NotFoundException('Trip not found.');return trip;}

  async location(tripId:string){const rows=await this.db.$queryRaw<TripLocation[]>`SELECT * FROM "TripOperationalLocation" WHERE "tripId"=${tripId}::uuid LIMIT 1`;return rows[0]??null;}

  async setLocation(actorAccountId:string,tripId:string,input:LocationInput){
    await this.requireTrip(tripId);const value=this.validateLocation(input);
    const rows=await this.db.$queryRaw<TripLocation[]>`INSERT INTO "TripOperationalLocation"("tripId","locationName","latitude","longitude","createdAt","updatedAt") VALUES(${tripId}::uuid,${value.locationName},${value.latitude},${value.longitude},NOW(),NOW()) ON CONFLICT("tripId") DO UPDATE SET "locationName"=EXCLUDED."locationName","latitude"=EXCLUDED."latitude","longitude"=EXCLUDED."longitude","updatedAt"=NOW() RETURNING *`;
    await this.db.$executeRaw`UPDATE "TripWeatherReview" SET "status"='PENDING',"reviewedByAccountId"=NULL,"reviewedAt"=NULL,"notes"='Trip location changed; weather review must be repeated.',"updatedAt"=NOW() WHERE "tripId"=${tripId}::uuid AND "status"='APPROVED'`;
    await this.audit.record({action:'TRIP_LOCATION_SET',resource:'Trip',resourceId:tripId,metadata:{actorAccountId,locationName:value.locationName,latitude:value.latitude,longitude:value.longitude}});
    return rows[0];
  }

  async latest(tripId:string){const rows=await this.db.$queryRaw<TripWeatherReview[]>`SELECT * FROM "TripWeatherReview" WHERE "tripId"=${tripId}::uuid ORDER BY "fetchedAt" DESC,"createdAt" DESC LIMIT 1`;return rows[0]??null;}

  async state(tripId:string){const trip=await this.requireTrip(tripId);const [location,review]=await Promise.all([this.location(tripId),this.latest(tripId)]);return{trip,location,review};}

  async refresh(actorAccountId:string,tripId:string){
    const trip=await this.requireTrip(tripId),location=await this.location(tripId);if(!location)throw new ConflictException('Trip location must be configured before weather can be refreshed.');
    const snapshot=await this.stormglass.snapshot(location.latitude,location.longitude,trip.startsAt),snapshotHash=this.hash(snapshot),forecastAt=new Date(snapshot.observedAt??trip.startsAt);
    const previous=await this.latest(tripId);let review:TripWeatherReview;
    if(previous&&previous.snapshotHash===snapshotHash){
      const rows=await this.db.$queryRaw<TripWeatherReview[]>`UPDATE "TripWeatherReview" SET "provider"=${snapshot.provider??'STORMGLASS'},"forecastAt"=${forecastAt},"fetchedAt"=NOW(),"snapshot"=${JSON.stringify(snapshot)}::jsonb,"updatedAt"=NOW() WHERE "id"=${previous.id}::uuid RETURNING *`;review=rows[0];
    }else{
      const rows=await this.db.$queryRaw<TripWeatherReview[]>`INSERT INTO "TripWeatherReview"("tripId","provider","forecastAt","fetchedAt","snapshot","snapshotHash","status","createdAt","updatedAt") VALUES(${tripId}::uuid,${snapshot.provider??'STORMGLASS'},${forecastAt},NOW(),${JSON.stringify(snapshot)}::jsonb,${snapshotHash},'PENDING',NOW(),NOW()) RETURNING *`;review=rows[0];
    }
    await this.audit.record({action:'TRIP_WEATHER_REFRESHED',resource:'TripWeatherReview',resourceId:review.id,metadata:{actorAccountId,tripId,provider:review.provider,forecastAt:review.forecastAt,status:review.status,snapshotChanged:!previous||previous.snapshotHash!==snapshotHash}});
    return{trip,location,review};
  }

  async decide(actorAccountId:string,tripId:string,input:{status?:TripWeatherReviewStatus;notes?:string|null}){
    const status=input.status;if(status!=='APPROVED'&&status!=='REJECTED')throw new BadRequestException('Weather review decision must be APPROVED or REJECTED.');
    await this.requireTrip(tripId);const current=await this.latest(tripId);if(!current)throw new ConflictException('Refresh the trip weather before recording a decision.');
    const notes=input.notes?.trim()||null;
    const rows=await this.db.$queryRaw<TripWeatherReview[]>`UPDATE "TripWeatherReview" SET "status"=${status},"notes"=${notes},"reviewedByAccountId"=${actorAccountId}::uuid,"reviewedAt"=NOW(),"updatedAt"=NOW() WHERE "id"=${current.id}::uuid RETURNING *`;
    const review=rows[0];await this.audit.record({action:`TRIP_WEATHER_${status}`,resource:'TripWeatherReview',resourceId:review.id,metadata:{actorAccountId,tripId,provider:review.provider,forecastAt:review.forecastAt,notes}});return{...(await this.state(tripId)),review};
  }
}
