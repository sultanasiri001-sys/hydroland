import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
test.beforeEach(async({page})=>{await page.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort())});
const configured=()=>({engine:'MAPLIBRE',engineVersion:'6.11.2',status:'SANDBOX',provider:'Synthetic layer',enabled:true,styleUrl:'https://maps.example.invalid/style.json',attribution:'Synthetic <source> & literal',allowedOrigins:['https://maps.example.invalid'],validUntil:new Date(Date.now()+3600000).toISOString(),maxResourcesPerView:2,purpose:'INFORMATION_ONLY',automaticSafetyPermission:false,providerVerified:false});
async function mapFixture(page,config){
  await page.addInitScript(()=>{class Map{constructor(options){window.__providerMapOptions=options;window.__providerMapCreates=(window.__providerMapCreates||0)+1}on(){}remove(){window.__providerMapRemoved=true}addControl(){}fitBounds(){}resize(){}}class Marker{setLngLat(){return this}setPopup(){return this}addTo(){return this}}class Popup{setDOMContent(){return this}}window.HydrolandMapLibreTestDouble={Map,Marker,Popup}});
  await page.route(/\/api\/v1\//,route=>{const path=new URL(route.request().url()).pathname;if(path.endsWith('/integrations/maps/public-config'))return json(route,config);if(path.endsWith('/integrations/weather/public-config'))return json(route,{configured:true,status:'SANDBOX',provider:'STORMGLASS',providerVerified:false});return json(route,[])});
  await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.HydrolandMap?.getState().config);
  await page.locator('[data-hl-map-open]').click();return page.locator('#hl-map-dialog');
}
test('missing source keeps the actual map entry useful and makes no official connection claim',async({page})=>{
  const dialog=await mapFixture(page,{enabled:false,status:'SANDBOX',reason:'SOURCE_APPROVAL_REQUIRED',styleUrl:null});
  await expect(dialog.locator('.hl-map-overview-pin')).toHaveCount(8);
  await expect(dialog.locator('[data-hl-map-source]')).toContainText('المصدر غير معتمد أو غير متاح');
  await expect(dialog).toContainText('ليس أداة ملاحة أو تصريح سلامة');
  expect(await page.evaluate(()=>window.__providerMapCreates||0)).toBe(0);
  await expect(page.locator('.marine-signal')).not.toContainText('Stormglass · متصل');
  await page.evaluate(()=>window.HydrolandI18n.setLocale('en'));
  await expect(dialog.locator('[data-hl-map-source]')).toContainText('Source approval unavailable');
  await expect(dialog).toContainText('not a navigation aid or safety clearance');
});
test('approved public scope preserves literal attribution and denies credential-bearing or unrelated resources',async({page})=>{
  const dialog=await mapFixture(page,configured());
  await expect.poll(()=>page.evaluate(()=>window.__providerMapCreates||0)).toBe(1);
  await expect(dialog.locator('[data-hl-map-source]')).toContainText('Synthetic <source> & literal');
  expect(await dialog.locator('[data-hl-map-source] source').count()).toBe(0);
  const allowed=await page.evaluate(()=>window.__providerMapOptions.transformRequest('https://maps.example.invalid/tile/1/2/3.pbf'));
  expect(allowed).toEqual({url:'https://maps.example.invalid/tile/1/2/3.pbf',credentials:'omit'});
  const blocked=await page.evaluate(()=>{try{window.__providerMapOptions.transformRequest('https://maps.example.invalid@attacker.invalid/tiles');return false}catch{return true}});
  expect(blocked).toBe(true);await expect(dialog.locator('.hl-map-overview')).toBeVisible();
  expect(await page.evaluate(()=>window.__providerMapRemoved)).toBe(true);
});
test('map resource ceiling stops further requests and retains local geography',async({page})=>{
  const dialog=await mapFixture(page,configured());await page.waitForFunction(()=>window.__providerMapOptions);
  const result=await page.evaluate(()=>{const request=window.__providerMapOptions.transformRequest;request('https://maps.example.invalid/one');request('https://maps.example.invalid/two');try{request('https://maps.example.invalid/three');return false}catch{return true}});
  expect(result).toBe(true);await expect(dialog.locator('.hl-map-overview-pin')).toHaveCount(8);
  await expect(dialog).toContainText('عرض جغرافي محلي');
});
test('expiry blocks an already open map before its next external request',async({page})=>{
  const dialog=await mapFixture(page,configured());await page.waitForFunction(()=>window.__providerMapOptions);
  const result=await page.evaluate(()=>{window.HydrolandMap.getState().config.validUntil=new Date(Date.now()-1).toISOString();try{window.__providerMapOptions.transformRequest('https://maps.example.invalid/next');return false}catch{return true}});
  expect(result).toBe(true);await expect(dialog.locator('.hl-map-overview')).toBeVisible();await expect(dialog.locator('[data-hl-map-source]')).toContainText('انتهت صلاحية المصدر');
});
test('a legacy enabled flag without native source metadata cannot start a layer',async({page})=>{
  const dialog=await mapFixture(page,{enabled:true,status:'PRODUCTION_ENABLED',provider:'Legacy fixture',styleUrl:'https://maps.example.invalid/style.json'});
  await expect(dialog.locator('.hl-map-overview')).toBeVisible();expect(await page.evaluate(()=>window.__providerMapCreates||0)).toBe(0);
});
test('weather admin shows source expiry and localized quota failure without allowing stale approval',async({page})=>{
  const profile={id:'d03-admin-fixture',email:'d03@example.invalid',status:'ACTIVE',roleAssignments:[{role:'ADMIN',status:'ACTIVE'}],person:{firstName:'Synthetic',lastName:'Admin',professional:null}};
  const now=new Date().toISOString();let refreshes=0,decisions=0;
  await page.route(/\/api\/v1\//,route=>{
    const path=new URL(route.request().url()).pathname.replace(/^.*\/api\/v1/,''),method=route.request().method();
    if(path==='/me')return json(route,profile);if(path==='/me/diver-profile')return json(route,{profile:null,equipment:[]});
    if(path==='/integrations/maps/public-config')return json(route,{enabled:false});
    if(path==='/integrations/weather/public-config')return json(route,{configured:false,reason:'SOURCE_EXPIRED',validUntil:now,attribution:'Synthetic weather source'});
    if(path==='/trips/admin/weather-gate')return json(route,{enabled:true,mode:'ENFORCE',provider:'STORMGLASS'});
    if(path==='/trips/admin')return json(route,[{id:'d03-trip',title:'Synthetic source-bound trip',startsAt:now,location:{locationName:'Synthetic',latitude:0,longitude:0},weatherReview:{status:'PENDING',storedStatus:'APPROVED',requiresRefresh:true,decisionToken:null,forecastAt:now,fetchedAt:now,snapshot:{windSpeedKph:0,provenance:{attribution:'Synthetic weather source',validUntil:now,maxDataAgeSeconds:300}}}}]);
    if(path.endsWith('/refresh')&&method==='POST'){refreshes++;return json(route,{code:'PROVIDER_READ_UNAVAILABLE',reason:'PROVIDER_COST_LIMIT',message:'Internal provider-secret must not appear'},503)}
    if(path.endsWith('/decision')){decisions++;return json(route,{},409)}return json(route,[]);
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandPortalAccess);
  await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','d03-synthetic-access');sessionStorage.setItem('hl-refresh-token','d03-synthetic-refresh');window.HydrolandAuth.syncAuthUi();document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));await window.HydrolandProfile.load()});
  await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="admin"]').click();await page.locator('.hl-role-dashboard [data-action-label="الطقس وحالة البحر"]').click();
  const panel=page.locator('.hl-weather-admin');await expect(panel).toBeVisible();await expect(panel.locator('[data-weather-source]')).toContainText('انتهت صلاحية المصدر');
  await expect(panel.locator('[data-weather-approve]')).toBeDisabled();await expect(panel).toContainText('300 ثانية');
  await page.evaluate(()=>window.HydrolandI18n.setLocale('en'));await panel.locator('[data-weather-refresh]').click();
  await expect(panel.locator('[data-weather-state]')).toContainText('usage or cost limit');await expect(panel).not.toContainText('provider-secret');expect(refreshes).toBe(1);expect(decisions).toBe(0);
});
