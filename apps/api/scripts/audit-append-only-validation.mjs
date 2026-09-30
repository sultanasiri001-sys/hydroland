import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
const url=new URL(process.env.DATABASE_URL||'');
assert.ok(['localhost','127.0.0.1','[::1]','::1'].includes(url.hostname),'Audit append-only validation requires a loopback database');
assert.notEqual(process.env.NODE_ENV,'production','Audit append-only validation must never run in production');
const db=new PrismaClient();
const migration=await readFile(new URL('../prisma/migrations/20260930080000_audit_event_append_only/migration.sql',import.meta.url),'utf8');
try{
 const statements=migration.split(/;\s*(?:\n|$)/).map(value=>value.trim()).filter(Boolean);\n for(const statement of statements)await db.$executeRawUnsafe(statement);
 const inserted=await db.auditEvent.create({data:{action:'PHASE4_APPEND_ONLY_VALIDATION',resource:'AuditEvent',metadata:{synthetic:true}}});
 assert.equal((await db.auditEvent.findUnique({where:{id:inserted.id}}))?.action,'PHASE4_APPEND_ONLY_VALIDATION');
 const cases=[['update',()=>db.auditEvent.update({where:{id:inserted.id},data:{action:'MUTATED'}})],['delete',()=>db.auditEvent.delete({where:{id:inserted.id}})],['deleteMany',()=>db.auditEvent.deleteMany({where:{id:inserted.id}})],['truncate',()=>db.$executeRawUnsafe('TRUNCATE TABLE "AuditEvent"')]];
 for(const [name,action] of cases)await assert.rejects(action,error=>String(error?.message||error).includes('append-only'),name+' must be rejected by the database trigger');
 assert.equal((await db.auditEvent.findUnique({where:{id:inserted.id}}))?.action,'PHASE4_APPEND_ONLY_VALIDATION');
 const triggers=await db.$queryRawUnsafe('SELECT tgname FROM pg_trigger WHERE tgrelid=\'"AuditEvent"\'::regclass AND NOT tgisinternal ORDER BY tgname');
 assert.deepEqual(triggers.map(row=>row.tgname),['AuditEvent_append_only_row','AuditEvent_append_only_truncate']);
 console.log('Audit append-only database validation: PASS (insert/read allowed; update/delete/deleteMany/truncate rejected)');
}finally{await db.$disconnect();}
