import assert from 'node:assert/strict';
import {createHmac,randomUUID,randomBytes} from 'node:crypto';
import {DatabaseService} from '../dist/database/database.service.js';
import {AuditService} from '../dist/audit/audit.service.js';
import {PrivateMessageReviewService} from '../dist/messaging/private-message-review.service.js';
import {communityPolicyFixture} from './community-policy-test-support.mjs';
const db=new DatabaseService(),base=process.env.MESSAGING_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
for(const url of [base,process.env.DATABASE_URL])assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(url).hostname));assert.equal(process.env.NODE_ENV,'test');
const review=new PrivateMessageReviewService(db,new AuditService(db)),accounts=[],persons=[],conversations=[],cases=[],prefix=randomUUID();let org,previous,policyFixture;
function wav(byteSize=32044,rate=16000){const b=Buffer.alloc(byteSize);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);for(let i=44;i<b.length;i+=2)b.writeInt16LE(Math.floor(1000*Math.sin(i/16)),i);return b}
const bytes=wav();const payload={mimeType:'audio/wav',base64:bytes.toString('base64'),consent:true,requestKey:randomUUID().replaceAll('-','')};
async function account(name,admin=false){const person=await db.person.create({data:{firstName:name,lastName:'AudioFixture'}});persons.push(person);const a=await db.account.create({data:{personId:person.id,email:name+'-'+prefix+'@example.invalid',passwordHash:'fixture',status:'ACTIVE',emailVerifiedAt:new Date()}});if(admin)await db.roleAssignment.create({data:{accountId:a.id,role:'ADMIN',status:'ACTIVE',activeAt:new Date()}});const session=await db.session.create({data:{accountId:a.id,tokenHash:randomBytes(24).toString('hex'),expiresAt:new Date(Date.now()+3600000)}}),enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url'),iat=Math.floor(Date.now()/1000),body=enc({alg:'HS256',typ:'JWT'})+'.'+enc({sub:a.id,sid:session.id,iat,exp:iat+3600});const result={...a,session,token:body+'.'+createHmac('sha256',process.env.JWT_SECRET).update(body).digest('base64url')};accounts.push(result);return result}
const call=(a,path,body,method=body===undefined?'GET':'POST')=>fetch(base+path,{method,headers:{...(a?{authorization:'Bearer '+a.token}:{}),'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
async function ok(a,path,body,method){const r=await call(a,path,body,method),v=await r.json();assert.ok(r.ok,JSON.stringify(v));return v}
try{
 const sender=await account('sender'),peer=await account('peer'),outsider=await account('outsider'),owner=await account('owner',true),policyReviewer=await account('policy-reviewer',true);
 previous=await db.operationalSetting.findUnique({where:{key:'PLATFORM_STAFFING_ORGANIZATION:v1'}});org=await db.organization.create({data:{ownerId:owner.id,kind:'HYDROLAND_INTERNAL_PLATFORM',status:'ACTIVE',displayName:'Synthetic private audio'}});await db.operationalSetting.upsert({where:{key:'PLATFORM_STAFFING_ORGANIZATION:v1'},create:{key:'PLATFORM_STAFFING_ORGANIZATION:v1',value:{organizationId:org.id}},update:{value:{organizationId:org.id}}});
 const conversation=await ok(sender,'/messages/conversations',{participantAccountIds:[peer.id]});conversations.push(conversation.id);const path='/messages/conversations/'+conversation.id;
 assert.equal((await ok(sender,'/community/audio-policy')).active,false);assert.equal((await call(sender,path+'/audio',payload)).status,409);
 policyFixture=await communityPolicyFixture({db,owner,creator:policyReviewer,base,token:owner.token,privateAudioEnabled:false});
 assert.equal((await ok(sender,'/community/policy')).active,true);assert.equal((await ok(sender,'/community/audio-policy')).active,false);assert.equal((await call(sender,path+'/audio',payload)).status,409);
 assert.equal((await db.$queryRaw`SELECT 1 FROM "PrivateMessageAudio" WHERE "senderAccountId"::text=${sender.id}`).length,0);assert.equal((await ok(sender,path)).messages.length,0);assert.equal(await db.notification.count({where:{accountId:peer.id,type:'MESSAGE_RECEIVED'}}),0);
 await policyFixture.cleanup();policyFixture=null;
 policyFixture=await communityPolicyFixture({db,owner,creator:policyReviewer,base,token:owner.token,privateAudioEnabled:true,communityEnabled:false});
 assert.equal((await ok(sender,'/community/policy')).active,false);assert.equal((await ok(sender,'/community/audio-policy')).active,true);
 assert.equal((await call(null,path+'/audio',payload)).status,401);assert.equal((await call(outsider,path+'/audio',payload)).status,404);
 for(const patch of [{consent:false},{mimeType:'text/html'},{base64:Buffer.from('<script>alert(1)</script>').toString('base64')},{requestKey:'bad'}])assert.equal((await call(sender,path+'/audio',{...payload,...patch})).status,400);
 const trigger='audio_notify_'+prefix.replaceAll('-','').slice(0,20);
 await db.$executeRawUnsafe(`CREATE FUNCTION "${trigger}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic notification rollback'; END $$`);
 await db.$executeRawUnsafe(`CREATE TRIGGER "${trigger}" BEFORE INSERT ON "Notification" FOR EACH ROW WHEN (NEW.type='MESSAGE_RECEIVED') EXECUTE FUNCTION "${trigger}"()`);
 try{assert.equal((await call(sender,path+'/audio',payload)).status,500);assert.equal((await db.$queryRaw`SELECT 1 FROM "PrivateMessageAudio" WHERE "senderAccountId"::text=${sender.id}`).length,0);assert.equal((await ok(sender,path)).messages.length,0)}finally{await db.$executeRawUnsafe(`DROP TRIGGER "${trigger}" ON "Notification"`);await db.$executeRawUnsafe(`DROP FUNCTION "${trigger}"()`)}
 const [first,retry]=await Promise.all([ok(sender,path+'/audio',payload),ok(sender,path+'/audio',payload)]);assert.equal(first.id,retry.id);assert.equal(first.durationSec,1);assert.equal(first.mediaUrl,null);assert.equal(first.privateAudio,true);
 assert.equal(await db.notification.count({where:{accountId:peer.id,type:'MESSAGE_RECEIVED',payload:{path:['messageId'],equals:first.id}}}),1);
 const download=path+'/messages/'+first.id+'/audio';let r=await call(peer,download);assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'audio/wav');assert.match(r.headers.get('cache-control'),/no-store/);assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes);assert.equal((await call(outsider,download)).status,404);assert.equal((await call(null,download)).status,401);
 const bad=Buffer.from(bytes);bad.writeInt16LE(42,44);assert.equal((await call(sender,path+'/audio',{...payload,base64:bad.toString('base64')})).status,409);
 const history=await ok(peer,path);assert.equal(history.messages.find(m=>m.id===first.id).privateAudio,true);assert.equal(history.messages.find(m=>m.id===first.id).mediaUrl,null);
 const blockedPayload={...payload,requestKey:randomUUID().replaceAll('-','')};
 await db.managedDocument.update({where:{id:policyFixture.doc.id},data:{payload:{...policyFixture.payload,privateAudioEnabled:false}}});
 assert.equal((await ok(sender,'/community/audio-policy')).active,false);assert.equal((await call(sender,path+'/audio',blockedPayload)).status,409);assert.equal((await call(peer,download)).status,200);
 await db.managedDocument.update({where:{id:policyFixture.doc.id},data:{payload:policyFixture.payload}});
 const originalFields=policyFixture.template.fields;
 await db.documentTemplate.update({where:{id:policyFixture.template.id},data:{fields:originalFields.map(field=>field.key==='privateAudioTerms'?{...field,contentEn:'Synthetic altered terms must not activate private audio.'}:field)}});
 assert.equal((await ok(sender,'/community/audio-policy')).active,false);assert.equal((await call(sender,path+'/audio',blockedPayload)).status,409);
 await db.documentTemplate.update({where:{id:policyFixture.template.id},data:{fields:originalFields}});
 await db.roleAssignment.update({where:{accountId_role:{accountId:owner.id,role:'ADMIN'}},data:{status:'SUSPENDED'}});
 try{assert.equal((await ok(sender,'/community/audio-policy')).active,false);assert.equal((await call(sender,path+'/audio',blockedPayload)).status,409);assert.equal((await call(peer,download)).status,200)}finally{await db.roleAssignment.update({where:{accountId_role:{accountId:owner.id,role:'ADMIN'}},data:{status:'ACTIVE'}})}
 await db.managedDocument.update({where:{id:policyFixture.doc.id},data:{status:'ARCHIVED'}});
 assert.equal((await ok(sender,'/community/audio-policy')).active,false);assert.equal((await call(sender,path+'/audio',blockedPayload)).status,409);assert.equal((await call(peer,download)).status,200);
 const report=await ok(peer,path+'/messages/'+first.id+'/report',{});cases.push(report.caseId);
 await ok(sender,path+'/messages/'+first.id+'/withdraw',{});assert.equal((await call(peer,download)).status,404);assert.equal((await call(sender,path+'/audio',payload)).status,409);
 const evidence='/customer-service/admin/cases/'+report.caseId+'/message-audio-evidence';assert.equal((await call(outsider,evidence)).status,403);r=await call(owner,evidence);assert.equal(r.status,200);assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes);
 await db.$executeRaw`UPDATE "Message" SET "withdrawnAt"=now()-interval '31 days' WHERE id::text=${first.id}`;await review.purgeExpired();assert.equal((await db.$queryRaw`SELECT 1 FROM "PrivateMessageAudio" WHERE "messageId"::text=${first.id}`).length,1);
 await db.$executeRaw`UPDATE "MessageAbuseEvidence" SET "releasedAt"=now() WHERE "caseId"=${report.caseId}`;await review.purgeExpired();assert.equal((await db.$queryRaw`SELECT 1 FROM "PrivateMessageAudio" WHERE "messageId"::text=${first.id}`).length,0);assert.equal((await call(owner,evidence)).status,404);
 await db.managedDocument.update({where:{id:policyFixture.doc.id},data:{status:'APPROVED'}});
 const maximum=wav(4194304,22050),maxAudio=await ok(sender,path+'/audio',{...payload,requestKey:randomUUID().replaceAll('-',''),base64:maximum.toString('base64')});assert.equal(maxAudio.durationSec,Math.ceil((maximum.length-44)/44100));const maxResponse=await call(peer,path+'/messages/'+maxAudio.id+'/audio');assert.equal(maxResponse.status,200);assert.deepEqual(Buffer.from(await maxResponse.arrayBuffer()),maximum);
 const next=await ok(sender,path+'/audio',{...payload,requestKey:randomUUID().replaceAll('-','')});await db.session.update({where:{id:peer.session.id},data:{revokedAt:new Date()}});assert.equal((await call(peer,path+'/messages/'+next.id+'/audio')).status,401);
 console.log('D09 private audio HTTP/PostgreSQL passed: explicit D16 default-off, independent community/audio choice, source drift/retirement and authority revocation gates, preserved existing read/withdraw/evidence; PCM bytes, consent, concurrent retry, atomic notification rollback, exact 4 MiB upload, participant/session isolation, held retention and purge cascade.');
}finally{
 if(policyFixture)await policyFixture.cleanup();
 for(const caseId of cases){await db.$executeRaw`DELETE FROM "MessageAbuseEvidence" WHERE "caseId"=${caseId}`;await db.customerCase.deleteMany({where:{id:caseId}})}
 for(const id of conversations){await db.$executeRaw`DELETE FROM "WithdrawnMessageContent" WHERE "messageId" IN (SELECT id::text FROM "Message" WHERE "conversationId"::text=${id})`;await db.$executeRaw`DELETE FROM "Conversation" WHERE id::text=${id}`}
 if(org){if(previous)await db.operationalSetting.update({where:{key:previous.key},data:{value:previous.value}});else await db.operationalSetting.deleteMany({where:{key:'PLATFORM_STAFFING_ORGANIZATION:v1'}});await db.organization.delete({where:{id:org.id}})}
 await db.auditEvent.deleteMany({where:{actorId:{in:persons.map(p=>p.id)}}});for(const a of accounts){await db.notification.deleteMany({where:{accountId:a.id}});await db.session.deleteMany({where:{accountId:a.id}});await db.roleAssignment.deleteMany({where:{accountId:a.id}});await db.account.delete({where:{id:a.id}})}for(const p of persons)await db.person.delete({where:{id:p.id}});await db.$disconnect();
}
