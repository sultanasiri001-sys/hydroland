'use strict';
const assert=require('node:assert/strict');
const {DocumentTemplateSetupController}=require('../dist/document-forms/document-template-setup.controller');
const {buildDepartmentTemplateCatalog}=require('../dist/document-forms/document-template-catalog');
const {buildOperationalDocumentCatalog}=require('../dist/document-forms/operational-document-catalog');
const {buildHrDocumentCatalog}=require('../dist/document-forms/hr-document-catalog');
const request={auth:{accountId:'owner'}},org='internal';
const sources=[...buildDepartmentTemplateCatalog(org),...buildOperationalDocumentCatalog(org),...buildHrDocumentCatalog(org)];
function fixture(){
 const state={rows:[],audit:[],owner:'owner',kind:'HYDROLAND_INTERNAL_PLATFORM',status:'ACTIVE',pointer:org,denied:false,failAudit:false,calls:[]};
 const tx={
  operationalSetting:{findUnique:async()=>({value:{organizationId:state.pointer}})},
  organization:{findUnique:async()=>({ownerId:state.owner,kind:state.kind,status:state.status})},
  account:{findUniqueOrThrow:async()=>({personId:'owner-person'})},
  documentTemplate:{
   findMany:async q=>{state.calls.push('read');return state.rows.filter(r=>r.organizationId===q.where.organizationId&&q.where.code.in.includes(r.code)).map(({id,code,department,version,status})=>({id,code,department,version,status})).sort((a,b)=>a.code.localeCompare(b.code)||a.version-b.version);},
   createMany:async q=>{state.calls.push('create');for(const r of q.data){if(state.rows.some(x=>x.organizationId===r.organizationId&&x.code===r.code&&x.version===r.version))throw Object.assign(new Error('unique conflict'),{code:'P2002'});state.rows.push({...structuredClone(r),id:'created-'+r.code});}return {count:q.data.length};}
  },
  auditEvent:{create:async q=>{if(state.failAudit)throw new Error('audit unavailable');state.audit.push(structuredClone(q.data));return {id:'audit'};}}
 };
 const db={serializable:async f=>{const rows=structuredClone(state.rows),audit=structuredClone(state.audit);try{return await f(tx);}catch(e){state.rows=rows;state.audit=audit;throw e;}}};
 const authorization={assert:async(actor,id,action,client)=>{state.calls.push('authorize');assert.equal(action,'TEMPLATE_CREATE');assert.equal(client,tx);if(state.denied)throw Error('forbidden');}};
 const controller=new DocumentTemplateSetupController(db,authorization);
 const plan=d=>controller.plan(request,org,d),apply=(p,extra={})=>controller.apply(request,org,{department:p.department,expectedPlanHash:p.planHash,confirmed:true,...extra});
 return {state,plan,apply,controller};
}
const row=(t,overrides={})=>({...structuredClone(t),id:'saved-'+t.code,status:'ACTIVE',...overrides});
let count=0;
async function check(name,test){await test();console.log('PASS '+name);count++;}
(async()=>{
 await check('60 known definitions across 14 departments; GET never writes',async()=>{const f=fixture(),p=await f.plan();assert.equal(p.summary.source,60);assert.equal(p.summary.missing,60);assert.equal(new Set(p.items.map(t=>t.department)).size,14);assert.equal(p.items.filter(t=>t.department==='HR').length,21);assert.equal(f.state.rows.length,0);assert.equal(f.state.audit.length,0);assert.equal(p.specializedContractsIncluded,false);assert.equal(p.completeDocumentInventoryVerified,false);});
 await check('existing 22 forms and four specialized contracts require only 38 new forms',async()=>{const f=fixture();f.state.rows=sources.filter(t=>t.department==='HR'||t.code==='LEG-LEGAL-REPORT').map(t=>row(t));for(const code of ['CLIB-HR-PERMANENT','CLIB-HR-FLEXIBLE','CLIB-HR-TEMPORARY','CLIB-DIVE-COOPERATION'])f.state.rows.push(row(sources[0],{id:code,code,department:'LEGAL_CONTRACTS_INSURANCE'}));const before=structuredClone(f.state.rows),p=await f.plan();assert.equal(p.summary.ready,22);assert.equal(p.summary.missing,38);const r=await f.apply(p);assert.equal(r.created,38);assert.equal(f.state.rows.length,64);assert.deepEqual(f.state.rows.slice(0,before.length),before);assert.equal(f.state.audit.length,1);assert.equal(f.state.audit[0].actorId,'owner-person');assert.equal(f.state.audit[0].metadata.createdCodes.length,38);});
 await check('fresh repeat creates neither duplicates nor a false audit event',async()=>{const f=fixture();await f.apply(await f.plan());const p=await f.plan(),r=await f.apply(p);assert.equal(p.summary.missing,0);assert.equal(r.created,0);assert.equal(f.state.rows.length,60);assert.equal(f.state.audit.length,1);});
 await check('department scope creates only its own three definitions',async()=>{const f=fixture(),p=await f.plan('MARINE_OPERATIONS');assert.equal(p.summary.source,3);await f.apply(p);assert.ok(f.state.rows.every(r=>r.department==='MARINE_OPERATIONS'));});
 await check('inactive history is retained rather than reactivated',async()=>{const f=fixture();f.state.rows=[row(sources[0],{status:'INACTIVE',version:3})];const before=structuredClone(f.state.rows[0]),p=await f.plan();assert.equal(p.summary.inactive,1);await f.apply(p);assert.equal(f.state.rows.length,60);assert.deepEqual(f.state.rows[0],before);});
 await check('department collision blocks the complete transaction',async()=>{const f=fixture();f.state.rows=[row(sources[0],{department:'UNEXPECTED'})];const p=await f.plan();assert.equal(p.summary.conflicts,1);await assert.rejects(f.apply(p),/تعارضات/);assert.equal(f.state.rows.length,1);assert.equal(f.state.audit.length,0);});
 await check('multiple active versions block setup',async()=>{const f=fixture();f.state.rows=[row(sources[0]),row(sources[0],{id:'v2',version:2})];const p=await f.plan();assert.equal(p.summary.conflicts,1);await assert.rejects(f.apply(p),/تعارضات/);});
 await check('stale reviewed plan is rejected without any partial inserts',async()=>{const f=fixture(),p=await f.plan();f.state.rows.push(row(sources[0]));await assert.rejects(f.apply(p),/تغير حصر/);assert.equal(f.state.rows.length,1);assert.equal(f.state.audit.length,0);});
 await check('audit failure rolls back the entire batch in the transaction fixture',async()=>{const f=fixture(),p=await f.plan();f.state.failAudit=true;await assert.rejects(f.apply(p),/audit unavailable/);assert.equal(f.state.rows.length,0);assert.equal(f.state.audit.length,0);});
 await check('authorization occurs before reading templates',async()=>{const f=fixture();f.state.denied=true;await assert.rejects(f.plan(),/forbidden/);assert.deepEqual(f.state.calls,['authorize']);});
 for(const field of ['owner','kind','status','pointer'])await check('wrong internal '+field+' refuses setup',async()=>{const f=fixture();f.state[field]='other';await assert.rejects(f.plan(),/مالك جهة/);assert.equal(f.state.calls.includes('read'),false);});
 await check('authorization is checked again after preview',async()=>{const f=fixture(),p=await f.plan();f.state.denied=true;await assert.rejects(f.apply(p),/forbidden/);assert.equal(f.state.rows.length,0);});
 await check('confirmation, hash, extra fields and scope are strictly validated',async()=>{const f=fixture(),p=await f.plan();for(const changes of [{confirmed:false},{expectedPlanHash:'bad'},{fields:[]},{department:'NOT_A_DEPARTMENT'}])await assert.rejects(f.apply(p,changes));for(const d of ['',null,['HR'],'__proto__'])await assert.rejects(async()=>f.plan(d));assert.equal(f.state.rows.length,0);});
 await check('foreign organization templates never suppress this organization definitions',async()=>{const f=fixture();f.state.rows=[row(sources[0],{organizationId:'foreign'})];const p=await f.plan();assert.equal(p.summary.missing,60);await f.apply(p);assert.equal(f.state.rows.length,61);});
 console.log(`${count} synthetic add-only template setup checks passed; no production or real database acceptance claimed.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
