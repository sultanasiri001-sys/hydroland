import { PrismaClient } from '@prisma/client';
const db=new PrismaClient();
const name='20261001003000_trip_center_scope';
try{
  const column=await db.$queryRawUnsafe(`SELECT 1 FROM information_schema.columns WHERE table_name='Trip' AND column_name='organizationId' LIMIT 1`);
  if(Array.isArray(column)&&column.length){console.log('Trip.organizationId already exists; center-scope recovery skipped.');process.exit(0)}
  const failed=await db.$queryRawUnsafe(`SELECT id FROM "_prisma_migrations" WHERE migration_name=$1 AND finished_at IS NULL AND rolled_back_at IS NULL ORDER BY started_at DESC LIMIT 1`,name);
  if(!Array.isArray(failed)||!failed.length){console.log('No failed center-scope migration requires recovery.');process.exit(0)}
  const id=failed[0].id;
  await db.$executeRawUnsafe(`UPDATE "_prisma_migrations" SET rolled_back_at=NOW() WHERE id=$1 AND finished_at IS NULL AND rolled_back_at IS NULL`,id);
  console.log('Marked failed center-scope migration attempt rolled back; prisma migrate deploy may retry corrected UUID migration.');
}finally{await db.$disconnect()}
