const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {ProfileService}=require('../dist/profile/profile.service');

function fixture({failAudit=false,status='ACTIVE',foreignCredential=false}={}){
 let saved={account:{id:'self',personId:'person-self',status,email:'self@example.invalid',person:{firstName:'Before',lastName:'Kept',professional:{bio:'Kept biography'}}},events:[]};
 const db={serializable:async work=>{
  const state=structuredClone(saved);
  const tx={account:{findUnique:async()=>state.account,update:async({where,data})=>{
   assert.equal(where.id,'self');const patch=data.person.update;
   for(const key of ['firstName','lastName','phone'])if(patch[key]!==undefined)state.account.person[key]=patch[key];
   Object.assign(state.account.person.professional,Object.fromEntries(Object.entries(patch.professional.upsert.update).filter(([,v])=>v!==undefined)));
   return state.account;
  }},credential:{findFirst:async()=>foreignCredential?null:{id:'own'}}};
  tx.record=async input=>{if(failAudit)throw Error('Audit unavailable');const event={id:'receipt-'+state.events.length,...input};state.events.push(event);return event;};
  const result=await work(tx);saved=state;return result;
 }};
 const audit={record:async(input,tx)=>{assert(tx);return tx.record(input);}};
 return {service:new ProfileService(db,audit),snapshot:()=>structuredClone(saved)};
}
test('profile correction and attributed audit commit together without storing profile values in metadata',async()=>{
 const f=fixture();await f.service.update('self',{firstName:'  Corrected  ',headline:'New headline'});
 assert.equal(f.snapshot().account.person.firstName,'Corrected');assert.equal(f.snapshot().account.person.lastName,'Kept');assert.equal(f.snapshot().account.person.professional.bio,'Kept biography');
 const event=f.snapshot().events[0];assert.equal(event.actorId,'self');assert.equal(event.resourceId,'self');assert.deepEqual(event.metadata,{changedFields:['firstName','headline'],source:'SELF_SERVICE'});
});
test('a failed audit rolls profile correction back',async()=>{
 const f=fixture({failAudit:true}),before=f.snapshot();await assert.rejects(f.service.update('self',{firstName:'Rejected',bio:'Rejected'}),/Audit unavailable/);assert.deepEqual(f.snapshot(),before);
});
test('profile updates refuse malformed, oversized, protected and foreign credential input',async()=>{
 const f=fixture({foreignCredential:true}),before=f.snapshot();
 for(const bad of [null,[],{},true,{firstName:''},{firstName:'X'.repeat(81)},{bio:{}},{phone:null},{status:'ACTIVE'},{accountId:'other'},{nationalLicenseCredentialId:'foreign'},{eligibilityEvidenceReference:'X\nY'}])await assert.rejects(f.service.update('self',bad),e=>e.getStatus()===400);
 assert.deepEqual(f.snapshot(),before);
});
test('export receipt hashes exactly the delivered scoped snapshot, without raw profile data in audit',async()=>{
 const f=fixture();const exported=await f.service.exportAccount('self',{});const {receipt,...snapshot}=exported;
 assert.equal(exported.data.id,'self');assert.equal(exported.completePlatformExport,false);assert(exported.excludedDomains.includes('PAYMENTS'));
 assert.equal(receipt.sha256,createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'));
 const event=f.snapshot().events[0];assert.equal(event.action,'ACCOUNT_PROFILE_EXPORTED');assert.equal(event.actorId,'self');assert.equal(event.metadata.sha256,receipt.sha256);assert(!JSON.stringify(event.metadata).includes('self@example.invalid'));
});
test('audit failure withholds the export and target-account/scope injection is refused',async()=>{
 const f=fixture({failAudit:true});await assert.rejects(f.service.exportAccount('self',{}),/Audit unavailable/);assert.equal(f.snapshot().events.length,0);
 for(const bad of [null,[],{accountId:'other'},{scope:['ALL']}])await assert.rejects(f.service.exportAccount('self',bad),e=>e.getStatus()===400);
});
test('a no-longer-active account cannot correct or export data',async()=>{
 const f=fixture({status:'SUSPENDED'});await assert.rejects(f.service.exportAccount('self',{}),e=>e.getStatus()===401);await assert.rejects(f.service.update('self',{firstName:'Rejected'}),e=>e.getStatus()===401);assert.equal(f.snapshot().events.length,0);
});
