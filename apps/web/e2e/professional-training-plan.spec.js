import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
async function setup(page){
 const state={active:true,skills:[],completed:false,revision:1,posts:0,certificates:0,conflict:false};
 const profile=()=>({id:'instructor',status:'ACTIVE',roleAssignments:[{role:'INSTRUCTOR',status:state.active?'ACTIVE':'SUSPENDED'}],person:{firstName:'أنس',lastName:'اختبار',professional:{}}});
 const percentage=()=>state.skills.length?Math.round(100*state.skills.filter(skill=>skill.status==='COMPETENT').length/state.skills.length):0;
 const revision=()=>new Date(Date.UTC(2026,9,22,10,0,state.revision)).toISOString();
 const data=()=>({enrollmentId:'enrollment-1',courseCode:'QA-TRAINING-PLAN',enrollmentStatus:state.completed?'COMPLETED':'ACTIVE',record:{id:'record-1',status:state.completed?'COMPLETED':'IN_PROGRESS',updatedAt:revision(),progressPercent:percentage()},stages:state.skills.length?[{id:'stage-1',stageType:'مرحلة اختبار',deliveryMode:'THEORY',sequence:1,skills:state.skills}]:[],canEdit:!state.completed,canComplete:!state.completed&&percentage()===100,completionReasons:state.completed?['السجل مغلق أو موقوف ولا يقبل تعديلات.']:percentage()===100?[]:['أكمل تقييم جميع المهارات مع توقيع المدرب.']});
 await page.route('**/api/v1/me',r=>json(r,profile()));await page.route('**/api/v1/credentials',r=>json(r,[]));await page.route('**/api/v1/me/diver-profile',r=>json(r,{profile:null,equipment:[]}));
 await page.route('**/api/v1/training/professional/me',r=>json(r,{profile:{displayName:'أنس اختبار'},credentials:[],metrics:{activeStudents:1,sessionsToday:0,completedSessions:1,verifiedCredentials:0},privacy:{excludesMedicalData:true,excludesIdentityData:true,excludesEmergencyContacts:true}}));
 await page.route('**/api/v1/training/professional/me/assignments',r=>json(r,[{enrollmentId:'enrollment-1',courseCode:'QA-TRAINING-PLAN',status:state.completed?'COMPLETED':'ACTIVE',student:{displayName:'متدرب اختبار'},record:{progressPercent:percentage(),sessions:[{id:'session-1',status:'COMPLETED',startsAt:'2026-10-22T09:00:00Z'}]}}]));
 await page.route('**/api/v1/training/professional/me/enrollments/enrollment-1/plan',r=>{
  if(!state.active)return json(r,{message:'Active instructor role required.'},403);
  if(r.request().method()==='GET')return json(r,data());
  state.posts++;const body=r.request().postDataJSON();expect(body.expectedUpdatedAt).toBe(revision());expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/);
  if(state.conflict)return json(r,{message:'تغيرت خطة الدورة. حدّثها قبل الحفظ.'},409);
  state.skills.push({id:body.requestId,skillCode:body.skillCode,name:body.name,status:'NOT_STARTED',signedOffAt:null});state.revision++;
  return json(r,{enrollmentId:'enrollment-1',replayed:false},201);
 });
 await page.route('**/api/v1/training/professional/me/skills',r=>json(r,state.skills.map(skill=>({...skill,canAssess:!state.completed,stageType:'مرحلة اختبار',courseCode:'QA-TRAINING-PLAN',student:{displayName:'متدرب اختبار'}}))));
 await page.route('**/api/v1/training/skills/*/assessment',r=>{const skill=state.skills.find(s=>r.request().url().includes(s.id));skill.status=r.request().postDataJSON().status;skill.signedOffAt='2026-10-22T10:05:00Z';state.revision++;return json(r,skill)});
 await page.route('**/api/v1/training/professional/me/enrollments/enrollment-1/complete',r=>{state.posts++;const body=r.request().postDataJSON();expect(body.expectedUpdatedAt).toBe(revision());expect(body.reviewed).toBe(true);expect(body.reason).toBe('إتمام اختبار معزول دون شهادة');expect(percentage()).toBe(100);state.completed=true;state.revision++;return json(r,{enrollmentId:'enrollment-1',status:'COMPLETED'},201)});
 await page.route('**/api/v1/training/professional/me/records/*/certificate-recommendation',r=>{state.certificates++;return json(r,{message:'not part of course completion'},409)});
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandTraining));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'plan-access',refreshToken:'plan-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="instructor"]').click();await page.locator('.hl-role-dashboard[data-role="instructor"] [data-action-label="إدارة الدورات"]').click();
 await page.getByRole('button',{name:'خطة التدريب وإتمام الدورة',exact:true}).click();await expect(page.locator('[data-training-plan-view]')).toContainText('QA-TRAINING-PLAN');return state;
}
async function fillSkill(page){
 await page.getByText('إضافة مهارة إلى الخطة',{exact:true}).click();const form=page.locator('[data-plan-skill]');
 await form.getByLabel('اسم المرحلة',{exact:true}).fill('مرحلة اختبار');await form.getByLabel('رمز المهارة',{exact:true}).fill('QA-PROCEDURE');await form.getByLabel('اسم المهارة',{exact:true}).fill('مهارة اختبار إجرائي');await form.getByLabel('ملاحظة الخطة',{exact:true}).fill('خطة اختبار لا تمثل اعتماد غوص');return form;
}
test('assigned instructor defines skills, assesses progress and explicitly completes a course without issuing a certificate',async({page})=>{
 const state=await setup(page);await expect(page.getByRole('button',{name:'إتمام سجل الدورة',exact:true})).toHaveCount(0);
 const form=await fillSkill(page),viewport=page.viewportSize();await page.setViewportSize({width:390,height:844});expect(await form.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);await page.setViewportSize(viewport);await form.getByRole('button',{name:'حفظ المهارة في الخطة',exact:true}).click();await expect(page.locator('[data-training-plan-view]')).toContainText('مهارة اختبار إجرائي');
 await page.getByRole('button',{name:'التقييمات',exact:true}).click();await page.locator('[data-skill-status="COMPETENT"]').click();await expect(page.locator('.hl-training')).toContainText('COMPETENT');
 await page.getByRole('button',{name:'إدارة الدورات',exact:true}).filter({visible:true}).click();await expect(page.locator('[data-professional-enrollment]')).toContainText('100%');
 await page.getByRole('button',{name:'خطة التدريب وإتمام الدورة',exact:true}).click();await expect(page.locator('[data-training-plan-view]')).toContainText('تقدم المهارات: 100%');
 const completion=page.locator('[data-plan-complete]');await completion.getByLabel('ملاحظات الإتمام',{exact:true}).fill('إتمام اختبار معزول دون شهادة');await completion.getByRole('checkbox').check();await completion.getByRole('button',{name:'إتمام سجل الدورة',exact:true}).click();
 await expect(page.locator('[data-training-plan-view]')).toContainText('حالة الدورة: مكتمل');await expect(page.locator('[data-plan-skill]')).toHaveCount(0);expect(state.certificates).toBe(0);
 await page.getByRole('button',{name:'العودة إلى الدورات',exact:true}).click();await expect(page.locator('[data-training-completed]')).toHaveText('1');await expect(page.locator('[data-training-active]')).toHaveText('0');
 await page.getByRole('button',{name:'التقييمات',exact:true}).click();await expect(page.locator('.hl-training')).toContainText('التقييم محفوظ للعرض فقط');await expect(page.locator('[data-skill-status]')).toHaveCount(0);
});
test('a stale plan keeps unsaved fields and role loss prevents another write',async({page})=>{
 const state=await setup(page);state.conflict=true;let form=await fillSkill(page);await form.getByRole('button',{name:'حفظ المهارة في الخطة',exact:true}).click();
 await expect(form.locator('[data-plan-message]')).toContainText('تغيرت خطة الدورة');await expect(form.getByLabel('اسم المهارة',{exact:true})).toHaveValue('مهارة اختبار إجرائي');expect(state.posts).toBe(1);
 state.active=false;await form.getByRole('button',{name:'حفظ المهارة في الخطة',exact:true}).click();await expect(page.locator('.hl-role-dashboard[data-role="instructor"]')).toHaveCount(0);expect(state.posts).toBe(1);
});
test('a delayed plan response cannot replace a newer training view',async({page})=>{
 await setup(page);await page.getByRole('button',{name:'العودة إلى الدورات',exact:true}).click();
 let release,started;const pending=new Promise(resolve=>{release=resolve}),requested=new Promise(resolve=>{started=resolve});
 await page.route('**/api/v1/training/professional/me/enrollments/enrollment-1/plan',async route=>{started();await pending;return json(route,{enrollmentId:'enrollment-1',courseCode:'استجابة متأخرة',enrollmentStatus:'ACTIVE',record:null,updatedAt:'2026-10-22T10:00:00Z',stages:[],canEdit:false,canComplete:false,completionReasons:[]})});
 await page.route('**/api/v1/training/professional/me/schedule',route=>json(route,[]));
 await page.getByRole('button',{name:'خطة التدريب وإتمام الدورة',exact:true}).click();await requested;
 await page.getByRole('button',{name:'الجدول الزمني',exact:true}).click();await expect(page.locator('.hl-training')).toHaveAttribute('data-training-mode','professional-schedule');
 const received=page.waitForResponse('**/api/v1/training/professional/me/enrollments/enrollment-1/plan');release();await (await received).finished();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await expect(page.locator('.hl-training')).toHaveAttribute('data-training-mode','professional-schedule');await expect(page.locator('.hl-training')).not.toContainText('استجابة متأخرة');await expect(page.locator('[data-training-plan-view]')).toHaveCount(0);
});
