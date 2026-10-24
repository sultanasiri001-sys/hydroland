// A repair helper may inspect existing history; it cannot bootstrap a new DB.
export async function requireExistingMigrationHistory(prisma) {
  const fail = state => {
    const error = new Error(`[migration-recovery:MIGRATION_HISTORY_REQUIRED] ${state}. No repair was attempted. Restore a verified archive, or use a separately reviewed fresh-install baseline; do not fabricate migration history.`);
    error.code = 'MIGRATION_HISTORY_REQUIRED';
    throw error;
  };
  const relation = await prisma.$queryRawUnsafe("SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS present");
  if (relation[0]?.present !== true) fail('Prisma history is absent');
  const records = await prisma.$queryRawUnsafe('SELECT EXISTS(SELECT 1 FROM public."_prisma_migrations") AS populated');
  if (records[0]?.populated !== true) fail('Prisma history is empty');
}
