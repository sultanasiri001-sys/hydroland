import {test,expect} from '@playwright/test';

const enter=async page=>{
  const writes=[];
  await page.route('**/api/v1/**',route=>{if(route.request().method()!=='GET')writes.push(route.request().url());return route.fulfill({json:[]})});
  await page.goto('/');
  await page.waitForFunction(()=>Boolean(window.HydrolandProfile&&window.HydrolandTraining&&document.querySelector('.hl-certificates')&&document.querySelector('.hl-training')));
  await page.evaluate(()=>{
    window.shortcutMotionCalls=[];
    for(const selector of ['.hl-certificates','.hl-training']){
      const node=document.querySelector(selector);node.scrollIntoView=options=>window.shortcutMotionCalls.push({selector,...options});
    }
    const fixture=document.createElement('div');fixture.id='motion-shortcuts';
    fixture.innerHTML='<button data-hl-action="certs">Certificate motion fixture</button><button data-training-open>Training motion fixture</button>';
    // Stay in shell content flow, outside both the fixed sidebar and selected-service filtering.
    document.querySelector('.topbar').after(fixture);
  });
  return writes;
};

test('certificate shortcut follows live motion preference and keeps guest denial',async({page})=>{
  const writes=await enter(page);
  await page.locator('#motion-shortcuts [data-hl-action="certs"]').click();
  await expect(page.locator('#toast')).toContainText('سجل الدخول أولًا لعرض الشهادات');
  expect(await page.evaluate(()=>window.shortcutMotionCalls)).toEqual([]);
  await page.evaluate(()=>{window.HydrolandAuth.isAuthenticated=()=>true});
  for(const [reducedMotion,behavior] of [['reduce','instant'],['no-preference','smooth'],['reduce','instant']]){
    await page.emulateMedia({reducedMotion});
    await page.locator('#motion-shortcuts [data-hl-action="certs"]').click();
    await expect.poll(()=>page.evaluate(()=>window.shortcutMotionCalls.at(-1))).toEqual({selector:'.hl-certificates',behavior,block:'start'});
  }
  expect(writes).toEqual([]);
});

test('guest training shortcut follows preference without requesting private training',async({page})=>{
  const writes=await enter(page);let trainingRequests=0;
  await page.route('**/api/v1/training/**',route=>{trainingRequests++;return route.fulfill({json:[]})});
  for(const [reducedMotion,behavior] of [['no-preference','smooth'],['reduce','instant'],['no-preference','smooth']]){
    await page.emulateMedia({reducedMotion});await page.locator('#motion-shortcuts [data-training-open]').click();
    await expect.poll(()=>page.evaluate(()=>window.shortcutMotionCalls.at(-1))).toEqual({selector:'.hl-training',behavior,block:'start'});
    await expect(page.locator('.hl-training [data-training-list]')).toContainText('سجل الدخول لعرض بيانات التدريب.');
  }
  expect(trainingRequests).toBe(0);expect(writes).toEqual([]);
});
