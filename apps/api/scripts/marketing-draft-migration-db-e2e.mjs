import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {marketingTestDatabase,marketingMigration,sqlStatements} from './marketing-draft-test-support.mjs';
const url=marketingTestDatabase(),root=new PrismaClient(),statements=sqlStatements(await marketingMigration());
try{
 for(const orgType of ['text','uuid'])for(const accountType of ['text','uuid']){
  const schema='marketing_'+randomUUID().replaceAll('-','');await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  const scoped=new URL(url);scoped.searchParams.set('schema',schema);const db=new PrismaClient({datasourceUrl:scoped.toString()});
  try{
   await db.$executeRawUnsafe(`CREATE TABLE "Organization" ("id" ${orgType} PRIMARY KEY)`);await db.$executeRawUnsafe(`CREATE TABLE "Account" ("id" ${accountType} PRIMARY KEY)`);
   const org=randomUUID(),actor=randomUUID();await db.$executeRawUnsafe(`INSERT INTO "Organization" VALUES ($1::${orgType})`,org);await db.$executeRawUnsafe(`INSERT INTO "Account" VALUES ($1::${accountType})`,actor);
   for(const sql of statements)await db.$executeRawUnsafe(sql);
   assert.equal(await db.marketingCampaignDraft.count(),0);assert.equal(await db.marketingCampaignDraftRevision.count(),0);
   const value={organizationId:org,requestKey:randomUUID(),requestDigest:'a'.repeat(64),title:'Synthetic planning only',objective:'No publication or actual business evidence',channels:['WEB'],createdByAccountId:actor,recordDigest:'b'.repeat(64)};
   const row=await db.marketingCampaignDraft.create({data:value});assert.equal((await db.marketingCampaignDraft.findFirstOrThrow({where:{organizationId:org,createdByAccountId:actor}})).id,row.id);
   for(const change of [{status:'ACTIVE'},{status:'PUBLISHED'},{revision:0},{title:''},{objective:'x'.repeat(2001)},{channels:[]},{channels:['UNKNOWN']},{recordDigest:'invalid'}])await assert.rejects(()=>db.marketingCampaignDraft.create({data:{...value,requestKey:randomUUID(),...change}}));
   await assert.rejects(()=>db.marketingCampaignDraft.create({data:value}));
   const entry={campaignDraftId:row.id,revision:1,snapshot:{synthetic:true},action:'MARKETING_CAMPAIGN_DRAFT_CREATED',reason:'Isolated migration fixture',actorAccountId:actor,recordDigest:'c'.repeat(64)};
   await db.marketingCampaignDraftRevision.create({data:entry});await assert.rejects(()=>db.marketingCampaignDraftRevision.create({data:entry}));
   for(const sql of ['UPDATE "MarketingCampaignDraftRevision" SET "reason"=\'tamper\'','DELETE FROM "MarketingCampaignDraftRevision"','TRUNCATE "MarketingCampaignDraftRevision"'])await assert.rejects(()=>db.$executeRawUnsafe(sql));
   await assert.rejects(()=>db.$transaction(async tx=>{await tx.marketingCampaignDraft.update({where:{id:row.id},data:{revision:2}});await tx.marketingCampaignDraftRevision.create({data:{...entry,revision:2}});throw Error('Synthetic rollback');}));
   assert.equal((await db.marketingCampaignDraft.findUniqueOrThrow({where:{id:row.id}})).revision,1);assert.equal(await db.marketingCampaignDraftRevision.count(),1);
   await assert.rejects(()=>db.$executeRawUnsafe(`DELETE FROM "Account" WHERE "id"=$1::${accountType}`,actor));await assert.rejects(()=>db.$executeRawUnsafe(`DELETE FROM "Organization" WHERE "id"=$1::${orgType}`,org));
   console.log(`PASS marketing migration Organization=${orgType} Account=${accountType}: native Prisma, no seeds, FK/unique/state/content bounds, append-only history and atomic rollback`);
  }finally{await db.$disconnect();await root.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);}
 }
}finally{await root.$disconnect();}
