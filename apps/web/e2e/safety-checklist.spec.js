import {test,expect} from '@playwright/test';

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});

test('admin submits a pre-trip safety checklist and approves it through the review panel',async({page})=>{
  const profile={id:'safety-checklist-admin',email:'safety-checklist@hydroland.test',status:'ACTIVE',roleAssignments:[{id:'role-admin-safety',role:'ADMIN',status:'ACTIVE'}],person:{firstName:'Safety',lastName:'Admin',phone:null,professional:null}};
  const trip={id:'trip-safety-e2e',title:'رحلة سلامة تجريبية',type:'BOAT',startsAt:'2030-01-01T08:00:00.000Z',endsAt:'2030-01-01T12:00:00.000Z',capacity:8,status:'OPEN'};
  const state={history:[],created:null,decision:null};
  const authorized=request=>request.headers().authorization==='Bearer safety-checklist-access';
  await page.route(/\/api\/v1\/me$/,route=>authorized(route.request())?json(route,profile):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/credentials$/,route=>authorized(route.request())?json(route,[]):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>authorized(route.request())?json(route,{profile:null,equipment:[]}):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/trips\/admin$/,route=>authorized(route.request())?json(route,[trip]):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/trips\/trip-safety-e2e\/safety\/history$/,route=>authorized(route.request())?json(route,state.history):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/trips\/trip-safety-e2e\/safety$/,route=>{
    if(!authorized(route.request()))return json(route,{message:'Unauthorized'},401);
    const body=route.request().postDataJSON();state.created={id:'checklist-safety-e2e',tripId:trip.id,items:body.items,notes:body.notes||null,decision:Object.values(body.items).some(value=>!value)?'DEFERRED':'REVIEW_REQUIRED',createdAt:new Date().toISOString(),decidedAt:null};state.history=[state.created];return json(route,state.created,201);
  });
  await page.route(/\/api\/v1\/trips\/trip-safety-e2e\/safety\/checklists\/checklist-safety-e2e\/decision$/,route=>{
    if(!authorized(route.request()))return json(route,{message:'Unauthorized'},401);
    const body=route.request().postDataJSON();state.decision=body;state.created={...state.created,decision:body.decision,notes:body.notes||state.created.notes,decidedAt:new Date().toISOString()};state.history=[state.created];return json(route,state.created);
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandSafetyChecklist));
  await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','safety-checklist-access');sessionStorage.setItem('hl-refresh-token','safety-checklist-refresh');window.HydrolandAuth.syncAuthUi();await window.HydrolandProfile.load()});
  await page.locator('#role-switch').click();await page.locator('#role-dialog [data-role="admin"]').click();
  const review=page.locator('.hl-safety-review');const form=page.locator('#hl-safety-checklist-form');await expect(review).toBeVisible();await expect(form).toBeVisible();
  const checks=form.locator('input[type="checkbox"]');for(let index=0;index<await checks.count();index+=1)await checks.nth(index).check();
  await form.locator('textarea[name="notes"]').fill('تم فحص عناصر السلامة الأساسية');
  await form.locator('button[type="submit"]').click();
  await expect.poll(()=>state.created?.decision).toBe('REVIEW_REQUIRED');expect(Object.values(state.created.items).every(Boolean)).toBe(true);
  await expect(review.locator('[data-safety-history]')).toContainText('REVIEW_REQUIRED');
  await review.locator('[data-decision="ALLOWED"]').click();
  await expect.poll(()=>state.decision?.decision).toBe('ALLOWED');await expect(review.locator('[data-safety-history]')).toContainText('ALLOWED');
});