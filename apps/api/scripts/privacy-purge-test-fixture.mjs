import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../dist/audit/audit.service.js';
import { PrivateMessageReviewService } from '../dist/messaging/private-message-review.service.js';
import { PrivacyErasureService } from '../dist/privacy/privacy-erasure.service.js';
import { PrivacyRecoveryService, baselineId, baselineKey } from '../dist/privacy/privacy-recovery.service.js';

// Existing message/audio regression fixtures use this independent synthetic
// journal to exercise the real erasure and recovery services. The dedicated
// A15 acceptance separately verifies encrypted S3 IO and pg_dump/pg_restore.
export async function privacyPurgeTestFixture(db){
 assert.equal(process.env.NODE_ENV,'test');assert(['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL).hostname));
 const before=new Set((await db.$queryRaw`SELECT id FROM "PrivacyErasureOperation"`).map(row=>row.id));
 assert.equal(before.size,0,'A privacy purge fixture must start with no unrelated erasure ledger');
 const entries=new Map(),previous=process.env.HYDROLAND_PRIVACY_RECOVERY_REQUIRED;process.env.HYDROLAND_PRIVACY_RECOVERY_REQUIRED='true';
 const journal={async put(id,phase,value){const key=id+':'+phase,stored=structuredClone(value);if(entries.has(key))assert.deepEqual(entries.get(key),stored);else entries.set(key,stored);},async entries(){return [...entries].map(([key,value])=>{const [id,phase]=key.split(':');return {id,phase,value:structuredClone(value)};});}};
 await db.operationalSetting.upsert({where:{key:baselineKey},create:{key:baselineKey,value:{nonce:randomUUID(),createdAt:new Date().toISOString()}},update:{}});
 const audit=new AuditService(db),recovery=new PrivacyRecoveryService(db,journal),previousInitialize=process.env.HYDROLAND_PRIVACY_JOURNAL_INITIALIZE;
 process.env.HYDROLAND_PRIVACY_JOURNAL_INITIALIZE='INITIALIZE_EMPTY_JOURNAL_ONCE';
 try{await recovery.initialize();}finally{if(previousInitialize===undefined)delete process.env.HYDROLAND_PRIVACY_JOURNAL_INITIALIZE;else process.env.HYDROLAND_PRIVACY_JOURNAL_INITIALIZE=previousInitialize;}
 await recovery.reconcile(false);
 const review=new PrivateMessageReviewService(db,audit,new PrivacyErasureService(db,audit,journal,recovery));
 return {review,async close(){
  await recovery.reconcile(false);
  const ids=[...new Set([...entries.keys()].map(key=>key.split(':')[0]))].filter(id=>id!==baselineId);
  for(const id of ids)await db.$executeRaw`DELETE FROM "PrivacyErasureOperation" WHERE id=${id}`;
  if(previous===undefined)delete process.env.HYDROLAND_PRIVACY_RECOVERY_REQUIRED;else process.env.HYDROLAND_PRIVACY_RECOVERY_REQUIRED=previous;
 }};
}
