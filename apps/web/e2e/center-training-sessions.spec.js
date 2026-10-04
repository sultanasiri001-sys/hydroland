import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const revision='2026-10-04T08:00:00.000Z';
const planned=()=>({id:'s1',startsAt:'2035-01-01T06:00:00Z',endsAt:'2035-01-01T07:00:00Z',status:'SCHEDULED',updatedAt:revision,instructor:{accountId:'p1',displayName:'مدرب الجلسة',eligible:true},canAssign:false,canReschedule:true,actions:['OPEN','CANCEL'],attendance:{instructorCheckedIn:false,studentCheckedIn:false}});
async function open(page,{empty=false}={}){
 const state={active:true,reads:0,data:{instructors:[{accountId:'p1',displayName:'مدرب الجلسة'}],nextCursor:null,enrollments:[{id:'c1',courseCode:'دورة المركز',status:'ACTIVE',updatedAt:revision,student:{displayName:'متدرب الجلسة'},instructor:{accountId:'p1',displayName:'مدرب الجلسة',eligible:true},canAssign:false,canCreateSession:true,record:{sessions:empty?[]:[planned(),{...planned(),id:'s2',status:'COMPLETED',canReschedule:false,actions:[]}]}}]}};
 const profile={id:'center-sessions',status:'ACTIVE',person:{firstName:'مدير',lastName:'المركز'},roleAssignments:[{role:'DIVE_CENTER',status:'ACTIVE'}]};
 await page.route('**/api/v1/**',route=>new URL(route.request().url()).pathname.endsWith('/me')?route.fallback():json(route,[]));
 await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));await page.route(/\/api\/v1\/me$/,route=>json(route,{...profile,roleAssignments:state.active?profile.roleAssignments:[]}));await page.route('**/api/v1/me/diver-profile',route=>json(route,{profile:null,equipment:[]}));
 await page.route('**/api/v1/center/me/overview',route=>json(route,{center:{displayName:'مركز الجلسات'},metrics:{}}));
 await page.route(/\/api\/v1\/center\/me\/training(?:\?.*)?$/,route=>{state.reads++;return json(route,state.data)});
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandCenterTeam));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'sessions-access',refreshToken:'sessions-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="center"]').click();await page.locator('[data-portal-label="محترفي الغوص"]').click();const panel=page.locator('#hl-center-team');await panel.getByRole('button',{name:'التكليفات التدريبية',exact:true}).click();await expect(panel).toContainText('متدرب الجلسة');return {state,panel};
}
async function createForm(panel){await panel.getByText('إضافة جلسة',{exact:true}).click();const form=panel.locator('[data-training-session-form="create"]');await form.getByLabel('بداية الجلسة بتوقيت الرياض').fill('2035-02-01T09:00');await form.getByLabel('نهاية الجلسة بتوقيت الرياض').fill('2035-02-01T10:00');await form.getByLabel('سبب إجراء الجلسة').fill('تدريب أول');return form}
async function sessionCard(panel){await panel.getByText('الجلسات المسجلة (2)',{exact:true}).click();return panel.locator('[data-training-session="s1"]')}

test('center creates a session with Riyadh time and a stable request id across network retry',async({page})=>{
 const {state,panel}=await open(page,{empty:true}),writes=[];
 await page.route('**/api/v1/center/me/training/enrollments/c1/sessions',route=>{
  const payload=route.request().postDataJSON();writes.push(payload);if(writes.length===1)return json(route,{message:'تعذر الحفظ مؤقتًا'},503);
  state.data.enrollments[0].record.sessions=[{...planned(),id:payload.requestId,startsAt:payload.startsAt,endsAt:payload.endsAt}];return json(route,{id:payload.requestId,status:'SCHEDULED'},201);
 });
 const form=await createForm(panel);await form.getByRole('button',{name:'حفظ الجلسة',exact:true}).click();await expect(form).toContainText('تعذر الحفظ مؤقتًا');await expect(form.getByLabel('سبب إجراء الجلسة')).toHaveValue('تدريب أول');await form.getByRole('button',{name:'حفظ الجلسة',exact:true}).click();await expect(panel.locator('[data-team-feedback]')).toContainText('تم حفظ الجلسة');
 expect(writes[0]).toEqual(writes[1]);expect(writes[0].requestId).toMatch(/^[0-9a-f-]{36}$/);expect(writes[0]).toMatchObject({instructorAccountId:'p1',startsAt:'2035-02-01T09:00:00+03:00',endsAt:'2035-02-01T10:00:00+03:00',expectedUpdatedAt:revision,reason:'تدريب أول'});expect(writes[0].organizationId).toBeUndefined();
 await panel.getByRole('button',{name:'الطاقم',exact:true}).click();await panel.getByRole('button',{name:'التكليفات التدريبية',exact:true}).click();await panel.getByText('الجلسات المسجلة (1)',{exact:true}).click();await expect(panel.locator('[data-training-session]')).toHaveCount(1);await expect(panel).toContainText('٢٠٣٥');
});
test('center reschedules with explicit conflict refresh and completed sessions stay read only',async({page})=>{
 const {state,panel}=await open(page);let writes=0;const card=await sessionCard(panel);await expect(panel.locator('[data-training-session="s2"] form')).toHaveCount(0);await card.getByText('تعديل موعد الجلسة',{exact:true}).click();let form=card.locator('[data-training-session-form="schedule"]');
 await expect(form.getByLabel('بداية الجلسة بتوقيت الرياض')).toHaveValue('2035-01-01T09:00');
 await page.route('**/api/v1/center/me/training/sessions/s1/schedule',route=>{const payload=route.request().postDataJSON();writes++;if(writes===1){state.data.enrollments[0].record.sessions[0].updatedAt='2026-10-04T08:02:00.000Z';return json(route,{message:'تغيرت الجلسة. حدّث القائمة.'},409)}expect(payload.expectedUpdatedAt).toBe('2026-10-04T08:02:00.000Z');state.data.enrollments[0].record.sessions[0].startsAt=payload.startsAt;return json(route,{id:'s1',status:'SCHEDULED'})});
 await form.getByLabel('بداية الجلسة بتوقيت الرياض').fill('2035-01-01T09:30');await form.getByLabel('سبب إجراء الجلسة').fill('تعديل التوقيت');await form.getByRole('button',{name:'حفظ الموعد'}).click();await expect(form).toContainText('تغيرت الجلسة');await expect(form.getByLabel('بداية الجلسة بتوقيت الرياض')).toHaveValue('2035-01-01T09:30');await expect(form.getByLabel('سبب إجراء الجلسة')).toHaveValue('تعديل التوقيت');
 await form.getByRole('button',{name:'تحديث التكليفات'}).click();await sessionCard(panel);await card.getByText('تعديل موعد الجلسة',{exact:true}).click();form=card.locator('[data-training-session-form="schedule"]');await form.getByLabel('بداية الجلسة بتوقيت الرياض').fill('2035-01-01T09:30');await form.getByLabel('سبب إجراء الجلسة').fill('تعديل التوقيت');await form.getByRole('button',{name:'حفظ الموعد'}).click();await expect(panel.locator('[data-team-feedback]')).toContainText('تم حفظ الموعد الجديد');expect(writes).toBe(2);
});
test('center follows attendance and session lifecycle using only server-authorized actions',async({page})=>{
 const {state,panel}=await open(page),writes=[];
 await page.route('**/api/v1/center/me/training/sessions/s1/actions',route=>{
  const payload=route.request().postDataJSON(),row=state.data.enrollments[0].record.sessions[0];expect(payload.expectedUpdatedAt).toBe(row.updatedAt);writes.push(payload.action);row.updatedAt=`2026-10-04T08:0${writes.length}:00.000Z`;row.canReschedule=false;
  if(payload.action==='OPEN'){row.status='CHECK_IN_OPEN';row.actions=['STUDENT_CHECK_IN','INSTRUCTOR_CHECK_IN','CANCEL']}
  if(payload.action==='STUDENT_CHECK_IN'){row.attendance.studentCheckedIn=true;row.attendance.studentRecordedByCenter=true;row.actions=['INSTRUCTOR_CHECK_IN','CANCEL']}
  if(payload.action==='INSTRUCTOR_CHECK_IN'){row.attendance.instructorCheckedIn=true;row.attendance.instructorRecordedByCenter=true;row.actions=['START','CANCEL']}
  if(payload.action==='START'){row.status='IN_PROGRESS';row.actions=['COMPLETE','CANCEL']}
  if(payload.action==='COMPLETE'){row.status='COMPLETED';row.actions=[]}
  return json(route,{id:'s1',status:row.status});
 });
 for(const action of ['OPEN','STUDENT_CHECK_IN','INSTRUCTOR_CHECK_IN','START','COMPLETE']){
  const card=await sessionCard(panel);await card.getByText('الحضور وحالة الجلسة',{exact:true}).click();const form=card.locator('[data-training-session-form="action"]');if(action==='OPEN')await expect(form.locator('option[value="COMPLETE"]')).toHaveCount(0);
  await form.getByLabel('إجراء الجلسة',{exact:true}).selectOption(action);await form.getByLabel('سبب إجراء الجلسة').fill('توثيق الجلسة');await form.getByRole('button',{name:'حفظ إجراء الجلسة'}).click();await expect(panel.locator('[data-team-feedback]')).toContainText('تم حفظ إجراء الجلسة');
 }
 const card=await sessionCard(panel);await expect(card).toContainText('مكتملة');await expect(card).toContainText('وثقه المركز');await expect(card.locator('[data-training-session-form]')).toHaveCount(0);expect(writes).toEqual(['OPEN','STUDENT_CHECK_IN','INSTRUCTOR_CHECK_IN','START','COMPLETE']);
});
test('session create rechecks center authority before writing',async({page})=>{
 const {state,panel}=await open(page,{empty:true});let writes=0;await page.route('**/api/v1/center/me/training/enrollments/c1/sessions',route=>{writes++;return json(route,{id:'unexpected'},201)});const form=await createForm(panel);state.active=false;await form.evaluate(el=>el.requestSubmit());await expect(panel).toHaveCount(0);expect(writes).toBe(0);
});
test('late session create response cannot restore private data after logout',async({page})=>{
 const {panel}=await open(page,{empty:true});let pending;await page.route('**/api/v1/center/me/training/enrollments/c1/sessions',route=>{pending=route});const form=await createForm(panel);await form.getByRole('button',{name:'حفظ الجلسة',exact:true}).click();await expect.poll(()=>Boolean(pending)).toBe(true);const payload=pending.request().postDataJSON();await page.evaluate(()=>window.HydrolandAuth.terminateSession());await json(pending,{id:payload.requestId,status:'SCHEDULED'},201);await expect(panel).toHaveCount(0);await expect(page.getByText('متدرب الجلسة',{exact:true})).toHaveCount(0);
});
