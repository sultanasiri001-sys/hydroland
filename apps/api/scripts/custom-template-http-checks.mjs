import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Called only by the isolated HTTP/PostgreSQL form-library harness. Every actor,
// template and document is a synthetic fixture cleaned up by that harness.
export async function checkCustomTemplates({db,call,ok,pass,owner,staff,approver,signer,outsider,org,boundTemplate}) {
  const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
  const digest=value=>'sha256:'+createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
  const documentHash=(template,payload)=>digest({templateId:template.id,templateVersion:template.version,definition:{department:template.department,titleAr:template.titleAr,titleEn:template.titleEn,printable:template.printable,fields:template.fields},payload});
  const section={key:'details',labelAr:'تفاصيل النموذج',labelEn:'Form details',type:'SECTION',required:false};
  const quantity={key:'quantity',labelAr:'الكمية',labelEn:'Quantity',type:'NUMBER',required:true};
  const statement={key:'acknowledgment',labelAr:'نص الإقرار',labelEn:'Acknowledgment wording',type:'STATEMENT',required:false,contentAr:'نص إقرار مشاركة اختباري — النسخة الأولى.\nيبقى هذا النص مثبتًا في نسخة المستند.',contentEn:'Synthetic participation acknowledgment — first version.\nThis wording remains pinned to the document version.'};
  const fields=[section,quantity,
    {key:'mode',labelAr:'النوع',labelEn:'Mode',type:'SELECT',required:true,options:['A','B']},
    {key:'confirmed',labelAr:'تمت المراجعة',labelEn:'Reviewed',type:'BOOLEAN',required:true},
    {key:'rows',labelAr:'البنود',labelEn:'Items',type:'TABLE',required:false,options:['item','units']},statement];
  const input={organizationId:org.id,titleAr:'نموذج مخصص اختباري',titleEn:'Synthetic custom form',department:'HR',fields,printable:true};
  const count=()=>db.documentTemplate.count({where:{organizationId:org.id}});
  const audits=()=>db.auditEvent.findMany({where:{resource:'DocumentTemplate',action:{startsWith:'DOCUMENT_CUSTOM_TEMPLATE_'},metadata:{path:['organizationId'],equals:org.id}},orderBy:{occurredAt:'asc'}});
  const beforeAudits=await audits();
  const before=await count();
  assert.equal((await call(staff,'documents/templates/custom','POST',input)).status,403);
  assert.equal((await call(outsider,'documents/templates/custom','POST',input)).status,403);
  assert.equal((await call(owner,'documents/templates/custom','POST',{...input,code:'CUSTOM-FORM-'+'A'.repeat(32)})).status,400);
  assert.equal((await call(owner,'documents/templates','POST',{...input,code:'CUSTOM-FORM-'+'A'.repeat(32)})).status,403);
  assert.equal((await call(owner,`documents/templates/${boundTemplate.id}`,'PUT',{fields:[...boundTemplate.fields,{...quantity,key:'added'}]})).status,400);
  assert.equal((await call(owner,`documents/templates/${boundTemplate.id}`,'PUT',{code:'CUSTOM-FORM-'+'A'.repeat(32)})).status,400);
  assert.equal(await count(),before);
  assert.deepEqual(await audits(),beforeAudits);
  pass('custom namespace cannot be forged; staff/foreign actors and bound-template structural changes are denied without a version');

  for(const invalid of [[section],[statement],[{...section,required:true},quantity],[{...section,options:['bad']},quantity],[quantity,quantity],[{...quantity,type:'EXECUTE'}],[quantity,{...statement,contentAr:''}],[quantity,{...statement,contentEn:'x'.repeat(8001)}],[quantity,{...statement,required:true}],[{...quantity,contentAr:'invisible terms'}]]) {
    assert.equal((await call(owner,'documents/templates/custom','POST',{...input,fields:invalid})).status,400);
  }
  assert.equal(await count(),before);
  const original=await ok(owner,'documents/templates/custom','POST',input);
  assert.match(original.code,/^CUSTOM-FORM-[A-F0-9]{32}$/);assert.equal(original.version,1);
  assert.deepEqual(original.fields,fields);
  const ownerPerson=(await db.account.findUniqueOrThrow({where:{id:owner.id},select:{personId:true}})).personId;
  const schemaHash=t=>digest({department:t.department,titleAr:t.titleAr,titleEn:t.titleEn,printable:t.printable,fields:t.fields});
  const createdAudit=(await audits()).at(-1);
  assert.equal(createdAudit.actorId,ownerPerson);assert.equal(createdAudit.resourceId,original.id);
  assert.equal(createdAudit.action,'DOCUMENT_CUSTOM_TEMPLATE_CREATED');
  assert.deepEqual(createdAudit.metadata,{schemaVersion:1,actorAccountId:owner.id,organizationId:org.id,templateId:original.id,code:original.code,templateVersion:1,schemaHash:schemaHash(original),previousTemplateId:null,previousVersion:null});
  assert.ok(createdAudit.occurredAt>=new Date(original.createdAt));
  pass('server creates a custom schema with a section and typed fields, rejecting invalid definitions before persistence');

  const payload={quantity:2,mode:'A',confirmed:false,rows:[{item:'Synthetic',units:2}]};
  const docInput={organizationId:org.id,templateId:original.id,department:'HR',contentHash:'forged-client-hash',payload};
  const documentsBefore=await db.managedDocument.count({where:{organizationId:org.id}});
  for(const invalid of [{...payload,quantity:'not a number'},{...payload,mode:'C'},{...payload,details:'section injection'},{...payload,acknowledgment:'replaced clause'},{...payload,rows:[{unknown:'bad'}]}]) {
    assert.equal((await call(staff,'documents','POST',{...docInput,payload:invalid})).status,400);
  }
  assert.equal(await db.managedDocument.count({where:{organizationId:org.id}}),documentsBefore);
  const started=Date.now(),document=await ok(staff,'documents','POST',docInput);
  assert.equal(document.createdByAccountId,staff.id);assert.equal(document.version,1);assert.equal(document.contentHash,documentHash(original,payload));
  assert.ok(Date.parse(document.createdAt)>=started);
  const firstRevision=await db.documentRevision.findUniqueOrThrow({where:{documentId_version:{documentId:document.id,version:1}}});
  assert.equal(firstRevision.createdByAccountId,staff.id);assert.equal(firstRevision.contentHash,documentHash(original,payload));
  assert.deepEqual(firstRevision.payload,payload);assert.ok(firstRevision.createdAt.getTime()>=started);
  pass('document creation validates actual field types, rejects section answers, and records actor/time/version with a server-calculated hash');

  const changedPayload={...payload,quantity:3};
  const revised=await ok(staff,`documents/${document.id}/revise`,'POST',{contentHash:'another-forged-hash',payload:changedPayload});
  assert.equal(revised.version,2);assert.equal(revised.contentHash,documentHash(original,changedPayload));
  assert.deepEqual(await db.documentRevision.findUniqueOrThrow({where:{documentId_version:{documentId:document.id,version:1}}}),firstRevision);
  const secondRevision=await db.documentRevision.findUniqueOrThrow({where:{documentId_version:{documentId:document.id,version:2}}});
  assert.equal(secondRevision.createdByAccountId,staff.id);assert.deepEqual(secondRevision.payload,changedPayload);
  await ok(staff,`documents/${document.id}/submit`,'POST');
  await ok(approver,`documents/${document.id}/approve`,'POST');
  await ok(signer,`documents/${document.id}/sign`,'POST');
  const pinned=await db.managedDocument.findUniqueOrThrow({where:{id:document.id},include:{revisions:{orderBy:{version:'asc'}},lifecycleEvents:{orderBy:{occurredAt:'asc'}}}});
  assert.equal(pinned.signedByAccountId,signer.id);assert.equal(pinned.approvedByAccountId,approver.id);
  assert.ok(pinned.signedAt>=pinned.approvedAt);assert.equal(pinned.contentHash,documentHash(original,changedPayload));
  assert.deepEqual(pinned.lifecycleEvents.map(e=>[e.action,e.actorAccountId,e.version]),[
    ['CREATE',staff.id,1],['REVISE',staff.id,2],['PENDING_APPROVAL',staff.id,2],['APPROVED',approver.id,2],['SIGNED',signer.id,2]]);
  assert.ok(pinned.lifecycleEvents.every(e=>e.occurredAt.getTime()>=started));
  assert.equal((await call(owner,`documents/${document.id}/revise`,'POST',{contentHash:'tamper',payload})).status,400);
  pass('revision retains the original snapshot; independent approval/signature bind actor/time/hash/version and signed edits are denied');

  const fields2=[{...section,key:'updatedSection',labelAr:'قسم جديد',labelEn:'New section'},
    {...quantity,type:'TEXT'},
    {key:'added',labelAr:'ملاحظة جديدة',labelEn:'New note',type:'TEXTAREA',required:false},
    {...fields[4],required:true,options:['value']},
    {...statement,contentAr:'نص الإقرار المعدل — النسخة الثانية.',contentEn:'Revised acknowledgment wording — second version.'}];
  const next=await ok(owner,`documents/templates/${original.id}`,'PUT',{fields:fields2});
  assert.equal(next.version,2);assert.notEqual(next.id,original.id);assert.deepEqual(next.fields,fields2);
  assert.deepEqual((await db.documentTemplate.findUniqueOrThrow({where:{id:original.id}})).fields,fields);
  assert.equal((await call(staff,'documents','POST',docInput)).status,404);
  assert.equal((await call(staff,'documents','POST',{...docInput,templateId:next.id,payload:{quantity:3,rows:[{value:'test'}]}})).status,400);
  const nextDocument=await ok(staff,'documents','POST',{...docInput,templateId:next.id,payload:{quantity:'three',rows:[{value:'test'}]}});
  assert.equal(nextDocument.templateId,next.id);
  assert.equal(nextDocument.contentHash,documentHash(next,nextDocument.payload));
  const print=await ok(owner,`documents/${document.id}/print-contract`);
  assert.equal(print.template.id,original.id);assert.equal(print.template.version,1);assert.equal(print.contentHash,pinned.contentHash);
  assert.equal(print.fields[0].type,'SECTION');assert.equal(print.fields.find(f=>f.key==='quantity').type,'NUMBER');
  assert.equal(print.fields.find(f=>f.key==='acknowledgment').value,statement.contentAr);
  assert.equal(print.fields.find(f=>f.key==='acknowledgment').contentEn,statement.contentEn);
  const nextPrint=await ok(owner,`documents/${nextDocument.id}/print-contract`);
  assert.equal(nextPrint.fields.find(f=>f.key==='acknowledgment').value,fields2.at(-1).contentAr);
  const pdf=await call(owner,`documents/${document.id}/pdf`);assert.equal(pdf.status,200);assert.match(pdf.data.slice(0,8),/^%PDF-/);
  const preview=await call(owner,`documents/organizations/${org.id}/templates/${next.id}/preview-pdf`,'POST',{fields});
  assert.equal(preview.status,200);assert.match(preview.data.slice(0,8),/^%PDF-/);
  if(process.env.FORM_LIBRARY_E2E_ARTIFACT_DIR){
    const directory=process.env.FORM_LIBRARY_E2E_ARTIFACT_DIR;await mkdir(directory,{recursive:true});
    await writeFile(join(directory,'custom-signed-v1.pdf'),pdf.bytes);
    await writeFile(join(directory,'custom-edited-preview.pdf'),preview.bytes);
    await writeFile(join(directory,'custom-signed-v1.print-contract.json'),JSON.stringify(print,null,2));
  }
  pass('custom structural revision changes new-document validation and PDF preview while signed documents retain the old schema and section');
  assert.notEqual(documentHash({...original,fields:fields.map(f=>f.key==='acknowledgment'?{...f,contentAr:'Changed terms'}:f)},changedPayload),pinned.contentHash);
  pass('fixed bilingual acknowledgment wording is versioned, cannot be replaced by an answer, and is included in the signed content hash');

  const restored=await ok(owner,`documents/templates/${next.id}`,'PUT',{titleAr:original.titleAr,titleEn:original.titleEn,fields:original.fields,printable:original.printable});
  assert.equal(restored.version,3);assert.notEqual(restored.id,original.id);
  const history=await ok(owner,`documents/organizations/${org.id}/templates/${original.code}/history`);
  assert.deepEqual(history.items.map(t=>[t.version,t.status]),[[3,'ACTIVE'],[2,'INACTIVE'],[1,'INACTIVE']]);
  assert.deepEqual(history.items[0].fields,fields);assert.deepEqual(history.items[1].fields,fields2);
  const templateAudits=await audits();
  assert.equal(templateAudits.length,3);
  assert.deepEqual(templateAudits.map(a=>[a.actorId,a.resourceId,a.metadata.actorAccountId,a.metadata.templateVersion,a.metadata.schemaHash,a.metadata.previousTemplateId]),[
    [ownerPerson,original.id,owner.id,1,schemaHash(original),null],
    [ownerPerson,next.id,owner.id,2,schemaHash(next),original.id],
    [ownerPerson,restored.id,owner.id,3,schemaHash(original),next.id]]);
  assert.ok(templateAudits.every(a=>a.occurredAt instanceof Date));
  const restoredDocument=await ok(staff,'documents','POST',{...docInput,templateId:restored.id});
  assert.equal(restoredDocument.templateId,restored.id);
  assert.equal((await ok(owner,`documents/${restoredDocument.id}/print-contract`)).fields.find(f=>f.key==='acknowledgment').value,statement.contentAr);
  assert.equal((await db.managedDocument.findUniqueOrThrow({where:{id:nextDocument.id}})).templateId,next.id);
  assert.deepEqual(await db.managedDocument.findUniqueOrThrow({where:{id:document.id},include:{revisions:{orderBy:{version:'asc'}},lifecycleEvents:{orderBy:{occurredAt:'asc'}}}}),pinned);
  pass('restoring a custom schema publishes version 3; existing signed document, revisions and lifecycle evidence are byte-for-byte unchanged');

  await db.$executeRawUnsafe(`CREATE FUNCTION c11_reject_custom_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action LIKE 'DOCUMENT_CUSTOM_TEMPLATE_%' THEN RAISE EXCEPTION 'Synthetic C11 audit failure'; END IF; RETURN NEW; END; $$`);
  await db.$executeRawUnsafe(`CREATE TRIGGER c11_reject_custom_audit BEFORE INSERT ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION c11_reject_custom_audit()`);
  const beforeFailure=await count();
  try{
    assert.equal((await call(owner,`documents/templates/${restored.id}`,'PUT',{titleAr:'Must roll back'})).status,500);
    assert.equal((await call(owner,'documents/templates/custom','POST',input)).status,500);
    assert.equal(await count(),beforeFailure);assert.deepEqual(await audits(),templateAudits);
    assert.equal((await db.documentTemplate.findUniqueOrThrow({where:{id:restored.id}})).status,'ACTIVE');
  }finally{
    await db.$executeRawUnsafe('DROP TRIGGER c11_reject_custom_audit ON "AuditEvent"');
    await db.$executeRawUnsafe('DROP FUNCTION c11_reject_custom_audit()');
  }
  pass('failed audit insertion rolls back custom creation and publication, including retirement of the previous active version');

  await db.organizationMember.update({where:{organizationId_accountId:{organizationId:org.id,accountId:approver.id}},data:{status:'SUSPENDED'}});
  const versionCount=await count();
  assert.equal((await call(approver,`documents/templates/${restored.id}`,'PUT',{fields:fields2})).status,403);
  assert.equal((await call(approver,'documents/templates/custom','POST',input)).status,403);
  assert.equal((await call(approver,`documents/organizations/${org.id}/templates/${original.code}/history`)).status,403);
  assert.equal((await call(approver,`documents/${document.id}`)).status,403);
  assert.equal(await count(),versionCount);
  assert.deepEqual(await audits(),templateAudits);
  assert.deepEqual(await db.managedDocument.findUniqueOrThrow({where:{id:document.id},include:{revisions:{orderBy:{version:'asc'}},lifecycleEvents:{orderBy:{occurredAt:'asc'}}}}),pinned);
  pass('revoked administrator cannot create, publish, restore, read history or read signed documents; prior signature evidence is retained');
}
