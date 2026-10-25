import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

// Actual freshness module with deterministic deferred authority responses.
// No network, production account, real role grant, or timeout-to-green retry.
const source=readFileSync(new URL('../src/hydroland-portal-access-freshness.js',import.meta.url),'utf8');
async function setup(page){
  await page.setContent('<button id="exit-role">Exit</button><button id="role-switch">Switch</button><dialog id="role-dialog"><button data-role="admin">Admin</button><button data-role="diver">Diver</button></dialog><div id="private-view">Private readiness fixture</div>');
  await page.evaluate(()=>{
    const s=window.fixture={session:1,authenticated:true,role:'admin',accountId:'actor-a',roles:[{role:'ADMIN',status:'ACTIVE'}],calls:[],cleared:0};
    window.HydrolandProfileData={profile:{id:s.accountId,roles:structuredClone(s.roles)}};
    const clear=()=>{s.cleared++;document.querySelector('#private-view').textContent='';};
    window.HydrolandPortalAccess={getCurrentRole:()=>s.role,clearProtectedPortal:clear,roleAllowed:role=>s.authenticated&&(role==='diver'||window.HydrolandProfileData?.profile?.roles?.some(x=>x.role==='ADMIN'&&x.status==='ACTIVE'))};
    document.querySelector('#exit-role').addEventListener('click',()=>{s.role='diver';clear();});
    window.HydrolandAuth={isAuthenticated:()=>s.authenticated,getSessionVersion:()=>s.session,authorizedFetch:path=>{
      if(path!=='/me')throw Error('Unexpected request');
      const c={session:s.session,body:{id:s.accountId,roleAssignments:structuredClone(s.roles)},done:false};s.calls.push(c);
      return new Promise(resolve=>{c.release=(status=200)=>{if(c.done)throw Error('Duplicate completion');c.done=true;resolve({ok:status>=200&&status<300,status,json:async()=>structuredClone(c.body)});};});
    }};
  });
  await page.addScriptTag({content:source});
}
const calls=page=>page.evaluate(()=>fixture.calls.length);
const release=(page,n,status=200)=>page.evaluate(({n,status})=>fixture.calls[n].release(status),{n,status});
const startRefresh=page=>page.evaluate(()=>{window.refreshResult=null;window.pendingRefresh=window.HydrolandPortalFreshness.refresh().then(r=>window.refreshResult=r);});

test('visibility revalidation must read authority sampled after an older in-flight request',async({page})=>{
  await setup(page);await startRefresh(page);expect(await calls(page)).toBe(1);
  await page.evaluate(()=>{fixture.roles=[];document.dispatchEvent(new Event('visibilitychange'));});
  await release(page,0);
  await expect.poll(()=>calls(page)).toBe(2);
  await release(page,1);
  await expect.poll(()=>page.evaluate(()=>fixture.role)).toBe('diver');
  await expect(page.locator('#private-view')).toHaveText('');
  await expect(page.locator('[data-role=admin]')).toBeDisabled();
});

test('action authorization still requires a post-action authority read',async({page})=>{
  await setup(page);await startRefresh(page);
  await page.evaluate(()=>{fixture.roles=[];window.actionResult=null;window.actionPromise=HydrolandPortalFreshness.authorizeRole('admin').then(r=>window.actionResult=r);});
  await release(page,0);await expect.poll(()=>calls(page)).toBe(2);await release(page,1);
  await expect.poll(()=>page.evaluate(()=>window.actionResult)).toBe(false);
  expect(await page.evaluate(()=>fixture.role)).toBe('diver');
});

for(const status of [200,403])test(`late old-session ${status} cannot populate or clear a new session or displace its refresh`,async({page})=>{
  await setup(page);await startRefresh(page);
  await page.evaluate(()=>{
    fixture.session++;fixture.accountId='actor-b';fixture.roles=[];fixture.role='diver';
    window.HydrolandProfileData={profile:{id:'actor-b',roles:[],marker:'keep-new-session'}};
    document.dispatchEvent(new Event('hydroland:auth-changed'));
    window.newResult=null;window.newPending=HydrolandPortalFreshness.refresh().then(r=>window.newResult=r);
  });
  expect(await calls(page)).toBe(2);
  await release(page,0,status);await page.evaluate(()=>window.pendingRefresh);
  expect(await page.evaluate(()=>window.HydrolandProfileData.profile)).toEqual({id:'actor-b',roles:[],marker:'keep-new-session'});
  await page.evaluate(()=>{window.joinedResult=null;window.joined=HydrolandPortalFreshness.refresh().then(r=>window.joinedResult=r);});
  expect(await calls(page)).toBe(2);
  await release(page,1);await page.evaluate(()=>Promise.all([window.newPending,window.joined]));
  expect(await page.evaluate(()=>({id:HydrolandProfileData.profile.id,roles:HydrolandProfileData.profile.roles,newResult,joinedResult}))).toEqual({id:'actor-b',roles:[],newResult:true,joinedResult:true});
});

test('logout while a refresh is pending cannot reinstall roles',async({page})=>{
  await setup(page);await startRefresh(page);
  await page.evaluate(()=>{fixture.session++;fixture.authenticated=false;window.HydrolandProfileData=undefined;document.dispatchEvent(new Event('hydroland:session-cleared'));});
  await release(page,0);await page.evaluate(()=>window.pendingRefresh);
  expect(await page.evaluate(()=>window.HydrolandProfileData)).toBeUndefined();
  expect(await page.evaluate(()=>window.refreshResult)).toBe(false);
});

test('failed new visibility read fails closed rather than trusting the old successful sample',async({page})=>{
  await setup(page);await startRefresh(page);await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await release(page,0);await expect.poll(()=>calls(page)).toBe(2);await release(page,1,503);
  await expect.poll(()=>page.evaluate(()=>fixture.role)).toBe('diver');
  await expect(page.locator('#private-view')).toHaveText('');
});

test('overlapping visibility events share only the new authority read',async({page})=>{
  await setup(page);await startRefresh(page);
  await page.evaluate(()=>{fixture.roles=[];document.dispatchEvent(new Event('visibilitychange'));document.dispatchEvent(new Event('visibilitychange'));});
  await release(page,0);await expect.poll(()=>calls(page)).toBe(2);await release(page,1);
  await expect.poll(()=>page.evaluate(()=>fixture.role)).toBe('diver');expect(await calls(page)).toBe(2);
});

test('a stale visibility continuation does not send requests for a replacement session',async({page})=>{
  await setup(page);await startRefresh(page);await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await page.evaluate(()=>{fixture.session++;fixture.role='diver';fixture.accountId='actor-b';window.HydrolandProfileData={profile:{id:'actor-b',roles:[]}};document.dispatchEvent(new Event('hydroland:auth-changed'));});
  await release(page,0);await page.evaluate(()=>window.pendingRefresh);
  expect(await calls(page)).toBe(1);expect(await page.evaluate(()=>HydrolandProfileData.profile.id)).toBe('actor-b');
});
