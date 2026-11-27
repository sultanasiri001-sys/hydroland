import {expect} from '@playwright/test';
import {createHash} from 'node:crypto';

export const uid = number => '00000000-0000-4000-8000-'+String(number).padStart(12,'0');
export const hash = value => createHash('sha256').update(Buffer.isBuffer(value)||typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const copy = value => JSON.parse(JSON.stringify(value));
export const pdf = Buffer.from('%PDF-1.4\n% Isolated D01 interface fixture; no clinical or guardian acceptance.\n%%EOF');
export const actors = {
  reviewer:{id:uid(1),name:'مراجع أول',role:'ADMIN'},
  approver:{id:uid(2),name:'مراجع مستقل',role:'ADMIN'},
  signer:{id:uid(3),name:'موقع مصدر مستقل',role:'ADMIN'},
  participant:{id:uid(4),name:'مشارك <خاص>',role:'DIVER'},
  guardian:{id:uid(5),name:'ولي موثق <خاص>',role:'DIVER'},
  outsider:{id:uid(6),name:'حساب آخر',role:'DIVER'},
};
const actionKeys=['LINK_EVIDENCE','SIGN_CONSENT','WITHDRAW_CONSENT','REVIEW','REVOKE','REPLACE_SOURCES'];
const sourceActions=['SUBMIT','APPROVE','SIGN','REVOKE'];
const stamp='2026-11-26T10:00:00.000Z';
export const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
export const panel=page=>page.locator('#hl-participant-eligibility');
export function source(kind,number,subject,changes={}) {
  const common={subjectType:subject.subjectType,subjectId:subject.subjectId,issuerName:'جهة مصدر اختبارية',sourceReference:'مصدر اختباري '+kind,issuedAt:'2026-01-01T00:00:00.000Z',validUntil:'2099-01-01T00:00:00.000Z'};
  const service={serviceType:subject.subjectType==='BOOKING_PARTICIPANT'?'TRIP':'TRAINING_ENROLLMENT',serviceId:subject.service.id};
  const binding={...service,identityDocumentId:uid(12),identityDocumentHash:hash('identity'),validFrom:'2026-01-01T00:00:00.000Z'};
  const payload=kind==='POLICY'?{purpose:'D01_POLICY_V1',...service,subjectId:subject.subjectId,activityCode:subject.service.activityCode,effectiveFrom:'2026-01-01T00:00:00.000Z',validUntil:'2099-01-01T00:00:00.000Z',minimumAge:10,guardianBelowAge:18,consentRequirement:'REQUIRED',medicalRequirement:'NOT_APPLICABLE',consentTextAr:'نص اختبار عربي <غير طبي> مرتبط بهذه الخدمة والإصدار.',consentTextEn:'Synthetic English declaration <not clinical> bound to this service and version.',sourceAuthority:'جهة مصدر اختبارية',sourceReference:'مرجع اختباري',sourceVersion:'TEST-1',sourceClause:'موضع اختباري',applicabilityReason:'انطباق اصطناعي لإثبات الربط فقط'}
    :kind==='IDENTITY'?{purpose:'D01_IDENTITY_V1',...common,participantAccountId:subject.accountId,fullName:subject.participantName,dateOfBirth:'1990-01-01'}
    :kind==='GUARDIAN'?{purpose:'D01_GUARDIAN_V1',...common,...binding,guardianAccountId:actors.guardian.id,relationshipKind:'PARENT',authorityScope:'PARTICIPATION_CONSENT'}
    :{purpose:'D01_MEDICAL_V1',...common,...binding,activityCode:subject.service.activityCode,issuerReference:'اختصاص موثق في المثال',outcome:'CLEARED_FOR_ACTIVITY',limitations:''};
  return {id:uid(number),organizationId:subject.organizationId,kind,status:'SIGNED',version:1,hash:hash(kind),title:'أصل '+kind+' <خاص>',referenceNumber:'TEST-'+number,payload,attachments:[{id:uid(number+100),filename:kind+'.pdf',mimeType:'application/pdf',byteSize:pdf.length,sha256:hash(pdf)}],createdBy:uid(90),approvedBy:uid(91),administrativeVerificationOnly:true,revoked:false,integrityReason:null,...changes};
}
export async function install(page,options={}) {
  const subjectType=options.subjectType||'BOOKING_PARTICIPANT';
  const subject={subjectType,subjectId:uid(20),organizationId:uid(21),participantName:actors.participant.name,accountId:actors.participant.id,service:{id:uid(22),type:subjectType==='BOOKING_PARTICIPANT'?'TRIP':'TRAINING_ENROLLMENT',title:'خدمة اختبارية <محددة>',activityCode:subjectType==='BOOKING_PARTICIPANT'?'SHORE':'TEST_COURSE',startsAt:'2098-01-01T09:00:00.000Z',endsAt:'2098-01-01T12:00:00.000Z'}};
  if(options.guest)subject.accountId=null;
  const sources=['POLICY','IDENTITY','GUARDIAN','MEDICAL'].map((kind,index)=>source(kind,11+index,subject));
  sources[2].payload.identityDocumentHash=sources[1].hash;sources[3].payload.identityDocumentHash=sources[1].hash;
  if(options.minor)sources[1].payload.dateOfBirth='2085-01-01';
  if(options.guest)sources[1].payload.participantAccountId=actors.participant.id;
  const state={actor:options.actor||'reviewer',active:true,revoked:false,subject,sources,policySourceId:uid(11),identitySourceId:uid(12),calls:[],reads:[],lookups:[],nativeWrites:[],replays:new Map(),caseExists:options.caseExists!==false,revision:1,consent:null,review:null,guardianLinked:Boolean(options.minor),medicalLinked:false,revokedAt:null,expired:false,events:[],...options};
  const reviewer=()=>['reviewer','approver','signer'].includes(state.actor)&&!state.revoked;
  const permission=(allowed,reason='يلزم استكمال الدليل أو الصلاحية الحالية.')=>({allowed:Boolean(allowed),reason:allowed?null:reason});
  const reference=row=>({id:row.id,version:row.version,hash:row.hash});
  const identitySource=()=>state.sources.find(row=>row.id===state.identitySourceId);
  const ownsCase=()=>reviewer()||actors[state.actor].id===identitySource().payload.participantAccountId||state.actor==='guardian'&&state.guardianLinked;
  const sourceView=row=>{
    const permitted={SUBMIT:row.status==='DRAFT',APPROVE:row.status==='PENDING_APPROVAL'&&row.createdBy!==actors[state.actor].id,SIGN:row.status==='APPROVED'&&![row.createdBy,row.approvedBy].includes(actors[state.actor].id),REVOKE:row.status==='SIGNED'&&!row.revoked};
    return {...copy(row),actions:Object.fromEntries(sourceActions.map(action=>[action,permission(reviewer()&&permitted[action])]))};
  };
  state.view=()=>{
    const policy=state.sources.find(row=>row.id===state.policySourceId),identity=identitySource(),guardian=state.sources.find(row=>row.kind==='GUARDIAN'),medical=state.sources.find(row=>row.kind==='MEDICAL');
    const consentHash=hash({policy:reference(policy),identity:reference(identity),guardian:state.guardianLinked?reference(guardian):null,service:state.subject.service});
    const staleConsent=Boolean(state.consent&&state.consent.consentHash!==consentHash),validConsent=Boolean(state.consent&&!state.consent.withdrawnAt&&!staleConsent),blocked=Boolean(state.expired||state.revokedAt||policy.revoked||identity.revoked||state.subjectChanged),ready=validConsent&&!blocked;
    const status=ready&&state.review?.decision==='ELIGIBLE'?'CLEARED':'ACTION_REQUIRED';
    const signerId=state.guardianLinked?actors.guardian.id:identity.payload.participantAccountId;
    const actions={LINK_EVIDENCE:reviewer()&&!blocked,SIGN_CONSENT:actors[state.actor].id===signerId&&!validConsent&&!blocked,WITHDRAW_CONSENT:state.consent?.actorAccountId===actors[state.actor].id&&!state.consent?.withdrawnAt,REVIEW:reviewer()&&ready,REVOKE:reviewer()&&Boolean(state.review)&&!state.revokedAt,REPLACE_SOURCES:reviewer()};
    return {id:uid(30),revision:state.revision,digest:hash('case:'+state.revision),status,subject:copy(state.subject),policy:{reference:reference(policy),terms:policy.revoked?null:copy(policy.payload)},identity:{reference:reference(identity),terms:identity.revoked?null:copy(identity.payload),participant:{accountId:identity.payload.participantAccountId,personId:identity.payload.participantAccountId===actors.outsider.id?uid(106):uid(104),fullName:identity.payload.fullName,dateOfBirth:identity.payload.dateOfBirth}},guardian:state.guardianLinked?{reference:reference(guardian),terms:copy(guardian.payload),actor:{accountId:actors.guardian.id,personId:uid(105),name:actors.guardian.name}}:null,medical:state.medicalLinked?{reference:reference(medical),terms:copy(medical.payload)}:null,consent:copy(state.consent),review:copy(state.review),signatureName:actors[state.actor].name,resumeReasonRequired:Boolean(state.consent?.withdrawnAt||state.revokedAt||state.review?.decision==='REJECTED'),consentHash,revokedAt:state.revokedAt,revocationReason:state.revokedAt?'سحب اختباري للمصدر':null,readiness:{ready:status==='CLEARED',hardBlocked:blocked||Boolean(state.consent?.withdrawnAt)||staleConsent,guardianRequired:state.guardianLinked,consentRequired:true,selfDeclarationIsMedicalEvidence:false,clinicalDecisionPerformed:false,reasons:policy.revoked?['PARTICIPATION_POLICY_REVOKED']:blocked?['انتهت صلاحية المصدر أو سُحب.']:state.consent?.withdrawnAt?['PARTICIPATION_CONSENT_WITHDRAWN','PARTICIPATION_CONSENT_REQUIRED']:staleConsent?['PARTICIPATION_CONSENT_STALE']:validConsent?[]:['يلزم تسجيل موافقة المشارك أو وليه المثبت.']},actions:Object.fromEntries(actionKeys.map(action=>[action,permission(actions[action])])),events:copy(state.events.filter(event=>reviewer()||(event.participantAccountId||actors.participant.id)===identity.payload.participantAccountId).map(({participantAccountId,...event})=>event))};
  };
  state.workspace=()=>({actor:{id:actors[state.actor].id,name:actors[state.actor].name},organizations:reviewer()?[{id:subject.organizationId,name:'جهة تشغيل اختبارية'}]:[],subjects:reviewer()?[copy(state.subject)]:[],sources:reviewer()?state.sources.map(sourceView):[],cases:state.caseExists&&ownsCase()?[state.view()]:[],capabilities:{createSource:permission(reviewer()),createCase:permission(reviewer())}});
  await page.route('**/api/v1/**',route=>{if(route.request().method()!=='GET')state.nativeWrites.push(new URL(route.request().url()).pathname);return json(route,[]);});
  await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
  await page.route('**/api/v1/integrations/email/public-config',route=>json(route,{enabled:true}));
  await page.route(/\/api\/v1\/me$/,route=>{
    if(state.revokeNextAuth){state.revoked=true;state.revokeNextAuth=false;}
    const actor=actors[state.actor];return json(route,{id:actor.id,status:state.active?'ACTIVE':'SUSPENDED',emailVerifiedAt:stamp,email:state.actor+'@example.invalid',person:{firstName:actor.name,lastName:''},roleAssignments:state.revoked?[]:[{role:actor.role,status:'ACTIVE'}]});
  });
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:{medicalFitnessStatus:'FIT',medicalClearanceExpiresAt:'2099-01-01'},equipment:[]}));
  await page.route(/\/api\/v1\/participation(?:\/|\?)/,async route=>{
    const url=new URL(route.request().url()),path=url.pathname.split('/participation')[1],method=route.request().method();
    if(!state.active)return json(route,{message:'Account inactive'},403);
    if(method==='GET'){
      state.reads.push(path);
      if(path==='/workspace')return json(route,state.workspaceResponse||state.workspace());
      if(path==='/accounts'){
        if(!reviewer())return json(route,{message:'Review authority required'},403);
        state.lookups.push(Object.fromEntries(url.searchParams));const actor=Object.keys(actors).find(key=>url.searchParams.get('email')===key+'@example.invalid');
        return actor&&url.searchParams.get('organizationId')===subject.organizationId?json(route,{account:{id:actors[actor].id,name:actors[actor].name}}):json(route,{message:'Account not found'},404);
      }
      if(path.startsWith('/cases/')){
        if(!state.caseExists||!ownsCase())return json(route,{message:'Case not found'},404);
        const data=state.detailResponse||state.view();if(state.onCaseRead&&await state.onCaseRead(route,data))return;return json(route,data);
      }
      if(path.startsWith('/sources/')){
        const [, ,sourceId,attachmentRoute,attachmentId]=path.split('/'),row=state.sources.find(row=>row.id===sourceId);
        const refs=state.view(),linked=[refs.policy,refs.identity,refs.guardian,refs.medical].some(value=>value?.reference.id===sourceId);
        if(!row||!reviewer()&&(!ownsCase()||!linked)||state.hideSources)return json(route,{message:'Private source not found'},404);
        if(attachmentRoute==='attachments'){
          if(state.onAttachment&&await state.onAttachment(route))return;
          if(!row.attachments.some(file=>file.id===attachmentId))return json(route,{message:'Attachment not found'},404);
          return route.fulfill({status:200,contentType:'application/pdf',body:pdf});
        }
        return json(route,sourceView(row));
      }
      return json(route,{message:'Route not found'},404);
    }
    const body=route.request().postDataJSON();state.calls.push({path,body:copy(body),actor:state.actor});
    if(state.onWrite&&await state.onWrite(route,path,body))return;
    const replay=state.replays.get(body.requestId);if(replay){expect(replay.actor).toBe(state.actor);expect(replay.body).toEqual(body);return json(route,{...copy(replay.value),command:{requestId:body.requestId,alreadyApplied:true}});}
    let result;
    if(path==='/cases'){
      if(!reviewer())return json(route,{message:'Review authority required'},403);
      expect(body.subjectType).toBe(subject.subjectType);expect(body.subjectId).toBe(subject.subjectId);expect(body.policyDocumentId).toBe(state.sources[0].id);expect(body.identityDocumentId).toBe(state.sources[1].id);state.caseExists=true;result=state.view();
    }else if(path==='/sources'){
      if(!reviewer())return json(route,{message:'Review authority required'},403);
      expect(body.organizationId).toBe(subject.organizationId);expect(body.attachment.mimeType).toBe('application/pdf');expect(body.payload.subjectId).toBe(subject.subjectId);
      const row=source(body.kind,40+state.sources.length,subject,{title:body.title,payload:body.payload,status:'DRAFT',createdBy:actors[state.actor].id,approvedBy:null});state.sources.push(row);result=sourceView(row);
    }else if(path.startsWith('/sources/')){
      const row=state.sources.find(row=>row.id===path.split('/')[2]);if(!row||!reviewer())return json(route,{message:'No source scope'},403);
      if(body.expectedVersion!==row.version||body.expectedHash!==row.hash||!sourceView(row).actions[body.action]?.allowed)return json(route,{message:'Source changed'},409);
      row.status={SUBMIT:'PENDING_APPROVAL',APPROVE:'APPROVED',SIGN:'SIGNED',REVOKE:'ARCHIVED'}[body.action];row.hash=hash(row.hash+body.action);
      if(body.action==='APPROVE')row.approvedBy=actors[state.actor].id;
      if(body.action==='REVOKE'){row.revoked=true;state.review=null;state.revision++;}
      result=sourceView(row);
    }else if(path.startsWith('/cases/')){
      const prior=state.view();if(body.expectedRevision!==prior.revision||body.expectedDigest!==prior.digest||!prior.actions[body.action]?.allowed)return json(route,{message:'Case changed'},409);
      const payload=body.payload;
      if(body.action==='SIGN_CONSENT'){if(prior.resumeReasonRequired)expect(payload.reason?.trim().length).toBeGreaterThan(0);expect(payload.consent).toBe(true);expect(payload.signedName).toBe(actors[state.actor].name);expect(payload.consentHash).toBe(prior.consentHash);state.consent={eventId:uid(200+state.revision),actorAccountId:actors[state.actor].id,actorPersonId:state.actor==='guardian'?uid(105):prior.identity.participant.personId,role:state.actor==='guardian'?'GUARDIAN':'PARTICIPANT',signedName:payload.signedName,consentHash:payload.consentHash,signedAt:stamp,withdrawnAt:null,withdrawalEventId:null};}
      if(body.action==='WITHDRAW_CONSENT'){state.consent.withdrawnAt=stamp;state.review=null;}
      if(body.action==='REVIEW'){expect(payload.reviewed).toBe(true);state.review={eventId:uid(200+state.revision),actorAccountId:actors[state.actor].id,authority:{accountId:actors[state.actor].id,personId:uid(101),role:'ADMIN',authorityId:uid(201),authorityUpdatedAt:stamp},decision:payload.decision,evidenceDigest:prior.digest,reason:payload.reason,reviewedAt:stamp};}
      if(body.action==='REVOKE'){state.revokedAt=stamp;state.review=null;}
      if(body.action==='LINK_EVIDENCE'){expect(state.sources.find(row=>row.id===payload.documentId)?.kind).toBe(payload.kind);state[payload.kind==='GUARDIAN'?'guardianLinked':'medicalLinked']=true;state.review=null;if(payload.kind==='GUARDIAN')state.consent=null;}
      if(body.action==='REPLACE_SOURCES'){const priorAccount=identitySource().payload.participantAccountId;state.policySourceId=payload.policyDocumentId;state.identitySourceId=payload.identityDocumentId;state.subjectChanged=false;state.review=null;if(priorAccount!==identitySource().payload.participantAccountId){state.consent=null;state.guardianLinked=false;state.medicalLinked=false;state.revokedAt=null;}}
      state.events.push({participantAccountId:identitySource().payload.participantAccountId,id:uid(200+state.revision),action:body.action,actorName:actors[state.actor].name,createdAt:stamp,beforeRevision:state.revision,afterRevision:state.revision+1});state.revision++;result=state.view();
    }else return json(route,{message:'Route not found'},404);
    state.replays.set(body.requestId,{actor:state.actor,body:copy(body),value:copy(result)});
    if(state.loseResponse){state.loseResponse=false;return route.abort('failed');}
    if(state.afterWrite&&await state.afterWrite(route,result))return;
    return json(route,result,201);
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandParticipantEligibility&&window.HydrolandProfile));
  state.signIn=async actor=>{state.actor=actor;state.revoked=false;state.active=true;await page.evaluate(async name=>{window.HydrolandAuth.acceptSession({accessToken:'d01-'+name,refreshToken:'d01-refresh-'+name},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load();},actor);await expect.poll(()=>page.evaluate(()=>window.HydrolandProfileData?.profile?.id)).toBe(actors[actor].id);};
  await state.signIn(state.actor);return state;
}
export async function open(page){await page.locator('#profile-open').click();await page.locator('#profile-dialog [data-participation-open]').click();await expect(panel(page)).toBeVisible();await expect(panel(page)).toHaveAttribute('aria-busy','false');}
export async function detail(page){await panel(page).locator('[data-participation-case]').getByRole('button').click();await expect(panel(page).locator('[data-participation-detail]')).toBeVisible();await expect(panel(page)).toHaveAttribute('aria-busy','false');}
export async function consent(page){const form=panel(page).locator('[data-participation-sign]');await form.getByRole('checkbox').check();await form.getByRole('button').click();await expect(panel(page)).toHaveAttribute('aria-busy','false');}
export function seedConsent(state){const view=state.view(),actor=state.guardianLinked?'guardian':'participant';state.consent={eventId:uid(80),actorAccountId:actors[actor].id,actorPersonId:actor==='guardian'?uid(105):view.identity.participant.personId,role:actor==='guardian'?'GUARDIAN':'PARTICIPANT',signedName:actors[actor].name,consentHash:view.consentHash,signedAt:stamp,withdrawnAt:null,withdrawalEventId:null};}
