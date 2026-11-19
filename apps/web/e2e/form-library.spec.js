const { test, expect } = require('@playwright/test');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const source = readFileSync(path.join(__dirname, '../src/hydroland-form-library.js'), 'utf8');

// Client regression fixture only: no production data or external requests.
const fixture = '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><body><section id="hl-documents"><header class="hl-doc-head"><h2>المستندات</h2></header><select data-doc-org><option value="org-a">الجهة الأولى</option><option value="org-b">الجهة الثانية</option></select><select data-doc-department><option value="">كل الإدارات</option><option value="HR">الموارد البشرية</option></select><form data-doc-form><select data-doc-template><option value="t1">النموذج</option></select><div data-doc-fields><input name="employeeName"></div></form></section></body></html>';
const template = { id:'t1', organizationId:'org-a', code:'HR-EMPLOYEE-REPORT', department:'HR', titleAr:'تقرير بيانات موظف', titleEn:'Employee report', version:1, status:'ACTIVE', printable:true, fields:[{key:'employeeNo',labelAr:'رقم الموظف',labelEn:'Employee number',type:'TEXT',required:true},{key:'status',labelAr:'الحالة',labelEn:'Status',type:'SELECT',required:true,options:['نشط','موقوف']}] };
async function setup(page, {role='OWNER', pending=false, templates=[template]}={}) {
  await page.setContent(fixture);
  await page.evaluate(({role,pending,templates})=>{
    window.testSession=1;window.testAuthenticated=true;window.refreshes=0;
    window.model={role,templates,calls:[],failure:null,pending,resolvers:[]};
    const result=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
    window.HydrolandAuth={isAuthenticated:()=>window.testAuthenticated,getSessionVersion:()=>window.testSession,authorizedFetch:async(url,options={})=>{
      const m=window.model;m.calls.push({url,method:options.method||'GET',cache:options.cache,body:options.body});
      if(url==='/documents/workspace')return result([{role:m.role,status:'ACTIVE',organization:{id:'org-a',displayName:'هيدرولاند',kind:'DIVE_CENTER'}}]);
      if(url.endsWith('/branding'))return result({organizationId:'org-a',brandNameAr:'هيدرولاند',footerAr:'وثيقة إدارية داخلية',brandVersion:1});
      if(url==='/documents/templates/custom'&&options.method==='POST'){
        if(m.failure)return result({message:'تعذر حفظ التعديل'},m.failure);
        const saved={...JSON.parse(options.body),id:'custom-v1',code:'CUSTOM-FORM-'+'A'.repeat(32),version:1,status:'ACTIVE'};
        m.templates.push(saved);return result(saved,201);
      }
      if(url.endsWith('/history')){
        const code=decodeURIComponent(url.split('/').at(-2)),items=m.templates.filter(t=>t.code===code).sort((a,b)=>b.version-a.version);
        return result({organizationId:'org-a',code,department:items[0]?.department,items,nextBeforeVersion:null});
      }
      if(url.endsWith('/templates')){
        if(m.failure)return result({message:'تعذر حفظ التعديل'},m.failure);
        const data=m.templates.filter(t=>t.status==='ACTIVE');
        if(m.pending)return new Promise(resolve=>m.resolvers.push(status=>resolve(result(status?{message:'صلاحية منتهية'}:data,status||200))));
        return result(data);
      }
      if(url.startsWith('/documents/templates/')&&options.method==='PUT'){
        const previous=m.templates.find(t=>t.id===url.split('/').pop());previous.status='INACTIVE';
        const saved={...previous,...JSON.parse(options.body),id:'t'+(previous.version+1),version:previous.version+1,status:'ACTIVE'};
        m.templates.push(saved);return result(saved);
      }
      return result({},404);
    }};
    window.HydrolandDocuments={refresh:async()=>{window.refreshes++;}};
  },{role,pending,templates});
  await page.addScriptTag({content:source});
}
async function open(page){await page.locator('[data-hfl-open]').click();await expect(page.locator('[data-hfl-template] option')).not.toHaveCount(0);}
async function publish(page){await page.locator('[data-hfl-confirm]').check();await page.locator('[data-hfl-publish]').click();}

test('library bootstrap is idempotent and uses the organization scope',async({page})=>{
  await setup(page);await page.addScriptTag({content:source});await expect(page.locator('[data-hfl-open]')).toHaveCount(1);await open(page);
  await expect(page.locator('#hl-form-library input[name=titleAr]')).toBeEnabled();
  await expect(page.locator('[data-hfl-preview]')).toContainText('هيدرولاند');
  expect(await page.evaluate(()=>window.model.calls.every(c=>c.cache==='no-store'))).toBe(true);
});
test('labels and ordering publish a new revision without mutating old records',async({page})=>{
  await setup(page);await open(page);await page.locator('#hl-form-library input[name=titleAr]').fill('بيانات الموظف المحدّثة');
  await page.locator('[data-hfl-label=labelAr]').first().fill('الرقم الوظيفي');
  await expect(page.locator('[data-hfl-preview]')).toContainText('الرقم الوظيفي');
  await page.locator('[data-hfl-row="0"] [data-hfl-move="1"]').click();await publish(page);
  await expect(page.locator('[data-hfl-note]')).toContainText('حُفظ ونُشر الإصدار 2');
  const m=await page.evaluate(()=>window.model);expect(m.templates[0].fields[0].labelAr).toBe('رقم الموظف');
  expect(m.templates[1].fields[1]).toMatchObject({key:'employeeNo',type:'TEXT',labelAr:'الرقم الوظيفي'});
  expect(m.calls.filter(c=>c.method==='PUT')).toHaveLength(1);
  expect(m.calls.some(c=>/\/(revise|approve|sign)$/.test(c.url))).toBe(false);
  expect(await page.evaluate(()=>window.refreshes)).toBe(1);
});
test('staff sees preview but cannot edit or publish templates',async({page})=>{
  await setup(page,{role:'STAFF'});await open(page);await expect(page.locator('#hl-form-library input[name=titleAr]')).toBeDisabled();
  await expect(page.locator('[data-hfl-publish]')).toBeDisabled();await expect(page.locator('[data-hfl-note]')).toContainText('للعرض فقط');
  await expect(page.locator('[data-hfl-new]')).toBeDisabled();
});
test('stale revision preserves changes and sends no write',async({page})=>{
  await setup(page);await open(page);await page.locator('#hl-form-library input[name=titleAr]').fill('تعديل محفوظ في المحرر');
  await page.evaluate(()=>{const t=window.model.templates[0];window.model.templates.push({...t,id:'t2',version:2});t.status='INACTIVE';});
  await publish(page);await expect(page.locator('[data-hfl-note]')).toContainText('نُشر إصدار أحدث');
  await expect(page.locator('#hl-form-library input[name=titleAr]')).toHaveValue('تعديل محفوظ في المحرر');
  expect(await page.evaluate(()=>window.model.calls.some(c=>c.method==='PUT'))).toBe(false);
});
test('late successful response after logout cannot restore private data',async({page})=>{
  await setup(page,{pending:true});await page.locator('[data-hfl-open]').click();await page.waitForFunction(()=>window.model.resolvers.length===1);
  await page.evaluate(()=>{window.testSession++;window.testAuthenticated=false;document.dispatchEvent(new Event('hydroland:session-cleared'));window.model.resolvers[0]();});
  await expect(page.locator('#hl-form-library')).not.toBeVisible();await expect(page.locator('[data-hfl-template] option')).toHaveCount(0);
});
test('late permission error from old session cannot clear a newer session',async({page})=>{
  await setup(page,{pending:true});await page.locator('[data-hfl-open]').click();await page.waitForFunction(()=>window.model.resolvers.length===1);
  await page.evaluate(()=>{window.testSession++;document.dispatchEvent(new Event('hydroland:session-cleared'));window.model.pending=false;});
  await open(page);await page.evaluate(()=>{window.model.resolvers[0](403);});
  await expect(page.locator('#hl-form-library')).toBeVisible();await expect(page.locator('[data-hfl-template] option')).toHaveCount(1);
});
test('organization switch clears all displayed private information',async({page})=>{
  await setup(page);await open(page);await page.evaluate(()=>{const s=document.querySelector('[data-doc-org]');s.value='org-b';s.dispatchEvent(new Event('change'));});
  await expect(page.locator('#hl-form-library')).not.toBeVisible();await expect(page.locator('[data-hfl-preview]')).toHaveText('');
});
test('current permission denial clears content and closes editor',async({page})=>{
  await setup(page);await open(page);await page.evaluate(()=>window.model.failure=403);await publish(page);
  await expect(page.locator('#hl-form-library')).not.toBeVisible();await expect(page.locator('[data-hfl-preview]')).toHaveText('');
});
test('publication never discards unsaved document inputs',async({page})=>{
  await setup(page);await page.locator('[data-doc-fields] input').fill('بيانات لم تحفظ');await open(page);await publish(page);
  await expect(page.locator('[data-hfl-note]')).toContainText('حُفظ ونُشر الإصدار 2');
  await expect(page.locator('[data-doc-fields] input')).toHaveValue('بيانات لم تحفظ');expect(await page.evaluate(()=>window.refreshes)).toBe(0);
});
test('server error retains editor and unlocks retry controls',async({page})=>{
  await setup(page);await open(page);await page.evaluate(()=>window.model.failure=500);await publish(page);
  await expect(page.locator('[data-hfl-note]')).toContainText('تعذر حفظ');await expect(page.locator('#hl-form-library input[name=titleAr]')).toBeEnabled();
  await expect(page.locator('[data-hfl-template]')).toBeEnabled();
});
test('unsafe text is escaped and contract or foreign templates are excluded',async({page})=>{
  const unsafe='<img src=x onerror="window.injected=true">';
  await setup(page,{templates:[{...template,titleAr:unsafe},{...template,id:'foreign',organizationId:'org-b'},{...template,id:'contract',code:'CLIB-HR-PERMANENT'}]});await open(page);
  await expect(page.locator('[data-hfl-template] option')).toHaveCount(1);await expect(page.locator('[data-hfl-preview] h3')).toHaveText(unsafe);
  await expect(page.locator('[data-hfl-preview] img')).toHaveCount(1);expect(await page.evaluate(()=>window.injected)).toBeUndefined();
});
test('mobile dialog has no horizontal overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});await setup(page);await open(page);
  expect(await page.locator('#hl-form-library').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
  expect((await page.locator('#hl-form-library').boundingBox()).width).toBeLessThanOrEqual(390);
});

test('empty library can create a custom typed form and section without selecting a catalog code',async({page})=>{
  await setup(page,{templates:[]});await page.locator('[data-hfl-open]').click();
  await expect(page.locator('[data-hfl-new]')).toBeEnabled();await page.locator('[data-hfl-new]').click();
  await expect(page.locator('[data-hfl-history-load]')).toBeDisabled();await expect(page.locator('[data-hfl-pdf-preview]')).toBeDisabled();
  await page.locator('#hl-form-library input[name=titleAr]').fill('تقرير مخصص');
  await page.locator('#hl-form-library input[name=titleEn]').fill('Custom report');
  await page.locator('[data-hfl-key]').fill('quantity');await page.locator('[data-hfl-type]').selectOption('NUMBER');
  await page.locator('[data-hfl-required]').check();
  await page.locator('[data-hfl-add-section]').click();
  await page.locator('[data-hfl-row="1"] [data-hfl-label=labelAr]').fill('بيانات التقرير');
  await page.locator('[data-hfl-row="1"] [data-hfl-move="-1"]').click();
  await page.locator('[data-hfl-add-field]').click();
  await page.locator('[data-hfl-row="2"] [data-hfl-type]').selectOption('SELECT');
  await page.locator('[data-hfl-options]').fill('أول\nثان');
  await page.locator('[data-hfl-add-field]').click();await page.locator('[data-hfl-row="3"] [data-hfl-type]').selectOption('STATEMENT');
  await page.locator('[data-hfl-content=contentAr]').fill('نص إقرار محفوظ <img src=x onerror="window.injected=true">');
  await page.locator('[data-hfl-content=contentEn]').fill('Pinned acknowledgment wording');
  await expect(page.locator('[data-hfl-row="3"] [data-hfl-required]')).toHaveCount(0);
  await expect(page.locator('[data-hfl-preview] img')).toHaveCount(1);
  await publish(page);
  await expect(page.locator('[data-hfl-note]')).toContainText('حُفظ ونُشر الإصدار 1');
  const m=await page.evaluate(()=>window.model),request=m.calls.find(c=>c.method==='POST');
  expect(request.url).toBe('/documents/templates/custom');expect(JSON.parse(request.body)).not.toHaveProperty('code');
  expect(m.templates[0].fields.map(f=>f.type)).toEqual(['SECTION','NUMBER','SELECT','STATEMENT']);
  expect(m.templates[0].fields[2].options).toEqual(['أول','ثان']);expect(m.templates[0].fields[0].required).toBe(false);
  expect(m.templates[0].fields[3].contentEn).toBe('Pinned acknowledgment wording');
  expect(await page.evaluate(()=>window.injected)).toBeUndefined();
  await expect(page.locator('[data-hfl-history-load]')).toBeEnabled();await expect(page.locator('[data-hfl-pdf-preview]')).toBeEnabled();
});

test('custom structural changes and history restore publish immutable versions while catalog fields stay locked',async({page})=>{
  await setup(page);await open(page);await expect(page.locator('[data-hfl-type]')).toHaveCount(0);
  await expect(page.locator('[data-hfl-structure-actions]')).toBeHidden();
  await page.evaluate(()=>{window.model.templates[0].code='CUSTOM-FORM-'+'B'.repeat(32);});
  await page.locator('[data-hfl-reload]').click();await expect(page.locator('[data-hfl-type]')).toHaveCount(2);
  await page.locator('[data-hfl-type]').first().selectOption('NUMBER');
  await page.locator('[data-hfl-row="1"] [data-hfl-remove]').click();await page.locator('[data-hfl-add-section]').click();await publish(page);
  await expect(page.locator('[data-hfl-note]')).toContainText('حُفظ ونُشر الإصدار 2');
  await page.locator('[data-hfl-history-load]').click();await page.locator('[data-hfl-history-view="t1"]').click();
  await page.locator('[data-hfl-history-restore]').click();
  await expect(page.locator('[data-hfl-confirm]')).not.toBeChecked();
  expect(await page.evaluate(()=>window.model.templates.length)).toBe(2);
  await publish(page);await expect(page.locator('[data-hfl-note]')).toContainText('حُفظ ونُشر الإصدار 3');
  const m=await page.evaluate(()=>window.model);
  expect(m.templates[0].fields).toEqual(template.fields);expect(m.templates[1].fields.map(f=>f.type)).toEqual(['NUMBER','SECTION']);
  expect(m.templates[2].fields).toEqual(template.fields);expect(m.templates[0].status).toBe('INACTIVE');
  expect(m.calls.some(c=>/\/(revise|approve|sign)$/.test(c.url))).toBe(false);
});

test('permission revocation during custom creation clears the unpublished form without saving',async({page})=>{
  await setup(page);await open(page);await page.locator('[data-hfl-new]').click();
  await page.locator('#hl-form-library input[name=titleAr]').fill('عنوان خاص');await page.locator('#hl-form-library input[name=titleEn]').fill('Private title');
  await page.evaluate(()=>window.model.failure=403);await publish(page);
  await expect(page.locator('#hl-form-library')).not.toBeVisible();await expect(page.locator('[data-hfl-fields]')).toBeEmpty();
  expect(await page.evaluate(()=>window.model.templates.length)).toBe(1);
});
