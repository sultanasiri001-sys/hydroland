import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';

// Called only by the existing ephemeral HTTP/PostgreSQL E2E suite.
export async function checkDocumentPdfProfiles({db,call,viewerToken,outsiderToken,doc,printContract}) {
 const creation=await db.documentLifecycleEvent.findMany({where:{documentId:doc.id,action:'CREATE'}});
 assert.equal(creation.length,1);
 assert.equal(creation[0].metadata?.pdfProfile,'ADMINISTRATIVE_FORM_V1');
 assert.equal(printContract.renderProfile,'ADMINISTRATIVE_FORM_V1');
 async function inspect(id,pattern,label){
  const response=await call(`/documents/${id}/pdf`,'GET',viewerToken);
  assert.equal(response.status,200,`${label} PDF read`);
  assert.equal(response.headers.get('content-type'),'application/pdf');
  assert.match(response.headers.get('cache-control')||'',/no-store/);
  const bytes=new Uint8Array(await response.arrayBuffer());
  assert.equal(new TextDecoder().decode(bytes.slice(0,5)),'%PDF-');
  const parsed=await PDFDocument.load(bytes);
  assert.ok(parsed.getPageCount()>=1);
  const objects=Array.from(parsed.context.enumerateIndirectObjects(),([,value])=>String(value)).join('\n');
  assert.match(objects,pattern,`${label} embedded Arabic font family`);
  assert.match(objects,/\/FontFile[23]\s+\d+\s+\d+\s+R/,`${label} must embed a real font stream`);
  assert.match(objects,/\/ToUnicode\s+\d+\s+\d+\s+R/,`${label} must include the Unicode character map`);
  assert.equal((await call(`/documents/${id}/pdf`,'GET',outsiderToken)).status,403,`${label} cross-organization denial`);
  return objects;
 }
 const modern=await inspect(doc.id,/Amiri-Regular/i,'Pinned administrative');
 assert.match(modern,/Amiri-Bold/i,'Pinned administrative bold font');
 assert.doesNotMatch(modern,/NotoSansArabic/i,'The new pinned renderer must not silently fall back to the legacy composition');
 // A separate historical fixture has no CREATE profile marker. Do not erase
 // evidence from the newly created document to simulate an old one.
 const stored=await db.managedDocument.findUniqueOrThrow({where:{id:doc.id}});
 const legacy=await db.managedDocument.create({data:{
  organizationId:stored.organizationId,templateId:stored.templateId,
  referenceNumber:`LEGACY-PDF-CI-${randomUUID()}`,department:stored.department,
  status:'DRAFT',version:1,contentHash:stored.contentHash,payload:stored.payload,
  documentBrandVersion:stored.documentBrandVersion,createdByAccountId:stored.createdByAccountId
 }});
 try{
  const before=await db.managedDocument.findUniqueOrThrow({where:{id:legacy.id},include:{lifecycleEvents:true}});
  assert.equal(before.lifecycleEvents.length,0);
  const contractResponse=await call(`/documents/${legacy.id}/print-contract`,'GET',viewerToken);
  assert.equal(contractResponse.status,200);
  const legacyContract=await contractResponse.json();
  assert.equal(legacyContract.renderProfile,undefined);
  assert.deepEqual(legacyContract.branding,printContract.branding);
  const old=await inspect(legacy.id,/NotoSansArabic/i,'Historical unprofiled');
  assert.doesNotMatch(old,/Amiri-(?:Regular|Bold)/i,'Historical documents must retain their original renderer');
  const after=await db.managedDocument.findUniqueOrThrow({where:{id:legacy.id},include:{lifecycleEvents:true}});
  assert.deepEqual(after,before,'Printing must not backfill or mutate historical records');
 }finally{await db.managedDocument.delete({where:{id:legacy.id}});}
 console.log('HTTP PDF profile regression passed: real embedded Amiri for pinned documents; real embedded NotoSansArabic for unprofiled history; Unicode maps, access isolation and no historical mutation.');
}
