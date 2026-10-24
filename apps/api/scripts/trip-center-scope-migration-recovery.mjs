import { PrismaClient } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
const db=new PrismaClient(),name='20261001003000_trip_center_scope';
try{
  const column=await db.$queryRawUnsafe(`SELECT 1 FROM information_schema.columns WHERE table_name='Trip' AND column_name='organizationId' LIMIT 1`);
  if(Array.isArray(column)&&column.length){console.log('Trip.organizationId exists; center-scope baseline recovery skipped.');process.exit(0)}
  const pending=await db.$queryRawUnsafe(`SELECT id FROM "_prisma_migrations" WHERE migration_name=$1 AND finished_at IS NULL AND rolled_back_at IS NULL ORDER BY started_at DESC`,name);
  for(const row of Array.isArray(pending)?pending:[])await db.$executeRawUnsafe(`UPDATE "_prisma_migrations" SET rolled_back_at=NOW() WHERE id=$1 AND finished_at IS NULL AND rolled_back_at IS NULL`,row.id);
  const applied=await db.$queryRawUnsafe(`SELECT 1 FROM "_prisma_migrations" WHERE migration_name=$1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL LIMIT 1`,name);
  if(!Array.isArray(applied)||!applied.length){
    const sql=fs.readFileSync(new URL('../prisma/migrations/20261001003000_trip_center_scope/migration.sql',import.meta.url),'utf8');
    const checksum=createHash('sha256').update(sql).digest('hex');
    await db.$executeRawUnsafe(`INSERT INTO "_prisma_migrations" (id,checksum,finished_at,migration_name,logs,rolled_back_at,started_at,applied_steps_count) VALUES ($1,$2,NOW(),$3,$4,NULL,NOW(),1)`,randomUUID(),checksum,name,'HYDROLAND recovery: historical TEXT migration was never applied; baselined as no-op so forward UUID correction can run.');
    console.log('Baselined unapplied historical center-scope migration as no-op; forward UUID migration may now run.');
  }
}finally{await db.$disconnect()}
