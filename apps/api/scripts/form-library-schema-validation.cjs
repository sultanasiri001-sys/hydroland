'use strict';
const assert=require('node:assert/strict');
const {templateText,templateFields,templateObject,assertCompatibleTemplateFields}=require('../dist/document-forms/document-template-input');
const {DocumentPersistenceService}=require('../dist/document-forms/document-persistence.service');
const f={key:'name',type:'TEXT',labelAr:'الاسم',labelEn:'Name',required:true};
let passed=0;async function check(name,fn){await fn();passed++;console.log('PASS '+name);}
(async()=>{
 await check('valid titles are trimmed and retained',()=>{assert.equal(templateText(' اسم ','title'),'اسم');});
 await check('duplicate field keys are rejected',()=>assert.throws(()=>templateFields([f,f])));
 await check('unknown field types are rejected',()=>assert.throws(()=>templateFields([{...f,type:'EXECUTE'}])));
 await check('required flags must be boolean',()=>assert.throws(()=>templateFields([{...f,required:'true'}])));
 await check('prototype-polluting keys are rejected',()=>{for(const key of ['__proto__','constructor','prototype'])assert.throws(()=>templateFields([{...f,key}]));});
 await check('empty and oversized schemas are rejected',()=>{assert.throws(()=>templateFields([]));assert.throws(()=>templateFields(Array.from({length:101},(_,i)=>({...f,key:'f'+i}))));});
 await check('titles have strict type length and control-character bounds',()=>{for(const value of [false,{},'',' '.repeat(10),'a'.repeat(201),'a\u0000'])assert.throws(()=>templateText(value,'title'));});
 await check('selection options must be bounded nonempty and unique',()=>{for(const options of [[],['same','same'],[false],Array.from({length:101},(_,i)=>''+i)])assert.throws(()=>templateFields([{...f,type:'SELECT',options}]));});
 await check('editable labels order and required flags remain compatible',()=>{const second={...f,key:'second'};assert.doesNotThrow(()=>assertCompatibleTemplateFields([f,second],[{...second,labelAr:'آخر',required:false},f]));});
 await check('operational keys types and options cannot silently migrate',()=>{for(const fields of [[{...f,key:'other'}],[{...f,type:'NUMBER'}],[{...f,options:['new']}],[f,{...f,key:'new'}]])assert.throws(()=>assertCompatibleTemplateFields([f],fields));});
 await check('template envelope cannot forge versions profile or approval metadata',()=>{for(const body of [{version:10},{pdfProfile:'OTHER'},{approvedByAccountId:'actor'},{status:'SIGNED'},{printable:'true'},null,[]])assert.throws(()=>templateObject(body,['titleAr','titleEn','fields','printable']));});
 await check('trimmed reserved cooperation code cannot bypass its specialized path',async()=>{let writes=0;const service=new DocumentPersistenceService({serializable:async()=>{writes++;}},{assert:async()=>({})});await assert.rejects(service.createTemplate('actor',{organizationId:'org',code:' LEG-DIVE-COOPERATION-V1 ',titleAr:'عنوان',titleEn:'Title',department:'HR',fields:[f]}));assert.equal(writes,0);});
 await check('template retirement between lookup and transaction blocks new document creation',async()=>{
  let writes=0;const t={id:'t',organizationId:'org',code:'HR-CI',department:'HR',version:1,status:'ACTIVE'};
  const tx={documentTemplate:{findFirst:async()=>null},documentReferenceCounter:{upsert:async()=>{writes++;throw Error('unexpected mutation');}}};
  const db={documentTemplate:{findFirst:async()=>t},serializable:fn=>fn(tx)};
  await assert.rejects(new DocumentPersistenceService(db,{assert:async()=>({})}).createDocument('actor',{organizationId:'org',templateId:'t',department:'HR',contentHash:'synthetic',payload:{name:'Synthetic'}}),/Template changed concurrently/);assert.equal(writes,0);
 });
 console.log(`${passed} schema and boundary checks passed with synthetic fixtures.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
