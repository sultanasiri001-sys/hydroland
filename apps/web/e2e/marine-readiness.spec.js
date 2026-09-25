import {test,expect} from '@playwright/test';

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});

test('boat operator manages maintenance and admin activates a compliant marine asset',async({page})=>{
  const profile={id:'marine-readiness-e2e',email:'marine-readiness@hydroland.test',status:'ACTIVE',roleAssignments:[{id:'boat-role',role:'BOAT_OWNER',status:'ACTIVE'},{id:'admin-role',role:'ADMIN',status:'ACTIVE'}],person:{firstName:'Marine',lastName:'Readiness',phone:null,professional:null}};
  const membership={id:'membership-e2e',organizationId:'org-marine-readiness',accountId:profile.id,role:'OWNER',status:'ACTIVE',organization:{id:'org-marine-readiness',displayName:'مشغل بحري تجريبي',status:'ACTIVE'}};
  const asset={id:'asset-marine-readiness',organizationId:membership.organizationId,name:'قارب الجاهزية',assetType:'DIVE_BOAT',registrationNumber:'MR-2026-01',passengerCapacity:10,status:'DRAFT',documents:[{id:'doc-1',documentType:'REGISTRATION',status:'VERIFIED',referenceNumber:'REG-1',expiresAt:'2030-01-01T00:00:00.000Z'},{id:'doc-2',documentType:'NAVIGATION_LICENSE',status:'VERIFIED',referenceNumber:'NAV-1',expiresAt:'2030-01-01T00:00:00.000Z'},{id:'doc-3',documentType:'SAFETY_CERTIFICATE',status:'VERIFIED',referenceNumber:'SAFE-1',expiresAt:'2030-01-01T00:00:00.000Z'}],maintenance:[],readiness:[]};
  const state={assets:[asset],lastStatus:null};
  const authorized=request=>request.headers().authorization==='Bearer marine-readiness-access';
  await page.route(/\/api\/v1\/me$/,route=>authorized(route.request())?json(route,profile):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/credentials$/,route=>authorized(route.request())?json(route,[]):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>authorized(route.request())?json(route,{profile:null,equipment:[]}):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/organizations\/mine$/,route=>authorized(route.request())?json(route,[membership]):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/marine-operations\/assets\/mine$/,route=>authorized(route.request())?json(route,state.assets):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/marine-operations\/admin\/assets\/review$/,route=>authorized(route.request())?json(route,state.assets):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/marine-operations\/assets\/asset-marine-readiness\/maintenance$/,route=>{
    if(!authorized(route.request()))return json(route,{message:'Unauthorized'},401);
    const body=route.request().postDataJSON();const record={id:'maintenance-e2e',marineAssetId:asset.id,maintenanceType:body.maintenanceType,dueAt:body.dueAt?new Date(body.dueAt).toISOString():null,notes:body.notes||null,status:'OPEN',completedAt:null};asset.maintenance.push(record);return json(route,record,201);
  });
  await page.route(/\/api\/v1\/marine-operations\/assets\/asset-marine-readiness\/maintenance\/maintenance-e2e\/complete$/,route=>{
    if(!authorized(route.request()))return json(route,{message:'Unauthorized'},401);
    const record=asset.maintenance[0];record.status='COMPLETED';record.completedAt=new Date().toISOString();return json(route,record);
  });
  await page.route(/\/api\/v1\/marine-operations\/assets\/asset-marine-readiness\/readiness$/,route=>{
    if(!authorized(route.request()))return json(route,{message:'Unauthorized'},401);
    const ready=asset.status==='ACTIVE'?{status:'NEEDS_REVIEW',reasonCodes:['CALENDAR_RESOURCE_NOT_LINKED']}:{status:'NOT_READY',reasonCodes:['ASSET_NOT_ACTIVE','CALENDAR_RESOURCE_NOT_LINKED']};asset.readiness=[{...ready,checkedAt:new Date().toISOString()}];return json(route,ready);
  });
  await page.route(/\/api\/v1\/marine-operations\/admin\/assets\/asset-marine-readiness\/status$/,route=>{
    if(!authorized(route.request()))return json(route,{message:'Unauthorized'},401);
    const body=route.request().postDataJSON();asset.status=body.status;state.lastStatus=body.status;return json(route,asset);
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandMarineReadiness));
  await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','marine-readiness-access');sessionStorage.setItem('hl-refresh-token','marine-readiness-refresh');window.HydrolandAuth.syncAuthUi();await window.HydrolandProfile.load()});
  await page.locator('#role-switch').click();await page.locator('#role-dialog [data-role="boat"]').click();
  const panel=page.locator('#hl-marine-readiness');await expect(panel).toBeVisible();const card=panel.locator('[data-marine-readiness-asset="asset-marine-readiness"]');await expect(card).toContainText('قارب الجاهزية');
  await card.locator('[data-marine-readiness-check]').click();await expect.poll(()=>asset.readiness[0]?.status).toBe('NOT_READY');await expect(card).toContainText('ASSET_NOT_ACTIVE');
  const form=card.locator('form[data-marine-maintenance]');await form.locator('[name="maintenanceType"]').fill('فحص المحرك');await form.locator('[name="dueAt"]').fill('2030-01-01');await form.locator('button[type="submit"]').click();await expect.poll(()=>asset.maintenance.length).toBe(1);await expect(card).toContainText('فحص المحرك');
  await card.locator('[data-marine-maintenance-complete]').click();await expect.poll(()=>asset.maintenance[0]?.status).toBe('COMPLETED');
  await page.locator('#role-switch').click();await page.locator('#role-dialog [data-role="admin"]').click();
  await expect(panel).toBeVisible();const review=panel.locator('[data-marine-readiness-review="asset-marine-readiness"]');await expect(review).toContainText('قارب الجاهزية');await review.locator('[data-marine-asset-status="ACTIVE"]').click();await expect.poll(()=>state.lastStatus).toBe('ACTIVE');await expect(review).toContainText('ACTIVE');
});