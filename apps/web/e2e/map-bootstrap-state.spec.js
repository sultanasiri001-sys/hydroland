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

test('planned centers remain interactive when map provider fails without becoming bookable trips',async({page},testInfo)=>{
  await page.route(/\/api\/v1\/integrations\/maps\/public-config$/,route=>route.fulfill({status:503,body:'{}'}));
  await page.route(/\/api\/v1\/trips$/,route=>route.fulfill({contentType:'application/json',body:JSON.stringify([{id:'invalid',title:'Invalid location',location:{latitude:null,longitude:null}}])}));
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.HydrolandMap?.getState().config?.status==='UNAVAILABLE');
  await page.locator('[data-hl-map-open]').click();
  const dialog=page.locator('#hl-map-dialog');
  await expect(dialog.locator('.hl-map-overview-pin')).toHaveCount(8);
  await expect(dialog.locator('[data-hl-map-list] article')).toHaveCount(8);
  expect(await page.evaluate(()=>window.HydrolandMap.getState().points)).toEqual([]);
  await expect(dialog).toContainText('مركز مخطط');
  await expect(dialog.locator('[data-book]')).toHaveCount(0);
  const map=dialog.locator('.hl-map-overview>svg');
  await expect(map).toHaveAttribute('viewBox','0 0 300 200');
  await dialog.locator('[data-map-zoom="in"]').click();
  await expect(map).not.toHaveAttribute('viewBox','0 0 300 200');
  await dialog.locator('[data-map-zoom="reset"]').click();
  await expect(map).toHaveAttribute('viewBox','0 0 300 200');
  await dialog.locator('[data-hl-map-list] article').filter({hasText:'عمق'}).getByRole('button').click();
  await expect(dialog.locator('.hl-map-selection')).toContainText('عمق');
  await dialog.locator('.hl-map-overview-pin').first().focus();
  await page.keyboard.press('Enter');
  await expect(dialog.locator('.hl-map-selection')).toContainText('جازان');
  await dialog.locator('[data-map-zoom="reset"]').click();
  await page.screenshot({path:testInfo.outputPath('public-saudi-map-desktop.png')});
  await page.setViewportSize({width:390,height:844});
  await expect(dialog.locator('[data-map-zoom="reset"]')).toBeVisible();
  await expect(dialog.locator('[data-hl-map-close]')).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('public-saudi-map-mobile.png')});
});
