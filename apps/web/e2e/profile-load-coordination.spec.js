import {test,expect} from '@playwright/test';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const account={id:'profile-load-order',email:'profile-order@example.invalid',status:'ACTIVE',person:{firstName:'عضو',lastName:'اختبار'},roleAssignments:[{role:'DIVER',status:'ACTIVE'}]};
const install=async page=>{
  await page.setViewportSize({width:390,height:844});
  await page.clock.install();
  await page.route('**/api/v1/**',route=>json(route,[]));
  await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
  await page.route(/\/api\/v1\/me$/,route=>json(route,account));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{message:'Unavailable'},503));
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile));
  // Drain the 500 ms bootstrap load before installing the two-request transport.
  // Otherwise startup can create an uncontrolled third request held forever.
  await page.clock.runFor(500);
  await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'load-order-access',refreshToken:'load-order-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
  await page.locator('#profile-open').click();
  await page.locator('#profile-dialog [data-hl-action="diver-profile"]').click();
  await expect(page.locator('#hl-diver-editor [data-diver-retry]')).toBeVisible();
};

for(const scenario of [{name:'successful older request',failOld:false,revoke:false},{name:'failed older request',failOld:true,revoke:false},{name:'session revocation',failOld:false,revoke:true}]){
  test(`profile retry waits for the replacement load: ${scenario.name}`,async({page})=>{
    await install(page);
    const result=await page.evaluate(async({account,failOld,revoke})=>{
      const original=window.HydrolandAuth.authorizedFetch,pending=[];
      const response=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
      window.HydrolandAuth.authorizedFetch=(path,options)=>{
        if(path==='/me/diver-profile'&&(!options?.method||options.method==='GET'))return new Promise(resolve=>pending.push(resolve));
        if(path==='/me')return Promise.resolve(response(account));
        if(path==='/credentials')return Promise.resolve(response([]));
        return original(path,options);
      };
      try{
        const editor=document.getElementById('hl-diver-editor'),form=editor.querySelector('form');
        editor.querySelector('[data-diver-retry]').click();
        const newest=window.HydrolandProfile.load();
        if(pending.length!==2)throw new Error(`Expected two controlled requests, got ${pending.length}`);
        pending[0](response(failOld?{message:'Unavailable'}:{profile:{primaryPhone:'0500000000'},equipment:[]},failOld?503:200));
        for(let i=0;i<20;i++)await Promise.resolve();
        const beforeReady=form.dataset.profileReady,beforeBusy=form.getAttribute('aria-busy');
        if(revoke)window.HydrolandAuth.terminateSession();
        pending[1](response({profile:{primaryPhone:'0552222222',emergencyName:'جهة اختبار',emergencyPhone:'0500000001',medicalFitnessStatus:'FIT'},equipment:[]}));
        await newest;for(let i=0;i<20;i++)await Promise.resolve();
        return {beforeReady,beforeBusy,phone:form.elements.primaryPhone.value,ready:form.dataset.profileReady,available:window.HydrolandProfileData?.diverProfileAvailable,authenticated:window.HydrolandAuth.isAuthenticated()};
      }finally{window.HydrolandAuth.authorizedFetch=original;}
    },{account,...scenario});
    expect(result.beforeReady).toBe('0');expect(result.beforeBusy).toBe('true');
    if(scenario.revoke){expect(result.authenticated).toBe(false);expect(result.available).toBeUndefined();expect(result.ready).toBe('0');}
    else{expect(result.phone).toBe('0552222222');expect(result.ready).toBe('1');expect(result.available).toBe(true);}
  });
}
