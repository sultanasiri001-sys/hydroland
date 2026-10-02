import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const roles=['DIVER','INSTRUCTOR','DIVE_CENTER','BOAT_OWNER','ORGANIZATION','ADMIN'];
for(const viewport of [{name:'desktop',width:1536,height:864},{name:'tablet',width:768,height:1024},{name:'mobile',width:390,height:844}]){
 test(`rebuilt portal compositions and service navigation work on ${viewport.name}`,async({page},testInfo)=>{
  test.setTimeout(90_000);
  await page.setViewportSize(viewport);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/api/v1/**',route=>{
   const path=new URL(route.request().url()).pathname;
   if(path.endsWith('/me'))return json(route,{id:'portal-visual-account',status:'ACTIVE',email:'review@hydroland.test',roleAssignments:roles.map(role=>({id:'visual-'+role,role,status:'ACTIVE'})),person:{firstName:'حساب',lastName:'الاختبار',professional:null}});
   if(path.endsWith('/me/diver-profile'))return json(route,{profile:{medicalFitnessStatus:'FIT'},equipment:[]});
   if(path.endsWith('/themes/active'))return json(route,{themeId:'ocean-horizon'});
   if(path.endsWith('/maps/public-config'))return json(route,{enabled:false,status:'NOT_SELECTED'});
   if(path.endsWith('/weather/public-config'))return json(route,{configured:false,status:'NOT_SELECTED'});
   return json(route,[]);
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandWorkspaceUI&&window.HydrolandPublicUI&&window.HydrolandPortalFreshness));
  await expect(page.locator('#home')).toBeVisible();await expect(page.locator('.hl-login')).toBeHidden();
  expect(await page.locator('link[rel="stylesheet"]').evaluateAll(nodes=>nodes.map(n=>n.href).filter(url=>/hydroland-(premium|v2|mobile-reset|visual-qa|reference-portals|role-dashboards|diver-dashboard|visitor|public-layout)\.css/.test(url)))).toEqual([]);
  await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','portal-visual-access');sessionStorage.setItem('hl-refresh-token','portal-visual-refresh');window.HydrolandAuth.syncAuthUi();document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));await window.HydrolandProfile.load();await document.fonts.ready});
  for(const role of ['diver','instructor','center','boat','organization','admin']){
   if(role!=='diver'){await openWorkspaceSwitcher(page);await page.locator(`#role-dialog [data-role="${role}"]`).click()}
   await expect(page.locator('body')).toHaveAttribute('data-hl-workspace-role',role);
   const board=page.locator(role==='diver'?'#hl-diver-dashboard':`.hl-role-dashboard[data-role="${role}"]`);
   await expect(board).toBeVisible();await expect(page.locator('#home')).toBeHidden();
   if(viewport.name==='mobile')await page.evaluate(()=>{document.querySelector('.sidebar')?.classList.remove('open');document.querySelector('.hl-role-dashboard')?.classList.remove('hl-portal-nav-open')});
   await page.evaluate(()=>window.scrollTo(0,0));
   const geometry=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,mainChildren:[...document.querySelector('#main').children].filter(node=>node.getClientRects().length>0).map(node=>node.id||node.className)}));
   expect(geometry.scroll,JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.width+1);
   expect(geometry.mainChildren).toHaveLength(1);
   if(role==='diver'){
    const hero=await board.locator('.hl-diver-head').boundingBox();
    for(const selector of ['.hl-diver-head h1','.hl-diver-head .primary-button']){
     const content=await board.locator(selector).boundingBox();
     expect(content.y,`${selector} must fit inside the hero`).toBeGreaterThanOrEqual(hero.y);
     expect(content.y+content.height,`${selector} must not be clipped`).toBeLessThanOrEqual(hero.y+hero.height);
    }
   }
   await expect(board.locator(role==='diver'?'.hl-diver-action-grid>button':'.hl-command-grid>button')).toHaveCount(['organization','admin','boat'].includes(role)?10:6);
   await expect(page.locator('#toast')).not.toHaveClass(/visible/);
   await page.screenshot({path:testInfo.outputPath(`portal-${role}-${viewport.name}.png`),fullPage:true});
   if(role==='boat')await expect(board.locator('[data-action-label="إنشاء رحلة"]')).toBeDisabled();
   // Exercise routing through the real workspace shell, then restore its home.
   if(role==='diver'){
    await board.locator('[data-diver-route="trips"]').first().click();
    await expect(page.locator('#trips')).toBeVisible();await expect(board).toBeHidden();
    if(viewport.name==='mobile')await page.locator('#menu').click();
    await page.locator('#navigation a[href="#hl-diver-dashboard"]').click();await expect(board).toBeVisible();
   }else if(role==='instructor'){
    await board.locator('[data-action-label="إدارة الدورات"]').click();
    await expect(page.locator('.hl-training')).toBeVisible();await expect(board.locator('.hl-portal-content')).toBeHidden();
    await board.locator('[data-portal-home]').click();await expect(board.locator('.hl-portal-content')).toBeVisible();
   }
  }
  // Loading an admin-only feature must not make it available in another workspace.
  await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="center"]').click();
  const center=page.locator('.hl-role-dashboard[data-role="center"]');
  await expect(center.locator('[data-action-label="المخزون والمعدات"]')).toBeEnabled();
  await expect(center.locator('[data-action-label="إدارة الرحلات"]')).toBeEnabled();
  await center.locator('[data-action-label="المخزون والمعدات"]').click();
  await expect(page.locator('#hl-center-equipment')).toBeVisible();
  await expect(page.locator('.hl-inventory')).toBeHidden();
  expect(errors).toEqual([]);
 });
}
