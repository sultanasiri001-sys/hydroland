import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

const url=new URL(process.env.DATABASE_URL||'');
assert.ok(['localhost','127.0.0.1','[::1]','::1'].includes(url.hostname),'Audit append-only validation requires a loopback database');
assert.notEqual(process.env.NODE_ENV,'production','Audit append-only validation must never run in production');
const db=new PrismaClient();
try{
  // Execute the same DDL contract as the migration as discrete prepared
  // statements; Prisma/PostgreSQL intentionally rejects multi-command prepared SQL.
  await db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION "hydroland_reject_audit_mutation"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'AuditEvent is append-only; % is prohibited', TG_OP USING ERRCODE = '55000';
END;
$$`);
  await db.$executeRawUnsafe('DROP TRIGGER IF EXISTS "AuditEvent_append_only_row" ON "AuditEvent"');
  await db.$executeRawUnsafe('CREATE TRIGGER "AuditEvent_append_only_row" BEFORE UPDATE OR DELETE ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION "hydroland_reject_audit_mutation"()');
  await db.$executeRawUnsafe('DROP TRIGGER IF EXISTS "AuditEvent_append_only_truncate" ON "AuditEvent"');
  await db.$executeRawUnsafe('CREATE TRIGGER "AuditEvent_append_only_truncate" BEFORE TRUNCATE ON "AuditEvent" FOR EACH STATEMENT EXECUTE FUNCTION "hydroland_reject_audit_mutation"()');

  const inserted=await db.auditEvent.create({data:{action:'PHASE4_APPEND_ONLY_VALIDATION',resource:'AuditEvent',metadata:{synthetic:true}}});
  assert.equal((await db.auditEvent.findUnique({where:{id:inserted.id}}))?.action,'PHASE4_APPEND_ONLY_VALIDATION');
  const cases=[
    ['update',()=>db.auditEvent.update({where:{id:inserted.id},data:{action:'MUTATED'}})],
    ['delete',()=>db.auditEvent.delete({where:{id:inserted.id}})],
    ['deleteMany',()=>db.auditEvent.deleteMany({where:{id:inserted.id}})],
    ['truncate',()=>db.$executeRawUnsafe('TRUNCATE TABLE "AuditEvent"')],
  ];
  for(const [name,action] of cases)await assert.rejects(action,error=>String(error?.message||error).includes('append-only'),name+' must be rejected by the database trigger');
  assert.equal((await db.auditEvent.findUnique({where:{id:inserted.id}}))?.action,'PHASE4_APPEND_ONLY_VALIDATION');
  const triggers=await db.$queryRawUnsafe('SELECT tgname FROM pg_trigger WHERE tgrelid=\'"AuditEvent"\'::regclass AND NOT tgisinternal ORDER BY tgname');
  assert.deepEqual(triggers.map(row=>row.tgname),['AuditEvent_append_only_row','AuditEvent_append_only_truncate']);
  console.log('Audit append-only database validation: PASS (insert/read allowed; update/delete/deleteMany/truncate rejected)');
}finally{await db.$disconnect();}
