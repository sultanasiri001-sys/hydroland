'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('@playwright/test');
const source=fs.readFileSync(path.join(__dirname,'../src/hydroland-documents.js'),'utf8');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
  await page.route('http://tables.test/**',route=>route.fulfill({contentType:'text/html',body:'<html dir="rtl"><body style="margin:0"><section id="role-console"></section></body></html>'}));
  await page.goto('http://tables.test/');
  await page.evaluate(()=>{
   const template={id:'t',organizationId:'org',code:'INV-QUOTE-COMPARISON',titleAr:'مقارنة العروض',department:'INVENTORY_LOGISTICS',fields:[{key:'title',labelAr:'الموضوع',type:'TEXT',required:true},{key:'rows',labelAr:'المقارنة',type:'TABLE',required:true,options:['المورد','النتيجة']},{key:'legacy',labelAr:'جدول سابق',type:'TABLE',required:false},{key:'choice',labelAr:'الخيار',type:'SELECT',required:true,options:['أ','ب']}],version:1};
   window.fixture={template,writes:[],documents:[],session:1,authenticated:true};
   const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
   window.HydrolandAuth={isAuthenticated:()=>fixture.authenticated,getSessionVersion:()=>fixture.session,authorizedFetch:async(url,init={})=>{
    if(init.method==='POST'){const body=JSON.parse(init.body);fixture.writes.push({url,body});fixture.documents=[{id:'doc',templateId:'t',template,department:template.department,payload:body.payload,status:'DRAFT',version:1,referenceNumber:'SYNTHETIC-1'}];return response(fixture.documents[0],201);}
    if(url==='/documents/workspace')return response([{role:'OWNER',status:'ACTIVE',organization:{id:'org',kind:'DIVE_CENTER',displayName:'اختبار معزول'}}]);
    if(url.endsWith('/templates'))return response([template]);
    if(url.endsWith('/list'))return response(fixture.documents);
    if(url.endsWith('/inventory'))return response({organizationId:'org',internalPlatform:false,observedAt:new Date().toISOString(),departments:[{code:template.department,nameAr:'الإمداد',summary:{types:1,noRecord:1,pendingApproval:0},items:[{code:template.code,titleAr:template.titleAr,activeTemplateId:'t',templateStatus:'READY',recordStatus:'NO_RECORD',counts:{DRAFT:0,PENDING_APPROVAL:0,APPROVED:0,SIGNED:0,ARCHIVED:0},total:0}]}]});
    return response({},404);
   }};
  });
  await page.addScriptTag({content:source});await page.evaluate(()=>HydrolandDocuments.open());
  await page.waitForFunction(()=>document.querySelector('[data-doc-note]').textContent.includes('تم تحميل'));
  assert.equal(await page.locator('[data-doc-tablefield="rows"] select').count(),0);
  assert.equal(await page.locator('[data-doc-table-cell]').count(),2);
  await page.locator('[name="title"]').fill('مقارنة معزولة');await page.locator('[data-doc-save]').click();
  assert.match(await page.locator('[data-doc-note]').innerText(),/أكمل الجدول الإلزامي/);
  assert.equal(await page.evaluate(()=>fixture.writes.length),0);
  const literal='<img src=x onerror="window.injected=true">';
  await page.locator('[data-doc-table-cell="المورد"]').fill(literal);await page.locator('[data-doc-table-cell="النتيجة"]').fill('9.5');
  await page.locator('[data-doc-table-add]').click();assert.equal(await page.locator('[data-doc-table-row]').count(),2);
  await page.locator('[data-doc-table-row]').last().locator('[data-doc-table-remove]').click();
  await page.locator('[name="legacy"]').fill('[{"سابق":"محفوظ"}]');await page.locator('[data-doc-save]').click();
  await page.waitForFunction(()=>fixture.writes.length===1&&document.querySelector('[data-doc-note]').textContent.includes('تم حفظ'));
  const payload=await page.evaluate(()=>fixture.writes[0].body.payload);
  assert.deepEqual(payload.rows,[{'المورد':literal,'النتيجة':'9.5'}]);assert.deepEqual(payload.legacy,[{'سابق':'محفوظ'}]);assert.equal(payload.choice,'أ');
  await page.locator('[data-doc-action="edit"]').click();assert.equal(await page.locator('[data-doc-table-cell="المورد"]').inputValue(),literal);assert.equal(await page.evaluate(()=>window.injected||false),false);
  await page.locator('[data-doc-table-cell="النتيجة"]').fill('10');await page.locator('[data-doc-save]').click();
  await page.waitForFunction(()=>fixture.writes.length===2);assert.equal(await page.evaluate(()=>fixture.writes[1].url),'/documents/doc/revise');assert.equal(await page.evaluate(()=>fixture.writes[1].body.payload.rows[0]['النتيجة']),'10');
  await page.evaluate(()=>{fixture.authenticated=false;fixture.session++;document.dispatchEvent(new Event('hydroland:session-cleared'));});assert.equal(await page.locator('#hl-documents').isVisible(),false);assert.equal(await page.locator('[data-doc-table-cell]').count(),0);
  await context.close();console.log('PASS structured TABLE entry, required rows, add/remove, typed create/revise, legacy JSON compatibility, literal escaping and session clearing.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
