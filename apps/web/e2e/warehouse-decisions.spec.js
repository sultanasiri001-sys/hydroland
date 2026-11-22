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
