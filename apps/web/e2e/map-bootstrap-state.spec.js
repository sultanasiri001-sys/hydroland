import { test, expect } from '@playwright/test';

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const externalRequests=new WeakMap();
test.beforeEach(async({page})=>{
  const blocked=[];externalRequests.set(page,blocked);
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.pathname.startsWith('/api/v1/'))return json(route,{message:'No isolated fixture for this route'},404);
    if(['127.0.0.1','localhost'].includes(url.hostname))return route.continue();
    blocked.push(url.hostname);return route.abort();
  });
});

const assessment=kind=>({
  configuration:{configured:true,status:'SANDBOX'},
  providerObservation:{status:'NOT_OBSERVED',checkedAt:null,scope:'CURRENT_PROCESS',reasonCode:null},
  dataFreshness:kind==='weather'?{status:'TRIP_REVIEW_REQUIRED',reasonCodes:['TRIP_CONTEXT_AND_HUMAN_REVIEW_REQUIRED']}:{status:'NOT_ASSESSED',reasonCodes:['MAP_SOURCE_FRESHNESS_NOT_VERIFIED']},
  license:{status:'NOT_VERIFIED',reference:null},usagePlan:{status:'NOT_VERIFIED',reference:null,unitCost:null,budgetLimit:null},
  providerAcceptance:{status:'NOT_VERIFIED',verifiedAt:null},navigationGranted:false,operationalAcceptance:false
});
const mapConfig=()=>({engine:'MAPLIBRE',engineVersion:'6.11.2',status:'SANDBOX',provider:'ISOLATED_MAP_SOURCE',enabled:true,styleUrl:'https://maps.hydroland.test/style.json',attribution:'Synthetic map attribution · مصدر اصطناعي للاختبار',...assessment('map')});
const weatherConfig=()=>({status:'SANDBOX',provider:'STORMGLASS',configured:true,sandbox:true,...assessment('weather'),providerObservation:{status:'RESPONSE_RECEIVED',checkedAt:'2026-11-27T04:00:00.000Z',scope:'CURRENT_PROCESS',reasonCode:null}});
const fakeMap=async page=>page.addInitScript(()=>{
  class Map{constructor(options){this.options=options;this.events={};window.__isolatedMaps.push(this)}on(name,handler){this.events[name]=handler;return this}addControl(){}fitBounds(){}flyTo(){}resize(){}remove(){this.removed=true}isStyleLoaded(){return true}}
  class Marker{setLngLat(){return this}setPopup(){return this}addTo(){return this}}
  class Popup{setDOMContent(){return this}}
  class Bounds{extend(){return this}}
  window.__isolatedMaps=[];
  window.HydrolandMapLibreTestDouble={Map,Marker,Popup,LngLatBounds:Bounds,NavigationControl:class{}};
});
async function installSources(page,state={map:mapConfig(),weather:weatherConfig()}){
  await fakeMap(page);
  await page.route(/\/api\/v1\/integrations\/maps\/public-config$/,route=>json(route,state.map));
  await page.route(/\/api\/v1\/integrations\/weather\/public-config$/,route=>json(route,state.weather));
  await page.route(/\/api\/v1\/trips$/,route=>json(route,[]));
  return state;
}

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
  await expect(dialog.locator('.hl-map-callout')).toHaveCount(8);
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
  await expect(dialog.locator('.hl-map-callout').first()).toBeHidden();
  const focused=await dialog.locator('.hl-map-overview-pin').filter({hasText:'عمق'}).evaluate(pin=>{const point=new DOMPoint(0,0).matrixTransform(pin.getScreenCTM()),rect=pin.closest('svg').getBoundingClientRect();return point.x>=rect.left&&point.x<=rect.right&&point.y>=rect.top&&point.y<=rect.bottom});
  expect(focused).toBe(true);
  await dialog.locator('.hl-map-overview-pin').first().focus();
  await page.keyboard.press('Enter');
  await expect(dialog.locator('.hl-map-selection')).toContainText('جازان');
  await dialog.locator('[data-map-zoom="reset"]').click();
  await expect(dialog.locator('.hl-map-selection')).toBeHidden();
  const canvasBox=await dialog.locator('[data-hl-map-canvas]').boundingBox();
  const dialogBox=await dialog.boundingBox();
  expect(canvasBox.height).toBeLessThan(610);
  expect(canvasBox.y+canvasBox.height).toBeLessThanOrEqual(dialogBox.y+dialogBox.height+1);
  await page.screenshot({path:testInfo.outputPath('public-saudi-map-desktop.png')});
  await page.setViewportSize({width:390,height:844});
  await expect(dialog.locator('[data-map-zoom="reset"]')).toBeVisible();
  await expect(dialog.locator('[data-hl-map-close]')).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('public-saudi-map-mobile.png')});
});

for(const locale of ['ar','en'])test(`configured map and observed weather remain unverified with source boundaries in ${locale}`,async({page},testInfo)=>{
  await installSources(page);
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.HydrolandMap?.getState().config?.provider==='ISOLATED_MAP_SOURCE');
  if(locale==='en')await page.evaluate(()=>window.HydrolandI18n.setLocale('en'));
  const badge=page.locator('[data-hl-map-card-provider]'),weatherRow=page.locator('[data-hl-marine-weather]');
  await expect(badge).toContainText(locale==='en'?'Map configured':'الخريطة معدّة');
  await expect(badge).not.toContainText(/متصل|connected/i);
  await expect(page.locator('.hl-map-provider')).not.toHaveClass(/ready/);
  await expect(weatherRow.locator('small')).toContainText(locale==='en'?'Configured, awaiting verification':'معدّ، بانتظار التحقق');
  await expect(weatherRow.locator('small')).not.toContainText(/متصل|connected/i);
  const weather=page.locator('[data-hl-weather-source-details]');await weather.locator('summary').click();
  await expect(weather.locator('[data-source-fact="observation"]')).toContainText(locale==='en'?'Response observed':'رُصدت استجابة');
  await expect(weather.locator('[data-source-fact="freshness"]')).toContainText(locale==='en'?'Trip-specific weather review required':'تلزم مراجعة الطقس في سياق الرحلة');
  await expect(weather.locator('[data-source-fact="checkedAt"]')).not.toContainText('T04:00');
  await expect(weather.locator('[data-source-fact="providerAcceptance"]')).toHaveText(locale==='en'?'Not verified':'غير متحقق');
  await weather.locator('summary').click();
  await page.locator('[data-hl-map-open]').click();
  const dialog=page.locator('#hl-map-dialog'),source=dialog.locator('[data-hl-map-source]');
  await dialog.locator('[data-hl-map-source-details] summary').click();
  await expect(dialog.locator('[data-hl-map-boundary]')).toHaveText(locale==='en'?'Informational map; not a navigation reference or safety authorization.':'خريطة معلوماتية؛ ليست مرجعًا للملاحة أو تصريحًا للسلامة.');
  await expect(source.locator('[data-source-fact="observation"]')).toHaveText(locale==='en'?'No response observed':'لم تُرصد استجابة');
  await expect(source.locator('[data-source-fact="freshness"]')).toHaveText(locale==='en'?'Not assessed':'غير مقيّمة');
  for(const field of ['license','usagePlan','providerAcceptance'])await expect(source.locator(`[data-source-fact="${field}"]`)).toHaveText(locale==='en'?'Not verified':'غير متحقق');
  await expect(source.locator('[data-source-fact="attribution"]')).toHaveText(mapConfig().attribution);
  await expect(dialog.locator('[data-hl-map-list] article')).toHaveCount(8);
  await expect(dialog.locator('[data-book]')).toHaveCount(0);
  await page.evaluate(()=>window.__isolatedMaps[0].events.load());
  await expect(source.locator('[data-source-fact="layer"]')).toContainText(locale==='en'?'Display layer loaded':'طبقة العرض محمّلة');
  await expect(source.locator('[data-source-fact="observation"]')).toHaveText(locale==='en'?'No response observed':'لم تُرصد استجابة');
  await expect(badge).toContainText(locale==='en'?'Awaiting verification':'بانتظار التحقق');
  if(locale==='ar'){
    await page.evaluate(()=>window.__isolatedMaps[0].events.error());
    await expect(dialog.locator('.hl-map-overview-pin')).toHaveCount(8);
    await page.screenshot({path:testInfo.outputPath('d03-map-source-desktop-ar.png')});
  }
  await page.setViewportSize({width:390,height:844});
  await expect(dialog.locator('[data-hl-map-close]')).toBeVisible();
  expect(await dialog.evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);
  expect(await source.evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);
  await source.locator('[data-source-fact="usagePlan"]').scrollIntoViewIfNeeded();
  if(locale==='ar')await page.screenshot({path:testInfo.outputPath('d03-map-source-mobile-ar.png')});
  expect(externalRequests.get(page).filter(host=>/stormglass|marinetraffic|maps\.hydroland/.test(host))).toEqual([]);
});

test('provider layer failure retains safe attribution and local planned centers without a connected badge',async({page})=>{
  const state=await installSources(page);
  state.map.attribution='<img src=x onerror="window.__attributionExecuted=true"> حقوق المصدر';
  state.map.providerObservation={status:'FAILED',checkedAt:'2026-11-27T04:00:00.000Z',scope:'CURRENT_PROCESS',reasonCode:'PROVIDER_UNAVAILABLE'};
  await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.HydrolandMap?.getState().config?.enabled);
  await page.locator('[data-hl-map-open]').click();
  const dialog=page.locator('#hl-map-dialog');await dialog.locator('[data-hl-map-source-details] summary').click();
  await expect(dialog.locator('[data-source-fact="attribution"]')).toHaveText(state.map.attribution);
  await expect(dialog.locator('[data-source-fact="attribution"] img')).toHaveCount(0);
  expect(await page.evaluate(()=>window.__attributionExecuted)).toBeUndefined();
  await page.evaluate(()=>window.__isolatedMaps[0].events.error());
  await expect(dialog.locator('.hl-map-overview-pin')).toHaveCount(8);
  await expect(dialog.locator('[data-source-fact="layer"]')).toHaveText('تعذر تحميل طبقة المزود؛ العرض المحلي متاح');
  await expect(dialog.locator('[data-source-fact="observation"]')).toHaveText('فشل آخر طلب مرصود');
  await expect(page.locator('[data-hl-map-card-provider]')).toContainText('طبقة المزود غير متاحة');
  await expect(page.locator('.hl-map-provider')).not.toHaveClass(/ready/);
  await dialog.locator('[data-hl-map-list] article').first().getByRole('button').click();
  await expect(dialog.locator('.hl-map-selection')).toContainText('مركز مخطط');
  await expect(dialog.locator('[data-book]')).toHaveCount(0);
  await page.evaluate(()=>window.HydrolandI18n.setLocale('en'));
  await expect(dialog.locator('[data-source-fact="layer"]')).toHaveText('Provider layer failed; local view is available');
  await expect(dialog.locator('[data-source-fact="attribution"]')).toHaveText(state.map.attribution);
  expect(externalRequests.get(page).filter(host=>/stormglass|marinetraffic|maps\.hydroland/.test(host))).toEqual([]);
});

test('late map callbacks cannot overwrite a newer source or reopen a closed map',async({page})=>{
  const state=await installSources(page);await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.HydrolandMap?.getState().config?.enabled);
  await page.locator('[data-hl-map-open]').click();const dialog=page.locator('#hl-map-dialog');await dialog.locator('[data-hl-map-source-details] summary').click();
  state.map={...mapConfig(),provider:'NEW_ISOLATED_SOURCE',styleUrl:'https://maps.hydroland.test/new-style.json'};
  await page.evaluate(()=>window.HydrolandMap.reload());
  await expect(dialog.locator('[data-source-fact="provider"]')).toHaveText('NEW_ISOLATED_SOURCE');
  await expect.poll(()=>page.evaluate(()=>window.__isolatedMaps.length)).toBe(2);
  await page.evaluate(()=>{window.__isolatedMaps[0].events.error();window.__isolatedMaps[0].events.load()});
  await expect(dialog.locator('[data-source-fact="layer"]')).toHaveText('جارٍ تحميل طبقة المزود');
  await expect(dialog.locator('.hl-map-overview')).toHaveCount(0);
  await page.evaluate(()=>window.__isolatedMaps[1].events.load());
  await expect(dialog.locator('[data-source-fact="layer"]')).toContainText('طبقة العرض محمّلة');
  await dialog.locator('[data-hl-map-close]').click();await page.evaluate(()=>window.__isolatedMaps[1].events.error());
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('[data-hl-map-card-provider]')).toContainText('NEW_ISOLATED_SOURCE');
  await expect(page.locator('[data-hl-map-card-provider]')).not.toContainText('غير متاحة');
});
