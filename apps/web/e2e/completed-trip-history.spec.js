import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';

for(const [role,assignment,people] of [['boat','BOAT_OWNER','عدد مشاركات الركاب المسجّلة'],['instructor','INSTRUCTOR','عدد الطلاب الذين درّبتهم']]){
  test(role+' home lists completed trips with its own people metric',async({page})=>{
    const json=(route,value)=>route.fulfill({json:value});
    await page.route('**/api/v1/**',route=>json(route,[]));
    await page.route('**/api/v1/me',route=>json(route,{id:'fixture',status:'ACTIVE',person:{firstName:'Test',lastName:'Member'},roleAssignments:[{role:assignment,status:'ACTIVE'}]}));
    await page.route('**/api/v1/trips/completed/mine?*',route=>{
      const q=new URL(route.request().url()).searchParams;
      expect(q.get('role')).toBe(role);
      return json(route,{tripCount:21,peopleCount:8,pageSize:20,items:[{title:q.get('page')==='1'?'رحلة أولى':'رحلة سابقة',startsAt:'2026-11-01T10:00:00Z',peopleCount:3}]});
    });
    await page.goto('/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.HydrolandAuth && window.HydrolandProfile);
    await page.evaluate(async()=>{
      window.HydrolandAuth.acceptSession({accessToken:'history-fixture',refreshToken:'fixture'},window.HydrolandAuth.beginAuthAttempt());
      await window.HydrolandProfile.load();
    });
    await openWorkspaceSwitcher(page);
    await page.locator('#role-dialog [data-role="'+role+'"]').click();
    const section=page.locator('[data-role="'+role+'"] [data-completed-trips]');
    await expect(section).toContainText('عدد الرحلات المنفّذة');
    await expect(section).toContainText(people);
    await expect(section).toContainText('رحلة أولى');
    await section.getByRole('button',{name:'التالي'}).click();
    await expect(section).toContainText('رحلة سابقة');
  });
}
