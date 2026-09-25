import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const db=new PrismaClient();
const here=dirname(fileURLToPath(import.meta.url));
const prismaRoot=resolve(here,'..','prisma');
const migrations=['20260925224500_messaging_runtime'];
const expectedTables=['Conversation','ConversationParticipant','Message'];
const expectedConstraints=['Conversation_title_length_check','ConversationParticipant_unique','Message_kind_check','Message_payload_check'];
const expectedIndexes=['Conversation_created_idx','ConversationParticipant_account_idx','Message_conversation_created_idx','Message_sender_created_idx'];
const splitStatements=sql=>sql.split(';').map(statement=>statement.trim()).filter(Boolean);

const tableState=async()=>{
  const rows=await db.$queryRawUnsafe(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename = ANY($1::text[])`,expectedTables);
  return new Set(rows.map(row=>row.tablename));
};
const verify=async()=>{
  const tables=await tableState(),missingTables=expectedTables.filter(name=>!tables.has(name));
  if(missingTables.length)throw new Error(`Messaging runtime bootstrap missing tables: ${missingTables.join(', ')}`);
  const constraints=await db.$queryRawUnsafe(`SELECT conname FROM pg_constraint WHERE conname = ANY($1::text[])`,expectedConstraints),constraintSet=new Set(constraints.map(row=>row.conname));
  const missingConstraints=expectedConstraints.filter(name=>!constraintSet.has(name));
  if(missingConstraints.length)throw new Error(`Messaging runtime bootstrap missing constraints: ${missingConstraints.join(', ')}`);
  const indexes=await db.$queryRawUnsafe(`SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname = ANY($1::text[])`,expectedIndexes),indexSet=new Set(indexes.map(row=>row.indexname));
  const missingIndexes=expectedIndexes.filter(name=>!indexSet.has(name));
  if(missingIndexes.length)throw new Error(`Messaging runtime bootstrap missing indexes: ${missingIndexes.join(', ')}`);
};

try{
  const existing=await tableState();
  if(existing.size===expectedTables.length){await verify();console.log('Messaging runtime schema already present and verified.');}
  else{
    if(existing.size!==0)throw new Error(`Partial messaging runtime schema detected before bootstrap: ${[...existing].join(', ')}`);
    for(const migration of migrations){
      const file=resolve(prismaRoot,'migrations',migration,'migration.sql'),sql=await readFile(file,'utf8');
      for(const statement of splitStatements(sql))await db.$executeRawUnsafe(statement);
      console.log(`Applied messaging runtime schema migration ${migration}.`);
    }
    await verify();
    console.log('Messaging runtime schema bootstrap verified against production migration definitions.');
  }
} finally { await db.$disconnect(); }
