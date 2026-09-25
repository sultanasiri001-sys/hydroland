import { test, expect } from '@playwright/test';

const installProfileApi=async page=>{
  const profile={id:'map-diver-e2e',email:'map-diver@hydroland.test',status:'ACTIVE',roleAssignments:[],person:{firstName:'Map',lastName:'Diver',phone:null,professional:null}};
  const requireAuth=request=>request.headers().authorization==='Bearer map-e2e-access';
  const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  await page.route(/\/api\/v1\/me$/,route=>requireAuth(route.request())?json(route,profile):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/credentials$/,route=>requireAuth(route.request())?json(route,[]):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>requireAuth(route.request())?json(route,{profile:null,equipment:[]}):json(route,{message:'Unauthorized'},401));
};

test('trip map uses operational coordinates and booking renders location object as text',async({page})=>{
  const startsAt=new Date(Date.now()+48*3600000).toISOString();
  const trips=[{id:'trip-map-e2e',title:'رحلة جزيرة سمر',type:'BOAT_DIVE',startsAt,endsAt:new Date(Date.now()+51*3600000).toISOString(),capacity:8,remainingSeats:8,status:'OPEN',location:{tripId:'trip-map-e2e',locationName:'مرسى القحمة',latitude:18.015432,longitude:41.708765},weather:{reviewStatus:'APPROVED'},safety:{decision:'ALLOWED'}}];
  await page.addInitScript(()=>{
    class FakeMap{constructor(options){window.__hlMapStyle=options.style;window.__hlMapCenter=options.center}addControl(){}fitBounds(){window.__hlMapFitBounds=true}setCenter(center){window.__hlMapCenter=center}setZoom(zoom){window.__hlMapZoom=zoom}flyTo(options){window.__hlMapFlyTo=options}resize(){}remove(){}}
    class FakeMarker{constructor(){this.coords=null}setLngLat(coords){this.coords=coords;return this}setPopup(){return this}addTo(){window.__hlMapMarkers=[...(window.__hlMapMarkers||[]),this.coords];return this}}
    class FakePopup{setDOMContent(){return this}}
    class FakeBounds{extend(){return this}}
    window.HydrolandMapLibreTestDouble={Map:FakeMap,Marker:FakeMarker,Popup:FakePopup,LngLatBounds:FakeBounds,NavigationControl:class{}};
  });
  await installProfileApi(page);
  await page.route(/\/api\/v1\/integrations\/maps\/public-config$/,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({engine:'MAPLIBRE',engineVersion:'6.11.2',status:'SANDBOX',provider:'E2E_MAPS',enabled:true,styleUrl:'https://maps.hydroland.test/style.json',attribution:'E2E'})}));
  await page.route(/\/api\/v1\/trips$/,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(trips)}));

  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandMap&&window.HydrolandAuth&&window.HydrolandProfile));

  const mapCard=page.locator('.map-card');
  await expect(mapCard.locator('[data-hl-map-card-provider]')).toContainText('E2E_MAPS');
  await expect(mapCard.locator('[data-hl-map-count]')).toContainText('1 موقع');
  await mapCard.locator('[data-hl-map-open]').click();
  const mapDialog=page.locator('#hl-map-dialog');await expect(mapDialog).toBeVisible();
  await expect(mapDialog).toContainText('مرسى القحمة');
  await expect.poll(()=>page.evaluate(()=>window.__hlMapStyle)).toBe('https://maps.hydroland.test/style.json');
  await expect.poll(()=>page.evaluate(()=>window.__hlMapMarkers?.length||0)).toBe(1);
  await mapDialog.locator('[data-hl-map-close]').click();

  await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','map-e2e-access');sessionStorage.setItem('hl-refresh-token','map-e2e-refresh');window.HydrolandAuth.syncAuthUi();await window.HydrolandProfile.load()});
  await page.locator('[data-book="رحلة جزيرة سمر"]').click();
  await expect(page.locator('#booking-dialog')).toBeVisible();
  await expect(page.locator('#booking-location')).toHaveText('مرسى القحمة');
  await expect(page.locator('#booking-location')).not.toContainText('[object Object]');
});
