import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher,returnToDiverWorkspace} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const report=(kind,enabled=true)=>({integration:kind==='payment'?'PAYMENT_PSP':'BANKING_SETTLEMENT',status:enabled?'PRODUCTION_ENABLED':'NOT_SELECTED',provider:enabled?'MOYASAR':'UNCONFIGURED',productionReady:enabled,sandboxReady:false,timestamp:'2026-10-17T20:00:00Z',checks:{lifecycleOperational:enabled,providerConfigured:enabled,credentialsConfigured:enabled,...(kind==='payment'?{webhookConfigured:enabled,publicWebOriginConfigured:true}:{})}});
async function setup(page,{active=true,open=true}={}){
  const state={active,requests:[],revokeOnRefreshClick:false,revokedChecks:0};
  await page.route('**/api/v1/**',route=>json(route,[]));
  await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
  await page.route(/\/api\/v1\/me$/,async route=>{
    // Revoke at the actual refresh click for the action-denial test. Earlier
    // independent /me requests must not remove its control before the action.
    if(state.revokeOnRefreshClick&&await page.evaluate(()=>window.__readinessRefreshClicked===true)){
      state.active=false;state.revokedChecks++;
    }
    return json(route,{id:'readiness-admin',status:'ACTIVE',email:'admin@example.invalid',person:{firstName:'مدير',lastName:'اختبار'},roleAssignments:state.active?[{role:'ADMIN',status:'ACTIVE'}]:[{role:'DIVER',status:'ACTIVE'}]});
  });
  await page.route('**/api/v1/health/integrations/*',route=>{state.requests.push(route.request().method());const kind=route.request().url().split('/').pop();return json(route,report(kind,kind==='payment'));});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandPaymentReadiness));
  await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'readiness-admin-test',refreshToken:'readiness-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load();});
  if(open){
    await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role=admin]').click();
    await page.getByRole('button',{name:'فحص إعدادات الدفع والتسوية',exact:true}).click();
    await expect(page.locator('[data-readiness-kind=payment]')).toContainText('إعدادات الإنتاج مكتملة');
    await expect(page.locator('[data-readiness-state]')).toHaveText('تم تحديث حالة إعدادات الدفع والتسوية.');
  }
  return state;
}
test('admin reads independent payment and settlement configuration without writes or secrets',async({page})=>{
  const state=await setup(page);
  await expect(page.locator('[data-readiness-kind=settlement]')).toContainText('غير جاهز للتشغيل');
  await expect(page.locator('[data-readiness-kind=settlement]')).toContainText('بيانات اعتماد المزود: ناقص');
  await expect(page.locator('[data-payment-readiness]')).toContainText('إثبات عمل الدفع يحتاج عملية اختبار');
  await page.route('**/api/v1/health/integrations/payment',route=>json(route,{...report('payment'),secret:'do-not-display',provider:'<img src=x onerror=alert(1)>',checks:{...report('payment').checks,apiKey:'never-display'}}));
  await page.locator('[data-readiness-refresh]').click();
  await expect(page.locator('[data-readiness-kind=payment]')).toContainText('المزود: غير معروف');
  await expect(page.locator('[data-payment-readiness]')).not.toContainText('do-not-display');
  await expect(page.locator('[data-payment-readiness]')).not.toContainText('never-display');
  await expect(page.locator('[data-payment-readiness] img')).toHaveCount(0);
  expect(state.requests.length).toBeGreaterThanOrEqual(2);expect(state.requests.every(method=>method==='GET')).toBe(true);
});
test('failed refresh clears old readiness and leaves successful sibling visible',async({page})=>{
  await setup(page);
  await page.route('**/api/v1/health/integrations/payment',route=>json(route,{message:'private provider error'},503));
  await page.locator('[data-readiness-refresh]').click();
  await expect(page.locator('[data-readiness-kind=payment]')).toContainText('تعذر قراءة حالة الربط');
  await expect(page.locator('[data-readiness-kind=payment]')).not.toContainText('إعدادات الإنتاج مكتملة');
  await expect(page.locator('[data-payment-readiness]')).not.toContainText('private provider error');
  await expect(page.locator('[data-readiness-kind=settlement]')).toContainText('غير جاهز للتشغيل');
});
test('malformed payload and sandbox flags cannot be presented as live payment acceptance',async({page})=>{
  await setup(page);
  await page.route('**/api/v1/health/integrations/payment',route=>json(route,{...report('payment'),checks:{}}));
  await page.route('**/api/v1/health/integrations/settlement',route=>json(route,{...report('settlement'),status:'SANDBOX',productionReady:false,sandboxReady:true}));
  await page.locator('[data-readiness-refresh]').click();
  await expect(page.locator('[data-readiness-kind=payment]')).toContainText('تعذر قراءة حالة الربط');
  await expect(page.locator('[data-readiness-kind=settlement]')).toContainText('إعدادات الاختبار مكتملة');
});
test('revoked administrator cannot refresh or retain readiness',async({page})=>{
  const state=await setup(page);const before=state.requests.length;
  state.revokeOnRefreshClick=true;
  // A synchronous capture marker changes only the mocked server's answer.
  // The real click, fresh authorization, revocation and UI clearing all run.
  await page.locator('[data-readiness-refresh]').evaluate(button=>button.addEventListener('click',()=>{window.__readinessRefreshClicked=true;},{capture:true,once:true}));
  await page.locator('[data-readiness-refresh]').click();
  await expect(page.locator('[data-readiness-kind]')).toHaveCount(0);
  await expect(page.locator('[data-payment-readiness]')).toBeHidden();
  await expect.poll(()=>state.revokedChecks).toBeGreaterThan(0);
  expect(state.active).toBe(false);
  expect(state.requests.length).toBe(before);
});
test('background role revocation clears readiness before any subsequent reload',async({page})=>{
  const state=await setup(page);const before=state.requests.length;state.active=false;
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await expect.poll(()=>page.evaluate(()=>window.HydrolandPortalAccess.getCurrentRole())).toBe('diver');
  await expect(page.locator('[data-payment-readiness]')).toBeHidden();
  await expect(page.locator('[data-readiness-kind]')).toHaveCount(0);
  await page.evaluate(()=>window.HydrolandPaymentReadiness.reload());
  await expect(page.locator('[data-readiness-kind]')).toHaveCount(0);
  expect(state.requests.length).toBe(before);
});
test('ordinary diver cannot request readiness through the exposed reload function',async({page})=>{
  const state=await setup(page,{active:false,open:false});
  await page.evaluate(()=>window.HydrolandPaymentReadiness.reload());
  await expect(page.locator('[data-payment-readiness]')).toBeHidden();expect(state.requests).toEqual([]);
});
test('late responses after logout cannot restore diagnostics',async({page})=>{
  await setup(page);let release,seen;const pending=new Promise(resolve=>release=resolve),started=new Promise(resolve=>seen=resolve);
  await page.route('**/api/v1/health/integrations/payment',async route=>{seen();await pending;await json(route,report('payment'));});
  const oldLoad=page.evaluate(()=>window.HydrolandPaymentReadiness.reload());await started;
  await page.evaluate(()=>window.HydrolandAuth.terminateSession());release();await oldLoad;
  await expect(page.locator('[data-payment-readiness]')).toBeHidden();await expect(page.locator('[data-readiness-kind]')).toHaveCount(0);
});
test('newer refresh wins over delayed older results and leaving admin clears results',async({page})=>{
  await setup(page);let release,seen;const pending=new Promise(resolve=>release=resolve),started=new Promise(resolve=>seen=resolve);let hits=0;
  await page.route('**/api/v1/health/integrations/payment',async route=>{if(++hits===1){seen();await pending;return json(route,report('payment'));}return json(route,report('payment',false));});
  const oldLoad=page.evaluate(()=>window.HydrolandPaymentReadiness.reload());await started;await page.locator('[data-readiness-refresh]').click();
  await expect(page.locator('[data-readiness-kind=payment]')).toContainText('غير جاهز للتشغيل');release();await oldLoad;
  await expect(page.locator('[data-readiness-kind=payment]')).not.toContainText('إعدادات الإنتاج مكتملة');
  await returnToDiverWorkspace(page);await expect(page.locator('[data-readiness-kind]')).toHaveCount(0);
});
