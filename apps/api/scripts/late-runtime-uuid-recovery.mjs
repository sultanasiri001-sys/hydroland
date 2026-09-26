import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';

const prisma=new PrismaClient();
const SAFETY_MIGRATION='20260925221500_safety_incident_runtime';
const MESSAGING_MIGRATION='20260925224500_messaging_runtime';

const migrationState=async name=>{
  const rows=await prisma.$queryRawUnsafe(`SELECT migration_name,finished_at,rolled_back_at,applied_steps_count FROM "_prisma_migrations" WHERE migration_name=$1 ORDER BY started_at DESC LIMIT 1`,name);
  return rows[0]??null;
};
const tableExists=async table=>{
  const rows=await prisma.$queryRawUnsafe(`SELECT to_regclass($1) IS NOT NULL AS present`,`public.${table}`);
  return rows[0]?.present===true;
};
const tableCount=async table=>Number((await prisma.$queryRawUnsafe(`SELECT COUNT(*)::bigint AS count FROM "${table}"`))[0]?.count??0n);
const columnType=async(table,column)=>{
  const rows=await prisma.$queryRawUnsafe(`SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,table,column);
  return rows[0]?.data_type??null;
};
const assertUuidBase=async()=>{
  for(const [table,column] of [['Trip','id'],['Account','id']]){
    const type=await columnType(table,column);
    if(type!=='uuid')throw new Error(`Refusing late-runtime recovery: ${table}.${column} is ${type??'missing'}, expected uuid`);
  }
};
const assertEmptyIfPresent=async table=>{
  if(!await tableExists(table))return;
  const count=await tableCount(table);
  if(count!==0)throw new Error(`Refusing late-runtime recovery: ${table} contains ${count} row(s)`);
};
const markApplied=name=>execFileSync('npx',['prisma','migrate','resolve','--applied',name],{stdio:'inherit'});
const alreadyApplied=state=>Boolean(state?.finished_at)&&!state?.rolled_back_at;

async function recoverSafety(){
  const state=await migrationState(SAFETY_MIGRATION);
  if(alreadyApplied(state)){console.log('[late-runtime-recovery] safety incident migration already applied; no-op');return;}
  await assertEmptyIfPresent('SafetyIncident');
  await prisma.$transaction([
    prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "SafetyIncident"`),
    prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "SafetyIncidentStatus"`),
    prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "SafetyIncidentSeverity"`),
    prisma.$executeRawUnsafe(`CREATE TYPE "SafetyIncidentSeverity" AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL')`),
    prisma.$executeRawUnsafe(`CREATE TYPE "SafetyIncidentStatus" AS ENUM ('OPEN','UNDER_REVIEW','RESOLVED','CLOSED')`),
    prisma.$executeRawUnsafe(`CREATE TABLE "SafetyIncident" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "tripId" UUID,
      "reportedByAccountId" UUID NOT NULL,
      "severity" "SafetyIncidentSeverity" NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "locationName" TEXT,
      "status" "SafetyIncidentStatus" NOT NULL DEFAULT 'OPEN',
      "resolutionNotes" TEXT,
      "resolvedByAccountId" UUID,
      "resolvedAt" TIMESTAMPTZ,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "SafetyIncident_title_length_check" CHECK (char_length(btrim("title")) BETWEEN 3 AND 160),
      CONSTRAINT "SafetyIncident_description_length_check" CHECK (char_length(btrim("description")) BETWEEN 3 AND 5000),
      CONSTRAINT "SafetyIncident_location_length_check" CHECK ("locationName" IS NULL OR char_length(btrim("locationName")) <= 160),
      CONSTRAINT "SafetyIncident_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "SafetyIncident_reportedByAccountId_fkey" FOREIGN KEY ("reportedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "SafetyIncident_resolvedByAccountId_fkey" FOREIGN KEY ("resolvedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )`),
    prisma.$executeRawUnsafe(`CREATE INDEX "SafetyIncident_trip_status_created_idx" ON "SafetyIncident" ("tripId","status","createdAt" DESC)`),
    prisma.$executeRawUnsafe(`CREATE INDEX "SafetyIncident_reporter_created_idx" ON "SafetyIncident" ("reportedByAccountId","createdAt" DESC)`),
    prisma.$executeRawUnsafe(`CREATE INDEX "SafetyIncident_status_severity_created_idx" ON "SafetyIncident" ("status","severity","createdAt" DESC)`),
  ]);
  for(const column of ['id','tripId','reportedByAccountId','resolvedByAccountId']){
    if(await columnType('SafetyIncident',column)!=='uuid')throw new Error(`SafetyIncident.${column} recovery verification failed`);
  }
  markApplied(SAFETY_MIGRATION);
  console.log('[late-runtime-recovery] recovered safety incident migration with UUID-compatible schema');
}

async function recoverMessaging(){
  const state=await migrationState(MESSAGING_MIGRATION);
  if(alreadyApplied(state)){console.log('[late-runtime-recovery] messaging migration already applied; no-op');return;}
  for(const table of ['Message','ConversationParticipant','Conversation'])await assertEmptyIfPresent(table);
  await prisma.$transaction([
    prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "Message"`),
    prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "ConversationParticipant"`),
    prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "Conversation"`),
    prisma.$executeRawUnsafe(`CREATE TABLE "Conversation" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "title" TEXT,
      "createdByAccountId" UUID NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "Conversation_title_length_check" CHECK ("title" IS NULL OR char_length("title") BETWEEN 1 AND 120)
    )`),
    prisma.$executeRawUnsafe(`CREATE TABLE "ConversationParticipant" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "conversationId" UUID NOT NULL REFERENCES "Conversation"("id") ON DELETE CASCADE,
      "accountId" UUID NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT,
      "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "lastReadAt" TIMESTAMPTZ,
      CONSTRAINT "ConversationParticipant_unique" UNIQUE ("conversationId","accountId")
    )`),
    prisma.$executeRawUnsafe(`CREATE TABLE "Message" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "conversationId" UUID NOT NULL REFERENCES "Conversation"("id") ON DELETE CASCADE,
      "senderAccountId" UUID NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT,
      "kind" TEXT NOT NULL DEFAULT 'TEXT',
      "body" TEXT,
      "mediaUrl" TEXT,
      "durationSec" INTEGER,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "Message_kind_check" CHECK ("kind" IN ('TEXT','VOICE')),
      CONSTRAINT "Message_payload_check" CHECK (("kind"='TEXT' AND "body" IS NOT NULL AND char_length(btrim("body")) BETWEEN 1 AND 4000 AND "mediaUrl" IS NULL AND "durationSec" IS NULL) OR ("kind"='VOICE' AND "body" IS NULL AND "mediaUrl" ~ '^https://[^[:space:]]+$' AND "durationSec" BETWEEN 1 AND 600))
    )`),
    prisma.$executeRawUnsafe(`CREATE INDEX "Conversation_created_idx" ON "Conversation" ("createdAt" DESC)`),
    prisma.$executeRawUnsafe(`CREATE INDEX "ConversationParticipant_account_idx" ON "ConversationParticipant" ("accountId","joinedAt" DESC)`),
    prisma.$executeRawUnsafe(`CREATE INDEX "Message_conversation_created_idx" ON "Message" ("conversationId","createdAt" ASC)`),
    prisma.$executeRawUnsafe(`CREATE INDEX "Message_sender_created_idx" ON "Message" ("senderAccountId","createdAt" DESC)`),
  ]);
  for(const [table,column] of [['Conversation','id'],['Conversation','createdByAccountId'],['ConversationParticipant','id'],['ConversationParticipant','conversationId'],['ConversationParticipant','accountId'],['Message','id'],['Message','conversationId'],['Message','senderAccountId']]){
    if(await columnType(table,column)!=='uuid')throw new Error(`${table}.${column} recovery verification failed`);
  }
  markApplied(MESSAGING_MIGRATION);
  console.log('[late-runtime-recovery] recovered messaging migration with UUID-compatible schema');
}

try{
  const accountType=await columnType('Account','id');
  const tripType=await columnType('Trip','id');
  if(accountType!=='uuid'||tripType!=='uuid'){
    console.log(`[late-runtime-recovery] canonical non-UUID schema detected (Account=${accountType}, Trip=${tripType}); no-op`);
  }else{
    await assertUuidBase();
    await recoverSafety();
    await recoverMessaging();
  }
} finally {await prisma.$disconnect();}
