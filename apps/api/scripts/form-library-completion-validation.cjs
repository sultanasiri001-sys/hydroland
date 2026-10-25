'use strict';
const assert=require('node:assert/strict');
const {DocumentTemplateCompletionController}=require('../dist/document-forms/document-template-completion.controller');
const {buildDepartmentTemplateCatalog}=require('../dist/document-forms/document-template-catalog');
const {buildOperationalDocumentCatalog}=require('../dist/document-forms/operational-document-catalog');
const {buildHrDocumentCatalog}=require('../dist/document-forms/hr-document-catalog');
const request={auth:{accountId:'owner'}},org='internal';
const {reviewedAdministrativeTemplates,legacyAdministrativeTemplates,administrativeFormGuidance,ADMINISTRATIVE_FORM_FAMILIES}=require('../dist/document-forms/administrative-form-catalog');
const sources=legacyAdministrativeTemplates(org),targets=reviewedAdministrativeTemplates(org);
function fixture(){
 const state={rows:[],audit:[],owner:'owner',kind:'HYDROLAND_INTERNAL_PLATFORM',status:'ACTIVE',pointer:org,denied:false,failAudit:false,calls:[]};
 const tx={
  operationalSetting:{findUnique:async()=>({value:{organizationId:state.pointer}})},
  organization:{findUnique:async()=>({ownerId:state.owner,kind:state.kind,status:state.status})},
  account:{findUniqueOrThrow:async()=>({personId:'owner-person'})},
  documentTemplate:{
   findMany:async q=>{state.calls.push('read');return state.rows.filter(r=>r.organizationId===q.where.organizationId&&q.where.code.in.includes(r.code)).map(r=>structuredClone(r)).sort((a,b)=>a.code.localeCompare(b.code)||a.version-b.version);},
   updateMany:async q=>{const row=state.rows.find(r=>r.id===q.where.id&&r.status===q.where.status&&r.version===q.where.version);if(!row)return {count:0};Object.assign(row,q.data);return {count:1};},
   create:async q=>{state.calls.push('create');const r=q.data;if(state.rows.some(x=>x.organizationId===r.organizationId&&x.code===r.code&&x.version===r.version))throw Object.assign(new Error('unique conflict'),{code:'P2002'});state.rows.push({...structuredClone(r),id:'created-'+r.code+'-'+r.version});return state.rows.at(-1);}
  },
  auditEvent:{create:async q=>{if(state.failAudit)throw new Error('audit unavailable');state.audit.push(structuredClone(q.data));return {id:'audit'};}}
 };
 const db={serializable:async f=>{const rows=structuredClone(state.rows),audit=structuredClone(state.audit);try{return await f(tx);}catch(e){state.rows=rows;state.audit=audit;throw e;}}};
 const authorization={assert:async(actor,id,action,client)=>{state.calls.push('authorize');assert.ok(['TEMPLATE_CREATE','TEMPLATE_UPDATE'].includes(action));assert.equal(client,tx);if(state.denied)throw Error('forbidden');}};
 const controller=new DocumentTemplateCompletionController(db,authorization);
 const plan=d=>controller.plan(request,org,d),apply=(p,extra={})=>controller.apply(request,org,{department:p.department,expectedPlanHash:p.planHash,confirmed:true,...extra});
 return {state,plan,apply,controller};
}
const row=(t,overrides={})=>({...structuredClone(t),id:'saved-'+t.code,status:'ACTIVE',...overrides});
let count=0;
async function check(name,test){await test();console.log('PASS '+name);count++;}
(async()=>{
 await check('catalog covers all 14 departments and documented extension families',async()=>{
  assert.equal(sources.length,60);assert.equal(targets.length,157);assert.equal(new Set(targets.map(t=>t.code)).size,157);
  const {templateFields}=require('../dist/document-forms/document-template-input');
  for(const t of targets){templateFields(t.fields);assert.ok(!t.code.startsWith('CLIB-'));assert.ok(administrativeFormGuidance(t.code));}
  for(const [department,families] of Object.entries(ADMINISTRATIVE_FORM_FAMILIES)){
   assert.ok(targets.some(t=>t.department===department));
   if(department!=='HR')for(const family of families)assert.ok(targets.some(t=>t.department===department&&administrativeFormGuidance(t.code).family===family),department+' '+family);
  }
  for(const code of ['ADM-MEETING-MINUTES','EXE-FOLLOWUP'])assert.deepEqual(targets.find(t=>t.code===code).fields,sources.find(t=>t.code===code).fields);
 });
 await check('preview reads the actual persisted definition without writing',async()=>{const f=fixture(),p=await f.plan();assert.equal(p.summary.source,157);assert.equal(p.summary.create,157);assert.equal(f.state.rows.length,0);assert.equal(f.state.audit.length,0);assert.equal(p.existingDocumentsPreserved,true);assert.equal(p.specializedContractsIncluded,false);assert.equal(p.completeDocumentInventoryVerified,false);});
 await check('60 original definitions yield 97 new and 58 version upgrades',async()=>{const f=fixture();f.state.rows=sources.map(t=>row(t));const before=structuredClone(f.state.rows),p=await f.plan();assert.equal(p.summary.ready,2);assert.equal(p.summary.upgrade,58);assert.equal(p.summary.create,97);const r=await f.apply(p);assert.equal(r.created,97);assert.equal(r.upgraded,58);assert.equal(f.state.rows.filter(t=>t.status==='ACTIVE').length,157);for(const previous of before){const actual=f.state.rows.find(t=>t.id===previous.id);assert.deepEqual(actual,{...previous,status:['ADM-MEETING-MINUTES','EXE-FOLLOWUP'].includes(previous.code)?'ACTIVE':'INACTIVE'});}assert.equal(f.state.audit[0].actorId,'owner-person');});
 await check('fresh repeat creates no duplicate versions or false audits',async()=>{const f=fixture();await f.apply(await f.plan());const r=await f.apply(await f.plan());assert.equal(r.created,0);assert.equal(r.upgraded,0);assert.equal(f.state.rows.length,157);assert.equal(f.state.audit.length,1);});
 await check('scope is confined to one department',async()=>{const f=fixture();await f.apply(await f.plan('MARINE_OPERATIONS'));assert.equal(f.state.rows.length,11);assert.ok(f.state.rows.every(t=>t.department==='MARINE_OPERATIONS'));});
 await check('inactive history is not reactivated',async()=>{const f=fixture();f.state.rows=[row(sources[0],{status:'INACTIVE',version:3})];const before=structuredClone(f.state.rows[0]),p=await f.plan();assert.equal(p.summary.inactive,1);await f.apply(p);assert.deepEqual(f.state.rows[0],before);});
 for(const changed of [{titleAr:'Custom title'},{fields:sources[0].fields.map(f=>({...f,required:false}))},{printable:false}])await check('custom content never overwritten '+Object.keys(changed)[0],async()=>{const f=fixture();f.state.rows=[row(sources[0],changed)];const before=structuredClone(f.state.rows),p=await f.plan();assert.equal(p.summary.edited,1);await assert.rejects(f.apply(p),/تعديلات/);assert.deepEqual(f.state.rows,before);assert.equal(f.state.audit.length,0);});
 for(const conflict of ['department','duplicate'])await check(conflict+' conflict blocks entire batch',async()=>{const f=fixture();f.state.rows=[row(sources[0])];if(conflict==='department')f.state.rows[0].department='UNEXPECTED';else f.state.rows.push(row(sources[0],{id:'v2',version:2}));const p=await f.plan();assert.equal(p.summary.conflict,1);await assert.rejects(f.apply(p),/تعارضات/);assert.equal(f.state.audit.length,0);});
 await check('stale definitions including field-only edits invalidate reviewed hash',async()=>{const f=fixture();f.state.rows=[row(sources[0])];const p=await f.plan();f.state.rows[0].fields[0].labelAr='تعديل متزامن';await assert.rejects(f.apply(p),/تغير الكتالوج/);assert.equal(f.state.rows.length,1);});
 await check('audit failure rolls back retired definitions and all new versions',async()=>{const f=fixture();f.state.rows=sources.map(t=>row(t));const before=structuredClone(f.state.rows),p=await f.plan();f.state.failAudit=true;await assert.rejects(f.apply(p),/audit unavailable/);assert.deepEqual(f.state.rows,before);assert.equal(f.state.audit.length,0);});
 await check('authorization precedes catalog reads',async()=>{const f=fixture();f.state.denied=true;await assert.rejects(f.plan(),/forbidden/);assert.deepEqual(f.state.calls,['authorize']);});
 for(const field of ['owner','kind','status','pointer'])await check('wrong internal '+field+' refuses setup',async()=>{const f=fixture();f.state[field]='other';await assert.rejects(f.plan(),/مالك جهة/);assert.equal(f.state.calls.includes('read'),false);});
 await check('authorization is checked again after preview',async()=>{const f=fixture(),p=await f.plan();f.state.denied=true;await assert.rejects(f.apply(p),/forbidden/);assert.equal(f.state.rows.length,0);});
 await check('confirmation, hash, extra fields and scope are strictly validated',async()=>{const f=fixture(),p=await f.plan();for(const changes of [{confirmed:false},{expectedPlanHash:'bad'},{fields:[]},{department:'NOT_A_DEPARTMENT'}])await assert.rejects(f.apply(p,changes));for(const d of ['',null,['HR'],'__proto__'])await assert.rejects(async()=>f.plan(d));assert.equal(f.state.rows.length,0);});
 await check('foreign organization templates never suppress this organization definitions',async()=>{const f=fixture();f.state.rows=[row(sources[0],{organizationId:'foreign'})];const p=await f.plan();assert.equal(p.summary.create,157);await f.apply(p);assert.equal(f.state.rows.length,158);});
 console.log(`${count} synthetic versioned completion checks passed; no production or real database acceptance claimed.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
