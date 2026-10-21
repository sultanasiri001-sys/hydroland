import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher,returnToDiverWorkspace} from './portal-test-helpers.js';

const json=(route,body)=>route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
const center=page=>page.locator('.hl-role-dashboard[data-role="center"]');
async function ready(page){await page.waitForFunction(()=>Boolean(window.HydrolandPublicUI&&window.HydrolandProfile&&window.HydrolandPortalFreshness))}
async function setup(page){
  const state={accountId:'portal-owner',active:true,overviewReads:0,reloadMode:null,reloadReads:0,pending:null};
  const profile=()=>({id:state.accountId,status:'ACTIVE',person:{firstName:'مدير',lastName:'المركز'},roleAssignments:state.active?[{role:'DIVE_CENTER',status:'ACTIVE'}]:[]});
  await page.route('**/api/v1/**',route=>json(route,[]));
  await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
  await page.route(/\/api\/v1\/me$/,route=>{
    if(state.reloadMode&&++state.reloadReads>1){
      if(state.reloadMode==='hold'){state.pending=route;return}
      if(state.reloadMode==='revoke')state.active=false;
    }
    return json(route,profile());
  });
  await page.route('**/api/v1/me/diver-profile',route=>json(route,{profile:null,equipment:[]}));
  await page.route('**/api/v1/center/me/overview',route=>{state.overviewReads++;return json(route,{center:{displayName:'مركز الاستعادة'},metrics:{newBookings:0,tripsToday:0,activeMembers:1,totalTrips:0}})});
  await page.route('**/api/v1/store/provider/catalog',route=>json(route,{organization:{displayName:'مركز الاستعادة'},products:[],courses:[]}));
  await page.goto('/',{waitUntil:'domcontentloaded'});await ready(page);
  await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'portal-reload-access',refreshToken:'portal-reload-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
  await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="center"]').click();await expect(center(page)).toBeVisible();
  await expect.poll(()=>state.overviewReads).toBe(1);return {state,profile};
}

for(const width of [1440,390])test('center remains selected after reload and opens offer management at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:900});const {state}=await setup(page);state.reloadMode='normal';
  await page.reload({waitUntil:'domcontentloaded'});await ready(page);await expect(center(page)).toBeVisible();
  expect(state.reloadReads).toBeGreaterThanOrEqual(2);
  const offers=center(page).locator('[data-portal-label="المتجر والعروض"]');
  if(!await offers.isVisible())await center(page).locator('[data-portal-menu]').click();await offers.click();
  await expect(page.locator('.hl-store-provider')).toBeVisible();await expect(page.getByRole('button',{name:'معاينة المتجر',exact:true})).toBeVisible();
  await expect(offers).toHaveAttribute('aria-current','page');await expect(center(page).locator('.hl-portal-nav-item[aria-current]')).toHaveCount(1);
});
test('explicit return to diver remains selected after reload',async({page})=>{
  await setup(page);await returnToDiverWorkspace(page);await page.reload({waitUntil:'domcontentloaded'});await ready(page);
  await expect(page.locator('#hl-diver-dashboard')).toBeVisible();await expect(center(page)).toHaveCount(0);
});
test('a saved center selection is not applied to a different account',async({page})=>{
  const {state}=await setup(page),reads=state.overviewReads;state.accountId='other-portal-account';
  await page.reload({waitUntil:'domcontentloaded'});await ready(page);await expect(page.locator('#hl-diver-dashboard')).toBeVisible();
  await expect(center(page)).toHaveCount(0);expect(state.overviewReads).toBe(reads);
});
test('restoration rechecks the role and blocks revocation after profile load',async({page})=>{
  const {state}=await setup(page),reads=state.overviewReads;state.reloadMode='revoke';
  await page.reload({waitUntil:'domcontentloaded'});await ready(page);await expect.poll(()=>state.reloadReads).toBeGreaterThanOrEqual(2);
  await expect(page.locator('#hl-diver-dashboard')).toBeVisible();await expect(center(page)).toHaveCount(0);expect(state.overviewReads).toBe(reads);
});
test('late restoration cannot reopen the center after logout',async({page})=>{
  const {state,profile}=await setup(page);state.reloadMode='hold';
  await page.reload({waitUntil:'domcontentloaded'});await ready(page);await expect.poll(()=>Boolean(state.pending)).toBe(true);
  await page.evaluate(()=>{window.HydrolandAuth.terminateSession()});await json(state.pending,profile());
  await expect(center(page)).toHaveCount(0);await expect.poll(()=>page.evaluate(()=>window.HydrolandPortalAccess.getCurrentRole())).toBe('diver');
});
