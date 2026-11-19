const {test,expect}=require('@playwright/test');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const source=name=>readFileSync(path.join(__dirname,'../src/',name),'utf8');
const shell='<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><base href="http://127.0.0.1:4173/"></head><body><div class="top-actions"></div><main id="main"><section id="role-console"></section><section class="membership"></section><section id="hl-admin-employees"><p data-staff-feedback></p><div data-staff-readiness></div></section><section id="hl-documents"><header class="hl-doc-head"></header><select data-doc-org><option value="org-a">Fixture organization</option></select><select data-doc-department><option value="">All fixture departments</option></select><form data-doc-form><select data-doc-template></select><div data-doc-fields></div></form></section></main><dialog id="profile-dialog"><div class="profile-list"></div></dialog></body></html>';

// All data and writes in this suite are synthetic, held in the page. Production
// modules and the actual locale engine run unchanged; no service is contacted.
async function setup(page){
  await page.setContent(shell);
  await page.evaluate(()=>{
    window.localeFixture={session:1,active:true,calls:[]};
    window.HydrolandAuth={isAuthenticated:()=>localeFixture.active,getSessionVersion:()=>localeFixture.session,getAccessToken:()=>localeFixture.active?'synthetic':null};
    window.HydrolandPortalAccess={roleAllowed:()=>localeFixture.active,getCurrentRole:()=>localeFixture.active?'admin':'visitor',authorizeRole:async()=>localeFixture.active};
    window.HydrolandProfileData={profile:{id:'10000000-0000-4000-8000-000000000001',status:'ACTIVE',roles:[{role:'ADMIN',status:'ACTIVE'}]}};
    window.fetch=async()=>new Response('{}',{status:404});
  });
  await page.addScriptTag({content:source('hydroland-i18n.js')});
}
const locale=(page,value)=>page.evaluate(value=>window.HydrolandI18n.setLocale(value),value);
const revoke=page=>page.evaluate(()=>{localeFixture.active=false;localeFixture.session++;document.dispatchEvent(new Event('hydroland:session-cleared'));});

async function forms(page){
  await setup(page);
  await page.evaluate(()=>{
    const original={id:'custom-v1',organizationId:'org-a',code:'CUSTOM-FORM-'+'A'.repeat(32),department:'HR',titleAr:'مسودة',titleEn:'Pinned custom form',version:1,status:'ACTIVE',printable:true,fields:[
      {key:'heading',type:'SECTION',labelAr:'إغلاق',labelEn:'Pinned heading',required:false},
      {key:'answer',type:'TEXT',labelAr:'إغلاق',labelEn:'Pinned answer',required:false},
      {key:'statement',type:'STATEMENT',labelAr:'مسودة',labelEn:'Pinned statement',contentAr:'إغلاق <b>إقرار محفوظ</b>',contentEn:'Pinned English acknowledgment',required:false}
    ]};
    localeFixture.original=structuredClone(original);localeFixture.rows=[original];
    const result=data=>new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}});
    HydrolandAuth.authorizedFetch=async(url,options={})=>{
      localeFixture.calls.push({url,method:options.method||'GET',body:options.body});
      if(url==='/documents/workspace')return result([{role:'OWNER',status:'ACTIVE',organization:{id:'org-a',displayName:'إغلاق',kind:'DIVE_CENTER'}}]);
      if(url.endsWith('/branding'))return result({organizationId:'org-a',brandNameAr:'إغلاق',footerAr:'مسودة',brandVersion:1});
      if(url.endsWith('/templates'))return result(localeFixture.rows.filter(t=>t.status==='ACTIVE'));
      if(url.endsWith('/history'))return result({organizationId:'org-a',code:original.code,department:'HR',items:localeFixture.rows,nextBeforeVersion:null});
      if(options.method==='PUT'){
        const previous=localeFixture.rows.find(t=>url.endsWith('/'+t.id));previous.status='INACTIVE';
        const saved={...previous,...JSON.parse(options.body),id:'custom-v2',version:2,status:'ACTIVE'};
        localeFixture.rows.push(saved);return result(saved);
      }
      throw Error('Unexpected fixture request: '+url);
    };
    window.HydrolandDocuments={refresh:async()=>{}};
  });
  await page.addScriptTag({content:source('hydroland-form-library.js')});
  await page.locator('[data-hfl-open]').click();
  await expect(page.locator('[data-hfl-content=contentAr]')).toHaveValue('إغلاق <b>إقرار محفوظ</b>');
}

for(const viewport of [{width:1536,height:864},{width:768,height:1024},{width:390,height:844}]){
  test(`custom form chrome and ARIA switch without changing versioned content at ${viewport.width}px`,async({page},testInfo)=>{
    await page.setViewportSize(viewport);await forms(page);
    const dialog=page.locator('#hl-form-library'),clause=dialog.locator('[data-hfl-content=contentAr]');
    await clause.fill('إغلاق <i>مسودة المستخدم</i>');await clause.focus();
    const before=await dialog.locator('input,textarea,select').evaluateAll(nodes=>nodes.map(e=>[e.name,e.type,e.value,e.checked]));
    await locale(page,'en');
    await expect(dialog.locator('h2')).toHaveText('Administrative form library');
    await expect(dialog.locator('[data-hfl-type]').last().locator('option:checked')).toContainText(/statement|acknowledgment/i);
    await expect(dialog.locator('[data-hfl-move="-1"]').first()).toHaveAttribute('aria-label','Move field 1 up');
    await expect(page.locator('html')).toHaveAttribute('dir','ltr');
    await expect(dialog).not.toHaveAttribute('dir');
    await expect(dialog.locator('[data-hfl-preview]')).toHaveAttribute('dir','rtl');
    await expect(clause).toBeFocused();await expect(clause).toHaveValue('إغلاق <i>مسودة المستخدم</i>');
    await expect(dialog.locator('[data-hfl-preview]')).toContainText('إغلاق <i>مسودة المستخدم</i>');
    await expect(dialog.locator('[data-hfl-preview] i')).toHaveCount(0);
    expect(await dialog.locator('input,textarea,select').evaluateAll(nodes=>nodes.map(e=>[e.name,e.type,e.value,e.checked]))).toEqual(before);
    expect(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
    expect(await page.evaluate(()=>localeFixture.calls.some(c=>c.method!=='GET'))).toBe(false);
    await testInfo.attach(`locale-documents-form-en-${viewport.width}`,{body:await dialog.screenshot(),contentType:'image/png'});
    await locale(page,'ar');await expect(dialog.locator('[data-hfl-move="-1"]').first()).toHaveAttribute('aria-label','نقل الحقل 1 لأعلى');
    await expect(clause).toBeFocused();await expect(dialog.locator('[name=titleAr]')).toHaveValue('مسودة');
    await testInfo.attach(`locale-documents-form-ar-${viewport.width}`,{body:await dialog.screenshot(),contentType:'image/png'});
  });
}

test('English publication preserves canonical schema and previous clause; revocation cannot revive a private view',async({page})=>{
  await forms(page);await locale(page,'en');
  await page.locator('[data-hfl-content=contentAr]').fill('إغلاق <i>مسودة المستخدم</i>');
  await page.locator('[data-hfl-confirm]').check();await page.locator('[data-hfl-publish]').click();
  await expect(page.locator('[data-hfl-note]')).toContainText('Saved and published version 2');
  const value=await page.evaluate(()=>({rows:localeFixture.rows,writes:localeFixture.calls.filter(c=>c.method!=='GET')}));
  expect(value.writes).toHaveLength(1);expect(value.writes[0].url).toBe('/documents/templates/custom-v1');
  expect(JSON.parse(value.writes[0].body)).toMatchObject({titleAr:'مسودة',fields:[{key:'heading',type:'SECTION',labelAr:'إغلاق'},{key:'answer',type:'TEXT',labelAr:'إغلاق'},{key:'statement',type:'STATEMENT',contentAr:'إغلاق <i>مسودة المستخدم</i>'}]});
  expect(value.rows[0].fields[2].contentAr).toBe('إغلاق <b>إقرار محفوظ</b>');
  await locale(page,'ar');await expect(page.locator('[data-hfl-note]')).toContainText('حُفظ ونُشر الإصدار 2');
  await revoke(page);await locale(page,'en');await expect(page.locator('#hl-form-library')).not.toBeVisible();
  await expect(page.locator('[data-hfl-preview]')).toBeEmpty();
  expect(await page.evaluate(()=>HydrolandI18n.coverage.englishInterfaceAvailable)).toBe(false);
});

test('account actions localize while unknown role/name, drafts and authority values remain opaque',async({page})=>{
  await setup(page);
  await page.evaluate(()=>{HydrolandAuth.authorizedFetch=async(url,options={})=>{localeFixture.calls.push({url,method:options.method||'GET'});return new Response(JSON.stringify({items:[{id:'a',email:'synthetic@example.invalid',emailVerifiedAt:'2026-11-19',status:'ACTIVE',updatedAt:'v1',person:{firstName:'إغلاق',lastName:'<b>نص</b>'},roleAssignments:[{status:'ACTIVE',role:'STAFF'},{status:'ACTIVE',role:'إغلاق'}]}],nextCursor:null}),{status:200});};});
  await page.addScriptTag({content:source('hydroland-admin-accounts.js')});
  await page.evaluate(()=>HydrolandAdminAccounts.reload());
  const panel=page.locator('#hl-admin-accounts'),reason=panel.locator('textarea');await reason.fill('إغلاق <strong>claim</strong>');await reason.focus();
  await locale(page,'en');await expect(panel.locator('h3')).toHaveText('User and employee accounts');
  await expect(panel.locator('h4')).toHaveText('إغلاق <b>نص</b>');await expect(panel.locator('h4 b')).toHaveCount(0);
  await expect(panel).toContainText('Roles: Employee، إغلاق');
  await expect(panel.locator('[data-account-status]')).toHaveAttribute('data-status','SUSPENDED');
  await expect(reason).toHaveValue('إغلاق <strong>claim</strong>');await expect(reason).toBeFocused();
  await locale(page,'ar');await expect(panel.locator('[data-account-status] button')).toHaveText('تعليق الحساب');
  await revoke(page);await locale(page,'en');await expect(panel).toBeHidden();await expect(panel.locator('[data-accounts-list]')).toBeEmpty();
  expect(await page.evaluate(()=>localeFixture.calls.some(c=>c.method!=='GET'))).toBe(false);
});

test('caught local validation errors stay live while identical provider error text remains opaque',async({page})=>{
  await setup(page);
  await page.evaluate(()=>{
    localeFixture.validAccounts=false;
    HydrolandAuth.authorizedFetch=async(url,options={})=>{
      localeFixture.calls.push({url,method:options.method||'GET',body:options.body});
      if(options.method==='PATCH')return new Response(JSON.stringify({message:'تعذر تحميل الحسابات.'}),{status:503});
      return new Response(JSON.stringify({items:localeFixture.validAccounts?[{id:'a',email:'synthetic@example.invalid',emailVerifiedAt:'2026-11-19',status:'ACTIVE',updatedAt:'v1',person:{firstName:'اسم محفوظ'},roleAssignments:[]}]:null,nextCursor:null}),{status:200});
    };
  });
  await page.addScriptTag({content:source('hydroland-admin-accounts.js')});
  await page.evaluate(()=>HydrolandAdminAccounts.reload());
  const local=page.locator('[data-accounts-feedback]');
  await expect(local).toHaveText('تعذر تحميل الحسابات.');
  await locale(page,'en');await expect(local).toHaveText('Could not load accounts.');
  await locale(page,'ar');await expect(local).toHaveText('تعذر تحميل الحسابات.');
  await page.evaluate(()=>{localeFixture.validAccounts=true;return HydrolandAdminAccounts.reload();});
  const form=page.locator('[data-account-status]');
  await form.locator('[name=reason]').fill('سبب اصطناعي للاختبار');
  await form.locator('[name=reviewed]').check();await form.locator('button[type=submit]').click();
  await expect(form.locator('[data-account-feedback]')).toHaveText('تعذر تحميل الحسابات.');
  await locale(page,'en');await expect(form.locator('[data-account-feedback]')).toHaveText('تعذر تحميل الحسابات.');
  expect(await page.evaluate(()=>localeFixture.calls.filter(c=>c.method==='PATCH'))).toHaveLength(1);

  await page.addScriptTag({content:source('hydroland-research-contract.js')});
  await page.evaluate(()=>{
    let error;try{HydrolandResearchContract.evidence('invalid');}catch(caught){error=caught;}
    if(!(error instanceof Error))throw Error('Expected original Error contract');
    const note=document.createElement('p');note.id='authored-cross-module-error';document.body.append(note);
    HydrolandI18n.createScope('cross-module-error-fixture',{'ثابت':'Static'}).setMessage(note,HydrolandResearchContract.authoredErrorMessage(error));
  });
  await expect(page.locator('#authored-cross-module-error')).toContainText(/document|version/i);
  await locale(page,'ar');await expect(page.locator('#authored-cross-module-error')).toContainText('معرّف المستند');
  await expect(form.locator('[data-account-feedback]')).toHaveText('تعذر تحميل الحسابات.');
});

test('document table labels and approval references retain literal special characters in both languages',async({page})=>{
  await setup(page);
  await page.evaluate(()=>{
    document.querySelector('#hl-documents').remove();
    const label='A&B <نص>',column='C&D <عمود>',reference='مرجع A&B <b>إغلاق</b>';
    const template={id:'t',organizationId:'org-a',code:'CUSTOM',titleAr:'نموذج محفوظ',titleEn:'Saved form',department:'HR',version:1,status:'ACTIVE',fields:[{key:'rows',type:'TABLE',labelAr:label,labelEn:'Saved table',required:false,options:[column]}]};
    const inventory={organizationId:'org-a',observedAt:'2026-11-19T00:00:00Z',internalPlatform:false,departments:[{code:'HR',nameAr:'الموارد البشرية',summary:{types:1,noRecord:1,pendingApproval:0},items:[{code:'CUSTOM',titleAr:'نموذج محفوظ',activeTemplateId:'t',templateStatus:'READY',recordStatus:'NO_RECORD',counts:{DRAFT:0,PENDING_APPROVAL:0,APPROVED:0,SIGNED:0,ARCHIVED:0},total:0}]}]};
    const view={id:'contract-a',code:'CLIB-HR-X',titleAr:'عنوان محفوظ',titleEn:'Saved title',version:1,state:'DRAFT',contentHash:'sha256:fixture',versionCount:1,content:{schemaVersion:1,category:'EMPLOYMENT',fields:[],clauses:['فقرة محفوظة'],usageNotes:'نص محفوظ',source:{name:'مصدر',revision:'1'}},internalApproval:{reference,at:'2026-11-19T00:00:00Z'},reviews:{legal:{reference,at:'2026-11-19T00:00:00Z'},hr:{reference,at:'2026-11-19T00:00:00Z'}},capabilities:{},integration:{}};
    HydrolandAuth.authorizedFetch=async(url,options={})=>{
      localeFixture.calls.push({url,method:options.method||'GET'});
      if(options.method&&options.method!=='GET')throw Error('This fixture is read-only');
      let data;
      if(url==='/documents/workspace')data=[{organization:{id:'org-a',displayName:'Fixture'},role:'OWNER',status:'ACTIVE'}];
      else if(url.endsWith('/templates'))data=[template];
      else if(url.endsWith('/list'))data=[];
      else if(url.endsWith('/inventory'))data=inventory;
      else if(url==='/contracts/library/workspace')data={internal:true,owner:false,canInitialize:false};
      else if(url.endsWith('/contract-a'))data=view;
      else if(url.startsWith('/contracts/library?'))data={items:[view],total:1};
      else throw Error('Unexpected fixture request: '+url);
      return new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}});
    };
  });
  await page.addScriptTag({content:source('hydroland-documents.js')});
  await page.evaluate(()=>{HydrolandDocuments.open();});
  const remove=page.locator('[data-doc-table-remove]'),cell=page.locator('[data-doc-table-cell]');
  await expect(remove).toHaveAttribute('aria-label','حذف صف من A&B <نص>');
  await locale(page,'en');await expect(remove).toHaveAttribute('aria-label','Remove a row from A&B <نص>');
  await expect(cell).toHaveAttribute('aria-label','A&B <نص> - C&D <عمود>');
  await expect(cell).toHaveAttribute('data-doc-table-cell','C&D <عمود>');
  await locale(page,'ar');await expect(remove).toHaveAttribute('aria-label','حذف صف من A&B <نص>');
  await page.addScriptTag({content:source('hydroland-contract-library.js')});
  await page.evaluate(()=>HydrolandContractLibrary.open());
  await page.locator('[data-library-open]').click();
  const reviews=page.locator('.hl-library-reviews');
  for(const lang of ['ar','en','ar']){
    await locale(page,lang);
    expect((await reviews.textContent()).split('مرجع A&B <b>إغلاق</b>').length-1).toBe(3);
    await expect(reviews.locator('b')).toHaveCount(0);
    await expect(reviews).not.toContainText('&amp;');
  }
  expect(await page.evaluate(()=>localeFixture.calls.some(c=>c.method!=='GET'))).toBe(false);
});

test('known themes and greeting controls localize without changing registered names or canonical role values',async({page})=>{
  await setup(page);await page.addScriptTag({content:source('hydroland-themes.js')});
  await page.evaluate(()=>HydrolandThemes.register({id:'custom-user',nameAr:'الأفق البحري',category:'موسمي'}));
  await page.addScriptTag({content:source('hydroland-theme-manager.js')});
  await page.addScriptTag({content:source('hydroland-greeting-cards.js')});
  const form=page.locator('.greeting-form');await form.locator('[name=name]').fill('إغلاق <b>الاسم</b>');await form.locator('[name=role]').selectOption('مدرب');
  await form.locator('button').first().click();await form.locator('[name=name]').focus();await locale(page,'en');
  await expect(form.locator('[name=role]')).toHaveValue('مدرب');await expect(form.locator('[name=role] option:checked')).toHaveText('Instructor');
  await expect(form.locator('[name=name]')).toBeFocused();await expect(page.locator('[data-sender]')).toHaveText('Instructor إغلاق <b>الاسم</b> sends greetings');
  await expect(page.locator('[data-sender] b')).toHaveCount(0);
  await page.locator('[data-hl-theme-button]').click();await expect(page.locator('[data-id=ocean-horizon] strong')).toHaveText('Ocean horizon');
  await expect(page.locator('[data-id=custom-user] strong')).toHaveText('الأفق البحري');await expect(page.locator('[data-id=custom-user] small')).toHaveText('موسمي');
  await locale(page,'ar');await expect(page.locator('[data-id=ocean-horizon] strong')).toHaveText('الأفق البحري');
  expect(await page.evaluate(()=>HydrolandThemes.list().find(t=>t.id==='ocean-horizon').nameAr)).toBe('الأفق البحري');
});

test('technology form options and nested status labels roundtrip without translating stored records or sending actions',async({page})=>{
  await setup(page);
  await page.evaluate(()=>{
    const row={id:'request-a',revision:1,kind:'CHANGE',title:'إغلاق <b>طلب محفوظ</b>',state:'DRAFT',scopeReference:'مسودة',expiresAt:'2026-11-20T12:00:00.000Z',requestProof:{reference:'إغلاق'},executionPlan:'إغلاق',testPlan:'مسودة',rollbackPlan:'إغلاق'};
    HydrolandAuth.authorizedFetch=async(url,options={})=>{
      localeFixture.calls.push({url,method:options.method||'GET'});
      const data=url.includes('/references')?{items:[{id:'source',label:'إغلاق',version:1,contentHash:'a'.repeat(64),scopeReference:'مسودة'}],nextCursor:null}:url.endsWith('/request-a')?{schemaVersion:1,policy:'TECHNOLOGY_REQUEST_V1',record:row,role:'OWNER',actions:['SUBMIT','REVOKE'],history:[{action:'CREATE',revision:1,reason:'إغلاق'}],historyTruncated:false}:{schemaVersion:1,policy:'TECHNOLOGY_REQUEST_V1',role:'OWNER',items:[row],nextCursor:null};
      return new Response(JSON.stringify(data),{status:200});
    };
  });
  await page.addScriptTag({content:source('hydroland-technology-requests.js')});await page.evaluate(()=>HydrolandTechnologyRequests.open());
  await page.locator('[data-case-id]').click();const dialog=page.locator('#hl-technology-requests'),reason=dialog.locator('[data-tr-action] [name=reason]');
  await reason.fill('إغلاق <em>سبب</em>');await reason.focus();await locale(page,'en');
  await expect(dialog.locator('h2')).toHaveText('Technology and security requests');
  await expect(dialog.locator('[data-tr-list]')).toContainText('Change request · إغلاق <b>طلب محفوظ</b> · Draft');
  await expect(dialog.locator('[data-tr-summary]')).toContainText('Draft · Version 1');
  await expect(dialog.locator('[name=kind]')).toHaveValue('CHANGE');await expect(dialog.locator('[name=kind] option[value=CHANGE]')).toHaveText('Change request');
  await expect(dialog.locator('[name=document] option[value=source]')).toHaveText('إغلاق');await expect(dialog.locator('[name=action] option[value=SUBMIT]')).toHaveText('Submit for approval');
  await expect(reason).toHaveValue('إغلاق <em>سبب</em>');await expect(reason).toBeFocused();
  await locale(page,'ar');await expect(dialog.locator('[data-tr-list]')).toContainText('طلب تغيير');
  await revoke(page);await locale(page,'en');await expect(dialog).not.toBeVisible();await expect(dialog.locator('[data-tr-body]')).toBeEmpty();
  expect(await page.evaluate(()=>localeFixture.calls.some(c=>c.method!=='GET'))).toBe(false);
});

test('HR source facts localize while recorded department, position and state-label contract remain unchanged',async({page})=>{
  await setup(page);await page.addScriptTag({content:source('hydroland-hr-source.js')});
  await page.evaluate(()=>{
    const scope={organizationId:'org',templateId:'template',templateVersion:1,templateCode:'HR-APPOINTMENT-RECORD',kind:'UNSAVED_REFERENCE_PREVIEW',documentId:null,documentVersion:null};
    const result={...scope,schemaVersion:1,policy:'HR_APPOINTMENT_REFERENCE_CHECK_V1',readOnly:true,operationalClosureVerified:false,commencementEstablished:false,match:'MATCHED',observedAt:'2026-11-19T00:00:00.000Z',source:{employmentId:'person-opaque',appointmentId:'appointment-opaque',employmentStatus:'ACTIVE',appointmentStatus:'EFFECTIVE',decisionApproverPresent:true,department:{nameAr:'إغلاق',active:true},position:{titleAr:'مسودة',active:true},scheduledEffectiveAt:null}};
    const article=document.createElement('article');article.id='fixture-hr-facts';article.innerHTML=HydrolandHrSource.format(result,scope);document.body.append(article);HydrolandI18n.bindAuthored(article);
  });
  const facts=page.locator('#fixture-hr-facts');await locale(page,'en');
  await expect(facts).toContainText('Employee reference');await expect(facts).toContainText('Active');await expect(facts).toContainText('Effective');
  await expect(facts).toContainText('إغلاق');await expect(facts).toContainText('مسودة');
  expect(await page.evaluate(()=>HydrolandHrSource.stateLabel('ACTIVE'))).toBe('نشط');
  await locale(page,'ar');await expect(facts).toContainText('مرجع الموظف');await expect(facts).toContainText('إغلاق');
});

test('marketing ARIA, channels and status update without replacing drafts or reviving revoked content',async({page})=>{
  await setup(page);
  await page.evaluate(()=>{
    const record={id:'marketing-a',revision:1,status:'DRAFT',title:'إغلاق',objective:'مسودة <b>نص محفوظ</b>',channels:['WEB'],createdAt:'2026-11-19T00:00:00.000Z',updatedAt:'2026-11-19T00:00:00.000Z'};
    HydrolandAuth.authorizedFetch=async(url,options={})=>{
      localeFixture.calls.push({url,method:options.method||'GET'});
      const common={schemaVersion:1,policy:'MARKETING_CAMPAIGN_DRAFT_V1',notice:'إغلاق'};
      const data=url.endsWith('/marketing-a')?{...common,record,history:[{revision:1,action:'MARKETING_CAMPAIGN_DRAFT_CREATED',reason:'إغلاق'}],historyTruncated:false}:{...common,items:[record],hasMore:false,nextCursor:null};
      return new Response(JSON.stringify(data),{status:200});
    };
  });
  await page.addScriptTag({content:source('hydroland-marketing-drafts.js')});
  await page.locator('[data-marketing-drafts]>summary').click();await page.locator('[data-marketing-draft-id]').click();
  const box=page.locator('[data-marketing-drafts]'),title=box.locator('[data-marketing-edit] [name=title]'),objective=box.locator('[data-marketing-edit] [name=objective]');
  await expect(title).toHaveValue('إغلاق');await objective.fill('إغلاق <i>مسودة غير محفوظة</i>');await objective.focus();
  await locale(page,'en');await expect(box.locator('summary')).toHaveText('Marketing campaign drafts');
  await expect(title).toHaveAttribute('aria-label','Edit draft name');await expect(title).toHaveValue('إغلاق');
  await expect(objective).toHaveValue('إغلاق <i>مسودة غير محفوظة</i>');await expect(objective).toBeFocused();
  await expect(box.locator('[data-marketing-create] [name=channels] option[value=WEB]')).toHaveText('Website');
  await expect(box.locator('[data-marketing-list]')).toContainText('إغلاق · Draft · Version 1');
  await expect(box.locator('[data-marketing-history]')).toContainText('Create');await expect(box.locator('[data-marketing-history]')).toContainText('إغلاق');
  await locale(page,'ar');await expect(title).toHaveAttribute('aria-label','تعديل اسم المسودة');
  await revoke(page);await locale(page,'en');await expect(box.locator('[data-marketing-list]')).toBeEmpty();await expect(title).toHaveValue('');
  expect(await page.evaluate(()=>localeFixture.calls.some(c=>c.method!=='GET'))).toBe(false);
});
