import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const team=[{membershipId:'m1',role:'INSTRUCTOR',status:'ACTIVE',person:{displayName:'عضو المركز',headline:'Dive Instructor'},professional:{instructorStatus:'ACTIVE',verifiedCredentials:2}}];
const pros=[{accountId:'p1',displayName:'محترف المركز',headline:'مدرب غوص',verifiedCredentials:3,assignedTrainingCount:4}];
async function install(page){
 const state={active:true,team,pros,reads:0,refreshes:0};const profile={id:'center-team-review',email:'center-team@example.invalid',status:'ACTIVE',person:{firstName:'مدير',lastName:'المركز'},roleAssignments:[{role:'DIVE_CENTER',status:'ACTIVE'}]};
 await page.route('**/api/v1/**',route=>{const path=new URL(route.request().url()).pathname;if(path.endsWith('/me'))return route.fallback();return json(route,[])});await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,route=>{state.refreshes++;return json(route,{...profile,roleAssignments:state.active?profile.roleAssignments:[]})});await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
 await page.route('**/api/v1/center/me/overview',route=>json(route,{center:{displayName:'مركز الفريق'},metrics:{newBookings:0,tripsToday:0,activeMembers:2,totalTrips:0}}));
 await page.route('**/api/v1/center/me/team',route=>{state.reads++;return json(route,state.team)});await page.route('**/api/v1/center/me/professionals',route=>{state.reads++;return json(route,state.pros)});
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandCenterTeam));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'team-access',refreshToken:'team-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="center"]').click();return state;
}
test('center professionals can switch to center team membership',async({page})=>{
 await install(page);await page.locator('[data-portal-label="محترفي الغوص"]').click();const panel=page.locator('#hl-center-team');await expect(panel).toBeVisible();await expect(panel).toContainText('محترف المركز');await expect(panel).toContainText('التكليفات التدريبية: 4');
 await panel.locator('[data-center-team-mode="team"]').click();await expect(panel).toContainText('عضو المركز');await expect(panel).toContainText('Dive Instructor');
});
test('center team rejects malformed payload and clears on logout',async({page})=>{
 const state=await install(page);state.pros={members:[]};await page.locator('[data-portal-label="محترفي الغوص"]').click();const panel=page.locator('#hl-center-team');await expect(panel.locator('[role="alert"]')).toContainText('غير مكتملة');
 state.pros=pros;await panel.locator('[data-center-team-retry]').click();await expect(panel).toContainText('محترف المركز');await page.evaluate(()=>window.HydrolandAuth.terminateSession());await expect(panel).toHaveCount(0);
});
test('center team discards response after revocation',async({page})=>{
 const state=await install(page);await page.locator('[data-portal-label="محترفي الغوص"]').click();const panel=page.locator('#hl-center-team');let pending;await page.route('**/api/v1/center/me/team',route=>{pending=route});await panel.locator('[data-center-team-mode="team"]').click();await expect.poll(()=>Boolean(pending)).toBe(true);state.active=false;await page.evaluate(async()=>{await window.HydrolandPortalAccess.refreshPortalAccess();window.HydrolandPortalFreshness.enforce()});await json(pending,team);await expect(page.locator('#hl-center-team')).toHaveCount(0);await expect(page.getByText('عضو المركز')).toHaveCount(0);
});
test('center team refreshes role before exposing member identities',async({page})=>{
 const state=await install(page),before=state.refreshes;state.active=false;await page.evaluate(async()=>{await window.HydrolandPortalAccess.refreshPortalAccess();window.HydrolandPortalFreshness.enforce();await window.HydrolandCenterTeam.open('professionals')});await expect(page.locator('#hl-center-team')).toHaveCount(0);expect(state.refreshes).toBeGreaterThanOrEqual(before+1);expect(state.reads).toBe(0);await expect(page.getByText('محترف المركز')).toHaveCount(0);
});

test('center invites an ordinary member, retries without losing fields, and cancels the pending invitation',async({page})=>{
 const state=await install(page),writes=[];const revision='2026-10-04T06:00:00.000Z';
 await page.route('**/api/v1/center/me/team/invitations',route=>{
  writes.push(route.request().postDataJSON());if(writes.length===1)return json(route,{message:'تعذر إرسال الدعوة مؤقتًا'},503);
  state.team=[...team,{membershipId:'pending',role:'STAFF',status:'PENDING',updatedAt:revision,canCancelInvitation:true,person:{displayName:'عضو مدعو'}}];return json(route,{id:'pending',status:'PENDING'},201);
 });
 let cancelled=0;await page.route('**/api/v1/center/me/team/pending/cancel-invitation',route=>{cancelled++;expect(route.request().postDataJSON()).toEqual({expectedUpdatedAt:revision});state.team=team;return json(route,{id:'pending',status:'REMOVED'},201)});
 await page.locator('[data-portal-label="محترفي الغوص"]').click();const panel=page.locator('#hl-center-team');await panel.getByText('دعوة عضو للمركز',{exact:true}).click();const form=panel.locator('[data-center-team-invite]');
 await expect(form.locator('option[value="OWNER"],option[value="ADMIN"]')).toHaveCount(0);
 await form.getByLabel('البريد المسجل في المنصة').fill('member@example.invalid');await form.getByLabel('الدور داخل المركز').selectOption('STAFF');await form.getByRole('button',{name:'إرسال الدعوة'}).click();
 await expect(form).toContainText('تعذر إرسال الدعوة مؤقتًا');await expect(form.locator('input')).toHaveValue('member@example.invalid');await form.getByRole('button',{name:'إرسال الدعوة'}).click();
 await expect(panel.locator('[data-team-feedback]')).toContainText('بانتظار قبول');await expect(panel).toContainText('عضو مدعو');await expect(panel).toContainText('بانتظار قبول الدعوة');expect(writes).toHaveLength(2);expect(writes[0]).toEqual(writes[1]);expect(writes[0].organizationId).toBeUndefined();
 await panel.getByRole('button',{name:'إلغاء الدعوة'}).click();await expect(panel.locator('[data-team-feedback]')).toContainText('تم إلغاء');await expect(panel).not.toContainText('عضو مدعو');expect(cancelled).toBe(1);
});
test('center invitation submission rechecks authority before writing',async({page})=>{
 const state=await install(page);let writes=0;await page.route('**/api/v1/center/me/team/invitations',route=>{writes++;return json(route,{id:'pending',status:'PENDING'},201)});
 await page.locator('[data-portal-label="محترفي الغوص"]').click();const panel=page.locator('#hl-center-team');await panel.getByText('دعوة عضو للمركز',{exact:true}).click();await panel.locator('[name="email"]').fill('member@example.invalid');state.active=false;
 await panel.locator('[data-center-team-invite]').evaluate(form=>form.requestSubmit());await expect(panel).toHaveCount(0);expect(writes).toBe(0);
});

const managedMember=()=>({...team[0],updatedAt:'2026-10-04T08:00:00.000Z',canChangeRole:true,canSuspend:true,canReactivate:false,openTrainingEnrollments:2,openTrainingSessions:3});
async function openManagedTeam(page,state){
 state.team=[managedMember(),{membershipId:'owner',role:'OWNER',status:'ACTIVE',person:{displayName:'مالك المركز'}},{membershipId:'pending',role:'STAFF',status:'PENDING',person:{displayName:'العضو المدعو'}}];
 await page.locator('[data-portal-label="محترفي الغوص"]').click();const panel=page.locator('#hl-center-team');await panel.locator('[data-center-team-mode="team"]').click();await panel.getByText('تعديل العضوية',{exact:true}).click();return panel;
}
test('center changes ordinary role and preserves fields on a failed save',async({page})=>{
 const state=await install(page),panel=await openManagedTeam(page,state),writes=[];
 await expect(panel.locator('[data-team-manage]')).toHaveCount(1);
 const form=panel.locator('[data-team-manage]');await expect(form.locator('[data-training-impact]')).toContainText('الجلسات غير المنتهية: 3');
 await expect(form.locator('option[value="OWNER"],option[value="ADMIN"]')).toHaveCount(0);
 await page.route('**/api/v1/center/me/team/m1',route=>{
  writes.push(route.request().postDataJSON());expect(route.request().method()).toBe('PATCH');if(writes.length===1)return json(route,{message:'تعذر الحفظ مؤقتًا'},503);
  state.team=[{...managedMember(),role:'STAFF',updatedAt:'2026-10-04T08:01:00.000Z'}];return json(route,{id:'m1',role:'STAFF',status:'ACTIVE'});
 });
 await form.getByLabel('الدور الجديد').selectOption('STAFF');await form.getByLabel('سبب التعديل').fill('تغيير مهام العضو');await form.getByRole('button',{name:'حفظ التعديل'}).click();
 await expect(form.locator('[data-team-manage-message]')).toContainText('تعذر الحفظ مؤقتًا');await expect(form.getByLabel('سبب التعديل')).toHaveValue('تغيير مهام العضو');await expect(form.getByLabel('الدور الجديد')).toHaveValue('STAFF');
 await form.getByRole('button',{name:'حفظ التعديل'}).click();await expect(panel.locator('[data-team-feedback]')).toContainText('تم حفظ الدور الجديد');await expect(panel).toContainText('دور المركز: عضو فريق');
 expect(writes).toHaveLength(2);expect(writes[0]).toEqual(writes[1]);expect(writes[0]).toEqual({action:'CHANGE_ROLE',role:'STAFF',reason:'تغيير مهام العضو',expectedUpdatedAt:'2026-10-04T08:00:00.000Z'});
});
test('center suspends and reactivates membership with current revision and no forged role',async({page})=>{
 const state=await install(page),panel=await openManagedTeam(page,state),writes=[];
 await page.route('**/api/v1/center/me/team/m1',route=>{
  const payload=route.request().postDataJSON();writes.push(payload);const suspended=payload.action==='SUSPEND';state.team=[{...managedMember(),status:suspended?'SUSPENDED':'ACTIVE',canSuspend:!suspended,canReactivate:suspended,updatedAt:suspended?'2026-10-04T08:01:00.000Z':'2026-10-04T08:02:00.000Z'}];return json(route,{id:'m1',role:'INSTRUCTOR',status:state.team[0].status});
 });
 let form=panel.locator('[data-team-manage]');await form.getByLabel('الإجراء',{exact:true}).selectOption('SUSPEND');await expect(form.locator('[data-team-role-field]')).toBeHidden();await form.getByLabel('سبب التعديل').fill('إيقاف مؤقت');await form.getByRole('button',{name:'حفظ التعديل'}).click();
 await expect(panel.locator('[data-team-feedback]')).toContainText('تم إيقاف العضوية');await expect(panel).toContainText('موقوف');await panel.getByText('تعديل العضوية',{exact:true}).click();form=panel.locator('[data-team-manage]');
 await expect(form.locator('option[value="SUSPEND"]')).toHaveCount(0);await form.getByLabel('الإجراء',{exact:true}).selectOption('REACTIVATE');await form.getByLabel('سبب التعديل').fill('انتهاء الإيقاف');await form.getByRole('button',{name:'حفظ التعديل'}).click();await expect(panel.locator('[data-team-feedback]')).toContainText('إعادة تفعيل العضوية');
 expect(writes.map(row=>row.action)).toEqual(['SUSPEND','REACTIVATE']);expect(writes.every(row=>row.role===undefined)).toBe(true);expect(writes[1].expectedUpdatedAt).toBe('2026-10-04T08:01:00.000Z');
});
test('center membership conflict preserves reason and offers explicit refresh',async({page})=>{
 const state=await install(page),panel=await openManagedTeam(page,state);let writes=0;
 await page.route('**/api/v1/center/me/team/m1',route=>{writes++;state.team=[{...managedMember(),status:'SUSPENDED',canSuspend:false,canReactivate:true,updatedAt:'2026-10-04T08:03:00.000Z'}];return json(route,{message:'تغيرت العضوية. حدّث القائمة.'},409)});
 const form=panel.locator('[data-team-manage]');await form.getByLabel('الإجراء',{exact:true}).selectOption('SUSPEND');await form.getByLabel('سبب التعديل').fill('مراجعة العضوية');await form.getByRole('button',{name:'حفظ التعديل'}).click();await expect(form).toContainText('تغيرت العضوية');await expect(form.getByLabel('سبب التعديل')).toHaveValue('مراجعة العضوية');
 await form.getByRole('button',{name:'تحديث قائمة الطاقم'}).click();await expect(panel.locator('[data-team-manage]')).toHaveAttribute('data-revision','2026-10-04T08:03:00.000Z');expect(writes).toBe(1);
});
test('center member edit rechecks manager role before sending',async({page})=>{
 const state=await install(page),panel=await openManagedTeam(page,state);let writes=0;await page.route('**/api/v1/center/me/team/m1',route=>{writes++;return json(route,{id:'m1',status:'SUSPENDED'})});
 const form=panel.locator('[data-team-manage]');await form.getByLabel('الإجراء',{exact:true}).selectOption('SUSPEND');await form.getByLabel('سبب التعديل').fill('سبب الإيقاف');state.active=false;await form.evaluate(el=>el.requestSubmit());await expect(panel).toHaveCount(0);expect(writes).toBe(0);
});
test('late membership save cannot restore team data after logout',async({page})=>{
 const state=await install(page),panel=await openManagedTeam(page,state);let pending;await page.route('**/api/v1/center/me/team/m1',route=>{pending=route});
 const form=panel.locator('[data-team-manage]');await form.getByLabel('الإجراء',{exact:true}).selectOption('SUSPEND');await form.getByLabel('سبب التعديل').fill('إيقاف مؤقت');await form.getByRole('button',{name:'حفظ التعديل'}).click();await expect.poll(()=>Boolean(pending)).toBe(true);
 await page.evaluate(()=>window.HydrolandAuth.terminateSession());await json(pending,{id:'m1',status:'SUSPENDED'});await expect(panel).toHaveCount(0);await expect(page.getByText('تم إيقاف العضوية في المركز.',{exact:true})).toHaveCount(0);
});
