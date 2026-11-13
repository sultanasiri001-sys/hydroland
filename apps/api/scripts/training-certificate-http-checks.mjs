import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {trainingStandardFixture} from './training-standard-isolated-fixture.mjs';

export async function checkTrainingCertificates(db,{base,instructor,student,owner,foreignOwner,organizationId,offerId,recordId,accounts,persons,ids,request,ok}){
 const loopback=value=>['localhost','127.0.0.1','[::1]'].includes(new URL(value).hostname);
 assert.equal(process.env.CI,'true');assert.ok(loopback(base)&&loopback(process.env.DATABASE_URL),'Certificate tests require isolated loopback API and database');
 const standards=trainingStandardFixture(db,base);
 const reviewers=[];
 for(const role of ['ADMIN','REVIEWER']){
  const person=await db.person.create({data:{firstName:'Certificate '+role,lastName:'Isolated QA'}});persons.push(person);
  const account=await db.account.create({data:{personId:person.id,email:'certificate-'+randomUUID()+'@example.invalid',passwordHash:'test',status:'ACTIVE',emailVerifiedAt:new Date()}});accounts.push(account);reviewers.push(account);
  await db.roleAssignment.create({data:{accountId:account.id,role,status:'ACTIVE'}});
 }
 const [admin,reviewer]=reviewers,recommend=id=>'/training/professional/me/records/'+id+'/certificate-recommendation',decision=id=>'/training/certificates/'+id+'/decision';
 const fixture=async code=>{
  const row=await db.trainingEnrollment.create({
   data:{storeCourseOfferId:offerId,studentAccountId:student.id,instructorAccountId:instructor.id,centerOrganizationId:organizationId,courseCode:code,status:'COMPLETED',completedAt:new Date(),metadata:{private:'DO_NOT_RETURN',medical:'DO_NOT_RETURN'},
    record:{create:{status:'COMPLETED',progressPercent:100,completedAt:new Date(),
     stages:{create:{stageType:'اختبار شهادة معزول — لا تدريب فعلي',deliveryMode:'THEORY',sequence:1,status:'COMPLETED',progressPercent:100,skills:{create:{skillCode:'QA-CERT-PROCEDURE',name:'مهارة اختبار إجرائي',status:'COMPETENT',signedOffByInstructorId:instructor.id,signedOffAt:new Date()}}}},
     sessions:{create:{instructorAccountId:instructor.id,status:'COMPLETED',startsAt:new Date(Date.now()-600000),endsAt:new Date()}}
    }}
   },include:{record:true}
  });
  ids.push(row.id,row.record.id);await standards.bind(row.id,'QA-CERT-PROCEDURE');return row.record;
 };
 try{
  assert.equal((await request(null,'/training/certificates')).status,401);
  for(const account of [owner,foreignOwner,student,instructor])assert.equal((await request(account,'/training/certificates')).status,403);
  for(const account of [owner,foreignOwner,student])assert.equal((await request(account,recommend(recordId),'POST')).status,403);
  // Both roles intentionally exist only on isolated fixtures: a broad admin/center role
  // must not bypass the assigned instructor's current role or membership.
  await db.roleAssignment.createMany({data:[{accountId:instructor.id,role:'ADMIN',status:'ACTIVE'},{accountId:instructor.id,role:'DIVE_CENTER',status:'ACTIVE'},{accountId:student.id,role:'ADMIN',status:'ACTIVE'}]});
  await db.organizationMember.updateMany({where:{accountId:instructor.id,organizationId},data:{role:'OWNER'}});
  await db.roleAssignment.update({where:{accountId_role:{accountId:instructor.id,role:'INSTRUCTOR'}},data:{status:'SUSPENDED'}});
  assert.equal((await request(instructor,recommend(recordId),'POST')).status,403);
  await db.roleAssignment.update({where:{accountId_role:{accountId:instructor.id,role:'INSTRUCTOR'}},data:{status:'ACTIVE'}});
  await db.organizationMember.updateMany({where:{accountId:instructor.id,organizationId},data:{status:'SUSPENDED'}});
  assert.equal((await request(instructor,recommend(recordId),'POST')).status,403);
  await db.organizationMember.updateMany({where:{accountId:instructor.id,organizationId},data:{status:'ACTIVE',role:'INSTRUCTOR'}});
  const record=await db.trainingRecord.findUniqueOrThrow({where:{id:recordId},include:{enrollment:true,stages:{include:{skills:true}}}});
  await db.trainingEnrollment.update({where:{id:record.enrollmentId},data:{status:'ACTIVE'}});
  assert.equal((await request(instructor,recommend(recordId),'POST')).status,409,'record completion alone is insufficient');
  assert.equal(ok(await request(instructor,'/training/professional/me/certificates')).find(row=>row.trainingRecordId===recordId).readyForRecommendation,false);
  await db.trainingEnrollment.update({where:{id:record.enrollmentId},data:{status:'COMPLETED'}});
  const submitted=await Promise.all(Array.from({length:4},()=>request(instructor,recommend(recordId),'POST')));
  const certificate=ok(submitted[0]);ids.push(certificate.id);
  for(const result of submitted)assert.equal(ok(result).id,certificate.id);
  assert.equal(submitted.filter(result=>result.body.replayed===false).length,1);
  assert.equal(await db.trainingCertificate.count({where:{trainingRecordId:recordId}}),1);
  assert.equal(await db.auditEvent.count({where:{resourceId:certificate.id,action:'training.certificate_recommended'}}),1);
  assert.equal(certificate.status,'RECOMMENDED');assert.equal(certificate.certificateNumber,null);assert.equal(certificate.issuedAt,null);
  const queue=ok(await request(admin,'/training/certificates')),listed=queue.items.find(row=>row.id===certificate.id);
  assert.equal(listed.canReview,true);assert.equal(listed.canApprove,true);assert.equal(listed.record.stages[0].skills[0].signed,true);
  assert.ok(!JSON.stringify(queue).match(/example\.invalid|passwordHash|verificationToken|DO_NOT_RETURN|studentAccountId|recommendedByInstructorId/));
  const body={outcome:'APPROVED',expectedUpdatedAt:certificate.updatedAt,reviewed:true,reason:'قرار اختبار معزول لا يمثل تأهيل غوص'};
  for(const account of [instructor,student]){
   assert.equal(ok(await request(account,'/training/certificates')).items.find(row=>row.id===certificate.id).canReview,false);
   assert.equal((await request(account,decision(certificate.id),'POST',body)).status,403,'instructor and student cannot review their own certificate');
  }
  for(const account of [owner,foreignOwner])assert.equal((await request(account,decision(certificate.id),'POST',body)).status,403);
  for(const extra of [{reviewed:false},{reason:''},{expectedUpdatedAt:'bad'},{outcome:'REVOKED'},{outcome:['APPROVED']},{studentAccountId:student.id}])assert.equal((await request(admin,decision(certificate.id),'POST',{...body,...extra})).status,400);
  assert.equal((await request(admin,decision(certificate.id),'POST',{...body,expectedUpdatedAt:'2000-01-01T00:00:00Z'})).status,409);
  await db.roleAssignment.update({where:{accountId_role:{accountId:admin.id,role:'ADMIN'}},data:{status:'SUSPENDED'}});
  assert.equal((await request(admin,'/training/certificates')).status,403);assert.equal((await request(admin,decision(certificate.id),'POST',body)).status,403);
  await db.roleAssignment.update({where:{accountId_role:{accountId:admin.id,role:'ADMIN'}},data:{status:'ACTIVE'}});
  await db.account.update({where:{id:admin.id},data:{status:'SUSPENDED'}});
  assert.ok([401,403].includes((await request(admin,'/training/certificates')).status));assert.ok([401,403].includes((await request(admin,decision(certificate.id),'POST',body)).status));
  await db.account.update({where:{id:admin.id},data:{status:'ACTIVE'}});
  const skill=record.stages[0].skills[0];await db.trainingSkill.update({where:{id:skill.id},data:{signedOffAt:null}});
  assert.equal(ok(await request(admin,'/training/certificates')).items.find(row=>row.id===certificate.id).canApprove,false);
  assert.equal((await request(admin,decision(certificate.id),'POST',body)).status,409,'approval rechecks signatures at save');
  await db.trainingSkill.update({where:{id:skill.id},data:{signedOffAt:skill.signedOffAt}});
  const approved=await Promise.all([1,2].map(()=>request(admin,decision(certificate.id),'POST',body)));
  for(const result of approved){const row=ok(result);assert.equal(row.status,'APPROVED');assert.match(row.certificateNumber,/^HYD-TRN-\d{4}-[A-F0-9]{16}$/)}
  assert.equal(approved.filter(result=>result.body.replayed===false).length,1);
  assert.equal(approved.filter(result=>result.body.verificationToken).length,1,'verification token is returned only on first issuance');
  const issued=await db.trainingCertificate.findUniqueOrThrow({where:{id:certificate.id}}),raw=approved.find(result=>result.body.verificationToken).body.verificationToken;
  assert.equal(issued.verificationTokenHash,createHash('sha256').update(raw).digest('hex'));
  assert.equal(await db.auditEvent.count({where:{resourceId:certificate.id,action:'training.certificate_decided'}}),1);
  assert.equal((await request(admin,decision(certificate.id),'POST',{...body,outcome:'REJECTED'})).status,409);
  const history=ok(await request(admin,'/training/certificates?status=APPROVED'));
  assert.ok(history.items.some(row=>row.id===certificate.id&&row.canReview===false));assert.ok(!JSON.stringify(history).includes('verificationToken'));
  const rejectedRecord=await fixture('QA-CERT-REJECT'),rejected=ok(await request(instructor,recommend(rejectedRecord.id),'POST'));ids.push(rejected.id);
  await db.trainingSkill.updateMany({where:{trainingStage:{trainingRecordId:rejectedRecord.id}},data:{signedOffAt:null}});
  const rejectedBody={...body,outcome:'REJECTED',expectedUpdatedAt:rejected.updatedAt,reason:'رفض اختبار معزول لغياب التوقيع'};
  const declined=ok(await request(reviewer,decision(rejected.id),'POST',rejectedBody));assert.equal(declined.status,'REJECTED');assert.equal(declined.certificateNumber,null);assert.equal(declined.issuedAt,null);assert.equal(declined.verificationToken,undefined);
  assert.equal(ok(await request(instructor,'/training/professional/me/certificates')).find(row=>row.trainingRecordId===rejectedRecord.id).certificate.reviewReason,rejectedBody.reason);
  const raceRecord=await fixture('QA-CERT-CONCURRENT'),race=ok(await request(instructor,recommend(raceRecord.id),'POST'));ids.push(race.id);
  const raceBody={...body,expectedUpdatedAt:race.updatedAt},results=await Promise.all([request(admin,decision(race.id),'POST',raceBody),request(reviewer,decision(race.id),'POST',{...raceBody,outcome:'REJECTED'})]);
  assert.equal(results.filter(result=>result.status===201).length,1);assert.equal(results.filter(result=>result.status===409).length,1);
  assert.equal(await db.auditEvent.count({where:{resourceId:race.id,action:'training.certificate_decided'}}),1);
  // Exercise the new progression gate through the actual Nest HTTP/PostgreSQL path.
  // All profile limits, source approvals, forms and certificates here are synthetic CI data.
  const progressionRecord=await fixture('QA-CERT-PROGRESSION');
  const progressionEnrollment=await db.trainingEnrollment.findUniqueOrThrow({where:{id:progressionRecord.enrollmentId}});
  const profileRow=await db.policyControl.findUniqueOrThrow({where:{id:progressionEnrollment.metadata.trainingStandard.profileId}});
  const profile=structuredClone(profileRow.metadata.profile);
  Object.assign(profile.requirements,{minimumCompletedSessions:2,minimumOpenWaterDives:2,minimumOpenWaterMinutes:20,
   openWaterDiveRequirements:[{sequence:1,minimumBottomMinutes:10,maximumDepthMetres:8},{sequence:2,minimumBottomMinutes:10,maximumDepthMetres:12}],
   supervision:[...profile.requirements.supervision,{environment:'OPEN_WATER',minimumAge:0,maximumAge:120,studentsPerInstructor:1,maximumDepthMetres:16}]});
  const {trainingStandardHash,trainingStandardBinding}=createRequire(import.meta.url)('../dist/governance/training-standard-profile.js');
  const hash=trainingStandardHash(profile);
  await db.policyControl.update({where:{id:profileRow.id},data:{metadata:{...profileRow.metadata,profile,contentHash:hash,approval:{...profileRow.metadata.approval,profileHash:hash}}}});
  const start=new Date(Date.now()-7200000),end=new Date(start.getTime()+3600000);
  await db.trainingEnrollment.update({where:{id:progressionEnrollment.id},data:{enrolledAt:new Date(start.getTime()-86400000),metadata:{...progressionEnrollment.metadata,trainingStandard:trainingStandardBinding(profileRow.id,profile)}}});
  const sessionData={instructorAccountId:instructor.id,status:'COMPLETED',startsAt:start,endsAt:end,evidence:{startedAt:start.toISOString(),completedAt:end.toISOString(),trainingStandardContext:{environment:'OPEN_WATER',plannedMaximumDepthMetres:12}}};
  const firstSession=await db.trainingSession.findFirstOrThrow({where:{trainingRecordId:progressionRecord.id}});
  await db.trainingSession.update({where:{id:firstSession.id},data:sessionData});
  const secondSession=await db.trainingSession.create({data:{...sessionData,trainingRecordId:progressionRecord.id}});ids.push(secondSession.id);
  let createdTemplate=null,proof=null;
  try{
   const template=await db.documentTemplate.findFirst({where:{organizationId,code:'TRAINING_DIVE_LOG'}})||await db.documentTemplate.create({data:{organizationId,code:'TRAINING_DIVE_LOG',titleAr:'اختبار سجل غوص معزول',titleEn:'SYNTHETIC CI dive log',department:'TRAINING',fields:[]}}).then(row=>{createdTemplate=row.id;return row;});
   const payload={trainingEnrollmentId:progressionEnrollment.id,trainingStandardHash:hash,studentAccountId:student.id,instructorAccountId:instructor.id,openWaterDives:[
    {id:randomUUID(),sequence:1,sessionId:firstSession.id,environment:'OPEN_WATER',startedAt:new Date(start.getTime()+60000).toISOString(),bottomMinutes:10,maximumDepthMetres:9},
    {id:randomUUID(),sequence:2,sessionId:secondSession.id,environment:'OPEN_WATER',startedAt:new Date(start.getTime()+1800000).toISOString(),bottomMinutes:10,maximumDepthMetres:12}]};
   const documentHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
   proof=await db.managedDocument.create({data:{organizationId,templateId:template.id,referenceNumber:'QA-PROGRESSION-'+randomUUID(),department:'TRAINING',status:'SIGNED',contentHash:documentHash(payload),payload,createdByAccountId:instructor.id,approvedByAccountId:admin.id,signedByAccountId:instructor.id,approvedAt:new Date(),signedAt:new Date()}});
   const blocked=await request(instructor,recommend(progressionRecord.id),'POST');
   assert.equal(blocked.status,409);assert.ok(blocked.body.gaps.includes('STANDARD_DIVE_DEPTH_EXCEEDED'));
   assert.equal(await db.trainingCertificate.count({where:{trainingRecordId:progressionRecord.id}}),0,'invalid first dive creates no recommendation');
   payload.openWaterDives[0].maximumDepthMetres=8;
   await db.managedDocument.update({where:{id:proof.id},data:{payload,contentHash:documentHash(payload)}});
   const recommended=ok(await request(instructor,recommend(progressionRecord.id),'POST'));ids.push(recommended.id);
   payload.openWaterDives[0].bottomMinutes=15;payload.openWaterDives[1].bottomMinutes=5;
   await db.managedDocument.update({where:{id:proof.id},data:{payload,contentHash:documentHash(payload)}});
   const approvalBody={...body,expectedUpdatedAt:recommended.updatedAt};
   const denied=await request(admin,decision(recommended.id),'POST',approvalBody);
   assert.equal(denied.status,409);assert.ok(denied.body.gaps.includes('STANDARD_DIVE_DURATION_REQUIRED'));
   assert.equal((await db.trainingCertificate.findUniqueOrThrow({where:{id:recommended.id}})).status,'RECOMMENDED','failed source check does not issue certificate');
   payload.openWaterDives[0].bottomMinutes=10;payload.openWaterDives[1].bottomMinutes=10;
   await db.managedDocument.update({where:{id:proof.id},data:{payload,contentHash:documentHash(payload)}});
   assert.equal(ok(await request(admin,decision(recommended.id),'POST',approvalBody)).status,'APPROVED');
   console.log('SYNTHETIC progression HTTP/PostgreSQL: individual depth prevents recommendation, individual duration prevents issuance despite sufficient total minutes, corrected signed proof permits independent approval.');
  }finally{
   if(proof)await db.managedDocument.delete({where:{id:proof.id}});
   if(createdTemplate)await db.documentTemplate.delete({where:{id:createdTemplate}});
  }
  for(let i=0;i<21;i++){const padding=await fixture('QA-CERT-PAGE-'+i);const row=await db.trainingCertificate.create({data:{trainingRecordId:padding.id,studentAccountId:student.id,courseCode:'QA-CERT-PAGE-'+i,recommendedByInstructorId:instructor.id}});ids.push(row.id)}
  const first=ok(await request(admin,'/training/certificates')),second=ok(await request(admin,'/training/certificates?cursor='+first.nextCursor));
  assert.equal(first.items.length,20);assert.ok(first.nextCursor);assert.ok(second.items.length);assert.ok(second.items.every(row=>!first.items.some(prior=>prior.id===row.id)));
  assert.equal((await request(admin,'/training/certificates?status=APPROVED&cursor='+first.nextCursor)).status,404);
  for(const query of ['status=BAD','cursor=bad','status=RECOMMENDED&status=APPROVED','cursor=x&cursor=y'])assert.equal((await request(admin,'/training/certificates?'+query)).status,400);
  console.log('Training certificate HTTP/DB path passed: active assigned instructor -> one audited recommendation -> independent reviewer approval/rejection -> persisted history, with concurrent/replay/stale/role-loss/privacy/pagination guards. All issuance is isolated CI only.');
 }finally{
  await standards.cleanup();
  await db.organizationMember.updateMany({where:{accountId:instructor.id,organizationId},data:{status:'ACTIVE',role:'INSTRUCTOR'}});
  await db.roleAssignment.deleteMany({where:{OR:[{accountId:instructor.id,role:{in:['ADMIN','DIVE_CENTER']}},{accountId:student.id,role:'ADMIN'}]}});
 }
}

