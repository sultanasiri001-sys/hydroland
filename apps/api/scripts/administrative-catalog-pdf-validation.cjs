'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {PDFDocument}=require('pdf-lib');
const {reviewedAdministrativeTemplates,ADMINISTRATIVE_FORM_FAMILIES}=require('../dist/document-forms/administrative-form-catalog');
const {renderAdministrativeDocumentPdf}=require('../dist/document-forms/administrative-document-pdf');
const out=path.resolve(__dirname,'../.artifacts/form-library/catalog');
(async()=>{
 await fs.mkdir(out,{recursive:true});const results=[];
 for(const department of Object.keys(ADMINISTRATIVE_FORM_FAMILIES)){
  const t=reviewedAdministrativeTemplates('synthetic-org').filter(t=>t.department===department).sort((a,b)=>b.fields.length-a.fields.length)[0];
  const trace=[],date=new Date('2026-10-25T00:00:00Z');
  const fields=t.fields.map((f,i)=>({...f,value:`تفاصيل اصطناعية للتحقق من الطباعة؛ ليست واقعة عمل أو اعتمادًا. END_${i}`}));
  const snapshot={documentId:'synthetic-doc',organizationId:'synthetic-org',referenceNumber:'SYNTHETIC-ONLY',department,status:'DRAFT',documentVersion:1,contentHash:'synthetic',
   branding:{brandVersion:1,logoUrl:null,logoAssetId:null,brandNameAr:'هيدرولاند — بيانات اصطناعية',brandNameEn:'HYDROLAND — synthetic',footerAr:'نسخة اختبار فقط.',footerEn:null},
   template:{id:'synthetic-template',code:t.code,titleAr:t.titleAr,titleEn:t.titleEn,version:2,printable:true},fields,
   approvals:{createdByAccountId:'synthetic-creator',approvedByAccountId:null,signedByAccountId:null,archivedByAccountId:null,approvedAt:null,signedAt:null,archivedAt:null},
   createdAt:date,updatedAt:date,renderProfile:'ADMINISTRATIVE_FORM_V1'};
  const before=structuredClone(snapshot);
  const result=await renderAdministrativeDocumentPdf(snapshot,{bytesForLogo:async()=>{throw Error('No external logo expected');}},item=>trace.push(item));
  assert.deepEqual(snapshot,before);const pdf=await PDFDocument.load(result.bytes),pages=pdf.getPageCount();
  for(let i=0;i<fields.length;i++)assert.ok(trace.some(x=>x.kind==='text'&&x.text?.includes(`END_${i}`)),`${department}: omitted field ${i}`);
  for(const x of trace){assert.ok(x.x>=23&&x.y>=23);assert.ok(x.x+x.width<=572&&x.y+x.height<=819);}
  for(let page=1;page<=pages;page++){
   const boxes=trace.filter(x=>x.kind==='field'&&x.page===page);
   for(let i=1;i<boxes.length;i++)assert.ok(boxes[i].y+boxes[i].height<boxes[i-1].y);
   assert.ok(trace.some(x=>x.kind==='image'&&x.page===page),'official HYDROLAND mark missing');
  }
  assert.ok(!trace.some(x=>/اعتمد بواسطة|سجل التوقيع بواسطة/.test(x.text||'')));
  await fs.writeFile(path.join(out,department+'.pdf'),result.bytes);
  results.push({department,code:t.code,fields:fields.length,pages});console.log(`PASS ${department}: ${fields.length} fields, ${pages} pages; full content and official identity`);
 }
 await fs.writeFile(path.join(out,'summary.json'),JSON.stringify({scope:'14 synthetic draft PDFs; actual renderer, no production records or professional approval',results},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
