import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PrismaClient} from '@prisma/client';
import {DatabaseService} from '../dist/database/database.service.js';
import {FinanceAccessService} from '../dist/finance/finance-access.service.js';
import {FinanceShiftsService} from '../dist/finance/finance-shifts.service.js';
const base=new URL(process.env.DATABASE_URL??'');
assert.equal(process.env.NODE_ENV,'test');
assert.ok(['localhost','127.0.0.1','::1','[::1]'].includes(base.hostname),'Finance fixture requires a loopback database');
const root=new PrismaClient({datasourceUrl:base.toString()});
const original=await readFile(new URL('../prisma/migrations/20260917003500_finance_accountant_shifts/migration.sql',import.meta.url),'utf8');
let scenarios=0;
try {
 for(const coreType of ['text','uuid'])for(const shiftType of ['text','uuid']) {
  const schema='finance_keys_'+randomUUID().replaceAll('-','');const url=new URL(base);url.searchParams.set('schema',schema);
  const db=new DatabaseService({datasourceUrl:url.toString()});
  try {
   await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
   assert.equal((await db.$queryRaw`SELECT current_schema() AS name`)[0].name,schema);
   const run=sql=>db.$executeRawUnsafe(sql);
   await run(`CREATE TABLE "Organization" (id ${coreType} PRIMARY KEY)`);
   await run(`CREATE TABLE "Account" (id ${coreType} PRIMARY KEY,status text NOT NULL)`);
   await run(`CREATE TABLE "OrgUnit" (id ${coreType} PRIMARY KEY,"organizationId" ${coreType} NOT NULL REFERENCES "Organization"(id),type text,active boolean NOT NULL)`);
   await run(`CREATE TABLE "Position" (id ${coreType} PRIMARY KEY,"orgUnitId" ${coreType} REFERENCES "OrgUnit"(id),code text,active boolean NOT NULL)`);
   await run(`CREATE TABLE "Employment" (id ${coreType} PRIMARY KEY,"accountId" ${coreType} REFERENCES "Account"(id),"organizationId" ${coreType} REFERENCES "Organization"(id),"orgUnitId" ${coreType} REFERENCES "OrgUnit"(id),"positionId" ${coreType} REFERENCES "Position"(id),status text NOT NULL)`);
   await run(`CREATE TABLE "Trip" (id ${coreType} PRIMARY KEY,"organizationId" ${coreType} REFERENCES "Organization"(id))`);
   await run(`CREATE TABLE "Booking" (id ${coreType} PRIMARY KEY,"tripId" ${coreType} REFERENCES "Trip"(id))`);
   await run(`CREATE TABLE "Payment" (id ${coreType} PRIMARY KEY,"bookingId" ${coreType} REFERENCES "Booking"(id),"amountMinor" integer,status text)`);
   let migration=original;
   for(const column of ['accountantAccountId','centerOrgUnitId','reviewedByAccountId','paymentId','recordedByAccountId','fromAccountantId','toAccountantId'])migration=migration.replaceAll(`"${column}" UUID`,`"${column}" ${coreType}`);
   for(const column of ['id','shiftId','fromShiftId','toShiftId'])migration=migration.replaceAll(`"${column}" UUID`,`"${column}" ${shiftType}`);
   for(const statement of migration.split(';').map(s=>s.trim()).filter(Boolean))await run(statement);
   const id=()=>coreType==='text'?'text_'+randomUUID():randomUUID();
   const orgA=id(),orgB=id(),unitA=id(),unitB=id(),extra=id(),positionA=id(),positionB=id(),wrongPosition=id();
   const a=id(),b=id(),outsider=id(),wrong=id(),mismatch=id(),employmentB=id();
   // Literal fixture identifiers are generated locally; production/customer input never enters raw SQL.
   const literal=x=>"'"+x.replaceAll("'","''")+"'";
   for(const org of [orgA,orgB])await run(`INSERT INTO "Organization" VALUES (${literal(org)})`);
   for(const account of [a,b,outsider,wrong,mismatch])await run(`INSERT INTO "Account" VALUES (${literal(account)},'ACTIVE')`);
   for(const [unit,org]of [[unitA,orgA],[unitB,orgB]])await run(`INSERT INTO "OrgUnit" VALUES (${literal(unit)},${literal(org)},'CENTER',TRUE)`);
   for(const [position,unit,code]of [[positionA,unitA,'BRANCH_ACCOUNTANT'],[positionB,unitB,'CENTER_ACCOUNTANT'],[wrongPosition,unitA,'STAFF']])await run(`INSERT INTO "Position" VALUES (${literal(position)},${literal(unit)},${literal(code)},TRUE)`);
   for(const [account,org,unit,position,employment]of [[a,orgA,unitA,positionA,id()],[b,orgA,unitA,positionA,employmentB],[outsider,orgB,unitB,positionB,id()],[wrong,orgA,unitA,wrongPosition,id()],[mismatch,orgB,unitA,positionA,id()]])await run(`INSERT INTO "Employment" VALUES (${literal(employment)},${literal(account)},${literal(org)},${literal(unit)},${literal(position)},'ACTIVE')`);
   const access=new FinanceAccessService(db),service=new FinanceShiftsService(db,access);
   const rejects=async(p,code)=>{await assert.rejects(p,e=>String(e.message).includes(code));scenarios++;};
   await rejects(service.openShift(outsider,unitA,0),'FINANCE_BRANCH_ACCOUNTANT_ACCESS_DENIED');
   await rejects(service.openShift(wrong,unitA,0),'FINANCE_BRANCH_ACCOUNTANT_ACCESS_DENIED');
   await rejects(service.openShift(mismatch,unitA,0),'FINANCE_BRANCH_ACCOUNTANT_ACCESS_DENIED');
   await rejects(service.openShift(a,unitA,-1),'FINANCE_AMOUNT_INVALID');
   await run(`INSERT INTO "OrgUnit" VALUES (${literal(extra)},${literal(orgA)},'CENTER',TRUE)`);
   await rejects(service.openShift(a,unitA,0),'FINANCE_CENTER_MAPPING_AMBIGUOUS');
   await run(`DELETE FROM "OrgUnit" WHERE id=${literal(extra)}`);
   const from=await service.openShift(a,unitA,100),to=await service.openShift(b,unitA,0),foreign=await service.openShift(outsider,unitB,0);
   assert.equal(from.centerOrgUnitId,orgA);assert.notEqual(from.centerOrgUnitId,unitA);scenarios++;
   await rejects(service.openShift(a,unitA,0),'FINANCE_ACTIVE_SHIFT_EXISTS');
   await rejects(service.recordEntry(b,from.id,{type:'EXPENSE',amountMinor:1}),'FINANCE_SHIFT_ACCOUNT_ISOLATION_DENIED');
   await service.recordEntry(a,from.id,{type:'EXPENSE',amountMinor:20,referenceId:randomUUID()});scenarios++;
   const payments=[];
   for(const org of [orgA,orgB]){const trip=id(),booking=id(),payment=id();await run(`INSERT INTO "Trip" VALUES (${literal(trip)},${literal(org)})`);await run(`INSERT INTO "Booking" VALUES (${literal(booking)},${literal(trip)})`);await run(`INSERT INTO "Payment" VALUES (${literal(payment)},${literal(booking)},40,'CAPTURED')`);payments.push(payment);}
   await rejects(service.recordEntry(a,from.id,{type:'REVENUE',amountMinor:40,paymentId:payments[1]}),'FINANCE_PAYMENT_NOT_FOUND');
   await service.recordEntry(a,from.id,{type:'REVENUE',amountMinor:40,paymentId:payments[0]});scenarios++;
   await assert.rejects(service.recordEntry(a,from.id,{type:'REVENUE',amountMinor:40,paymentId:payments[0]}));scenarios++;
   await rejects(service.requestHandover(a,from.id,outsider,120),'FINANCE_BRANCH_ACCOUNTANT_ACCESS_DENIED');
   const handover=await service.requestHandover(a,from.id,b,120);scenarios++;
   await rejects(service.acceptHandover(a,handover.id),'FINANCE_HANDOVER_ACCEPTOR_INVALID');
   await run(`UPDATE "Employment" SET status='INACTIVE' WHERE id=${literal(employmentB)}`);
   await rejects(service.acceptHandover(b,handover.id),'FINANCE_BRANCH_ACCOUNTANT_ACCESS_DENIED');
   await run(`UPDATE "Employment" SET status='ACTIVE' WHERE id=${literal(employmentB)}`);
   await run(`UPDATE "FinanceShiftHandover" SET "actualCashMinor"=NULL WHERE id=${literal(handover.id)}`);
   await rejects(service.acceptHandover(b,handover.id),'FINANCE_HANDOVER_AMOUNT_INVALID');
   await run(`UPDATE "FinanceShiftHandover" SET "actualCashMinor"=120,"fromShiftId"=${literal(foreign.id)} WHERE id=${literal(handover.id)}`);
   await rejects(service.acceptHandover(b,handover.id),'FINANCE_HANDOVER_SOURCE_SHIFT_INVALID');
   await run(`UPDATE "FinanceShiftHandover" SET "fromShiftId"=${literal(from.id)} WHERE id=${literal(handover.id)}`);
   const accepted=await service.acceptHandover(b,handover.id);assert.equal(accepted.openingBalanceMinor,120);scenarios++;
   await rejects(service.acceptHandover(b,handover.id),'FINANCE_HANDOVER_NOT_PENDING');
   const rows=await db.$queryRawUnsafe(`SELECT id,"openingBalanceMinor",status::text FROM "FinanceAccountantShift" ORDER BY id`);
   assert.equal(rows.find(r=>r.id===from.id).status,'HANDED_OVER');assert.equal(rows.find(r=>r.id===to.id).openingBalanceMinor,120);assert.equal(rows.find(r=>r.id===foreign.id).openingBalanceMinor,0);scenarios++;
   const races=await Promise.allSettled([service.openShift(a,unitA,0),service.openShift(a,unitA,0)]);assert.equal(races.filter(r=>r.status==='fulfilled').length,1);assert.ok(races.find(r=>r.status==='rejected').reason.message.includes('FINANCE_ACTIVE_SHIFT_EXISTS'));scenarios++;
   console.log(JSON.stringify({coreType,shiftType,status:'PASS'}));
  }finally{await db.$disconnect();await root.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);}
 }
 console.log(JSON.stringify({status:'PASS',matrices:4,scenarios}));
}finally{await root.$disconnect();}
