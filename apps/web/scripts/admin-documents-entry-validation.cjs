'use strict';
// Real app bootstrap, real clicks, synthetic HTTP responses. No production session.
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'@playwright/test');
let browser,server,base,passed=0;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function wait(fn,message){for(let i=0;i<80;i++){if(await fn())return;await sleep(50);}throw Error(message);}
async function setup(options={}){
 const context=await browser.newContext({viewport:options.mobile?{width:390,height:844}:{width:1400,height:1000},serviceWorkers:'block'});
 const page=await context.newPage();page.setDefaultTimeout(5000);
 const state={admin:true,internal:options.internal!==false,reads:[],writes:[],errors:[],deny:false,hold:false,release:null};
 page.on('pageerror',e=>state.errors.push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
 const json=(r,data,status=200)=>r.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 await page.route('**/api/v1/**',route=>{const r=route.request();if(!['GET','HEAD','OPTIONS'].includes(r.method()))state.writes.push({method:r.method(),url:r.url()});return json(route,[]);});
 await page.route('**/api/v1/auth/google/config',r=>json(r,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,async r=>{
  const data={id:'synthetic-owner',status:'ACTIVE',person:{firstName:'مالك',lastName:'اختبار'},headline:'مدرب غوص',roleAssignments:state.admin?[{role:'ADMIN',status:'ACTIVE'}]:[{role:'DIVER',status:'ACTIVE'}]};
  if(state.hold){state.hold=false;await new Promise(resolve=>state.release=resolve);}
  return json(r,data);
 });
 const template=org=>({id:'t-'+org,organizationId:org,code:'ADM-MEETING-MINUTES',department:'ADMIN_AFFAIRS_RECORDS',titleAr:'محضر اجتماع',titleEn:'Meeting minutes',version:1,status:'ACTIVE',printable:true,fields:[{key:'note',labelAr:'ملاحظة',labelEn:'Note',type:'TEXT',required:true}]});
 await page.route('**/api/v1/documents/**',r=>{
  const request=r.request(),p=new URL(request.url()).pathname.replace('/api/v1','');
  if(request.method()!=='GET'){state.writes.push({method:request.method(),url:p});return json(r,{message:'Unexpected write in navigation fixture'},405);}
  state.reads.push(p);
  if(p==='/documents/workspace')return json(r,[{status:'ACTIVE',role:'ADMIN',organization:{id:'org-center',kind:'DIVE_CENTER',displayName:'مركز اختبار'}},...(state.internal?[{status:'ACTIVE',role:'OWNER',accessBasis:'PLATFORM_OWNER',organization:{id:'org-internal',kind:'HYDROLAND_INTERNAL_PLATFORM',displayName:'هيدرولاند — الجهة الداخلية'}}]:[])]);
  const org=p.includes('/org-internal/')?'org-internal':'org-center';
  if(org==='org-internal'&&!state.internal)return json(r,{message:'Denied'},403);
  if(p.endsWith('/templates'))return json(r,[template(org)]);
  if(p.endsWith('/list'))return json(r,[]);
  if(p.endsWith('/branding'))return json(r,{organizationId:org,brandNameAr:'هيدرولاند',footerAr:'اختبار',brandVersion:1});
  if(p.endsWith('/inventory'))return json(r,{organizationId:org,internalPlatform:org==='org-internal',baselineTemplateCount:60,observedAt:'2026-10-25T00:00:00Z',departments:[{code:'ADMIN_AFFAIRS_RECORDS',nameAr:'الشؤون الإدارية والوثائق',summary:{types:1,noRecord:1,pendingApproval:0},items:[{code:'ADM-MEETING-MINUTES',titleAr:'محضر اجتماع',activeTemplateId:'t-'+org,templateStatus:'READY',recordStatus:'NO_RECORD',counts:{DRAFT:0,PENDING_APPROVAL:0,APPROVED:0,SIGNED:0,ARCHIVED:0},total:0}]}]});
  return json(r,{message:'Not found'},404);
 });
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>Boolean(window.HydrolandRoleTasks&&window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandDocuments&&window.HydrolandFormLibrary));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'synthetic-navigation',refreshToken:'synthetic-navigation-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load();});
 await switchRole(page,'admin');
 await wait(()=>page.locator('[data-admin-documents-entry=quick]').isVisible(),'Missing admin documents quick entry');
 return {page,context,state};
}
async function switchRole(page,role){
 const dashboard=page.locator('.hl-role-dashboard [data-portal-switch]');
 if(await dashboard.count()){
  if(!await dashboard.isVisible())await page.locator('.hl-role-dashboard [data-portal-menu]').click();
  await dashboard.click();
 }else{
  const base=page.locator('#role-switch');
  if(!await base.isVisible())await page.locator('#menu').click();
  await base.click();
 }
 await page.locator('#role-dialog [data-role="'+role+'"]').click();
 await page.waitForFunction(role=>window.HydrolandPortalAccess.getCurrentRole()===role,role);
}
async function open(page,position='quick'){
 await page.locator('[data-admin-documents-entry='+position+']').click();
 await page.waitForFunction(()=>document.querySelector('[data-doc-note]')?.textContent.includes('تم تحميل'));
 assert.equal(await page.locator('#hl-documents').isVisible(),true);
}
async function check(name,fn,options={}){const x=await setup(options);try{await fn(x.page,x.state);assert.equal(x.state.writes.length,0,'navigation issued a write');assert.deepEqual(x.state.errors,[]);passed++;console.log('PASS '+name);}finally{await x.context.close();}}
(async()=>{
 const {createStaticServer}=await import(pathToFileURL(path.join(__dirname,'serve.mjs')).href);
 server=createStaticServer(process.env.WEB_ENTRY_FIXTURE_ROOT||path.join(__dirname,'../dist'),{onReject:()=>{}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port+'/';
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox']});
 await check('two explicit admin entry points open the existing internal workspace and library',async(p,s)=>{
  assert.equal(await p.locator('[data-admin-documents-entry]').count(),2);await open(p);
  assert.equal(await p.locator('[data-doc-org]').inputValue(),'org-internal');
  assert.ok(s.reads.includes('/documents/workspace'));assert.ok(s.reads.includes('/documents/organizations/org-internal/templates'));
  await p.locator('[data-hfl-open]').click();await p.waitForFunction(()=>document.querySelector('#hl-form-library')?.open);
  await wait(()=>p.locator('[data-hfl-template] option').count(),'Library template did not load');
  assert.equal(await p.locator('[data-hfl-template] option').count(),1);
 });
 await check('mobile sidebar opens documents using a real visible click',async(p)=>{
  await p.locator('[data-portal-menu]').click();await open(p,'sidebar');
  assert.equal(await p.locator('.hl-role-dashboard').evaluate(e=>e.classList.contains('hl-portal-nav-open')),false);
 },{mobile:true});
 await check('revoked admin cannot initiate any documents read',async(p,s)=>{
  const before=s.reads.length;s.admin=false;await p.locator('[data-admin-documents-entry=quick]').click();
  await p.waitForFunction(()=>window.HydrolandPortalAccess.getCurrentRole()==='diver');
  assert.equal(s.reads.length,before);assert.equal(await p.locator('#hl-documents').isVisible(),false);
 });
 await check('non-owner admin retains center scope, never receives an invented internal organization',async(p,s)=>{
  await open(p);assert.equal(await p.locator('[data-doc-org]').inputValue(),'org-center');
  assert.equal(s.reads.some(x=>x.includes('org-internal')),false);
 },{internal:false});
 await check('returning to the document workspace retains an unsaved draft',async(p,s)=>{
  await open(p);await p.locator('[data-doc-fields] input').fill('مسودة غير محفوظة');
  await p.locator('[data-portal-home]').click();const before=s.reads.length;await open(p);
  assert.equal(await p.locator('[data-doc-fields] input').inputValue(),'مسودة غير محفوظة');assert.equal(s.reads.length,before);
 });
 await check('new admin dashboards and repeated module loads never duplicate entry points',async(p)=>{
  await switchRole(p,'diver');assert.equal(await p.locator('[data-admin-documents-entry]').count(),0);
  await switchRole(p,'admin');await wait(()=>p.locator('[data-admin-documents-entry]').count(),'No entries after recreation');
  await p.addScriptTag({url:base+'hydroland-role-task-routing.js'});assert.equal(await p.locator('[data-admin-documents-entry]').count(),2);
  await open(p);
 });
 console.log(`${passed} real-app navigation checks passed with synthetic API fixtures. No production or database writes.`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();await new Promise(resolve=>server?server.close(resolve):resolve());});
