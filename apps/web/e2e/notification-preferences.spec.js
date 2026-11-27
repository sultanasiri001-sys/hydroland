import {test,expect} from '@playwright/test';
const account='10000000-0000-4000-8000-000000000001',oldSession='20000000-0000-4000-8000-000000000001',newSession='20000000-0000-4000-8000-000000000002';
const jwt=(sid,sub=account)=>Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub,sid,exp:Math.floor(Date.now()/1000)+900})).toString('base64url')+'.synthetic-signature';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const deferred=()=>{let release;const promise=new Promise(r=>{release=r;});return {promise,release};};
async function setup(page,{english=false,admin=false}={}){
  const state={prefs:{revision:0,email:true,sms:false,whatsapp:false,push:false,bookings:true,invoices:true,quietStart:null,quietEnd:null,timeZone:'Asia/Riyadh',phoneVerified:false,maskedPhone:null,available:{SMS:true,WHATSAPP:true,PUSH:true},phoneVerificationAvailable:true,canReview:admin},
    saves:[],challenges:[],verifies:[],reviews:[],deliveries:[],queue:[],forceRefresh:false,holdChallenge:null,holdPreferences:null,holdReview:null,reviewReads:0,roleAdmin:admin,saveError:0,challengeError:0,sessionId:oldSession};
  const sid=route=>{try{return JSON.parse(Buffer.from(route.request().headers().authorization.slice(7).split('.')[1],'base64url').toString()).sid;}catch{return null;}};
  await page.route(/\/api\/v1\//,async route=>{
    const path=new URL(route.request().url()).pathname.replace(/^.*\/api\/v1/,''),method=route.request().method(),body=route.request().postDataJSON();
    if(path==='/me')return json(route,{id:account,email:'preferences@example.invalid',status:'ACTIVE',roleAssignments:state.roleAdmin?[{role:'ADMIN',status:'ACTIVE'}]:[],person:{firstName:'Notification',lastName:'Fixture',professional:null}});
    if(path==='/me/diver-profile')return json(route,{profile:null,equipment:[]});
    if(path==='/auth/refresh'){state.sessionId=newSession;return json(route,{accessToken:jwt(newSession),refreshToken:'new-synthetic-refresh'});}
    if(path==='/integrations/email/public-config')return json(route,{enabled:false,status:'DISABLED'});
    if(path==='/notifications/delivery/preferences'){
      if(method==='POST'){
        state.saves.push(body);if(state.saveError)return json(route,{message:'معلومات داخلية provider-secret should never be shown'},state.saveError);
        const {confirmed,expectedRevision,...values}=body;expect(confirmed).toBe(true);expect(expectedRevision).toBe(state.prefs.revision);Object.assign(state.prefs,values,{revision:state.prefs.revision+1});
      }else if(state.holdPreferences){const wait=state.holdPreferences;await wait.promise;}
      return json(route,state.prefs);
    }
    if(path==='/notifications/delivery/deliveries')return json(route,{items:state.deliveries});
    if(path==='/notifications/delivery/phone/challenges'){
      if(state.forceRefresh&&sid(route)===oldSession){state.forceRefresh=false;return json(route,{message:'Session expired'},401);}
      if(state.challengeError)return json(route,{message:'رسالة خطأ داخلية private-provider-token'},state.challengeError);
      const item={...body,id:'30000000-0000-4000-8000-'+String(state.challenges.length+1).padStart(12,'0'),sessionId:sid(route)};state.challenges.push(item);
      if(state.holdChallenge){const wait=state.holdChallenge;await wait.promise;}
      return json(route,{challengeId:item.id,sessionId:item.sessionId,status:'PROVIDER_ACCEPTED',expiresAt:new Date(Date.now()+600000).toISOString()});
    }
    if(path.endsWith('/verify')){
      state.verifies.push(body);expect(body).toEqual({code:'123456',confirmed:true});Object.assign(state.prefs,{phoneVerified:true,maskedPhone:'••••1001',sms:false,whatsapp:false,revision:state.prefs.revision+1});return json(route,state.prefs);
    }
    if(path==='/notifications/delivery/phone/remove'){expect(body.confirmed).toBe(true);Object.assign(state.prefs,{phoneVerified:false,maskedPhone:null,sms:false,whatsapp:false,revision:state.prefs.revision+1});return json(route,state.prefs);}
    if(path==='/admin/customer-channel-deliveries'){state.reviewReads++;if(state.holdReview)await state.holdReview.promise;return json(route,{items:state.queue});}
    if(path.startsWith('/admin/customer-channel-deliveries/')&&path.endsWith('/close')){state.reviews.push(body);state.queue=[];return json(route,{state:'SUPPRESSED',resend:false});}
    return json(route,[]);
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandNotificationPreferences));
  await page.evaluate(async ({token,english})=>{
    if(english)window.HydrolandI18n.setLocale('en');
    const attempt=window.HydrolandAuth.beginAuthAttempt();window.HydrolandAuth.acceptSession({accessToken:token,refreshToken:'old-synthetic-refresh'},attempt);await window.HydrolandProfile.load();
    window.HydrolandProfile.edit();
  },{token:jwt(oldSession),english});
  await page.locator('[data-notification-preferences]').click();
  await expect(page.locator('#hl-notification-preferences')).toBeVisible();
  await expect(page.locator('#hl-notification-preferences input[type=tel]')).toBeVisible();
  return state;
}
const dialog=page=>page.locator('#hl-notification-preferences');
async function requestCode(page){
  const form=dialog(page).locator('form').filter({has:page.locator('input[type=tel]')});
  await form.locator('input[type=tel]').fill('+15550001001');await form.locator('input[type=checkbox]').check();await form.locator('button[type=submit]').click();
}
const optionsForm=page=>dialog(page).locator('form').filter({has:page.locator('input[type=time]')});
const closeButton=page=>dialog(page).getByRole('button',{name:/^(إغلاق|Close)$/});
const close=async page=>{await closeButton(page).click();await expect(dialog(page)).toHaveCount(0);};
test('real profile entry preserves email defaults, explicit consent and responsive controls',async({page},testInfo)=>{
  const state=await setup(page),form=optionsForm(page);
  await expect(form.getByRole('checkbox',{name:'البريد الإلكتروني',exact:true})).toBeChecked();
  await expect(form.getByRole('checkbox',{name:'رسالة نصية',exact:true})).toBeDisabled();
  await form.getByRole('checkbox',{name:'البريد الإلكتروني',exact:true}).uncheck();
  await form.getByRole('button',{name:'حفظ الخيارات'}).click();expect(state.saves).toHaveLength(0);
  await form.locator('input[type=time]').nth(0).fill('22:00');await form.locator('input[type=time]').nth(1).fill('07:00');
  await form.getByRole('checkbox',{name:/أوافق/}).check();await form.getByRole('button',{name:'حفظ الخيارات'}).click();
  await expect(dialog(page).getByRole('status')).toContainText('تم حفظ خيارات الإشعارات');
  expect(state.saves[0]).toEqual({expectedRevision:0,email:false,sms:false,whatsapp:false,push:false,bookings:true,invoices:true,quietStart:1320,quietEnd:420,timeZone:'Asia/Riyadh',confirmed:true});
  for(const width of [390,1280]){
    await page.setViewportSize({width,height:900});expect(await dialog(page).evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    expect(await closeButton(page).evaluate(el=>el.scrollWidth<=el.clientWidth+1&&el.getBoundingClientRect().height>=44)).toBe(true);
    await page.screenshot({path:testInfo.outputPath('notification-preferences-'+width+'.png')});
  }
});
test('saving preferences and removing a phone clear invalidated OTP forms; proof does not subscribe',async({page})=>{
  const state=await setup(page);await requestCode(page);await expect(dialog(page).locator('input[autocomplete=one-time-code]')).toBeVisible();
  await optionsForm(page).getByRole('checkbox',{name:/أوافق/}).check();await optionsForm(page).getByRole('button',{name:'حفظ الخيارات'}).click();
  await expect(dialog(page).getByRole('status')).toContainText('تم حفظ');await expect(dialog(page).locator('input[autocomplete=one-time-code]')).toHaveCount(0);
  await requestCode(page);await dialog(page).locator('input[autocomplete=one-time-code]').fill('123456');await dialog(page).getByRole('button',{name:'تأكيد الرمز',exact:true}).click();
  await expect(dialog(page)).toContainText('الهاتف موثّق');await expect(optionsForm(page).getByRole('checkbox',{name:'رسالة نصية',exact:true})).not.toBeChecked();
  await requestCode(page);await expect(dialog(page).locator('input[autocomplete=one-time-code]')).toBeVisible();
  const remove=dialog(page).locator('form').filter({has:page.getByRole('button',{name:'إزالة الهاتف',exact:true})});await remove.locator('input[type=checkbox]').check();await remove.getByRole('button',{name:'إزالة الهاتف',exact:true}).click();
  await expect(dialog(page)).toContainText('أزيل هاتف الإشعارات');await expect(dialog(page).locator('input[autocomplete=one-time-code]')).toHaveCount(0);expect(state.prefs.sms).toBe(false);
});
test('automatic refresh during OTP creation retains only the accepted new native session challenge',async({page})=>{
  const state=await setup(page);state.forceRefresh=true;await requestCode(page);
  await expect(dialog(page).locator('input[autocomplete=one-time-code]')).toBeVisible();expect(state.challenges).toHaveLength(1);expect(state.challenges[0].sessionId).toBe(newSession);
  await dialog(page).locator('input[autocomplete=one-time-code]').fill('123456');await dialog(page).getByRole('button',{name:'تأكيد الرمز',exact:true}).click();await expect(dialog(page)).toContainText('تم توثيق الهاتف');
});
test('a late OTP response from the old native session is discarded after a background refresh',async({page})=>{
  const state=await setup(page),gate=deferred();state.holdChallenge=gate;await requestCode(page);await expect.poll(()=>state.challenges.length).toBe(1);
  await page.evaluate(()=>window.HydrolandAuth.refreshSession());gate.release();state.holdChallenge=null;
  await expect(dialog(page).getByRole('status')).toContainText('تجددت الجلسة');await expect(dialog(page).locator('input[autocomplete=one-time-code]')).toHaveCount(0);await expect(dialog(page).locator('input[type=tel]')).toHaveValue('');
  expect(state.challenges).toHaveLength(1);
});
test('account switch closes the dialog and a delayed private response cannot repopulate it',async({page})=>{
  const state=await setup(page);await close(page);state.prefs.maskedPhone='••••9876';state.prefs.phoneVerified=true;const gate=deferred();state.holdPreferences=gate;
  await page.evaluate(()=>window.HydrolandNotificationPreferences.open());
  await page.evaluate(token=>{const attempt=window.HydrolandAuth.beginAuthAttempt();window.HydrolandAuth.acceptSession({accessToken:token,refreshToken:'other-refresh'},attempt);},jwt(newSession,'10000000-0000-4000-8000-000000000002'));
  await expect(dialog(page)).toHaveCount(0);gate.release();await expect(page.locator('body')).not.toContainText('9876');
});
test('English failures are localized and preserve form input without exposing backend messages',async({page})=>{
  const state=await setup(page,{english:true});state.challengeError=503;await requestCode(page);
  await expect(dialog(page).getByRole('status')).toContainText('The channel is unavailable');await expect(dialog(page)).not.toContainText('private-provider-token');await expect(dialog(page).locator('input[type=tel]')).toHaveValue('+15550001001');
  state.challengeError=0;state.saveError=409;await optionsForm(page).getByRole('checkbox',{name:/I agree/}).check();await optionsForm(page).getByRole('button',{name:'Save preferences'}).click();
  await expect(dialog(page).getByRole('status')).toContainText('Reopen preferences');await expect(dialog(page)).not.toContainText('provider-secret');
});
test('accepted and push-service-confirmed messages do not claim device display or reading',async({page})=>{
  const state=await setup(page,{english:true});await close(page);state.deliveries=[{id:'accepted',event:'BOOKING_CONFIRMED',channel:'SMS',state:'PROVIDER_ACCEPTED',createdAt:new Date().toISOString()},{id:'push',event:'INVOICE_ISSUED',channel:'PUSH',state:'PUSH_SERVICE_CONFIRMED',createdAt:new Date().toISOString()}];
  await page.evaluate(()=>window.HydrolandNotificationPreferences.open());await expect(dialog(page)).toContainText('Provider accepted; delivery unconfirmed');await expect(dialog(page)).toContainText('Phone service accepted; display unconfirmed');
  await expect(dialog(page).getByRole('heading',{name:'Administrator delivery review'})).toHaveCount(0);
});
test('authorized admin review needs a reason and explicit no-resend confirmation',async({page})=>{
  const state=await setup(page,{english:true,admin:true});await close(page);state.queue=[{id:'40000000-0000-4000-8000-000000000001',event:'BOOKING_CONFIRMED',channel:'WHATSAPP',state:'REVIEW_REQUIRED',createdAt:new Date().toISOString()}];
  await page.evaluate(()=>window.HydrolandNotificationPreferences.open());const form=dialog(page).locator('form').filter({has:page.getByRole('button',{name:'Close review',exact:true})});
  await form.locator('textarea').fill('Checked the ambiguous attempt; no resend.');await form.getByRole('button',{name:'Close review',exact:true}).click();expect(state.reviews).toHaveLength(0);
  await form.getByRole('checkbox').check();await form.getByRole('button',{name:'Close review',exact:true}).click();await expect(dialog(page).getByRole('status')).toContainText('Review closed without resending');
  expect(state.reviews).toEqual([{reason:'Checked the ambiguous attempt; no resend.',confirmed:true}]);await expect(dialog(page)).toContainText('No open reviews.');
});
test('live language switching preserves unsaved options, phone and OTP drafts',async({page})=>{
  const state=await setup(page);await optionsForm(page).getByRole('checkbox',{name:'البريد الإلكتروني',exact:true}).uncheck();await optionsForm(page).locator('input[type=time]').first().fill('22:00');
  await dialog(page).locator('input[type=tel]').fill('+15550001001');await dialog(page).locator('[data-hl-locale-switch]').click();
  await expect(dialog(page).getByRole('heading',{name:'Notification preferences',exact:true})).toBeVisible();await expect(dialog(page)).toHaveAttribute('dir','ltr');
  await expect(dialog(page).locator('input[type=tel]')).toHaveValue('+15550001001');await expect(optionsForm(page).getByRole('checkbox',{name:'Email',exact:true})).not.toBeChecked();await expect(optionsForm(page).locator('input[type=time]').first()).toHaveValue('22:00');
  await dialog(page).locator('[data-hl-locale-switch]').click();await expect(dialog(page).getByRole('heading',{name:'خيارات الإشعارات',exact:true})).toBeVisible();expect(state.saves).toHaveLength(0);
  await requestCode(page);await dialog(page).locator('input[autocomplete=one-time-code]').fill('123');await dialog(page).locator('[data-hl-locale-switch]').click();
  await expect(dialog(page).getByRole('button',{name:'Verify code',exact:true})).toBeVisible();await expect(dialog(page).locator('input[autocomplete=one-time-code]')).toHaveValue('123');expect(state.verifies).toHaveLength(0);
});
test('same-session native admin revocation clears current and delayed review data',async({page})=>{
  const state=await setup(page,{english:true,admin:true});await close(page);const reviewId='40000000-0000-4000-8000-000000009999';state.queue=[{id:reviewId,event:'BOOKING_CONFIRMED',channel:'WHATSAPP',state:'REVIEW_REQUIRED',reason:'PROVIDER_ID_REUSED',createdAt:new Date().toISOString()}];
  await page.evaluate(()=>window.HydrolandNotificationPreferences.open());await expect(dialog(page)).toContainText('The provider reference was associated with more than one attempt.');
  const version=await page.evaluate(()=>window.HydrolandAuth.getSessionVersion());state.roleAdmin=false;state.prefs.canReview=false;await page.evaluate(()=>window.HydrolandProfile.load());
  await expect(dialog(page)).toHaveCount(0);expect(await page.evaluate(()=>window.HydrolandAuth.getSessionVersion())).toBe(version);await expect(page.locator('body')).not.toContainText(reviewId);
  state.roleAdmin=true;state.prefs.canReview=true;await page.evaluate(()=>window.HydrolandProfile.load());const gate=deferred();state.holdReview=gate;const reads=state.reviewReads;
  await page.evaluate(()=>window.HydrolandNotificationPreferences.open());await expect.poll(()=>state.reviewReads).toBe(reads+1);state.roleAdmin=false;state.prefs.canReview=false;await page.evaluate(()=>window.HydrolandProfile.load());
  await expect(dialog(page)).toHaveCount(0);gate.release();await expect(page.locator('body')).not.toContainText(reviewId);
});
