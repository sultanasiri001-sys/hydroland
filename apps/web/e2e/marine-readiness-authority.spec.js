import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher,returnToDiverWorkspace} from './portal-test-helpers.js';

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const setup=async page=>{
  const state={roles:[{role:'BOAT_OWNER',status:'ACTIVE'},{role:'ADMIN',status:'ACTIVE'}],writes:[],assets:[{id:'owned-boat',name:'قارب خاص',status:'DRAFT',maintenance:[{id:'service-1',maintenanceType:'صيانة خاصة',status:'OPEN'}],documents:[],readiness:[]}]};
  await page.route(/\/api\/v1\//,route=>json(route,[]));
  await page.route(/\/api\/v1\/me$/,route=>json(route,{id:'marine-authority',status:'ACTIVE',roleAssignments:state.roles,person:{firstName:'Marine',lastName:'Authority'}}));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
  await page.route(/\/api\/v1\/marine-operations\/assets\/mine$/,route=>json(route,state.assets));
  await page.route(/\/api\/v1\/marine-operations\/admin\/assets\/review$/,route=>json(route,state.assets));
  await page.route(/\/api\/v1\/marine-operations\/.*\/(maintenance|complete|readiness|status)$/,route=>{state.writes.push({url:route.request().url(),body:route.request().postDataJSON()});return json(route,{})});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandMarineReadiness));
  await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','marine-authority-token');sessionStorage.setItem('hl-refresh-token','marine-authority-refresh');window.HydrolandAuth.syncAuthUi();document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));await window.HydrolandProfile.load()});
  await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="boat"]').click();
  await page.locator('.hl-role-dashboard [data-action-label="سجل الصيانة"]').click();
  await expect(page.locator('#hl-marine-readiness [data-marine-readiness-asset]')).toContainText('قارب خاص');
  await expect(page.locator('#hl-marine-readiness [data-marine-readiness-refresh]')).toBeEnabled();
  return state;
};

test('late marine readiness read cannot repopulate a departed workspace',async({page})=>{
  await setup(page);let release;
  await page.route(/\/api\/v1\/marine-operations\/assets\/mine$/,async route=>{await new Promise(resolve=>{release=resolve});return json(route,[{id:'late-private',name:'بيانات متأخرة خاصة',maintenance:[]}])});
  await page.locator('[data-marine-readiness-refresh]').click();await expect.poll(()=>typeof release).toBe('function');
  await returnToDiverWorkspace(page);release();
  await expect(page.locator('#hl-marine-readiness')).toBeHidden();
  await expect(page.locator('[data-marine-readiness-content]')).toBeEmpty();
});

test('latest readiness refresh wins when responses arrive out of order',async({page})=>{
  await setup(page);let release,count=0;
  await page.route(/\/api\/v1\/marine-operations\/assets\/mine$/,async route=>{count++;if(count===1){await new Promise(resolve=>{release=resolve});return json(route,[{id:'old',name:'بيانات قديمة',maintenance:[]}])}return json(route,[{id:'new',name:'بيانات حديثة',maintenance:[]}])});
  await page.evaluate(()=>{void window.HydrolandMarineReadiness.refresh()});await expect.poll(()=>typeof release).toBe('function');
  await page.evaluate(()=>window.HydrolandMarineReadiness.refresh());release();
  await expect(page.locator('[data-marine-readiness-content]')).toContainText('بيانات حديثة');
  await expect(page.locator('[data-marine-readiness-content]')).not.toContainText('بيانات قديمة');
});

for(const action of ['check','complete','save','admin'])test(`marine ${action} action blocks a freshly revoked role before POST`,async({page})=>{
  const state=await setup(page);
  if(action==='admin'){
    await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="admin"]').click();
    await page.locator('.hl-role-dashboard .hl-portal-nav-item[data-portal-label="الوسائط البحرية"]').click();
    await expect(page.locator('[data-marine-asset-status="ACTIVE"]')).toBeVisible();
    await expect(page.locator('[data-marine-readiness-refresh]')).toBeEnabled();
  }
  if(action==='save')await page.locator('[data-marine-maintenance] [name="maintenanceType"]').fill('عمل يجب منعه');
  const selector={check:'[data-marine-readiness-check]',complete:'[data-marine-maintenance-complete]',save:'[data-marine-maintenance] [type="submit"]',admin:'[data-marine-asset-status="ACTIVE"]'}[action];
  // Establish the real rendered control before holding authorization traffic.
  // A background profile refresh must not intercept initial service loading.
  await expect(page.locator(selector)).toBeVisible();
  await expect(page.locator('[data-marine-readiness-refresh]')).toBeEnabled();
  let release;
  await page.route(/\/api\/v1\/me$/,async route=>{await new Promise(resolve=>{release=resolve});return json(route,{id:'marine-authority',status:'ACTIVE',roleAssignments:[],person:{firstName:'Marine'}})});
  await page.locator(selector).click();await expect.poll(()=>typeof release).toBe('function');
  expect(state.writes).toHaveLength(0);release();
  await expect(page.locator('#hl-marine-readiness')).toBeHidden();
  await expect(page.locator('[data-marine-readiness-content]')).toBeEmpty();
  expect(state.writes).toHaveLength(0);
});

test('marine workspace clears cached data on session replacement and rejects direct role mismatch',async({page})=>{
  await setup(page);
  await page.evaluate(()=>{sessionStorage.removeItem('hl-access-token');sessionStorage.removeItem('hl-refresh-token');document.dispatchEvent(new CustomEvent('hydroland:auth-changed'))});
  await expect(page.locator('[data-marine-readiness-content]')).toBeEmpty();
  await expect(page.locator('#hl-marine-readiness')).toBeHidden();
  await page.evaluate(()=>window.HydrolandMarineReadiness.open('admin'));
  await expect(page.locator('#hl-marine-readiness')).toBeHidden();
});
