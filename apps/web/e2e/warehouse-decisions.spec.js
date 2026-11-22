import { test, expect } from '@playwright/test';

test('staff opens warehouse decisions from the profile, reviews the actual count and clears it on logout', async ({page}) => {
  const requests=[];
  const response=(route,data)=>route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  await page.route('**/api/v1/**',r=>response(r,[]));
  await page.route(/\/api\/v1\/me$/,r=>response(r,{id:'fixture-staff',status:'ACTIVE',person:{firstName:'Test',lastName:'Staff'},roleAssignments:[{role:'STAFF',status:'ACTIVE'}]}));
  await page.route('**/warehouse/workspace',r=>response(r,{organizationId:'fixture',inventory:true,custody:[],receipts:[],requests:[
    {id:'COUNT-1',kind:'COUNT',digest:'a'.repeat(64),details:{lotId:'receipt-1',expected:12,counted:9,reason:'<private fixture>'},review:requests.length===0}
  ]}));
  await page.route('**/warehouse/requests/COUNT-1/review',route=>{requests.push(route.request().postDataJSON());return response(route,{});});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.HydrolandAuth && window.HydrolandProfile);
  await page.evaluate(async()=>{
    window.HydrolandAuth.acceptSession({accessToken:'warehouse-fixture',refreshToken:'warehouse-refresh'},window.HydrolandAuth.beginAuthAttempt());
    await window.HydrolandProfile.load();
  });
  await page.locator('#profile-open').click();
  await page.getByRole('button',{name:'المستودع والعهد',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'المستودع والعهد'});
  await dialog.locator('summary').filter({hasText:'COUNT-1'}).click();
  await expect(dialog).toContainText('فرق الجرد · -3');
  await expect(dialog).toContainText('<private fixture>');
  await dialog.getByRole('button',{name:'مراجعة',exact:true}).click();
  await expect(dialog.getByRole('status')).toContainText('تم الحفظ');
  expect(requests).toEqual([{digest:'a'.repeat(64)}]);
  await page.evaluate(()=>document.dispatchEvent(new Event('hydroland:session-cleared')));
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('<private fixture>',{exact:false})).toHaveCount(0);
});

test('executive reads procurement grounds before signing the final decision', async ({page}) => {
  const posted=[];
  const response=(r,data)=>r.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  await page.route('**/api/v1/**',r=>response(r,[]));
  await page.route(/\/api\/v1\/me$/,r=>response(r,{id:'owner-test',status:'ACTIVE',person:{firstName:'Owner',lastName:'Test'},roleAssignments:[{role:'ADMIN',status:'ACTIVE'}]}));
  await page.route('**/warehouse/workspace',r=>response(r,{organizationId:'fixture',executive:true,inventory:false,custody:[],receipts:[],requests:[{
    id:'PO-test',kind:'PURCHASE',digest:'a'.repeat(64),finalDigest:'b'.repeat(64),details:{quantity:12},reviewedAt:'2026-11-22T00:00:00Z',
    recommendedAt:'2026-11-22T00:01:00Z',recommendation:'DECLINE',recommendationNote:'الكمية تتجاوز الاحتياج',finalize:!posted.length
  }]}));
  await page.route('**/warehouse/requests/PO-test/finalize',r=>{posted.push(r.request().postDataJSON());return response(r,{});});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.HydrolandAuth && window.HydrolandProfile);
  await page.evaluate(async()=>{
    window.HydrolandAuth.acceptSession({accessToken:'warehouse-executive',refreshToken:'warehouse-refresh'},window.HydrolandAuth.beginAuthAttempt());
    await window.HydrolandProfile.load();
  });
  await page.locator('#profile-open').click();
  await page.getByRole('button',{name:'المستودع والعهد',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'المستودع والعهد'});
  await dialog.locator('summary').filter({hasText:'PO-test'}).click();
  await expect(dialog).toContainText('الكمية تتجاوز الاحتياج');
  await dialog.getByLabel('قرار الإدارة العليا').selectOption('DECLINE');
  await dialog.getByLabel('مسوغات القرار').fill('اعتماد توصية المشتريات بالرفض');
  await dialog.getByRole('button',{name:'تسجيل القرار'}).click();
  await expect(dialog.getByRole('status')).toContainText('تم الحفظ');
  expect(posted).toEqual([{digest:'b'.repeat(64),decision:'DECLINE',note:'اعتماد توصية المشتريات بالرفض'}]);
});
