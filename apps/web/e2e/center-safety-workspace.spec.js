import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const trip={id:'safety-trip',title:'رحلة سلامة المركز',status:'OPEN',type:'BOAT',startsAt:'2030-01-02T07:00:00Z',updatedAt:'2030-01-01T07:00:00Z'};
const keys=['diver_credentials','equipment_ready','oxygen_first_aid','boat_fuel','weather_review','emergency_plan'];
const checklistItems=keys.map((key,n)=>({key,label:['صلاحية الشهادات','فحص المعدات','الأكسجين والإسعافات','القارب والوقود','الطقس والبحر','خطة الطوارئ'][n]}));
const preview=()=>({trip,stateToken:'a'.repeat(64),incidentStateToken:'b'.repeat(64),canAssess:true,checklistItems});
const checkRecord={id:'check-one',tripId:trip.id,trip,decision:'REVIEW_REQUIRED',notes:'فحص المركز',createdAt:'2030-01-01T08:00:00Z',updatedAt:'2030-01-01T08:00:00Z'};
const incidentRecord={id:'incident-one',tripId:trip.id,trip,severity:'HIGH',status:'OPEN',title:'بلاغ المركز',createdAt:'2030-01-01T08:00:00Z'};
const pagination=()=>({total:1,page:1,pageSize:20,totalPages:1});
const listing=()=>({checklists:[checkRecord],incidents:[incidentRecord],checklistPagination:pagination(),incidentPagination:pagination()});
const listRoute=/\/api\/v1\/center\/me\/safety(?:\?.*)?$/;
const tripsRoute=/\/api\/v1\/center\/me\/safety\/trips(?:\?.*)?$/;
const previewRoute=/\/api\/v1\/center\/me\/safety\/trips\/safety-trip$/;
const submitRoute=/\/api\/v1\/center\/me\/safety\/trips\/safety-trip\/(checklists|incidents)$/;
const detailRoute=/\/api\/v1\/center\/me\/safety\/(checklists|incidents)\/[^/?]+$/;
const panel=page=>page.locator('#hl-center-safety');
async function install(page){
 const state={active:true,list:listing(),preview:preview(),posts:[],reads:[],tripReads:[],failure:0};
 const profile={id:'safety-manager',email:'safety-manager@example.invalid',status:'ACTIVE',person:{firstName:'مدير',lastName:'المركز'},roleAssignments:[{role:'DIVE_CENTER',status:'ACTIVE'}]};
 await page.route('**/api/v1/**',route=>json(route,[]));await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,route=>json(route,{...profile,roleAssignments:state.active?profile.roleAssignments:[]}));await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));await page.route('**/api/v1/center/me/overview',route=>json(route,{center:{displayName:'مركز السلامة'},metrics:{newBookings:1,tripsToday:1,activeMembers:1,totalTrips:1}}));
 await page.route(listRoute,route=>{state.reads.push(new URL(route.request().url()).searchParams);return json(route,state.list)});
 await page.route(tripsRoute,route=>{state.tripReads.push(new URL(route.request().url()).searchParams);return json(route,{items:[trip],...pagination()})});
 await page.route(previewRoute,route=>json(route,state.preview));
 await page.route(detailRoute,route=>{const url=new URL(route.request().url()),id=url.pathname.split('/').at(-1);return json(route,url.pathname.includes('/checklists/')?{...(state.savedCheck||checkRecord),id,checklistItems,items:Object.fromEntries(keys.map(k=>[k,true]))}:{...(state.savedIncident||incidentRecord),id,descriptionVisible:false,description:null})});
 await page.route(submitRoute,route=>{const body=route.request().postDataJSON(),kind=route.request().url().endsWith('/checklists')?'checklist':'incident';state.posts.push({kind,body});if(state.failure)return json(route,{message:state.failure===409?'تغيرت بيانات الرحلة':'تعذر الحفظ'},state.failure);if(kind==='checklist'){const decision=Object.values(body.items).every(Boolean)?'REVIEW_REQUIRED':'DEFERRED';state.savedCheck={...checkRecord,id:'check-saved',decision,notes:body.notes};state.list={...listing(),checklists:[state.savedCheck]};return json(route,{id:'check-saved',tripId:trip.id,decision},201)}state.savedIncident={...incidentRecord,id:'incident-saved',severity:body.severity,title:body.title};state.list={...listing(),incidents:[state.savedIncident]};return json(route,{id:'incident-saved',tripId:trip.id,status:'OPEN',externalDistressSent:false},201)});
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandCenterSafety));await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'safety-access',refreshToken:'safety-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="center"]').click();await page.locator('.hl-command [data-action-label="تقارير السلامة"]').click();await expect(panel(page).locator('[data-center-checklist]')).toHaveCount(1);return state;
}
async function compose(page,kind='checklist'){
 await panel(page).getByRole('button',{name:kind==='checklist'?'تسجيل فحص رحلة':'تسجيل بلاغ سلامة',exact:true}).click();await panel(page).getByRole('button',{name:'اختيار الرحلة',exact:true}).click();await expect(panel(page).locator('[data-safety-submit]')).toBeVisible();return panel(page).locator('[data-safety-submit]');
}

test('safety search, filters and independent record pages use the scoped API',async({page})=>{
 const state=await install(page);expect(await panel(page).evaluate(el=>el.getBoundingClientRect().top>=document.querySelector('.hl-service-heading').getBoundingClientRect().bottom)).toBe(true);
 state.list.checklistPagination={total:21,page:1,pageSize:20,totalPages:2};state.list.incidentPagination={total:21,page:1,pageSize:20,totalPages:2};
 await panel(page).getByLabel('الرحلة أو عنوان البلاغ').fill('رحلة السلامة');await panel(page).getByLabel('قرار الفحص',{exact:true}).selectOption('DEFERRED');await panel(page).getByLabel('حالة البلاغ',{exact:true}).selectOption('OPEN');await panel(page).getByLabel('خطورة البلاغ',{exact:true}).selectOption('HIGH');await panel(page).getByRole('button',{name:'بحث',exact:true}).click();await expect.poll(()=>state.reads.at(-1).get('q')).toBe('رحلة السلامة');expect(state.reads.at(-1).get('decision')).toBe('DEFERRED');expect(state.reads.at(-1).get('status')).toBe('OPEN');
 state.list.checklistPagination.page=2;await panel(page).getByRole('navigation',{name:'صفحات الفحوص'}).getByRole('button',{name:'التالي'}).click();await expect.poll(()=>state.reads.at(-1).get('checklistPage')).toBe('2');expect(state.reads.at(-1).get('incidentPage')).toBeNull();
 state.list=listing();await panel(page).getByRole('button',{name:'مسح البحث'}).click();await expect.poll(()=>state.reads.at(-1).size).toBe(0);await expect(panel(page).getByLabel('قرار الفحص',{exact:true})).toHaveValue('ALL');
});

test('mobile checklist saves all booleans without claiming approval',async({page},testInfo)=>{
 await page.setViewportSize({width:390,height:844});const state=await install(page);const form=await compose(page);await form.getByLabel('فحص المعدات',{exact:true}).check();await form.getByLabel('ملاحظات الفحص').fill('تحتاج بقية البنود استكمالًا');await page.screenshot({path:testInfo.outputPath('portal-center-safety-mobile.png'),fullPage:true});
 expect(await panel(page).evaluate(el=>el.scrollWidth<=el.clientWidth+2)).toBe(true);await form.getByRole('button',{name:'حفظ الفحص وإرساله للمراجعة'}).click();await expect.poll(()=>state.posts.length).toBe(1);const body=state.posts[0].body;expect(body.items.equipment_ready).toBe(true);expect(body.items.weather_review).toBe(false);expect(Object.keys(body.items)).toHaveLength(6);expect(body.expectedState).toBe('a'.repeat(64));expect(body.requestId).toMatch(/^[a-f0-9-]{36}$/);expect(body).not.toHaveProperty('decision');await expect(panel(page)).toContainText('تم حفظ الفحص بحالة مؤجل');await expect(panel(page).getByRole('button',{name:'اعتماد',exact:true})).toHaveCount(0);
});

test('incident form enforces required fields and records the internal-only report',async({page})=>{
 const state=await install(page);const form=await compose(page,'incident');await expect(form).toContainText('لا يرسل نداء استغاثة خارجيًا');await form.getByRole('button',{name:'حفظ البلاغ'}).click();expect(state.posts).toHaveLength(0);await form.getByLabel('عنوان البلاغ',{exact:true}).fill('تقرير مركز الغوص');await form.getByLabel('وصف البلاغ',{exact:true}).fill('وصف تفصيلي للبلاغ');await form.getByLabel('خطورة البلاغ الجديد',{exact:true}).selectOption('HIGH');await form.getByLabel('الموقع',{exact:true}).fill('موقع الرحلة');await form.getByRole('button',{name:'حفظ البلاغ'}).click();await expect.poll(()=>state.posts.length).toBe(1);expect(state.posts[0].body).toMatchObject({expectedState:'b'.repeat(64),title:'تقرير مركز الغوص',severity:'HIGH',description:'وصف تفصيلي للبلاغ'});expect(state.posts[0].body).not.toHaveProperty('status');await expect(panel(page)).toContainText('تم حفظ البلاغ داخل المنصة');
});

test('failed save preserves input and retries with the same request identity',async({page})=>{
 const state=await install(page);state.failure=500;const form=await compose(page);await form.getByLabel('ملاحظات الفحص').fill('تبقى الملاحظات بعد فشل الشبكة');await form.getByLabel('الطقس والبحر',{exact:true}).check();const button=form.getByRole('button',{name:'حفظ الفحص وإرساله للمراجعة'});await button.click();await expect(form).toContainText('تعذر الحفظ');await expect(form.getByLabel('ملاحظات الفحص')).toHaveValue('تبقى الملاحظات بعد فشل الشبكة');await expect(form.getByLabel('الطقس والبحر',{exact:true})).toBeChecked();state.failure=0;await button.click();await expect.poll(()=>state.posts.length).toBe(2);expect(state.posts[1].body.requestId).toBe(state.posts[0].body.requestId);await expect(panel(page)).toContainText('تم حفظ الفحص');
});

test('stale safety form refreshes its revision explicitly and preserves entered evidence',async({page})=>{
 const state=await install(page);state.failure=409;let form=await compose(page);await form.getByLabel('ملاحظات الفحص').fill('بيانات محفوظة للمراجعة');await form.getByLabel('فحص المعدات',{exact:true}).check();await form.getByRole('button',{name:'حفظ الفحص وإرساله للمراجعة'}).click();await expect(form.getByRole('button',{name:'حفظ الفحص وإرساله للمراجعة'})).toBeDisabled();state.preview={...preview(),stateToken:'c'.repeat(64)};await form.getByRole('button',{name:'تحديث بيانات الرحلة'}).click();form=panel(page).locator('[data-safety-submit]');await expect(form.getByLabel('ملاحظات الفحص')).toHaveValue('بيانات محفوظة للمراجعة');await expect(form.getByLabel('فحص المعدات',{exact:true})).toBeChecked();state.failure=0;await form.getByRole('button',{name:'حفظ الفحص وإرساله للمراجعة'}).click();await expect.poll(()=>state.posts.length).toBe(2);expect(state.posts[1].body.expectedState).toBe('c'.repeat(64));expect(state.posts[1].body.requestId).not.toBe(state.posts[0].body.requestId);
});

test('closed trips block a checklist while keeping incident reporting available',async({page})=>{
 const state=await install(page);state.preview={...preview(),canAssess:false,trip:{...trip,status:'COMPLETED'}};await panel(page).getByRole('button',{name:'تسجيل فحص رحلة',exact:true}).click();await panel(page).getByRole('button',{name:'اختيار الرحلة',exact:true}).click();await expect(panel(page)).toContainText('لا يمكن تسجيل فحص قبل الرحلة');await expect(panel(page).locator('[data-safety-submit]')).toHaveCount(0);await compose(page,'incident');await expect(panel(page).getByLabel('عنوان البلاغ',{exact:true})).toBeVisible();expect(state.posts).toHaveLength(0);
});

test('revoked role prevents safety writes and clears entered data',async({page})=>{
 const state=await install(page);const form=await compose(page);await form.getByLabel('ملاحظات الفحص').fill('PRIVATE_SAFETY_NOTES');state.active=false;await form.getByRole('button',{name:'حفظ الفحص وإرساله للمراجعة'}).click();await expect(panel(page)).toHaveCount(0);expect(state.posts).toHaveLength(0);await expect(page.getByText('PRIVATE_SAFETY_NOTES')).toHaveCount(0);
});

test('late trip preview cannot recreate the form after logout',async({page})=>{
 await install(page);let release;const waiting=new Promise(resolve=>{release=resolve});let started=false;await page.route(previewRoute,async route=>{started=true;await waiting;await json(route,preview()).catch(()=>{})});await panel(page).getByRole('button',{name:'تسجيل فحص رحلة',exact:true}).click();await panel(page).getByRole('button',{name:'اختيار الرحلة',exact:true}).click();await expect.poll(()=>started).toBe(true);await page.evaluate(()=>window.HydrolandAuth.terminateSession());release();await expect(panel(page)).toHaveCount(0);await expect(page.locator('[data-safety-submit]')).toHaveCount(0);
});

test('late save after logout cannot display success or restore records',async({page})=>{
 await install(page);let release;const waiting=new Promise(resolve=>{release=resolve});let started=false;await page.route(submitRoute,async route=>{started=true;await waiting;await json(route,{id:'saved-late',tripId:trip.id,decision:'REVIEW_REQUIRED'},201).catch(()=>{})});const form=await compose(page);await form.getByRole('button',{name:'حفظ الفحص وإرساله للمراجعة'}).click();await expect.poll(()=>started).toBe(true);await page.evaluate(()=>window.HydrolandAuth.terminateSession());release();await expect(panel(page)).toHaveCount(0);await expect(page.getByText('تم حفظ الفحص وإرساله للمراجعة.')).toHaveCount(0);
});

test('private narratives stay redacted and membership denial clears all record panes',async({page})=>{
 await install(page);await panel(page).getByRole('button',{name:'تفاصيل البلاغ',exact:true}).click();await expect(panel(page)).toContainText('التفاصيل الخاصة متاحة للمبلّغ');await compose(page);await page.route(listRoute,route=>json(route,{message:'Forbidden'},403));await panel(page).getByRole('button',{name:'تحديث السجلات'}).click();await expect(panel(page)).toContainText('لا تملك صلاحية');await expect(panel(page).locator('[data-center-checklist]')).toHaveCount(0);await expect(panel(page).locator('[data-safety-submit]')).toHaveCount(0);await expect(panel(page).locator('section[data-safety-detail]')).toBeEmpty();
});

test('trip picker supports search and pagination, retries errors and cancels without writes',async({page})=>{
 const state=await install(page);await page.route(tripsRoute,route=>{const q=new URL(route.request().url()).searchParams;state.tripReads.push(q);return json(route,{items:[trip],total:21,page:Number(q.get('page')||1),pageSize:20,totalPages:2})});await panel(page).getByRole('button',{name:'تسجيل فحص رحلة',exact:true}).click();await panel(page).getByLabel('ابحث عن رحلة المركز').fill('غوص');await panel(page).getByRole('button',{name:'بحث الرحلات',exact:true}).click();await expect.poll(()=>state.tripReads.at(-1).get('q')).toBe('غوص');await panel(page).getByRole('navigation',{name:'صفحات رحلات السلامة'}).getByRole('button',{name:'التالي'}).click();await expect.poll(()=>state.tripReads.at(-1).get('page')).toBe('2');await panel(page).getByRole('button',{name:'إلغاء',exact:true}).click();await expect(panel(page).locator('[data-safety-compose]')).toBeEmpty();expect(state.posts).toHaveLength(0);
 await page.route(tripsRoute,route=>json(route,{message:'تعذر تحميل الرحلات'},500));await panel(page).getByRole('button',{name:'تسجيل فحص رحلة',exact:true}).click();await expect(panel(page)).toContainText('تعذر تحميل الرحلات');await page.route(tripsRoute,route=>json(route,{items:[],total:0,page:1,pageSize:20,totalPages:1}));await panel(page).getByRole('button',{name:'إعادة تحميل الرحلات'}).click();await expect(panel(page)).toContainText('لا توجد رحلات مطابقة');
});
