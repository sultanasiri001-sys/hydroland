import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const blank=id=>({centerOrgUnitId:id,shift:null,totals:null,entries:[],entryLimit:50,receivers:[],handovers:[]});
const active=()=>({...blank('center-a'),shift:{id:'own-shift',status:'OPEN',openingBalanceMinor:100,currency:'SAR'},totals:{revenueMinor:40,expenseMinor:20,refundMinor:0,adjustmentMinor:0,expectedCashMinor:120},entries:[{id:'entry',type:'EXPENSE',amountMinor:20,description:'معدات المركز'}],receivers:[{accountId:'receiver-b',name:'المحاسب المستلم'}]});
async function setup(page,view=active()){
 const state={active:true,centers:[{id:'center-a',name:'الفرع الرئيسي',organizationName:'عالم الغوص'}],view,status:200,reads:[],writes:[]};
 const profile={id:'finance-accountant',email:'finance@example.invalid',status:'ACTIVE',person:{firstName:'محاسب',lastName:'المركز'},roleAssignments:[{role:'DIVE_CENTER',status:'ACTIVE'}]};
 await page.route('**/api/v1/**',route=>json(route,[]));await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,route=>json(route,{...profile,roleAssignments:state.active?profile.roleAssignments:[]}));await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
 await page.route('**/api/v1/center/me/overview',route=>json(route,{center:{displayName:'عالم الغوص'},metrics:{newBookings:0,tripsToday:0,activeMembers:1,totalTrips:0}}));
 await page.route('**/api/v1/finance/mine/centers',route=>{state.reads.push('centers');return json(route,state.centers)});
 await page.route('**/api/v1/finance/centers/*/workspace',route=>{state.reads.push(route.request().url());return json(route,state.status===200?state.view:{message:'unavailable'},state.status)});
 await page.route('**/api/v1/finance/shifts/**',route=>{state.writes.push({path:new URL(route.request().url()).pathname,body:route.request().postDataJSON()});return json(route,{},201)});
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandCenterFinance&&window.HydrolandProfile&&window.HydrolandAuth));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'finance-access',refreshToken:'finance-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="center"]').click();return state;
}
async function open(page){await page.locator('[data-portal-label="ورديات المحاسب"]').click();const panel=page.locator('#hl-center-finance');await expect(panel).toBeVisible();await expect(panel.locator('[data-finance-result]')).toHaveAttribute('aria-busy','false');return panel}
test('accountant workspace opens from center navigation with scoped totals and entries',async({page})=>{
 const state=await setup(page),panel=await open(page);await expect(panel).toContainText('1.20 ر.س.');await expect(panel).toContainText('معدات المركز');expect(state.reads.at(-1)).toContain('/centers/center-a/workspace');await expect(page.locator('.hl-admin')).toBeHidden();
 await page.setViewportSize({width:390,height:844});await expect(panel).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:test.info().outputPath('portal-center-finance.png'),fullPage:true});
});
test('opens shift with exact minor units and blocks double submission',async({page})=>{
 const state=await setup(page,blank('center-a')),panel=await open(page);let pending;await page.route('**/api/v1/finance/shifts/open',route=>{state.writes.push(route.request().postDataJSON());pending=route});
 await panel.locator('[name=openingBalance]').fill('١٢٣٫٤٥');await panel.getByRole('button',{name:'فتح الوردية',exact:true}).click();await expect.poll(()=>Boolean(pending)).toBe(true);await expect(panel.getByRole('button',{name:'فتح الوردية',exact:true})).toBeDisabled();expect(state.writes).toEqual([{centerOrgUnitId:'center-a',openingBalanceMinor:12345}]);
 state.view=active();await json(pending,{},201);await expect(panel.locator('[role=status]')).toContainText('تم فتح الوردية');await expect(panel).toContainText('وردّيتي الحالية');
});
test('handover requires recipient and variance explanation and sends actual cash precisely',async({page})=>{
 const state=await setup(page),panel=await open(page);await panel.locator('[name=receiver]').selectOption('receiver-b');await panel.locator('[name=actualCash]').fill('1.25');await expect(panel.locator('[data-finance-variance]')).toContainText('0.05');await panel.getByRole('button',{name:'إرسال طلب التسليم'}).click();expect(state.writes).toHaveLength(0);
 await panel.locator('[name=varianceReason]').fill('فرق جرد موثق أثناء التسليم');state.view={...active(),shift:{...active().shift,status:'HANDOVER_PENDING'},receivers:[],handovers:[{id:'handover-a',direction:'OUTGOING',counterpartyName:'المحاسب المستلم',expectedCashMinor:120,actualCashMinor:125,varianceMinor:5,varianceReason:'فرق جرد موثق أثناء التسليم'}]};
 await panel.getByRole('button',{name:'إرسال طلب التسليم'}).click();await expect.poll(()=>state.writes.length).toBe(1);expect(state.writes[0]).toEqual({path:'/api/v1/finance/shifts/own-shift/handover',body:{toAccountantId:'receiver-b',actualCashMinor:125,varianceReason:'فرق جرد موثق أثناء التسليم'}});await expect(panel).toContainText('بانتظار قبول المحاسب المستلم');
});
test('receiver reviews incoming handover and explicitly accepts the cash',async({page})=>{
 const view={...active(),handovers:[{id:'incoming-a',direction:'INCOMING',counterpartyName:'محاسب الفترة السابقة',expectedCashMinor:120,actualCashMinor:100,varianceMinor:-20,varianceReason:'فرق جرد موثق'}]},state=await setup(page,view),panel=await open(page);
 await expect(panel.locator('[data-finance-operation=handover]')).toHaveCount(0);await panel.getByRole('button',{name:'قبول استلام العهدة'}).click();expect(state.writes).toHaveLength(0);await panel.getByRole('checkbox').check();state.view=active();await panel.getByRole('button',{name:'قبول استلام العهدة'}).click();await expect.poll(()=>state.writes.length).toBe(1);expect(state.writes[0].path).toBe('/api/v1/finance/shifts/handovers/incoming-a/accept');await expect(panel.locator('[role=status]')).toContainText('تم قبول العهدة');
});
test('no accountant employment shows access explanation without opening actions',async({page})=>{
 const state=await setup(page);state.centers=[];const panel=await open(page);await expect(panel).toContainText('لا يوجد تعيين محاسب نشط');await expect(panel.locator('form')).toHaveCount(0);expect(state.reads).toEqual(['centers']);
});
test('failed refresh clears old financial data and retry loads the selected center',async({page})=>{
 const state=await setup(page),panel=await open(page);state.status=500;await panel.getByRole('button',{name:'تحديث البيانات'}).click();await expect(panel.locator('[role=alert]')).toContainText('تعذر');await expect(panel).not.toContainText('معدات المركز');await expect(panel.locator('form')).toHaveCount(0);state.status=200;state.view=blank('center-a');await panel.getByRole('button',{name:'تحديث البيانات'}).click();await expect(panel).toContainText('لا توجد وردية نشطة');
});
test('center selector reloads isolated data and clears the preceding center',async({page})=>{
 const state=await setup(page);state.centers.push({id:'center-b',name:'فرع آخر',organizationName:'المركز الآخر'});const panel=await open(page);state.view=blank('center-b');await panel.locator('[name=center]').selectOption('center-b');await expect(panel).toContainText('لا توجد وردية نشطة');await expect(panel).not.toContainText('معدات المركز');expect(state.reads.at(-1)).toContain('/centers/center-b/workspace');
});
test('role revocation before write prevents mutation and removes financial view',async({page})=>{
 const state=await setup(page,blank('center-a')),panel=await open(page);state.active=false;await panel.getByRole('button',{name:'فتح الوردية',exact:true}).click();await expect(panel).toHaveCount(0);expect(state.writes).toHaveLength(0);
});
test('late workspace response cannot restore data after logout',async({page})=>{
 await setup(page);let pending;await page.route('**/api/v1/finance/centers/*/workspace',route=>{pending=route});await page.locator('[data-portal-label="ورديات المحاسب"]').click();await expect.poll(()=>Boolean(pending)).toBe(true);await page.evaluate(()=>window.HydrolandAuth.terminateSession());await json(pending,active());await expect(page.locator('#hl-center-finance')).toHaveCount(0);
});
test('late mutation response cannot restore financial data after logout',async({page})=>{
 await setup(page,blank('center-a'));const panel=await open(page);let pending;await page.route('**/api/v1/finance/shifts/open',route=>{pending=route});await panel.getByRole('button',{name:'فتح الوردية',exact:true}).click();await expect.poll(()=>Boolean(pending)).toBe(true);await page.evaluate(()=>window.HydrolandAuth.terminateSession());await json(pending,{},201);await expect(panel).toHaveCount(0);
});
