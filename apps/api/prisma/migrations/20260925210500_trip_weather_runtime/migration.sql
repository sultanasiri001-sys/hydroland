CREATE TABLE "TripOperationalLocation" (
  "tripId" TEXT PRIMARY KEY REFERENCES "Trip"("id") ON DELETE CASCADE,
  "locationName" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "TripOperationalLocation_latitude_check" CHECK ("latitude" >= -90 AND "latitude" <= 90),
  CONSTRAINT "TripOperationalLocation_longitude_check" CHECK ("longitude" >= -180 AND "longitude" <= 180)
);

CREATE TABLE "TripWeatherReview" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tripId" TEXT NOT NULL REFERENCES "Trip"("id") ON DELETE CASCADE,
  "provider" TEXT NOT NULL,
  "forecastAt" TIMESTAMPTZ NOT NULL,
  "fetchedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "snapshot" JSONB NOT NULL,
  "snapshotHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "reviewedByAccountId" TEXT REFERENCES "Account"("id") ON DELETE SET NULL,
  "reviewedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "TripWeatherReview_status_check" CHECK ("status" IN ('PENDING','APPROVED','REJECTED'))
);

CREATE INDEX "TripWeatherReview_trip_fetched_idx" ON "TripWeatherReview" ("tripId", "fetchedAt" DESC);
CREATE INDEX "TripWeatherReview_trip_status_idx" ON "TripWeatherReview" ("tripId", "status", "fetchedAt" DESC);
