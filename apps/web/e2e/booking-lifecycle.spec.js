import { test, expect } from '@playwright/test';

const installApi=async page=>{
  const state={submittedSeats:null,cancelMethod:null,bookingStatus:'PENDING',participants:[{id:'participant-1',bookingId:'booking-1',accountId:'account-e2e',fullName:'Sultan Asiri',certificationTitle:'Open Water Diver',certificationNumber:'OW-1',certificationIssuer:'E2E',eligibilityStatus:'ELIGIBLE'},{id:'participant-2',bookingId:'booking-1',accountId:null,fullName:'مشارك 2 - البيانات غير مكتملة',certificationTitle:null,certificationNumber:null,certificationIssuer:null,eligibilityStatus:'PENDING'}]};
  const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  const trip=()=>({id:'trip-1',title:'رحلة جزيرة سمر',type:'BOAT_DIVE',startsAt:new Date(Date.now()+86400000).toISOString(),endsAt:new Date(Date.now()+90000000).toISOString(),capacity:3,bookedSeats:0,remainingSeats:3,status:'OPEN',safety:{decision:'ALLOWED'},weather:{snapshot:{decision:'ALLOWED',waveHeightM:0.5},evaluation:{blocking:false,decision:'ALLOWED'}}});
  await page.route(/\/api\/v1\/trips$/,route=>json(route,[trip()]));
  await page.route(/\/api\/v1\/me$/,route=>json(route,{id:'account-e2e',email:'booking-e2e@hydroland.test',status:'ACTIVE',roleAssignments:[],person:{firstName:'Sultan',lastName:'Asiri',professional:null}}));
  await page.route(/\/api\/v1\/credentials$/,route=>json(route,[]));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:{medicalFitnessStatus:'FIT'},equipment:[]}));
  await page.route(/\/api\/v1\/trips\/trip-1\/bookings$/,async route=>{state.submittedSeats=route.request().postDataJSON()?.seats;return json(route,{id:'booking-1',tripId:'trip-1',accountId:'account-e2e',status:state.bookingStatus,seats:state.submittedSeats,participants:state.participants},201)});
  await page.route(/\/api\/v1\/trips\/bookings\/mine$/,route=>json(route,[{id:'booking-1',tripId:'trip-1',accountId:'account-e2e',status:state.bookingStatus,seats:2,trip:trip()}]));
  await page.route(/\/api\/v1\/trips\/bookings\/booking-1\/participants$/,route=>json(route,state.participants));
  await page.route(/\/api\/v1\/trips\/bookings\/booking-1\/participants\/participant-2$/,async route=>{const input=route.request().postDataJSON();state.participants=state.participants.map(row=>row.id==='participant-2'?{...row,...input,eligibilityStatus:'PENDING'}:row);return json(route,state.participants)});
  await page.route(/\/api\/v1\/trips\/bookings\/booking-1\/cancel$/,route=>{state.cancelMethod=route.request().method();state.bookingStatus='CANCELLED';return json(route,{id:'booking-1',status:'CANCELLED',seats:2})});
  return state;
};

const prepare=async page=>{
  await page.addInitScript(()=>{
    sessionStorage.setItem('hl-access-token','booking-e2e-access');
    sessionStorage.setItem('hl-refresh-token','booking-e2e-refresh');
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandBookings&&window.HydrolandAccountCenter&&window.HydrolandBookingParticipants));
  await expect(page.locator('.hl-login')).toHaveClass(/hidden/);
  expect(await page.evaluate(()=>window.HydrolandAuth.isAuthenticated())).toBe(true);
};

test('multi-seat booking, participant editing and self-cancel work from the browser',async({page})=>{
  const state=await installApi(page);await prepare(page);
  const book=page.locator('[data-book="رحلة جزيرة سمر"]').first();
  await expect.poll(()=>book.isEnabled()).toBe(true);
  await book.click();
  await expect(page.locator('#booking-dialog')).toBeVisible();
  await expect(page.locator('#booking-seats')).toHaveAttribute('max','3');
  await page.locator('#booking-seats').fill('2');
  await page.locator('#confirm-booking').click();
  await expect.poll(()=>state.submittedSeats).toBe(2);
  await expect(page.locator('#booking-dialog')).not.toBeVisible();
  await page.evaluate(()=>window.HydrolandAccountCenter.openBookings());
  const bookingsDialog=page.locator('#hl-bookings-dialog');await expect(bookingsDialog).toBeVisible();
  await bookingsDialog.locator('[data-booking-participants]').click();
  const participantsDialog=page.locator('#hl-booking-participants-dialog');await expect(participantsDialog).toBeVisible();
  const companion=participantsDialog.locator('[data-participant-id="participant-2"]');
  await companion.locator('[name="fullName"]').fill('Companion Diver');
  await companion.locator('[name="certificationTitle"]').fill('Advanced Open Water');
  await companion.locator('[name="certificationNumber"]').fill('AOW-22');
  await companion.locator('[name="certificationIssuer"]').fill('SSI');
  await companion.locator('[data-save-participant]').click();
  await expect(companion.locator('[name="fullName"]')).toHaveValue('Companion Diver');
  expect(state.participants.find(row=>row.id==='participant-2')?.certificationNumber).toBe('AOW-22');
  await participantsDialog.locator('.hl-account-head button').click();
  page.once('dialog',dialog=>dialog.accept());
  await bookingsDialog.locator('[data-cancel-booking]').click();
  await expect.poll(()=>state.cancelMethod).toBe('PATCH');
  await expect.poll(()=>state.bookingStatus).toBe('CANCELLED');
});
