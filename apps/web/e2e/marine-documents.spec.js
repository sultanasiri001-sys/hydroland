import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});

test('boat operator registers marine asset and license metadata, admin verifies it',async({page})=>{
  const profile={id:'marine-e2e',email:'marine@hydroland.test',status:'ACTIVE',roleAssignments:[{id:'boat-role',role:'BOAT_OWNER',status:'ACTIVE'},{id:'center-role',role:'DIVE_CENTER',status:'ACTIVE'},{id:'admin-role',role:'ADMIN',status:'ACTIVE'}],person:{firstName:'Marine',lastName:'E2E',phone:null,professional:null}};
  const membership={id:'membership-e2e',organizationId:'org-marine-e2e',accountId:profile.id,role:'OWNER',status:'ACTIVE',organization:{id:'org-marine-e2e',displayName:'مشغل بحري تجريبي',kind:'MARINE_OPERATOR',status:'ACTIVE'}};
  const state={assets:[],pending:[],decision:null,overviewCalls:0,uploadedPayload:null,ownerAccess:0,adminAccess:0};
  const requireAuth=request=>request.headers().authorization==='Bearer marine-e2e-access';
  const assetSummary=()=>{const asset=state.assets[0];if(!asset)return null;const {documents,...summary}=asset;return summary};
  await page.route(/\/api\/v1\/me$/,route=>requireAuth(route.request())?json(route,profile):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/credentials$/,route=>requireAuth(route.request())?json(route,[]):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>requireAuth(route.request())?json(route,{profile:null,equipment:[]}):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/organizations\/mine$/,route=>requireAuth(route.request())?json(route,[membership]):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/marine-operations\/overview\/mine$/,route=>{if(!requireAuth(route.request()))return json(route,{message:'Unauthorized'},401);state.overviewCalls++;return json(route,{generatedAt:new Date().toISOString(),metrics:{activeAssets:state.assets.filter(asset=>asset.status==='ACTIVE').length,scheduledTrips:0,openMaintenance:0,confirmedBookings:0}})});
  await page.route(/\/api\/v1\/marine-operations\/assets\/mine$/,route=>requireAuth(route.request())?json(route,state.assets):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/marine-operations\/assets$/,route=>{
    if(!requireAuth(route.request()))return json(route,{message:'Unauthorized'},401);
    const body=route.request().postDataJSON();const asset={id:'asset-marine-e2e',organizationId:body.organizationId,name:body.name,assetType:body.assetType,registrationNumber:body.registrationNumber||null,passengerCapacity:body.passengerCapacity||null,status:'ACTIVE',documents:[],maintenance:[],updatedAt:new Date().toISOString()};state.assets=[asset];return json(route,asset,201);
  });
  await page.route(/\/api\/v1\/marine-operations\/assets\/asset-marine-e2e\/documents$/,route=>{
    if(!requireAuth(route.request()))return json(route,{message:'Unauthorized'},401);
    const body=route.request().postDataJSON();state.uploadedPayload=body;const doc={id:'marine-doc-e2e',marineAssetId:'asset-marine-e2e',documentType:body.documentType,referenceNumber:body.referenceNumber||null,expiresAt:body.expiresAt?new Date(body.expiresAt).toISOString():null,originalName:body.originalName,hasFile:Boolean(body.base64),status:'PENDING',verifiedAt:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};state.assets[0].documents=[doc];state.pending=[doc];return json(route,{...doc,marineAsset:assetSummary()},201);
  });
  await page.route(/\/api\/v1\/marine-operations\/admin\/documents\/pending$/,route=>requireAuth(route.request())?json(route,state.pending.map(doc=>({...doc,marineAsset:assetSummary()}))):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/marine-operations\/assets\/asset-marine-e2e\/documents\/marine-doc-e2e\/access$/,route=>{state.ownerAccess++;return json(route,{url:'about:blank#marine-owner-document'})});
  await page.route(/\/api\/v1\/marine-operations\/admin\/documents\/marine-doc-e2e\/access$/,route=>{state.adminAccess++;return json(route,{url:'about:blank#marine-review-document'})});
  await page.route(/\/api\/v1\/marine-operations\/admin\/documents\/marine-doc-e2e\/decision$/,route=>{
    if(!requireAuth(route.request()))return json(route,{message:'Unauthorized'},401);
    state.decision=route.request().postDataJSON();const doc=state.pending[0];doc.status=state.decision.outcome;doc.verifiedAt=state.decision.outcome==='VERIFIED'?new Date().toISOString():null;state.pending=[];state.assets[0].documents=[doc];return json(route,{...doc,marineAsset:assetSummary()});
  });

  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandMarineDocuments));
  await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','marine-e2e-access');sessionStorage.setItem('hl-refresh-token','marine-e2e-refresh');window.HydrolandAuth.syncAuthUi();document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));await window.HydrolandProfile.load()});
  await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="boat"]').click();
  const panel=page.locator('#hl-marine-documents');
  const dashboard=page.locator('.hl-role-dashboard[data-role="boat"]');await expect(dashboard.locator('.hl-role-tile b').nth(0)).toHaveText('0');

  await dashboard.locator('[data-action-label="المستندات والتراخيص"]').click();
  await expect(panel).toBeVisible();
  await page.evaluate(()=>{document.getElementById('hl-marine-documents').hidden=true});
  await dashboard.locator('.hl-portal-nav-item[data-portal-label="المستندات والتراخيص"]').click();
  await expect(panel).toBeVisible();
  await page.evaluate(()=>window.HydrolandMarineDocuments.refresh());
  const assetForm=panel.locator('[data-marine-asset-form]');await assetForm.locator('[name="name"]').fill('قارب القحمة');await assetForm.locator('[name="assetType"]').selectOption('DIVE_BOAT');await assetForm.locator('[name="registrationNumber"]').fill('QA-2026-01');await assetForm.locator('[name="passengerCapacity"]').fill('10');await assetForm.locator('button[type="submit"]').click();
  await expect.poll(()=>state.assets.length).toBe(1);await expect(panel.locator('[data-marine-asset="asset-marine-e2e"]')).toContainText('قارب القحمة');await expect(dashboard.locator('.hl-role-tile b').nth(0)).toHaveText('1');
  const docForm=panel.locator('[data-marine-asset="asset-marine-e2e"] [data-marine-doc-form]');await docForm.locator('[name="documentType"]').selectOption('REGISTRATION');await docForm.locator('[name="referenceNumber"]').fill('REG-7788');await docForm.locator('[name="expiresAt"]').fill('2027-09-25');const png=Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),Buffer.from('marine-e2e')]);await docForm.locator('input[type="file"]').setInputFiles({name:'registration.png',mimeType:'image/png',buffer:png});await docForm.locator('button[type="submit"]').click();await expect.poll(()=>state.uploadedPayload?.originalName).toBe('registration.png');expect(Buffer.from(state.uploadedPayload.base64,'base64').equals(png)).toBe(true);
  await expect.poll(()=>state.pending.length).toBe(1);await expect(panel.locator('[data-marine-asset="asset-marine-e2e"]')).toContainText('PENDING');await panel.getByRole('button',{name:'عرض الملف'}).click();await expect.poll(()=>state.ownerAccess).toBe(1);

  await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="center"]').click();const center=page.locator('.hl-role-dashboard[data-role="center"]');await center.getByRole('button',{name:'وثائق الأصول البحرية'}).click();await expect(panel).toBeVisible();await expect(panel.locator('[data-marine-asset="asset-marine-e2e"]')).toContainText('قارب القحمة');
  await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="admin"]').click();
  await page.locator('.hl-role-dashboard .hl-portal-nav-item[data-portal-label="الوساطة البحرية"]').click();
  await expect(panel).toBeVisible();const review=panel.locator('[data-marine-doc="marine-doc-e2e"]');await expect(review).toContainText('REG-7788');await review.getByRole('button',{name:'عرض الملف'}).click();await expect.poll(()=>state.adminAccess).toBe(1);await review.locator('[data-marine-decision="VERIFIED"]').click();
  await expect.poll(()=>state.decision?.outcome).toBe('VERIFIED');await expect(panel).toContainText('لا توجد وثائق بحرية بانتظار المراجعة');
});