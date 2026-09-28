import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});

const setupAdmin=async (page,role='admin')=>{
  const state={roles:[{id:'role-admin-action',role:role==='organization'?'ORGANIZATION':'ADMIN',status:'ACTIVE'}],fail:false};
  const authed=request=>request.headers().authorization==='Bearer portal-action-access';
  await page.route(/\/api\/v1\/me$/,async route=>{
    if(!authed(route.request()))return json(route,{message:'Unauthorized'},401);
    if(state.hold)await new Promise(resolve=>{state.release=resolve});
    if(state.fail)return json(route,{message:'Unavailable'},503);
    return json(route,{id:'portal-action-user',email:'action@hydroland.test',status:'ACTIVE',roleAssignments:state.roles,person:{firstName:'Action',lastName:'Guard',phone:null,professional:null}});
  });
  await page.route(/\/api\/v1\/credentials$/,route=>json(route,[]));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandPortalAccess&&window.HydrolandPortalFreshness&&window.HydrolandRoleTasks));
  await page.evaluate(async()=>{
    sessionStorage.setItem('hl-access-token','portal-action-access');
    sessionStorage.setItem('hl-refresh-token','portal-action-refresh');
    window.HydrolandAuth.syncAuthUi();document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));
    await window.HydrolandProfile.load();
  });
  await openWorkspaceSwitcher(page);
  await page.locator(`#role-dialog [data-role="${role}"]`).click();
  await expect.poll(()=>page.evaluate(()=>window.HydrolandPortalAccess.getCurrentRole())).toBe(role);
  await expect(page.locator('#role-console')).toBeHidden();
  await expect(page.locator(`.hl-role-dashboard[data-role="${role}"]`)).toBeVisible();
  return state;
};

const expectClosed=async page=>{
  await expect.poll(()=>page.evaluate(()=>window.HydrolandPortalAccess.getCurrentRole())).toBe('diver');
  await expect(page.locator('#role-console')).toBeHidden();
  await expect(page.locator('.hl-role-dashboard')).toHaveCount(0);
  await expect.poll(()=>new URL(page.url()).hash).not.toBe('#safety');
};

test('role dashboard action reauthorizes and blocks navigation after live role revocation',async({page})=>{
  const state=await setupAdmin(page);
  await page.evaluate(()=>history.replaceState(null,'','#home'));
  state.roles=[];
  const dashboard=page.locator('.hl-role-dashboard[data-role="admin"]');
  await dashboard.getByRole('button',{name:'مركز الحوادث'}).click();
  await expectClosed(page);
});

test('role workspace navigation reauthorizes and blocks navigation after live role revocation',async({page})=>{
  const state=await setupAdmin(page);
  await page.evaluate(()=>history.replaceState(null,'','#home'));
  state.roles=[];
  const navigation=page.locator('.hl-role-dashboard[data-role="admin"] .hl-portal-nav-item[data-portal-label="السلامة والامتثال"]');
  await expect(navigation).toBeEnabled();
  await navigation.click();
  await expectClosed(page);
});

test('document feature handlers wait for dashboard authorization and stay closed on revocation',async({page})=>{
  const state=await setupAdmin(page,'organization');
  await page.waitForFunction(()=>Boolean(window.HydrolandDocuments&&window.HydrolandWorkspaceUI));
  const documents=page.locator('#hl-documents');
  await expect(documents).toBeHidden();
  state.hold=true;state.roles=[];
  await page.locator('.hl-role-dashboard [data-action-label="رفع الوثائق"]').click();
  await expect.poll(()=>typeof state.release).toBe('function');
  await expect(documents).toBeHidden();
  expect(new URL(page.url()).hash).not.toBe('#hl-documents');
  state.hold=false;state.release();
  await expectClosed(page);
  await expect(documents).toBeHidden();
});
