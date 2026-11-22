import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';

for (const [role,assignment] of [['instructor','INSTRUCTOR'],['boat','BOAT_OWNER']]) {
  test(role+' can save private contact and emergency details without replacing the bank account',async({page})=>{
    const saved={phone:'0500000001',contactEmail:'fixture@example.invalid',emergencyPhone:'',emergencyName:'',holder:'Fixture',lastFour:'1234',revision:'first'};
    const writes=[];
    await page.route('**/api/v1/**',route=>route.fulfill({json:[]}));
    await page.route('**/api/v1/me',route=>route.fulfill({json:{id:'fixture',status:'ACTIVE',person:{firstName:'Test',lastName:'Member'},roleAssignments:[{role:assignment,status:'ACTIVE'}]}}));
    await page.route('**/api/v1/me/provider-contact',route=>{
      if(route.request().method()==='PATCH'){
        const body=route.request().postDataJSON();writes.push(body);Object.assign(saved,body,{revision:'next'});
      }
      return route.fulfill({json:saved});
    });
    await page.goto('/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.HydrolandProviderContact&&window.HydrolandProfile);
    await page.evaluate(async()=>{
      window.HydrolandAuth.acceptSession({accessToken:'contact-fixture',refreshToken:'fixture'},window.HydrolandAuth.beginAuthAttempt());
      await window.HydrolandProfile.load();
    });
    await openWorkspaceSwitcher(page);
    await page.locator('#role-dialog [data-role="'+role+'"]').click();
    await page.locator('[data-provider-contact]').click();
    const dialog=page.locator('#hl-provider-contact');
    await expect(dialog.getByLabel('رقم الجوال')).toHaveValue(saved.phone);
    await expect(dialog.getByLabel('بريد التواصل')).toHaveValue(saved.contactEmail);
    await expect(dialog).toContainText('1234');
    await dialog.getByLabel('هاتف الطوارئ').fill('0500000002');
    await dialog.getByRole('button',{name:'حفظ',exact:true}).click();
    await expect(dialog).toContainText('تم حفظ البيانات.');
    expect(writes).toEqual([{revision:'first',emergencyPhone:'0500000002'}]);
    await dialog.getByRole('button',{name:'تغيير الحساب البنكي'}).click();
    await expect(dialog.getByLabel('الآيبان السعودي')).toHaveValue('');
    await dialog.getByRole('button',{name:'إغلاق',exact:true}).click();
    await page.evaluate(()=>document.querySelector('#profile-dialog').showModal());
    await page.locator('[data-provider-profile]').click();
    await expect(dialog.getByLabel('هاتف الطوارئ')).toHaveValue('0500000002');
    await page.evaluate(()=>document.dispatchEvent(new CustomEvent('hydroland:session-cleared')));
    await expect(dialog).toHaveCount(0);
  });
}
