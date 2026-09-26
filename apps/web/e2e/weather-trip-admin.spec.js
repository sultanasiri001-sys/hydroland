import { test, expect } from '@playwright/test';

const installProfileApi=async page=>{
  const profile={id:'admin-weather-e2e',email:'admin-weather@hydroland.test',status:'ACTIVE',roleAssignments:[{id:'role-admin-weather',role:'ADMIN',status:'ACTIVE',activeAt:null,updatedAt:'2026-09-25T00:00:00.000Z'}],person:{firstName:'Admin',lastName:'Weather',phone:null,professional:null}};
  const requireAuth=request=>request.headers().authorization==='Bearer weather-e2e-access';
  const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  await page.route(/\/api\/v1\/me$/,route=>requireAuth(route.request())?json(route,profile):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/credentials$/,route=>requireAuth(route.request())?json(route,[]):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>requireAuth(route.request())?json(route,{profile:null,equipment:[]}):json(route,{message:'Unauthorized'},401));
  return{requireAuth,json};
};

test('admin can create a geolocated trip, refresh Stormglass and approve the forecast review',async({page})=>{
  const api=await installProfileApi(page);
  const startsAt=new Date(Date.now()+48*3600000),endsAt=new Date(startsAt.getTime()+3*3600000);
  const state={trips:[],created:null,locationPatch:null,review:null,decisionBody:null,weatherGate:{enabled:true,mode:'ENFORCE',provider:'STORMGLASS'}};
  const tripView=trip=>({...trip,location:trip.location||null,weatherReview:state.review,operationalClearance:{status:'MISSING'}});

  await page.route(/\/api\/v1\/trips\/admin\/weather-gate$/,async route=>{
    if(!api.requireAuth(route.request()))return api.json(route,{message:'Unauthorized'},401);
    if(route.request().method()==='PATCH'){state.weatherGate={...state.weatherGate,...route.request().postDataJSON()};}
    return api.json(route,state.weatherGate);
  });
  await page.route(/\/api\/v1\/trips\/admin$/,async route=>{
    if(!api.requireAuth(route.request()))return api.json(route,{message:'Unauthorized'},401);
    if(route.request().method()==='GET')return api.json(route,state.trips.map(tripView));
    const body=route.request().postDataJSON();state.created=body;
    const trip={id:'trip-weather-e2e',title:body.title,type:body.type,startsAt:body.startsAt,endsAt:body.endsAt,capacity:body.capacity,status:body.status,location:{tripId:'trip-weather-e2e',locationName:body.locationName,latitude:body.latitude,longitude:body.longitude}};
    state.trips=[trip];return api.json(route,tripView(trip),201);
  });
  await page.route(/\/api\/v1\/trips\/admin\/trip-weather-e2e\/location$/,async route=>{
    if(!api.requireAuth(route.request()))return api.json(route,{message:'Unauthorized'},401);
    const body=route.request().postDataJSON();state.locationPatch=body;state.trips[0].location={tripId:'trip-weather-e2e',...body};state.review=null;return api.json(route,state.trips[0].location);
  });
  await page.route(/\/api\/v1\/trips\/admin\/weather-gate\/trips\/trip-weather-e2e\/refresh$/,async route=>{
    if(!api.requireAuth(route.request()))return api.json(route,{message:'Unauthorized'},401);
    state.review={id:'weather-review-e2e',tripId:'trip-weather-e2e',provider:'STORMGLASS',forecastAt:state.trips[0].startsAt,fetchedAt:new Date().toISOString(),status:'PENDING',snapshot:{provider:'STORMGLASS',observedAt:state.trips[0].startsAt,windSpeedKph:12.6,windGustKph:18,waveHeightM:0.7,wavePeriodS:5.8,swellHeightM:0.4,waterTemperatureC:29.1,decision:'REVIEW_REQUIRED',reason:'Marine forecast supplied by Stormglass; operational approval remains human-reviewed.'}};
    return api.json(route,{trip:state.trips[0],location:state.trips[0].location,review:state.review});
  });
  await page.route(/\/api\/v1\/trips\/admin\/weather-gate\/trips\/trip-weather-e2e\/decision$/,async route=>{
    if(!api.requireAuth(route.request()))return api.json(route,{message:'Unauthorized'},401);
    state.decisionBody=route.request().postDataJSON();state.review={...state.review,status:state.decisionBody.status,notes:state.decisionBody.notes||null,reviewedAt:new Date().toISOString(),reviewedByAccountId:'admin-weather-e2e'};
    return api.json(route,{trip:state.trips[0],location:state.trips[0].location,review:state.review});
  });

  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandPortalAccess));
  await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','weather-e2e-access');sessionStorage.setItem('hl-refresh-token','weather-e2e-refresh');window.HydrolandAuth.syncAuthUi();await window.HydrolandProfile.load()});
  await page.locator('#role-switch').click();await page.locator('#role-dialog [data-role="admin"]').click();

  const tripPanel=page.locator('.hl-trip-admin');const weatherPanel=page.locator('.hl-weather-admin').filter({has:page.locator('[data-weather-trip]')});
  await expect(tripPanel).toBeVisible();await expect(weatherPanel).toBeVisible();
  const form=tripPanel.locator('[data-trip-admin-form]');
  await form.locator('[name="title"]').fill('رحلة طقس تجريبية');
  await form.locator('[name="type"]').fill('BOAT_DIVE');
  await form.locator('[name="locationName"]').fill('مرسى القحمة');
  await form.locator('[name="latitude"]').fill('18.015432');
  await form.locator('[name="longitude"]').fill('41.708765');
  await form.locator('[name="startsAt"]').fill(startsAt.toISOString().slice(0,16));
  await form.locator('[name="endsAt"]').fill(endsAt.toISOString().slice(0,16));
  await form.locator('[name="capacity"]').fill('8');
  await form.locator('[name="status"]').selectOption('OPEN');
  await form.locator('button[type="submit"]').click();

  await expect.poll(()=>state.created?.title).toBe('رحلة طقس تجريبية');
  expect(state.created?.locationName).toBe('مرسى القحمة');expect(state.created?.latitude).toBe(18.015432);expect(state.created?.longitude).toBe(41.708765);
  const tripRow=tripPanel.locator('[data-trip-row="trip-weather-e2e"]');await expect(tripRow).toBeVisible();

  const locationForm=tripRow.locator('[data-location-id="trip-weather-e2e"]');
  await locationForm.locator('[name="locationName"]').fill('جزيرة سمر');
  await locationForm.locator('[name="latitude"]').fill('18.021111');
  await locationForm.locator('[name="longitude"]').fill('41.715555');
  await locationForm.locator('button[type="submit"]').click();
  await expect.poll(()=>state.locationPatch?.locationName).toBe('جزيرة سمر');

  const weatherCard=weatherPanel.locator('[data-weather-trip="trip-weather-e2e"]');await expect(weatherCard).toBeVisible();await expect(weatherCard).toContainText('جزيرة سمر');
  await weatherCard.locator('[data-weather-refresh]').click();
  await expect.poll(()=>state.review?.status).toBe('PENDING');
  await expect(weatherPanel.locator('[data-weather-trip="trip-weather-e2e"] [data-weather-review-status]')).toHaveText('بانتظار المراجعة');
  await expect(weatherPanel.locator('[data-weather-trip="trip-weather-e2e"]')).toContainText('0.7 م');

  page.once('dialog',dialog=>dialog.accept('اعتماد تشغيلي بعد مراجعة حالة البحر'));
  await weatherPanel.locator('[data-weather-trip="trip-weather-e2e"] [data-weather-approve]').click();
  await expect.poll(()=>state.decisionBody?.status).toBe('APPROVED');
  await expect(weatherPanel.locator('[data-weather-trip="trip-weather-e2e"] [data-weather-review-status]')).toHaveText('معتمد');
  expect(state.decisionBody?.notes).toBe('اعتماد تشغيلي بعد مراجعة حالة البحر');
});
