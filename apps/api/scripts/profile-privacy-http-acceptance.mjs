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
      const account=await db.account.create({data:{email:`privacy-${fixture}-${label}@example.invalid`,passwordHash:salt+':'+scryptSync(password,salt,64).toString('hex'),status:'ACTIVE',emailVerifiedAt:new Date(),person:{create:{firstName:'Private-'+label,lastName:fixture,professional:{create:{headline:'Headline-'+label,bio:'BIO-'+label+'-'+fixture}}}},roleAssignments:{create:{role:'DIVER',status:'ACTIVE',scope:{privateScopeSentinel:fixture}}}}});
      accounts.push(account);
      const login=await call(null,'/auth/login','POST',{email:account.email,password});
      assert.equal(login.response.status,201);assert(login.body.accessToken);account.token=login.body.accessToken;
    }
    const [a,b]=accounts;
    const secondBefore=await db.account.findUniqueOrThrow({where:{id:b.id},include:{person:{include:{professional:true}}}});
    const foreignCredential=await db.credential.create({data:{personId:b.personId,issuer:'Synthetic',title:'Foreign profile reference'}});
    assert.equal((await call(null,'/me/data-export','POST',{})).response.status,401);
    for(const body of [{accountId:b.id},{personId:b.personId},{scope:['ALL']},[],null])assert.equal((await call(a,'/me/data-export','POST',body)).response.status,400);
    for(const account of accounts){
      const {response,body}=await call(account,'/me/data-export','POST',{});
      assert.equal(response.status,201);assert.equal(response.headers.get('cache-control'),'private, no-store');
      assert.match(response.headers.get('content-disposition'),/attachment; filename="hydroland-account-profile.json"/);
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
    await db.$executeRawUnsafe(`CREATE FUNCTION "${trigger}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.resource='Account' AND NEW."resourceId"='${a.id}' AND NEW.action IN ('ACCOUNT_PROFILE_CORRECTED','ACCOUNT_PROFILE_EXPORTED') THEN RAISE EXCEPTION 'synthetic profile audit failure'; END IF; RETURN NEW; END $$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER "${trigger}" BEFORE INSERT ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION "${trigger}"()`);installed=true;
    const auditCount=await db.auditEvent.count({where:{resourceId:a.id}});
    assert.equal((await call(a,'/me','PATCH',{firstName:'Must roll back',bio:'Must roll back'})).response.status,500);
    assert.deepEqual(await snapshot(),beforeInvalid);
    assert.equal((await call(a,'/me/data-export','POST',{})).response.status,500);
    assert.equal(await db.auditEvent.count({where:{resourceId:a.id}}),auditCount);
    await db.$executeRawUnsafe(`DROP TRIGGER "${trigger}" ON "AuditEvent"`);installed=false;
    const racing=await Promise.all([call(a,'/me','PATCH',{firstName:'Concurrent name'}),call(a,'/me','PATCH',{headline:'Concurrent headline'})]);
    assert(racing.every(x=>x.response.status===200));
    const saved=await snapshot();assert.equal(saved.person.firstName,'Concurrent name');assert.equal(saved.person.professional.headline,'Concurrent headline');assert.equal(saved.person.professional.bio,beforeInvalid.person.professional.bio);
    assert.deepEqual(await db.account.findUniqueOrThrow({where:{id:b.id},include:{person:{include:{professional:true}}}}),secondBefore);
    await db.account.update({where:{id:a.id},data:{status:'SUSPENDED'}});
    assert.equal((await call(a,'/me/data-export','POST',{})).response.status,401);assert.equal((await call(a,'/me','PATCH',{firstName:'Blocked'})).response.status,401);
    console.log('Account profile privacy HTTP/PostgreSQL: PASS; real logins, self-only export, explicit scope, no secrets/foreign account, private headers, receipt hash, correction audit, invalid/foreign-reference refusal, audit-failure rollback, concurrent partial edits and session revocation.');
  }finally{
    if(installed)await db.$executeRawUnsafe(`DROP TRIGGER "${trigger}" ON "AuditEvent"`);
    await db.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${trigger}"()`);
    for(const account of accounts){
      await db.auditEvent.deleteMany({where:{OR:[{actorId:account.personId},{resourceId:account.id}]}});
      await db.session.deleteMany({where:{accountId:account.id}});
      await db.roleAssignment.deleteMany({where:{accountId:account.id}});
      await db.credential.deleteMany({where:{personId:account.personId}});
      await db.professionalProfile.deleteMany({where:{personId:account.personId}});
      await db.account.delete({where:{id:account.id}});await db.person.delete({where:{id:account.personId}});
    }
  }
}
