'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'@playwright/test');
const source=fs.readFileSync(path.join(__dirname,'../src/hydroland-documents.js'),'utf8');
let browser,passed=0;
async function fixture(options={}){
 const context=await browser.newContext({viewport:{width:1100,height:900}}),page=await context.newPage();page.setDefaultTimeout(5000);await context.route('**/*',r=>r.abort());
 await page.setContent('<div id="role-console"></div>');
 await page.evaluate(options=>{
  const template={id:'t-a',organizationId:'org-a',code:'HR-TEST',department:'HR',titleAr:'اختبار',titleEn:'Test',fields:[{key:'note',labelAr:'ملاحظة',labelEn:'Note',type:'TEXT',required:true}]};
  const doc={id:'doc-a',organizationId:'org-a',templateId:template.id,template,referenceNumber:'SYNTHETIC-1',status:'DRAFT',version:1,department:'HR',createdByAccountId:'owner-a',approvedByAccountId:null,payload:{note:'Fixture'}};
  const f=window.fixture={session:1,authenticated:true,delay:false,release:null,mode:'',httpStatus:200,calls:[],internal:options.internal!==false,role:options.role||'OWNER',doc};
  window.HydrolandProfileData={profile:{id:'owner-a'}};
  window.HydrolandAuth={isAuthenticated:()=>f.authenticated,getSessionVersion:()=>f.session,authorizedFetch:async(p,init={})=>{
   f.calls.push({path:p,method:init.method||'GET',cache:init.cache});const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
   if(p==='/documents/workspace')return response([{status:'ACTIVE',role:f.role,accessBasis:f.internal?'PLATFORM_OWNER':undefined,organization:{id:'org-a',kind:f.internal?'HYDROLAND_INTERNAL_PLATFORM':'DIVE_CENTER',displayName:'جهة اختبار'}}]);
   if(p.endsWith('/workflow-readiness')){
    let report={schemaVersion:1,organizationId:'org-a',documentId:'doc-a',documentVersion:1,status:'DRAFT',scope:f.internal?'INTERNAL_OWNER_ONLY':'ORGANIZATION_MEMBERSHIP',actorActions:{edit:true,submit:true,approve:false,sign:false,archive:false},blockers:f.internal?[{step:'APPROVE',reason:'OWNER_IS_CREATOR'},{step:'SIGN',reason:'OWNER_WOULD_APPROVE_AND_SIGN'}]:[],policyDecisionRequired:f.internal,assessment:f.internal?'BLOCKED':'ACTOR_CHECK_ONLY',observationOnly:true};
    if(f.mode==='scope')report.organizationId='other';if(f.mode==='version')report.documentVersion=2;if(f.mode==='reason')report.blockers=[{step:'SIGN',reason:'<img src=x onerror=alert(1)>'}];
    const status=f.httpStatus;if(f.delay)await new Promise(resolve=>f.release=resolve);return response(report,status);
   }
   if(p.endsWith('/templates'))return response([template]);if(p.endsWith('/list'))return response([doc]);
   if(p.endsWith('/inventory'))return response({organizationId:'org-a',internalPlatform:f.internal,baselineTemplateCount:1,observedAt:new Date().toISOString(),departments:[{code:'HR',nameAr:'الموارد البشرية',summary:{types:1,noRecord:0,pendingApproval:0},items:[{code:'HR-TEST',titleAr:'اختبار',activeTemplateId:'t-a',templateStatus:'READY',recordStatus:'PRESENT',counts:{DRAFT:1,PENDING_APPROVAL:0,APPROVED:0,SIGNED:0,ARCHIVED:0},total:1}]}]});
   throw Error('Unexpected request '+p);
  }};
 },options);
 await page.addScriptTag({content:source});await page.evaluate(()=>window.HydrolandDocuments.open());await page.waitForFunction(()=>document.querySelector('[data-doc-note]').textContent.includes('تم تحميل'));
 return {page,context};
}
const output=p=>p.locator('[data-doc-readiness]');
async function inspect(page){await page.locator('[data-doc-action=readiness]').click();await page.waitForFunction(()=>!document.querySelector('[data-doc-readiness]')?.textContent.includes('جارٍ'));}
async function check(name,fn,options){const {page,context}=await fixture(options);try{await fn(page);passed++;console.log('PASS '+name);}finally{await context.close();}}
(async()=>{
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox']});
 await check('internal policy warning and scoped diagnostic make only read requests',async p=>{assert.equal(await p.locator('[data-doc-workflow-policy]').isVisible(),true);await inspect(p);assert.match(await output(p).innerText(),/المسار متعثر/);const c=await p.evaluate(()=>fixture.calls);assert.ok(c.every(x=>x.method==='GET'));assert.equal(c.at(-1).cache,'no-store');assert.equal(c.at(-1).path,'/documents/organizations/org-a/documents/doc-a/workflow-readiness');});
 await check('inspection preserves unsaved document data and never enables approval',async p=>{await p.locator('[data-doc-fields] input').fill('بيانات لم تحفظ');await inspect(p);assert.equal(await p.locator('[data-doc-fields] input').inputValue(),'بيانات لم تحفظ');assert.equal(await p.locator('[data-doc-action=approve]').count(),0);});
 await check('center diagnostics do not show the internal owner policy warning',async p=>{assert.equal(await p.locator('[data-doc-workflow-policy]').isVisible(),false);await inspect(p);assert.match(await output(p).innerText(),/فحص صلاحية المستخدم الحالي فقط/);},{internal:false});
 await check('viewer can inspect without obtaining write actions',async p=>{await inspect(p);assert.equal(await p.locator('[data-doc-action=edit]').count(),0);assert.equal(await p.locator('[data-doc-action=approve]').count(),0);},{internal:false,role:'VIEWER'});
 for(const mode of ['scope','version','reason'])await check('untrusted '+mode+' result is rejected without HTML insertion',async p=>{await p.evaluate(mode=>fixture.mode=mode,mode);await inspect(p);assert.match(await output(p).innerText(),/لم يُتحقق/);assert.equal(await output(p).locator('img').count(),0);});
 await check('current authorization denial clears private workspace',async p=>{await p.evaluate(()=>fixture.httpStatus=403);await inspect(p);assert.equal(await p.locator('#hl-documents').isVisible(),false);assert.equal(await output(p).count(),0);});
 for(const status of [200,403])await check('late '+status+' from an older session cannot repopulate or close new view',async p=>{
  await p.evaluate(status=>{fixture.delay=true;fixture.httpStatus=status;},status);await p.locator('[data-doc-action=readiness]').click();await p.waitForFunction(()=>!!fixture.release);
  await p.evaluate(()=>{fixture.session++;document.dispatchEvent(new Event('hydroland:session-cleared'));fixture.delay=false;fixture.httpStatus=200;window.HydrolandDocuments.open();});await p.waitForFunction(()=>document.querySelector('[data-doc-note]').textContent.includes('تم تحميل'));
  await p.evaluate(()=>fixture.release());await p.evaluate(()=>new Promise(r=>setTimeout(r,20)));assert.equal(await p.locator('#hl-documents').isVisible(),true);assert.equal(await output(p).isVisible(),false);
 });
 await check('refresh detaches old result target without erasing new document entry',async p=>{await p.evaluate(()=>fixture.delay=true);await p.locator('[data-doc-action=readiness]').click();await p.waitForFunction(()=>!!fixture.release);await p.locator('[data-doc-refresh]').click();await p.waitForFunction(()=>document.querySelector('[data-doc-note]').textContent.includes('تم تحميل'));await p.evaluate(()=>fixture.release());assert.equal(await output(p).isVisible(),false);});
 await check('failed diagnostic leaves draft text intact and permits a read retry',async p=>{await p.locator('[data-doc-fields] input').fill('لا تحذف');await p.evaluate(()=>fixture.httpStatus=500);await inspect(p);assert.equal(await p.locator('[data-doc-fields] input').inputValue(),'لا تحذف');await p.evaluate(()=>fixture.httpStatus=200);await inspect(p);assert.match(await output(p).innerText(),/المسار متعثر/);});
 console.log(`${passed} isolated document-workflow UI checks passed; no production or authenticated database acceptance inferred.`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();});
