import { test, expect } from '@playwright/test';

test('map card becomes actionable before provider requests resolve',async({page})=>{
  let releaseProviderRequests;
  const providerGate=new Promise(resolve=>{releaseProviderRequests=resolve});

  await page.route(/\/api\/v1\/integrations\/maps\/public-config$/,async route=>{
    await providerGate;
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({engine:'MAPLIBRE',engineVersion:'6.11.2',status:'SANDBOX',provider:'E2E_MAPS',enabled:true,styleUrl:'https://maps.hydroland.test/style.json',attribution:'E2E'})});
  });
  await page.route(/\/api\/v1\/trips$/,async route=>{
    await providerGate;
    await route.fulfill({status:200,contentType:'application/json',body:'[]'});
  });
  await page.route(/\/api\/v1\/integrations\/weather\/public-config$/,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'NOT_SELECTED',configured:false})}));

  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandMap));

  const mapCard=page.locator('.map-card');
  await expect(mapCard.locator('[data-hl-map-open]')).toBeVisible();
  await expect(mapCard.locator('[data-hl-map-open]')).toBeEnabled();
  await expect(mapCard).not.toContainText('الخريطة · قيد الربط');
  expect(await page.evaluate(()=>window.HydrolandMap.getState().config)).toBeNull();

  releaseProviderRequests();
  await expect(mapCard.locator('[data-hl-map-card-provider]')).toContainText('E2E_MAPS');
});
