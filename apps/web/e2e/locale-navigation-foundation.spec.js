import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const roles=['DIVER','INSTRUCTOR','DIVE_CENTER','BOAT_OWNER','ORGANIZATION','ADMIN'];
const localeSwitch=page=>page.locator('[data-hl-locale-switch]:visible');
async function setup(page){
 const state={roles:[...roles],id:'locale-account',writes:[]};
 await page.addInitScript(()=>sessionStorage.setItem('hl-guest-mode','1'));
 await page.route('**/api/v1/**',route=>{
  const request=route.request(),path=new URL(request.url()).pathname;
  if(!['GET','HEAD'].includes(request.method()))state.writes.push({path,method:request.method()});
  if(path.endsWith('/me'))return json(route,{id:state.id,status:'ACTIVE',email:'locale@example.invalid',roleAssignments:state.roles.map(role=>({id:'locale-'+role,role,status:'ACTIVE'})),person:{firstName:'الرئيسية',lastName:'<User text>',professional:null}});
  if(path.endsWith('/me/diver-profile'))return json(route,{profile:{medicalFitnessStatus:'FIT'},equipment:[]});
  if(path.endsWith('/themes/active'))return json(route,{themeId:'ocean-horizon'});
  if(path.endsWith('/maps/public-config'))return json(route,{enabled:false,status:'NOT_SELECTED'});
  if(path.endsWith('/weather/public-config'))return json(route,{configured:false,status:'NOT_SELECTED'});
  if(path.endsWith('/integrations/email/public-config'))return json(route,{enabled:true});
  if(path.endsWith('/auth/google/config'))return json(route,{enabled:false});
  if(path.endsWith('/admin/employees'))return json(route,{initialized:false,departments:[],profiles:[],items:[],nextCursor:null,email:{enabled:false},google:{enabled:false}});
  if(path.endsWith('/participants'))return json(route,[{id:'participant-1',fullName:'مؤهل <private>',certificationTitle:'بانتظار المراجعة',accountId:state.id,eligibilityStatus:'ELIGIBLE'}]);
  return json(route,[]);
 });
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>Boolean(window.HydrolandI18n&&window.HydrolandDiverDashboard&&window.HydrolandPortalFreshness&&window.HydrolandWorkspaceUI&&window.HydrolandBookingParticipants));
 await expect(localeSwitch(page)).toHaveCount(1);
 return state;
}
async function signIn(page){
 await page.evaluate(async()=>{
  window.HydrolandAuth.acceptSession({accessToken:'locale-access',refreshToken:'locale-refresh'},window.HydrolandAuth.beginAuthAttempt());
  await window.HydrolandProfile.load();
 });
 await expect(page.locator('#hl-diver-dashboard')).toBeVisible();
}
async function switchTo(page,locale,key='Enter'){
 const control=localeSwitch(page);await expect(control).toHaveCount(1);await expect(control).toBeEnabled();
 if(await page.locator('html').getAttribute('lang')!==locale){await control.focus();await control.press(key);await expect(control).toBeFocused()}
 await expect(page.locator('html')).toHaveAttribute('lang',locale);
 await expect(page.locator('html')).toHaveAttribute('dir',locale==='en'?'ltr':'rtl');
 await expect(control).toHaveAttribute('data-hl-locale-current',locale);
 await expect(control).toHaveAccessibleName(locale==='en'?'Interface language: English. Switch to Arabic':'لغة الواجهة: العربية. التبديل إلى الإنجليزية');
}
async function assertInsideViewport(page,locator,width){
 await expect(locator).toBeVisible();
 let box;
 await expect.poll(async () => {
  box = await locator.boundingBox();
  return Boolean(box && box.x >= -1 && box.x + box.width <= width + 1);
 }, {message:'The open control or navigation panel must fit within the viewport'}).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
 return box;
}
test('the public language switch retains drafts, focus, canonical routes and opaque account text',async({page})=>{
 const state=await setup(page),input=page.locator('#search-form input');
 await input.fill('مسودة <draft>');await input.focus();
 const routes=await page.locator('#navigation a').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));
 await localeSwitch(page).click();
 await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page.locator('html')).toHaveAttribute('dir','ltr');
 await expect(page.locator('#navigation a[href="#home"] span:last-child')).toHaveText('Home');
 await expect(input).toHaveAttribute('aria-label','Search');await expect(input).toHaveValue('مسودة <draft>');await expect(input).toBeFocused();
 expect(await page.locator('#navigation a').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')))).toEqual(routes);
 expect(await page.evaluate(()=>window.HydrolandI18n.coverage.englishInterfaceAvailable)).toBe(true);
 await expect(page.locator('#hl-locale-status')).toHaveText('Interface language changed to English.');
 await page.evaluate(()=>window.HydrolandI18n.setLocale('fr'));
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 await signIn(page);
 await expect(page.locator('#hl-diver-dashboard .hl-diver-head h1')).toContainText('Welcome back');
 await expect(page.locator('#hl-diver-dashboard .hl-diver-head h1 span')).toHaveText('الرئيسية <User text>');
 await expect(page.locator('#hl-diver-dashboard .hl-diver-head h1 user')).toHaveCount(0);
 await switchTo(page,'ar','Space');
 await expect(page.locator('#hl-diver-dashboard .hl-diver-head h1')).toContainText('مرحبًا بك مجددًا');
 await expect(input).toHaveValue('مسودة <draft>');expect(state.writes).toEqual([]);
});
test('sign-in and active native dialogs each expose one switch without replacing drafts or dialog controls',async({page})=>{
 const state=await setup(page);await page.locator('#visitor-auth-cta').click();
 await expect(page.locator('.hl-login')).toBeVisible();await expect(localeSwitch(page)).toHaveAttribute('data-hl-locale-switch','entry');
 await page.locator('.hl-login-primary').click();const email=page.locator('.hl-auth-panel [name=email]');await email.fill('draft@example.invalid');await email.focus();
 await localeSwitch(page).click();await expect(email).toHaveValue('draft@example.invalid');await expect(email).toBeFocused();
 await expect(page.locator('.hl-auth-submit')).toHaveText('Secure sign-in');
 await switchTo(page,'ar','Space');await expect(email).toHaveValue('draft@example.invalid');
 await page.keyboard.press('Escape');await expect(page.locator('.hl-login')).toBeHidden();await expect(localeSwitch(page)).toHaveCount(1);
 await signIn(page);await page.evaluate(()=>window.HydrolandBookingParticipants.open('booking-1'));
 const dialog=page.locator('#hl-booking-participants-dialog'),draft=dialog.locator('[name=fullName]');
 await expect(dialog).toBeVisible();await expect(localeSwitch(page)).toHaveAttribute('data-hl-locale-switch','dialog');
 await draft.fill('A&B <مسودة>');await draft.focus();await localeSwitch(page).click();
 await expect(draft).toHaveValue('A&B <مسودة>');await expect(draft).toBeFocused();
 await expect(dialog.locator('.hl-status')).toHaveText('Eligible');
 await expect(dialog.locator('.hl-account-head button:not([data-hl-locale-switch])')).toHaveAccessibleName('Close');
 await switchTo(page,'ar');await expect(dialog.locator('.hl-status')).toHaveText('مؤهل');
 await dialog.locator('.hl-account-head button:not([data-hl-locale-switch])').click();
 await expect(dialog).toBeHidden();await expect(localeSwitch(page)).toHaveCount(1);expect(state.writes).toEqual([]);
});
for(const viewport of [{width:1536,height:864},{width:768,height:1024},{width:390,height:844}]){
 test('seven portal surfaces and operational workspace mirror in both directions at '+viewport.width,async({page},testInfo)=>{
  test.setTimeout(120000);await page.setViewportSize(viewport);const state=await setup(page);
  for(const locale of ['ar','en']){
   await switchTo(page,locale);await assertInsideViewport(page,localeSwitch(page),viewport.width);
   if(viewport.width>760){const box=await page.locator('.sidebar').boundingBox();if(locale==='en')expect(box.x).toBeLessThanOrEqual(1);else expect(box.x+box.width).toBeGreaterThanOrEqual(viewport.width-1)}
  }
  await signIn(page);
  for(const [role,title] of [['diver','Welcome back'],['instructor','Dive professionals'],['center','Dive center operations'],['boat','Marine brokerage'],['organization','Corporate and government portal'],['admin','Management command center']]){
   if(role!=='diver'){await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="'+role+'"]').click()}
   const board=page.locator(role==='diver'?'#hl-diver-dashboard':'.hl-role-dashboard[data-role="'+role+'"]');await expect(board).toBeVisible();
   const routes=await board.locator('[data-hl-route],[data-diver-route],[data-portal-label],[data-action-label]').evaluateAll(nodes=>nodes.map(node=>[node.dataset.hlRoute,node.dataset.diverRoute,node.dataset.portalLabel,node.dataset.actionLabel]));
   for(const locale of ['ar','en']){
    await switchTo(page,locale,locale==='en'?'Enter':'Space');await expect(page.locator('body')).toHaveAttribute('data-hl-workspace-role',role);
    expect(await board.locator('[data-hl-route],[data-diver-route],[data-portal-label],[data-action-label]').evaluateAll(nodes=>nodes.map(node=>[node.dataset.hlRoute,node.dataset.diverRoute,node.dataset.portalLabel,node.dataset.actionLabel]))).toEqual(routes);
    if(locale==='en')await expect(board.locator(role==='diver'?'.hl-diver-head h1':'.hl-role-head h1')).toContainText(title);
    await assertInsideViewport(page,localeSwitch(page),viewport.width);
    if(role!=='diver'){
     if(viewport.width>760){const nav=await board.locator('.hl-portal-nav').boundingBox(),main=await board.locator('.hl-portal-main').boundingBox();if(locale==='en'){expect(nav.x).toBeLessThanOrEqual(1);expect(main.x).toBeGreaterThanOrEqual(nav.x+nav.width-1)}else{expect(nav.x+nav.width).toBeGreaterThanOrEqual(viewport.width-1);expect(main.x+main.width).toBeLessThanOrEqual(nav.x+1)}}
     else{const menu=board.locator('[data-portal-menu]');await menu.click();await expect(menu).toHaveAttribute('aria-expanded','true');await assertInsideViewport(page,board.locator('.hl-portal-nav'),viewport.width);await page.keyboard.press('Escape');await expect(menu).toHaveAttribute('aria-expanded','false');await expect(menu).toBeFocused()}
    }
   }
   if(role==='organization'){
    if(viewport.width<=760)await board.locator('[data-portal-menu]').click();await board.locator('[data-portal-label="بيانات الجهات"]').click();
    const service=page.locator('.hl-organizations'),draft=service.locator('[name=displayName]');await expect(service).toBeVisible();await draft.fill('A&B <مسودة جهة>');
    for(const locale of ['ar','en']){
     await switchTo(page,locale);await expect(draft).toHaveValue('A&B <مسودة جهة>');const box=await assertInsideViewport(page,service,viewport.width);
     const alignment=await service.locator('label').first().evaluate(node=>getComputedStyle(node).textAlign);expect(['start',locale==='en'?'left':'right']).toContain(alignment);
     if(viewport.width>760){const nav=await board.locator('.hl-portal-nav').boundingBox();if(locale==='en')expect(box.x).toBeGreaterThanOrEqual(nav.x+nav.width-1);else expect(box.x+box.width).toBeLessThanOrEqual(nav.x+1)}
     await testInfo.attach('locale-organization-service-'+locale+'-'+viewport.width,{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
    }
    if(viewport.width<=760)await board.locator('[data-portal-menu]').click();await board.locator('.hl-portal-nav-item').first().click();await expect(service).toBeHidden();
   }
  }
  state.roles=[];
  await openWorkspaceSwitcher(page);
  await expect(page.locator('.hl-role-dashboard')).toHaveCount(0);
  await expect(page.locator('#role-dialog [data-role="admin"]')).toBeDisabled();expect(state.writes).toEqual([]);
 });
}
