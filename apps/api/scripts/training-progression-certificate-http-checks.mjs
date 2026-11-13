import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';

// Certificate endpoint integration for the EXISTING PR585/586 evaluator/adapter.
// Synthetic, committed fixtures on an isolated CI database; this does not test
// document lifecycle permissions or represent any real source/signature approval.
export async function checkProgressionCertificateHttp(db,{base,fixture,instructor,student,owner,reviewer,organizationId,ids,request,ok}){
 const loopback=value=>['localhost','127.0.0.1','[::1]'].includes(new URL(value).hostname);
 assert.equal(process.env.CI,'true');assert.ok(loopback(base)&&loopback(process.env.DATABASE_URL),'Progression HTTP checks require isolated loopback services');
 const {trainingStandardHash,trainingStandardBinding}=createRequire(import.meta.url)('../dist/governance/training-standard-profile.js');
 const record=await fixture('QA-CERT-PROGRESSION-HTTP');
 const enrollment=await db.trainingEnrollment.findUniqueOrThrow({where:{id:record.enrollmentId}});
 const source=await db.policyControl.findUniqueOrThrow({where:{id:enrollment.metadata.trainingStandard.profileId}});
 const profile=structuredClone(source.metadata.profile);
 Object.assign(profile.requirements,{minimumCompletedSessions:2,minimumOpenWaterDives:2,minimumOpenWaterMinutes:0,requiredFormCodes:['TRAINING-DIVE-LOG'],
  supervision:[...profile.requirements.supervision,{environment:'OPEN_WATER',minimumAge:0,maximumAge:120,studentsPerInstructor:1,maximumDepthMetres:20}]});
 profile.diveProgression={schemaVersion:2,timeZone:'Asia/Riyadh',
  qualification:{minimumDepthMetres:3,minimumPercentAtDepth:60,depthFractionComparison:'MORE_THAN',alternatives:[{metric:'SUBMERGED_SECONDS',minimum:960},{metric:'BREATHED_GAS_LITRES',minimum:1250}]},
  qualifyingDives:[7,11].map((maximumDepthMetres,i)=>({number:i+1,maximumDepthMetres,requiredSkillCodesBeforeDive:[]})),
  experienceLimits:[],dayLimits:{maximumDives:3,depthLimits:[],afterConfinedWaterMaximumDives:2}};
 const hash=trainingStandardHash(profile);
 // Deliberate synthetic fixture adoption only. Never an operational profile migration.
 await db.policyControl.update({where:{id:source.id},data:{metadata:{...source.metadata,profile,contentHash:hash,approval:{...source.metadata.approval,profileHash:hash}}}});
 const start=new Date(Date.now()-7200000);
 await db.trainingEnrollment.update({where:{id:enrollment.id},data:{enrolledAt:new Date(start.getTime()-86400000),metadata:{...enrollment.metadata,trainingStandard:trainingStandardBinding(source.id,profile)}}});
 const existing=await db.trainingSession.findFirstOrThrow({where:{trainingRecordId:record.id}}),dives=[];
 for(let i=0;i<2;i++){
  const begin=new Date(start.getTime()+i*1800000),finish=new Date(begin.getTime()+1200000),diveStart=new Date(begin.getTime()+60000),diveEnd=new Date(diveStart.getTime()+960000);
  const evidence={trainingStandardContext:{environment:'OPEN_WATER',plannedMaximumDepthMetres:11},startedAt:begin.toISOString(),endedAt:finish.toISOString(),startedByAccountId:instructor.id,completedByAccountId:instructor.id};
  for(const [prefix,account] of [['instructor',instructor],['student',student]])Object.assign(evidence,{[prefix+'CheckInAt']:begin.toISOString(),[prefix+'CheckInByAccountId']:account.id,[prefix+'CheckInSource']:'SELF'});
  const data={instructorAccountId:instructor.id,status:'COMPLETED',startsAt:begin,endsAt:finish,evidence};
  const session=i?await db.trainingSession.create({data:{...data,trainingRecordId:record.id}}):await db.trainingSession.update({where:{id:existing.id},data});
  if(i)ids.push(session.id);
  dives.push({id:randomUUID(),sessionId:session.id,environment:'OPEN_WATER',startedAt:diveStart.toISOString(),endedAt:diveEnd.toISOString(),kind:'QUALIFYING',qualifyingNumber:i+1,maximumDepthMetres:i?11:7,submergedSeconds:960,depthThresholdMetres:3,secondsAtOrDeeperThanThreshold:720,breathedGasLitres:null});
 }
 let createdTemplate=null,document=null;
 try{
  const template=await db.documentTemplate.findFirst({where:{organizationId,code:'TRAINING-DIVE-LOG'}})||await db.documentTemplate.create({data:{organizationId,code:'TRAINING-DIVE-LOG',titleAr:'سجل اختبار اصطناعي',titleEn:'SYNTHETIC CI dive log',department:'TRAINING',fields:[]}}).then(row=>{createdTemplate=row.id;return row;});
  const payload={trainingEnrollmentId:enrollment.id,trainingStandardHash:hash,studentAccountId:student.id,instructorAccountId:instructor.id,openWaterDives:dives};
  const documentHash=()=>createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  document=await db.managedDocument.create({data:{organizationId,templateId:template.id,referenceNumber:'QA-PROGRESSION-'+randomUUID(),department:'TRAINING',status:'SIGNED',contentHash:documentHash(),payload,createdByAccountId:owner.id,approvedByAccountId:reviewer.id,signedByAccountId:instructor.id,approvedAt:new Date(),signedAt:new Date()}});
  // Persisted-proof fault injection only. Signed documents remain immutable through
  // the production document endpoints; that boundary is covered by the existing suite.
  const save=()=>db.managedDocument.update({where:{id:document.id},data:{payload,contentHash:documentHash()}});
  // Real scheduling/START endpoints share the completion evidence reader. These
  // persisted fixture mutations remove proof; they do not forge a production API.
  const originals=await db.trainingSession.findMany({where:{trainingRecordId:record.id},orderBy:{startsAt:'asc'}});
  const savedDives=structuredClone(dives);
  await db.trainingEnrollment.update({where:{id:enrollment.id},data:{status:'ACTIVE',completedAt:null}});
  await db.trainingRecord.update({where:{id:record.id},data:{status:'IN_PROGRESS',completedAt:null,progressPercent:50}});
  dives.pop();await save();
  await db.trainingSession.update({where:{id:originals[1].id},data:{status:'CANCELLED',evidence:{}}});
  const tomorrow=new Date();tomorrow.setUTCDate(tomorrow.getUTCDate()+1);tomorrow.setUTCHours(3,0,0,0);
  const planInput=async(depth=11)=>({requestId:randomUUID(),instructorAccountId:instructor.id,
   startsAt:tomorrow.toISOString(),endsAt:new Date(tomorrow.getTime()+1800000).toISOString(),
   environment:'OPEN_WATER',plannedMaximumDepthMetres:depth,diveKind:'QUALIFYING',qualifyingNumber:2,
   expectedUpdatedAt:(await db.trainingEnrollment.findUniqueOrThrow({where:{id:enrollment.id}})).updatedAt.toISOString(),reason:'Synthetic source-bound planning endpoint'});
  const createPlan='/center/me/training/enrollments/'+enrollment.id+'/sessions';
  const rejectedInput=await planInput(12),beforeCount=await db.trainingSession.count({where:{trainingRecordId:record.id}});
  const planDenied=await request(owner,createPlan,'POST',rejectedInput);
  assert.equal(planDenied.status,409);assert.equal(planDenied.body.code,'TRAINING_DIVE_PLAN_REQUIRED');
  assert.ok(planDenied.body.violations.some(row=>row.code==='PROGRESSION_DEPTH'));
  assert.equal(await db.trainingSession.count({where:{trainingRecordId:record.id}}),beforeCount);
  assert.equal(await db.auditEvent.count({where:{resourceId:rejectedInput.requestId}}),0);
  const raceBodies=[await planInput(),await planInput()],race=await Promise.all(raceBodies.map(body=>request(owner,createPlan,'POST',body)));
  assert.equal(race.filter(row=>row.status===201).length,1);assert.equal(race.filter(row=>row.status===409).length,1);
  const winner=race.findIndex(row=>row.status===201),planBody=raceBodies[winner],planned=ok(race[winner]);ids.push(planned.id);
  assert.equal(planned.id,planBody.requestId);
  assert.equal(ok(await request(owner,createPlan,'POST',planBody)).replayed,true);
  assert.equal(await db.trainingSession.count({where:{id:planned.id}}),1);
  assert.equal(await db.trainingCertificate.count({where:{trainingRecordId:record.id}}),0);
  // Remove actual predecessor proof and retain a future first-dive reservation.
  await db.managedDocument.update({where:{id:document.id},data:{status:'DRAFT'}});
  const now=new Date(),end=new Date(now.getTime()+600000);
  await db.trainingSession.update({where:{id:originals[0].id},data:{status:'SCHEDULED',startsAt:tomorrow,endsAt:new Date(tomorrow.getTime()+1200000),evidence:{trainingStandardContext:{environment:'OPEN_WATER',plannedMaximumDepthMetres:7,diveKind:'QUALIFYING',qualifyingNumber:1}}}});
  await db.trainingSession.update({where:{id:planned.id},data:{startsAt:new Date(now.getTime()-1000),endsAt:end}});
  const action=async name=>{const row=await db.trainingSession.findUniqueOrThrow({where:{id:planned.id}});return request(owner,'/center/me/training/sessions/'+row.id+'/actions','PATCH',{action:name,expectedUpdatedAt:row.updatedAt.toISOString(),reason:'Synthetic actual START endpoint'})};
  for(const name of ['OPEN','INSTRUCTOR_CHECK_IN','STUDENT_CHECK_IN'])ok(await action(name));
  const ready=await db.trainingSession.findUniqueOrThrow({where:{id:planned.id}}),auditCount=await db.auditEvent.count({where:{resourceId:planned.id}});
  const startDenied=await action('START');assert.equal(startDenied.status,409);assert.equal(startDenied.body.code,'TRAINING_DIVE_PLAN_REQUIRED');
  assert.ok(startDenied.body.violations.some(row=>row.code==='ACTUAL_PREDECESSOR_REQUIRED'));
  assert.deepEqual(await db.trainingSession.findUniqueOrThrow({where:{id:planned.id}}),ready);
  assert.equal(await db.auditEvent.count({where:{resourceId:planned.id}}),auditCount);
  ok(await action('CANCEL'));
  for(const row of originals)await db.trainingSession.update({where:{id:row.id},data:{status:row.status,startsAt:row.startsAt,endsAt:row.endsAt,evidence:row.evidence}});
  dives.splice(0,dives.length,...savedDives);await save();await db.managedDocument.update({where:{id:document.id},data:{status:'SIGNED'}});
  await db.trainingEnrollment.update({where:{id:enrollment.id},data:{status:'COMPLETED',completedAt:new Date()}});
  await db.trainingRecord.update({where:{id:record.id},data:{status:'COMPLETED',completedAt:new Date(),progressPercent:100}});
  console.log('A14 planning/START HTTP/PostgreSQL: depth rejection has no writes; valid partial-history reservation and idempotent replay; actual START refuses planned-only predecessor with no writes. Synthetic isolated endpoints only.');
  const recommend='/training/professional/me/records/'+record.id+'/certificate-recommendation';
  dives[0].maximumDepthMetres=8;await save();
  const depthDenied=await request(instructor,recommend,'POST');
  assert.equal(depthDenied.status,409);assert.equal(depthDenied.body.code,'TRAINING_DIVE_PROGRESSION_REQUIRED');
  assert.ok(depthDenied.body.violations.some(row=>row.code==='PROGRESSION_DEPTH'));
  assert.equal(await db.trainingCertificate.count({where:{trainingRecordId:record.id}}),0,'invalid proof creates no recommendation');
  dives[0].maximumDepthMetres=7;await save();
  const recommended=ok(await request(instructor,recommend,'POST'));ids.push(recommended.id);
  const decide='/training/certificates/'+recommended.id+'/decision';
  const approval={outcome:'APPROVED',expectedUpdatedAt:recommended.updatedAt,reviewed:true,reason:'Synthetic CI endpoint verification, no diving qualification'};
  dives[0].submergedSeconds=900;await save();
  const durationDenied=await request(reviewer,decide,'POST',approval);
  assert.equal(durationDenied.status,409);assert.equal(durationDenied.body.code,'TRAINING_DIVE_PROGRESSION_REQUIRED');
  assert.ok(durationDenied.body.violations.some(row=>row.code==='DIVE_QUALIFICATION_ALTERNATIVE_REQUIRED'));
  assert.equal((await db.trainingCertificate.findUniqueOrThrow({where:{id:recommended.id}})).status,'RECOMMENDED','failed qualification does not issue a certificate');
  // The real v2 source-configured gas alternative may qualify below the time floor.
  dives[0].breathedGasLitres=1250;await save();
  assert.equal(ok(await request(reviewer,decide,'POST',approval)).status,'APPROVED');
  console.log('A14 EXISTING v2 progression HTTP/PostgreSQL: per-dive depth blocks recommendation, failed qualification blocks issuance, explicit gas alternative permits independent approval. Synthetic isolated endpoint fixtures only.');
 }finally{
  if(document)await db.managedDocument.delete({where:{id:document.id}});
  if(createdTemplate)await db.documentTemplate.delete({where:{id:createdTemplate}});
 }
}
