'use strict';
const assert=require('node:assert/strict');
const {validateDocumentPayload:validate}=require('../dist/document-forms/document-payload');
const {DocumentPersistenceService}=require('../dist/document-forms/document-persistence.service');
const f=(key,type='TEXT',required=true,options)=>({key,labelAr:'حقل',labelEn:'Field',type,required,...(options?{options}:{})});
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS '+name);}
check('required, optional, unrecognized and prototype fields',()=>{
 for(const value of [null,[],1,'text',{}, {name:' '},{name:null},{name:'ok',unknown:'no'},JSON.parse('{"name":"ok","__proto__":{}}')])assert.throws(()=>validate([f('name')],value));
 validate([f('name'),f('optional','TEXT',false)],{name:'ok',optional:''});
 assert.throws(()=>validate([f('name')],Object.assign(Object.create({other:true}),{name:'ok'})));
});
check('number and boolean false and zero stay valid without coercing stored data',()=>{
 for(const n of [0,-1,2.3,'0','-1.5','1e3']){const p={n};validate([f('n','NUMBER')],p);assert.equal(p.n,n);}
 for(const n of [NaN,Infinity,'NaN','0x11','1px',true,{},' 2 '])assert.throws(()=>validate([f('n','NUMBER')],{n}));
 for(const b of [false,true,'false','true'])validate([f('b','BOOLEAN')],{b});
 for(const b of [0,'yes',[],{}])assert.throws(()=>validate([f('b','BOOLEAN')],{b}));
});
check('real calendar dates and exact selected options',()=>{
 for(const d of ['2024-02-29','2026-10-25'])validate([f('d','DATE')],{d});
 for(const d of ['2026-02-29','2026-04-31','2026-13-01','2026-10-25T00:00:00Z','25/10/2026',99])assert.throws(()=>validate([f('d','DATE')],{d}));
 validate([f('s','SELECT',true,['ONE','TWO'])],{s:'ONE'});
 assert.throws(()=>validate([f('s','SELECT',true,['ONE'])],{s:'TWO'}));
});
check('bounded long text, JSON size and structured tables',()=>{
 for(const type of ['TEXT','TEXTAREA','LONG_TEXT','SIGNATURE']){
  validate([f('v',type)],{v:'سطر عربي\nمحتوى'});
  for(const v of ['X'.repeat(8001),'bad\u0000value',[],{}])assert.throws(()=>validate([f('v',type)],{v}));
 }
 validate([f('rows','TABLE')],{rows:[{name:'Arabic',count:0,yes:false,blank:null}]});
 for(const rows of [[],[{}],Array(101).fill({x:1}),[{nested:{x:1}}],[JSON.parse('{"constructor":1}')]]){
  // Empty rows are permitted as data; an empty required table is not.
  if(rows.length===1&&Object.keys(rows[0]).length===0)continue;
  assert.throws(()=>validate([f('rows','TABLE')],{rows}));
 }
 const schema=Array.from({length:20},(_,i)=>f('f'+i));
 assert.throws(()=>validate(schema,Object.fromEntries(schema.map(x=>[x.key,'ع'.repeat(8000)]))));
});
(async()=>{
 const fields=[f('name')],template={id:'t',organizationId:'o',code:'HR-TEST',department:'HR',version:1,status:'ACTIVE',fields};
 let writes=0,transactions=0;
 const db={documentTemplate:{findFirst:async()=>template},managedDocument:{findUnique:async()=>({id:'d',organizationId:'o',templateId:'t',department:'HR',status:'DRAFT',version:1,template,payload:{name:''}})},serializable:async()=>{transactions++;writes++;throw Error('invalid payload reached persistence');}};
 const service=new DocumentPersistenceService(db,{assert:async()=>({})});
 for(const payload of [{},{name:' '},{name:9},{name:'valid',extra:'unexpected'}]){
  await assert.rejects(service.createDocument('a',{organizationId:'o',templateId:'t',department:'HR',contentHash:'hash',payload}));
  await assert.rejects(service.revise('a','d',{contentHash:'hash',payload}));
 }
 await assert.rejects(service.createDocument('a',{organizationId:'o',templateId:'t',department:'HR',contentHash:42,payload:{name:'valid'}}));
 await assert.rejects(service.transition('a','d','PENDING_APPROVAL'));
 assert.equal(writes,0);assert.equal(transactions,0);checks++;console.log('PASS invalid creation, revision and submission never allocate references or write revisions');
 console.log(`${checks} payload validation groups passed; synthetic persistence spies only.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
