import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { finiteNumericInput } from '../geo/coordinate-input';
import { StormglassWeatherService } from './stormglass-weather.service';
import { WeatherSnapshot } from './weather-gate.service';
import { canonicalWeatherJson, sameWeatherContext, validWeatherReview, weatherContext, WeatherReviewContext } from './weather-review-context';

export type TripWeatherReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type TripLocation = { tripId: string; locationName: string; latitude: number; longitude: number; createdAt: Date; updatedAt: Date; revision: string };
export type TripWeatherReview = { id: string; tripId: string; provider: string; forecastAt: Date; fetchedAt: Date; snapshot: WeatherSnapshot; snapshotHash: string; status: TripWeatherReviewStatus; notes: string | null; reviewedByAccountId: string | null; reviewedAt: Date | null; createdAt: Date; updatedAt: Date; revision: string };
export type TripWeatherReviewView = TripWeatherReview & { storedStatus: TripWeatherReviewStatus; context: WeatherReviewContext | null; requiresRefresh: boolean; decisionToken: string | null };
export type WeatherDecisionInput = { status?: TripWeatherReviewStatus; notes?: string | null; expectedReview?: string };
type LocationInput = { locationName?: string; latitude?: number; longitude?: number };

@Injectable()
export class TripWeatherReviewService {
  constructor(private readonly db: DatabaseService, private readonly stormglass: StormglassWeatherService, private readonly audit: AuditService) {}

  private validateLocation(input: LocationInput) {
    const locationName = input.locationName?.trim(), latitude = finiteNumericInput(input.latitude), longitude = finiteNumericInput(input.longitude);
    if (!locationName) throw new BadRequestException('Trip location name is required.');
    if (latitude === null || latitude < -90 || latitude > 90 || longitude === null || longitude < -180 || longitude > 180) throw new BadRequestException('Valid trip latitude and longitude are required.');
    return { locationName, latitude, longitude };
  }
  private hash(value: unknown) { return createHash('sha256').update(canonicalWeatherJson(value)).digest('hex'); }
  private async requireTrip(tripId: string, tx: Prisma.TransactionClient = this.db) {
    const trip = await tx.trip.findUnique({ where: { id: tripId }, select: { id: true, title: true, startsAt: true, endsAt: true, status: true } });
    if (!trip) throw new NotFoundException('Trip not found.');
    return trip;
  }
  private async lockTrip(tripId: string, tx: Prisma.TransactionClient) {
    await tx.$queryRaw`SELECT "id" FROM "Trip" WHERE "id"::text=${tripId} FOR UPDATE`;
  }
  async location(tripId: string, tx: Prisma.TransactionClient = this.db) {
    const rows = await tx.$queryRaw<TripLocation[]>`SELECT *,"updatedAt"::text AS "revision" FROM "TripOperationalLocation" WHERE "tripId"::text=${tripId} LIMIT 1`;
    return rows[0] ?? null;
  }
  private async currentContext(tripId: string, tx: Prisma.TransactionClient = this.db) {
    const trip = await this.requireTrip(tripId, tx), location = await this.location(tripId, tx);
    return { trip, location, context: weatherContext(trip, location) };
  }
  private async latestPersisted(tripId: string, tx: Prisma.TransactionClient = this.db) {
    const rows = await tx.$queryRaw<TripWeatherReview[]>`SELECT *,"updatedAt"::text AS "revision" FROM "TripWeatherReview" WHERE "tripId"::text=${tripId} ORDER BY "createdAt" DESC,"id" DESC LIMIT 1`;
    return rows[0] ?? null;
  }
  private view(review: TripWeatherReview | null, context: WeatherReviewContext | null): TripWeatherReviewView | null {
    if (!review) return null;
    const valid = Boolean(review.revision && validWeatherReview(review.snapshot, context, review.fetchedAt) && this.hash(review.snapshot) === review.snapshotHash && new Date(review.snapshot.observedAt!).getTime() === new Date(review.forecastAt).getTime());
    return { ...review, storedStatus: review.status, status: valid ? review.status : 'PENDING', context, requiresRefresh: !valid, decisionToken: valid ? this.hash([review.id, review.snapshotHash, review.status, review.revision, context]) : null };
  }
  async latest(tripId: string, tx: Prisma.TransactionClient = this.db) {
    const current = await this.currentContext(tripId, tx);
    return this.view(await this.latestPersisted(tripId, tx), current.context);
  }
  async state(tripId: string) {
    return this.db.serializable(async tx => {
      const current = await this.currentContext(tripId, tx);
      return { trip: current.trip, location: current.location, review: this.view(await this.latestPersisted(tripId, tx), current.context) };
    });
  }

  async setLocation(actorAccountId: string, tripId: string, input: LocationInput) {
    const value = this.validateLocation(input);
    return this.db.serializable(async tx => {
      await this.lockTrip(tripId, tx);
      await this.requireTrip(tripId, tx);
      const rows = await tx.$queryRaw<TripLocation[]>`INSERT INTO "TripOperationalLocation"("tripId","locationName","latitude","longitude","createdAt","updatedAt") SELECT t."id",${value.locationName},${value.latitude},${value.longitude},NOW(),clock_timestamp() FROM "Trip" t WHERE t."id"::text=${tripId} ON CONFLICT("tripId") DO UPDATE SET "locationName"=EXCLUDED."locationName","latitude"=EXCLUDED."latitude","longitude"=EXCLUDED."longitude","updatedAt"=GREATEST(clock_timestamp(),"TripOperationalLocation"."updatedAt"+interval '1 microsecond') RETURNING *,"updatedAt"::text AS "revision"`;
      await tx.$executeRaw`UPDATE "TripWeatherReview" SET "status"='PENDING',"reviewedByAccountId"=NULL,"reviewedAt"=NULL,"notes"='Trip location changed; refresh and review the current forecast.',"updatedAt"=GREATEST(clock_timestamp(),"updatedAt"+interval '1 microsecond') WHERE "tripId"::text=${tripId} AND "status"='APPROVED'`;
      await this.audit.record({ actorId: actorAccountId, action: 'TRIP_LOCATION_SET', resource: 'Trip', resourceId: tripId, metadata: { actorAccountId, ...value } }, tx);
      return rows[0];
    });
  }

  async refresh(actorAccountId: string, tripId: string) {
    const captured = await this.db.serializable(tx => this.currentContext(tripId, tx));
    if (!captured.context) throw new ConflictException('Trip location must be configured before weather can be refreshed.');
    const supplied = await this.stormglass.snapshot(captured.context.latitude, captured.context.longitude, captured.trip.startsAt);
    const snapshot: WeatherSnapshot = { ...supplied, forecastContext: captured.context }, fetchedAt = new Date();
    if (!validWeatherReview(snapshot, captured.context, fetchedAt)) throw new ServiceUnavailableException('A valid marine forecast for the trip time is required.');
    const snapshotHash = this.hash(snapshot), forecastAt = new Date(snapshot.observedAt!);
    return this.db.serializable(async tx => {
      await this.lockTrip(tripId, tx);
      const current = await this.currentContext(tripId, tx);
      if (!sameWeatherContext(captured.context, current.context)) throw new ConflictException('Trip location or time changed during weather refresh; refresh the current trip again.');
      const previous = await this.latestPersisted(tripId, tx), previousView = this.view(previous, current.context);
      let review: TripWeatherReview;
      if (previous && previous.snapshotHash === snapshotHash && !previousView?.requiresRefresh) {
        const rows = await tx.$queryRaw<TripWeatherReview[]>`UPDATE "TripWeatherReview" SET "provider"=${snapshot.provider ?? 'STORMGLASS'},"forecastAt"=${forecastAt},"fetchedAt"=${fetchedAt},"snapshot"=${JSON.stringify(snapshot)}::jsonb,"updatedAt"=GREATEST(clock_timestamp(),"updatedAt"+interval '1 microsecond') WHERE "id"::text=${previous.id} RETURNING *,"updatedAt"::text AS "revision"`;
        review = rows[0];
      } else {
        const rows = await tx.$queryRaw<TripWeatherReview[]>`INSERT INTO "TripWeatherReview"("tripId","provider","forecastAt","fetchedAt","snapshot","snapshotHash","status","createdAt","updatedAt") SELECT t."id",${snapshot.provider ?? 'STORMGLASS'},${forecastAt},${fetchedAt},${JSON.stringify(snapshot)}::jsonb,${snapshotHash},'PENDING',clock_timestamp(),clock_timestamp() FROM "Trip" t WHERE t."id"::text=${tripId} RETURNING *,"updatedAt"::text AS "revision"`;
        review = rows[0];
      }
      await this.audit.record({ actorId: actorAccountId, action: 'TRIP_WEATHER_REFRESHED', resource: 'TripWeatherReview', resourceId: review.id, metadata: { actorAccountId, tripId, provider: review.provider, forecastAt: review.forecastAt, status: review.status, snapshotChanged: !previous || previous.snapshotHash !== snapshotHash } }, tx);
      return { trip: current.trip, location: current.location, review: this.view(review, current.context) };
    });
  }

  async decide(actorAccountId: string, tripId: string, input: WeatherDecisionInput) {
    const status = input.status;
    if (status !== 'APPROVED' && status !== 'REJECTED') throw new BadRequestException('Weather review decision must be APPROVED or REJECTED.');
    if (input.notes != null && typeof input.notes !== 'string') throw new BadRequestException('Weather review notes must be text.');
    if (typeof input.expectedReview !== 'string' || !/^[a-f0-9]{64}$/.test(input.expectedReview)) throw new ConflictException('Reload the current weather review before recording a decision.');
    const notes = input.notes?.trim() || null;
    return this.db.serializable(async tx => {
      await this.lockTrip(tripId, tx);
      if (!await tx.roleAssignment.findFirst({ where: { accountId: actorAccountId, role: 'ADMIN', status: 'ACTIVE', account: { status: 'ACTIVE' } }, select: { id: true } })) throw new ForbiddenException('Active weather review authority required.');
      const current = await this.currentContext(tripId, tx), persisted = await this.latestPersisted(tripId, tx), preview = this.view(persisted, current.context);
      if (!persisted || !preview || preview.requiresRefresh || preview.decisionToken !== input.expectedReview) throw new ConflictException('Weather review or trip context changed; refresh and review the current forecast.');
      const rows = await tx.$queryRaw<TripWeatherReview[]>`UPDATE "TripWeatherReview" SET "status"=${status},"notes"=${notes},"reviewedByAccountId"=(SELECT a."id" FROM "Account" a WHERE a."id"::text=${actorAccountId} LIMIT 1),"reviewedAt"=clock_timestamp(),"updatedAt"=GREATEST(clock_timestamp(),"updatedAt"+interval '1 microsecond') WHERE "id"::text=${persisted.id} AND "snapshotHash"=${persisted.snapshotHash} AND "updatedAt"=${persisted.revision}::timestamptz RETURNING *,"updatedAt"::text AS "revision"`;
      const review = rows[0];
      if (!review) throw new ConflictException('Weather review changed; reload before recording a decision.');
      await this.audit.record({ actorId: actorAccountId, action: `TRIP_WEATHER_${status}`, resource: 'TripWeatherReview', resourceId: review.id, metadata: { actorAccountId, tripId, provider: review.provider, forecastAt: review.forecastAt, snapshotHash: review.snapshotHash, previousStatus: persisted.status, notes } }, tx);
      return { trip: current.trip, location: current.location, review: this.view(review, current.context) };
    });
  }
}
