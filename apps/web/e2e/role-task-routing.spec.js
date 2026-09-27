import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});

test('role workspace controls route to internal modules without observer loops',async({page})=>{
  const profile={id:'role-task-e2e',email:'roles@hydroland.test',status:'ACTIVE',roleAssignments:[{id:'center-role',role:'DIVE_CENTER',status:'ACTIVE'},{id:'boat-role',role:'BOAT_OWNER',status:'ACTIVE'}],person:{firstName:'Role',lastName:'Task',phone:null,professional:null}};
  const authed=request=>request.headers().authorization==='Bearer role-task-access';
  await page.route(/\/api\/v1\/me$/,route=>authed(route.request())?json(route,profile):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/credentials$/,route=>authed(route.request())?json(route,[]):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>authed(route.request())?json(route,{profile:null,equipment:[]}):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/organizations\/mine$/,route=>authed(route.request())?json(route,[]):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/marine-operations\/assets\/mine$/,route=>authed(route.request())?json(route,[]):json(route,{message:'Unauthorized'},401));

  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandRoleTasks));
  await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','role-task-access');sessionStorage.setItem('hl-refresh-token','role-task-refresh');window.HydrolandAuth.syncAuthUi();document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));await window.HydrolandProfile.load()});

  await openWorkspaceSwitcher(page);
  await page.locator('#role-dialog [data-role="center"]').click();
  const centerDashboard=page.locator('.hl-role-dashboard[data-role="center"]');
  const bookings=centerDashboard.locator('[data-action-label="إدارة الحجوزات"]');
  await expect(bookings).toBeEnabled();
  await bookings.click();
  await expect.poll(()=>new URL(page.url()).hash).toBe('#trips');

  await page.evaluate(()=>{window.HydrolandMarineDocuments.open=()=>{document.body.dataset.marineDocumentsOpened='1'}});
  await openWorkspaceSwitcher(page);
  await page.locator('#role-dialog [data-role="boat"]').click();
  const boatDashboard=page.locator('.hl-role-dashboard[data-role="boat"]');
  const docsTask=boatDashboard.locator('[data-action-label="المستندات والتراخيص"]');
  await expect(docsTask).toBeEnabled();
  await docsTask.click();
  await expect.poll(()=>page.evaluate(()=>document.body.dataset.marineDocumentsOpened||'')).toBe('1');
});
