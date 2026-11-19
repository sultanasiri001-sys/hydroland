import assert from 'node:assert/strict';

// Reuses the existing source contract. This records document evidence only:
// the preparer, participant and an entered guardian claim are distinct facts.
export async function checkCustomWaiverSources({db,call,ok,pass,owner,staff}){
  const pointerKey='PLATFORM_STAFFING_ORGANIZATION:v1';
  const previous=await db.operationalSetting.findUnique({where:{key:pointerKey}});
  let org,trip,booking,participant,role;
  const wording={key:'waiverText',type:'STATEMENT',labelAr:'نص الإقرار المحفوظ',labelEn:'Pinned acknowledgment wording',required:false,contentAr:'نص إقرار مشاركة اختباري محفوظ في الإصدار الأول.',contentEn:'Synthetic participation acknowledgment pinned to the first version.'};
  try{
    role=await db.roleAssignment.create({data:{accountId:owner.id,role:'ADMIN',status:'ACTIVE'}});
    org=await db.organization.create({data:{displayName:'Isolated custom acknowledgment source',kind:'HYDROLAND_INTERNAL_PLATFORM',status:'ACTIVE',ownerId:owner.id}});
    await db.operationalSetting.upsert({where:{key:pointerKey},create:{key:pointerKey,value:{organizationId:org.id}},update:{value:{organizationId:org.id}}});
    trip=await db.trip.create({data:{organizationId:org.id,title:'Synthetic acknowledgment service',type:'SHORE',startsAt:new Date('2027-01-01T08:00:00Z'),endsAt:new Date('2027-01-01T10:00:00Z'),capacity:2}});
    booking=await db.booking.create({data:{organizationId:org.id,tripId:trip.id,accountId:staff.id}});
    participant=await db.bookingParticipant.create({data:{bookingId:booking.id,accountId:staff.id,fullName:'Synthetic participant source',eligibilityStatus:'PENDING'}});
    const fields=[{key:'parties',type:'SECTION',labelAr:'المشارك والخدمة',labelEn:'Participant and service',required:false},wording,
      {key:'sourceRecordRef',type:'TEXT',labelAr:'مرجع المشارك',labelEn:'Participant reference',required:true},
      {key:'tripRef',type:'TEXT',labelAr:'مرجع الخدمة',labelEn:'Service reference',required:true},
      {key:'guardianClaim',type:'TEXT',labelAr:'بيان ولي الأمر المُدخل',labelEn:'Entered guardian claim',required:false}];
    const original=await ok(owner,'documents/templates/custom','POST',{organizationId:org.id,titleAr:'إقرار مشاركة اختباري',titleEn:'Synthetic participation acknowledgment',department:'LEGAL_CONTRACTS_INSURANCE',fields});
    const route=`documents/organizations/${org.id}/platform-source-preview`;
    const references=[{kind:'BOOKING_PARTICIPANT',id:participant.id},{kind:'BOOKING',id:booking.id},{kind:'TRIP',id:trip.id}];
    const preview=await ok(owner,route,'POST',{templateId:original.id,references});
    const record=kind=>preview.snapshot.records.find(r=>r.kind===kind);
    assert.equal(record('AUTHOR').id,owner.id);assert.equal(record('BOOKING_PARTICIPANT').id,participant.id);
    assert.equal(record('BOOKING_PARTICIPANT').fields.find(f=>f.key==='accountId').value,staff.id);
    assert.equal(record('BOOKING_PARTICIPANT').fields.find(f=>f.key==='bookingId').value,booking.id);
    assert.equal(record('BOOKING').fields.find(f=>f.key==='tripId').value,trip.id);
    const input={organizationId:org.id,templateId:original.id,department:original.department,contentHash:'untrusted',payload:{sourceRecordRef:'replaced by source',tripRef:'replaced by source',guardianClaim:'Unverified entered claim'},sourceBinding:{references,expectedFingerprint:preview.snapshot.fingerprint}};
    const document=await ok(owner,'documents','POST',input);
    assert.equal(document.payload.sourceRecordRef,participant.id);assert.equal(document.payload.tripRef,trip.id);
    assert.equal(document.createdByAccountId,owner.id);assert.notEqual(document.createdByAccountId,staff.id);
    assert.equal(document.payload.guardianClaim,'Unverified entered claim');
    assert.equal(document.payload._platformSources.capturedByAccountId,owner.id);
    assert.equal(document.status,'DRAFT');assert.equal(document.signedByAccountId,null);
    pass('versioned acknowledgment pins the real participant→booking→service source chain and distinguishes preparer from participant/guardian claim');

    const snapshot=await db.managedDocument.findUniqueOrThrow({where:{id:document.id},include:{revisions:true,lifecycleEvents:true}});
    const nextFields=fields.map(f=>f.key===wording.key?{...f,contentAr:'نص إقرار اختباري جديد في الإصدار الثاني.',contentEn:'New synthetic acknowledgment wording in the second version.'}:f);
    const next=await ok(owner,`documents/templates/${original.id}`,'PUT',{fields:nextFields});
    await db.bookingParticipant.update({where:{id:participant.id},data:{fullName:'Changed participant source'}});
    assert.equal((await call(owner,'documents','POST',{...input,templateId:next.id})).status,409);
    const printed=await ok(owner,`documents/${document.id}/print-contract`);
    assert.equal(printed.template.id,original.id);assert.equal(printed.fields.find(f=>f.key===wording.key).value,wording.contentAr);
    assert.ok(printed.fields.some(f=>f.value==='Synthetic participant source'));
    assert.ok(!printed.fields.some(f=>f.value==='Changed participant source'));
    assert.deepEqual(await db.managedDocument.findUniqueOrThrow({where:{id:document.id},include:{revisions:true,lifecycleEvents:true}}),snapshot);
    const retained={...document.payload};delete retained._platformSources;
    assert.equal((await call(owner,`documents/${document.id}/revise`,'POST',{contentHash:'tamper',payload:{...retained,sourceRecordRef:owner.id}})).status,409);
    assert.equal((await call(owner,`documents/${document.id}/revise`,'POST',{contentHash:'tamper',payload:document.payload})).status,400);
    pass('changed source requires a fresh preview; existing acknowledgment wording/source evidence cannot drift or be replaced by client snapshots');

    const restored=await ok(owner,`documents/templates/${next.id}`,'PUT',{fields});
    const fresh=await ok(owner,route,'POST',{templateId:restored.id,references});
    const current=await ok(owner,'documents','POST',{...input,templateId:restored.id,sourceBinding:{references,expectedFingerprint:fresh.snapshot.fingerprint}});
    assert.equal(current.templateId,restored.id);assert.equal(restored.version,3);
    const currentPrint=await ok(owner,`documents/${current.id}/print-contract`);
    assert.equal(currentPrint.fields.find(f=>f.key===wording.key).value,wording.contentAr);
    assert.ok(currentPrint.fields.some(f=>f.value==='Changed participant source'));
    assert.equal((await db.bookingParticipant.findUniqueOrThrow({where:{id:participant.id}})).eligibilityStatus,'PENDING');
    assert.equal((await db.booking.findUniqueOrThrow({where:{id:booking.id}})).status,'PENDING');
    assert.equal((await db.trip.findUniqueOrThrow({where:{id:trip.id}})).status,'DRAFT');
    assert.equal(current.signedByAccountId,null);assert.equal(await db.payment.count({where:{bookingId:booking.id}}),0);
    pass('restored acknowledgment accepts current scoped source evidence without creating a guardian approval, participant signature or operational eligibility');

    const before=await db.managedDocument.count({where:{organizationId:org.id}});
    await db.roleAssignment.update({where:{id:role.id},data:{status:'SUSPENDED'}});
    assert.equal((await call(owner,route,'POST',{templateId:restored.id,references})).status,403);
    assert.equal((await call(owner,'documents','POST',{...input,templateId:restored.id,sourceBinding:{references,expectedFingerprint:fresh.snapshot.fingerprint}})).status,403);
    assert.equal((await call(owner,`documents/${document.id}`)).status,403);
    assert.equal(await db.managedDocument.count({where:{organizationId:org.id}}),before);
    pass('revoked source authority blocks preview, new acknowledgment and document reads while retaining prior source snapshots');
  }finally{
    if(previous)await db.operationalSetting.upsert({where:{key:pointerKey},create:{key:pointerKey,value:previous.value,updatedAt:previous.updatedAt},update:{value:previous.value,updatedAt:previous.updatedAt}});
    else await db.operationalSetting.deleteMany({where:{key:pointerKey}});
    if(org){
      const ids=(await db.managedDocument.findMany({where:{organizationId:org.id},select:{id:true}})).map(d=>d.id);
      await db.documentLifecycleEvent.deleteMany({where:{documentId:{in:ids}}});await db.documentRevision.deleteMany({where:{documentId:{in:ids}}});
      await db.managedDocument.deleteMany({where:{organizationId:org.id}});
      await db.auditEvent.deleteMany({where:{resource:'DocumentTemplate',metadata:{path:['organizationId'],equals:org.id}}});
      await db.documentTemplate.deleteMany({where:{organizationId:org.id}});await db.documentReferenceCounter.deleteMany({where:{organizationId:org.id}});await db.documentBrandSnapshot.deleteMany({where:{organizationId:org.id}});
    }
    if(participant)await db.bookingParticipant.delete({where:{id:participant.id}});
    if(booking)await db.booking.delete({where:{id:booking.id}});
    if(trip)await db.trip.delete({where:{id:trip.id}});
    if(org)await db.organization.delete({where:{id:org.id}});
    if(role)await db.roleAssignment.delete({where:{id:role.id}});
  }
}
