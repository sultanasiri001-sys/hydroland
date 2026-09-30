import { test, expect } from '@playwright/test';
import { openWorkspaceSwitcher } from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const cases=[['instructor','INSTRUCTOR'],['center','DIVE_CENTER'],['boat','BOAT_OWNER'],['organization','ORGANIZATION'],['admin','ADMIN']];
async function setup(page){
 const state={roles:[]},authed=request=>request.headers().authorization==='Bearer phase5-access';
 await page.route(/\/api\/v1\/me$/,route=>authed(route.request())?json(route,{id:'phase5-user',email:'phase5@example.invalid',status:'ACTIVE',roleAssignments:state.roles,person:{firstName:'Phase',lastName:'Five'}}):json(route,{message:'Unauthorized'},401));
 await page.route(/\/api\/v1\/credentials$/,route=>json(route,[]));
 await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandPortalAccess&&window.HydrolandPortalFreshness));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'phase5-access',refreshToken:'phase5-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load();});
 return state;
}
test('every protected portal requires its exact active approved role and fails closed on revocation',async({page})=>{
 const state=await setup(page);
 for(const [portal,role] of cases){
  state.roles=[];await openWorkspaceSwitcher(page);const button=page.locator(`#role-dialog [data-role="${portal}"]`);await expect(button).toBeDisabled();
  state.roles=[{id:'role-'+portal,role,status:'PENDING_REVIEW'}];await page.evaluate(()=>window.HydrolandPortalFreshness.refresh());await openWorkspaceSwitcher(page);await expect(button).toBeDisabled();
  state.roles=[{id:'role-'+portal,role,status:'ACTIVE'}];await page.evaluate(()=>window.HydrolandPortalFreshness.refresh());await openWorkspaceSwitcher(page);await expect(button).toBeEnabled();await button.click();
  await expect.poll(()=>page.evaluate(()=>window.HydrolandPortalAccess.getCurrentRole())).toBe(portal);await expect(page.locator(`.hl-role-dashboard[data-role="${portal}"]`)).toBeVisible();
  state.roles=[{id:'role-'+portal,role,status:'SUSPENDED'}];await openWorkspaceSwitcher(page);await expect.poll(()=>page.evaluate(()=>window.HydrolandPortalAccess.getCurrentRole())).toBe('diver');await expect(button).toBeDisabled();
 }
});
test('one active role never unlocks a different protected portal',async({page})=>{
 const state=await setup(page);
 for(const [allowedPortal,allowedRole] of cases){
  state.roles=[{id:'role-'+allowedPortal,role:allowedRole,status:'ACTIVE'}];await page.evaluate(()=>window.HydrolandPortalFreshness.refresh());await openWorkspaceSwitcher(page);
  for(const [portal] of cases){const button=page.locator(`#role-dialog [data-role="${portal}"]`);if(portal===allowedPortal)await expect(button).toBeEnabled();else await expect(button).toBeDisabled();}
  await page.keyboard.press('Escape');
 }
});
