import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
async function open(page){
 const state={active:true,checked:false,revision:'2026-10-04T08:00:00.000Z'};
 state.row=()=>({id:'s1',courseCode:'دورة الحضور',student:{displayName:'متدرب الحضور الخاص'},status:'CHECK_IN_OPEN',startsAt:'2035-01-01T06:00:00Z',updatedAt:state.revision,actions:state.checked?[]:['INSTRUCTOR_CHECK_IN'],attendance:{instructorCheckedIn:state.checked,studentCheckedIn:false}});
 const me=()=>({id:'instructor-guards',status:'ACTIVE',roleAssignments:state.active?[{role:'INSTRUCTOR',status:'ACTIVE'}]:[],person:{firstName:'مدرب',lastName:'الجلسة',professional:{}}});
 await page.route('**/api/v1/**',route=>new URL(route.request().url()).pathname.endsWith('/me')?route.fallback():json(route,[]));
 await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));await page.route(/\/api\/v1\/me$/,route=>json(route,me()));await page.route('**/api/v1/me/diver-profile',route=>json(route,{profile:null,equipment:[]}));
 await page.route(/\/api\/v1\/training\/professional\/me$/,route=>json(route,{profile:{displayName:'مدرب الجلسة'},credentials:[],metrics:{activeStudents:1,sessionsToday:1},privacy:{}}));
 await page.route('**/api/v1/training/professional/me/schedule',route=>json(route,[state.row()]));
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandTraining));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'attendance-access',refreshToken:'attendance-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="instructor"]').click();await page.locator('.hl-role-dashboard[data-role="instructor"] [data-action-label="جدول التدريب"]').click();const panel=page.locator('.hl-training');await expect(panel).toContainText('متدرب الحضور الخاص');return {state,panel};
}
test('professional attendance conflict refreshes revision before retrying',async({page})=>{
 const {state,panel}=await open(page),writes=[];
 await page.route('**/api/v1/training/professional/me/sessions/s1/attendance',route=>{const body=route.request().postDataJSON();writes.push(body);if(writes.length===1){state.revision='2026-10-04T08:01:00.000Z';return json(route,{message:'تغيرت الجلسة. حدّث القائمة.'},409)}state.checked=true;return json(route,{id:'s1',status:'CHECK_IN_OPEN'})});
 await panel.getByRole('button',{name:'تسجيل حضور المدرب'}).click();await expect(panel).toContainText('تغيرت الجلسة');await panel.getByRole('button',{name:'تحديث الجدول'}).click();await panel.getByRole('button',{name:'تسجيل حضور المدرب'}).click();await expect(panel).toContainText('حضور المدرب: مسجل');expect(writes.map(row=>row.expectedUpdatedAt)).toEqual(['2026-10-04T08:00:00.000Z','2026-10-04T08:01:00.000Z']);
});
test('professional attendance rechecks role before saving',async({page})=>{
 const {state,panel}=await open(page);let writes=0;await page.route('**/api/v1/training/professional/me/sessions/s1/attendance',route=>{writes++;return json(route,{id:'s1'})});state.active=false;await panel.getByRole('button',{name:'تسجيل حضور المدرب'}).click();await expect(panel).not.toContainText('متدرب الحضور الخاص');expect(writes).toBe(0);
});
test('late professional schedule response cannot restore student identity after logout',async({page})=>{
 const {state,panel}=await open(page);let pending;await page.route('**/api/v1/training/professional/me/schedule',route=>{pending=route});await page.evaluate(()=>{void window.HydrolandTraining.reload('instructor-schedule')});await expect.poll(()=>Boolean(pending)).toBe(true);await page.evaluate(()=>window.HydrolandAuth.terminateSession());await json(pending,[state.row()]);await expect(panel).not.toContainText('متدرب الحضور الخاص');await expect(panel.locator('[data-attendance-action]')).toHaveCount(0);
});
