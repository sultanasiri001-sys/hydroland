import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const certificate=(id='certificate-1',status='RECOMMENDED')=>({id,status,trainingRecordId:'record-1',courseCode:'QA-CERT-REVIEW',updatedAt:'2026-10-22T11:00:00.000Z',recommendedAt:'2026-10-22T10:00:00Z',student:{displayName:'متدرب اختبار'},instructor:{displayName:'مدرب مستقل'},centerName:'مركز الاختبار',canReview:status==='RECOMMENDED',canApprove:status==='RECOMMENDED',reviewReasons:[],record:{status:'COMPLETED',enrollmentStatus:'COMPLETED',progressPercent:100,stages:[{stageType:'مرحلة اختبار إجرائي',skills:[{skillCode:'QA-PROCEDURE',name:'مهارة إجرائية تجريبية',status:'COMPETENT',signed:true,signedOffAt:'2026-10-22T09:00:00Z'}]}],sessions:[{status:'COMPLETED',startsAt:'2026-10-22T08:00:00Z'}]}});
async function setupAdmin(page){
 const state={active:true,posts:0,conflict:false,rows:[certificate()]};
 await page.route('**/api/v1/**',r=>json(r,[]));
 await page.route('**/api/v1/auth/google/config',r=>json(r,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,r=>json(r,{id:'independent-admin',status:'ACTIVE',person:{firstName:'إدارة',lastName:'اختبار'},roleAssignments:state.active?[{role:'ADMIN',status:'ACTIVE'}]:[]}));
 await page.route('**/api/v1/training/certificates?**',r=>{const status=new URL(r.request().url()).searchParams.get('status');return json(r,{items:state.rows.filter(row=>row.status===status),nextCursor:null})});
 await page.route('**/api/v1/training/certificates/*/decision',r=>{
  state.posts++;const body=r.request().postDataJSON();expect(body.expectedUpdatedAt).toBe('2026-10-22T11:00:00.000Z');expect(body.reviewed).toBe(true);
  if(state.conflict)return json(r,{message:'تغير طلب الشهادة. حدّث القائمة قبل القرار.'},409);
  const row=state.rows[0];row.status=body.outcome;row.reviewReason=body.reason;row.canReview=false;row.canApprove=false;if(body.outcome==='APPROVED')row.certificateNumber='HYD-TRN-2026-TEST';return json(r,{id:row.id,status:row.status},201);
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
 const state={active:true,posts:0,certificate:null};
 await page.route('**/api/v1/**',r=>json(r,[]));
 await page.route('**/api/v1/auth/google/config',r=>json(r,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,r=>json(r,{id:'assigned-instructor',status:'ACTIVE',person:{firstName:'أنس',lastName:'اختبار'},roleAssignments:state.active?[{role:'INSTRUCTOR',status:'ACTIVE'}]:[]}));
 await page.route('**/api/v1/training/professional/me',r=>json(r,{profile:{displayName:'أنس اختبار'},credentials:[],metrics:{activeStudents:0,sessionsToday:0,completedSessions:1,verifiedCredentials:0},privacy:{excludesMedicalData:true,excludesIdentityData:true,excludesEmergencyContacts:true}}));
 await page.route('**/api/v1/training/professional/me/certificates',r=>json(r,[{trainingRecordId:'record-1',courseCode:'QA-CERT-INSTRUCTOR',student:{displayName:'متدرب اختبار'},readyForRecommendation:true,certificate:state.certificate}]));
 await page.route('**/api/v1/training/professional/me/records/record-1/certificate-recommendation',r=>{state.posts++;state.certificate={id:'certificate-1',status:'RECOMMENDED'};return json(r,{...state.certificate,trainingRecordId:'record-1'},201)});
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
 await page.route('**/api/v1/training/professional/me/certificates',async r=>{started();await pending;return json(r,[{trainingRecordId:'late-private',courseCode:'LATE-PRIVATE',readyForRecommendation:true,certificate:null}])});
 await page.getByRole('button',{name:'الشهادات',exact:true}).click();await requested;await page.getByRole('button',{name:'إدارة الدورات',exact:true}).filter({visible:true}).click();await expect(page.locator('.hl-training')).toHaveAttribute('data-training-mode','professional');
 const received=page.waitForResponse('**/api/v1/training/professional/me/certificates');release();await (await received).finished();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await expect(page.locator('[data-certificate-record]')).toHaveCount(0);await expect(page.locator('.hl-training')).not.toContainText('LATE-PRIVATE');
});
