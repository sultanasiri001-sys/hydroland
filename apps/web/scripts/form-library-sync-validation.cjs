'use strict';
// Actual editor in Chromium with synthetic authorization responses, not live accounts.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('@playwright/test');
const source=fs.readFileSync(path.join(__dirname,'../src/hydroland-form-library.js'),'utf8');
let browser,passed=0;
async function setup({noChannel=false,role='OWNER'}={}){
 const context=await browser.newContext();await context.route('**/*',route=>route.abort());
 const page=await context.newPage();page.setDefaultTimeout(5000);
 await page.setContent('<section id="hl-documents"><header class="hl-doc-head"></header><select data-doc-org><option value="org-a">A</option><option value="org-b">B</option></select><form data-doc-form><select data-doc-template><option value="t1">T</option></select><div data-doc-fields><input id="draft"></div></form></section>');
 await page.evaluate(({noChannel,role})=>{
  const t={id:'t1',code:'HR-CI',organizationId:'org-a',department:'HR',version:1,status:'ACTIVE',titleAr:'الأصل',titleEn:'Original',printable:true,fields:[{key:'name',type:'TEXT',labelAr:'الاسم',labelEn:'Name',required:true}]};
  window.fixture={rows:[t],calls:[],session:1,authenticated:true,delay:false,release:null,status:200,refreshes:0,messages:[],channelHandler:null,interval:null,previewStatus:200,previewDelay:false,previewRelease:null,logoId:null,logoStatus:200};
  const s=window.fixture;
  window.setInterval=(handler,milliseconds)=>{s.interval={handler,milliseconds};return 1;};
  window.BroadcastChannel=noChannel?undefined:class{addEventListener(type,handler){s.channelHandler=handler;}postMessage(data){s.messages.push(data);}};
  window.HydrolandDocuments={refresh:async()=>{s.refreshes++;document.querySelector('#draft').value='';}};
  window.HydrolandAuth={isAuthenticated:()=>s.authenticated,getSessionVersion:()=>s.session,authorizedFetch:async(url,options={})=>{
   s.calls.push({url,method:options.method||'GET',cache:options.cache,body:options.body?JSON.parse(options.body):null});
   const response=(data,status=200)=>new Response(JSON.stringify(data),{status});
   if(url==='/documents/workspace')return response([{role,status:'ACTIVE',organization:{id:'org-a',displayName:'A'}}]);
   if(url.endsWith('/branding'))return response({organizationId:'org-a',brandNameAr:'A',logoAssetId:s.logoId});
   if(url.includes('/branding/logo/'))return new Response(s.logoStatus===200?Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6DUYAAAAASUVORK5CYII='),c=>c.charCodeAt(0)):null,{status:s.logoStatus,headers:{'Content-Type':'image/png'}});
   if(url.endsWith('/preview-pdf')){
    const status=s.previewStatus;if(s.previewDelay)await new Promise(resolve=>s.previewRelease=resolve);
    return status===200?new Response('%PDF-1.4 synthetic browser fixture, not a real renderer test',{headers:{'Content-Type':'application/pdf'}}):response({message:'preview rejected'},status);
   }
   if(url.endsWith('/templates')){
    const rows=structuredClone(s.rows),status=s.status;
    if(s.delay)await new Promise(resolve=>s.release=resolve);
    return response(status===200?rows:{message:'permission denied'},status);
   }
   if(options.method==='PUT'){
    const b=JSON.parse(options.body),next={...s.rows[0],...b,id:'t2',version:2};s.rows=[next];return response(next);
   }
   throw new Error('Unexpected fixture request '+url);
  }};
  window.publishElsewhere=()=>{s.rows=[{...s.rows[0],id:'t2',version:2,titleAr:'إصدار آخر',titleEn:'Other revision'}];};
 },{noChannel,role});
 await page.addScriptTag({content:source});await page.locator('[data-hfl-open]').click();
 await page.waitForFunction(()=>document.querySelector('[data-hfl-note]').textContent.includes('قالب نشط'));
 return{page,context};
}
async function check(name,fn,options){const x=await setup(options);try{await fn(x.page);passed++;console.log('PASS '+name);}finally{await x.context.close();}}
const title=page=>page.locator('#hl-form-library [name=titleAr]');
const update=page=>page.evaluate(()=>HydrolandFormLibrary.checkForUpdates());
(async()=>{
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox']});
 await check('clean editor loads a new authorized version without document refresh',async p=>{await p.evaluate(()=>document.querySelector('#draft').value='مدخلات محفوظة');await p.evaluate(()=>publishElsewhere());await update(p);assert.equal(await title(p).inputValue(),'إصدار آخر');assert.equal(await p.locator('#draft').inputValue(),'مدخلات محفوظة');assert.equal(await p.evaluate(()=>fixture.refreshes),0);assert.equal(await p.evaluate(()=>fixture.calls.every(c=>c.method==='GET'&&c.cache==='no-store')),true);});
 await check('dirty editor retains content and cancels prior consent',async p=>{await title(p).fill('تعديلي');await p.locator('[data-hfl-confirm]').check();await p.evaluate(()=>publishElsewhere());await update(p);assert.equal(await title(p).inputValue(),'تعديلي');assert.equal(await p.locator('[data-hfl-confirm]').isChecked(),false);assert.match(await p.locator('[data-hfl-note]').innerText(),/تعديلاتك باقية/);});
 await check('edits made during a pending read are not replaced',async p=>{await p.evaluate(()=>{publishElsewhere();fixture.delay=true;void HydrolandFormLibrary.checkForUpdates();});await p.waitForFunction(()=>!!fixture.release);await title(p).fill('كتابة أثناء القراءة');await p.evaluate(()=>fixture.release());await p.waitForFunction(()=>document.querySelector('[data-hfl-note]').textContent.includes('تعديلاتك باقية'));assert.equal(await title(p).inputValue(),'كتابة أثناء القراءة');});
 for(const status of [200,403])await check('late '+status+' after logout cannot repopulate or erase new session',async p=>{
  await p.evaluate(status=>{publishElsewhere();fixture.status=status;fixture.delay=true;void HydrolandFormLibrary.checkForUpdates();},status);await p.waitForFunction(()=>!!fixture.release);
  await p.evaluate(()=>{fixture.session++;document.dispatchEvent(new Event('hydroland:session-cleared'));fixture.status=200;fixture.delay=false;HydrolandFormLibrary.open();});
  await p.waitForFunction(()=>document.querySelector('[data-hfl-note]').textContent.includes('قالب نشط'));await p.evaluate(()=>fixture.release());await p.evaluate(()=>new Promise(r=>setTimeout(r,20)));
  assert.equal(await p.locator('#hl-form-library').isVisible(),true);assert.equal(await title(p).inputValue(),'إصدار آخر');
 });
 await check('current denial clears private editor',async p=>{await p.evaluate(()=>fixture.status=403);await update(p);assert.equal(await p.locator('#hl-form-library').isVisible(),false);assert.equal(await p.locator('[data-hfl-preview]').innerText(),'');});
 await check('foreign organization response is rejected without overwriting content',async p=>{await p.evaluate(()=>{publishElsewhere();fixture.rows[0].organizationId='org-b';});await update(p);assert.equal(await title(p).inputValue(),'الأصل');assert.match(await p.locator('[data-hfl-note]').innerText(),/تعذر التحقق/);});
 await check('closed editor does not poll private templates',async p=>{await p.locator('[data-hfl-close]').click();const n=await p.evaluate(()=>fixture.calls.length);await update(p);assert.equal(await p.evaluate(()=>fixture.calls.length),n);});
 await check('periodic fallback works without BroadcastChannel',async p=>{await p.evaluate(()=>{publishElsewhere();fixture.interval.handler();});await p.waitForFunction(()=>document.querySelector('#hl-form-library [name=titleAr]').value==='إصدار آخر');assert.equal(await p.evaluate(()=>fixture.interval.milliseconds),60000);},{noChannel:true});
 await check('read-only member updates without gaining edit rights',async p=>{await p.evaluate(()=>publishElsewhere());await update(p);assert.equal(await title(p).inputValue(),'إصدار آخر');assert.equal(await p.locator('[data-hfl-publish]').isDisabled(),true);},{role:'VIEWER'});
 await check('content-free invalidation triggers an authorized reread',async p=>{await p.evaluate(()=>{publishElsewhere();fixture.channelHandler({data:{type:'invalidate',organizationId:'ignored-foreign'}});});await p.waitForFunction(()=>document.querySelector('#hl-form-library [name=titleAr]').value==='إصدار آخر');assert.equal(await p.evaluate(()=>fixture.calls.every(c=>!c.url.includes('ignored-foreign'))),true);});
 await check('own publication broadcasts no form or identity data',async p=>{await title(p).fill('منشور');await p.locator('[data-hfl-confirm]').check();await p.locator('[data-hfl-publish]').click();await p.waitForFunction(()=>fixture.messages.length===1);assert.deepEqual(await p.evaluate(()=>fixture.messages),[{type:'invalidate'}]);});
 await check('PDF preview sends scoped editable values without publishing',async p=>{
  await title(p).fill('معاينة فقط');await p.locator('[data-hfl-pdf-preview]').click();await p.waitForFunction(()=>!document.querySelector('[data-hfl-pdf-result]').hidden);
  const calls=await p.evaluate(()=>fixture.calls.filter(c=>c.method!=='GET'));assert.equal(calls.length,1);assert.equal(calls[0].url,'/documents/organizations/org-a/templates/t1/preview-pdf');assert.equal(calls[0].body.titleAr,'معاينة فقط');assert.match(await p.locator('[data-hfl-pdf-open]').getAttribute('href'),/^blob:/);
 });
 await check('read-only PDF preview never submits editable values',async p=>{
  await p.locator('[data-hfl-pdf-preview]').click();await p.waitForFunction(()=>!document.querySelector('[data-hfl-pdf-result]').hidden);assert.deepEqual(await p.evaluate(()=>fixture.calls.find(c=>c.url.endsWith('/preview-pdf')).body),{});
 },{role:'VIEWER'});
 await check('editing invalidates an already displayed PDF',async p=>{
  await p.locator('[data-hfl-pdf-preview]').click();await p.waitForFunction(()=>!document.querySelector('[data-hfl-pdf-result]').hidden);await title(p).fill('تعديل جديد');assert.equal(await p.locator('[data-hfl-pdf-result]').isVisible(),false);assert.equal(await p.locator('[data-hfl-pdf-frame]').getAttribute('src'),null);assert.equal(await p.locator('[data-hfl-pdf-open]').getAttribute('href'),null);
 });
 await check('late PDF response cannot overwrite a more recent edit',async p=>{
  await p.evaluate(()=>fixture.previewDelay=true);await p.locator('[data-hfl-pdf-preview]').click();await p.waitForFunction(()=>!!fixture.previewRelease);await title(p).fill('أحدث من المعاينة');await p.evaluate(()=>fixture.previewRelease());await p.evaluate(()=>new Promise(r=>setTimeout(r,20)));assert.equal(await p.locator('[data-hfl-pdf-result]').isVisible(),false);assert.equal(await title(p).inputValue(),'أحدث من المعاينة');
 });
 await check('revoked preview permission clears private state',async p=>{
  await p.evaluate(()=>fixture.previewStatus=403);await p.locator('[data-hfl-pdf-preview]').click();await p.waitForFunction(()=>!document.querySelector('#hl-form-library').open);assert.equal(await p.locator('[data-hfl-pdf-frame]').getAttribute('src'),null);
 });
 await check('failed preview retains entered values and enables retry',async p=>{
  await title(p).fill('احتفظ بهذا');await p.evaluate(()=>fixture.previewStatus=500);await p.locator('[data-hfl-pdf-preview]').click();await p.waitForFunction(()=>document.querySelector('[data-hfl-pdf-status]').textContent.includes('preview rejected'));assert.equal(await title(p).inputValue(),'احتفظ بهذا');assert.equal(await p.locator('[data-hfl-pdf-preview]').isDisabled(),false);
 });
 await check('authorized secondary logo uses an in-memory private blob',async p=>{
  await p.evaluate(()=>fixture.logoId='asset-1');await p.locator('[data-hfl-reload]').click();await p.waitForFunction(()=>document.querySelector('[data-hfl-preview] img[alt="شعار الجهة"]'));
  assert.match(await p.locator('[data-hfl-preview] img[alt="شعار الجهة"]').getAttribute('src'),/^blob:/);assert.equal(await p.evaluate(()=>fixture.calls.some(c=>c.url==='/documents/organizations/org-a/branding/logo/asset-1'&&c.cache==='no-store')),true);
  await p.evaluate(()=>{fixture.session++;document.dispatchEvent(new Event('hydroland:session-cleared'));});assert.equal(await p.locator('[data-hfl-preview] img').count(),0);
 });
 await check('revoked secondary-logo permission closes the current editor',async p=>{
  await p.evaluate(()=>{fixture.logoId='asset-1';fixture.logoStatus=403;});await p.locator('[data-hfl-reload]').click();await p.waitForFunction(()=>!document.querySelector('#hl-form-library').open);assert.equal(await p.locator('[data-hfl-preview]').innerText(),'');
 });
 console.log(`${passed} isolated synchronization and preview editor checks passed. No production acceptance claimed.`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>browser?.close());
