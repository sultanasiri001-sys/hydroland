'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=process.env.PLAYWRIGHT_DRIVER_PATH?require(process.env.PLAYWRIGHT_DRIVER_PATH):require('@playwright/test');
const library=fs.readFileSync(path.join(__dirname,'../src/hydroland-form-library.js'),'utf8'),setupSource=fs.readFileSync(path.join(__dirname,'../src/hydroland-form-setup.js'),'utf8');
let browser,passed=0;
async function setup(options={}){
 const context=await browser.newContext({viewport:{width:1100,height:900}});await context.route('**/*',route=>route.abort());const page=await context.newPage();page.setDefaultTimeout(5000);
 await page.setContent('<section id="hl-documents"><div class="hl-doc-head"></div><select data-doc-org><option value="org-a">A</option><option value="org-b">B</option></select><form data-doc-form><select data-doc-template><option value="saved">T</option></select><div data-doc-fields><input id="draft-input"></div></form></section>');
 await page.evaluate(options=>{
  const field={key:'note',labelAr:'ملاحظة',labelEn:'Note',type:'TEXT',required:false};
  const original={id:'saved',organizationId:'org-a',code:'HR-EXISTING',department:'HR',version:1,status:'ACTIVE',titleAr:'نموذج محفوظ',titleEn:'Saved form',printable:true,fields:[field]};
  const items=[{code:'HR-EXISTING',department:'HR',titleAr:'نموذج محفوظ',status:'READY'},{code:'MAR-NEW',department:'MARINE_OPERATIONS',titleAr:'نموذج بحري جديد',status:'MISSING'},{code:'TRN-NEW',department:'TRAINING',titleAr:'نموذج تدريب جديد',status:'MISSING'}];
  const s=window.fixture={session:1,authenticated:true,role:options.role||'OWNER',kind:options.kind||'HYDROLAND_INTERNAL_PLATFORM',templates:options.empty?[]:[original],items:options.empty?items.map(t=>({...t,status:'MISSING'})):items,calls:[],writes:[],refreshes:0,delay:false,release:null,planStatus:200,postStatus:201,mode:'',postMode:'',signed:{id:'signed',version:1}};
  window.HydrolandDocuments={refresh:async()=>{s.refreshes++;document.querySelector('#draft-input').value='';}};
  window.HydrolandAuth={isAuthenticated:()=>s.authenticated,getSessionVersion:()=>s.session,authorizedFetch:async(url,init={})=>{
   const method=init.method||'GET';s.calls.push({url,method,cache:init.cache,body:init.body?JSON.parse(init.body):null});
   const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
   if(url==='/documents/workspace')return response([{role:s.role,status:'ACTIVE',organization:{id:'org-a',displayName:'جهة اصطناعية',kind:s.kind}}]);
   if(url.endsWith('/branding'))return response({organizationId:'org-a',brandVersion:1,brandNameAr:'جهة اصطناعية'});
   if(url.endsWith('/templates'))return response(s.templates);
   if(url.includes('/template-setup')&&method==='GET'){
    const department=new URL(url,'https://fixture.invalid').searchParams.get('department');
    const list=structuredClone(s.items.filter(t=>department==='ALL'||t.department===department));
    const summary={source:list.length,ready:0,missing:0,inactive:0,conflicts:0};for(const t of list)summary[{READY:'ready',MISSING:'missing',INACTIVE:'inactive',CONFLICT:'conflicts'}[t.status]]++;
    const p={organizationId:'org-a',department,planHash:'a'.repeat(64),items:list,summary,emptyTemplatesOnly:true,specializedContractsIncluded:false,completeDocumentInventoryVerified:false};
    if(s.mode==='scope')p.organizationId='org-b';if(s.mode==='counts')p.summary.missing=99;if(s.mode==='duplicate')p.items.push(p.items[0]);
    const status=s.planStatus;if(s.delay)await new Promise(resolve=>s.release=resolve);
    return response(status===200?p:{message:'Plan denied'},status);
   }
   if(url.includes('/template-setup')&&method==='POST'){
    const body=JSON.parse(init.body);if(s.postStatus!==201)return response({message:'Setup rejected'},s.postStatus);
    const selected=s.items.filter(t=>t.status==='MISSING'&&(body.department==='ALL'||t.department===body.department));
    s.writes.push(structuredClone(body));for(const t of selected){s.templates.push({organizationId:'org-a',id:t.code,code:t.code,department:t.department,titleAr:t.titleAr,titleEn:'Synthetic form',fields:[field],version:1,status:'ACTIVE',printable:true});t.status='READY';}
    if(s.postMode==='network')throw new Error('Response lost');
    return response({organizationId:'org-a',department:body.department,created:selected.length,createdCodes:s.postMode==='mismatch'?['unexpected']:selected.map(t=>t.code),emptyTemplatesOnly:true,specializedContractsIncluded:false});
   }
   return response({},404);
  }};
 },options);
 await page.addScriptTag({content:library});await page.addScriptTag({content:setupSource});await page.locator('[data-hfl-open]').click();await page.waitForFunction(()=>document.querySelector('[data-hfl-note]').textContent.includes('قالب نشط'));
 if((options.role||'OWNER')==='OWNER'&&(options.kind||'HYDROLAND_INTERNAL_PLATFORM')==='HYDROLAND_INTERNAL_PLATFORM')await page.waitForFunction(()=>!document.querySelector('[data-setup-preview]').disabled);
 return {page,context};
}
async function preview(page){await page.locator('[data-setup-preview]').click();await page.waitForFunction(()=>!document.querySelector('[data-setup-preview]').disabled||!document.querySelector('#hl-form-library').open);}
async function apply(page){await page.locator('[data-setup-confirm]').check();await page.locator('[data-setup-apply]').click();await page.waitForFunction(()=>!document.querySelector('[data-setup-preview]').disabled||!document.querySelector('#hl-form-library').open);}
async function check(name,fn,options){const x=await setup(options);try{await fn(x.page);passed++;console.log('PASS '+name);}finally{await x.context.close();}}
(async()=>{
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox']});
 await check('startup and preview are read-only; setup requires separate consent',async page=>{assert.equal(await page.evaluate(()=>fixture.writes.length),0);await preview(page);assert.match(await page.locator('[data-setup-summary]').innerText(),/2 ناقصًا/);assert.equal(await page.locator('[data-setup-apply]').isDisabled(),true);assert.ok(await page.evaluate(()=>fixture.calls.every(c=>c.method==='GET'&&c.cache==='no-store')));});
 await check('confirmed batch creates once, refreshes library and preserves existing definitions',async page=>{const before=await page.evaluate(()=>JSON.stringify({t:fixture.templates[0],signed:fixture.signed}));await preview(page);await apply(page);assert.match(await page.locator('[data-setup-status]').innerText(),/حُفظ 2/);assert.equal(await page.locator('[data-hfl-template] option').count(),3);assert.equal(await page.evaluate(()=>fixture.writes.length),1);assert.equal(await page.evaluate(()=>JSON.stringify({t:fixture.templates[0],signed:fixture.signed})),before);assert.equal(await page.locator('[data-setup-plan]').isVisible(),false);});
 await check('typed document inputs are not discarded by setup refresh',async page=>{await page.evaluate(()=>document.querySelector('#draft-input').value='غير محفوظ');await preview(page);await apply(page);assert.equal(await page.locator('#draft-input').inputValue(),'غير محفوظ');assert.equal(await page.evaluate(()=>fixture.refreshes),0);});
 await check('dirty template editor is retained and its old publishing consent cleared',async page=>{await page.locator('#hl-form-library [name=titleAr]').fill('تعديل غير منشور');await page.locator('[data-hfl-confirm]').check();await preview(page);await apply(page);assert.equal(await page.locator('#hl-form-library [name=titleAr]').inputValue(),'تعديل غير منشور');assert.equal(await page.locator('[data-hfl-confirm]').isChecked(),false);});
 await check('empty saved library still supports explicit setup',async page=>{assert.equal(await page.locator('[data-hfl-template] option').count(),0);await preview(page);await apply(page);assert.equal(await page.locator('[data-hfl-template] option').count(),3);},{empty:true});
 await check('scope change discards stale plan and consent',async page=>{await preview(page);await page.locator('[data-setup-confirm]').check();await page.locator('[data-setup-scope]').selectOption('MARINE_OPERATIONS');assert.equal(await page.locator('[data-setup-plan]').isVisible(),false);await preview(page);assert.match(await page.locator('[data-setup-summary]').innerText(),/1 ناقصًا/);assert.equal(await page.locator('[data-setup-confirm]').isChecked(),false);await apply(page);assert.equal(await page.evaluate(()=>fixture.writes[0].department),'MARINE_OPERATIONS');});
 await check('read-only internal member never sees setup action',async page=>{assert.equal(await page.locator('[data-hfl-setup]').isVisible(),false);assert.equal(await page.evaluate(()=>fixture.calls.some(c=>c.url.includes('template-setup'))),false);},{role:'VIEWER'});
 await check('independent center owner never inherits internal setup',async page=>{assert.equal(await page.locator('[data-hfl-setup]').isVisible(),false);},{kind:'DIVE_CENTER'});
 for(const mode of ['scope','counts','duplicate'])await check('malformed '+mode+' plan never becomes actionable',async page=>{await page.evaluate(mode=>fixture.mode=mode,mode);await preview(page);assert.equal(await page.locator('[data-setup-plan]').isVisible(),false);assert.equal(await page.evaluate(()=>fixture.writes.length),0);});
 for(const status of ['INACTIVE','CONFLICT'])await check(status+' definitions are never silently created or reactivated',async page=>{await page.evaluate(status=>fixture.items.forEach(t=>t.status=status),status);await preview(page);assert.equal(await page.locator('[data-setup-apply]').isDisabled(),true);assert.equal(await page.evaluate(()=>fixture.writes.length),0);});
 await check('server conflict invalidates plan and requires a fresh preview',async page=>{await preview(page);await page.evaluate(()=>fixture.postStatus=409);await apply(page);assert.equal(await page.locator('[data-setup-plan]').isVisible(),false);assert.equal(await page.evaluate(()=>fixture.calls.filter(c=>c.method==='POST').length),1);assert.equal(await page.evaluate(()=>fixture.writes.length),0);});
 await check('revoked authority immediately clears private plan and library',async page=>{await preview(page);await page.evaluate(()=>fixture.postStatus=403);await apply(page);assert.equal(await page.locator('#hl-form-library').isVisible(),false);assert.equal(await page.locator('[data-setup-items]').innerText(),'');});
 await check('late plan after close cannot repopulate the private view',async page=>{await page.evaluate(()=>fixture.delay=true);await page.locator('[data-setup-preview]').click();await page.waitForFunction(()=>!!fixture.release);await page.locator('[data-hfl-close]').click();await page.evaluate(()=>fixture.release());await page.waitForTimeout(20);assert.equal(await page.locator('[data-setup-items]').innerText(),'');assert.equal(await page.locator('#hl-form-library').isVisible(),false);});
 await check('late old-session denial cannot close the new editor',async page=>{await page.evaluate(()=>{fixture.delay=true;fixture.planStatus=403;});await page.locator('[data-setup-preview]').click();await page.waitForFunction(()=>!!fixture.release);await page.evaluate(()=>{fixture.session++;document.dispatchEvent(new Event('hydroland:session-cleared'));fixture.delay=false;fixture.planStatus=200;});await page.locator('[data-hfl-open]').click();await page.waitForFunction(()=>!document.querySelector('[data-setup-preview]').disabled);await page.evaluate(()=>fixture.release());await page.waitForTimeout(20);assert.equal(await page.locator('#hl-form-library').isVisible(),true);});
 await check('organization change clears setup and invalidates its confirmation',async page=>{await preview(page);await page.locator('[data-setup-confirm]').check();await page.evaluate(()=>{const s=document.querySelector('[data-doc-org]');s.value='org-b';s.dispatchEvent(new Event('change',{bubbles:true}));});assert.equal(await page.locator('[data-setup-items]').innerText(),'');assert.equal(await page.evaluate(()=>fixture.writes.length),0);});
 for(const mode of ['network','mismatch'])await check('uncertain '+mode+' result never auto-retries the write',async page=>{await preview(page);await page.evaluate(mode=>fixture.postMode=mode,mode);await apply(page);assert.match(await page.locator('[data-setup-status]').innerText(),/أعد الحصر/);assert.equal(await page.locator('[data-setup-plan]').isVisible(),false);assert.equal(await page.evaluate(()=>fixture.writes.length),1);});
 await check('escaped text and mobile containment, with idempotent script bootstrap',async page=>{await page.addScriptTag({content:setupSource});assert.equal(await page.locator('[data-hfl-setup]').count(),1);await page.setViewportSize({width:390,height:844});await page.evaluate(()=>fixture.items[1].titleAr='<img src=x onerror=alert(1)>');await preview(page);assert.equal(await page.locator('[data-setup-items] img').count(),0);assert.equal(await page.locator('#hl-form-library').evaluate(e=>e.scrollWidth<=e.clientWidth+2),true);});
 console.log(`${passed} isolated setup/editor browser checks passed. Synthetic authorized-fetch fixtures; no production or database writes.`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();});
