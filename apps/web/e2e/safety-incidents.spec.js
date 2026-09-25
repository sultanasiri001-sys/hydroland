import {test,expect} from '@playwright/test';

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});

test('authenticated user reports a safety incident and admin resolves it with evidence',async({page})=>{
  const profile={id:'safety-incident-admin',email:'safety-incident@hydroland.test',status:'ACTIVE',roleAssignments:[{id:'role-admin-incident',role:'ADMIN',status:'ACTIVE'}],person:{firstName:'Safety',lastName:'Incident',phone:null,professional:null}};
  const trip={id:'trip-incident-e2e',title:'رحلة حادث تجريبية',type:'BOAT',startsAt:'2030-02-01T08:00:00.000Z',endsAt:'2030-02-01T12:00:00.000Z',capacity:8,status:'OPEN'};
  const state={mine:[],admin:[],created:null,decision:null};
  const authorized=request=>request.headers().authorization==='Bearer safety-incident-access';
  await page.route(/\/api\/v1\/me$/,route=>authorized(route.request())?json(route,profile):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/credentials$/,route=>authorized(route.request())?json(route,[]):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>authorized(route.request())?json(route,{profile:null,equipment:[]}):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/trips$/,route=>json(route,[trip]));
  await page.route(/\/api\/v1\/safety\/incidents\/mine$/,route=>authorized(route.request())?json(route,state.mine):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/safety\/incidents\/admin$/,route=>authorized(route.request())?json(route,state.admin):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/safety\/incidents$/,route=>{
    if(!authorized(route.request()))return json(route,{message:'Unauthorized'},401);
    const body=route.request().postDataJSON();state.created={id:'incident-e2e',tripId:body.tripId||null,severity:body.severity,title:body.title,description:body.description,locationName:body.locationName||null,status:'OPEN',createdAt:new Date().toISOString(),reportedByAccountId:profile.id,trip:body.tripId?trip:null};state.mine=[state.created];state.admin=[{...state.created,reportedBy:{id:profile.id,email:profile.email,person:profile.person},resolvedBy:null}];return json(route,state.created,201);
  });
  await page.route(/\/api\/v1\/safety\/incidents\/admin\/incident-e2e\/status$/,route=>{
    if(!authorized(route.request()))return json(route,{message:'Unauthorized'},401);
    const body=route.request().postDataJSON();state.decision=body;const existing=state.admin[0];const terminal=['RESOLVED','CLOSED'].includes(body.status);const updated={...existing,status:body.status,resolutionNotes:body.resolutionNotes||existing.resolutionNotes||null,resolvedAt:terminal?new Date().toISOString():null,resolvedBy:terminal?{id:profile.id,email:profile.email,person:profile.person}:null};state.admin=[updated];state.mine=[{...state.mine[0],status:updated.status,resolutionNotes:updated.resolutionNotes,resolvedAt:updated.resolvedAt}];return json(route,updated);
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandSafetyIncidents));
  await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','safety-incident-access');sessionStorage.setItem('hl-refresh-token','safety-incident-refresh');window.HydrolandAuth.syncAuthUi();document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));await window.HydrolandProfile.load()});
  const panel=page.locator('#hl-safety-incidents');await expect(panel).toBeVisible();
  const form=panel.locator('[data-safety-incident-form]');await form.locator('[name="tripId"]').selectOption('trip-incident-e2e');await form.locator('[name="severity"]').selectOption('HIGH');await form.locator('[name="title"]').fill('تسرب محدود');await form.locator('[name="locationName"]').fill('مرسى القحمة');await form.locator('[name="description"]').fill('تمت ملاحظة تسرب محدود قرب المحرك ويحتاج فحصًا فنيًا.');await form.locator('button[type="submit"]').click();
  await expect.poll(()=>state.created?.status).toBe('OPEN');await expect(panel.locator('[data-safety-incident-mine]')).toContainText('تسرب محدود');
  await page.locator('#role-switch').click();await page.locator('#role-dialog [data-role="admin"]').click();
  const review=panel.locator('article[data-safety-incident-id="incident-e2e"]');await expect(review).toBeVisible();await review.locator('[data-safety-incident-decision="UNDER_REVIEW"]').click();await expect.poll(()=>state.decision?.status).toBe('UNDER_REVIEW');
  await review.locator('[data-safety-incident-notes]').fill('تم توجيه البلاغ للفحص الفني وعزل القارب مبدئيًا.');await review.locator('[data-safety-incident-decision="RESOLVED"]').click();await expect.poll(()=>state.decision?.status).toBe('RESOLVED');await expect(review).toContainText('RESOLVED');
});