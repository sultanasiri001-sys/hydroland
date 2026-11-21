import assert from 'node:assert/strict';
import {createHash,randomBytes,randomUUID,scryptSync} from 'node:crypto';

// Imported by the existing profile HTTP/PostgreSQL suite. All identities and
// the injected database failure belong to these disposable loopback fixtures.
export async function profilePrivacyAcceptance({db,base}){
  assert.equal(process.env.CI,'true');
  for(const source of [base,process.env.DATABASE_URL])assert(['localhost','127.0.0.1','[::1]'].includes(new URL(source).hostname));
  const fixture=randomUUID().replaceAll('-',''),accounts=[];
  const trigger='profile_privacy_'+fixture;
  let installed=false;
  const call=async(account,path,method='GET',body)=>{
    const response=await fetch(base+path,{method,headers:{...(account?{authorization:'Bearer '+account.token}:{}),...(body!==undefined?{'content-type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body)});
    return {response,body:await response.json()};
  };
  try{
    for(const label of ['A','B']){
      const password=randomBytes(24).toString('base64url'),salt=randomBytes(16).toString('hex');
      const account=await db.account.create({data:{email:`privacy-${fixture}-${label.toLowerCase()}@example.invalid`,passwordHash:salt+':'+scryptSync(password,salt,64).toString('hex'),status:'ACTIVE',emailVerifiedAt:new Date(),person:{create:{firstName:'Private-'+label,lastName:fixture,professional:{create:{headline:'Headline-'+label,bio:'BIO-'+label+'-'+fixture}}}},roleAssignments:{create:{role:'DIVER',status:'ACTIVE',scope:{privateScopeSentinel:fixture}}}}});
      accounts.push(account);
      const login=await call(null,'/auth/login','POST',{email:account.email,password});
      assert.equal(login.response.status,200);assert(login.body.accessToken);account.token=login.body.accessToken;
    }
    const [a,b]=accounts;
    await verifyPersonalDataRequests(db,call,a,b);
    await verifyTripRecords(db,call,a,b);
    await verifySentMessages(db,call,a,b);
    const secondBefore=await db.account.findUniqueOrThrow({where:{id:b.id},include:{person:{include:{professional:true}}}});
    const foreignCredential=await db.credential.create({data:{personId:b.personId,issuer:'Synthetic',title:'Foreign profile reference'}});
    assert.equal((await call(null,'/me/data-export','POST',{})).response.status,401);
    for(const body of [{accountId:b.id},{personId:b.personId},{scope:['ALL']},[],null])assert.equal((await call(a,'/me/data-export','POST',body)).response.status,400);
    for(const account of accounts){
      const {response,body}=await call(account,'/me/data-export','POST',{});
      assert.equal(response.status,201);assert.equal(response.headers.get('cache-control'),'private, no-store');
      assert.match(response.headers.get('content-disposition'),/attachment; filename="hydroland-account-profile.json"/);
      assert.equal(body.retentionPolicy.version,'0.1');
      assert.equal(body.retentionPolicy.activationCondition,'TECHNICAL_WORK_COMPLETED');
      assert.equal(body.retentionPolicy.effectiveFrom,null);
      assert.equal(body.retentionPolicy.automaticDeletionAuthorized,false);
      assert.equal(body.retentionPolicy.rules[0].basis,'DURATION_OF_ACCOUNT_SERVICE');
      assert.equal(body.data.id,account.id);assert.equal(body.data.email,account.email);
      assert.equal(body.completePlatformExport,false);assert(body.excludedDomains.includes('PAYMENTS'));
      const other=account===a?b:a,text=JSON.stringify(body);
      for(const forbidden of [other.id,other.email,'BIO-'+(account===a?'B':'A')+'-'+fixture,account.passwordHash,account.token,'privateScopeSentinel','passwordHash','refreshTokenHash','storageKey'])assert(!text.includes(forbidden),forbidden);
      const {receipt,...snapshot}=body;
      assert.equal(receipt.sha256,createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'));
      const audit=await db.auditEvent.findUniqueOrThrow({where:{id:receipt.auditEventId}});
      assert.equal(audit.action,'ACCOUNT_PROFILE_EXPORTED');assert.equal(audit.actorId,account.personId);assert.equal(audit.resourceId,account.id);assert.equal(audit.metadata.sha256,receipt.sha256);
      assert(!JSON.stringify(audit.metadata).includes(account.email));assert(!JSON.stringify(audit.metadata).includes('BIO-'));
    }
    assert.equal((await call(a,'/me','PATCH',{firstName:'Corrected',headline:'Changed headline'})).response.status,200);
    const correction=await db.auditEvent.findFirstOrThrow({where:{resourceId:a.id,action:'ACCOUNT_PROFILE_CORRECTED'},orderBy:{occurredAt:'desc'}});
    assert.equal(correction.actorId,a.personId);assert.deepEqual(correction.metadata.changedFields,['firstName','headline']);assert.equal(correction.metadata.source,'SELF_SERVICE');
    assert(!JSON.stringify(correction.metadata).includes('Corrected'));
    const snapshot=()=>db.account.findUniqueOrThrow({where:{id:a.id},include:{person:{include:{professional:true}}}});
    const beforeInvalid=await snapshot();
    for(const body of [{firstName:null},{firstName:[]},{firstName:' '},{firstName:'x'.repeat(81)},{status:'ACTIVE'},{accountId:b.id},{firstName:'X\u0000Y'},[]])assert.equal((await call(a,'/me','PATCH',body)).response.status,400);
    assert.equal((await call(a,'/me','PATCH',{qualificationCredentialId:foreignCredential.id})).response.status,400);
    assert.deepEqual(await snapshot(),beforeInvalid);
    await db.$executeRawUnsafe(`CREATE FUNCTION "${trigger}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF (NEW.action='PERSONAL_DATA_REQUEST_RECEIVED' AND NEW."actorId"='${a.personId}') OR (NEW.resource='Account' AND NEW."resourceId"='${a.id}' AND NEW.action IN ('ACCOUNT_PROFILE_CORRECTED','ACCOUNT_PROFILE_EXPORTED','PERSONAL_TRIP_RECORDS_EXPORTED','PERSONAL_SENT_MESSAGES_EXPORTED')) THEN RAISE EXCEPTION 'synthetic profile audit failure'; END IF; RETURN NEW; END $$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER "${trigger}" BEFORE INSERT ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION "${trigger}"()`);installed=true;
    const auditCount=await db.auditEvent.count({where:{resourceId:a.id}});
    assert.equal((await call(a,'/me','PATCH',{firstName:'Must roll back',bio:'Must roll back'})).response.status,500);
    assert.deepEqual(await snapshot(),beforeInvalid);
    const denied = requestBody('ERASURE','ACCOUNT');
    assert.equal((await call(a,'/me/data-requests','POST',denied)).response.status,500);
    assert.equal(await db.personalDataRequest.count({where:{requestKey:denied.requestKey}}),0);
    assert.equal((await call(a,'/me/data-export','POST',{})).response.status,500);
    assert.equal((await call(a,'/me/data-export/trip-records','POST',{domain:'PAYMENTS'})).response.status,500);
    assert.equal((await call(a,'/me/data-export/sent-messages','POST',{})).response.status,500);
    assert.equal(await db.auditEvent.count({where:{resourceId:a.id}}),auditCount);
    await db.$executeRawUnsafe(`DROP TRIGGER "${trigger}" ON "AuditEvent"`);installed=false;
    const racing=await Promise.all([call(a,'/me','PATCH',{firstName:'Concurrent name'}),call(a,'/me','PATCH',{headline:'Concurrent headline'})]);
    assert(racing.every(x=>x.response.status===200));
    const saved=await snapshot();assert.equal(saved.person.firstName,'Concurrent name');assert.equal(saved.person.professional.headline,'Concurrent headline');assert.equal(saved.person.professional.bio,beforeInvalid.person.professional.bio);
    assert.deepEqual(await db.account.findUniqueOrThrow({where:{id:b.id},include:{person:{include:{professional:true}}}}),secondBefore);
    await db.account.update({where:{id:a.id},data:{status:'SUSPENDED'}});
    assert.equal((await call(a,'/me/data-export','POST',{})).response.status,401);assert.equal((await call(a,'/me','PATCH',{firstName:'Blocked'})).response.status,401);
    assert.equal((await call(a,'/me/data-requests')).response.status,401);
    console.log('Account profile privacy HTTP/PostgreSQL: PASS; real logins, self-only export, explicit scope, no secrets/foreign account, private headers, receipt hash, correction audit, invalid/foreign-reference refusal, audit-failure rollback, concurrent partial edits and session revocation.');
  }finally{
    if(installed)await db.$executeRawUnsafe(`DROP TRIGGER "${trigger}" ON "AuditEvent"`);
    await db.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${trigger}"()`);
    for(const account of accounts){
      await db.auditEvent.deleteMany({where:{OR:[{actorId:account.personId},{resourceId:account.id}]}});
      await db.personalDataRequest.deleteMany({where:{accountId:account.id}});
      await db.notification.deleteMany({where:{accountId:account.id}});
      await db.session.deleteMany({where:{accountId:account.id}});
      await db.roleAssignment.deleteMany({where:{accountId:account.id}});
      await db.credential.deleteMany({where:{personId:account.personId}});
      await db.professionalProfile.deleteMany({where:{personId:account.personId}});
      await db.account.delete({where:{id:account.id}});await db.person.delete({where:{id:account.personId}});
    }
  }
}

function requestBody(kind,domain,recordRef=null) {
  return {requestKey:randomUUID(),kind,domain,recordRef,details:''};
}

async function verifyPersonalDataRequests(db,call,owner,other) {
  const path = '/me/data-requests';
  const input = {...requestBody('CORRECTION','ACCOUNT'),details:'Correct the spelling in my profile.'};
  const post = (actor,body) => call(actor,path,'POST',body);
  assert.equal((await post(null,input)).response.status,401);
  assert.equal((await call(null,path)).response.status,401);
  for (const invalid of [{details:''},{domain:'ALL'},{accountId:other.id},{recordRef:other.id},{requestKey:'invalid'}]) {
    assert.equal((await post(owner,{...input,...invalid})).response.status,400);
  }
  const [first,retry] = await Promise.all([post(owner,input),post(owner,input)]);
  assert.equal(first.response.status,201); assert.equal(retry.response.status,201);
  assert.equal(first.body.id,retry.body.id); assert.equal(first.body.status,'RECEIVED');
  assert.equal(first.response.headers.get('cache-control'),'private, no-store');
  assert.equal((await post(owner,{...input,details:'Changed request'})).response.status,409);
  assert.equal((await post(owner,requestBody('ERASURE','BOOKINGS',randomUUID()))).response.status,404);
  const listing = await call(owner,path);
  assert.equal(listing.response.headers.get('cache-control'),'private, no-store');
  assert.deepEqual(listing.body,{items:[first.body],more:false});
  assert.deepEqual((await call(other,path)).body,{items:[],more:false});
  assert.equal((await call(owner,path+'?page=0')).response.status,400);
  assert.deepEqual((await call(owner,path+'?page=2')).body,{items:[],more:false});
  const events = await db.auditEvent.findMany({where:{action:'PERSONAL_DATA_REQUEST_RECEIVED',resourceId:first.body.id}});
  assert.equal(events.length,1); assert.equal(events[0].actorId,owner.personId);
  assert.deepEqual(events[0].metadata,{kind:'CORRECTION',domain:'ACCOUNT'});
}

async function verifyTripRecords(db, call, owner, other) {
  const trip = await db.trip.create({data:{title:'Privacy fixture',type:'SHORE',capacity:200,startsAt:new Date(),endsAt:new Date(Date.now()+3600000)}});
  const org = await db.organization.create({data:{displayName:'Privacy fixture',kind:'OTHER',ownerId:owner.id}});
  const exportPage = (actor, body) => call(actor, '/me/data-export/trip-records', 'POST', body);
  try {
    const ids = Array.from({length:101}, () => randomUUID()).sort();
    await db.booking.createMany({data:ids.map(id=>({id,tripId:trip.id,accountId:owner.id}))});
    const foreign = await db.booking.create({data:{tripId:trip.id,accountId:other.id}});
    const group = await db.booking.create({data:{tripId:trip.id,accountId:owner.id,organizationId:org.id}});
    const payment = (bookingId,accountId) => db.payment.create({data:{bookingId,accountId,amountMinor:1280,currency:'SAR',idempotencyKey:randomUUID(),providerReference:randomUUID()}});
    const owned = await payment(ids[0],owner.id);
    const excludedPayments = [await payment(foreign.id,other.id),await payment(group.id,owner.id),await payment(ids[0],other.id)];
    for (const [domain,ref,expected] of [
      ['BOOKINGS',ids[0],201], ['BOOKINGS',foreign.id,404], ['BOOKINGS',group.id,404],
      ['PAYMENTS',owned.id,201], ...excludedPayments.map(p=>['PAYMENTS',p.id,404]),
    ]) {
      const result = await call(owner,'/me/data-requests','POST',requestBody('ERASURE',domain,ref));
      assert.equal(result.response.status,expected,domain);
    }
    assert.deepEqual(await db.payment.findUniqueOrThrow({where:{id:owned.id}}),owned);
    const first = await exportPage(owner,{domain:'BOOKINGS'});
    assert.equal(first.response.status,201);assert.equal(first.response.headers.get('cache-control'),'private, no-store');
    assert.equal(first.body.retentionPolicy.rules[0].months,12);
    assert.equal(first.body.retentionPolicy.rules[0].startEvent,'LATEST_OF_COMPLETION_CANCELLATION_SETTLEMENT');
    assert.deepEqual(first.body.records.map(row=>row.id),ids.slice(0,100));
    const second = await exportPage(owner,{domain:'BOOKINGS',after:first.body.nextCursor});
    assert.deepEqual(second.body.records.map(row=>row.id),ids.slice(100));assert.equal(second.body.nextCursor,null);
    const {body}=await exportPage(owner,{domain:'PAYMENTS'});
    assert.equal(body.completePlatformExport,false);assert.equal(body.accountId,owner.id);
    assert.deepEqual(body.retentionPolicy.rules.map(rule=>[rule.basis,rule.years]),[['CONDITIONAL_MINIMUM',10],['CONDITIONAL_MINIMUM',6]]);
    assert.equal(body.retentionPolicy.recordLevelDispositionAssessed,false);
    assert.deepEqual(body.records.map(row=>row.id),[owned.id]);assert.equal(body.records[0].amountMinor,1280);
    assert.deepEqual(Object.keys(body.records[0]).sort(),['id','bookingId','amountMinor','currency','status','createdAt','updatedAt'].sort());
    const {receipt,...snapshot}=body;
    assert.equal(receipt.sha256,createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'));
    const audit=await db.auditEvent.findUniqueOrThrow({where:{id:receipt.auditEventId}});
    assert.equal(audit.action,'PERSONAL_TRIP_RECORDS_EXPORTED');assert.equal(audit.actorId,owner.personId);
    assert.deepEqual(audit.metadata,{domain:'PAYMENTS',count:1,sha256:receipt.sha256});
    assert.equal((await exportPage(owner,{domain:'UNKNOWN'})).response.status,400);
    assert.equal((await exportPage(null,{domain:'BOOKINGS'})).response.status,401);
  } finally {
    await db.payment.deleteMany({where:{booking:{tripId:trip.id}}});
    await db.booking.deleteMany({where:{tripId:trip.id}});
    await db.trip.delete({where:{id:trip.id}});await db.organization.delete({where:{id:org.id}});
  }
}

async function verifySentMessages(db, call, owner, other) {
  const page = (actor, body = {}) => call(actor, '/me/data-export/sent-messages', 'POST', body);
  const conversation = await call(owner, '/messages/conversations', 'POST', {participantAccountIds:[other.id]});
  assert.equal(conversation.response.status, 201);
  const id = conversation.body.id;
  const ids = Array.from({length:101}, () => randomUUID()).sort();
  try {
    // Use the deployed message contract for voice and received text; batch the paging fixture.
    const sent = await call(owner, '/messages/conversations/'+id+'/messages', 'POST',
      {kind:'VOICE',mediaUrl:'https://example.invalid/private-audio?signature=fixture',durationSec:12});
    assert.equal(sent.response.status, 201);
    const received = await call(other, '/messages/conversations/'+id+'/messages', 'POST', {body:'Private reply from peer'});
    assert.equal(received.response.status, 201);
    const requestMessage = ref => call(owner,'/me/data-requests','POST',requestBody('ERASURE','SENT_MESSAGES',ref));
    assert.equal((await requestMessage(sent.body.id)).response.status,201);
    assert.equal((await requestMessage(received.body.id)).response.status,404);
    await db.$executeRaw`
      INSERT INTO "Message" ("id","conversationId","senderAccountId","kind","body")
      SELECT (jsonb_populate_record(NULL::"Message",jsonb_build_object('id',source)))."id", c."id", c."createdByAccountId", 'TEXT', 'Owned text'
      FROM unnest(${ids}::text[]) AS source CROSS JOIN "Conversation" c WHERE c."id"::text = ${id}`;
    assert.equal((await page(null)).response.status,401);
    for (const input of [{accountId:other.id},{domain:'ALL'},{after:31},{after:'x'.repeat(201)}]) {
      assert.equal((await page(owner,input)).response.status,400);
    }
    const first = await page(owner);
    assert.equal(first.response.status,201);
    assert.equal(first.response.headers.get('cache-control'),'private, no-store');
    assert.equal(first.body.records.length,100);
    assert.equal(first.body.nextCursor,first.body.records.at(-1).id);
    const last = await page(owner,{after:first.body.nextCursor});
    assert.equal(last.body.nextCursor,null);
    const records = [...first.body.records,...last.body.records];
    assert.deepEqual(records.map(row=>row.id), [...ids,sent.body.id].sort());
    const voice = records.find(row=>row.kind==='VOICE');
    assert.equal(voice.durationSec,12); assert.equal(voice.body,null);
    for (const row of records) {
      assert.deepEqual(Object.keys(row).sort(),['id','conversationId','kind','body','durationSec','createdAt'].sort());
      if (row.kind==='TEXT') assert.equal(row.body,'Owned text');
    }
    assert.deepEqual((await page(other)).body.records.map(row=>row.id),[received.body.id]);
    const {receipt,...snapshot}=first.body;
    const [tripRule, privateRule] = snapshot.retentionPolicy.rules;
    assert.equal(tripRule.days,90);assert.equal(tripRule.appliesWhen,'TRIP_COORDINATION_CONVERSATION');
    assert.equal(privateRule.basis,'RESTRICTED_AFTER_SENDER_WITHDRAWAL');assert.equal(privateRule.days,30);
    assert.equal(snapshot.accountId,owner.id);assert.equal(snapshot.schemaVersion,'PERSONAL_SENT_MESSAGES_V1');
    assert.equal(receipt.sha256,createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'));
    const audit=await db.auditEvent.findUniqueOrThrow({where:{id:receipt.auditEventId}});
    assert.equal(audit.action,'PERSONAL_SENT_MESSAGES_EXPORTED');
    assert.deepEqual(audit.metadata,{domain:'SENT_MESSAGES',count:100,sha256:receipt.sha256});
    await db.$executeRaw`DELETE FROM "ConversationParticipant" WHERE "conversationId"::text=${id} AND "accountId"::text=${owner.id}`;
    assert.deepEqual((await page(owner)).body.records,[]);
    assert.equal((await requestMessage(sent.body.id)).response.status,404);
  } finally {
    await db.$executeRaw`DELETE FROM "Conversation" WHERE "id"::text=${id}`;
  }
}
