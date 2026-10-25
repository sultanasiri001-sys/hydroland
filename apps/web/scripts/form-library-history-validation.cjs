'use strict';
// Actual browser/editor source; isolated DOM and synthetic authorized-fetch fixtures.
// No HTTP server, PostgreSQL, real account, or production acceptance is exercised.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('@playwright/test');
const source=fs.readFileSync(path.join(__dirname,'../src/hydroland-form-library.js'),'utf8');
let browser,passed=0;
async function setup(options={}) {
 const context=await browser.newContext({viewport:{width:1100,height:900}});
 await context.route('**/*',route=>route.abort());
 const page=await context.newPage();page.setDefaultTimeout(5000);
 await page.setContent('<section id="hl-documents"><div class="hl-doc-head"></div><select data-doc-org><option value="org-a">A</option><option value="org-b">B</option></select><form data-doc-form><select data-doc-template><option value="t3">T</option></select><div data-doc-fields><input id="draft-input"></div></form></section>');
 await page.evaluate(options=>{
  const make=(version,code='HR-TEST',org='org-a')=>({id:`${org}-${code}-v${version}`,organizationId:org,code,department:'HR',version,status:version===3?'ACTIVE':'INACTIVE',titleAr:`نموذج الإصدار ${version}`,titleEn:`Form version ${version}`,printable:true,fields:[{key:'name',type:'TEXT',labelAr:'الاسم',labelEn:'Name',required:true},{key:'reason',type:'SELECT',labelAr:'السبب',labelEn:'Reason',required:false,options:['A','B']}]});
  const count=options.count||3,rows=Array.from({length:count},(_,i)=>make(count-i));rows[0].status='ACTIVE';rows.slice(1).forEach(r=>r.status='INACTIVE');
  rows.at(-1).titleAr='النموذج السابق';rows.at(-1).fields.reverse();rows.at(-1).fields[0].required=true;rows.at(-1).printable=false;
  const s=window.fixture={role:options.role||'OWNER',session:1,authenticated:true,rows,active:[structuredClone(rows[0])],calls:[],writes:[],refreshes:0,delay:false,release:null,historyStatus:200,historyMode:'',putStatus:200,stale:false,signed:{templateId:'historical-template',signature:'synthetic-only'}};
  const second=make(3,'HR-OTHER');second.titleAr='قالب آخر';second.status='ACTIVE';s.active.push(second);
  window.HydrolandDocuments={refresh:async()=>{s.refreshes++;document.querySelector('#draft-input').value='';}};
  window.HydrolandAuth={isAuthenticated:()=>s.authenticated,getSessionVersion:()=>s.session,authorizedFetch:async(p,init={})=>{
   const method=init.method||'GET';s.calls.push({path:p,method,cache:init.cache,body:init.body?JSON.parse(init.body):null});
   const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
   if(p==='/documents/workspace')return response(['org-a','org-b'].map(id=>({role:s.role,status:'ACTIVE',organization:{id,displayName:id}})));
   if(p.endsWith('/branding'))return response({organizationId:p.includes('org-b')?'org-b':'org-a',brandNameAr:'جهة اختبار',brandVersion:1});
   if(p.includes('/history')){
    const before=Number(new URL(p,'https://fixture.invalid').searchParams.get('beforeVersion'))||Infinity;
    const available=s.rows.filter(r=>r.version<before),items=structuredClone(available.slice(0,25));
    let body={organizationId:'org-a',code:'HR-TEST',department:'HR',items,nextBeforeVersion:available.length>25?items.at(-1).version:null};
    if(s.historyMode==='scope')body.organizationId='org-b';
    if(s.historyMode==='duplicate')body.items.push(structuredClone(items.at(-1)));
    if(s.historyMode==='cursor')body.nextBeforeVersion=items[0].version+1;
    const status=s.historyStatus;
    if(s.delay)await new Promise(resolve=>s.release=resolve);
    return response(status===200?body:{message:'History denied'},status);
   }
   if(method==='PUT'){
    if(s.putStatus!==200)return response({message:'Publish rejected'},s.putStatus);
    const b=JSON.parse(init.body),old=s.active[0];
    const next={...structuredClone(old),...b,id:`published-v${old.version+1}`,version:old.version+1};s.writes.push({path:p,body:b});s.active[0]=next;return response(next);
   }
   if(p.endsWith('/templates')){
    let active=structuredClone(s.active);
    if(s.stale){active[0].id='newer-template';active[0].version++;}
    if(p.includes('org-b'))active=active.map(r=>({...r,organizationId:'org-b',id:'b-'+r.id}));
    return response(active);
   }
   throw new Error('Unexpected synthetic request: '+p);
  }};
 },options);
 await page.addScriptTag({content:source});
 await page.locator('[data-hfl-open]').click();
 await page.waitForFunction(()=>document.querySelector('[data-hfl-note]').textContent.includes('قالب نشط'));
 return {page,context};
}
async function history(page){await page.locator('[data-hfl-history-load]').click();await page.waitForFunction(()=>!document.querySelector('[data-hfl-history-status]').textContent.includes('جارٍ'));}
async function view(page,version=1){await page.getByRole('button',{name:`معاينة الإصدار ${version}`,exact:true}).click();}
async function stage(page){await history(page);await view(page);await page.locator('[data-hfl-history-restore]').click();}
async function publish(page){await page.locator('[data-hfl-confirm]').check();await page.locator('[data-hfl-publish]').click();}
const title=page=>page.locator('#hl-form-library [name="titleAr"]');
async function check(name,fn,options={}){const x=await setup(options);try{await fn(x.page);passed++;console.log('PASS '+name);}finally{await x.context.close();}}
(async()=>{
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox']});
 await check('bounded history pages use private reads without mutations',async page=>{
  await history(page);assert.equal(await page.locator('[data-hfl-history-view]').count(),25);
  await page.locator('[data-hfl-history-more]').click();await page.waitForFunction(()=>document.querySelectorAll('[data-hfl-history-view]').length===27);
  assert.equal(await page.locator('[data-hfl-history-more]').isVisible(),false);
  const calls=await page.evaluate(()=>fixture.calls.filter(c=>c.path.includes('/history')));assert.equal(calls.length,2);assert.ok(calls[1].path.endsWith('beforeVersion=3'));assert.ok(calls.every(c=>c.cache==='no-store'&&c.method==='GET'));
 },{count:27});
 await check('restore stages editable values against current revision with fresh consent',async page=>{
  await page.locator('[data-hfl-confirm]').check();await stage(page);
  assert.equal(await title(page).inputValue(),'النموذج السابق');assert.equal(await page.locator('[data-hfl-confirm]').isChecked(),false);
  assert.match(await page.locator('[data-hfl-meta]').innerText(),/الإصدار النشط 3/);assert.equal(await page.locator('[data-hfl-required]').first().isChecked(),true);
  assert.equal(await page.evaluate(()=>fixture.calls.filter(c=>c.method!=='GET').length),0);
 });
 await check('restore publishes once through current template and keeps document input',async page=>{
  const before=await page.evaluate(()=>JSON.stringify({rows:fixture.rows,signed:fixture.signed}));
  await page.evaluate(()=>document.querySelector('#draft-input').value='بيانات لم تُحفظ');await stage(page);await publish(page);
  await page.waitForFunction(()=>document.querySelector('[data-hfl-note]').textContent.includes('حُفظ ونُشر الإصدار 4'));
  const s=await page.evaluate(()=>({writes:fixture.writes,refreshes:fixture.refreshes,old:JSON.stringify({rows:fixture.rows,signed:fixture.signed})}));
  assert.equal(s.writes.length,1);assert.equal(s.writes[0].path,'/documents/templates/org-a-HR-TEST-v3');assert.deepEqual(s.writes[0].body.fields.map(f=>f.key),['reason','name']);assert.equal(s.writes[0].body.printable,false);
  assert.equal(s.old,before);assert.equal(s.refreshes,0);assert.equal(await page.locator('#draft-input').inputValue(),'بيانات لم تُحفظ');
  assert.equal(await page.locator('[data-hfl-history-view]').count(),0);
 });
 await check('cancelled restore retains unsaved edits',async page=>{
  await title(page).fill('احتفظ بتعديلي');await history(page);await view(page);page.once('dialog',d=>d.dismiss());await page.locator('[data-hfl-history-restore]').click();assert.equal(await title(page).inputValue(),'احتفظ بتعديلي');
 });
 await check('read-only member sees history but cannot stage restoration',async page=>{
  await history(page);await view(page);assert.equal(await page.locator('[data-hfl-history-restore]').isDisabled(),true);
  await page.locator('[data-hfl-history-restore]').evaluate(e=>e.dispatchEvent(new MouseEvent('click',{bubbles:true})));
  assert.equal(await title(page).inputValue(),'نموذج الإصدار 3');
 },{role:'VIEWER'});
 for(const kind of ['key','type','options','duplicate-key'])await check('incompatible historical '+kind+' blocks restore',async page=>{
  await page.evaluate(kind=>{const fields=fixture.rows.at(-1).fields;if(kind==='key')fields[0].key='removed';if(kind==='type')fields[0].type='TEXT';if(kind==='options')fields[0].options=['changed'];if(kind==='duplicate-key')fields[1].key=fields[0].key;},kind);
  await history(page);await view(page);assert.equal(await page.locator('[data-hfl-history-restore]').isDisabled(),true);assert.match(await page.locator('[data-hfl-history-reason]').innerText(),/تختلف مفاتيح/);
 });
 await check('stale restore never submits and retains staged values',async page=>{
  await stage(page);await page.evaluate(()=>fixture.stale=true);await publish(page);await page.waitForFunction(()=>document.querySelector('[data-hfl-note]').textContent.includes('نُشر إصدار أحدث'));
  assert.equal(await title(page).inputValue(),'النموذج السابق');assert.equal(await page.evaluate(()=>fixture.calls.filter(c=>c.method==='PUT').length),0);
 });
 await check('server conflict preserves staged draft without automatic retry',async page=>{
  await stage(page);await page.evaluate(()=>fixture.putStatus=409);await publish(page);await page.waitForFunction(()=>document.querySelector('[data-hfl-note]').textContent.includes('Publish rejected'));
  assert.equal(await title(page).inputValue(),'النموذج السابق');assert.equal(await page.evaluate(()=>fixture.calls.filter(c=>c.method==='PUT').length),1);
 });
 await check('revoked publish permission clears private state',async page=>{
  await stage(page);await page.evaluate(()=>fixture.putStatus=403);await publish(page);await page.waitForFunction(()=>!document.querySelector('#hl-form-library').open);
  assert.equal(await page.locator('[data-hfl-history-list]').innerText(),'');assert.equal(await page.locator('[data-hfl-preview]').innerText(),'');assert.equal(await page.evaluate(()=>fixture.writes.length),0);
 });
 for(const status of [200,403])await check('late history '+status+' cannot affect another template',async page=>{
  await page.evaluate(status=>{fixture.delay=true;fixture.historyStatus=status;},status);await page.locator('[data-hfl-history-load]').click();await page.waitForFunction(()=>!!fixture.release);
  await page.locator('[data-hfl-template]').selectOption('org-a-HR-OTHER-v3');await page.evaluate(()=>{fixture.release();});await page.evaluate(()=>new Promise(r=>setTimeout(r,20)));
  assert.equal(await title(page).inputValue(),'قالب آخر');assert.equal(await page.locator('#hl-form-library').isVisible(),true);assert.equal(await page.locator('[data-hfl-history-view]').count(),0);
 });
 await check('logout clears history and rejects in-flight private response',async page=>{
  await history(page);await view(page);await page.evaluate(()=>fixture.delay=true);await page.locator('[data-hfl-history-load]').click();await page.waitForFunction(()=>!!fixture.release);
  await page.evaluate(()=>{fixture.authenticated=false;fixture.session++;document.dispatchEvent(new Event('hydroland:session-cleared'));fixture.release();});
  await page.waitForFunction(()=>!document.querySelector('#hl-form-library').open);assert.equal(await page.locator('[data-hfl-history-list]').innerText(),'');assert.equal(await page.locator('[data-hfl-history-detail]').innerText(),'');
 });
 await check('organization change fences pending history',async page=>{
  await page.evaluate(()=>fixture.delay=true);await page.locator('[data-hfl-history-load]').click();await page.waitForFunction(()=>!!fixture.release);
  await page.evaluate(()=>{const o=document.querySelector('[data-doc-org]');o.value='org-b';o.dispatchEvent(new Event('change'));fixture.release();});await page.waitForFunction(()=>!document.querySelector('#hl-form-library').open);
  assert.equal(await page.locator('[data-hfl-history-list]').innerText(),'');
 });
 for(const mode of ['scope','duplicate','cursor'])await check('invalid history '+mode+' cannot partially populate viewer',async page=>{
  await page.evaluate(mode=>fixture.historyMode=mode,mode);await history(page);assert.equal(await page.locator('[data-hfl-history-view]').count(),0);assert.equal(await title(page).inputValue(),'نموذج الإصدار 3');
 });
 await check('newer history revision blocks stale restoration',async page=>{
  await page.evaluate(()=>{const row=structuredClone(fixture.rows[0]);row.id='new-v4';row.version=4;fixture.rows.unshift(row);});await history(page);await view(page);assert.equal(await page.locator('[data-hfl-history-restore]').isDisabled(),true);assert.match(await page.locator('[data-hfl-history-status]').innerText(),/يوجد إصدار أحدث/);
 });
 await check('untrusted historic text stays text on a contained mobile screen',async page=>{
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{fixture.rows.at(-1).titleAr='<img src=x onerror=alert(1)>';fixture.rows.at(-1).fields[0].labelAr='عنوان طويل '.repeat(70);});await history(page);await view(page);
  assert.equal(await page.locator('[data-hfl-history-detail] img').count(),0);assert.match(await page.locator('[data-hfl-history-detail]').innerText(),/<img src=x/);
  assert.equal(await page.locator('#hl-form-library').evaluate(e=>e.scrollWidth<=e.clientWidth+2),true);
 });
 await check('later editing cancels restoration publication consent',async page=>{await stage(page);await page.locator('[data-hfl-confirm]').check();await title(page).fill('مراجعة أخرى');assert.equal(await page.locator('[data-hfl-confirm]').isChecked(),false);});
 console.log(`${passed} isolated history/editor browser checks passed. No production or database acceptance claimed.`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();});
