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
