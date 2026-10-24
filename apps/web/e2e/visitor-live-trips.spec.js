import {test,expect} from '@playwright/test';

const json=(route,body)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});

test('visitor sees an honest empty state and can still open the live map when no trips are published',async({page})=>{
  await page.route(/\/api\/v1\/trips$/,route=>json(route,[]));
  await page.route(/\/api\/v1\/integrations\/maps\/public-config$/,route=>json(route,{engine:'MAPLIBRE',status:'CONFIGURED',provider:'MAPS_GEO',enabled:false}));
  await page.route(/\/api\/v1\/integrations\/weather\/public-config$/,route=>json(route,{status:'NOT_SELECTED',configured:false}));

  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandBookings&&window.HydrolandMap));
  await expect(page.locator('.hl-login')).toBeHidden();

  const grid=page.locator('[data-public-trip-grid]');
  await expect(grid.locator('[data-public-trip-state]')).toContainText('لا توجد رحلات منشورة');
  await expect(grid.locator('[data-public-trip]')).toHaveCount(0);
  await expect(grid.locator('.hl-map-preview-pin:not(.hl-map-planned)')).toHaveCount(0);
  await expect(page.locator('.hl-public-weather-metrics b')).toHaveText(['—','—','—']);
  await expect(grid).not.toContainText('رحلة جزيرة سمر');
  await expect(grid).not.toContainText('غوص موقع عمق');
  await expect(grid.locator('.map-card [data-hl-map-open]')).toBeEnabled();
  await expect(grid.locator('.map-card [data-hl-map-card-provider]')).toHaveText('الخريطة التفاعلية غير مفعّلة');

  await grid.locator('.map-card [data-hl-map-open]').click();
  await expect(page.locator('#hl-map-dialog')).toBeVisible();
  await expect(page.locator('#hl-map-dialog')).toContainText('مركز مخطط');
  await expect(page.locator('#hl-map-dialog [data-hl-map-provider]')).toHaveText('الخريطة التفاعلية غير مفعّلة');
});
