import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';

async function seed(page,{reader=false,staff=false,empty=false,state='DRAFT',temporaryOwnerReview=null,employment=false}={}){
  const calls={revisions:[],decisions:[],initializations:0,filters:[],blocked:false};let latest=1;
  const content={schemaVersion:1,category:employment?'EMPLOYMENT':'COOPERATION',fields:[{key:'center.legalName',label:'اسم المركز',source:'CENTER_PROFILE',required:true},{key:'professional.fullName',label:'اسم المحترف',source:'MEMBER_PROFILE',required:true}],clauses:['يوقع الطرفان النسخة نفسها.','نص <img src=x onerror=alert(1)> يحفظ كنص.'],usageNotes:'مراجعة التراخيص قبل الاستخدام.',source:{name:'نموذج هيدرولاند السابق',revision:'3'}};
  const versions=new Map();
  const view=(version=latest)=>versions.get(version)||({id:'template-'+version,code:employment?'CLIB-HR-PERMANENT':'CLIB-DIVE-COOPERATION',titleAr:employment?'عقد عمل غير محدد المدة':'عقد تعاون محترف غوص',titleEn:'Diving Professional Cooperation Contract',version,state:reader?'PUBLISHED':state,contentHash:'sha256:template-'+version,content:structuredClone(content),changeReason:'إضافة المسودة',publishedAt:null,internalApproval:null,reviews:{legal:null,hr:null},integration:{canCreateCooperation:reader},capabilities:{edit:!reader,submit:!reader&&state==='DRAFT',internalApprove:!reader&&employment&&state==='IN_REVIEW',legalReview:false,hrReview:false,publish:!reader&&!employment&&state==='IN_REVIEW',return:!reader&&state==='IN_REVIEW',retire:false,history:!reader},versionCount:version,publishedVersion:reader?1:null});
  const json=(r,b,status=200)=>r.fulfill({status,contentType:'application/json',body:JSON.stringify(b)});
  const profile={id:'library-owner',email:'owner@example.invalid',status:'ACTIVE',emailVerifiedAt:'2026-10-24T00:00:00Z',roleAssignments:[{id:'role',role:reader?'INSTRUCTOR':'ADMIN',status:'ACTIVE'}],person:{firstName:'مراجع',lastName:'تجريبي',professional:null}};
  if(staff)profile.roleAssignments=[{id:'staff',role:'STAFF',status:'ACTIVE'},{id:'hr-manager',role:'HR_MANAGER',status:'ACTIVE'}];
  await page.route(/\/api\/v1\/me$/,r=>json(r,profile));
  await page.route(/\/api\/v1\/me\/diver-profile$/,r=>json(r,{profile:null,equipment:[]}));
  await page.route(/\/api\/v1\/credentials$/,r=>json(r,[]));await page.route(/\/api\/v1\/organizations\/mine$/,r=>json(r,[]));
  await page.route(/\/api\/v1\/contracts\/library(?:\/.*|\?.*)?$/,async r=>{
    const request=r.request(),url=new URL(request.url()),path=url.pathname,body=request.postDataJSON();
    if(calls.blocked)return json(r,{message:'سحبت صلاحية مكتبة العقود'},403);
    if(path.endsWith('/workspace'))return json(r,{canInitialize:!reader,internal:!reader,canCreate:!reader,owner:!reader,temporaryOwnerReview});
    if(path.endsWith('/initialize')){calls.initializations++;empty=false;return json(r,{created:4},201);}
    if(path.endsWith('/history'))return json(r,{items:[view(latest),view(1)]});
    if(path.endsWith('/events'))return json(r,{items:[{action:'CONTRACT_TEMPLATE_INITIALIZED',occurredAt:'2026-10-24T00:00:00Z',metadata:{reason:'إضافة مسودة للمراجعة'}}]});
    if(path.endsWith('/revise')||path.endsWith('/copy')){calls.revisions.push(body);const old=view();versions.set(latest,{...old,state:'SUPERSEDED',capabilities:{...old.capabilities,edit:false,submit:false}});latest++;const v={...old,id:'template-'+latest,version:latest,contentHash:'sha256:template-'+latest,state:'DRAFT',content:{...old.content,clauses:body.clauses,usageNotes:body.usageNotes},internalApproval:null,reviews:{legal:null,hr:null}};versions.set(latest,v);return json(r,v,201);}
    if(path.endsWith('/decision')){calls.decisions.push(body);const v={...view(),state:body.action==='PUBLISH'?'PUBLISHED':'IN_REVIEW',...(body.action==='INTERNAL_APPROVAL'?{internalApproval:{accountId:'library-owner',at:new Date().toISOString(),contentHash:view().contentHash,reference:body.reference,purpose:'INTERNAL_DRAFT_PREPARATION_ONLY'}}:{}),capabilities:{edit:true,history:true}};versions.set(latest,v);return json(r,v,201);}
    const id=path.match(/\/template-(\d+)$/);if(id)return json(r,view(Number(id[1])));
    calls.filters.push(Object.fromEntries(url.searchParams));return json(r,{items:empty?[]:[view()],total:empty?0:1});
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandContractLibrary&&window.HydrolandProfile));
  await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','library-test');sessionStorage.setItem('hl-refresh-token','library-refresh');window.HydrolandAuth.syncAuthUi();document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));await window.HydrolandProfile.load();});
  if(staff){await page.evaluate(()=>document.getElementById('profile-dialog').showModal());await page.locator('[data-open-contract-library]').click();}
  else{await openWorkspaceSwitcher(page);const role=reader?'instructor':'admin';await page.locator(`#role-dialog [data-role="${role}"]`).click();await expect(page.locator(`.hl-role-dashboard[data-role="${role}"]`)).toBeVisible();await page.locator('.hl-role-dashboard [data-action-label="مكتبة العقود"]').click();}
  const panel=page.locator('#hl-contract-library');await expect(panel).toBeVisible();await expect(panel.locator('[data-library-note]')).not.toContainText('جارٍ تحميل');
  return {panel,calls,open:async()=>{await panel.locator('[data-library-open]').first().click();await expect(panel.locator('.hl-contract-paper')).toBeVisible();}};
}
test('library entry initializes draft templates only after acknowledgment',async({page})=>{
  const {panel,calls}=await seed(page,{empty:true});await expect(panel.locator('[data-library-list]')).toContainText('لا توجد قوالب');
  await panel.getByRole('button',{name:'إضافة القوالب الأولية'}).click();expect(calls.initializations).toBe(0);
  await panel.locator('[data-library-initialize] [name=reviewed]').check();await panel.getByRole('button',{name:'إضافة القوالب الأولية'}).click();
  await expect.poll(()=>calls.initializations).toBe(1);await expect(panel.locator('[data-library-list]')).toContainText('مسودة');
  await expect(panel.locator('[data-library-search] [name=q]')).toBeEnabled();
});
test('saving clauses creates a version and history retains the prior text',async({page})=>{
  const {panel,calls,open}=await seed(page);await open();await expect(panel.locator('.hl-contract-paper img[onerror]')).toHaveCount(0);
  await expect(panel.locator('.hl-contract-paper')).toContainText('<img src=x onerror=alert(1)>');
  await panel.locator('[data-library-editor] summary').click();await panel.locator('[data-library-edit] [name=clauses]').fill('بند أول\n\nبند ثان');await expect(panel.locator('[data-library-decision] button')).toBeDisabled();
  await panel.locator('[data-library-edit] [name=reason]').fill('تحسين صياغة بنود التعاون');await panel.getByRole('button',{name:'حفظ إصدار جديد'}).click();
  await expect.poll(()=>calls.revisions.length).toBe(1);expect(calls.revisions[0].expectedVersion).toBe(1);expect(calls.revisions[0].clauses).toEqual(['بند أول','بند ثان']);
  await expect(panel.locator('.hl-contract-paper')).toContainText('الإصدار 2');await expect(panel.locator('.hl-contract-paper')).toContainText('بند ثان');
  await panel.getByRole('button',{name:'سجل الإصدارات',exact:true}).click();await panel.locator('[data-library-history-list]').getByRole('button',{name:'الإصدار 1',exact:false}).click();
  await expect(panel.locator('.hl-contract-paper')).toContainText('يوقع الطرفان النسخة نفسها.');await expect(panel.locator('[data-library-edit]')).toHaveCount(0);
});
test('publish requires reviewed decision and sends the selected exact version',async({page})=>{
  const {panel,calls,open}=await seed(page,{state:'IN_REVIEW'});await open();const decision=panel.locator('[data-library-decision]');
  await decision.locator('[name=reason]').fill('اعتماد القالب بعد اكتمال المراجعات');await decision.getByRole('button',{name:'اعتماد للاستخدام',exact:true}).click();expect(calls.decisions).toHaveLength(0);
  await decision.locator('[name=reviewed]').check();await decision.getByRole('button',{name:'اعتماد للاستخدام',exact:true}).click();
  await expect.poll(()=>calls.decisions.length).toBe(1);expect(calls.decisions[0]).toMatchObject({action:'PUBLISH',reviewed:true,expectedVersion:1,expectedContentHash:'sha256:template-1'});await expect(panel.locator('.hl-library-state')).toHaveText('معتمد للاستخدام');
});
test('party reader sees approved template without editing or internal history',async({page})=>{
  const {panel,open}=await seed(page,{reader:true});await open();await expect(panel.locator('[data-library-edit],[data-library-decision]')).toHaveCount(0);await expect(panel.locator('[data-library-initialize]')).toBeHidden();await expect(panel.getByRole('button',{name:'سجل الإصدارات'})).toHaveCount(0);
});
test('library filters query template category and latest version status',async({page})=>{
  const {panel,calls}=await seed(page);await panel.locator('[data-library-search] [name=q]').fill('تعاون');await panel.locator('[name=category]').selectOption('COOPERATION');await panel.locator('[name=state]').selectOption('DRAFT');await panel.getByRole('button',{name:'بحث',exact:true}).click();
  await expect.poll(()=>calls.filters.at(-1)).toEqual({q:'تعاون',category:'COOPERATION',state:'DRAFT'});
});
test('mobile template and required field sources fit the viewport',async({page})=>{
  await page.setViewportSize({width:390,height:844});const {panel,open}=await seed(page);await open();await expect(panel.locator('.hl-contract-paper')).toContainText('بيانات العضوية');
  await page.evaluate(()=>document.fonts.ready);expect(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);await page.screenshot({path:test.info().outputPath('contract-library-mobile.png'),fullPage:true});
});
test('logout prevents a late template from restoring private content',async({page})=>{
  const {panel,open}=await seed(page);await open();let release;const pending=new Promise(r=>release=r);
  await page.route(/\/contracts\/library\/template-1$/,async route=>{await pending;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({titleAr:'بيانات متأخرة'})});});
  await panel.locator('[data-library-open]').first().click();await page.evaluate(()=>{sessionStorage.removeItem('hl-access-token');sessionStorage.removeItem('hl-refresh-token');window.HydrolandAuth.syncAuthUi();document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));});release();
  await expect(panel).toBeHidden();await expect(panel.locator('[data-library-detail]')).toBeEmpty();await expect(page.locator('[data-open-contract-library]')).toHaveCount(0);
});
test('revoked library access clears the previous selected template',async({page})=>{
  const {panel,calls,open}=await seed(page);await open();calls.blocked=true;await panel.locator('[data-library-refresh]').click();await expect(panel.locator('[data-library-detail]')).toBeEmpty();await expect(panel.locator('[data-library-list]')).not.toContainText('عقد تعاون');await expect(panel.locator('[data-library-note]')).toContainText('سحبت صلاحية');
});
test('HR staff opens library from profile without platform administrator access',async({page})=>{
  const {panel,open}=await seed(page,{staff:true});await open();await expect(panel.locator('.hl-contract-paper')).toBeVisible();await expect(page.locator('#profile-dialog')).not.toBeVisible();
});
test('revocation during a decision clears private text and editing controls',async({page})=>{
  const {panel,calls,open}=await seed(page);await open();const form=panel.locator('[data-library-decision]');await form.locator('[name=reason]').fill('إرسال النسخة للمراجعة القانونية');await form.locator('[name=reviewed]').check();calls.blocked=true;await form.getByRole('button',{name:'إرسال للمراجعة'}).click();await expect(panel.locator('[data-library-detail]')).toBeEmpty();await expect(panel.locator('[data-library-note]')).toContainText('سحبت صلاحية');
});

test('library identifies the temporary owner review and clears its notice on logout',async({page})=>{
 const {panel}=await seed(page,{temporaryOwnerReview:{active:true,expiresAt:new Date(Date.now()+3600000).toISOString()}});await expect(panel.locator('[data-library-owner-review]')).toBeVisible();await expect(panel.locator('[data-library-owner-review]')).toContainText('مراجعة المالك المؤقتة');
 await page.evaluate(()=>window.HydrolandAuth.terminateSession());await expect(panel.locator('[data-library-owner-review]')).toBeHidden();await expect(panel.locator('[data-library-owner-review]')).toHaveText('');
});


test('internal drafting approval remains distinct from legal review and publication',async({page})=>{
 const {panel,calls,open}=await seed(page,{employment:true,state:'IN_REVIEW'});await open();
 await expect(panel.getByRole('button',{name:'تسجيل المراجعة القانونية',exact:true})).toHaveCount(0);
 await expect(panel.getByRole('button',{name:'اعتماد للاستخدام',exact:true})).toHaveCount(0);
 const form=panel.locator('[data-library-decision]');await form.getByLabel('مرجع المراجعة أو الموافقة الداخلية').fill('موافقة داخلية تجريبية <b>نص</b>');await form.getByLabel('سبب القرار أو الملاحظة').fill('موافقة المالك على تجهيز الصياغة للمراجعة');await form.getByRole('button',{name:'تسجيل الموافقة الداخلية على الصياغة'}).click();expect(calls.decisions).toHaveLength(0);
 await form.getByRole('checkbox').check();await form.getByRole('button',{name:'تسجيل الموافقة الداخلية على الصياغة'}).click();
 await expect.poll(()=>calls.decisions.length).toBe(1);expect(calls.decisions[0]).toMatchObject({action:'INTERNAL_APPROVAL',expectedVersion:1,expectedContentHash:'sha256:template-1',reviewed:true});
 await expect(panel.locator('.hl-library-state')).toHaveText('قيد المراجعة');await expect(panel.locator('.hl-library-reviews')).toContainText('الموافقة الداخلية على الصياغة: مسجلة');await expect(panel.locator('.hl-library-reviews')).toContainText('بانتظار المراجعة المستقلة');await expect(panel.locator('.hl-library-reviews')).toContainText('لا تتيح استخدام القالب');await expect(panel.locator('.hl-library-reviews b')).toHaveCount(0);
 await expect(panel.getByRole('button',{name:'تسجيل الموافقة الداخلية على الصياغة'})).toHaveCount(0);await expect(panel.getByRole('button',{name:'اعتماد للاستخدام',exact:true})).toHaveCount(0);
});

test('temporary owner notice preserves the independent HR legal-review requirement',async({page})=>{
 const {panel,open}=await seed(page,{employment:true,state:'IN_REVIEW',temporaryOwnerReview:{active:true,expiresAt:new Date(Date.now()+3600000).toISOString()}});await open();await expect(panel.locator('[data-library-owner-review]')).toContainText('قوالب الموظفين تتطلب مراجعة قانونية مستقلة لا يتيحها هذا الوضع');await expect(panel.getByRole('button',{name:'تسجيل المراجعة القانونية',exact:true})).toHaveCount(0);
});
