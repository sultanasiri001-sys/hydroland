'use strict';
// Compiled source + synthetic transaction/authorization dependencies; not HTTP/production.
const assert=require('node:assert/strict');
const domain=require('../dist/document-forms/owner-administrative-decision.domain');
const {OwnerAdministrativeDecisionController}=require('../dist/document-forms/owner-administrative-decision.controller');
const {DocumentAuthorizationService}=require('../dist/document-forms/document-authorization.service');
let passed=0;
const make=()=>({id:'doc-a',organizationId:'org-a',department:'ADMIN_AFFAIRS_RECORDS',version:1,status:'DRAFT',payload:{meetingNo:'M1',subject:'اجتماع متابعة روتينية',decisions:'مراجعة تقدم الأعمال دون التزامات'},contentHash:'source-client-hash',referenceNumber:'SYNTHETIC-1',documentBrandVersion:1,createdByAccountId:'owner-a',approvedByAccountId:null,signedByAccountId:null,archivedByAccountId:null,
 template:{id:'template-a',organizationId:'org-a',code:'ADM-MEETING-MINUTES',department:'ADMIN_AFFAIRS_RECORDS',version:1,titleAr:'محضر اجتماع',titleEn:'Meeting minutes',printable:true,fields:['meetingNo','subject','decisions'].map(key=>({key,labelAr:key,labelEn:key,type:'TEXT',required:true}))}});
function fixture(options={}){
 const doc=make(),saved=new Map(),audits=[];let reads=0;
 const data={revoked:false,suspended:false,auditFailure:false,revisionMismatch:false,owner:'owner-a',doc,saved,audits,get reads(){return reads;}};
 function txFor(records,events){return {
  operationalSetting:{findUnique:async q=>q.where.key==='PLATFORM_STAFFING_ORGANIZATION:v1'?{value:{organizationId:'org-a'}}:records.get(q.where.key)||null,
   findMany:async q=>[...records].filter(([k])=>k.startsWith(q.where.key.startsWith)).map(([key,value])=>({key,...value})).slice(0,q.take),
   create:async q=>{if(records.has(q.data.key))throw Object.assign(Error('duplicate'),{code:'P2002'});records.set(q.data.key,{value:structuredClone(q.data.value)});return q.data;}},
  organization:{findUnique:async()=>({ownerId:data.owner,kind:'HYDROLAND_INTERNAL_PLATFORM',status:'ACTIVE'})},
  account:{findFirst:async q=>data.revoked?null:{id:q.where.id},findUniqueOrThrow:async()=>({personId:'person-owner-a'})},
  organizationMember:{findUnique:async()=>data.suspended?{status:'SUSPENDED',role:'OWNER'}:null},
  managedDocument:{findFirst:async q=>{reads++;return q.where.id===doc.id&&q.where.organizationId===doc.organizationId?structuredClone(doc):null;}},
  documentRevision:{findUnique:async()=>({contentHash:doc.contentHash,payload:data.revisionMismatch?{unexpected:'mismatch'}:structuredClone(doc.payload)})},
  documentBrandSnapshot:{findUnique:async()=>({brandVersion:1,logoAssetId:null,brandNameAr:'جهة اصطناعية',brandNameEn:'Synthetic',footerAr:null,footerEn:null})},
  auditEvent:{create:async q=>{if(data.auditFailure)throw Error('audit unavailable');events.push(structuredClone(q.data));return q.data;}},
 };}
 const db={serializable:async fn=>{const working=structuredClone(saved),events=structuredClone(audits);const result=await fn(txFor(working,events));saved.clear();for(const [k,v]of working)saved.set(k,v);audits.splice(0,audits.length,...events);return result;}};
 const ctl=new OwnerAdministrativeDecisionController(db,new DocumentAuthorizationService(db),{});
 const actor=id=>({auth:{accountId:id}}),view=(id='owner-a')=>ctl.inspect(actor(id),'org-a','doc-a');
 const post=(plan,extra={},id='owner-a')=>ctl.record(actor(id),'org-a','doc-a',{expectedVersion:plan.sourceVersion,reviewHash:plan.reviewHash,note:'متابعة تقدم البنود فقط',routineOnly:true,notIndependentApproval:true,...extra});
 return {data,ctl,view,post};
}
async function check(name,fn){await fn();passed++;console.log('PASS '+name);}
(async()=>{
 await check('only the two exact routine types are eligible',()=>{const d=make();assert.equal(domain.routineEligibility(d).eligible,true);for(const code of ['HR-LEAVE-REQUEST','FIN-PAYMENT-VOUCHER','LEG-LEGAL-REPORT','CLIB-HR-PERMANENT','SAF-CAPA','EXE-DECISION','TEC-ACCESS-REQUEST','UNKNOWN'])assert.equal(domain.routineEligibility({...d,template:{...d.template,code}}).eligible,false);});
 await check('routine follow-up has its own department and field boundary',()=>{const d=make();d.department='EXECUTIVE_GOVERNANCE';Object.assign(d.template,{department:d.department,code:'EXE-FOLLOWUP',fields:['decisionNo','owner','evidence'].map(key=>({key,type:'TEXT',required:true}))});d.payload={decisionNo:'D1',owner:'مسؤول متابعة',evidence:'تقدم روتيني'};assert.equal(domain.routineEligibility(d).purpose,'NOTE_ROUTINE_PROGRESS');});
 await check('wrong department, foreign template and final states refuse new decisions',()=>{const d=make();for(const patch of [{department:'HR'},{status:'APPROVED'},{status:'SIGNED'},{status:'ARCHIVED'},{signedByAccountId:'person'},{template:{...d.template,organizationId:'foreign'}}])assert.equal(domain.routineEligibility({...d,...patch}).eligible,false);});
 await check('binding changes and extra or incomplete payload are excluded',()=>{for(const change of [d=>d.template.fields.push({key:'amount',type:'NUMBER',required:true}),d=>d.template.fields[0].required=false,d=>d.template.fields[0].type='NUMBER',d=>d.payload.amount='100',d=>delete d.payload.subject,d=>d.payload.subject='',d=>d.payload.subject='a'.repeat(8001)]){const d=make();change(d);assert.equal(domain.routineEligibility(d).eligible,false);}});
 await check('consent and envelope reject forged actors and approval properties',()=>{const body={expectedVersion:1,reviewHash:'a'.repeat(64),note:'Note',routineOnly:true,notIndependentApproval:true};for(const patch of [{routineOnly:false},{notIndependentApproval:false},{actorAccountId:'forged'},{status:'SIGNED'},{expectedVersion:0},{reviewHash:'x'},{note:''}])assert.throws(()=>domain.decisionInput({...body,...patch}));});
 await check('actual owner authorization yields a stable read-only plan',async()=>{const f=fixture(),before=structuredClone(f.data.doc),a=await f.view(),b=await f.view();assert.equal(a.eligible,true);assert.equal(a.reviewHash,b.reviewHash);assert.equal(f.data.saved.size,0);assert.equal(f.data.audits.length,0);assert.deepEqual(f.data.doc,before);});
 await check('another administrator is denied before document lookup',async()=>{const f=fixture();await assert.rejects(f.view('other-admin'));assert.equal(f.data.reads,0);});
 await check('revocation and explicit suspension are enforced again at recording',async()=>{for(const key of ['revoked','suspended']){const f=fixture(),p=await f.view();f.data[key]=true;await assert.rejects(f.post(p));assert.equal(f.data.saved.size,0);}});
 await check('record creates one attributed receipt without source state changes',async()=>{const f=fixture(),before=structuredClone(f.data.doc),p=await f.view(),r=await f.post(p);assert.equal(r.receipt.status,'OWNER_DECISION_RECORDED');assert.equal(r.receipt.actorAccountId,'owner-a');assert.equal(r.receipt.independentReview,false);assert.equal(r.receipt.electronicSignature,false);assert.equal(f.data.saved.size,1);assert.equal(f.data.audits[0].actorId,'person-owner-a');assert.deepEqual(f.data.doc,before);assert.equal((await f.view()).eligible,false);});
 await check('repeat cannot replace receipt or fabricate another audit',async()=>{const f=fixture(),p=await f.view();await f.post(p);const before=structuredClone([...f.data.saved]);await assert.rejects(f.post(p));assert.deepEqual([...f.data.saved],before);assert.equal(f.data.audits.length,1);});
 await check('stale version and changed source payload require fresh review',async()=>{for(const mutation of [d=>d.version++,d=>d.payload.subject='New subject',d=>d.template.titleAr='عنوان آخر']){const f=fixture(),p=await f.view();mutation(f.data.doc);await assert.rejects(f.post(p));assert.equal(f.data.saved.size,0);}});
 await check('revision-evidence mismatch refuses even a preview',async()=>{const f=fixture();f.data.revisionMismatch=true;await assert.rejects(f.view(),/revision evidence/);assert.equal(f.data.saved.size,0);});
 await check('failure to append attribution rolls back the receipt',async()=>{const f=fixture(),p=await f.view();f.data.auditFailure=true;await assert.rejects(f.post(p),/audit unavailable/);assert.equal(f.data.saved.size,0);assert.equal(f.data.audits.length,0);});
 await check('later source revision has a separate decision; prior snapshot is retained',async()=>{const f=fixture(),p=await f.view(),old=(await f.post(p)).receipt;f.data.doc.version++;f.data.doc.payload.subject='متابعة أخرى';const next=await f.view();assert.equal(next.existing,null);assert.equal(next.receipts[0].sourceVersion,1);await f.post(next);assert.equal(f.data.saved.size,2);assert.deepEqual(f.data.saved.get(domain.decisionKey('org-a','doc-a',1)).value,old);});
 await check('stored receipt tampering is never presented as a valid record',async()=>{const f=fixture(),r=(await f.post(await f.view())).receipt;r.note='altered';assert.throws(()=>domain.verifyDecision(r,'org-a','doc-a',1),/integrity/);});
 await check('old owner plan cannot be used after ownership changes',async()=>{const f=fixture(),p=await f.view();f.data.owner='other-owner';await assert.rejects(f.post(p));assert.equal(f.data.saved.size,0);});
 console.log(`${passed} owner-decision domain/controller checks passed with synthetic dependencies; no production writes.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
