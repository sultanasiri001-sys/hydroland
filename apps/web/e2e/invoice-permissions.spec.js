import {test, expect} from '@playwright/test';
import fixturePdf from './fixtures/license-text-pdf.json';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';

test('a center requests invoicing and the platform reviews the requested change', async ({page}) => {
  const center = {id:'test-center', displayName:'مركز الاختبار', kind:'DIVE_CENTER', status:'ACTIVE'};
  const membership = {organization:center, role:'OWNER', status:'ACTIVE'};
  const profile = {id:'fixture', email:'fixture@example.invalid', status:'ACTIVE',
    roleAssignments:['DIVE_CENTER','ADMIN'].map(role => ({id:role, role, status:'ACTIVE'})),
    person:{firstName:'مشرف', lastName:'الاختبار', professional:null}};
  const targets = [
    {kind:'INSTRUCTOR', targetId:'test-center', targetName:center.displayName, enabled:false, pending:false},
    {kind:'MARINE_OPERATOR', targetId:'test-center', targetName:center.displayName, enabled:true, pending:false},
  ];
  const requests = [];
  const json = (route, body, status = 200) => route.fulfill({status, json:body});
  await page.route('**/api/v1/**', route => json(route, []));
  await page.route('**/api/v1/me', route => json(route, profile));
  await page.route('**/api/v1/me/diver-profile', route => json(route, {profile:null, equipment:[]}));
  await page.route('**/api/v1/organizations/mine', route => json(route, [membership]));
  await page.route('**/api/v1/invoice-permissions/**', route => {
    const path = new URL(route.request().url()).pathname.split('/invoice-permissions/')[1];
    if (path === 'centers') return json(route, [center]);
    if (path === 'centers/test-center') return json(route, {targets, requests});
    if (path === 'review') return json(route, requests.filter(row => row.status === 'PENDING'));
    const body = route.request().postDataJSON();
    if (path === 'centers/test-center/requests') {
      const target = targets.find(item => item.kind === body.kind && item.targetId === body.targetId);
      target.pending = true;
      requests.push({...body, id:body.requestId, targetName:target.targetName, centerName:center.displayName,
        requestedAt:new Date().toISOString(), status:'PENDING'});
      return json(route, requests.at(-1), 201);
    }
    const row = requests.find(item => path === 'review/' + item.id);
    if (!row) return json(route, {}, 404);
    row.status = body.decision;
    row.decisionNote = body.note;
    const target = targets.find(item => item.kind === row.kind && item.targetId === row.targetId);
    target.pending = false;
    if (row.status === 'APPROVED') target.enabled = row.enable;
    return json(route, row, 201);
  });
  await page.goto('/', {waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => window.HydrolandPortalFreshness && window.HydrolandProfile && window.HydrolandWorkspaceUI);
  await page.evaluate(async () => {
    sessionStorage.setItem('hl-access-token','invoice-permissions-test');
    sessionStorage.setItem('hl-refresh-token','invoice-permissions-refresh');
    window.HydrolandAuth.syncAuthUi();
    document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));
    await window.HydrolandProfile.load();
  });
  const dialog = page.locator('#hl-invoice-permissions');
  async function open(role) {
    await openWorkspaceSwitcher(page);
    await page.locator('#role-dialog [data-role="' + role + '"]').click();
    const dashboard = page.locator('.hl-role-dashboard[data-role="' + role + '"]');
    await expect(dashboard).toBeVisible();
    const trigger = dashboard.locator('[data-invoice-permissions]');
    if (!await trigger.isVisible()) await dashboard.locator('[data-portal-menu]').click();
    await trigger.click();
    await expect(dialog).toBeVisible();
  }
  await open('center');
  await dialog.getByLabel('سبب الطلب').fill('اعتماد فواتير خدمات التدريب');
  await dialog.getByRole('button', {name:'طلب فتح الفوترة'}).click();
  await expect(dialog.getByRole('status')).toHaveText('وصل الطلب إلى الإدارة العليا.');
  await expect(dialog.getByRole('button', {name:'طلب فتح الفوترة'})).toHaveCount(0);
  await dialog.getByLabel('نوع الخدمة').selectOption('MARINE_OPERATOR');
  await dialog.getByLabel('سبب الطلب').fill('مراجعة بيانات المشغّل');
  await dialog.getByRole('button', {name:'طلب إيقاف الفوترة'}).click();
  await expect(dialog.locator('article')).toHaveCount(2);
  expect(requests.map(({targetId, enable}) => ({targetId, enable}))).toEqual([
    {targetId:'test-center',enable:true}, {targetId:'test-center',enable:false},
  ]);
  await dialog.getByRole('button', {name:'إغلاق'}).click();
  await open('admin');
  const trainer = dialog.locator('article').filter({hasText:'اعتماد فواتير خدمات التدريب'});
  await trainer.getByRole('button', {name:'اعتماد'}).click();
  await expect(trainer).toHaveCount(0);
  const marine = dialog.locator('article').filter({hasText:'مراجعة بيانات المشغّل'});
  await marine.getByRole('button', {name:'رفض'}).click();
  await expect(dialog.getByRole('status')).toHaveText('أدخل سبب الرفض.');
  await marine.getByLabel('ملاحظة القرار').fill('الرخصة سارية');
  await marine.getByRole('button', {name:'رفض'}).click();
  await expect(dialog).toContainText('لا توجد طلبات قيد المراجعة.');
  await dialog.getByRole('button', {name:'إغلاق'}).click();
  await open('center');
  await expect(dialog).toContainText('الفوترة مفتوحة');
  await expect(dialog.locator('article').filter({hasText:'مراجعة بيانات المشغّل'})).toContainText('الرخصة سارية');
});

test('the center opens the stored original PDF for printing', async ({page})=>{
  const original=Buffer.from(fixturePdf.base64, 'base64');
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#hl-invoices-dialog',{state:'attached'});
  await page.route('**/account/invoices?*',route=>route.fulfill({json:{items:[{
    sourceType:'TRAINING_ENROLLMENT',sourceId:'course-42',amountMinor:5000,currency:'SAR',occurredAt:new Date().toISOString(),
    sellerName:'مركز الاختبار',isSale:true,canPrint:true,hasDocument:true,number:'CTR-42'
  }],nextOffset:null}}));
  await page.route('**/account/invoices/TRAINING_ENROLLMENT/course-42/document',route=>route.fulfill({contentType:'application/pdf',body:original}));
  await page.evaluate(()=>{
    window.HydrolandAuth={isAuthenticated:()=>true,getSessionVersion:()=>1,authorizedFetch:path=>fetch('/api/v1'+path)};
    window.HydrolandPortalAccess={getCurrentRole:()=>'center'};
    const trigger=document.createElement('button');trigger.dataset.accountInvoices='';document.body.append(trigger);trigger.click();
  });
  const popupPromise=page.waitForEvent('popup');
  await page.getByRole('button',{name:'طباعة فاتورة المركز'}).click();
  const popup=await popupPromise;
  await expect(popup).toHaveTitle('مركز الاختبار · CTR-42');
  await expect(popup.locator('iframe')).toBeAttached();
  const bytes=await popup.locator('iframe').evaluate(async frame=>Array.from(new Uint8Array(await (await fetch(frame.src)).arrayBuffer())));
  expect(Buffer.from(bytes)).toEqual(original);
  await expect(popup.getByRole('button',{name:'طباعة فاتورة المركز'})).toBeVisible();
});
