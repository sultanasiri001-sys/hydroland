const assert=require('node:assert/strict');
const {test}=require('node:test');
const {PolicyControlService}=require('../dist/trips/policy-control.service');
const {binding}=require('./mandatory-policy-fixture.cjs');

function fixture({failAudit=false,adoptOnEntry=false,absent=false}={}){
 let saved={rows:absent?[]:[{id:'synthetic-policy',category:'SYNTHETIC',ruleKey:'TEST',labelAr:'Synthetic policy',state:'ENABLED',metadata:{source:'preserved'}}],audits:[]};
 const calls=[];
 const db={serializable:async work=>{
  if(adoptOnEntry&&saved.rows[0])saved.rows[0].metadata=binding('SYNTHETIC','TEST');
  const state=structuredClone(saved);
  const tx={$queryRaw:async(strings,...args)=>{
   const sql=strings.join('?');calls.push(sql);
   if(sql.trim().startsWith('SELECT')){assert.match(sql,/FOR UPDATE/);return structuredClone(state.rows);}
   if(sql.trim().startsWith('UPDATE')){state.rows[0].state=args[0];return structuredClone(state.rows);}
   assert.match(sql,/INSERT INTO "PolicyControl"/);
   const [category,ruleKey,labelAr,labelEn,newState,description]=args;
   const row=state.rows[0]??{id:'synthetic-new',category,ruleKey};
   Object.assign(row,{labelAr,labelEn,state:newState,description});state.rows=[row];return structuredClone(state.rows);
  }};
  tx.record=async(data,client)=>{assert.equal(client,tx);if(failAudit)throw Error('synthetic audit failure');state.audits.push(data);};
  const result=await work(tx);saved=state;return result;
 }};
 const audit={record:async(data,tx)=>{assert(tx);return tx.record(data,tx);}};
 return {service:new PolicyControlService(db,audit),snapshot:()=>structuredClone(saved),calls};
}

test('legacy state update commits its attributed audit with the same transaction',async()=>{
 const f=fixture();const result=await f.service.setState('synthetic-actor','SYNTHETIC','TEST','DISABLED','Synthetic controlled change');
 assert.equal(result.state,'DISABLED');const s=f.snapshot();assert.equal(s.audits.length,1);assert.equal(s.audits[0].actorId,'synthetic-actor');
 assert.equal(s.audits[0].metadata.previousState,'ENABLED');assert.equal(s.audits[0].metadata.state,'DISABLED');assert.deepEqual(s.rows[0].metadata,{source:'preserved'});
});
test('audit failure rolls back the legacy state update',async()=>{
 const f=fixture({failAudit:true}),before=f.snapshot();
 await assert.rejects(f.service.setState('synthetic-actor','SYNTHETIC','TEST','DISABLED','Synthetic controlled change'),/synthetic audit failure/);
 assert.deepEqual(f.snapshot(),before);
});
for(const absent of [false,true])test('audit failure rolls back policy upsert '+(absent?'creation':'replacement'),async()=>{
 const f=fixture({failAudit:true,absent}),before=f.snapshot();
 await assert.rejects(f.service.upsert('synthetic-actor',{category:'SYNTHETIC',ruleKey:'TEST',labelAr:'Changed synthetic label',state:'DISABLED'}),/synthetic audit failure/);
 assert.deepEqual(f.snapshot(),before);
});
test('successful upsert attributes its native audit and preserves existing metadata',async()=>{
 const f=fixture();await f.service.upsert('synthetic-actor',{category:'SYNTHETIC',ruleKey:'TEST',labelAr:'Changed synthetic label',state:'REVIEW'});
 const s=f.snapshot();assert.equal(s.audits[0].actorId,'synthetic-actor');assert.equal(s.audits[0].action,'POLICY_RULE_UPSERTED');assert.deepEqual(s.rows[0].metadata,{source:'preserved'});
});
for(const method of ['setState','upsert'])test(method+' reads an adoption made before transaction entry and refuses weakening',async()=>{
 const f=fixture({adoptOnEntry:true});
 await assert.rejects(method==='setState'?f.service.setState('synthetic-actor','SYNTHETIC','TEST','DISABLED'):f.service.upsert('synthetic-actor',{category:'SYNTHETIC',ruleKey:'TEST',labelAr:'Synthetic',state:'DISABLED'}),e=>e.getStatus()===403);
 assert.equal(f.snapshot().rows[0].state,'ENABLED');assert.equal(f.snapshot().audits.length,0);assert.equal(f.calls.length,1);
});
test('missing policy and protected domains never write or audit',async()=>{
 const f=fixture({absent:true});await assert.rejects(f.service.setState('actor','SYNTHETIC','TEST','DISABLED'),e=>e.getStatus()===404);
 const reads=f.calls.length;
 for(const category of ['HR_COMPLIANCE','TRAINING_STANDARD_PROFILE']){
  await assert.rejects(f.service.setState('actor',category,'TEST','ENABLED'),e=>e.getStatus()===403);
  await assert.rejects(f.service.upsert('actor',{category,ruleKey:'TEST',labelAr:'Synthetic'}),e=>e.getStatus()===403);
 }
 assert.equal(f.calls.length,reads);assert.deepEqual(f.snapshot(),{rows:[],audits:[]});
});
