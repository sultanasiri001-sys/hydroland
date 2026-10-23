import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const accountId='11111111-1111-4111-8111-111111111111',recordId='22222222-2222-4222-8222-222222222222',revision='2026-10-22T17:00:00.000Z';
const departments=[{id:'hr-unit',code:'HR',nameAr:'الموارد البشرية',active:true},{id:'training-unit',code:'TRAINING',nameAr:'التدريب',active:true}];
const profiles=[{code:'STAFF',label:'موظف',description:'صلاحيات موظف دون إدارة.'},{code:'HR_REVIEWER',label:'مراجع موارد بشرية',description:'مراجعة المرشحين في النطاق الداخلي.'},{code:'HR_MANAGER',label:'مدير موارد بشرية',description:'إدارة طلبات الموارد البشرية في النطاق الداخلي.'}];
const readiness=(available=3,reason='READY')=>({checkedAt:new Date().toISOString(),independentAdministrators:{required:3,available},compliance:{ready:reason==='READY',reason}});
const row=(extra={})=>({id:recordId,status:'HR_REVIEW',reason:'طلب توظيف تجريبي',updatedAt:revision,employment:{id:'employment-fixture',status:'PENDING_APPROVAL',department:departments[1],position:{titleAr:'منسق التدريب'}},account:{id:accountId,email:'employee@example.invalid',status:'ACTIVE',emailVerifiedAt:revision,person:{firstName:'موظف',lastName:'اختبار'}},requestedProfile:'STAFF',verificationMethod:'EXISTING',grantedRoles:[],effectiveAccess:false,canReview:false,canApprove:false,canReject:false,canCancel:false,...extra});
async function setup(page,options={}){
 const state={admin:true,initialized:true,approvalReadiness:readiness(),rows:[row()],writes:[],lookups:[],queries:[],initWrites:0,failCreate:false,failInit:false,conflict:false,delay:false,release:null,pages:false,...options};
 await page.route('**/api/v1/**',route=>json(route,[]));await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,route=>json(route,{id:'staffing-admin',status:'ACTIVE',person:{firstName:'إدارة',lastName:'اختبار'},roleAssignments:state.admin?[{role:'ADMIN',status:'ACTIVE'}]:[]}));
 await page.route(/\/api\/v1\/admin\/accounts(?:\?.*)?$/,route=>{state.lookups.push(new URL(route.request().url()).searchParams.get('search'));return json(route,{items:[{id:accountId,email:'existing@example.invalid',status:'ACTIVE',emailVerifiedAt:revision,person:{firstName:'موظف',lastName:'موجود'}}],nextCursor:null})});
 await page.route(/\/api\/v1\/admin\/employees(?:\?.*)?$/,async route=>{
  if(route.request().method()==='POST'){
   const body=route.request().postDataJSON();state.writes.push({kind:'request',body});
   if(state.failCreate)return json(route,{message:'تعذر الحفظ مؤقتًا؛ أعد المحاولة بنفس البيانات.'},503);
   const created=row({id:randomUUID(),requestedProfile:body.profile,verificationMethod:body.verificationMethod||'EXISTING',canCancel:true,employment:{id:'new-employment',status:'PENDING_APPROVAL',department:departments.find(d=>d.code===body.departmentCode),position:{titleAr:body.jobTitle}},account:{id:accountId,email:body.email||'existing@example.invalid',status:body.mode==='CREATE'?'PENDING_VERIFICATION':'ACTIVE',emailVerifiedAt:body.mode==='CREATE'?null:revision,person:{firstName:body.firstName||'موظف',lastName:body.lastName||'موجود'}}});state.rows=[created];return json(route,created,201);
  }
  const query=new URL(route.request().url()).searchParams;state.queries.push(query.toString());const items=state.rows;
  if(state.delay)await new Promise(resolve=>state.release=resolve);
  return json(route,{initialized:state.initialized,departments:state.initialized?departments:[],profiles,email:{enabled:true,restricted:true},google:{enabled:true},approvalReadiness:state.approvalReadiness,items:state.initialized?items:[],nextCursor:state.pages&&!query.has('cursor')?'33333333-3333-4333-8333-333333333333':null});
 });
 await page.route('**/admin/employees/initialize',route=>{state.initWrites++;if(state.failInit)return json(route,{message:'تعذر حفظ التهيئة مؤقتًا'},503);state.initialized=true;return json(route,{initialized:true},201)});
 await page.route('**/admin/employees/*/decision',route=>{
  const body=route.request().postDataJSON();state.writes.push({kind:'decision',body});if(state.conflict)return json(route,{message:'تغير الطلب؛ حدّث البيانات وراجع القرار.'},409);
  const existing=state.rows[0];const reviewed=body.action==='REVIEW',effective=body.action==='APPROVE';state.rows=[{...existing,status:reviewed?'APPROVAL_REQUIRED':effective?'EFFECTIVE':body.action==='CANCEL'?'CANCELLED':'REJECTED',updatedAt:'2026-10-22T17:01:00.000Z',canReview:false,canApprove:false,canReject:false,canCancel:false,effectiveAccess:effective,grantedRoles:effective?['STAFF','HR_MANAGER']:[]}];return json(route,state.rows[0]);
 });
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandAdminEmployees&&window.HydrolandAuth&&window.HydrolandProfile));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'staffing-browser-fixture',refreshToken:'staffing-browser-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="admin"]').click();await page.locator('[data-portal-label="إدارة الموظفين"]').click();
 await expect(page.locator('#hl-admin-employees')).toBeVisible();await expect(page.locator('[data-staff-feedback]')).toContainText(state.initialized?'تم تحميل':'لم يُهيأ');return state;
}
const request=page=>page.locator('[data-staff-request]');
async function fillNew(page){const form=request(page);await form.getByLabel('طريقة إضافة الموظف').selectOption('CREATE');await form.getByLabel('الإدارة',{exact:true}).selectOption('HR');await form.getByLabel('المسمى الوظيفي').fill('منسق موارد بشرية');await form.getByRole('combobox',{name:'الصلاحيات المطلوبة',exact:true}).selectOption('HR_MANAGER');await form.getByLabel('الاسم الأول',{exact:true}).fill('سالم');await form.getByLabel('اسم العائلة',{exact:true}).fill('اختبار');await form.getByLabel('بريد الموظف',{exact:true}).fill('new@example.invalid');await form.getByLabel('سبب طلب التعيين').fill('حاجة وظيفية في بيئة اختبار معزولة');await form.getByRole('checkbox').check();return form;}
async function fillDecision(page){const form=page.locator('[data-staff-decision]');await form.getByLabel('سبب القرار').fill('مراجعة وظيفية مستقلة في الاختبار');await form.getByRole('checkbox').check();return form;}

test('approval prerequisites explain missing controls without blocking a draft or changing access',async({page})=>{
 const state=await setup(page,{rows:[],approvalReadiness:readiness(1,'HR_COMPLIANCE_CONTROLS_MISSING')}),summary=page.locator('[data-staff-readiness]');
 await expect(summary).toContainText('العدد الحالي لا يكفي');await expect(summary).toContainText('لم تُضبط ضوابط الموارد البشرية');await expect(summary).toContainText('وقت القراءة');await expect(summary).toContainText('يمكن حفظ الطلب');
 const form=await fillNew(page);await expect(form.getByRole('button',{name:'حفظ طلب التعيين',exact:true})).toBeEnabled();
 state.approvalReadiness=readiness(3);await page.getByRole('button',{name:'تحديث الموظفين',exact:true}).click();await expect(summary).toContainText('يتوفر العدد الأدنى');await expect(summary).toContainText('تُراجع أهلية الأطراف لكل طلب');await expect(summary).toContainText('ضوابط الموارد البشرية مكتملة');await expect(form.getByLabel('المسمى الوظيفي')).toHaveValue('منسق موارد بشرية');await expect(form.getByLabel('سبب طلب التعيين')).toHaveValue('حاجة وظيفية في بيئة اختبار معزولة');expect(state.writes).toHaveLength(0);expect(state.initWrites).toBe(0);
});
test('missing or inconsistent approval evidence stays unknown and a failed refresh removes old readiness',async({page})=>{
 const state=await setup(page),summary=page.locator('[data-staff-readiness]');
 await expect(summary).toContainText('يتوفر العدد الأدنى');
 for(const evidence of [null,{...readiness(),checkedAt:'not-a-date'},{...readiness(),independentAdministrators:{required:3,available:-1}},{...readiness(),compliance:{ready:true,reason:'HR_COMPLIANCE_CONTROLS_MISSING'}},{...readiness(),compliance:{ready:false,reason:'<img src=x onerror=alert(1)>'}}]){
  state.approvalReadiness=evidence;await page.getByRole('button',{name:'تحديث الموظفين',exact:true}).click();await expect(summary).toContainText('تعذر التحقق');await expect(summary).not.toContainText('يتوفر العدد الأدنى');await expect(summary.locator('img')).toHaveCount(0);
 }
 state.approvalReadiness=readiness();await page.getByRole('button',{name:'تحديث الموظفين',exact:true}).click();await expect(summary).toContainText('يتوفر العدد الأدنى');
 await page.route(/\/api\/v1\/admin\/employees(?:\?.*)?$/,route=>json(route,{message:'تعذر تحميل الموظفين مؤقتًا'},503));await page.getByRole('button',{name:'تحديث الموظفين',exact:true}).click();await expect(page.locator('[data-staff-feedback]')).toContainText('تعذر تحميل');await expect(summary).toContainText('تعذر التحقق');await expect(summary).not.toContainText('يتوفر العدد الأدنى');expect(state.writes).toHaveLength(0);
});

test('new staff request captures the reviewed identity and retries with the same request key',async({page})=>{
 const state=await setup(page,{rows:[],failCreate:true}),form=await fillNew(page);
 await expect(form.locator('input[type="password"]')).toHaveCount(0);await expect(form.locator('option[value="ADMIN"],option[value="IAM_SERVICE"],option[value="HR_EXECUTIVE"]')).toHaveCount(0);
 await form.getByRole('button',{name:'حفظ طلب التعيين',exact:true}).click();await expect(form.locator('[data-form-feedback]')).toContainText('أعد المحاولة');await expect(form.getByLabel('سبب طلب التعيين')).toHaveValue('حاجة وظيفية في بيئة اختبار معزولة');
 state.failCreate=false;await form.getByRole('button',{name:'حفظ طلب التعيين',exact:true}).click();await expect(page.locator('[data-staffing-record]')).toContainText('بانتظار التحقق');await expect(page.locator('[data-staffing-record]')).toContainText('Google');await expect(page.locator('[data-staffing-record]')).toContainText('لم تُفعّل');
 expect(state.writes).toHaveLength(2);expect(state.writes[0].body).toEqual(state.writes[1].body);expect(state.writes[0].body).toMatchObject({mode:'CREATE',email:'new@example.invalid',firstName:'سالم',lastName:'اختبار',departmentCode:'HR',profile:'HR_MANAGER',verificationMethod:'GOOGLE',reviewed:true});expect(state.writes[0].body.requestId).toMatch(/^[a-f0-9-]{36}$/);expect(state.writes[0].body.accountId).toBeUndefined();
});
test('existing account lookup links identity without new-name or verification fields',async({page})=>{
 const state=await setup(page,{rows:[]}),form=request(page);await form.getByLabel('الإدارة',{exact:true}).selectOption('TRAINING');await expect(form.locator('[name="profile"] option')).toHaveCount(1);
 await form.getByLabel('المسمى الوظيفي').fill('منسق التدريب');await form.getByLabel('البحث عن حساب بالاسم أو جزء من البريد').fill('موجود');await form.getByRole('button',{name:'بحث عن حساب موجود',exact:true}).click();await form.getByLabel('الحساب المراد ربطه').selectOption(accountId);await form.getByLabel('سبب طلب التعيين').fill('ربط الحساب الموجود دون تكرار الهوية');await form.getByRole('checkbox').check();await form.getByRole('button',{name:'حفظ طلب التعيين',exact:true}).click();
 await expect(page.locator('[data-staffing-record]')).toContainText('موجود');expect(state.lookups).toContain('موجود');const body=state.writes[0].body;expect(body).toMatchObject({mode:'LINK',accountId,profile:'STAFF'});for(const key of ['email','firstName','lastName','verificationMethod','accountSearch'])expect(body[key]).toBeUndefined();
});
test('reviewer sees independent approval pending and no permission grant after review',async({page})=>{
 const state=await setup(page,{rows:[row({canReview:true,canReject:true})]}),form=await fillDecision(page);await form.getByRole('button',{name:'حفظ مراجعة الموارد البشرية',exact:true}).click();await expect(page.locator('[data-staffing-record]')).toContainText('بانتظار اعتماد مستقل');await expect(page.locator('[data-staffing-record]')).toContainText('لم تُفعّل');await expect(page.getByRole('button',{name:'اعتماد التعيين وتفعيل الصلاحيات',exact:true})).toHaveCount(0);expect(state.writes[0].body).toEqual({action:'REVIEW',reason:'مراجعة وظيفية مستقلة في الاختبار',reviewed:true,expectedUpdatedAt:revision});
});
test('approval retains conflict notes then displays persisted effective permissions',async({page})=>{
 const state=await setup(page,{conflict:true,rows:[row({status:'APPROVAL_REQUIRED',requestedProfile:'HR_MANAGER',canApprove:true})]}),form=await fillDecision(page);
 await form.getByRole('button',{name:'اعتماد التعيين وتفعيل الصلاحيات',exact:true}).click();await expect(form).toContainText('تغير الطلب');await expect(form.getByLabel('سبب القرار')).toHaveValue('مراجعة وظيفية مستقلة في الاختبار');state.conflict=false;
 await form.getByRole('button',{name:'اعتماد التعيين وتفعيل الصلاحيات',exact:true}).click();await expect(page.locator('[data-staffing-record]')).toContainText('تعيين معتمد');await expect(page.locator('[data-staffing-record]')).toContainText('مدير موارد بشرية');await expect(page.locator('[data-staff-feedback]')).toContainText('دخول جديد');await page.getByRole('button',{name:'تحديث الموظفين',exact:true}).click();await expect(page.locator('[data-staffing-record]')).toContainText('التعيين والصلاحيات متاحان');expect(state.writes).toHaveLength(2);expect(state.writes[0].body).toEqual(state.writes[1].body);
});
test('revoked administrator cannot submit and private workforce fields clear',async({page})=>{
 const state=await setup(page,{rows:[row({canReview:true})]}),form=await fillDecision(page);await request(page).getByLabel('المسمى الوظيفي').fill('بيانات خاصة قبل سحب الدور');state.admin=false;await form.getByRole('button',{name:'حفظ مراجعة الموارد البشرية',exact:true}).click();await expect(page.locator('[data-staffing-record]')).toHaveCount(0);await expect(page.locator('#hl-admin-employees')).toBeHidden();await expect(page.locator('[data-staff-readiness-admins]')).toBeEmpty();await expect(page.locator('[data-staff-readiness-status]')).toBeEmpty();await expect(request(page).getByLabel('المسمى الوظيفي')).toHaveValue('');expect(state.writes).toHaveLength(0);
});
test('a delayed private employee response cannot repopulate the page after navigation',async({page})=>{
 const state=await setup(page);state.delay=true;await page.getByRole('button',{name:'تحديث الموظفين',exact:true}).click();await expect.poll(()=>typeof state.release).toBe('function');await page.locator('[data-portal-label="مركز القيادة والتحكم"]').click();const finished=page.waitForResponse(r=>/\/admin\/employees(?:\?|$)/.test(r.url()));state.release();await finished;await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));await expect(page.locator('[data-staffing-record]')).toHaveCount(0);await expect(page.locator('#hl-admin-employees')).toBeHidden();await expect(page.locator('[data-staff-readiness-admins]')).toBeEmpty();await expect(page.locator('[data-staff-readiness-status]')).toBeEmpty();
});
test('explicit structure initialization preserves notes on failure and then enables hiring',async({page})=>{
 const state=await setup(page,{initialized:false,failInit:true}),form=page.locator('[data-staff-initialize]');await expect(request(page)).toBeHidden();await form.getByLabel('سبب التهيئة').fill('تهيئة الهيكل الداخلي المعتمد للاختبار');await form.getByRole('checkbox').check();await form.getByRole('button',{name:'تهيئة الهيكل الوظيفي',exact:true}).click();await expect(form).toContainText('تعذر حفظ');await expect(form.getByLabel('سبب التهيئة')).toHaveValue('تهيئة الهيكل الداخلي المعتمد للاختبار');state.failInit=false;await form.getByRole('button',{name:'تهيئة الهيكل الوظيفي',exact:true}).click();await expect(request(page)).toBeVisible();await expect(form).toBeHidden();expect(state.initWrites).toBe(2);
});
test('employee search, pagination, escaping, mobile layout and logout use the protected page',async({page})=>{
 const state=await setup(page,{pages:true,rows:[row({account:{...row().account,person:{firstName:'<img src=x onerror=alert(1)>',lastName:'اختبار'}}})]});await expect(page.locator('[data-staffing-record]')).toContainText('<img src=x');await expect(page.locator('[data-staffing-record] img')).toHaveCount(0);
 await page.getByLabel('البحث في طلبات الموظفين').fill('موظف & تدريب');await page.getByRole('button',{name:'بحث الموظفين',exact:true}).click();await expect.poll(()=>state.queries.some(q=>new URLSearchParams(q).get('search')==='موظف & تدريب')).toBe(true);await page.getByRole('button',{name:'طلبات أقدم',exact:true}).click();await expect(page.getByRole('button',{name:'طلبات أحدث',exact:true})).toBeEnabled();await expect(page.getByRole('button',{name:'طلبات أقدم',exact:true})).toBeDisabled();
 await page.setViewportSize({width:390,height:844});expect(await page.locator('#hl-admin-employees').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.evaluate(()=>window.HydrolandAuth.terminateSession());await expect(page.locator('[data-staffing-record]')).toHaveCount(0);await expect(page.locator('#hl-admin-employees')).toBeHidden();
});
