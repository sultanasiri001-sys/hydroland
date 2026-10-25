import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';

test('switcher helper retargets a dashboard control removed after visibility inspection',async({page})=>{
 await page.setContent('<div class="hl-role-dashboard"><button data-portal-switch>Protected switch</button></div><button id="role-switch">Public switch</button><dialog id="role-dialog">Roles</dialog>');
 await page.evaluate(()=>{window.HydrolandPortalFreshness={};document.querySelector('#role-switch').onclick=()=>document.querySelector('#role-dialog').showModal();});
 let removed=false;
 const racingPage={waitForFunction:page.waitForFunction.bind(page),locator:selector=>{
  const locator=page.locator(selector);
  if(selector!=='.hl-role-dashboard [data-portal-switch]')return locator;
  let probes=0;
  return new Proxy(locator,{get(target,key){
   if(key==='isVisible')return async()=>{
    const visible=await target.isVisible();probes++;
    // The helper probes once for menu state, then again immediately before click.
    if(visible&&probes===2){await page.evaluate(()=>document.querySelector('[data-portal-switch]').remove());removed=true;}
    return visible;
   };
   const value=target[key];return typeof value==='function'?value.bind(target):value;
  }});
 }};
 await openWorkspaceSwitcher(racingPage);expect(removed).toBe(true);await expect(page.locator('#role-dialog')).toBeVisible();
});

test('switcher helper does not mask a still-present disabled dashboard control',async({page})=>{
 await page.setContent('<div class="hl-role-dashboard"><button data-portal-switch disabled>Disabled switch</button></div><button id="role-switch">Public switch</button><dialog id="role-dialog">Roles</dialog>');
 await page.evaluate(()=>{window.HydrolandPortalFreshness={};document.querySelector('#role-switch').onclick=()=>document.querySelector('#role-dialog').showModal();});
 await expect(openWorkspaceSwitcher(page)).rejects.toThrow(/Timeout/);await expect(page.locator('#role-dialog')).not.toBeVisible();
});
