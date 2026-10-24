import { test, expect } from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';

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
  await page.route(/\/api\/v1\/documents\/organizations\/org-1\/inventory$/,route=>{
    if(!authorized(route.request()))return json(route,{message:'Unauthorized'},401);
    const counts={DRAFT:0,PENDING_APPROVAL:0,APPROVED:0,SIGNED:0,ARCHIVED:0};for(const d of state.documents)counts[d.status]++;
    return json(route,{organizationId:'org-1',observedAt:'2026-10-24T19:45:00Z',internalPlatform:false,completeDocumentInventoryVerified:false,departments:[{code:'OPERATIONS',nameAr:'العمليات',summary:{types:1,noRecord:state.documents.length?0:1,pendingApproval:counts.PENDING_APPROVAL},items:[{code:template.code,titleAr:template.titleAr,department:'OPERATIONS',templateStatus:'READY',activeTemplateId:template.id,counts,total:state.documents.length,recordStatus:state.documents.length?'RECORDED':'NO_RECORD'}]}]});
  });
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
  await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','e2e-access');sessionStorage.setItem('hl-refresh-token','e2e-refresh');window.HydrolandAuth.syncAuthUi();document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));await window.HydrolandProfile.load()});
  await page.waitForFunction(()=>Boolean(window.HydrolandDocuments));
  return state;
};

test('organization can create, revise and submit an operational document from the browser',async({page})=>{
  const state=await seed(page);
  await openWorkspaceSwitcher(page);
  await page.locator('#role-dialog [data-role="organization"]').click();
  const upload=page.locator('.hl-role-dashboard [data-action-label="رفع الوثائق"]');
  await expect(upload).toBeEnabled();await upload.click();
  const panel=page.locator('#hl-documents');await expect(panel).toBeVisible();
  await expect(panel.locator('[data-doc-org]')).toHaveValue('org-1');
  await expect(panel.locator('[data-doc-template]')).toHaveValue('template-1');


  await panel.locator('[name="summary"]').fill('التقرير التشغيلي الأول');
  await panel.locator('[data-doc-save]').click();
  await expect.poll(()=>state.createPayload?.payload?.summary).toBe('التقرير التشغيلي الأول');
  const item=panel.locator('[data-document-id="document-1"]');await expect(item).toContainText('HYD-OPERATIONS-2026-000001');await expect(item).toContainText('مسودة');

  await item.getByRole('button',{name:'تعديل'}).click();
  await panel.locator('[name="summary"]').fill('التقرير التشغيلي بعد التعديل');
  await panel.locator('[data-doc-save]').click();
  await expect.poll(()=>state.revisePayload?.payload?.summary).toBe('التقرير التشغيلي بعد التعديل');
  await expect(item).toContainText('الإصدار 2');
  await expect(panel.locator('[data-doc-note]')).toContainText('تم حفظ التعديل والإصدار الجديد.');

  await item.getByRole('button',{name:'إرسال للاعتماد'}).click();
  await expect.poll(()=>state.submitCount).toBe(1);
  await expect(item).toContainText('بانتظار الاعتماد');
  await expect(item.getByRole('button',{name:'إرسال للاعتماد'})).toHaveCount(0);
});

const openDocuments=async page=>{
  await openWorkspaceSwitcher(page);
  await page.locator('#role-dialog [data-role="organization"]').click();
  await page.locator('.hl-role-dashboard [data-action-label="رفع الوثائق"]').click();
  await expect(page.locator('#hl-documents')).toBeVisible();
};
const counts=(extra={})=>({DRAFT:0,PENDING_APPROVAL:0,APPROVED:0,SIGNED:0,ARCHIVED:0,...extra});
const inventoryFor=(orgId,departments)=>({organizationId:orgId,observedAt:'2026-10-24T19:45:00Z',internalPlatform:orgId==='org-1',baselineTemplateCount:42,completeDocumentInventoryVerified:false,departments});
const department=(code,nameAr,items)=>({code,nameAr,items,summary:{types:items.length,noRecord:items.filter(t=>t.recordStatus==='NO_RECORD').length,pendingApproval:items.reduce((n,t)=>n+t.counts.PENDING_APPROVAL,0)}});

test('department inventory filters gaps and prepares the exact missing template without creating or approving documents',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await seed(page);
  const hr={id:'hr-existing',code:'HR-EMPLOYEE-REPORT',titleAr:'تقرير بيانات موظف',titleEn:'Employee report',department:'HR',fields:[{key:'employeeNo',labelAr:'رقم الموظف',type:'TEXT',required:true}],status:'ACTIVE'};
  const finance={id:'fin-existing',code:'FIN-RECEIPT-VOUCHER',titleAr:'سند قبض',titleEn:'Receipt',department:'FINANCE',fields:[],status:'ACTIVE'};
  const setup={organizationId:'org-1',code:'HR-LEAVE-REQUEST',titleAr:'طلب إجازة',titleEn:'Leave Request',department:'HR',fields:[{key:'employeeNo',labelAr:'رقم الموظف',labelEn:'Employee number',type:'TEXT',required:true}],printable:true};
  let prepared=null,mutations=0;
  const templates=[hr,finance];
  await page.route(/\/documents\/organizations\/org-1\/templates$/,route=>route.fulfill({json:templates}));
  await page.route(/\/documents\/organizations\/org-1\/list$/,route=>route.fulfill({json:[{id:'hr-doc',department:'HR',template:hr,referenceNumber:'HR-PRIVATE',status:'PENDING_APPROVAL',version:1},{id:'fin-doc',department:'FINANCE',template:finance,referenceNumber:'FIN-ARCHIVE',status:'ARCHIVED',version:1}]}));
  await page.route(/\/documents\/organizations\/org-1\/inventory$/,route=>route.fulfill({json:inventoryFor('org-1',[
    department('HR','الموارد البشرية',[
      {...hr,templateStatus:'READY',activeTemplateId:hr.id,recordStatus:'RECORDED',total:1,counts:counts({PENDING_APPROVAL:1})},
      {...setup,templateStatus:prepared?'READY':'NOT_CONFIGURED',activeTemplateId:prepared?.id,recordStatus:'NO_RECORD',total:0,counts:counts(),setup:prepared?null:setup},
    ]),department('FINANCE','المالية',[{...finance,templateStatus:'READY',activeTemplateId:finance.id,recordStatus:'ARCHIVE_ONLY',total:1,counts:counts({ARCHIVED:1})}]),
  ])}));
  await page.route(/\/documents\/templates$/,async route=>{prepared={id:'hr-prepared',...route.request().postDataJSON(),status:'ACTIVE'};templates.push(prepared);mutations++;await route.fulfill({status:201,json:prepared});});
  await openDocuments(page);
  const panel=page.locator('#hl-documents');
  await panel.locator('[data-doc-department-card="HR"]').click();
  await expect(panel.locator('[data-doc-list]')).toContainText('HR-PRIVATE');
  await expect(panel.locator('[data-doc-list]')).not.toContainText('FIN-ARCHIVE');
  await panel.locator('[data-doc-gap-filter]').selectOption('NO_RECORD');
  await expect(panel.locator('[data-doc-inventory] tbody tr')).toHaveCount(1);
  await expect(panel.locator('[data-doc-inventory]')).toContainText('النموذج غير مهيأ');
  await panel.getByRole('button',{name:'تهيئة النموذج',exact:true}).click();
  await expect.poll(()=>prepared?.code).toBe(setup.code);
  expect(prepared.department).toBe('HR');expect(mutations).toBe(1);
  await expect(panel.locator('[data-doc-inventory]')).toContainText('لا يوجد مستند محفوظ');
  await expect(panel.locator('[data-doc-inventory]')).toContainText('نموذج مهيأ');
  await panel.getByRole('button',{name:'إنشاء مستند',exact:true}).click();
  await expect(panel.locator('[data-doc-template]')).toHaveValue('hr-prepared');
  await expect(panel.locator('[name="employeeNo"]')).toBeVisible();
  await expect(panel.locator('[data-doc-inventory-scope]')).toContainText('الحصر الكامل لمستندات الإدارة لم يُعتمد بعد');
  await panel.locator('[data-doc-department]').selectOption('FINANCE');
  await panel.locator('[data-doc-gap-filter]').selectOption('ARCHIVE_ONLY');
  await expect(panel.locator('[data-doc-inventory]')).toContainText('مؤرشف فقط');
  await expect(panel.locator('[data-doc-list]')).not.toContainText('HR-PRIVATE');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('viewer sees pending gaps without template setup or document creation actions',async({page})=>{
  await seed(page);
  await page.route(/\/organizations\/mine$/,route=>route.fulfill({json:[{organization:{id:'org-1',displayName:'اختبار المشاهد'},role:'VIEWER',status:'ACTIVE'}]}));
  await page.route(/\/documents\/organizations\/org-1\/inventory$/,route=>route.fulfill({json:inventoryFor('org-1',[department('HR','الموارد البشرية',[{code:'HR-LEAVE-REQUEST',titleAr:'طلب إجازة',templateStatus:'NOT_CONFIGURED',recordStatus:'NO_RECORD',counts:counts(),total:0,setup:{code:'SHOULD-NOT-POST'}}])])}));
  await openDocuments(page);const panel=page.locator('#hl-documents');
  await expect(panel.locator('[data-doc-inventory]')).toContainText('طلب إجازة');
  await expect(panel.getByRole('button',{name:'تهيئة النموذج'})).toHaveCount(0);
  await expect(panel.locator('[data-doc-save]')).toBeDisabled();
});

test('late organization inventory cannot repopulate another organization or a cleared session',async({page})=>{
  await seed(page);let release,requested=false;
  const gate=new Promise(resolve=>{release=resolve});
  await page.route(/\/organizations\/mine$/,route=>route.fulfill({json:['org-1','org-2'].map(id=>({organization:{id,displayName:id},role:'OWNER',status:'ACTIVE'}))}));
  await page.route(/\/documents\/organizations\/org-1\/inventory$/,async route=>{requested=true;await gate;await route.fulfill({json:inventoryFor('org-1',[department('HR','SECRET-OLD-DEPARTMENT',[])])});});
  await page.route(/\/documents\/organizations\/org-2\/(templates|list)$/,route=>route.fulfill({json:[]}));
  await page.route(/\/documents\/organizations\/org-2\/inventory$/,route=>route.fulfill({json:inventoryFor('org-2',[department('FINANCE','جهة ثانية',[])])}));
  await openDocuments(page);await expect.poll(()=>requested).toBe(true);
  const panel=page.locator('#hl-documents');await panel.locator('[data-doc-org]').selectOption('org-2');
  await expect(panel.locator('[data-doc-departments]')).toContainText('جهة ثانية');release();
  await expect(panel.locator('[data-doc-departments]')).not.toContainText('SECRET-OLD-DEPARTMENT');
  await page.evaluate(()=>document.dispatchEvent(new CustomEvent('hydroland:session-cleared')));
  await expect(panel).toBeHidden();await expect(panel.locator('[data-doc-inventory]')).toBeEmpty();
});

test('document quick actions are connected instead of disabled placeholders',async({page})=>{
  await seed(page);
  await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="organization"]').click();
  const dashboard=page.locator('.hl-role-dashboard[data-role="organization"]');await expect(dashboard).toBeVisible();
  for(const name of ['رفع الوثائق','العقود والمستندات','متابعة اعتماد المستندات']){
    const button=dashboard.locator('.hl-command-grid').getByRole('button',{name,exact:true});
    await expect(button).toBeEnabled();await expect(button).toHaveAttribute('data-hl-route','documents');
  }
  await dashboard.getByRole('button',{name:'متابعة اعتماد المستندات',exact:true}).click();await expect(page.locator('#hl-documents')).toBeVisible();
});
