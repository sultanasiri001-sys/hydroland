import {test,expect} from '@playwright/test';

const ticket=subject=>({id:subject,type:'SUPPORT',status:'OPEN',subject,createdAt:'2026-11-17T06:00:00Z'});
const json=(route,body)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
async function install(page,rows=[]){
  await page.setViewportSize({width:390,height:844});
  await page.route('**/api/v1/**',route=>json(route,[]));
  await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
  await page.route('**/api/v1/customer-service/cases/mine',route=>json(route,rows));
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandWorkspaceUI&&document.querySelector('.hl-support')));
  await page.evaluate(()=>window.HydrolandAuth.acceptSession({accessToken:'support-a',refreshToken:'support-refresh-a'},window.HydrolandAuth.beginAuthAttempt()));
  await expect(page.locator('[data-support-state]')).toHaveText('متصل بالنظام');
  // The support workspace is hidden until selected in the full application.
  await page.evaluate(()=>window.HydrolandWorkspaceUI.show(document.querySelector('.hl-support')));
}

test('logout immediately clears ticket subjects and unsent support text',async({page})=>{
  await install(page,[ticket('PRIVATE-TICKET-A')]);
  await expect(page.locator('[data-support-list]')).toContainText('PRIVATE-TICKET-A');
  await page.locator('[data-support-form] input').fill('PRIVATE-DRAFT-A');
  await page.locator('[data-support-form] textarea').fill('PRIVATE-DESCRIPTION-A');
  await page.evaluate(()=>window.HydrolandAuth.terminateSession());
  await expect(page.locator('[data-support-form]')).toBeHidden();
  await expect(page.locator('[data-support-form] input')).toHaveValue('');
  await expect(page.locator('[data-support-form] textarea')).toHaveValue('');
  await expect(page.locator('[data-support-list]')).not.toContainText('PRIVATE-TICKET-A');
  await expect(page.locator('[data-support-count]')).toHaveText('—');
});

async function deferList(page){
  await page.evaluate(()=>{
    const original=window.HydrolandAuth.authorizedFetch;
    window.HydrolandAuth.authorizedFetch=(path,options)=>path==='/customer-service/cases/mine'?Promise.resolve({ok:true,json:()=>new Promise(resolve=>{window.resolveSupportBody=resolve})}):original(path,options);
  });
  await page.locator('[data-support-refresh]').click();
  await page.waitForFunction(()=>Boolean(window.resolveSupportBody));
}

test('a ticket body decoded after logout cannot repopulate the guest screen',async({page})=>{
  await install(page);
  await deferList(page);
  await page.evaluate(rows=>{window.HydrolandAuth.terminateSession();window.resolveSupportBody(rows)},[ticket('PRIVATE-LATE-A')]);
  await expect(page.locator('[data-support-state]')).toHaveText('يتطلب تسجيل الدخول');
  await expect(page.locator('[data-support-list]')).toContainText('سجّل الدخول');
  await expect(page.locator('[data-support-list]')).not.toContainText('PRIVATE-LATE-A');
});

test('an older ticket refresh cannot overwrite a newer result',async({page})=>{
  await install(page);
  await deferList(page);
  await page.evaluate(rows=>{
    const original=window.HydrolandAuth.authorizedFetch;
    window.HydrolandAuth.authorizedFetch=(path,options)=>path==='/customer-service/cases/mine'?Promise.resolve({ok:true,json:async()=>rows}):original(path,options);
  },[ticket('LATEST-RESULT')]);
  await page.locator('[data-support-refresh]').click();
  await expect(page.locator('[data-support-list]')).toContainText('LATEST-RESULT');
  await page.evaluate(rows=>window.resolveSupportBody(rows),[ticket('STALE-RESULT')]);
  await expect(page.locator('[data-support-list]')).toContainText('LATEST-RESULT');
  await expect(page.locator('[data-support-list]')).not.toContainText('STALE-RESULT');
});

for(const outcome of ['success','failure'])test(`old support creation ${outcome} cannot change the next account draft`,async({page})=>{
  await install(page);
  await page.evaluate(()=>{
    const original=window.HydrolandAuth.authorizedFetch;
    window.HydrolandAuth.authorizedFetch=(path,options)=>path==='/customer-service/cases'?new Promise((resolve,reject)=>{window.finishSupportCreate=success=>success?resolve({ok:true}):reject(new Error('old account failure'))}):original(path,options);
  });
  await page.locator('[data-support-form] input').fill('ACCOUNT-A-SUBMIT');
  await page.locator('[data-support-form] textarea').fill('Account A body');
  await page.locator('[data-support-form] button').click();
  await page.waitForFunction(()=>Boolean(window.finishSupportCreate));
  await page.evaluate(()=>{window.HydrolandAuth.terminateSession();window.HydrolandAuth.acceptSession({accessToken:'support-b',refreshToken:'support-refresh-b'},window.HydrolandAuth.beginAuthAttempt())});
  await expect(page.locator('[data-support-state]')).toHaveText('متصل بالنظام');
  await page.evaluate(()=>window.HydrolandWorkspaceUI.show(document.querySelector('.hl-support')));
  await page.locator('[data-support-form] input').fill('ACCOUNT-B-DRAFT');
  await page.locator('[data-support-form] textarea').fill('Account B body');
  await page.evaluate(success=>window.finishSupportCreate(success),outcome==='success');
  await expect(page.locator('[data-support-form] input')).toHaveValue('ACCOUNT-B-DRAFT');
  await expect(page.locator('[data-support-form] textarea')).toHaveValue('Account B body');
  await expect(page.locator('[data-support-message]')).not.toContainText('تم تسجيل');
  await expect(page.locator('[data-support-message]')).not.toContainText('تعذر تسجيل');
  await expect(page.locator('[data-support-form] button')).toBeEnabled();
});
