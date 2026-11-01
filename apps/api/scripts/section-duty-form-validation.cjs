'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {PDFDocument}=require('pdf-lib');
const {reviewedAdministrativeTemplates,previousReviewedAdministrativeTemplates,administrativeFormGuidance}=require('../dist/document-forms/administrative-form-catalog');
const {SECTION_FORM_EXTENSIONS,SECTION_FORM_COVERAGE}=require('../dist/document-forms/section-duty-form-catalog');
const {templateFields}=require('../dist/document-forms/document-template-input');
const {validateDocumentPayload}=require('../dist/document-forms/document-payload');
const {renderAdministrativeDocumentPdf}=require('../dist/document-forms/administrative-document-pdf');
const output=path.resolve(__dirname,'../.artifacts/section-duty-forms');
(async()=>{
 const before=previousReviewedAdministrativeTemplates('synthetic-section-org'),all=reviewedAdministrativeTemplates('synthetic-section-org');
 assert.equal(before.length,157);assert.equal(all.length,192);assert.equal(new Set(all.map(t=>t.code)).size,192);
 assert.equal(Object.keys(SECTION_FORM_EXTENSIONS).length,45);assert.equal(SECTION_FORM_COVERAGE.length,83);
 assert.equal(new Set(SECTION_FORM_COVERAGE.map(s=>s.department)).size,14);
 const referenced=new Set(SECTION_FORM_COVERAGE.flatMap(s=>s.templateCodes));assert.deepEqual([...referenced].sort(),all.map(t=>t.code).sort());
 let modified=0,retained=0,created=0;
 for(const t of all){
  templateFields(t.fields);assert.ok(!t.code.startsWith('CLIB-'));assert.ok(t.fields.length<=100);
  const guidance=administrativeFormGuidance(t.code);assert.ok(guidance.ownerSectionCode);assert.equal(guidance.visualIdentity,'HYDROLAND_INCIDENT_IDENTITY_V2');
  assert.ok(SECTION_FORM_COVERAGE.some(s=>s.code===guidance.ownerSectionCode&&s.department===t.department&&s.templateCodes.includes(t.code)));
  const prior=before.find(p=>p.code===t.code);
  if(!prior){created++;continue;}
  if(SECTION_FORM_EXTENSIONS[t.code]){
   modified++;assert.ok(t.fields.length>prior.fields.length);
   for(const f of prior.fields)assert.deepEqual(t.fields.find(x=>x.key===f.key),f,'existing key/type/options preserved '+t.code+' '+f.key);
  }else{retained++;assert.deepEqual(t.fields,prior.fields);}
 }
 assert.deepEqual({modified,retained,created},{modified:45,retained:112,created:35});
 const date=new Date('2026-11-02T00:00:00Z'),results=[];
 await fs.mkdir(output,{recursive:true});
 const changed=all.filter(t=>SECTION_FORM_EXTENSIONS[t.code]||!before.some(p=>p.code===t.code));
 for(const t of changed){
  const payload=Object.fromEntries(t.fields.map((f,index)=>[f.key,f.type==='TABLE'?[Object.fromEntries(f.options.map((column,col)=>[column,`قيمة اختبار معزولة END_${index}_${col}`]))]:f.type==='DATE'?'2026-11-02':f.type==='NUMBER'?0:`مرجع اختبار معزول END_${index}`]));
  validateDocumentPayload(t.fields,payload);
  const required=t.fields.find(f=>f.required),invalid={...payload};delete invalid[required.key];assert.throws(()=>validateDocumentPayload(t.fields,invalid));
  for(const table of t.fields.filter(f=>f.type==='TABLE')){
   assert.throws(()=>validateDocumentPayload(t.fields,{...payload,[table.key]:[{unrecognized:'invalid'}]}));
   assert.throws(()=>validateDocumentPayload(t.fields,{...payload,[table.key]:[{}]}));
   if(table.required)assert.throws(()=>validateDocumentPayload(t.fields,{...payload,[table.key]:[]}));
  }
  const snapshot={documentId:'synthetic-only',organizationId:'synthetic-section-org',referenceNumber:'SYNTHETIC-ONLY',department:t.department,status:'DRAFT',documentVersion:1,contentHash:'synthetic',
   branding:{brandVersion:1,logoUrl:null,logoAssetId:null,brandNameAr:'هيدرولاند - اختبار معزول',brandNameEn:'HYDROLAND synthetic',footerAr:null,footerEn:null},
   template:{id:t.id,code:t.code,titleAr:t.titleAr,titleEn:t.titleEn,version:1,printable:true},fields:t.fields.map(f=>({...f,value:payload[f.key]})),
   approvals:{createdByAccountId:'synthetic-only',approvedByAccountId:null,signedByAccountId:null,archivedByAccountId:null,approvedAt:null,signedAt:null,archivedAt:null},
   createdAt:date,updatedAt:date,renderProfile:'ADMINISTRATIVE_FORM_V1'};
  const original=structuredClone(snapshot),trace=[];
  const rendered=await renderAdministrativeDocumentPdf(snapshot,{bytesForLogo:async()=>{throw Error('No external asset expected');}},item=>trace.push(item),{approvedIdentity:true,templatePreview:true});
  assert.deepEqual(snapshot,original);
  const pdf=await PDFDocument.load(rendered.bytes);
  for(let i=0;i<t.fields.length;i++){
   const f=t.fields[i];assert.ok(trace.some(x=>x.kind==='text'&&x.text===f.labelAr),t.code+' field heading omitted '+f.key);
   if(f.type==='TABLE')for(let col=0;col<f.options.length;col++)assert.ok(trace.some(x=>x.text?.includes(`END_${i}_${col}`)),t.code+' table cell omitted');
   else if(!['DATE','NUMBER'].includes(f.type))assert.ok(trace.some(x=>x.text?.includes(`END_${i}`)),t.code+' value omitted');
  }
  for(const item of trace)assert.ok(item.x>=23&&item.y>=23&&item.x+item.width<=572&&item.y+item.height<=819,t.code+' layout outside A4');
  for(let page=1;page<=pdf.getPageCount();page++){
   assert.ok(trace.some(x=>x.kind==='image'&&x.page===page&&x.x===595.28-236),'existing logo composition preserved');
   const boxes=trace.filter(x=>x.kind==='field'&&x.page===page);for(let i=1;i<boxes.length;i++)assert.ok(boxes[i].y+boxes[i].height<boxes[i-1].y,'overlapping content');
  }
  const p=path.join(output,t.code+'.pdf');await fs.writeFile(p,rendered.bytes);
  results.push({code:t.code,department:t.department,fields:t.fields.length,tables:t.fields.filter(f=>f.type==='TABLE').length,pages:pdf.getPageCount(),identity:'HYDROLAND_INCIDENT_IDENTITY_V2',status:'SYNTHETIC_PREVIEW_ONLY'});
 }
 await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify({scope:'isolated synthetic template previews; no production documents or approvals',retained,modified,created,sections:83,fields:all.reduce((n,t)=>n+t.fields.length,0),results},null,2));
 console.log(`PASS 83 sections; 112 unchanged, 45 expanded, 35 new; ${results.length} actual approved-identity PDF previews with complete fields, tables and A4 geometry.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
