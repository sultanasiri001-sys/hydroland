import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const readiness=(reasonCodes=[])=>({ready:reasonCodes.length===0,reasonCodes,scope:'INTERNAL_COMPLETION',externalCertificationGranted:false});
const disconnected=()=>({status:'NOT_CONNECTED',provider:null,program:null,edition:null,certificateNumber:null,verifiedAt:null,operationalAuthority:false,officialIssuance:false});
const certificate=(id='certificate-1',status='RECOMMENDED')=>({id,status,trainingRecordId:'record-1',courseCode:'QA-CERT-REVIEW',updatedAt:'2026-10-22T11:00:00.000Z',recommendedAt:'2026-10-22T10:00:00Z',student:{displayName:'متدرب اختبار اصطناعي'},instructor:{displayName:'مدرب مستقل اصطناعي'},centerName:'مركز الاختبار الاصطناعي',canReview:status==='RECOMMENDED',canApprove:status==='RECOMMENDED',reviewReasons:[],completionReadiness:readiness(),internalResult:{scope:'HYDROLAND_INTERNAL',officialIssuance:false,status,certificateNumber:status==='APPROVED'?'HYD-TRN-2026-TEST':null,issuedAt:status==='APPROVED'?'2026-10-22T11:00:00.000Z':null},externalCertification:disconnected(),canRequestReconsideration:false,canDecideReconsideration:false,canRevoke:false,reconsideration:null,history:[],historyTruncated:false,record:{status:'COMPLETED',enrollmentStatus:'COMPLETED',progressPercent:100,stages:[{stageType:'مرحلة اختبار إجرائي',skills:[{skillCode:'QA-PROCEDURE',name:'مهارة إجرائية تجريبية',status:'COMPETENT',signed:true,signedOffAt:'2026-10-22T09:00:00Z'}]}],sessions:[{status:'COMPLETED',startsAt:'2026-10-22T08:00:00Z'}]}});
async function setupAdmin(page){
 const state={active:true,posts:0,conflict:false,rows:[certificate()]};
 await page.route('**/api/v1/**',r=>json(r,[]));
 await page.route('**/api/v1/auth/google/config',r=>json(r,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,r=>json(r,{id:'independent-admin',status:'ACTIVE',person:{firstName:'إدارة',lastName:'اختبار'},roleAssignments:state.active?[{role:'ADMIN',status:'ACTIVE'}]:[]}));
 await page.route('**/api/v1/training/certificates?**',r=>{const status=new URL(r.request().url()).searchParams.get('status');return json(r,{items:state.rows.filter(row=>row.status===status),nextCursor:null})});
 await page.route('**/api/v1/training/certificates/*/decision',r=>{
  state.posts++;const body=r.request().postDataJSON();expect(body.expectedUpdatedAt).toBe('2026-10-22T11:00:00.000Z');expect(body.reviewed).toBe(true);
  if(state.conflict)return json(r,{message:'تغير طلب الشهادة. حدّث القائمة قبل القرار.'},409);
  const row=state.rows[0];row.status=body.outcome;row.internalResult.status=body.outcome;row.reviewReason=body.reason;row.canReview=false;row.canApprove=false;if(body.outcome==='APPROVED'){row.certificateNumber='HYD-TRN-2026-TEST';row.internalResult.certificateNumber=row.certificateNumber;row.internalResult.issuedAt='2026-10-22T11:01:00.000Z'}row.history.push({id:'decision-1',action:'training.certificate_decided',occurredAt:'2026-10-22T11:01:00.000Z',outcome:body.outcome,reason:body.reason});return json(r,{id:row.id,status:row.status},201);
 });
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandTrainingCertificateAdmin));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'cert-admin-test',refreshToken:'cert-admin-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="admin"]').click();await page.locator('[data-portal-label="الموافقات والطلبات"]').click();
 await expect(page.locator('[data-training-certificate="certificate-1"]')).toBeVisible();return state;
}
async function prepareDecision(page,outcome='APPROVED'){
 const card=page.locator('[data-training-certificate="certificate-1"]');await card.getByText('عرض سجل المهارات والجلسات',{exact:true}).click();await expect(card).toContainText('مهارة إجرائية تجريبية');await expect(card).toContainText('توقيع موثق');
 const form=card.locator('[data-training-certificate-decision]');await form.getByLabel('قرار شهادة التدريب',{exact:true}).selectOption(outcome);await form.getByLabel('ملاحظات قرار شهادة التدريب',{exact:true}).fill('مراجعة إجرائية في اختبار معزول');await form.getByRole('checkbox').check();return form;
}
for(const outcome of ['APPROVED','REJECTED'])test(`independent admin reviews evidence and saves ${outcome} with persisted history`,async({page})=>{
 const state=await setupAdmin(page),form=await prepareDecision(page,outcome),viewport=page.viewportSize();await page.setViewportSize({width:390,height:844});expect(await form.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);await page.setViewportSize(viewport);
 await form.getByRole('button',{name:'حفظ قرار شهادة التدريب',exact:true}).click();await expect(page.locator('[data-training-certificate]')).toHaveCount(0);expect(state.posts).toBe(1);
 await page.getByLabel('حالة طلب الشهادة',{exact:true}).selectOption(outcome);const history=page.locator('[data-training-certificate="certificate-1"]');await expect(history).toContainText('مراجعة إجرائية في اختبار معزول');await expect(history.locator('form')).toHaveCount(0);if(outcome==='APPROVED')await expect(history).toContainText('HYD-TRN-2026-TEST');
});
test('stale certificate decision preserves notes and fresh role revocation prevents another write',async({page})=>{
 const state=await setupAdmin(page);state.conflict=true;const form=await prepareDecision(page,'REJECTED');await form.getByRole('button',{name:'حفظ قرار شهادة التدريب',exact:true}).click();await expect(form).toContainText('تغير طلب الشهادة');await expect(form.getByLabel('ملاحظات قرار شهادة التدريب',{exact:true})).toHaveValue('مراجعة إجرائية في اختبار معزول');expect(state.posts).toBe(1);
 state.active=false;await form.getByRole('button',{name:'حفظ قرار شهادة التدريب',exact:true}).click();await expect(page.locator('[data-training-certificate]')).toHaveCount(0);expect(state.posts).toBe(1);
});
test('queue filters cannot discard an explicit certificate decision during fresh authorization',async({page})=>{
 const state=await setupAdmin(page),form=await prepareDecision(page,'REJECTED');
 let release,started;const pending=new Promise(resolve=>{release=resolve}),requested=new Promise(resolve=>{started=resolve});
 await page.route(/\/api\/v1\/me$/,async route=>{started();await pending;return json(route,{id:'independent-admin',status:'ACTIVE',person:{firstName:'إدارة',lastName:'اختبار'},roleAssignments:[{role:'ADMIN',status:'ACTIVE'}]})});
 try{
  await form.getByRole('button',{name:'حفظ قرار شهادة التدريب',exact:true}).click();await requested;
  await expect(page.locator('[data-training-certificate-filter]')).toBeDisabled();await expect(page.locator('[data-training-certificate-refresh]')).toBeDisabled();expect(state.posts).toBe(0);
  release();await expect(page.locator('[data-training-certificate-filter]')).toBeEnabled();expect(state.posts).toBe(1);
  await page.locator('[data-training-certificate-filter]').selectOption('REJECTED');
  const card=page.locator('[data-training-certificate="certificate-1"]');await expect(card.locator('[data-certificate-internal]')).toContainText('مرفوض');await expect(card).toContainText('مراجعة إجرائية في اختبار معزول');await expect(card.locator('form')).toHaveCount(0);
 }finally{release()}
});
test('late pending queue cannot overwrite a newer history filter',async({page})=>{
 const state=await setupAdmin(page);state.rows.push({...certificate('history-1','APPROVED'),courseCode:'QA-HISTORY-ONLY'});
 let release,started;const pending=new Promise(resolve=>{release=resolve}),requested=new Promise(resolve=>{started=resolve});
 await page.route(/\/training\/certificates\?status=RECOMMENDED$/,async r=>{started();await pending;return json(r,{items:[certificate()],nextCursor:null})});
 await page.getByRole('button',{name:'تحديث طلبات التدريب',exact:true}).click();await requested;await page.getByLabel('حالة طلب الشهادة',{exact:true}).selectOption('APPROVED');await expect(page.locator('[data-training-certificate-list]')).toContainText('QA-HISTORY-ONLY');
 const received=page.waitForResponse(/\/training\/certificates\?status=RECOMMENDED$/);release();await (await received).finished();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await expect(page.locator('[data-training-certificate-list]')).toContainText('QA-HISTORY-ONLY');await expect(page.locator('[data-training-certificate="certificate-1"]')).toHaveCount(0);
});
test('self-review is read-only, submitted names are escaped and logout clears private records',async({page})=>{
 const state=await setupAdmin(page);state.rows[0].canReview=false;state.rows[0].canApprove=false;state.rows[0].student.displayName='<img src=x onerror=alert(1)>';state.rows[0].reviewReasons=['يتطلب الطلب مراجعًا مستقلًا'];await page.getByRole('button',{name:'تحديث طلبات التدريب',exact:true}).click();
 const card=page.locator('[data-training-certificate="certificate-1"]');await expect(card).toContainText('<img src=x');await expect(card.locator('img')).toHaveCount(0);await expect(card.locator('form')).toHaveCount(0);await page.evaluate(()=>window.HydrolandAuth.terminateSession());await expect(page.locator('[data-training-certificate]')).toHaveCount(0);await expect(page.locator('.hl-training-certificate-review')).toBeHidden();
});
async function setupInstructor(page){
 const state={active:true,posts:0,certificate:null,completionReadiness:readiness(),readyForRecommendation:true,conflict:false};
 await page.route('**/api/v1/**',r=>json(r,[]));
 await page.route('**/api/v1/auth/google/config',r=>json(r,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,r=>json(r,{id:'assigned-instructor',status:'ACTIVE',person:{firstName:'أنس',lastName:'اختبار'},roleAssignments:state.active?[{role:'INSTRUCTOR',status:'ACTIVE'}]:[]}));
 await page.route('**/api/v1/training/professional/me',r=>json(r,{profile:{displayName:'أنس اختبار'},credentials:[],metrics:{activeStudents:0,sessionsToday:0,completedSessions:1,verifiedCredentials:0},privacy:{excludesMedicalData:true,excludesIdentityData:true,excludesEmergencyContacts:true}}));
 await page.route('**/api/v1/training/professional/me/certificates',r=>json(r,[{trainingRecordId:'record-1',courseCode:'QA-CERT-INSTRUCTOR',student:{displayName:'متدرب اختبار'},readyForRecommendation:state.readyForRecommendation&&!state.certificate,completionReadiness:state.completionReadiness,certificate:state.certificate}]));
 await page.route('**/api/v1/training/professional/me/records/record-1/certificate-recommendation',r=>{state.posts++;if(state.conflict)return json(r,{message:'تغيرت متطلبات البرنامج أو المشاركة. حدّث حالة الشهادات.'},409);state.certificate=certificate();return json(r,{...state.certificate,trainingRecordId:'record-1'},201)});
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandTraining));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'cert-instructor-test',refreshToken:'cert-instructor-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="instructor"]').click();await page.getByRole('button',{name:'الشهادات',exact:true}).filter({visible:true}).click();await expect(page.locator('[data-certificate-record="record-1"]')).toContainText('جاهز للتوصية');return state;
}
test('instructor explicitly confirms recommendation and sees pending independent review',async({page})=>{
 const state=await setupInstructor(page);expect(state.posts).toBe(0);await page.getByText('توصية المدرب بالشهادة',{exact:true}).click();const form=page.locator('[data-certificate-recommend-form]');await form.getByRole('checkbox').check();await form.getByRole('button',{name:'إرسال توصية الاعتماد',exact:true}).click();await expect(page.locator('[data-certificate-record="record-1"]')).toContainText('بانتظار مراجعة الإدارة');await expect(page.locator('[data-certificate-recommend-form]')).toHaveCount(0);expect(state.posts).toBe(1);
});
test('revoked instructor role blocks recommendation before POST',async({page})=>{
 const state=await setupInstructor(page);await page.getByText('توصية المدرب بالشهادة',{exact:true}).click();const form=page.locator('[data-certificate-recommend-form]');await form.getByRole('checkbox').check();state.active=false;await form.getByRole('button',{name:'إرسال توصية الاعتماد',exact:true}).click();await expect(page.locator('[data-certificate-record]')).toHaveCount(0);expect(state.posts).toBe(0);
});
test('late instructor certificate response cannot replace the newer courses page',async({page})=>{
 await setupInstructor(page);let release,started;const pending=new Promise(resolve=>{release=resolve}),requested=new Promise(resolve=>{started=resolve});
 await page.route('**/api/v1/training/professional/me/certificates',async r=>{started();await pending;return json(r,[{trainingRecordId:'late-private',courseCode:'LATE-PRIVATE',readyForRecommendation:true,completionReadiness:readiness(),certificate:null}])});
 await page.getByRole('button',{name:'الشهادات',exact:true}).click();await requested;await page.getByRole('button',{name:'إدارة الدورات',exact:true}).filter({visible:true}).click();await expect(page.locator('.hl-training')).toHaveAttribute('data-training-mode','professional');
 const received=page.waitForResponse('**/api/v1/training/professional/me/certificates');release();await (await received).finished();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await expect(page.locator('[data-certificate-record]')).toHaveCount(0);await expect(page.locator('.hl-training')).not.toContainText('LATE-PRIVATE');
});

for(const language of ['ar','en'])test(`revoked program and participation evidence block internal approval but preserve rejection and history (${language})`,async({page})=>{
 const state=await setupAdmin(page),row=state.rows[0];row.completionReadiness=readiness(['TRAINING_STANDARD_NOT_APPROVED','PARTICIPATION_NOT_CLEARED']);row.canApprove=false;
 await page.locator('[data-training-certificate-refresh]').click();await page.evaluate(value=>window.HydrolandI18n.setLocale(value),language);
 const card=page.locator('[data-training-certificate="certificate-1"]'),form=card.locator('[data-training-certificate-decision]');
 await expect(card.locator('[data-certificate-readiness]')).toHaveAttribute('data-certificate-readiness','BLOCKED');
 await expect(card.locator('[data-readiness-reason="TRAINING_STANDARD_NOT_APPROVED"]')).toHaveText(language==='ar'?'اعتماد إصدار برنامج التدريب غير نافذ.':'The training program version approval is not current.');
 await expect(card.locator('[data-readiness-reason="PARTICIPATION_NOT_CLEARED"]')).toHaveText(language==='ar'?'أهلية المشاركة وموافقتها الحالية تحتاجان مراجعة.':'Current participation eligibility and consent need review.');
 await expect(form.locator('option[value=APPROVED]')).toHaveJSProperty('disabled',true);await expect(form.locator('option[value=REJECTED]')).toHaveJSProperty('disabled',false);
 await expect(card.locator('[data-certificate-external]')).toContainText(language==='ar'?'غير مربوط':'Not connected');await expect(card.locator('[data-certificate-external]')).not.toContainText('HYD-TRN');
 if(language==='ar')await card.screenshot({path:test.info().outputPath('d02-readiness-desktop-ar.png')});
 await form.locator('[name=outcome]').selectOption('REJECTED');await form.locator('[name=reason]').fill('رفض اصطناعي بسبب المصدر المسحوب');await form.locator('[name=reviewed]').check();await form.locator('button[type=submit]').click();
 await page.locator('[data-training-certificate-filter]').selectOption('REJECTED');await card.locator('[data-certificate-history] summary').click();await expect(card.locator('[data-certificate-history]')).toContainText('رفض اصطناعي بسبب المصدر المسحوب');
 await expect(card.locator('[data-certificate-internal]')).toContainText(language==='ar'?'مرفوض':'Rejected');expect(state.posts).toBe(1);expect(state.rows[0].externalCertification).toEqual(disconnected());
});

for(const [code,language] of [['TRAINING_STANDARD_NOT_APPROVED','ar'],['PARTICIPATION_NOT_CLEARED','en']])test(`instructor recommendation follows current ${code} readiness and explicit refresh (${language})`,async({page})=>{
 const state=await setupInstructor(page);state.readyForRecommendation=false;state.completionReadiness=readiness([code]);await page.locator('[data-training-certificates-refresh]').click();await page.evaluate(value=>window.HydrolandI18n.setLocale(value),language);
 const card=page.locator('[data-certificate-record="record-1"]');await card.locator('details summary').click();const form=card.locator('[data-certificate-recommend-form]');
 await expect(form.getByRole('button')).toBeDisabled();await expect(card.locator('[data-readiness-reason]')).toHaveAttribute('data-readiness-reason',code);expect(state.posts).toBe(0);
 state.readyForRecommendation=true;state.completionReadiness=readiness();await page.locator('[data-training-certificates-refresh]').click();await card.locator('details summary').click();await expect(form.getByRole('button')).toBeEnabled();await form.getByRole('checkbox').check();await form.getByRole('button').click();
 await expect(card.locator('[data-certificate-internal]')).toContainText(language==='ar'?'بانتظار المراجعة':'Awaiting review');await expect(card.locator('[data-certificate-external]')).toContainText(language==='ar'?'غير مربوط':'Not connected');expect(state.posts).toBe(1);
});

test('a source change during recommendation returns 409 without claiming success or permitting the stale retry',async({page})=>{
 const state=await setupInstructor(page);await page.getByText('توصية المدرب بالشهادة',{exact:true}).click();const form=page.locator('[data-certificate-recommend-form]');await form.getByRole('checkbox').check();state.conflict=true;
 await form.getByRole('button').click();await expect(form).toContainText('تغيرت متطلبات البرنامج أو المشاركة');await expect(form.getByRole('checkbox')).toBeChecked();await expect(form.getByRole('button')).toBeDisabled();expect(state.posts).toBe(1);expect(state.certificate).toBeNull();
 state.readyForRecommendation=false;state.completionReadiness=readiness(['PARTICIPATION_NOT_CLEARED']);await page.locator('[data-training-certificates-refresh]').click();await expect(page.locator('[data-certificate-readiness]')).toHaveAttribute('data-certificate-readiness','BLOCKED');expect(state.posts).toBe(1);
});

async function setupStudent(page){
 const row=certificate('certificate-1','REJECTED');for(const key of ['completionReadiness','record','student','instructor','centerName','canApprove','canReview','reviewReasons'])delete row[key];row.canRequestReconsideration=true;row.reviewReason='قرار رفض داخلي اصطناعي محفوظ';row.history=[{id:'rejection-1',action:'training.certificate_decided',occurredAt:'2026-10-22T11:00:00.000Z',outcome:'REJECTED',reason:row.reviewReason}];
 const state={active:true,rows:[row],posts:[],conflict:false,abortFirst:false};
 await page.route('**/api/v1/**',r=>json(r,[]));await page.route('**/api/v1/auth/google/config',r=>json(r,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,r=>json(r,{id:'student-account',status:state.active?'ACTIVE':'SUSPENDED',person:{firstName:'متدرب',lastName:'اصطناعي'},roleAssignments:[]}));
 await page.route('**/api/v1/training/mine/certificates',r=>state.active?json(r,{items:state.rows}):json(r,{message:'الحساب غير نشط'},403));
 await page.route('**/api/v1/training/certificates/certificate-1/reconsideration',r=>{
  const body=r.request().postDataJSON();state.posts.push(body);expect(body.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);expect(body.expectedUpdatedAt).toBe(row.updatedAt);
  if(state.abortFirst&&state.posts.length===1)return r.abort('failed');if(state.conflict)return json(r,{message:'تغير طلب الشهادة. حدّث حالته مع الاحتفاظ بالملاحظات.'},409);
  row.reconsideration={status:'PENDING',requestedAt:'2026-10-22T12:00:00.000Z',reason:body.reason,decidedAt:null,decisionReason:null};row.canRequestReconsideration=false;row.history.push({id:'appeal-1',action:'training.certificate_reconsideration_requested',occurredAt:row.reconsideration.requestedAt,outcome:null,reason:body.reason});return json(r,row,201);
 });
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandTraining&&window.HydrolandTrainingCertificateUI&&window.HydrolandProfile));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'synthetic-student-cert',refreshToken:'synthetic-student-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 await page.locator('#navigation a[href="#training"]').click();await page.locator('[data-training-my-certificates]').click();await expect(page.locator('[data-certificate-record="record-1"]')).toBeVisible();return state;
}

for(const language of ['ar','en'])test(`student without organization membership can request reconsideration with preserved internal rejection (${language})`,async({page})=>{
 const state=await setupStudent(page);await page.evaluate(value=>window.HydrolandI18n.setLocale(value),language);await page.setViewportSize({width:390,height:844});
 if(language==='ar')await page.locator('[data-certificate-record=record-1]').screenshot({path:test.info().outputPath('d02-student-mobile-ar.png')});
 const card=page.locator('[data-certificate-record="record-1"]'),form=card.locator('[data-certificate-lifecycle=reconsideration]');await form.locator('..').locator('summary').click();await form.locator('[name=reason]').fill('طلب مراجعة اصطناعي <img src=x onerror=alert(1)>');expect(await card.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
 await form.getByRole('button').click();await expect(card.locator('[data-certificate-reconsideration]')).toContainText(language==='ar'?'بانتظار حسم إعادة النظر':'Reconsideration decision pending');await expect(card.locator('[data-certificate-internal]')).toContainText(language==='ar'?'مرفوض':'Rejected');
 await card.locator('[data-certificate-history] summary').click();await expect(card.locator('[data-certificate-history]')).toContainText('قرار رفض داخلي اصطناعي محفوظ');await expect(card.locator('[data-certificate-history]')).toContainText('<img src=x');await expect(card.locator('img')).toHaveCount(0);await expect(card.locator('[data-certificate-lifecycle]')).toHaveCount(0);expect(state.posts).toHaveLength(1);expect(state.rows[0].externalCertification).toEqual(disconnected());
 await page.evaluate(()=>window.HydrolandAuth.terminateSession());await expect(page.locator('[data-certificate-record]')).toHaveCount(0);
});

test('unknown reconsideration response retries the exact request and stale 409 preserves notes until refresh',async({page})=>{
 const state=await setupStudent(page);state.abortFirst=true;state.conflict=true;const form=page.locator('[data-certificate-lifecycle=reconsideration]');await form.locator('..').locator('summary').click();await form.locator('[name=reason]').fill('إعادة نظر اصطناعية لا تغير القرار');await form.getByRole('button').click();
 await expect(form.locator('[data-certificate-retry]')).toBeVisible();await expect(form.locator('fieldset')).toHaveJSProperty('disabled',true);await form.locator('[data-certificate-retry]').click();await expect(form).toContainText('تغير طلب الشهادة');await expect(form.locator('[name=reason]')).toHaveValue('إعادة نظر اصطناعية لا تغير القرار');await expect(form.locator('fieldset')).toHaveJSProperty('disabled',true);expect(state.posts).toHaveLength(2);expect(state.posts[1]).toEqual(state.posts[0]);expect(state.rows[0].reconsideration).toBeNull();
 await page.locator('[data-training-certificates-refresh]').click();await expect(page.locator('[data-certificate-lifecycle=reconsideration]')).not.toHaveAttribute('data-stale');expect(state.posts).toHaveLength(2);
});

test('a suspended learner account is cleared before any reconsideration write',async({page})=>{
 const state=await setupStudent(page),form=page.locator('[data-certificate-lifecycle=reconsideration]');await form.locator('..').locator('summary').click();await form.locator('[name=reason]').fill('طلب اصطناعي لن يرسل بعد سحب صلاحية الحساب');state.active=false;await form.getByRole('button').click();await expect(page.locator('[data-certificate-record]')).toHaveCount(0);expect(state.posts).toHaveLength(0);
});

test('a late learner certificate response cannot restore private records after logout',async({page})=>{
 const state=await setupStudent(page);let release,started;const pending=new Promise(resolve=>{release=resolve}),requested=new Promise(resolve=>{started=resolve});
 await page.route('**/api/v1/training/mine/certificates',async r=>{started();await pending;return json(r,{items:state.rows})});await page.locator('[data-training-certificates-refresh]').click();await requested;await page.evaluate(()=>window.HydrolandAuth.terminateSession());
 const received=page.waitForResponse('**/api/v1/training/mine/certificates');release();await (await received).finished();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await expect(page.locator('[data-certificate-record]')).toHaveCount(0);await expect(page.locator('[data-training-list]')).not.toContainText('قرار رفض داخلي اصطناعي محفوظ');expect(state.posts).toHaveLength(0);
});

for(const outcome of ['REOPEN','DISMISS'])test(`independent reconsideration ${outcome} keeps the previous decision and never grants external certification`,async({page})=>{
 const state=await setupAdmin(page),row=certificate('certificate-1','REJECTED');row.canDecideReconsideration=true;row.reconsideration={status:'PENDING',requestedAt:'2026-10-22T12:00:00.000Z',reason:'طلب اصطناعي لإعادة النظر',decidedAt:null,decisionReason:null};row.reviewReason='رفض سابق محفوظ';state.rows=[row];
 const commands=[];await page.route('**/api/v1/training/certificates/certificate-1/reconsideration-decision',r=>{
  const body=r.request().postDataJSON();commands.push(body);expect(body).toMatchObject({expectedUpdatedAt:row.updatedAt,reviewed:true,outcome});expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/);const previousDecision={status:row.status,reviewedAt:'2026-10-22T11:00:00.000Z',reviewReason:row.reviewReason,certificateNumber:null,issuedAt:null};row.status=outcome==='REOPEN'?'RECOMMENDED':'REJECTED';row.internalResult.status=row.status;row.canDecideReconsideration=false;row.canReview=outcome==='REOPEN';row.canApprove=false;row.completionReadiness=readiness(['PARTICIPATION_NOT_CLEARED']);row.reconsideration={...row.reconsideration,status:outcome==='REOPEN'?'REOPENED':'DISMISSED',decidedAt:'2026-10-22T13:00:00.000Z',decisionReason:body.reason};row.history.push({id:'appeal-decision-1',action:'training.certificate_reconsideration_decided',occurredAt:row.reconsideration.decidedAt,outcome,reason:body.reason,previousDecision});return json(r,row,201);
 });
 await page.locator('[data-training-certificate-filter]').selectOption('REJECTED');const form=page.locator('[data-certificate-lifecycle=reconsideration-decision]');await form.locator('[name=outcome]').selectOption(outcome);await form.locator('[name=reason]').fill('حسم اصطناعي مستقل لإعادة النظر');await form.locator('[name=reviewed]').check();await form.getByRole('button').click();if(outcome==='REOPEN')await page.locator('[data-training-certificate-filter]').selectOption('RECOMMENDED');
 const card=page.locator('[data-training-certificate="certificate-1"]');await card.locator('[data-certificate-history] summary').click();await expect(card.locator('[data-certificate-history]')).toContainText('رفض سابق محفوظ');await expect(card.locator('[data-certificate-external]')).toContainText('غير مربوط');expect(commands).toHaveLength(1);expect(row.internalResult.certificateNumber).toBeNull();
 if(outcome==='REOPEN'){await expect(card.locator('[data-training-certificate-decision] option[value=APPROVED]')).toHaveJSProperty('disabled',true);await expect(card.locator('[data-training-certificate-decision] option[value=REJECTED]')).toHaveJSProperty('disabled',false)}else await expect(card.locator('[data-certificate-lifecycle]')).toHaveCount(0);
});

test('internal revocation retains the original number and decision history with no external certificate claim',async({page})=>{
 const state=await setupAdmin(page),row=certificate('certificate-1','APPROVED');row.canRevoke=true;state.rows=[row];const commands=[];
 await page.route('**/api/v1/training/certificates/certificate-1/revoke',r=>{const body=r.request().postDataJSON();commands.push(body);expect(body).toMatchObject({expectedUpdatedAt:row.updatedAt,reviewed:true});row.history.push({id:'revocation-1',action:'training.certificate_revoked',occurredAt:'2026-10-22T14:00:00.000Z',outcome:'REVOKED',reason:body.reason,previousDecision:{status:'APPROVED',reviewedAt:'2026-10-22T11:00:00.000Z',reviewReason:'اعتماد داخلي اصطناعي محفوظ',certificateNumber:row.internalResult.certificateNumber,issuedAt:row.internalResult.issuedAt}});row.status='REVOKED';row.internalResult.status='REVOKED';row.canRevoke=false;return json(r,row,201)});
 await page.locator('[data-training-certificate-filter]').selectOption('APPROVED');const form=page.locator('[data-certificate-lifecycle=revoke]');await form.locator('..').locator('summary').click();await form.locator('[name=reason]').fill('سحب داخلي اصطناعي موثق');await form.locator('[name=reviewed]').check();await form.getByRole('button').click();await page.locator('[data-training-certificate-filter]').selectOption('REVOKED');
 const card=page.locator('[data-training-certificate="certificate-1"]');await expect(card.locator('[data-certificate-internal]')).toContainText('ملغى');await expect(card.locator('[data-certificate-internal]')).toContainText('HYD-TRN-2026-TEST');await card.locator('[data-certificate-history] summary').click();await expect(card.locator('[data-certificate-history]')).toContainText('اعتماد داخلي اصطناعي محفوظ');await expect(card.locator('[data-certificate-external]')).not.toContainText('HYD-TRN');await expect(card.locator('form')).toHaveCount(0);expect(commands).toHaveLength(1);
});
