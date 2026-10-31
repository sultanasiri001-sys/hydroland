import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const policy='MARKETING_CAMPAIGN_DRAFT_V1',notice='سجل تخطيط داخلي؛ المسودة والأرشفة لا تعنيان اعتماد حملة أو نشرها أو قياس أدائها.';
const record=extra=>({id:randomUUID(),revision:1,status:'DRAFT',title:'مسودة تسويق خاصة',objective:'هدف تخطيط داخلي',channels:['WEB'],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),...extra});
const json=(r,data,status=200)=>r.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
async function setup(page,options={}){
 const state={admin:true,deny:false,failCreate:0,holdDetail:false,release:null,records:[record()],writes:[],otherWrites:[],...options};
 const detail=r=>({schemaVersion:1,policy,record:r,history:[{revision:r.revision,action:r.status==='ARCHIVED'?'MARKETING_CAMPAIGN_DRAFT_ARCHIVED':'MARKETING_CAMPAIGN_DRAFT_CREATED',reason:'سبب محفوظ للإصدار الحالي'}],historyTruncated:false,notice});
 await page.route('**/api/v1/**',r=>{if(!['GET','OPTIONS'].includes(r.request().method()))state.otherWrites.push(r.request().url());return json(r,[]);});
 await page.route('**/auth/google/config',r=>json(r,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,r=>json(r,{id:'marketing-owner-fixture',status:'ACTIVE',person:{firstName:'مالك',lastName:'اختبار'},roleAssignments:state.admin?[{role:'ADMIN',status:'ACTIVE'}]:[]}));
 await page.route(/\/admin\/employees(?:\?.*)?$/,r=>json(r,{initialized:true,departments:[],profiles:[],items:[],nextCursor:null,email:{enabled:false},google:{enabled:false}}));
 await page.route(/\/admin\/marketing-campaign-drafts(?:[/?].*)?$/,async r=>{
  const url=new URL(r.request().url()),tail=url.pathname.split('/marketing-campaign-drafts')[1],method=r.request().method(),body=method==='GET'?null:r.request().postDataJSON();
  if(method!=='GET')state.writes.push({tail,method,body});
  if(state.deny)return json(r,{message:'مالك الجهة فقط'},403);
  if(method==='GET'&&!tail){const cursor=url.searchParams.get('cursor'),start=cursor?state.records.findIndex(x=>x.id===cursor)+1:0,items=state.records.slice(start,start+50),hasMore=state.records.length>start+50;return json(r,{schemaVersion:1,policy,items,hasMore,nextCursor:hasMore?items.at(-1).id:null,notice});}
  const id=tail.split('/')[1],row=state.records.find(x=>x.id===id);
  if(method==='GET'){if(state.holdDetail)await new Promise(resolve=>state.release=resolve);return json(r,detail(row));}
  if(method==='POST'&&!tail){if(state.failCreate-->0)return json(r,{message:'تعذر الحفظ مؤقتًا؛ أعد المحاولة بالطلب نفسه.'},503);const created=record(body);delete created.requestKey;state.records.unshift(created);return json(r,{...detail(created),created:true},201);}
  if(body.expectedRevision!==row.revision)return json(r,{message:'تغير إصدار المسودة؛ أعد القراءة.'},409);
  if(method==='PATCH')Object.assign(row,{title:body.title,objective:body.objective,channels:body.channels});else row.status=tail.endsWith('/archive')?'ARCHIVED':'DRAFT';row.revision++;return json(r,detail(row));
 });
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandMarketingDrafts&&window.HydrolandAuth&&window.HydrolandProfile));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'marketing-fixture',refreshToken:'marketing-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load();});
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="admin"]').click();await expect(page.locator('.hl-role-dashboard[data-role="admin"]')).toBeVisible();if(await page.locator('[data-portal-menu]').isVisible())await page.locator('[data-portal-menu]').click();await page.locator('[data-portal-label="إدارة الموظفين"]').click();
 await page.locator('[data-marketing-drafts]>summary').click();await expect(page.locator('[data-marketing-create]')).toBeVisible();return state;
}
const fill=async form=>{await form.locator('[name="title"]').fill('مسودة تخطيط معزولة');await form.locator('[name="objective"]').fill('هدف التخطيط دون نشر محتوى');await form.locator('[name="channels"]').selectOption(['WEB','SOCIAL']);};
test('mobile campaign planning renders stored text safely and creates only an internal draft',async({page})=>{
 await page.setViewportSize({width:390,height:844});const state=await setup(page,{records:[record({title:'<img src=x onerror=alert(1)> نص محفوظ'})]});const box=page.locator('[data-marketing-drafts]');await expect(box.locator('img')).toHaveCount(0);await expect(box).toContainText('<img src=x');await expect(box).toContainText('لا يعنيان اعتماد حملة');
 const form=page.locator('[data-marketing-create]');await fill(form);await form.getByRole('button',{name:'إنشاء مسودة حملة',exact:true}).click();await expect(page.locator('[data-marketing-feedback]')).toContainText('لم يُنشر أو يُرسل');await expect(page.locator('[data-marketing-edit]')).toBeVisible();expect(state.writes).toHaveLength(1);expect(Object.keys(state.writes[0].body).sort()).toEqual(['channels','objective','requestKey','title']);expect(state.otherWrites).toHaveLength(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('campaign edit, archive and restore bind the visible revision and require renewed confirmation',async({page})=>{
 const state=await setup(page);await page.locator('[data-marketing-draft-id]').click();const edit=page.locator('[data-marketing-edit]');await edit.locator('[name="title"]').fill('عنوان معدل');await edit.locator('[name="reason"]').fill('سبب تعديل محفوظ');await edit.getByRole('button').click();await expect(page.locator('[data-marketing-feedback]')).toContainText('إصدار جديد');expect(state.writes[0].body.expectedRevision).toBe(1);
 const form=page.locator('[data-marketing-state]');await form.locator('[name="reason"]').fill('أرشفة تخطيط قديم');await form.getByRole('button').click();expect(state.writes).toHaveLength(1);await form.getByRole('checkbox').check();await form.getByRole('button').click();await expect(edit).toBeHidden();await expect(form.getByRole('button')).toHaveText('استعادة المسودة للتحرير');await expect(form.getByRole('checkbox')).not.toBeChecked();expect(state.writes[1].body.expectedRevision).toBe(2);
 await form.locator('[name="reason"]').fill('استعادة للتعديل');await form.getByRole('checkbox').check();await form.getByRole('button').click();await expect(edit).toBeVisible();expect(state.writes[2].body.expectedRevision).toBe(3);expect(state.records[0].status).toBe('DRAFT');
});
test('uncertain draft saves reuse the request key until the content changes',async({page})=>{
 const state=await setup(page,{failCreate:2});const form=page.locator('[data-marketing-create]');await fill(form);const submit=form.getByRole('button');await submit.click();await expect(page.locator('[data-marketing-feedback]')).toContainText('تعذر الحفظ');await submit.click();await expect.poll(()=>state.writes.length).toBe(2);expect(state.writes[0].body.requestKey).toBe(state.writes[1].body.requestKey);await form.locator('[name="title"]').fill('مسودة مختلفة');await submit.click();await expect(page.locator('[data-marketing-feedback]')).toContainText('حُفظت');expect(state.writes[2].body.requestKey).not.toBe(state.writes[1].body.requestKey);
});
test('fresh role revocation clears campaign forms before a mutation can be sent',async({page})=>{
 const state=await setup(page);const form=page.locator('[data-marketing-create]');await fill(form);state.admin=false;await form.getByRole('button').click();await expect(page.locator('#hl-admin-employees')).toBeHidden();await expect(page.locator('[data-marketing-list]')).toBeEmpty();await expect(form.locator('[name="title"]')).toHaveValue('');expect(state.writes).toHaveLength(0);
});
test('a delayed private campaign response cannot reappear after logout',async({page})=>{
 const state=await setup(page,{holdDetail:true});await page.locator('[data-marketing-draft-id]').click();await expect.poll(()=>Boolean(state.release)).toBe(true);await page.evaluate(()=>window.HydrolandAuth.logout());state.release();await expect(page.locator('[data-marketing-list]')).toBeEmpty();await expect(page.locator('[data-marketing-history]')).toBeEmpty();await expect(page.locator('[data-marketing-edit]')).toBeHidden();await expect(page.locator('[data-marketing-edit] [name="objective"]')).toHaveValue('');
});
test('owner-only rejection clears previously loaded private campaign content',async({page})=>{
 const state=await setup(page);await page.locator('[data-marketing-draft-id]').click();const form=page.locator('[data-marketing-edit]');await expect(form).toBeVisible();await form.locator('[name="reason"]').fill('تعديل بعد تغير المالك');state.deny=true;await form.getByRole('button').click();await expect(page.locator('[data-marketing-list]')).toBeEmpty();await expect(page.locator('[data-marketing-history]')).toBeEmpty();await expect(form.locator('[name="title"]')).toHaveValue('');await expect(form).toBeHidden();expect(state.writes).toHaveLength(1);
});
test('campaign pagination appends scoped records and stale revisions do not retry or overwrite',async({page})=>{
 const state=await setup(page,{records:Array.from({length:54},(_,i)=>record({title:'مسودة '+i}))});await expect(page.locator('[data-marketing-draft-id]')).toHaveCount(50);await page.locator('[data-marketing-older]').click();await expect(page.locator('[data-marketing-draft-id]')).toHaveCount(54);await expect(page.locator('[data-marketing-older]')).toBeHidden();await page.locator('[data-marketing-draft-id]').first().click();const edit=page.locator('[data-marketing-edit]');await expect(edit).toBeVisible();await expect(page.locator('[data-marketing-feedback]')).toContainText('تم تحميل الإصدار الحالي للمسودة');state.records[0].revision++;await edit.locator('[name="title"]').fill('تعديل متعارض');await edit.locator('[name="reason"]').fill('سبب محاولة التعارض');await edit.getByRole('button').click();await expect(page.locator('[data-marketing-feedback]')).toContainText('تغير إصدار المسودة');expect(state.writes).toHaveLength(1);expect(state.records[0].title).toBe('مسودة 0');
});
