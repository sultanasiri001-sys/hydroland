import assert from 'node:assert/strict';
import {PrismaClient} from '@prisma/client';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const url=process.env.DATABASE_URL;
if(process.env.NODE_ENV!=='test'||!['127.0.0.1','localhost','[::1]'].includes(new URL(url).hostname))throw new Error('F03 migration rehearsal requires a disposable loopback database.');
const db=new PrismaClient(),migration=await readFile(new URL('../prisma/migrations/20261128040000_community_program_buddy_consent/migration.sql',import.meta.url),'utf8'),results=[];
try{
 for(let mask=0;mask<32;mask++){
  const schema='f03_keys_'+randomUUID().replaceAll('-',''),types=[0,1,2,3,4].map(bit=>mask&(1<<bit)?'uuid':'text'),[owner,a,b,org,doc,event,registration]=Array.from({length:7},()=>randomUUID());
  await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  try{
   const originals=['Account','Organization','ManagedDocument','CommunityEvent','CommunityVolunteerRegistration'].map((name,i)=>`CREATE TABLE "${name}" (id ${types[i]} PRIMARY KEY);`).join('\n');
   const rehearsal=`SET search_path TO "${schema}";\n${originals}\n${migration}\n
INSERT INTO "Account" VALUES ('${owner}'),('${a}'),('${b}');
INSERT INTO "Organization" VALUES ('${org}'); INSERT INTO "ManagedDocument" VALUES ('${doc}');
INSERT INTO "CommunityEvent" VALUES ('${event}'); INSERT INTO "CommunityVolunteerRegistration" VALUES ('${registration}');
INSERT INTO "CommunityProgram" (id,"documentId","organizationId",version,"contentHash","sourceHash","ownerAccountId","adoptedByAccountId") VALUES ('program','${doc}','${org}',1,'content','source','${owner}','${owner}');
INSERT INTO "CommunityEventProgram" VALUES ('${event}','program','ENVIRONMENT');
INSERT INTO "CommunityVolunteerConsent" ("registrationId","programId","sourceHash") VALUES ('${registration}','program','source');
INSERT INTO "CommunityBuddyMembership" (id,"programId","accountId","sourceHash",alias,region) VALUES ('member-a','program','${a}','source','Alias A','Coast'),('member-b','program','${b}','source','Alias B','Coast');
INSERT INTO "CommunityBuddyRequest" (id,"programId","requesterAccountId","recipientAccountId","requesterMembershipId","recipientMembershipId","requesterRevision","recipientRevision","sourceHash","pairKey","requestKey","requestDigest") VALUES ('request','program','${a}','${b}','member-a','member-b',1,1,'source','pair','key','digest');
DO $$ BEGIN
 BEGIN INSERT INTO "CommunityBuddyRequest" SELECT 'duplicate',"programId","requesterAccountId","recipientAccountId","requesterMembershipId","recipientMembershipId","requesterRevision","recipientRevision","sourceHash","pairKey",'another-key',"requestDigest",status,"createdAt","respondedAt" FROM "CommunityBuddyRequest" WHERE id='request'; RAISE EXCEPTION 'Duplicate active pair was accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN UPDATE "CommunityProgram" SET state='UNREVIEWED'; RAISE EXCEPTION 'Invalid state was accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN DELETE FROM "Account" WHERE id='${a}'; RAISE EXCEPTION 'Referenced account was deleted'; EXCEPTION WHEN foreign_key_violation THEN NULL; END;
END $$;
DELETE FROM "CommunityEvent" WHERE id='${event}'; DELETE FROM "CommunityVolunteerRegistration" WHERE id='${registration}';
DO $$ BEGIN IF EXISTS(SELECT 1 FROM "CommunityEventProgram") OR EXISTS(SELECT 1 FROM "CommunityVolunteerConsent") THEN RAISE EXCEPTION 'Source cascade failed'; END IF; END $$;
`;
   const run=spawnSync(process.env.F03_PSQL_PATH||'psql',[url,'-X','-q','-v','ON_ERROR_STOP=1'],{input:rehearsal,encoding:'utf8',maxBuffer:1024*1024});assert.equal(run.status,0,run.stderr||run.error?.message);
   const columns=await db.$queryRaw`SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema=${schema} AND ((table_name='CommunityProgram' AND column_name IN ('documentId','organizationId','ownerAccountId')) OR (table_name='CommunityEventProgram' AND column_name='eventId') OR (table_name='CommunityVolunteerConsent' AND column_name='registrationId'))`;
   const expected={ownerAccountId:types[0],organizationId:types[1],documentId:types[2],eventId:types[3],registrationId:types[4]};for(const column of columns)assert.equal(column.data_type,expected[column.column_name]);assert.equal(columns.length,5);
   results.push({account:types[0],organization:types[1],document:types[2],event:types[3],registration:types[4],status:'PASS'});
  }finally{await db.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);}
 }
 const evidence={scope:'F03 migration native-key compatibility and constraints',passed:results.length,failed:0,skipped:0,cases:results};if(process.env.F03_MIGRATION_EVIDENCE_FILE)await writeFile(process.env.F03_MIGRATION_EVIDENCE_FILE,JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
}finally{await db.$disconnect();}
