import {test,expect} from '@playwright/test';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
async function setup(page){
 const revision='2026-10-04T06:00:00.000Z';
 const state={membership:{id:'member-1',organizationId:'center-1',role:'INSTRUCTOR',status:'PENDING',updatedAt:revision,organization:{displayName:'مركز عالم الغوص',status:'ACTIVE'}},writes:[],listFails:false,pending:null};
 await page.route('**/api/v1/**',route=>json(route,[]));
 await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,route=>json(route,{id:'invitee',email:'invitee@example.invalid',status:'ACTIVE',roleAssignments:[],person:{firstName:'عضو',lastName:'مدعو'}}));
 await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
 await page.route(/\/api\/v1\/notifications$/,route=>json(route,[{id:'invite-notice',type:'ORGANIZATION_INVITATION',status:'SENT',createdAt:revision,payload:{organizationId:'center-1',organizationName:'مركز عالم الغوص',memberId:'member-1',membershipUpdatedAt:revision}}]));
 await page.route('**/api/v1/organizations/mine',async route=>{if(state.pending)await state.pending;return state.listFails?json(route,{message:'تعذر تحميل الدعوة'},503):json(route,[state.membership])});
 await page.route('**/api/v1/organizations/center-1/membership-response',route=>{state.writes.push(route.request().postDataJSON());state.membership={...state.membership,status:state.writes.at(-1).accept?'ACTIVE':'REMOVED'};return json(route,state.membership,201)});
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandAccountCenter&&window.HydrolandAuth));
 await page.evaluate(()=>{window.HydrolandAuth.acceptSession({accessToken:'invite-access',refreshToken:'invite-refresh'},window.HydrolandAuth.beginAuthAttempt());window.HydrolandAccountCenter.openNotifications()});
 return state;
}
for(const accept of [true,false])test(`invitee explicitly ${accept?'accepts':'declines'} the current invitation`,async({page})=>{
 const state=await setup(page),dialog=page.getByRole('dialog',{name:'الإشعارات'});await dialog.getByRole('button',{name:'عرض دعوة الانضمام'}).click();await expect(dialog).toContainText('الدور المقترح: مدرب غوص');expect(state.writes).toHaveLength(0);
 await dialog.getByRole('button',{name:accept?'قبول الدعوة':'رفض الدعوة',exact:true}).click();await expect(dialog).toContainText(accept?'تم قبول الدعوة وتفعيل العضوية':'تم رفض الدعوة');expect(state.writes).toEqual([{accept,expectedUpdatedAt:'2026-10-04T06:00:00.000Z'}]);
});
test('old invitation notice cannot act on a replacement invitation',async({page})=>{
 const state=await setup(page);state.membership.updatedAt='2026-10-04T07:00:00.000Z';const dialog=page.getByRole('dialog',{name:'الإشعارات'});await dialog.getByRole('button',{name:'عرض دعوة الانضمام'}).click();await expect(dialog).toContainText('تم استبدالها');await expect(dialog.locator('[data-invitation-response]')).toHaveCount(0);expect(state.writes).toHaveLength(0);
});
test('invitation lookup retries after failure and discards data on logout',async({page})=>{
 const state=await setup(page),dialog=page.getByRole('dialog',{name:'الإشعارات'});state.listFails=true;await dialog.getByRole('button',{name:'عرض دعوة الانضمام'}).click();await expect(dialog.locator('[data-invitation-detail]')).toContainText('تعذر تحميل الدعوة');
 state.listFails=false;let release;state.pending=new Promise(resolve=>release=resolve);let requested=false;page.on('request',request=>{if(request.url().endsWith('/organizations/mine'))requested=true});await dialog.getByRole('button',{name:'عرض دعوة الانضمام'}).click();await expect.poll(()=>requested).toBe(true);
 await page.evaluate(()=>window.HydrolandAuth.terminateSession());release();await expect(dialog).not.toBeVisible();await expect(dialog.locator('[data-invitation-response]')).toHaveCount(0);expect(state.writes).toHaveLength(0);
});
