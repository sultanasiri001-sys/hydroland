import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
test.use({viewport:{width:390,height:844}});
const revision='2026-10-09T01:00:00.000Z';
const course={id:'course-1',title:'دورة مياه مفتوحة',courseCode:'OW',description:'تدريب عملي',locationName:'جدة',startsAt:'2031-02-03T06:00:00.000Z',endsAt:'2031-02-05T10:00:00.000Z',capacity:3,remainingSeats:3,priceMinor:100000,currency:'SAR',status:'ACTIVE',organization:{displayName:'عالم الغوص'},updatedAt:revision,_count:{enrollments:0}};
const service={id:'service-1',sku:'SERVICE-1',nameAr:'صيانة معدات',description:'موعد الخدمة بالتنسيق',kind:'SERVICE',priceMinor:12550,stockQuantity:2,status:'DRAFT',currency:'SAR',updatedAt:revision,_count:{items:0}};
async function setup(page,center=false){
 const state={active:true,products:[],courses:[],writes:[]};
 const profile={id:'store-user',email:'store@example.invalid',status:'ACTIVE',person:{firstName:'سلطان',lastName:'المركز'},roleAssignments:center?[{role:'DIVE_CENTER',status:'ACTIVE'}]:[]};
 await page.route('**/api/v1/**',route=>json(route,[]));
 await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,route=>json(route,{...profile,roleAssignments:state.active?profile.roleAssignments:[]}));
 await page.route('**/api/v1/me/diver-profile',route=>json(route,{profile:null,equipment:[]}));
 await page.route('**/api/v1/center/me/overview',route=>json(route,{center:{displayName:'عالم الغوص'},metrics:{newBookings:0,tripsToday:0,activeMembers:1,totalTrips:0}}));
 await page.route('**/api/v1/store/products',route=>json(route,[{...service,status:'ACTIVE'}]));
 await page.route('**/api/v1/store/courses',route=>json(route,[course]));
 await page.route('**/api/v1/store/provider/catalog',route=>json(route,{organization:{id:'org',displayName:'عالم الغوص'},products:state.products,courses:state.courses}));
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandPublicUI&&window.HydrolandStoreProvider&&window.HydrolandAuth&&window.HydrolandProfile));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'store-access',refreshToken:'store-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 if(center){
  await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="center"]').click();
  await expect.poll(()=>page.evaluate(()=>({role:window.HydrolandPortalAccess.getCurrentRole(),allowed:window.HydrolandPortalAccess.roleAllowed('center')}))).toEqual({role:'center',allowed:true});
  const link=page.locator('[data-portal-label="المتجر والعروض"]');if(!await link.isVisible())await page.locator('.hl-role-dashboard [data-portal-menu]').click();await link.click();await expect(page.locator('.hl-store-provider [data-offer-refresh]')).toBeVisible();
 }else await page.evaluate(()=>window.HydrolandWorkspaceUI.show(document.getElementById('store')));
 return state;
}
test('background token refresh preserves the center editor and unsaved fields',async({page})=>{
 await setup(page,true);const form=page.locator('[data-offer-form][data-type="products"][data-id=""]');
 await form.locator('..').locator('summary').click();await form.locator('[name=nameAr]').fill('مسودة محفوظة في النموذج');
 let refreshes=0;await page.route('**/api/v1/auth/refresh',route=>{refreshes++;return json(route,{accessToken:'store-renewed-access',refreshToken:'store-renewed-refresh'})});
 await page.route('**/api/v1/session-preservation',route=>json(route,{ok:true},route.request().headers().authorization==='Bearer store-renewed-access'?200:401));
 expect(await page.evaluate(async()=>{const response=await window.HydrolandAuth.authorizedFetch('/session-preservation');return response.status})).toBe(200);
 expect(refreshes).toBe(1);await expect(form).toBeVisible();await expect(form.locator('[name=nameAr]')).toHaveValue('مسودة محفوظة في النموذج');
 await expect(page.locator('[data-portal-label="المتجر والعروض"]')).toHaveAttribute('aria-current','page');await expect(page.locator('.hl-login')).toBeHidden();
});
test('background token refresh still clears a revoked center role',async({page})=>{
 const state=await setup(page,true);state.active=false;
 await page.route('**/api/v1/auth/refresh',route=>json(route,{accessToken:'store-renewed-access',refreshToken:'store-renewed-refresh'}));
 await page.route('**/api/v1/session-preservation',route=>json(route,{ok:true},route.request().headers().authorization==='Bearer store-renewed-access'?200:401));
 expect(await page.evaluate(async()=>{const response=await window.HydrolandAuth.authorizedFetch('/session-preservation');return response.status})).toBe(200);
 await expect(page.locator('.hl-role-dashboard[data-role="center"]')).toHaveCount(0);await expect(page.locator('.hl-store-provider')).toBeHidden();
 expect(await page.evaluate(()=>window.HydrolandAuth.isAuthenticated())).toBe(true);
});
test('one store filters services and courses, then records a training request without a goods order',async({page})=>{
 await setup(page);let enrolls=0,orders=0;
 await page.route('**/api/v1/store/courses/course-1/enroll',route=>{enrolls++;expect(route.request().method()).toBe('POST');return json(route,{id:'enrollment',status:'PENDING'},201)});
 await page.route(/\/api\/v1\/store\/orders$/,route=>{orders++;return json(route,{},201)});
 await page.evaluate(()=>window.HydrolandPublicUI.navigate('training'));await page.locator('[data-public-training-store]').click();await expect(page.locator('[data-store-type-filter="courses"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-store-course]')).toBeVisible();await expect(page.locator('[data-public-product="service-1"]')).toHaveCount(0);
 await page.locator('[data-store-course] summary').click();await expect(page.locator('[data-store-course]')).toContainText('تدريب عملي');
 page.once('dialog',d=>d.dismiss());await page.locator('[data-store-enroll]').click();expect(enrolls).toBe(0);
 page.once('dialog',d=>d.accept());await page.locator('[data-store-enroll]').click();await expect.poll(()=>enrolls).toBe(1);expect(orders).toBe(0);
 await expect(page.locator('#toast')).toContainText('لم يُخصم أي مبلغ');
 await page.locator('[data-store-type-filter="services"]').click();await expect(page.locator('[data-public-product="service-1"]')).toBeVisible();await expect(page.locator('[data-store-course]')).toHaveCount(0);
 await expect(page.locator('[data-store-manage]')).toBeHidden();
});
test('partial catalog failure retains other offers and retry restores the failed category',async({page})=>{
 await setup(page);await page.route('**/api/v1/store/products',route=>json(route,{message:'Unavailable'},503));
 await page.evaluate(()=>window.HydrolandStore.reloadProducts());await expect(page.locator('#store .hl-store-retry')).toBeVisible();await expect(page.locator('[data-store-course]')).toBeVisible();
 await page.route('**/api/v1/store/products',route=>json(route,[service]));await page.locator('#store .hl-store-retry').click();await expect(page.locator('[data-public-product="service-1"]')).toBeVisible();await expect(page.locator('#store .hl-store-retry')).toHaveCount(0);
});
test('center directly creates, edits, stops, republishes and deletes an unused offer',async({page})=>{
 const state=await setup(page,true);
 await page.route('**/api/v1/store/provider/products',route=>{const body=route.request().postDataJSON();state.writes.push(body);state.products=[{...service,...body,id:body.requestId}];return json(route,state.products[0],201)});
 await expect(page.locator('.hl-store-provider')).toBeVisible();const form=page.locator('[data-offer-form][data-type="products"][data-id=""]');await form.locator('..').locator('summary').click();
 for(const[key,value]of Object.entries({nameAr:'خدمة جديدة',sku:'NEW-SERVICE',price:'125.50',stockQuantity:'2',catalog_size:'L',catalogSale:'100.00'}))await form.locator(`[name=${key}]`).fill(value);
 await form.locator('[name=kind]').selectOption('SERVICE');await form.locator('[name=status]').selectOption('ACTIVE');await form.locator('[type=submit]').click();
 await expect(page.locator('.hl-store-provider')).toContainText('تم حفظ العرض');expect(state.writes[0]).toMatchObject({kind:'SERVICE',priceMinor:12550,stockQuantity:2,catalogDetails:{size:'L',salePriceMinor:10000}});expect(state.writes[0]).not.toHaveProperty('organizationId');
 const id=state.products[0].id;let revisionCount=0;
 await page.route('**/api/v1/store/provider/products/'+id,route=>{
   state.writes.push(route.request().postDataJSON());if(route.request().method()==='DELETE'){state.products=[];return json(route,{deleted:true})}
   state.products=[{...state.products[0],...route.request().postDataJSON(),updatedAt:`2026-10-09T01:00:0${++revisionCount}.000Z`}];return json(route,state.products[0]);
 });
 let statusRevision=8;await page.route('**/api/v1/store/provider/products/'+id+'/status',route=>{const body=route.request().postDataJSON();state.writes.push(body);state.products[0]={...state.products[0],status:body.status,updatedAt:'2026-10-09T01:00:'+String(++statusRevision).padStart(2,'0')+'.000Z'};return json(route,{status:body.status})});
 let row=page.locator('[data-managed-offer]');await row.getByText('تعديل العرض',{exact:true}).click();await row.locator('[name=nameAr]').fill('خدمة معدلة');await row.locator('[type=submit]').click();await expect(row).toContainText('خدمة معدلة');
 page.once('dialog',d=>d.accept());await row.locator('[data-offer-status]').click();await expect(row.locator(':scope > p').first()).toContainText('متوقف');
 page.once('dialog',d=>d.accept());await row.locator('[data-offer-status]').click();await expect(row.locator(':scope > p').first()).toContainText('منشور');
 page.once('dialog',d=>d.accept());await row.locator('[data-offer-status]').click();await expect(row.locator(':scope > p').first()).toContainText('متوقف');
 page.once('dialog',d=>d.accept());await row.locator('[data-offer-delete]').click();await expect(page.locator('[data-managed-offer]')).toHaveCount(0);
 expect(state.writes[1].expectedUpdatedAt).toBe(revision);expect(state.writes.at(-1).expectedUpdatedAt).toBe('2026-10-09T01:00:11.000Z');
});
test('course form preserves failed values and retry identity with Riyadh dates',async({page},testInfo)=>{
 await setup(page,true);const writes=[];await page.route('**/api/v1/store/provider/courses',route=>{writes.push(route.request().postDataJSON());return json(route,{message:'تعذر الحفظ مؤقتًا'},503)});
 await expect(page.locator('.hl-store-provider')).toBeVisible();const form=page.locator('[data-offer-form][data-type="courses"][data-id=""]');await form.locator('..').locator('summary').click();
 for(const[key,value]of Object.entries({title:'دورة جديدة',courseCode:'OW',locationName:'جدة',startsAt:'2031-02-03T09:00',endsAt:'2031-02-05T13:00',capacity:'3',price:'1000'}))await form.locator(`[name=${key}]`).fill(value);
 for(let i=0;i<2;i++){await form.locator('[type=submit]').click();await expect(form.locator('[data-offer-feedback]')).toHaveText('تعذر الحفظ مؤقتًا');await expect(form.locator('[name=title]')).toHaveValue('دورة جديدة')}
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:testInfo.outputPath('public-store-provider-mobile.png'),fullPage:true});
 expect(writes).toHaveLength(2);expect(writes[0].requestId).toBe(writes[1].requestId);expect(writes[0].startsAt).toBe(course.startsAt);expect(writes[0].priceMinor).toBe(100000);
});
test('revoked role clears provider data and prevents writes',async({page})=>{
 const state=await setup(page,true);state.products=[service];let writes=0;await page.route('**/api/v1/store/provider/products/service-1/status',route=>{writes++;return json(route,{})});
 await page.locator('[data-offer-refresh]').click();await expect(page.locator('[data-managed-offer]')).toBeVisible();state.active=false;
 page.once('dialog',d=>d.accept());await page.locator('[data-offer-status]').click();await expect(page.locator('.hl-store-provider')).toBeHidden();await expect(page.locator('[data-managed-offer]')).toHaveCount(0);expect(writes).toBe(0);
});

for(const kind of ['course','product'])test('center '+kind+' image add, persistence, replace, public display and delete',async({page})=>{
 const state=await setup(page,true);state.courses=[course];state.products=[service];
 const id=kind==='course'?course.id:service.id;
 // A valid small PNG; the server test separately verifies conversion to WebP.
 const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEklEQVQImWOQ2HlOYuc5BggFACqaBn3CUZ9jAAAAAElFTkSuQmCC','base64');
 let saved={revision:null,image:null},writes=0;
 await page.route('**/api/v1/service-images/'+kind+'/'+id+'**',route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.pathname.endsWith('/content'))return saved.image?route.fulfill({contentType:'image/png',body:bytes}):route.fulfill({status:204});
  if(req.method()==='GET')return json(route,saved);
  const body=req.postDataJSON();expect(body.expectedRevision).toBe(saved.revision);writes++;
  saved={revision:String(writes),image:req.method()==='DELETE'?null:'data:image/png;base64,'+body.base64};return json(route,saved);
 });
 await page.evaluate(()=>window.HydrolandStoreProvider.open());
 const editor=page.locator('[data-managed-offer="'+id+'"] [data-service-image-editor]');await editor.locator('summary').click();
 const file=editor.locator('input[type=file]');await expect(file).toBeVisible();await file.setInputFiles({name:'test.png',mimeType:'image/png',buffer:bytes});
 await expect(editor.getByRole('status')).toHaveText('تم حفظ الصورة.');await expect(editor.locator('img')).toBeVisible();
 await page.evaluate(()=>window.HydrolandStoreProvider.open());await editor.locator('summary').click();await expect(editor.locator('img')).toBeVisible();
 await editor.locator('input[type=file]').setInputFiles({name:'replacement.png',mimeType:'image/png',buffer:bytes});await expect.poll(()=>writes).toBe(2);
 await page.evaluate(()=>window.HydrolandStore.reloadProducts());const card=page.locator(kind==='course'?'[data-store-course="'+id+'"]':'[data-public-product="'+id+'"]');await expect(card.locator('img.hl-service-image')).toBeVisible();
 page.once('dialog',d=>d.accept());await editor.getByRole('button',{name:'حذف الصورة',exact:true}).click();await expect(editor.getByRole('status')).toHaveText('تم حذف الصورة.');await expect(editor.locator('img')).toBeHidden();await expect(card.locator('img.hl-service-image')).toBeHidden();
 await page.evaluate(()=>window.HydrolandStoreProvider.open());await editor.locator('summary').click();await expect(editor.locator('img')).toBeHidden();expect(writes).toBe(3);
});

test('image errors retain the existing preview and revoked center cannot upload',async({page})=>{
 const state=await setup(page,true);state.courses=[course];
 await page.route('**/api/v1/service-images/course/course-1',route=>json(route,route.request().method()==='GET'?{revision:'r1',image:null}:{message:'تغيّرت الصورة. حدّث الصورة ثم أعد المحاولة.'},route.request().method()==='GET'?200:409));
 await page.evaluate(()=>window.HydrolandStoreProvider.open());const editor=page.locator('[data-service-image-editor="course"]');await editor.locator('summary').click();
 const file={name:'test.png',mimeType:'image/png',buffer:Buffer.from('image')};await editor.locator('input').setInputFiles(file);await expect(editor.getByRole('status')).toContainText('تغيّرت الصورة');
 state.active=false;let writes=0;await page.route('**/api/v1/service-images/course/course-1',route=>{writes++;return json(route,{},403)});
 await editor.locator('input').setInputFiles(file);await expect(editor).toHaveCount(0);expect(writes).toBe(0);
});


test('center store entry opens management directly and retains a public preview',async({page})=>{
 await setup(page,true);const panel=page.locator('.hl-store-provider');
 await expect(panel).toBeVisible();await expect(page.locator('[data-service-title]')).toHaveText('إدارة عروض المركز');
 await expect(page.locator('[data-store-manage]')).toHaveAttribute('aria-expanded','true');
 await panel.getByRole('button',{name:'معاينة المتجر',exact:true}).click();
 await expect(panel).toBeHidden();await expect(page.locator('[data-public-product="service-1"]')).toBeVisible();await expect(page.locator('[data-service-title]')).toHaveText('المتجر البحري');
 await page.locator('[data-store-manage]').click();await expect(panel.locator('[data-offer-refresh]')).toBeVisible();
 await expect(page.locator('[data-service-title]')).toHaveText('إدارة عروض المركز');
});

test('catalog shows the offer before cart and keeps each chosen SKU and price', async({page})=>{
 await setup(page);
 const variants=['M','L'].map((size,index)=>({...service,kind:'GOODS',id:'fin-'+size,sku:'FINS-'+size,nameAr:'زعانف سباحة',
   organizationId:'center-x',listPriceMinor:18000,priceMinor:index?15500:14500,discountActive:true,
   catalogDetails:{family:'FINS',size,color:'أزرق',category:'زعانف',brand:'بحر'},stockQuantity:1}));
 await page.route('**/api/v1/store/products',r=>json(r,variants));
 await page.evaluate(()=>window.HydrolandStore.reloadProducts());
 await expect(page.locator('[data-public-product]')).toHaveCount(1);
 await expect(page.locator('[data-public-product] del')).toBeVisible();
 expect(await page.evaluate(()=>window.HydrolandStore.getCart())).toHaveLength(0);
 await page.locator('[data-catalog-variant]').selectOption('fin-L');
 await page.locator('[data-store-add="fin-L"]').click();
 expect(await page.evaluate(()=>window.HydrolandStore.getCart().map(x=>[x.id,x.priceMinor,x.quantity]))).toEqual([['fin-L',15500,1]]);
 await page.locator('[data-clear-catalog-cart]').click();
 expect(await page.evaluate(()=>window.HydrolandStore.getCart())).toHaveLength(0);
});

test('customer can save a product and opt in to its stock notification independently',async({page})=>{
 const prefs=new Map();
 await setup(page);
 await page.route('**/api/v1/store/products',r=>json(r,[{...service,stockQuantity:0}]));
 await page.route('**/api/v1/store/preferences/mine',r=>json(r,[...prefs.values()]));
 await page.route('**/api/v1/store/preferences/service-1/*',r=>{
   const field=r.request().url().endsWith('/favorite')?'favorite':'stockAlert';
   const row={productId:'service-1',favorite:false,stockAlert:false,...prefs.get('service-1'),[field]:r.request().postDataJSON().enabled};
   prefs.set('service-1',row);return json(r,row);
 });
 await page.evaluate(()=>window.HydrolandStore.reloadProducts());
 await page.locator('[data-product-preference="favorite"]').click();
 await expect(page.locator('[data-product-preference="favorite"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-product-preference="stock-alert"]').click();
 await expect(page.locator('[data-product-preference="stock-alert"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-store-favorites]').click();await expect(page.locator('[data-public-product]')).toHaveCount(1);
 await page.locator('[data-product-preference="favorite"]').click();await expect(page.locator('[data-public-product]')).toHaveCount(0);
 expect(prefs.get('service-1').stockAlert).toBe(true);
});

test('center previews a CSV and saves selected products with their own SKU and price',async({page})=>{
 const state=await setup(page,true);
 await page.route('**/api/v1/store/provider/catalog/import',route=>{
   const body=route.request().postDataJSON();state.writes.push(body);
   return json(route,{count:body.rows.length,requestId:body.requestId},201);
 });
 const section=page.locator('.hl-store-provider [data-catalog-import]');
 await section.locator('summary').click();
 await section.locator('input[type=file]').setInputFiles({name:'inventory.csv',mimeType:'text/csv',
   buffer:Buffer.from('sku,nameAr,price,stock,kind,status,sale,size,description\r\nFIN-M,زعانف,150.25,4,GOODS,ACTIVE,125.50,M,"وصف, مع فاصلة"')});
 await expect(section.locator('li')).toContainText('FIN-M');
 expect(state.writes).toHaveLength(0);
 await section.getByRole('button',{name:'حفظ المنتجات'}).click();
 await expect(section.getByRole('status')).toContainText('تم حفظ المنتجات');
 expect(state.writes[0].rows[0]).toMatchObject({sku:'FIN-M',kind:'GOODS',status:'DRAFT',description:'وصف, مع فاصلة',priceMinor:15025,stockQuantity:4,catalogDetails:{salePriceMinor:12550,size:'M'}});
});

test('shared center storefront filters the catalog and exposes merchant information on mobile',async({page})=>{
 await setup(page);
 const samples=[{...service,id:'center-fin',nameAr:'زعانف المركز الأول',status:'ACTIVE',organizationId:'center-one'},
   {...service,id:'other-fin',nameAr:'زعانف المركز الثاني',status:'ACTIVE',organizationId:'center-two'}];
 await page.route('**/api/v1/store/products',r=>json(r,samples));
 await page.route('**/api/v1/store/storefronts/center-one',r=>json(r,{id:'center-one',displayName:'متجر فرسان',description:'التجهيز للموسم',hours:'صباح السبت',faqs:[{question:'أين الاستلام؟',answer:'رصيف فرسان'}]}));
 await page.evaluate(()=>{location.hash='store/center/center-one';return window.HydrolandStore.reloadProducts()});
 await expect(page.locator('#store h2').filter({hasText:'متجر فرسان'})).toBeVisible();
 await expect(page.locator('[data-public-product="center-fin"]')).toBeVisible();
 await expect(page.locator('[data-public-product="other-fin"]')).toHaveCount(0);
 await page.getByText('أين الاستلام؟',{exact:true}).click();await expect(page.getByText('رصيف فرسان',{exact:true})).toBeVisible();
 await page.locator('#store a[href="#store"]').filter({hasText:'كل عروض هيدرولاند'}).click();
 await expect(page.locator('[data-public-product="other-fin"]')).toBeVisible();
});

test('buyer can open a linked store-order case and review its reference before sending',async({page})=>{
 await setup(page);
 const id='be8fb026-b2a1-4a0a-bf01-12a88fa560ae',sent=[];
 await page.route('**/api/v1/store/orders/mine',r=>json(r,[{id,status:'CONFIRMED',totalMinor:49900,currency:'SAR',items:[],createdAt:revision}]));
 await page.route(/\/api\/v1\/customer-service\/cases$/,r=>{sent.push(r.request().postDataJSON());return json(r,{id:'case'},201)});
 await page.evaluate(()=>window.HydrolandStore.openOrders());
 await page.locator('[data-store-order]').getByRole('button',{name:'مساعدة بشأن هذا الطلب'}).click();
 const form=page.locator('[data-support-form]');
 await expect(form).toBeVisible();await expect(page.locator('.hl-support')).toContainText(id);
 expect(sent).toHaveLength(0);
 await form.locator('[name=description]').fill('أحتاج توضيحًا حول تجهيز طلبي');
 await form.getByRole('button').click();
 await expect.poll(()=>sent.length).toBe(1);
 expect(sent[0]).toMatchObject({referenceType:'STORE_ORDER',referenceId:id});
});

test('center calculates an optional percentage or fixed discount before publishing',async({page})=>{
 await setup(page,true);
 const form=page.locator('[data-offer-form][data-type="products"][data-id=""]');
 await form.locator('..').locator('summary').first().click();
 await form.locator('[name=price]').fill('240');
 const calculator=form.locator('[data-discount-calculator]');await calculator.locator('[data-show-calc]').click();
 await calculator.locator('[data-calc-value]').fill('25');await calculator.locator('[data-calc-price]').click();
 await expect(form.locator('[name=catalogSale]')).toHaveValue('180.00');
 await calculator.locator('[data-calc-mode]').selectOption('amount');await calculator.locator('[data-calc-value]').fill('15.50');
 await calculator.locator('[data-calc-price]').click();await expect(form.locator('[name=catalogSale]')).toHaveValue('224.50');
});

test('center discount dashboard updates its own SKU and reports only its order portion',async({page})=>{
 const state=await setup(page,true);
 state.products=[{...service,status:'ACTIVE',catalogDetails:{family:'FINS',size:'M',salePriceMinor:10300}}];
 await page.evaluate(()=>window.HydrolandStoreProvider.open());
 const box=page.locator('.hl-store-provider .hl-catalog-dashboard');
 await expect(box.getByRole('heading',{name:'لوحة خصومات المركز'})).toBeVisible();
 await expect(box.locator('[data-discount-counts]')).toContainText('خصم سارٍ 1');
 await page.route('**/api/v1/store/provider/products/service-1',r=>{
   const body=r.request().postDataJSON();state.writes.push(body);Object.assign(state.products[0],body);
   return json(r,state.products[0]);
 });
 await box.locator('[data-catalog-id="service-1"]').click();
 await box.locator('[name=catalogSale]').fill('98.75');
 await box.locator('[data-catalog-product] [type=submit]').click();
 await expect.poll(()=>state.writes.length).toBe(1);
 expect(state.writes[0]).toMatchObject({sku:'SERVICE-1',kind:'SERVICE',status:'ACTIVE',catalogDetails:{salePriceMinor:9875,size:'M'}});
 const result=[{id:'customer-order',currency:'SAR',status:'CREATED',createdAt:revision,totalMinor:9875}];
 await page.route('**/api/v1/store/provider/reports/orders*',r=>json(r,result));
 const reports=box.locator('details').filter({has:page.locator('summary',{hasText:'تقارير المتجر'})});
 await reports.locator('summary').click();await reports.getByRole('button',{name:'تحديث تقرير الطلبات'}).click();
 await expect(reports).toContainText('قيمة بنود مركزك فقط');await expect(reports).toContainText('CREATED');
});

test('center moves a SKU out of published stock into a warehouse on mobile',async({page})=>{
 const state=await setup(page,true);
 const stock={locations:[{id:'warehouse',title:'مستودع المرسى',code:'WH-A'}],units:[],
   products:[{id:'mask',nameAr:'قناع الغوص',sku:'MASK-1',stockQuantity:4,locationStock:[]}],movements:[]};
 await page.route('**/api/v1/store/provider/inventory',r=>json(r,stock));
 await page.route('**/api/v1/store/provider/inventory/transfers',r=>{
   const body=r.request().postDataJSON();state.writes.push(body);stock.products[0].stockQuantity-=body.quantity;
   stock.products[0].locationStock=[{locationId:'warehouse',quantity:body.quantity}];return json(r,{id:body.requestId},201);
 });
 const inventory=page.locator('[data-merchant-inventory]');await inventory.locator('> summary').click();
 const form=inventory.locator('[data-stock-transfer]');await expect(form).toBeVisible();
 await form.getByLabel('إلى موقع').selectOption('warehouse');await form.getByLabel('الكمية').fill('3');
 await form.getByRole('button',{name:'نقل الكمية'}).click();
 await expect(form).toContainText('مستودع المرسى · WH-A · 3');await expect(form).toContainText('إجمالي الوحدات · 4');
 expect(state.writes[0]).toMatchObject({productId:'mask',sourceKey:'ONLINE',destinationKey:'warehouse',quantity:3});
});
