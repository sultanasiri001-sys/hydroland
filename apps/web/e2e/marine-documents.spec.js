import {test,expect} from '@playwright/test';

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});

test('boat operator registers marine asset and license metadata, admin verifies it',async({page})=>{
  const profile={id:'marine-e2e',email:'marine@hydroland.test',status:'ACTIVE',roleAssignments:[{id:'boat-role',role:'BOAT_OWNER',status:'ACTIVE'},{id:'admin-role',role:'ADMIN',status:'ACTIVE'}],person:{firstName:'Marine',lastName:'E2E',phone:null,professional:null}};
  const membership={id:'membership-e2e',organizationId:'org-marine-e2e',accountId:profile.id,role:'OWNER',status:'ACTIVE',organization:{id:'org-marine-e2e',displayName:'مشغل بحري تجريبي',status:'ACTIVE'}};
  const state={assets:[],pending:[],decision:null};
  const requireAuth=request=>request.headers().authorization==='Bearer marine-e2e-access';
  const assetSummary=()=>{const asset=state.assets[0];if(!asset)return null;const {documents,...summary}=asset;return summary};
  await page.route(/\/api\/v1\/me$/,route=>requireAuth(route.request())?json(route,profile):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/credentials$/,route=>requireAuth(route.request())?json(route,[]):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>requireAuth(route.request())?json(route,{profile:null,equipment:[]}):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/organizations\/mine$/,route=>requireAuth(route.request())?json(route,[membership]):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/marine-operations\/assets\/mine$/,route=>requireAuth(route.request())?json(route,state.assets):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/marine-operations\/assets$/,route=>{
    if(!requireAuth(route.request()))return json(route,{message:'Unauthorized'},401);
    const body=route.request().postDataJSON();const asset={id:'asset-marine-e2e',organizationId:body.organizationId,name:body.name,assetType:body.assetType,registrationNumber:body.registrationNumber||null,passengerCapacity:body.passengerCapacity||null,status:'ACTIVE',documents:[],maintenance:[],updatedAt:new Date().toISOString()};state.assets=[asset];return json(route,asset,201);
  });
  await page.route(/\/api\/v1\/marine-operations\/assets\/asset-marine-e2e\/documents$/,route=>{
    if(!requireAuth(route.request()))return json(route,{message:'Unauthorized'},401);
    const body=route.request().postDataJSON();const doc={id:'marine-doc-e2e',marineAssetId:'asset-marine-e2e',documentType:body.documentType,referenceNumber:body.referenceNumber||null,expiresAt:body.expiresAt?new Date(body.expiresAt).toISOString():null,status:'PENDING',verifiedAt:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};state.assets[0].documents=[doc];state.pending=[doc];return json(route,{...doc,marineAsset:assetSummary()},201);
  });
  await page.route(/\/api\/v1\/marine-operations\/admin\/documents\/pending$/,route=>requireAuth(route.request())?json(route,state.pending.map(doc=>({...doc,marineAsset:assetSummary()}))):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/marine-operations\/admin\/documents\/marine-doc-e2e\/decision$/,route=>{
    if(!requireAuth(route.request()))return json(route,{message:'Unauthorized'},401);
    state.decision=route.request().postDataJSON();const doc=state.pending[0];doc.status=state.decision.outcome;doc.verifiedAt=state.decision.outcome==='VERIFIED'?new Date().toISOString():null;state.pending=[];state.assets[0].documents=[doc];return json(route,{...doc,marineAsset:assetSummary()});
  });

  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandMarineDocuments));
  await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','marine-e2e-access');sessionStorage.setItem('hl-refresh-token','marine-e2e-refresh');window.HydrolandAuth.syncAuthUi();await window.HydrolandProfile.load()});
  await page.locator('#role-switch').click();await page.locator('#role-dialog [data-role="boat"]').click();
  const panel=page.locator('#hl-marine-documents');await expect(panel).toBeVisible();
  const assetForm=panel.locator('[data-marine-asset-form]');await assetForm.locator('[name="name"]').fill('قارب القحمة');await assetForm.locator('[name="assetType"]').selectOption('DIVE_BOAT');await assetForm.locator('[name="registrationNumber"]').fill('QA-2026-01');await assetForm.locator('[name="passengerCapacity"]').fill('10');await assetForm.locator('button[type="submit"]').click();
  await expect.poll(()=>state.assets.length).toBe(1);await expect(panel.locator('[data-marine-asset="asset-marine-e2e"]')).toContainText('قارب القحمة');
  const docForm=panel.locator('[data-marine-asset="asset-marine-e2e"] [data-marine-doc-form]');await docForm.locator('[name="documentType"]').selectOption('REGISTRATION');await docForm.locator('[name="referenceNumber"]').fill('REG-7788');await docForm.locator('[name="expiresAt"]').fill('2027-09-25');await docForm.locator('button[type="submit"]').click();
  await expect.poll(()=>state.pending.length).toBe(1);await expect(panel.locator('[data-marine-asset="asset-marine-e2e"]')).toContainText('PENDING');

  await page.locator('#role-switch').click();await page.locator('#role-dialog [data-role="admin"]').click();
  await expect(panel).toBeVisible();const review=panel.locator('[data-marine-doc="marine-doc-e2e"]');await expect(review).toContainText('REG-7788');await review.locator('[data-marine-decision="VERIFIED"]').click();
  await expect.poll(()=>state.decision?.outcome).toBe('VERIFIED');await expect(panel).toContainText('لا توجد وثائق بحرية بانتظار المراجعة');
});
