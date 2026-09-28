import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});

const installCenterFixture=async page=>{
  const state={documents:[],createdPayload:null};
  const center={organization:{id:'center-e2e-001',displayName:'مركز HYDROLAND للاختبار',kind:'DIVE_CENTER',regionCode:'ASIR',status:'ACTIVE'},role:'OWNER',status:'ACTIVE'};
  const template={id:'center-template-001',organizationId:center.organization.id,code:'CENTER-OPS-001',titleAr:'تقرير تشغيل مركز الغوص',titleEn:'Dive Center Operations Report',department:'OPERATIONS',version:1,status:'ACTIVE',printable:true,fields:[{key:'summary',labelAr:'ملخص التقرير',labelEn:'Report summary',type:'TEXT',required:true}]};
  const profile={id:'center-user-001',email:'center@hydroland.test',status:'ACTIVE',roleAssignments:[{id:'center-role-001',role:'DIVE_CENTER',status:'ACTIVE'}],person:{firstName:'مركز',lastName:'الاختبار',professional:null}};
  const authorized=request=>request.headers().authorization==='Bearer center-e2e-access';
  await page.route(/\/api\/v1\/me$/,route=>authorized(route.request())?json(route,profile):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>authorized(route.request())?json(route,{profile:null,equipment:[]}):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/credentials$/,route=>authorized(route.request())?json(route,[]):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/organizations\/mine$/,route=>authorized(route.request())?json(route,[center]):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/marine-operations\/assets\/mine$/,route=>authorized(route.request())?json(route,[]):json(route,{message:'Unauthorized'},401));
  await page.route(new RegExp(`/api/v1/documents/organizations/${center.organization.id}/templates$`),route=>authorized(route.request())?json(route,[template]):json(route,{message:'Unauthorized'},401));
  await page.route(new RegExp(`/api/v1/documents/organizations/${center.organization.id}/list$`),route=>authorized(route.request())?json(route,state.documents):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/documents$/,async route=>{
    if(!authorized(route.request()))return json(route,{message:'Unauthorized'},401);
    if(route.request().method()!=='POST')return json(route,{message:'Method not allowed'},405);
    state.createdPayload=route.request().postDataJSON();
    const document={id:'center-document-001',organizationId:center.organization.id,templateId:template.id,referenceNumber:'HYD-CENTER-E2E-001',department:template.department,status:'DRAFT',version:1,contentHash:state.createdPayload.contentHash,payload:state.createdPayload.payload,createdByAccountId:profile.id,approvedByAccountId:null,signedByAccountId:null,template};
    state.documents=[document];
    return json(route,document,201);
  });
  return state;
};

test('center portal opens center documents and saves a test report under its active membership',async({page})=>{
  const state=await installCenterFixture(page);
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandDocuments));
  await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','center-e2e-access');sessionStorage.setItem('hl-refresh-token','center-e2e-refresh');window.HydrolandAuth.syncAuthUi();document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));await window.HydrolandProfile.load()});

  await openWorkspaceSwitcher(page);
  await page.locator('#role-dialog [data-role="center"]').click();
  const dashboard=page.locator('.hl-role-dashboard[data-role="center"]');
  await expect(dashboard).toBeVisible();
  await expect(dashboard.locator('.hl-role-head')).toHaveClass(/hl-center-hero/);
  await expect(dashboard.locator('.hl-center-highlights')).toContainText('سلامة أولًا');
  await expect(dashboard.locator('[data-center-name]')).toHaveText('مركز الاختبار');
  await expect(dashboard.locator('.hl-portal-nav-item[data-portal-label="المستندات والتراخيص"]')).toBeEnabled();
  await dashboard.locator('.hl-portal-nav-item[data-portal-label="المستندات والتراخيص"]').click();

  const panel=page.locator('#hl-documents');
  await expect(panel).toBeVisible();
  await expect(panel.locator('[data-doc-org]')).toContainText('مركز HYDROLAND للاختبار');
  await expect(panel.locator('[data-doc-template]')).toContainText('تقرير تشغيل مركز الغوص');
  await panel.locator('[name="summary"]').fill('فحص تشغيل مركز الغوص التجريبي');
  await panel.locator('[data-doc-save]').click();
  await expect.poll(()=>state.createdPayload?.payload?.summary).toBe('فحص تشغيل مركز الغوص التجريبي');
  await expect(panel.locator('[data-document-id="center-document-001"]')).toContainText('HYD-CENTER-E2E-001');
  await expect(panel.locator('[data-doc-note]')).toContainText('تم حفظ المستند كمسودة.');
  await dashboard.locator('[data-portal-home]').click();
  await expect(dashboard.locator('.hl-portal-content')).toBeVisible();
  await page.evaluate(()=>{document.getElementById('hl-documents').hidden=true});
  await dashboard.locator('[data-action-label="المستندات والتراخيص"]').click();
  await expect(panel).toBeVisible();
});
