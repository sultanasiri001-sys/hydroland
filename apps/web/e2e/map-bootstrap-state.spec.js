import { test, expect } from '@playwright/test';

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

test('map card becomes actionable before provider requests resolve',async({page})=>{
  await page.route(/\/api\/v1\/integrations\/maps\/public-config$/,async route=>{
    await pause(1500);
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({engine:'MAPLIBRE',engineVersion:'6.11.2',status:'SANDBOX',provider:'E2E_MAPS',enabled:true,styleUrl:'https://maps.hydroland.test/style.json',attribution:'E2E'})});
  });
  await page.route(/\/api\/v1\/trips$/,async route=>{
    await pause(1500);
    await route.fulfill({status:200,contentType:'application/json',body:'[]'});
  });
  await page.route(/\/api\/v1\/integrations\/weather\/public-config$/,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'NOT_SELECTED',configured:false})}));

  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandMap));

  const bootstrap=await page.evaluate(()=>{
    const card=document.querySelector('.map-card');
    const action=card?.querySelector('[data-hl-map-open]');
    return {text:card?.textContent||'',hasAction:Boolean(action),disabled:Boolean(action?.disabled),config:window.HydrolandMap.getState().config};
  });
  expect(bootstrap.hasAction).toBe(true);
  expect(bootstrap.disabled).toBe(false);
  expect(bootstrap.text).not.toContain('الخريطة · قيد الربط');
  expect(bootstrap.config).toBeNull();

  const mapCard=page.locator('.map-card');
  await expect(mapCard.locator('[data-hl-map-card-provider]')).toContainText('E2E_MAPS',{timeout:5000});
});
