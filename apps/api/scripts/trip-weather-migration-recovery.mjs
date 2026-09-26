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

function markRolledBack() {
  execFileSync('npx', ['prisma', 'migrate', 'resolve', '--rolled-back', MIGRATION], { stdio: 'inherit' });
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
    markRolledBack();
    console.log('[trip-weather-migration-recovery] failed zero-step migration marked rolled back; corrected UUID migration can be replayed');
  }
} finally {
  await prisma.$disconnect();
}
