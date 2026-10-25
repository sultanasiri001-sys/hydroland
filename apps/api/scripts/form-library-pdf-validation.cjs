'use strict';
// Synthetic fixtures only. Real renderer/fonts; service-level database doubles.
// This suite does not claim real PostgreSQL or live-platform acceptance.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {PDFDocument}=require('pdf-lib');
const sharp=require('sharp');
const {DocumentPrintService}=require('../dist/document-forms/document-print.service');
const {DocumentPersistenceService}=require('../dist/document-forms/document-persistence.service');
const {renderAdministrativeDocumentPdf}=require('../dist/document-forms/administrative-document-pdf');
const out=path.resolve(__dirname,'../.artifacts/form-library');
const clone=v=>structuredClone(v);
const date=new Date('2026-10-25T00:00:00Z');
let passed=0;
async function check(name,fn){await fn();passed++;console.log('PASS '+name);}
const base={
 id:'synthetic-doc',organizationId:'synthetic-org-a',referenceNumber:'SYNTHETIC-HR-2026-000001',department:'HR',status:'DRAFT',version:1,documentBrandVersion:3,contentHash:'sha256:synthetic-not-a-real-approval',
 template:{id:'synthetic-template-v2',code:'HR-EMPLOYEE-REPORT',titleAr:'تقرير بيانات موظف — نموذج اختباري',titleEn:'Synthetic employee report',version:2,printable:true,fields:[{key:'employeeNo',labelAr:'رقم الموظف',labelEn:'Employee number',type:'TEXT',required:true},{key:'notes',labelAr:'الملاحظات',labelEn:'Notes',type:'TEXT',required:false}]},
 payload:{employeeNo:'SYNTHETIC-001',notes:'هذه بيانات اصطناعية لا تخص موظفًا أو مركزًا حقيقيًا.'},
 createdByAccountId:'synthetic-creator',approvedByAccountId:null,signedByAccountId:null,archivedByAccountId:null,approvedAt:null,signedAt:null,archivedAt:null,createdAt:date,updatedAt:date,
 lifecycleEvents:[{action:'CREATE',metadata:{pdfProfile:'ADMINISTRATIVE_FORM_V1'}}],
};
const brand={brandVersion:3,logoUrl:'https://example.invalid/never-fetch-this',logoAssetId:'synthetic-logo-v3',brandNameAr:'مركز تجريبي — بيانات اصطناعية',brandNameEn:'Synthetic center',footerAr:'وثيقة اختبار فقط. لا يوجد اعتماد أو توقيع أو أثر تشغيلي حقيقي.',footerEn:null};
function printService(record=clone(base),branding=clone(brand),denied=false){
 const reads=[];
 const db={managedDocument:{findUnique:async query=>{reads.push(query);return record;}},documentBrandSnapshot:{findUnique:async query=>{assert.deepEqual(query.where.organizationId_brandVersion,{organizationId:'synthetic-org-a',brandVersion:3});return branding;}}};
 const auth={assert:async(actor,org,action)=>{assert.equal(org,'synthetic-org-a');assert.equal(action,'DOCUMENT_READ');if(denied)throw Error('denied');}};
 return {service:new DocumentPrintService(db,auth,{}),reads};
}
(async()=>{
 await fs.mkdir(out,{recursive:true});
 await check('legacy signed document keeps legacy rendering',async()=>{const d=clone(base);d.status='SIGNED';d.lifecycleEvents=[{action:'CREATE',metadata:null}];const c=await printService(d).service.contract('actor',d.id);assert.equal(c.renderProfile,undefined);});
 await check('payload cannot forge presentation selection',async()=>{const d=clone(base);d.lifecycleEvents=[];d.payload.pdfProfile='ADMINISTRATIVE_FORM_V1';const c=await printService(d).service.contract('actor',d.id);assert.equal(c.renderProfile,undefined);});
 await check('server creation event selects the pinned profile',async()=>{const {service,reads}=printService();const c=await service.contract('actor',base.id);assert.equal(c.renderProfile,'ADMINISTRATIVE_FORM_V1');assert.equal(reads[0].include.lifecycleEvents.where.action,'CREATE');assert.equal(c.template.version,2);assert.equal(c.branding.brandVersion,3);});
 await check('unknown presentation profile fails closed',async()=>{const d=clone(base);d.lifecycleEvents[0].metadata.pdfProfile='FUTURE_UNKNOWN';await assert.rejects(printService(d).service.contract('actor',d.id),/Unsupported pinned/);});
 await check('conflicting creation evidence fails closed',async()=>{const d=clone(base);d.lifecycleEvents.push(clone(d.lifecycleEvents[0]));await assert.rejects(printService(d).service.contract('actor',d.id),/conflicting creation/);});
 await check('authorization denial blocks print snapshot',async()=>{await assert.rejects(printService(clone(base),clone(brand),true).service.contract('actor',base.id),/denied/);});
 await check('missing pinned branding never uses current organization identity',async()=>{await assert.rejects(printService(clone(base),null).service.contract('actor',base.id),/Pinned document branding/);});
 await check('new creation pins presentation without altering payload or content hash',async()=>{
   const events=[],revisions=[],created=[],t={id:'t',organizationId:'o',status:'ACTIVE',code:'HR-TEST',department:'HR',version:1};
   const tx={documentTemplate:{findFirst:async()=>t},documentReferenceCounter:{upsert:async()=>({lastNumber:1})},organization:{findUnique:async()=>({documentBrandVersion:1,displayName:'Synthetic'})},documentBrandSnapshot:{findUnique:async()=>({brandVersion:1})},managedDocument:{create:async({data})=>{created.push(data);return {...data,id:'d',version:1};}},documentRevision:{create:async x=>revisions.push(x.data)},documentLifecycleEvent:{create:async x=>events.push(x.data)}};
   const db={...tx,serializable:fn=>fn(tx)},auth={assert:async()=>({})};
   const payload={name:'Synthetic',pdfProfile:'CLIENT_MUST_NOT_CONTROL_PROFILE'},original=clone(payload);
   await new DocumentPersistenceService(db,auth).createDocument('actor',{organizationId:'o',templateId:'t',department:'HR',contentHash:'sha256:synthetic',payload});
   assert.equal(events.length,1);assert.equal(events[0].metadata.pdfProfile,'ADMINISTRATIVE_FORM_V1');assert.equal(events[0].action,'CREATE');assert.deepEqual(payload,original);assert.deepEqual(created[0].payload,original);assert.equal(created[0].contentHash,'sha256:synthetic');assert.equal(revisions.length,1);
 });
 const logo=await sharp({create:{width:100,height:64,channels:3,background:{r:110,g:150,b:180}}}).png().toBuffer();
 const accesses=[];
 const assets={bytesForLogo:async(org,id)=>{accesses.push([org,id]);assert.equal(org,'synthetic-org-a');assert.equal(id,'synthetic-logo-v3');return {asset:{mimeType:'image/png'},bytes:logo};}};
 const snapshot=await printService().service.contract('actor',base.id);
 async function render(c,name){
   const before=clone(c),trace=[];
   const result=await renderAdministrativeDocumentPdf(c,assets,item=>trace.push(item));
   assert.deepEqual(c,before,'renderer must not mutate the print snapshot');
   assert.equal(result.status,c.status);assert.equal(result.bytes.subarray(0,5).toString(),'%PDF-');
   const pdf=await PDFDocument.load(result.bytes);assert.ok(pdf.getPageCount()>=1);
   for(const item of trace){assert.ok(item.x>=23&&item.y>=23,JSON.stringify(item));assert.ok(item.x+item.width<=572&&item.y+item.height<=819,JSON.stringify(item));if(item.kind==='field')assert.ok(item.y>=82,JSON.stringify(item));}
   for(let p=1;p<=pdf.getPageCount();p++){
     const boxes=trace.filter(x=>x.kind==='field'&&x.page===p);
     for(let i=1;i<boxes.length;i++)assert.ok(boxes[i].y+boxes[i].height<boxes[i-1].y,'field cards must not overlap');
   }
   await fs.writeFile(path.join(out,name+'.pdf'),result.bytes);
   await fs.writeFile(path.join(out,name+'.layout.json'),JSON.stringify(trace,null,2));
   return {trace,pages:pdf.getPageCount()};
 }
 await check('draft PDF has both logos and no fabricated approval',async()=>{
   const r=await render(snapshot,'administrative-draft');assert.equal(r.trace.filter(x=>x.kind==='image').length,r.pages*2);
   assert.ok(r.trace.some(x=>x.text==='مسودة — غير معتمدة'));assert.ok(!r.trace.some(x=>x.text==='اعتمد بواسطة'||x.text==='سجل التوقيع بواسطة'));
 });
 await check('pending and approved labels remain distinct from signing',async()=>{
   for(const status of ['PENDING_APPROVAL','APPROVED']){const c=clone(snapshot);c.status=status;const r=await render(c,'administrative-'+status.toLowerCase());assert.ok(!r.trace.some(x=>x.text==='سجل التوقيع بواسطة'));}
 });
 await check('signed record shows only its stored approval evidence',async()=>{
   const c=clone(snapshot);c.status='SIGNED';c.approvals.approvedByAccountId='synthetic-reviewer';c.approvals.signedByAccountId='synthetic-signer';c.approvals.approvedAt=date;c.approvals.signedAt=date;
   const r=await render(c,'administrative-signed');assert.ok(r.trace.some(x=>x.text==='synthetic-signer'));assert.ok(r.trace.some(x=>x.text==='سجل التوقيع بواسطة'));
 });
 await check('missing secondary logo retains primary HYDROLAND identity',async()=>{
   const c=clone(snapshot);c.branding.logoAssetId=null;const calls=accesses.length;const r=await render(c,'administrative-no-center-logo');assert.equal(accesses.length,calls);assert.equal(r.trace.filter(x=>x.kind==='image').length,r.pages);
 });
 await check('long Arabic paragraphs and unbroken references paginate without clipping',async()=>{
   const c=clone(snapshot);c.fields.push({key:'long',labelAr:'تفاصيل طويلة',labelEn:'Long field',type:'TEXTAREA',required:false,value:('سطر عربي لاختبار حفظ التفاصيل دون اقتطاع أو تداخل.\n').repeat(100)+'X'.repeat(900)+' END-OF-LONG-FIELD'});c.branding.footerAr=('تذييل طويل محفوظ بالكامل. ').repeat(70)+' END-OF-FOOTER';
   const r=await render(c,'administrative-long');assert.ok(r.pages>3);const text=r.trace.filter(x=>x.kind==='text').map(x=>x.text).join(' ');assert.ok(text.includes('END-OF-LONG-FIELD'));assert.ok(text.includes('END-OF-FOOTER'));assert.ok(text.includes('متابعة الحقل'));
 });
 await check('template preview is marked on every page and cannot display approval evidence',async()=>{
   const c=clone(snapshot);c.status='SIGNED';c.approvals.approvedByAccountId='do-not-display-approver';c.approvals.signedByAccountId='do-not-display-signer';const trace=[];
   const result=await renderAdministrativeDocumentPdf(c,assets,item=>trace.push(item),{templatePreview:true});const pdf=await PDFDocument.load(result.bytes);
   assert.equal(result.status,'PREVIEW');assert.equal(result.filename,'TEMPLATE-PREVIEW.pdf');assert.match(pdf.getSubject(),/TEMPLATE PREVIEW/);
   for(let p=1;p<=pdf.getPageCount();p++)assert.ok(trace.some(x=>x.page===p&&x.text==='معاينة قالب — غير معتمدة / PREVIEW'));
   assert.ok(!trace.some(x=>/do-not-display|اعتمد بواسطة|سجل التوقيع بواسطة|بصمة المحتوى المسجلة|أعد بواسطة/.test(x.text||'')));
   for(const item of trace){assert.ok(item.x>=23&&item.y>=23,JSON.stringify(item));assert.ok(item.x+item.width<=572&&item.y+item.height<=819,JSON.stringify(item));}
   await fs.writeFile(path.join(out,'administrative-template-preview.pdf'),result.bytes);await fs.writeFile(path.join(out,'administrative-template-preview.layout.json'),JSON.stringify(trace,null,2));
 });
 await check('renderer rejects contract and unpinned snapshots',async()=>{const c=clone(snapshot);delete c.renderProfile;await assert.rejects(renderAdministrativeDocumentPdf(c,assets),/profile mismatch/);await assert.rejects(renderAdministrativeDocumentPdf({...snapshot,cooperation:{}},assets),/profile mismatch/);});
 await fs.writeFile(path.join(out,'validation-summary.json'),JSON.stringify({passed,scope:'real PDF renderer and service doubles; synthetic data; no production or database writes; no issuer approval'},null,2));
 console.log(`Administrative form PDF checks passed: ${passed}. Synthetic evidence: ${out}`);
})().catch(error=>{console.error(error);process.exitCode=1;});
