import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const sections=[
 ['إدارة الحجوزات','#hl-center-bookings'],['الرحلات','#hl-center-operations'],['المتجر والعروض','#store'],
 ['المعدات والمخزون','#hl-center-equipment'],['محترفي الغوص','#hl-center-team'],['التدريب والدورات','#hl-center-training'],['العملاء','#hl-center-customers'],
 ['المستندات والتراخيص','#hl-center-documents'],['السلامة','#hl-center-safety'],['ورديات المحاسب','#hl-center-finance'],
 ['الذمم والتحصيل','#hl-center-receivables'],['التقارير','#hl-center-reports'],['الملف التجاري','#hl-center-business-profile']
];
async function setup(page){
 const state={active:true};const profile={id:'nav-owner',status:'ACTIVE',person:{firstName:'مدير',lastName:'المركز'},roleAssignments:[{role:'DIVE_CENTER',status:'ACTIVE'}]};
 await page.route('**/api/v1/**',route=>json(route,[]));
 await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,route=>json(route,{...profile,roleAssignments:state.active?profile.roleAssignments:[]}));
 await page.route('**/api/v1/me/diver-profile',route=>json(route,{profile:null,equipment:[]}));
 await page.route('**/api/v1/center/me/overview',route=>json(route,{center:{displayName:'مركز القائمة'},metrics:{newBookings:0,tripsToday:0,activeMembers:1,totalTrips:0}}));
 await page.route('**/api/v1/center/me/bookings?*',route=>json(route,{items:[],counts:[],total:0,page:1,totalPages:1}));
 await page.route('**/api/v1/center/me/customers?*',route=>json(route,{items:[],total:0,page:1,totalPages:1}));
 await page.route('**/api/v1/center/me/documents',route=>json(route,{assets:[],licenses:[]}));
 await page.route('**/api/v1/center/me/safety',route=>json(route,{checklists:[],incidents:[]}));
 await page.route('**/api/v1/center/me/reports?*',route=>json(route,{center:{displayName:'مركز القائمة'},period:{from:'2030-01-01',to:'2030-01-31'},trips:[],bookings:[],payments:[]}));
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandRoleDashboards&&window.HydrolandProfile&&window.HydrolandCenterReports));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'nav-access',refreshToken:'nav-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="center"]').click();await expect(page.locator('.hl-role-dashboard[data-role="center"]')).toBeVisible();
 return state;
}
const dashboard=page=>page.locator('.hl-role-dashboard[data-role="center"]');
async function expectCurrent(page,label){
 const d=dashboard(page),item=d.locator('[data-portal-label="'+label+'"]');
 await expect(item).toHaveClass(/\bactive\b/);await expect(item).toHaveAttribute('aria-current','page');
 await expect(d.locator('.hl-portal-nav-item.active')).toHaveCount(1);await expect(d.locator('.hl-portal-nav-item[aria-current]')).toHaveCount(1);
}
async function choose(page,label){
 const d=dashboard(page),item=d.locator('[data-portal-label="'+label+'"]');
 if(!await item.isVisible())await d.locator('[data-portal-menu]').click();await item.click();
}
for(const viewport of [{width:1440,height:1000},{width:390,height:844}])test('center navigation follows all sections and home at '+viewport.width+'px',async({page})=>{
 test.setTimeout(90000);await page.setViewportSize(viewport);await setup(page);await expectCurrent(page,'الرئيسية');
 for(const [label,selector] of sections){
  await choose(page,label);await expect(page.locator(selector)).toBeVisible();await expectCurrent(page,label);
  await dashboard(page).locator('[data-portal-home]').click();await expectCurrent(page,'الرئيسية');await expect(page.locator('body')).not.toHaveAttribute('data-hl-workspace-view','service');
 }
});
test('center shortcuts and controller opens update the same accessible selection',async({page})=>{
 await setup(page);const d=dashboard(page);
 for(const [shortcut,label] of [['إدارة الحجوزات','إدارة الحجوزات'],['إدارة الرحلات','الرحلات'],['المخزون والمعدات','المعدات والمخزون'],['الطاقم والمدربين','محترفي الغوص'],['تقارير السلامة','السلامة'],['تقارير الحجوزات والمدفوعات','التقارير']]){
  await d.locator('.hl-command [data-action-label="'+shortcut+'"]').click();await expectCurrent(page,label);await d.locator('[data-portal-home]').click();
 }
 await page.evaluate(()=>window.HydrolandCenterEquipment.search('HYD-TEST'));await expectCurrent(page,'المعدات والمخزون');
 await page.evaluate(()=>window.HydrolandCenterReports.open());await expectCurrent(page,'التقارير');
 await d.locator('a.brand').click();await expectCurrent(page,'الرئيسية');
});
test('an unavailable controller does not falsely select its destination and revocation clears the portal',async({page})=>{
 const state=await setup(page);await choose(page,'التقارير');await expectCurrent(page,'التقارير');
 await page.evaluate(()=>{window.HydrolandCenterOperations={...window.HydrolandCenterOperations,open:()=>undefined}});
 await choose(page,'الرحلات');await expectCurrent(page,'التقارير');
 state.active=false;await choose(page,'العملاء');await expect(dashboard(page)).toHaveCount(0);
});
