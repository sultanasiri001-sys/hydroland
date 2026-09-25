import { test, expect } from '@playwright/test';

const installApi=async page=>{
  const state={documents:[],createPayload:null,revisePayload:null,submitCount:0};
  const authorized=request=>request.headers().authorization==='Bearer e2e-access';
  const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  const profile={id:'org-user-1',email:'organization@hydroland.test',status:'ACTIVE',roleAssignments:[{id:'organization-role',role:'ORGANIZATION',status:'ACTIVE'}],person:{firstName:'Organization',lastName:'User',professional:null}};
  const membership={organization:{id:'org-1',displayName:'مركز هيدرولاند التشغيلي',kind:'DIVE_CENTER',status:'ACTIVE'},role:'OWNER',status:'ACTIVE'};
  const template={id:'template-1',organizationId:'org-1',code:'OPS-001',titleAr:'نموذج تقرير تشغيلي',titleEn:'Operational Report',department:'OPERATIONS',version:1,status:'ACTIVE',printable:true,fields:[{key:'summary',labelAr:'الملخص',labelEn:'Summary',type:'TEXT',required:true}]};
  await page.route(/\/api\/v1\/me$/,route=>authorized(route.request())?json(route,profile):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>authorized(route.request())?json(route,{profile:null,equipment:[]}):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/credentials$/,route=>authorized(route.request())?json(route,[]):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/organizations\/mine$/,route=>authorized(route.request())?json(route,[membership]):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/documents\/organizations\/org-1\/templates$/,route=>authorized(route.request())?json(route,[template]):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/documents\/organizations\/org-1\/list$/,route=>authorized(route.request())?json(route,state.documents):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/documents$/,async route=>{
    const request=route.request();if(!authorized(request))return json(route,{message:'Unauthorized'},401);
    if(request.method()!=='POST')return json(route,{message:'Method not allowed'},405);
    state.createPayload=request.postDataJSON();const document={id:'document-1',organizationId:'org-1',templateId:'template-1',referenceNumber:'HYD-OPERATIONS-2026-000001',department:'OPERATIONS',status:'DRAFT',version:1,contentHash:state.createPayload.contentHash,payload:state.createPayload.payload,createdByAccountId:'org-user-1',approvedByAccountId:null,signedByAccountId:null,template};state.documents=[document];return json(route,document,201);
  });
  await page.route(/\/api\/v1\/documents\/document-1\/revise$/,async route=>{const request=route.request();if(!authorized(request))return json(route,{message:'Unauthorized'},401);state.revisePayload=request.postDataJSON();state.documents[0]={...state.documents[0],version:2,contentHash:state.revisePayload.contentHash,payload:state.revisePayload.payload};return json(route,state.documents[0]);});
  await page.route(/\/api\/v1\/documents\/document-1\/submit$/,route=>{if(!authorized(route.request()))return json(route,{message:'Unauthorized'},401);state.submitCount++;state.documents[0]={...state.documents[0],status:'PENDING_APPROVAL'};return json(route,state.documents[0]);});
  return state;
};

const seed=async page=>{
  const state=await installApi(page);
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile));
  await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','e2e-access');sessionStorage.setItem('hl-refresh-token','e2e-refresh');window.HydrolandAuth.syncAuthUi();await window.HydrolandProfile.load()});
  await page.waitForFunction(()=>Boolean(window.HydrolandDocuments));
  return state;
};

test('organization can create, revise and submit an operational document from the browser',async({page})=>{
  const state=await seed(page);
  await page.locator('#role-switch').click();
  await page.locator('#role-dialog [data-role="organization"]').click();
  const panel=page.locator('#hl-documents');await expect(panel).toBeVisible();
  await expect(panel.locator('[data-doc-org]')).toHaveValue('org-1');
  await expect(panel.locator('[data-doc-template]')).toHaveValue('template-1');
  await expect(page.getByRole('button',{name:'رفع الوثائق'})).toBeEnabled();

  await panel.locator('[name="summary"]').fill('التقرير التشغيلي الأول');
  await panel.locator('[data-doc-save]').click();
  await expect.poll(()=>state.createPayload?.payload?.summary).toBe('التقرير التشغيلي الأول');
  const item=panel.locator('[data-document-id="document-1"]');await expect(item).toContainText('HYD-OPERATIONS-2026-000001');await expect(item).toContainText('مسودة');

  await item.getByRole('button',{name:'تعديل'}).click();
  await panel.locator('[name="summary"]').fill('التقرير التشغيلي بعد التعديل');
  await panel.locator('[data-doc-save]').click();
  await expect.poll(()=>state.revisePayload?.payload?.summary).toBe('التقرير التشغيلي بعد التعديل');
  await expect(item).toContainText('الإصدار 2');

  await item.getByRole('button',{name:'إرسال للاعتماد'}).click();
  await expect.poll(()=>state.submitCount).toBe(1);
  await expect(item).toContainText('بانتظار الاعتماد');
  await expect(item.getByRole('button',{name:'إرسال للاعتماد'})).toHaveCount(0);
});

test('document quick actions are connected instead of disabled placeholders',async({page})=>{
  await seed(page);
  await page.locator('#role-switch').click();await page.locator('#role-dialog [data-role="organization"]').click();
  const dashboard=page.locator('.hl-role-dashboard[data-role="organization"]');await expect(dashboard).toBeVisible();
  for(const name of ['رفع الوثائق','التوقيع الإلكتروني','طلب اعتماد الإدارة','متابعة الحالة'])await expect(dashboard.getByRole('button',{name})).toBeEnabled();
  await dashboard.getByRole('button',{name:'متابعة الحالة'}).click();await expect(page.locator('#hl-documents')).toBeVisible();
});
