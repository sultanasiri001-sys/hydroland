import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {researchTestDatabase,researchMigration,sqlStatements} from './internal-research-test-support.mjs';
const url=researchTestDatabase(),root=new PrismaClient(),statements=sqlStatements(await researchMigration());
try {
 for(const organizationType of ['text','uuid'])for(const accountType of ['text','uuid']){
  const schema='research_'+randomUUID().replaceAll('-','');await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  const scoped=new URL(url);scoped.searchParams.set('schema',schema);const db=new PrismaClient({datasourceUrl:scoped.toString()});
  try {
   await db.$executeRawUnsafe(`CREATE TABLE "Account" ("id" ${accountType} PRIMARY KEY)`);await db.$executeRawUnsafe(`CREATE TABLE "Organization" ("id" ${organizationType} PRIMARY KEY)`);
   const actor=randomUUID(),reviewer=randomUUID(),org=randomUUID();await db.$executeRawUnsafe(`INSERT INTO "Account" VALUES ($1::${accountType}),($2::${accountType})`,actor,reviewer);await db.$executeRawUnsafe(`INSERT INTO "Organization" VALUES ($1::${organizationType})`,org);
   for(const sql of statements)await db.$executeRawUnsafe(sql);
   assert.equal(await db.internalResearchInitiative.count(),0);assert.equal(await db.internalResearchReview.count(),0);assert.equal(await db.internalResearchRevision.count(),0);
   const data={organizationId:org,requestKey:randomUUID(),policyVersion:'fixture',revision:1,status:'PROPOSED',content:{},createdByAccountId:actor,createdByPersonId:randomUUID(),recordDigest:'fixture'};
   const head=await db.internalResearchInitiative.create({data});assert.equal((await db.internalResearchInitiative.findFirstOrThrow({where:{organizationId:org,createdByAccountId:actor}})).id,head.id);
   await assert.rejects(()=>db.internalResearchInitiative.create({data}));await assert.rejects(()=>db.internalResearchInitiative.create({data:{...data,requestKey:randomUUID(),revision:0}}));await assert.rejects(()=>db.internalResearchInitiative.create({data:{...data,requestKey:randomUUID(),status:'EXTERNAL_EXECUTION_APPROVED'}}));
   const history={initiativeId:head.id,revision:1,snapshot:{synthetic:true},action:'FIXTURE',reason:'Fixture only',actorAccountId:actor,recordDigest:'fixture'};
   const revision=await db.internalResearchRevision.create({data:history});await assert.rejects(()=>db.internalResearchRevision.create({data:history}));
   for(const sql of ['UPDATE "InternalResearchRevision" SET "reason"=\'tamper\'','DELETE FROM "InternalResearchRevision"','TRUNCATE "InternalResearchRevision"'])await assert.rejects(()=>db.$executeRawUnsafe(sql));
   assert.deepEqual(await db.internalResearchRevision.findUnique({where:{id:revision.id}}),revision);
   const issuedAt=new Date(),reviewData={organizationId:org,initiativeId:head.id,phase:'PROPOSAL',assignedRevision:2,sourceHash:'fixture',reviewerAccountId:reviewer,reviewerPersonId:randomUUID(),reviewerBinding:{},authorityBinding:{},issuedByAccountId:actor,issuedAt,expiresAt:new Date(issuedAt.getTime()+3600000),state:'ACTIVE',reason:'Fixture only',recordDigest:'fixture'};
   const review=await db.internalResearchReview.create({data:reviewData});assert.equal((await db.internalResearchReview.findFirstOrThrow({where:{reviewerAccountId:reviewer}})).id,review.id);
   for(const bad of [{phase:'UNKNOWN'},{assignedRevision:0},{expiresAt:issuedAt},{expiresAt:new Date(issuedAt.getTime()+8*86400000)},{reviewerAccountId:actor},{state:'APPROVED'},{state:'UNKNOWN'},{receiptHash:'forged'}])await assert.rejects(()=>db.internalResearchReview.create({data:{...reviewData,...bad}}));
   await assert.rejects(()=>db.$transaction(async tx=>{await tx.internalResearchRevision.create({data:{...history,revision:2}});await tx.internalResearchInitiative.update({where:{id:head.id},data:{revision:2}});throw Error('synthetic rollback');}));
   assert.equal(await db.internalResearchRevision.count(),1);assert.deepEqual(await db.internalResearchInitiative.findUnique({where:{id:head.id}}),head);
   await assert.rejects(()=>db.$executeRawUnsafe(`DELETE FROM "Account" WHERE "id"=$1::${accountType}`,actor));await assert.rejects(()=>db.$executeRawUnsafe(`DELETE FROM "Organization" WHERE "id"=$1::${organizationType}`,org));
   console.log(`PASS migration Organization=${organizationType} Account=${accountType}: native Prisma, no seeds, FKs, state/expiry/receipt/unique constraints, append-only history and atomic rollback`);
  }finally{await db.$disconnect();await root.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);}
 }
}finally{await root.$disconnect();}
