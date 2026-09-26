import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';

const prisma = new PrismaClient();
const MIGRATION = '20260925210500_trip_weather_runtime';
const RUNTIME_TABLES = ['TripOperationalLocation', 'TripWeatherReview'];

async function openFailure() {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT migration_name, finished_at, rolled_back_at, applied_steps_count
       FROM "_prisma_migrations"
      WHERE migration_name=$1
      ORDER BY started_at DESC
      LIMIT 1`,
    MIGRATION,
  );
  const migration = rows[0];
  if (!migration || migration.finished_at || migration.rolled_back_at) return null;
  return migration;
}

async function columnType(table, column) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT data_type
       FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
    table,
    column,
  );
  return rows[0]?.data_type ?? null;
}

async function tableExists(table) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT to_regclass($1) IS NOT NULL AS present`,
    `public.${table}`,
  );
  return rows[0]?.present === true;
}

async function requireUuidBaseSchema() {
  for (const [table, column] of [['Trip', 'id'], ['Account', 'id']]) {
    const type = await columnType(table, column);
    if (type !== 'uuid') {
      throw new Error(`Refusing trip-weather recovery: ${table}.${column} is ${type ?? 'missing'}, expected uuid`);
    }
  }
}

async function requireRuntimeTablesAbsent() {
  for (const table of RUNTIME_TABLES) {
    if (await tableExists(table)) {
      throw new Error(`Refusing trip-weather recovery: ${table} already exists after a failed migration`);
    }
  }
}

function markApplied() {
  execFileSync('npx', ['prisma', 'migrate', 'resolve', '--applied', MIGRATION], { stdio: 'inherit' });
}

async function installUuidRuntimeSchema() {
  const statements = [
    `CREATE TABLE "TripOperationalLocation" (
      "tripId" UUID PRIMARY KEY REFERENCES "Trip"("id") ON DELETE CASCADE,
      "locationName" TEXT NOT NULL,
      "latitude" DOUBLE PRECISION NOT NULL,
      "longitude" DOUBLE PRECISION NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "TripOperationalLocation_latitude_check" CHECK ("latitude" >= -90 AND "latitude" <= 90),
      CONSTRAINT "TripOperationalLocation_longitude_check" CHECK ("longitude" >= -180 AND "longitude" <= 180)
    )`,
    `CREATE TABLE "TripWeatherReview" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "tripId" UUID NOT NULL REFERENCES "Trip"("id") ON DELETE CASCADE,
      "provider" TEXT NOT NULL,
      "forecastAt" TIMESTAMPTZ NOT NULL,
      "fetchedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "snapshot" JSONB NOT NULL,
      "snapshotHash" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "notes" TEXT,
      "reviewedByAccountId" UUID REFERENCES "Account"("id") ON DELETE SET NULL,
      "reviewedAt" TIMESTAMPTZ,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "TripWeatherReview_status_check" CHECK ("status" IN ('PENDING','APPROVED','REJECTED'))
    )`,
    `CREATE INDEX "TripWeatherReview_trip_fetched_idx" ON "TripWeatherReview" ("tripId", "fetchedAt" DESC)`,
    `CREATE INDEX "TripWeatherReview_trip_status_idx" ON "TripWeatherReview" ("tripId", "status", "fetchedAt" DESC)`,
  ];
  await prisma.$transaction(statements.map((statement) => prisma.$executeRawUnsafe(statement)));
}

try {
  const failed = await openFailure();
  if (!failed) {
    console.log('[trip-weather-migration-recovery] no open trip-weather failure; no-op');
  } else {
    if (Number(failed.applied_steps_count) !== 0) {
      throw new Error(`Refusing trip-weather recovery: migration reports ${failed.applied_steps_count} applied step(s)`);
    }
    await requireUuidBaseSchema();
    await requireRuntimeTablesAbsent();
    await installUuidRuntimeSchema();
    markApplied();
    console.log('[trip-weather-migration-recovery] recovered failed trip-weather migration with UUID-compatible production schema');
  }
} finally {
  await prisma.$disconnect();
}
