'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {decisionDigest}=require('../dist/document-forms/owner-administrative-decision.domain');
const {OWNER_APPROVAL_NOTICE}=require('../dist/document-forms/owner-administrative-approval.domain');
const {renderOwnerApprovalPdf}=require('../dist/document-forms/owner-administrative-approval.pdf');
(async()=>{
 const body={policy:'OWNER_ADMINISTRATIVE_APPROVAL_V1',id:'synthetic-decision',organizationId:'synthetic-org',documentId:'synthetic-document',sourceVersion:1,status:'ADMINISTRATIVELY_APPROVED',referenceNumber:'OD-SYNTHETIC-1',recordedAt:'2026-10-25T00:00:00.000Z',actorAccountId:'synthetic-owner',independentReview:false,electronicSignature:false,originalWorkflowUnchanged:true,note:'إثبات متابعة روتينية دون أي صلاحية مالية أو تعاقدية.',scopeNotice:OWNER_APPROVAL_NOTICE,source:{organizationId:'synthetic-org',documentId:'synthetic-document',department:'ADMIN_AFFAIRS_RECORDS',referenceNumber:'SYNTHETIC-SOURCE-1',version:1,status:'DRAFT',template:{code:'ADM-MEETING-MINUTES',version:1,printable:true,titleAr:'محضر متابعة روتينية',fields:[{key:'subject',labelAr:'الموضوع'}]},payload:{subject:('متابعة الأعمال الروتينية وتوثيق الملاحظات دون إنشاء التزامات. ').repeat(85)},branding:{brandVersion:1,logoAssetId:null,logoUrl:null,brandNameAr:'جهة اصطناعية للمراجعة',brandNameEn:'Synthetic Review',footerAr:null,footerEn:null}}};
 const receipt={...body,receiptHash:decisionDigest(body)},layout=[];
 const nonprintable=structuredClone(body);nonprintable.source.template.printable=false;
 await assert.rejects(renderOwnerApprovalPdf({...nonprintable,receiptHash:decisionDigest(nonprintable)},{}),/لا يتيح الطباعة/);
 const result=await renderOwnerApprovalPdf(receipt,{bytesForLogo:async()=>{throw Error('No external asset expected.');}},i=>layout.push(i));
 assert.ok(result.bytes.subarray(0,5).equals(Buffer.from('%PDF-')));
 const pages=new Set(layout.map(i=>i.page));assert.ok(pages.size>=2);
 for(const n of pages){const texts=layout.filter(i=>i.page===n&&i.kind==='text').map(i=>i.text).join('\n');assert.match(texts,/معتمد إداريًا من المالك/);assert.match(texts,/المراجعات المتخصصة مستقلة/);}
 for(const i of layout){assert.ok(i.x>=23&&i.y>=23&&i.x+i.width<=572&&i.y+i.height<=820,JSON.stringify(i));}
 assert.ok(!layout.some(i=>['اعتمد بواسطة','سجل التوقيع بواسطة'].includes(i.text)));
 assert.ok(layout.some(i=>i.text==='SYNTHETIC-SOURCE-1 / v1'));
 const dir=path.resolve(__dirname,'../.artifacts/form-library');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'owner-approval-long-receipt.pdf'),result.bytes);
 console.log('PASS actual owner receipt: private-source snapshot, every-page notice, long Arabic pagination, no fabricated approval/signature, bounded layout.');
})().catch(e=>{console.error(e);process.exitCode=1;});
