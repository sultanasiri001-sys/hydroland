import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const account={id:'privacy-browser-self',email:'self@example.invalid',status:'ACTIVE',person:{firstName:'عضو',lastName:'اختبار',professional:{headline:'غواص'}},roleAssignments:[{role:'DIVER',status:'ACTIVE'}]};
const exported={schemaVersion:'ACCOUNT_PROFILE_EXPORT_V1',completePlatformExport:false,scope:['ACCOUNT','PERSON','PROFESSIONAL_PROFILE','ROLE_ASSIGNMENTS'],excludedDomains:['PAYMENTS'],data:account,receipt:{auditEventId:'synthetic',sha256:'a'.repeat(64)}};
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
async function install(page){
  await page.setViewportSize({width:390,height:844});
  await page.route('**/api/v1/**',route=>json(route,[]));
  await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
  await page.route(/\/api\/v1\/me$/,route=>json(route,account));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile));
  await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'privacy-access',refreshToken:'privacy-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
  await page.locator('#profile-open').click();
  await page.locator('#profile-dialog [data-hl-action="settings"]').click();
  await expect(page.locator('#hl-profile-editor')).toBeVisible();
}
test('account settings download the explicitly scoped profile file on a mobile viewport',async({page})=>{
  await install(page);let requests=0;
  await page.route('**/api/v1/me/data-export',route=>{requests++;expect(route.request().method()).toBe('POST');expect(route.request().postDataJSON()).toEqual({});return json(route,exported,201)});
  const waiting=page.waitForEvent('download');
  await page.locator('[data-profile-export]').click();
  const download=await waiting;expect(download.suggestedFilename()).toBe('hydroland-account-profile.json');
  expect(JSON.parse(await readFile(await download.path(),'utf8'))).toEqual(exported);
  await expect(page.locator('#hl-profile-editor [role="status"]')).toHaveText('تم تنزيل بيانات الحساب');
  expect(requests).toBe(1);await expect(page.locator('[data-profile-export]')).toBeEnabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
for(const scenario of ['server-error','foreign-account'])test(`account export handles ${scenario} without downloading another payload`,async({page})=>{
  await install(page);let downloads=0;page.on('download',()=>downloads++);
  await page.route('**/api/v1/me/data-export',route=>scenario==='server-error'?json(route,{message:'Unavailable'},500):json(route,{...exported,data:{...account,id:'foreign'}},201));
  await page.locator('[data-profile-export]').click();
  await expect(page.locator('#hl-profile-editor [role="status"]')).toContainText('تعذر تنزيل بيانات الحساب');
  await expect(page.locator('[data-profile-export]')).toBeEnabled();expect(downloads).toBe(0);
});
test('logout clears the account editor and discards an in-flight export',async({page})=>{
  await install(page);let downloads=0;page.on('download',()=>downloads++);
  await page.evaluate(()=>{
    const original=window.HydrolandAuth.authorizedFetch;
    window.HydrolandAuth.authorizedFetch=(path,options)=>path==='/me/data-export'?new Promise(resolve=>{window.resolvePrivacyExport=()=>resolve(new Response(JSON.stringify(window.privacyExportFixture),{status:201,headers:{'content-type':'application/json'}}))}):original(path,options);
  });
  await page.evaluate(value=>{window.privacyExportFixture=value},exported);
  await page.locator('[data-profile-export]').click();
  await expect(page.locator('[data-profile-export]')).toBeDisabled();
  await page.evaluate(()=>{window.HydrolandAuth.terminateSession();window.resolvePrivacyExport()});
  await expect(page.locator('#hl-profile-editor')).toHaveCount(0);
  expect(downloads).toBe(0);
});

test('personal trip exports download independently and advance only the selected domain', async({page})=>{
  await install(page);
  const calls=[];
  await page.route('**/api/v1/me/data-export/trip-records', async route=>{
    const {domain,after}=route.request().postDataJSON();calls.push([domain,after]);
    await json(route,{schemaVersion:'PERSONAL_TRIP_RECORDS_V1',accountId:account.id,domain,completePlatformExport:false,records:[],nextCursor:domain==='BOOKINGS'&&!after?'next-booking':null},201);
  });
  const editor = page.locator('#hl-profile-editor');
  const bookingButton = editor.locator('[data-trip-export="BOOKINGS"]');
  await expect(bookingButton).toHaveAccessibleName('تنزيل حجوزاتي الشخصية');
  await editor.locator('[data-hl-locale-switch]').click();
  await expect(bookingButton).toHaveAccessibleName('Download my personal bookings');
  await expect(editor.locator('[data-trip-export="PAYMENTS"]')).toHaveAccessibleName('Download my trip payments');
  for(const [domain,filename] of [['BOOKINGS','bookings-1'],['PAYMENTS','payments-1'],['BOOKINGS','bookings-2']]){
    const waiting=page.waitForEvent('download');await page.locator('[data-trip-export="'+domain+'"]').click();
    expect((await waiting).suggestedFilename()).toBe('hydroland-trip-'+filename+'.json');
    if (filename === 'bookings-1') await expect(bookingButton).toHaveAccessibleName('Download the next page of bookings');
  }
  await expect(editor.getByRole('status')).toHaveText('Finished downloading the requested records.');
  expect(calls).toEqual([['BOOKINGS',''],['PAYMENTS',''],['BOOKINGS','next-booking']]);
  await expect(page.locator('[data-trip-export="BOOKINGS"]')).toBeDisabled();
});

test('sent message download uses its own scope and checks the returned account',async({page})=>{
  await install(page);
  const editor=page.locator('#hl-profile-editor');
  const button=editor.getByRole('button',{name:'تنزيل رسائلي المرسلة'});
  await expect(button).toBeVisible();
  await editor.locator('[data-hl-locale-switch]').click();
  const translated=editor.getByRole('button',{name:'Download my sent messages'});
  const fixture={accountId:account.id,schemaVersion:'PERSONAL_SENT_MESSAGES_V1',domain:'SENT_MESSAGES',
    completePlatformExport:false,records:[{id:'msg',kind:'TEXT',body:'My message'}],nextCursor:null};
  let owner='wrong-account';
  const files=[];page.on('download',download=>files.push(download.suggestedFilename()));
  await page.route('**/api/v1/me/data-export/sent-messages',async route=>{
    expect(route.request().postDataJSON()).toEqual({after:''});
    await json(route,{...fixture,accountId:owner},201);
  });
  await translated.click();
  await expect(editor.getByRole('status')).toHaveText('Could not download records. Try again.');
  expect(files).toEqual([]);
  owner=account.id;
  const waiting=page.waitForEvent('download');await translated.click();
  const download=await waiting;
  expect(download.suggestedFilename()).toBe('hydroland-sent-messages-1.json');
  expect(JSON.parse(await readFile(await download.path(),'utf8'))).toEqual(fixture);
  await expect(translated).toBeDisabled();
});
