import {test,expect} from '@playwright/test';

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const account={id:'diver-integrity',email:'profile@example.invalid',status:'ACTIVE',person:{firstName:'عضو',lastName:'اختبار'},roleAssignments:[{role:'DIVER',status:'ACTIVE'}]};
const initialProfile={nationality:'SA',primaryPhone:'0500000000',emergencyName:'جهة اختبار',emergencyPhone:'0500000001',medicalFitnessStatus:'FIT'};
const install=async(page,{available=true,profile=initialProfile}={})=>{
  const state={available,profile:profile?{...profile}:null,writes:[]};
  await page.route('**/api/v1/**',route=>json(route,[]));
  await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
  await page.route('**/api/v1/integrations/email/public-config',route=>json(route,{enabled:true}));
  await page.route(/\/api\/v1\/me$/,route=>json(route,account));
  await page.route(/\/api\/v1\/credentials$/,route=>json(route,[]));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>{
    if(route.request().method()==='PATCH'){
      const body=route.request().postDataJSON();state.writes.push(body);state.profile={...state.profile,...body};
    }
    return state.available?json(route,{profile:state.profile,equipment:[]}):json(route,{message:'Temporarily unavailable'},503);
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile));
  await page.evaluate(async()=>{
    window.HydrolandAuth.acceptSession({accessToken:'integrity-access',refreshToken:'integrity-refresh'},window.HydrolandAuth.beginAuthAttempt());
    await window.HydrolandProfile.load();
  });
  await expect.poll(()=>page.evaluate(()=>window.HydrolandProfileData?.profile?.id)).toBe(account.id);
  return state;
};
const open=async page=>{
  await page.locator('#profile-open').click();
  await page.locator('#profile-dialog [data-hl-action="diver-profile"]').click();
  return page.locator('#hl-diver-editor');
};

for(const viewport of [{name:'mobile',width:390,height:844},{name:'tablet',width:834,height:1112},{name:'desktop',width:1440,height:1000}]){
  test(`failed diver profile loads cannot overwrite data, with recovery on ${viewport.name}`,async({page},testInfo)=>{
    await page.setViewportSize(viewport);
    const state=await install(page,{available:false});
    const editor=await open(page);
    await expect(editor.locator('.hl-profile-editor-status')).toContainText('تعذر تحميل بيانات الغواص');
    await expect(editor.locator('.hl-profile-editor-grid')).toBeHidden();
    await expect(editor.locator('[type="submit"]')).toBeDisabled();
    await editor.locator('form').dispatchEvent('submit');expect(state.writes).toHaveLength(0);
    const geometry=await editor.evaluate(el=>({left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,viewport:innerWidth}));
    expect(geometry.left).toBeGreaterThanOrEqual(0);expect(geometry.right).toBeLessThanOrEqual(geometry.viewport);
    await page.screenshot({path:testInfo.outputPath(`account-diver-load-error-${viewport.name}.png`)});
    state.available=true;await editor.locator('[data-diver-retry]').click();
    await expect(editor.locator('[name="primaryPhone"]')).toHaveValue('0500000000');
    await expect(editor.locator('[name="emergencyPhone"]')).toHaveValue('0500000001');
    await expect(editor.locator('[data-diver-retry]')).toBeHidden();
    await editor.locator('[name="primaryPhone"]').fill('0555555555');
    await editor.locator('[type="submit"]').click();await expect(editor).not.toBeVisible();
    expect(state.writes).toHaveLength(1);expect(state.writes[0].primaryPhone).toBe('0555555555');
  });
}

test('a successful empty profile allows first-time data entry',async({page})=>{
  const state=await install(page,{profile:null});const editor=await open(page);
  await expect(editor.locator('[type="submit"]')).toBeEnabled();
  await expect(editor.locator('[name="primaryPhone"]')).toHaveValue('');
  await expect(editor.locator('[name="medicalFitnessStatus"]')).toHaveValue('UNKNOWN');
  await editor.locator('[name="primaryPhone"]').fill('0555555555');
  await editor.locator('[type="submit"]').click();await expect(editor).not.toBeVisible();
  expect(state.writes).toHaveLength(1);
});

test('closing while a profile loads does not reopen or enable the abandoned form',async({page})=>{
  await install(page,{available:false});const pending=[];let released=false;
  const reply=route=>json(route,{profile:initialProfile,equipment:[]});
  // Startup can schedule a replacement load while the editor is open. Hold
  // every request, then release the response phase, including later arrivals.
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>released?reply(route):pending.push(route));
  const editor=await open(page);
  await expect.poll(()=>pending.length).toBeGreaterThan(0);
  await expect(editor.locator('form')).toHaveAttribute('aria-busy','true');
  await expect(editor.locator('[type="submit"]')).toBeDisabled();
  await page.evaluate(()=>{void window.HydrolandProfile.load()});
  await expect.poll(()=>pending.length).toBeGreaterThan(1);
  await editor.locator('[data-diver-cancel]').click();
  released=true;
  await Promise.all(pending.map(reply));
  await expect.poll(()=>page.evaluate(()=>window.HydrolandProfileData?.diverProfileAvailable)).toBe(true);
  await expect(editor).not.toBeVisible();
  await expect(editor.locator('form')).toHaveAttribute('data-profile-ready','0');
});

test('emergency contact validation preserves input and pending saves cannot duplicate',async({page})=>{
  await install(page);const editor=await open(page);let pending,writes=0;
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>{
    if(route.request().method()==='PATCH'){writes++;pending=route;return;}
    return json(route,{profile:initialProfile,equipment:[]});
  });
  await editor.locator('[name="emergencyPhone"]').fill('');
  await editor.locator('[type="submit"]').click();
  await expect(editor.locator('.hl-profile-editor-status')).toContainText('أدخل اسم جهة اتصال الطوارئ ورقمها معًا');
  await expect(editor.locator('[name="emergencyName"]')).toHaveValue(initialProfile.emergencyName);expect(writes).toBe(0);
  await editor.locator('[name="emergencyPhone"]').fill('0555555555');
  await editor.locator('[type="submit"]').click();await expect.poll(()=>Boolean(pending)).toBe(true);
  await expect(editor.locator('[type="submit"]')).toBeDisabled();
  await expect(editor.locator('[name="primaryPhone"]')).toBeDisabled();
  await editor.locator('form').dispatchEvent('submit');expect(writes).toBe(1);
  await json(pending,{message:'Temporary failure'},503);
  await expect(editor.locator('.hl-profile-editor-status')).toContainText('تعذر حفظ بيانات الغواص');
  await expect(editor.locator('[type="submit"]')).toBeEnabled();
  await expect(editor.locator('[name="emergencyPhone"]')).toHaveValue('0555555555');
});
