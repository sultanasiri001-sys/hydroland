import {test,expect} from '@playwright/test';

const json=(route,body)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
const mockPublicApi=async page=>{
  await page.route('**/api/v1/**',route=>{
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith('/maps/public-config'))return json(route,{enabled:false,status:'NOT_SELECTED'});
    if(path.endsWith('/weather/public-config'))return json(route,{configured:false,status:'NOT_SELECTED'});
    if(path.endsWith('/me/diver-profile'))return json(route,{profile:null,equipment:[]});
    if(path.endsWith('/me'))return json(route,{id:'public-layout-user',roles:[]});
    return json(route,[]);
  });
};

for(const viewport of [{name:'desktop',width:1536,height:864},{name:'tablet',width:768,height:1024},{name:'mobile',width:390,height:844}]){
  test(`public reference composition and entry actions work on ${viewport.name}`,async({page},testInfo)=>{
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    await mockPublicApi(page);
    await page.goto('/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandWorkspaceUI));
    await page.locator('.hl-login-guest').click();
    await expect(page.locator('.hl-login')).toBeHidden();
    await expect(page.locator('.topbar #search-form')).toBeVisible();
    await expect(page.locator('#search-form')).toHaveCount(1);
    await expect(page.locator('.hl-visitor-routebar>button')).toHaveCount(3);
    await expect(page.locator('[data-public-trip-state]')).toContainText('لا توجد رحلات منشورة');
    await expect(page.locator('#top-messages')).toBeHidden();
    await expect(page.locator('.hl-finance')).toBeHidden();
    await page.evaluate(()=>document.fonts.ready);
    const geometry=await page.evaluate(()=>{
      const box=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {top:r.top,height:r.height,left:r.left,right:r.right}};
      return {hero:box('#home'),trips:box('#trips'),marine:box('#marine-intelligence'),width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth};
    });
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width+1);
    expect(geometry.hero.height).toBeLessThanOrEqual(380);
    if(viewport.name==='desktop'){
      expect(geometry.trips.top).toBeLessThan(600);
      expect(Math.abs(geometry.trips.top-geometry.marine.top)).toBeLessThan(2);
    }
    await page.screenshot({path:testInfo.outputPath(`visitor-${viewport.name}.png`)});
    await page.locator('#home .ghost-button').click();
    await expect(page).toHaveURL(/#training$/);
    await page.locator('#visitor-register-cta').click();
    await expect(page.locator('.hl-login .hl-auth-panel')).toBeVisible();
    await expect(page.locator('.hl-auth-submit')).toHaveText('إنشاء الحساب');
    const authFocus=await page.evaluate(()=>({activeTag:document.activeElement?.tagName,activeName:document.activeElement?.getAttribute('name'),visibility:getComputedStyle(document.querySelector('.hl-login')).visibility,transition:getComputedStyle(document.querySelector('.hl-login')).transitionProperty}));
    await expect(page.locator('.hl-auth-panel input[name="email"]'),JSON.stringify(authFocus)).toBeFocused();
    expect(await page.evaluate(()=>window.HydrolandAuth.isAuthenticated())).toBe(false);
  });
}

test('guest header restores the single search form when the account workspace opens',async({page})=>{
  await mockPublicApi(page);
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandWorkspaceUI));
  await page.locator('.hl-login-guest').click();
  await expect(page.locator('.topbar #search-form')).toBeVisible();
  await page.evaluate(()=>{
    sessionStorage.setItem('hl-access-token','public-layout-test-access');
    sessionStorage.setItem('hl-refresh-token','public-layout-test-refresh');
    window.HydrolandAuth.syncAuthUi();
    document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));
  });
  await expect(page.locator('#home #search-form')).toHaveCount(1);
  await expect(page.locator('#search-form')).toHaveCount(1);
  await expect(page.locator('#visitor-register-cta')).toBeHidden();
});
