import {test,expect} from '@playwright/test';

test('public search respects live motion preference and keeps focus behavior',async({page})=>{
  await page.route('**/api/v1/**',route=>route.fulfill({contentType:'application/json',body:'[]'}));
  await page.goto('/');await page.waitForFunction(()=>Boolean(window.HydrolandPublicUI));
  await page.evaluate(()=>{
    window.motionCalls=[];
    const original=Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView=function(options){window.motionCalls.push({id:this.id,behavior:options?.behavior,block:options?.block});return original.call(this,options)};
    document.querySelector('#search-form input').id='motion-search-input';
  });
  for(const [reducedMotion,behavior] of [['reduce','instant'],['no-preference','smooth'],['reduce','instant']]){
    await page.emulateMedia({reducedMotion});await page.locator('#top-search').click();
    await expect.poll(()=>page.evaluate(()=>window.motionCalls.filter(item=>item.id==='motion-search-input').at(-1)?.behavior)).toBe(behavior);
    await expect(page.locator('#search-form input')).toBeFocused();
  }
});

test('search result and fallback route use non-animated motion when reduced',async({page})=>{
  await page.route('**/api/v1/**',route=>route.fulfill({contentType:'application/json',body:'[]'}));
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.waitForFunction(()=>Boolean(window.HydrolandPublicUI));
  await page.evaluate(()=>{
    const candidate=document.createElement('article');candidate.className='trip-card';candidate.id='motion-fixture';candidate.textContent='motion coral fixture';document.getElementById('main').appendChild(candidate);
    window.fixtureMotionCalls=[];candidate.scrollIntoView=options=>window.fixtureMotionCalls.push(options);
    const form=document.getElementById('search-form');form.querySelector('input').value='motion coral fixture';form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    location.hash='motion-fixture';
  });
  await expect.poll(()=>page.evaluate(()=>window.fixtureMotionCalls.length)).toBe(2);
  const result=await page.evaluate(()=>({calls:window.fixtureMotionCalls,hash:location.hash}));
  expect(result).toEqual({calls:[{behavior:'instant',block:'center'},{behavior:'instant',block:'start'}],hash:'#motion-fixture'});
});
