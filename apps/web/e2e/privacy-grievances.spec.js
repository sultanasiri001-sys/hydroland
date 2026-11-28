import {test,expect} from '@playwright/test';

// Actual shipped screen and native auth, with deterministic API responses.
// Native source mutations, audit, independent decisions and delivery rollback
// are exercised separately by privacy-grievance-http-checks.mjs.
test.use({timezoneId:'Asia/Riyadh'});
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const center={id:'center-own',displayName:'مركز الطلب الأصلي'};
const row=extra=>({
  id:'grievance-original',organization:center,description:'PRIVATE-ORIGINAL-CASE',
  state:'CENTER_PENDING',dueAt:'2030-11-27T06:00:00Z',
  personalDataRequestId:null,canAppeal:false,canCenter:false,canDepartment:false,
  hasExecutionProof:false,...extra
});

async function install(page,options={}){
  const state={items:[],centers:[],writes:[],reads:0,readResponses:0,holdRead:false,erasureReads:0,
    holdWrite:false,failWrite:false,role:'DIVER',locale:'ar',...options};
  await page.setViewportSize({width:state.locale==='en'?1280:390,height:844});
  await page.route('**/api/v1/**',route=>json(route,[]));
  await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
  await page.route(/\/api\/v1\/me$/,route=>json(route,{
    id:'grievance-browser-account',email:'grievance@example.invalid',status:'ACTIVE',
    person:{firstName:'عضو',lastName:'اختبار'},roleAssignments:[{role:state.role,status:'ACTIVE'}]
  }));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
  await page.route(/\/api\/v1\/privacy\/retention-(activation|templates|dispositions)$/,route=>{
    const request=route.request(),path=new URL(request.url()).pathname;
    expect(request.headers().authorization).toBe('Bearer grievance-access');
    if(request.method()==='GET')return json(route,state.retentionActivation);
    const body=request.postDataJSON();state.writes.push({path,body});
    if(path.endsWith('templates'))state.retentionActivation.templatesReady=true;
    else if(path.endsWith('dispositions'))state.retentionActivation.dispositionSources.find(item=>item.source.documentId===body.source.documentId).authorized=true;
    else state.retentionActivation.effectiveFrom='2026-11-28T03:00:00.000Z';
    return json(route,{saved:true},201);
  });
  await page.route(/\/api\/v1\/privacy\/grievances(?:\/[^?]*)?(?:\?.*)?$/,async route=>{
    const request=route.request(),path=new URL(request.url()).pathname.replace('/api/v1/privacy/grievances','');
    expect(request.headers().authorization).toBe('Bearer grievance-access');
    if(request.method()==='GET'){
      if(path.endsWith('/erasure-options')){
        state.erasureReads++;
        expect(path).toBe('/grievance-original/erasure-options');
        if(state.holdErasureRead)await new Promise(resolve=>{state.releaseErasureRead=resolve;});
        return json(route,state.erasureOptions);
      }
      expect(path).toBe('');expect(new URL(request.url()).searchParams.get('page')).toBe('1');
      state.reads++;
      const response=structuredClone({centers:state.centers,topics:[{domain:'payments',ar:'بيانات المدفوعات',en:'Payment data'}],items:state.items,more:false,canActivateRetention:state.canActivateRetention===true});
      if(state.holdRead)await new Promise(resolve=>{state.releaseRead=resolve;});
      try{await json(route,response);}finally{state.readResponses++;}
      return;
    }
    expect(request.method()).toBe('POST');
    const body=request.postDataJSON();state.writes.push({path,body});
    if(state.holdWrite)await new Promise(resolve=>{state.releaseWrite=resolve;});
    if(state.failWrite){state.failWrite=false;return json(route,{message:'تعذّر الحفظ في هذا الاختبار'},503);}
    let saved;
    if(path===''){
      saved=row({id:'grievance-created',description:body.description});
      state.items=[saved,...state.items];
    }else{
      const [,id,action]=path.split('/');
      saved=state.items.find(item=>item.id===decodeURIComponent(id));
      expect(saved,'Action must keep the selected native case identifier').toBeTruthy();
      if(action==='erasure'){
        if(state.incompleteErasure)return json(route,{executed:true,externalReceiptSaved:false},201);
        saved.hasExecutionProof=true;
        return json(route,{executed:true,externalReceiptSaved:true},201);
      }else if(action==='retention-holds'){
        return json(route,{id:'hold-original',held:true},201);
      }else if(action==='appeal'){
        saved.state='DEPARTMENT_PENDING';saved.canAppeal=false;saved.appealReason=body.reason;
      }else{
        expect(action).toBe('actions');
        if(body.action==='CENTER_HANDLE'){saved.state='CENTER_HANDLING';saved.centerAction=body.message;}
        else{
          saved.state='RESOLVED';saved.outcome=body.message;saved.canCenter=false;saved.canDepartment=false;
          if(body.action==='CENTER_RESOLVE')saved.firstOutcome=body.message;
        }
      }
    }
    return json(route,saved,201);
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  // Support loads after grievances in the real sequential application loader.
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandI18n&&window.HydrolandSupport));
  await page.evaluate(locale=>window.HydrolandI18n.setLocale(locale),state.locale);
  await page.evaluate(async()=>{
    window.HydrolandAuth.acceptSession({accessToken:'grievance-access',refreshToken:'grievance-refresh'},window.HydrolandAuth.beginAuthAttempt());
    await window.HydrolandProfile.load();
  });
  await page.locator('#profile-open').click();
  await page.locator('#profile-dialog [data-hl-action="settings"]').click();
  await page.locator('#hl-profile-editor [data-privacy-grievances]').click();
  await expect(page.locator('#hl-privacy-grievances')).toBeVisible();
  return state;
}
const panel=page=>page.locator('#hl-privacy-grievances');
const record=(page,description='PRIVATE-ORIGINAL-CASE')=>panel(page).locator('section').filter({hasText:description});

test('member submits through the shipped panel with the same source key on retry and safe mobile text',async({page})=>{
  const state=await install(page,{centers:[center],holdWrite:true,failWrite:true}),dialog=panel(page);
  await dialog.getByRole('combobox',{name:'المركز',exact:true}).selectOption(center.id);
  await dialog.getByLabel('موضوع البيانات').selectOption('payments');
  const description='<img src=x onerror="window.grievanceInjected=true"> طلب تصحيح خاص';
  await dialog.getByLabel('وصف الطلب').fill(description);
  const submit=dialog.getByRole('button',{name:'إرسال للمركز'}),form=submit.locator('..');
  await submit.click();await expect.poll(()=>state.writes.length).toBe(1);await expect(submit).toBeDisabled();
  await form.dispatchEvent('submit');expect(state.writes).toHaveLength(1);
  state.holdWrite=false;state.releaseWrite();
  await expect(dialog.getByRole('status')).toHaveText('تعذّر الحفظ في هذا الاختبار');
  await expect(dialog.getByLabel('وصف الطلب')).toHaveValue(description);
  await expect(dialog.locator('section')).toHaveCount(0);
  await submit.click();await expect(dialog.getByRole('status')).toHaveText('تم حفظ الإجراء.');
  expect(state.writes).toHaveLength(2);expect(state.writes[1]).toEqual(state.writes[0]);
  expect(state.writes[0].path).toBe('');
  expect(state.writes[0].body).toEqual({centerId:center.id,topic:'payments',description,requestKey:expect.stringMatching(/^[0-9a-f-]{36}$/)});
  await expect(record(page,description)).toContainText(description);
  await expect(dialog.locator('section img')).toHaveCount(0);
  expect(await page.evaluate(()=>window.grievanceInjected)).toBeUndefined();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('member appeal keeps the native grievance and data-request references and original decision',async({page})=>{
  const state=await install(page,{items:[row({state:'RESOLVED',personalDataRequestId:'data-request-original',firstOutcome:'القرار الأول محفوظ',canAppeal:true})]});
  const item=record(page);
  await expect(item).toContainText('data-request-original');
  await expect(item).toContainText('القرار الأول محفوظ');
  await item.getByLabel('سبب التظلم على القرار').fill('أطلب مراجعة مستقلة للقرار');
  await item.getByRole('button',{name:'إحالة التظلم للإدارة المختصة'}).click();
  await expect(item).toContainText('عند الإدارة المختصة');
  expect(state.writes).toEqual([{path:'/grievance-original/appeal',body:{reason:'أطلب مراجعة مستقلة للقرار'}}]);
  await expect(item).toContainText('data-request-original');
  await expect(item).toContainText('القرار الأول محفوظ');
  await expect(item.getByRole('button')).toHaveCount(0);
});

test('center records handling and a deferred decision without claiming absent execution proof',async({page})=>{
  const state=await install(page,{role:'DIVE_CENTER',items:[row({personalDataRequestId:'data-request-center',canCenter:true})]});
  const item=record(page);
  await expect(item.getByLabel('تقرير داخلي للإدارة العليا')).toHaveCount(0);
  await expect(item.getByLabel('سبب التظلم على القرار')).toHaveCount(0);
  await expect(item.locator('option[value="APPLIED"]')).toHaveCount(0);
  await item.getByLabel('الإجراء الذي اتخذه المركز').fill('راجع المركز مرجع الطلب الأصلي');
  await item.getByRole('button',{name:'تسجيل الإجراء',exact:true}).click();
  await expect(item).toContainText('المركز يعالج الطلب');
  await expect(item.getByRole('button',{name:'تسجيل الإجراء',exact:true})).toHaveCount(0);
  await item.getByLabel('قرار طلب البيانات').selectOption('DEFERRED');
  await item.getByLabel('النتيجة التي ستصل للمشترك والمركز').fill('بانتظار التحقق من مرجع التنفيذ');
  await item.getByRole('button',{name:'إنهاء المعالجة وإبلاغ الطرفين'}).click();
  await expect(item).toContainText('تمت المعالجة');
  expect(state.writes).toEqual([
    {path:'/grievance-original/actions',body:{action:'CENTER_HANDLE',message:'راجع المركز مرجع الطلب الأصلي'}},
    {path:'/grievance-original/actions',body:{action:'CENTER_RESOLVE',message:'بانتظار التحقق من مرجع التنفيذ',disposition:'DEFERRED'}}
  ]);
  await expect(item).toContainText('data-request-center');
  await expect(item.getByRole('button')).toHaveCount(0);
});

test('department decision sends the selected native case, linked disposition and separate executive report',async({page})=>{
  const state=await install(page,{role:'STAFF',locale:'en',items:[row({state:'DEPARTMENT_PENDING',personalDataRequestId:'data-request-department',firstOutcome:'Preserved center decision',canDepartment:true,hasExecutionProof:true})]});
  const item=record(page);
  await expect(panel(page)).toHaveAccessibleName('Personal data grievances');
  await expect(item.getByRole('button',{name:'Record action',exact:true})).toHaveCount(0);
  await expect(item.getByRole('button',{name:'Submit appeal to the department'})).toHaveCount(0);
  await item.getByLabel('Data request decision').selectOption('APPLIED');
  await item.getByLabel('Outcome for the member and center').fill('Applied using the existing linked source');
  await item.getByLabel('Internal report for executive management').fill('PRIVATE-EXECUTIVE-REPORT');
  await item.getByRole('button',{name:'File report and notify both parties'}).click();
  await expect(item).toContainText('Resolved');
  expect(state.writes).toEqual([{path:'/grievance-original/actions',body:{action:'DEPARTMENT_RESOLVE',message:'Applied using the existing linked source',report:'PRIVATE-EXECUTIVE-REPORT',disposition:'APPLIED'}}]);
  await expect(item).toContainText('data-request-department');
  await expect(item).toContainText('Preserved center decision');
  await expect(panel(page)).not.toContainText('PRIVATE-EXECUTIVE-REPORT');
  await expect(item.getByRole('button')).toHaveCount(0);
});

test('state and proof alone grant no center, department or appeal controls',async({page})=>{
  const state=await install(page,{items:['CENTER_PENDING','DEPARTMENT_PENDING','RESOLVED'].map((status,index)=>row({
    id:'read-only-'+index,state:status,personalDataRequestId:'retained-source-'+index,hasExecutionProof:true
  }))});
  const dialog=panel(page);await expect(dialog.locator('section')).toHaveCount(3);
  await expect(dialog.locator('section form')).toHaveCount(0);
  await expect(dialog.locator('section button')).toHaveCount(0);
  for(let index=0;index<3;index++)await expect(dialog).toContainText('retained-source-'+index);
  expect(state.writes).toEqual([]);
});

test('logout closes the grievance panel and rejects a late private list response',async({page})=>{
  const state=await install(page,{items:[row({description:'PRIVATE-LATE-GRIEVANCE'})],holdRead:true});
  await expect.poll(()=>Boolean(state.releaseRead)).toBe(true);
  await page.evaluate(()=>window.HydrolandAuth.terminateSession());
  await expect(panel(page)).toHaveCount(0);
  state.releaseRead();await expect.poll(()=>state.readResponses).toBe(1);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await expect(page.locator('body')).not.toContainText('PRIVATE-LATE-GRIEVANCE');
  await expect(panel(page)).toHaveCount(0);expect(state.writes).toEqual([]);
});

const erasureSource={documentId:'approved-disposition-original',version:3,contentHash:'sha256:'+'a'.repeat(64),sourceHash:'b'.repeat(64)};
const erasureItem=()=>row({personalDataRequestId:'request-to-erase',requestKind:'ERASURE',requestDomain:'BOOKINGS',canCenter:true});

test('erasure uses the chosen approved source and preserves the operation key on retry',async({page})=>{
  const state=await install(page,{role:'DIVE_CENTER',items:[erasureItem()],failWrite:true,
    erasureOptions:{enabled:true,sources:[{label:'قرار التصرف ٣',source:erasureSource}],holds:[]}});
  const item=record(page);
  await item.getByRole('button',{name:'قرارات الحذف والتجميد'}).click();
  await item.getByRole('combobox',{name:'قرار التصرف المعتمد',exact:true}).selectOption('0');
  await item.getByLabel('أؤكد تنفيذ الحذف المحدد في القرار بعد مراجعة موانع الاحتفاظ.').check();
  await item.getByRole('button',{name:'تنفيذ الحذف المعتمد'}).click();
  await expect(panel(page).getByRole('status')).toHaveText('تعذّر الحفظ في هذا الاختبار');
  await expect(item.locator('option[value="APPLIED"]')).toHaveCount(0);
  await item.getByRole('button',{name:'تنفيذ الحذف المعتمد'}).click();
  await expect(panel(page).getByRole('status')).toHaveText('تم حفظ الإجراء.');
  expect(state.writes).toHaveLength(2);expect(state.writes[1]).toEqual(state.writes[0]);
  expect(state.writes[0]).toEqual({path:'/grievance-original/erasure',body:{source:erasureSource,operationId:expect.stringMatching(/^[0-9a-f-]{36}$/)}});
  await expect(item.locator('option[value="APPLIED"]')).toHaveCount(1);
  await expect(item.locator('[data-erasure-controls]')).toHaveCount(0);
  await expect(panel(page)).not.toContainText(erasureSource.contentHash);
});

test('unpublished erasure receipt cannot appear as completed execution',async({page})=>{
  const state=await install(page,{role:'DIVE_CENTER',items:[erasureItem()],incompleteErasure:true,
    erasureOptions:{enabled:true,sources:[{label:'قرار معتمد',source:erasureSource}],holds:[]}});
  const item=record(page);
  await item.getByRole('button',{name:'قرارات الحذف والتجميد'}).click();
  await item.getByRole('combobox',{name:'قرار التصرف المعتمد',exact:true}).selectOption('0');
  await item.getByLabel('أؤكد تنفيذ الحذف المحدد في القرار بعد مراجعة موانع الاحتفاظ.').check();
  await item.getByRole('button',{name:'تنفيذ الحذف المعتمد'}).click();
  await expect(panel(page).getByRole('status')).toContainText('لم يكتمل إثبات التنفيذ');
  await expect(item.locator('option[value="APPLIED"]')).toHaveCount(0);
  expect(state.reads).toBe(1);
});

test('inactive erasure still permits a scoped hold and prevents self-confirmation of its release',async({page})=>{
  const state=await install(page,{role:'DIVE_CENTER',items:[erasureItem()],erasureOptions:{enabled:false,sources:[],
    holds:[{id:'existing-hold',reason:'بلاغ مفتوح يحتاج حفظ السجل',releasePending:true,canConfirmRelease:false}]}});
  const item=record(page);
  await item.getByRole('button',{name:'قرارات الحذف والتجميد'}).click();
  await expect(item).toContainText('تنفيذ الحذف غير مفعّل');
  await expect(item.getByRole('button',{name:'تنفيذ الحذف المعتمد'})).toHaveCount(0);
  await expect(item).toContainText('طلب رفع التجميد ينتظر تأكيد مراجع آخر');
  await expect(item.getByRole('button',{name:'تأكيد رفع التجميد'})).toHaveCount(0);
  await item.getByLabel('سبب تجميد الحذف').fill('مطالبة قائمة تتطلب حفظ السجل');
  await item.getByRole('button',{name:'تسجيل تجميد',exact:true}).click();
  await expect(panel(page).getByRole('status')).toHaveText('تم حفظ الإجراء.');
  expect(state.writes).toEqual([{path:'/grievance-original/retention-holds',body:{reason:'مطالبة قائمة تتطلب حفظ السجل',entireDomain:false}}]);
});

test('late erasure options are discarded after the account session ends',async({page})=>{
  const state=await install(page,{role:'DIVE_CENTER',items:[erasureItem()],holdErasureRead:true,
    erasureOptions:{enabled:true,sources:[{label:'PRIVATE-LATE-ERASURE-DECISION',source:erasureSource}],holds:[]}});
  await record(page).getByRole('button',{name:'قرارات الحذف والتجميد'}).click();
  await expect.poll(()=>Boolean(state.releaseErasureRead)).toBe(true);
  await page.evaluate(()=>window.HydrolandAuth.terminateSession());
  state.releaseErasureRead();
  await expect(panel(page)).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('PRIVATE-LATE-ERASURE-DECISION');
  expect(state.writes).toEqual([]);
});

test('owner prepares empty retention templates without recording an effective date',async({page})=>{
  const state=await install(page,{role:'ADMIN',canActivateRetention:true,
    retentionActivation:{canActivate:true,templatesReady:false,effectiveFrom:null,sources:[]}});
  const section=panel(page).locator('[data-retention-activation]');
  await section.getByRole('button',{name:'إدارة نفاذ مدد الاحتفاظ'}).click();
  await expect(section).toContainText('لا يوجد قرار نفاذ معتمد متاح');
  await expect(section.getByRole('button',{name:'تثبيت قرار النفاذ',exact:true})).toHaveCount(0);
  await section.getByRole('button',{name:'تجهيز نماذج الاحتفاظ والتصرف'}).click();
  await expect(panel(page).getByRole('status')).toHaveText('تم حفظ الإجراء.');
  expect(state.writes).toEqual([{path:'/api/v1/privacy/retention-templates',body:{confirmed:true}}]);
  expect(state.retentionActivation.effectiveFrom).toBeNull();
  await section.getByRole('button',{name:'إدارة نفاذ مدد الاحتفاظ'}).click();
  await expect(section.getByRole('button',{name:'تجهيز نماذج الاحتفاظ والتصرف'})).toHaveCount(0);
});

test('owner records only the selected approved retention source after confirming completion',async({page})=>{
  const source={...erasureSource,documentId:'approved-activation-source'};
  const state=await install(page,{role:'ADMIN',locale:'en',canActivateRetention:true,
    retentionActivation:{canActivate:true,templatesReady:true,effectiveFrom:null,sources:[{label:'Approved activation 2026',source}]}});
  const section=panel(page).locator('[data-retention-activation]');
  await section.getByRole('button',{name:'Manage retention effective date'}).click();
  await section.getByRole('combobox',{name:'Retention effective-date decision',exact:true}).selectOption('0');
  await section.getByLabel('I confirm technical completion and the selected effective-date decision.').check();
  await section.getByRole('button',{name:'Record effective-date decision'}).click();
  await expect(panel(page).getByRole('status')).toHaveText('Saved.');
  expect(state.writes).toEqual([{path:'/api/v1/privacy/retention-activation',body:{source}}]);
  await section.getByRole('button',{name:'Manage retention effective date'}).click();
  await expect(section).toContainText('Approved effective date:');
  await expect(section.getByRole('button',{name:'Record effective-date decision'})).toHaveCount(0);
  await expect(section).not.toContainText(source.contentHash);
});

test('owner binds an independently reviewed disposition without activating or executing erasure',async({page})=>{
  const previous={...erasureSource,documentId:'already-bound-disposition'};
  const state=await install(page,{role:'ADMIN',canActivateRetention:true,
    retentionActivation:{canActivate:true,templatesReady:true,effectiveFrom:null,sources:[],dispositionSources:[
      {label:'قرار مربوط سابقًا',source:previous,authorized:true},
      {label:'قرار تصرف بعد المراجعة المستقلة',source:erasureSource,authorized:false}
    ]}});
  const section=panel(page).locator('[data-retention-activation]');
  await section.getByRole('button',{name:'إدارة نفاذ مدد الاحتفاظ'}).click();
  const choices=section.getByRole('combobox',{name:'قرار التصرف بعد المراجعة المستقلة',exact:true});
  await expect(choices.locator('option')).toHaveCount(2);
  await choices.selectOption('0');
  await section.getByRole('button',{name:'ربط قرار التصرف',exact:true}).click();
  expect(state.writes).toHaveLength(0);
  await section.getByLabel('أؤكد ربط القرار المعتمد بالسجل المحدد بعد المراجعة المستقلة.').check();
  await section.getByRole('button',{name:'ربط قرار التصرف',exact:true}).click();
  await expect(panel(page).getByRole('status')).toHaveText('تم حفظ الإجراء.');
  expect(state.writes).toEqual([{path:'/api/v1/privacy/retention-dispositions',body:{source:erasureSource}}]);
  expect(state.retentionActivation.effectiveFrom).toBeNull();
  await section.getByRole('button',{name:'إدارة نفاذ مدد الاحتفاظ'}).click();
  await expect(section.getByRole('button',{name:'ربط قرار التصرف',exact:true})).toHaveCount(0);
  await expect(section).not.toContainText(erasureSource.contentHash);
});

test('authorized reviewers can release a hold on a closed case without reopening erasure controls',async({page})=>{
  const state=await install(page,{role:'DIVE_CENTER',items:[row({state:'RESOLVED',requestKind:'ERASURE',
    personalDataRequestId:'closed-request-with-hold',canManageHolds:true})],erasureOptions:{enabled:false,sources:[],
    holds:[{id:'existing-hold',reason:'احتفاظ طلبت مراجعته',releasePending:true,canConfirmRelease:true}]}});
  const item=record(page);
  await item.getByRole('button',{name:'قرارات الحذف والتجميد'}).click();
  await expect(item).toContainText('الطلب مغلق');
  await expect(item.getByRole('button',{name:'تسجيل تجميد',exact:true})).toHaveCount(0);
  await expect(item.getByRole('button',{name:'تنفيذ الحذف المعتمد'})).toHaveCount(0);
  await expect(item.getByRole('button',{name:'إنهاء المعالجة وإبلاغ الطرفين'})).toHaveCount(0);
  await item.getByLabel('سبب رفع التجميد').fill('راجعت زوال سبب الاحتفاظ بصورة مستقلة');
  await item.getByRole('button',{name:'تأكيد رفع التجميد',exact:true}).click();
  await expect(panel(page).getByRole('status')).toHaveText('تم حفظ الإجراء.');
  expect(state.writes).toEqual([{path:'/grievance-original/retention-holds/existing-hold/release',
    body:{reason:'راجعت زوال سبب الاحتفاظ بصورة مستقلة'}}]);
});
