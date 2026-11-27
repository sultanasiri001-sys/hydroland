const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});let checks=0;
 const pass=text=>{checks++;console.log('PASS '+text);};
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});await page.route('http://127.0.0.1/c05-fixture',route=>route.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));await page.goto('http://127.0.0.1/c05-fixture');await page.setContent('<dialog id="profile-dialog"><div class="profile-list"></div></dialog><input id="other-draft" value="Keep original">');
  await page.evaluate(()=>{
   let version=1;window.fixture={calls:[],locale:'ar',mode:'normal',version:()=>version,logout:()=>{version++;document.dispatchEvent(new CustomEvent('hydroland:session-cleared'));}};
   const asset={id:'resource-1',kind:'EQUIPMENT',name:'Canonical <script>window.injected=true</script>',status:'AVAILABLE'};
   window.fixture.order={id:'order-1',organizationId:'org-1',equipmentResourceId:asset.id,marineAssetId:null,status:'IN_PROGRESS',revision:4,metadata:{description:'Existing source work',technician:{accountId:'tech',personId:'person-tech'}},asset,capabilities:{complete:true},parts:{items:[],sourceCurrent:true,totalCostMinor:0},totalCostMinor:0,history:[]};
   window.HydrolandI18n={getLocale:()=>fixture.locale};window.HydrolandAuth={isAuthenticated:()=>true,getSessionVersion:()=>version,authorizedFetch:async(path,options={})=>{
    const body=options.body?JSON.parse(options.body):undefined;fixture.calls.push({path,body,method:options.method||'GET'});
    if(fixture.mode==='forbidden')return new Response(JSON.stringify({message:'Forbidden'}),{status:403});
    if(options.method==='POST'){
     if(fixture.mode==='uncertain'){fixture.mode='normal';throw Error('Network outcome unknown');}
     if(fixture.mode==='delay-write')await new Promise(resolve=>fixture.release=resolve);
     fixture.order={...fixture.order,status:'AWAITING_INSPECTION',revision:5,capabilities:{}};return new Response(JSON.stringify(fixture.order),{status:201});
    }
    if(fixture.mode==='delay-read')await new Promise(resolve=>fixture.release=resolve);
    const data=path.endsWith('/organizations')?[{id:'org-1',displayName:'Synthetic organization'}]:path.endsWith('/workspace')?{organizationId:'org-1',actor:{manager:false},assets:[asset],orders:[fixture.order],participants:[],plans:[],documents:[],stockIssues:[]}:fixture.order;
    return new Response(JSON.stringify(data),{status:200});
   }};
  });
  await page.addScriptTag({content:fs.readFileSync(require('node:path').join(__dirname,'../src/hydroland-maintenance.js'),'utf8')});
  const idle=()=>page.waitForFunction(()=>document.querySelector('#hl-maintenance').getAttribute('aria-busy')==='false');
  async function open(){await page.evaluate(()=>HydrolandMaintenance.open({organizationId:'org-1'}));await idle();}
  async function workForm(){await page.getByRole('button',{name:'التفاصيل والإجراءات'}).click();await idle();await page.locator('details').filter({hasText:'رفع تقرير التنفيذ'}).locator('summary').click();const form=page.locator('form');await form.locator('[name=workPerformed]').fill('Meaningful synthetic execution evidence');await form.locator('[name=evidenceReference]').fill('SYNTHETIC-REPORT-1');return form;}
  await open();assert.equal(await page.locator('#hl-maintenance').evaluate(e=>e.scrollWidth<=e.clientWidth+2),true);assert.equal(await page.evaluate(()=>window.injected),undefined);assert.equal(await page.locator('script').count(),1);pass('Arabic mobile layout preserves opaque canonical values as text');
  const form=await workForm();await page.evaluate(()=>fixture.mode='uncertain');await form.locator('[type=submit]').click();await idle();assert.match(await page.locator('[data-maintenance-status]').innerText(),/لم تتأكد/);await form.locator('[type=submit]').click();await idle();
  const posts=await page.evaluate(()=>fixture.calls.filter(c=>c.method==='POST'));assert.equal(posts.length,2);assert.deepEqual(posts[0],posts[1]);assert.equal(posts[0].body.expectedRevision,4);assert.ok(posts[0].body.requestId);assert.equal(await page.locator('#other-draft').inputValue(),'Keep original');pass('Ambiguous save retry retains the exact command ID, source revision and payload, preserving unrelated drafts');
  await page.evaluate(()=>{fixture.order.status='IN_PROGRESS';fixture.order.revision=6;fixture.order.capabilities={complete:true};});await page.locator('[data-maintenance-reload]').click();await idle();await page.getByRole('button',{name:'العودة للأوامر'}).click();const pending=await workForm();await page.evaluate(()=>fixture.mode='delay-write');await pending.locator('[type=submit]').click();assert.equal(await pending.locator('[type=submit]').isDisabled(),true);await page.evaluate(()=>fixture.logout());assert.equal(await page.locator('#hl-maintenance').isVisible(),false);await page.evaluate(()=>fixture.release());await page.waitForTimeout(50);assert.equal(await page.locator('#hl-maintenance').innerText(),'');pass('Pending mutations cannot double-submit or repopulate a cleared session');
  await page.evaluate(()=>fixture.mode='normal');await open();await page.evaluate(()=>fixture.mode='forbidden');await page.locator('[data-maintenance-reload]').click();await page.waitForFunction(()=>!document.querySelector('#hl-maintenance').open);assert.equal(await page.locator('#hl-maintenance').innerText(),'');pass('Fresh 403 clears the workspace instead of retaining protected source data');
  await page.evaluate(()=>{fixture.mode='normal';fixture.locale='en';});await open();assert.match(await page.locator('#hl-maintenance h2').innerText(),/Assets and maintenance work orders/);assert.equal(await page.locator('#hl-maintenance').getAttribute('dir'),'ltr');pass('English workspace preserves operational labels and direction');
  console.log(checks+' C05 browser boundary groups passed (isolated response fixtures; real HTTP acceptance is separate).');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
