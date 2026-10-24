import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const accountId='11111111-1111-4111-8111-111111111111',recordId='22222222-2222-4222-8222-222222222222',revision='2026-10-22T17:00:00.000Z';
const departments=[{id:'hr-unit',code:'HR',nameAr:'الموارد البشرية',active:true},{id:'training-unit',code:'TRAINING',nameAr:'التدريب',active:true}];
const profiles=[{code:'STAFF',label:'موظف',description:'صلاحيات موظف دون إدارة.'},{code:'HR_REVIEWER',label:'مراجع موارد بشرية',description:'مراجعة المرشحين في النطاق الداخلي.'},{code:'HR_MANAGER',label:'مدير موارد بشرية',description:'إدارة طلبات الموارد البشرية في النطاق الداخلي.'}];
const readiness=(available=3,reason='READY')=>({checkedAt:new Date().toISOString(),independentAdministrators:{required:1,available},reviewAuthority:{kind:'PLATFORM_OWNER',available:true,isCurrentAccount:true},compliance:{ready:reason==='READY',reason}});
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

 await page.route('**/admin/employees/approval-delegations',async route=>{
  if(!state.ownerDelegation)return json(route,{message:'تفويض الاعتماد متاح للمالك فقط'},403);
  if(route.request().method()==='POST'){
   const body=route.request().postDataJSON();state.writes.push({kind:'delegation',body});if(state.failDelegation)return json(route,{message:'تغيرت التفويضات؛ حدّث القائمة'},409);
   state.delegationItems=body.action==='GRANT'?[{accountId,email:body.email,eligible:true}]:[];state.delegationRevision='new-revision';
  }
  return json(route,{revision:state.delegationRevision||'NONE',scope:'ALL_INTERNAL_DEPARTMENTS',items:state.delegationItems||[]});
 });
 await page.route('**/employee-approvals/capability',route=>json(route,{canApprove:Boolean(state.delegateOnly),kind:state.delegateOnly?'DELEGATE':null}));
 await page.route(/\/api\/v1\/employee-approvals(?:\?.*)?$/,async route=>{
  if(state.revokedDelegate)return json(route,{message:'تفويض الاعتماد غير متاح'},403);
  if(state.delayApproval)await new Promise(resolve=>state.releaseApproval=resolve);
  return json(route,{items:state.rows,profiles,approvalReadiness:state.approvalReadiness,nextCursor:null});
 });
 await page.route('**/employee-approvals/*/decision',route=>{
  const body=route.request().postDataJSON();state.writes.push({kind:'delegated-decision',body});if(state.revokedDelegate)return json(route,{message:'تفويض الاعتماد غير متاح'},403);
  state.rows=[];return json(route,{id:recordId,status:'EFFECTIVE'});
 });
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandAdminEmployees&&window.HydrolandAuth&&window.HydrolandProfile));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'staffing-browser-fixture',refreshToken:'staffing-browser-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 if(state.delegateOnly)return state;
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="admin"]').click();await page.locator('[data-portal-label="إدارة الموظفين"]').click();
 await expect(page.locator('#hl-admin-employees')).toBeVisible();await expect(page.locator('[data-staff-feedback]')).toContainText(state.initialized?'تم تحميل':'لم يُهيأ');return state;
}
const request=page=>page.locator('[data-staff-request]');
async function fillNew(page){const form=request(page);await form.getByLabel('طريقة إضافة الموظف').selectOption('CREATE');await form.getByLabel('الإدارة',{exact:true}).selectOption('HR');await form.getByLabel('المسمى الوظيفي').fill('منسق موارد بشرية');await form.getByRole('combobox',{name:'الصلاحيات المطلوبة',exact:true}).selectOption('HR_MANAGER');await form.getByLabel('الاسم الأول',{exact:true}).fill('سالم');await form.getByLabel('اسم العائلة',{exact:true}).fill('اختبار');await form.getByLabel('بريد الموظف',{exact:true}).fill('new@example.invalid');await form.getByLabel('سبب طلب التعيين').fill('حاجة وظيفية في بيئة اختبار معزولة');await form.getByRole('checkbox').check();return form;}
async function fillDecision(page){const form=page.locator('[data-staff-decision]');await form.getByLabel('سبب القرار').fill('مراجعة وظيفية مستقلة في الاختبار');await form.getByRole('checkbox').check();return form;}

test('approval prerequisites explain missing controls without blocking a draft or changing access',async({page})=>{
 const state=await setup(page,{rows:[],approvalReadiness:readiness(1,'HR_COMPLIANCE_CONTROLS_MISSING')}),summary=page.locator('[data-staff-readiness]');
 await expect(summary).toContainText('حسابات الإدارة النشطة');await expect(summary).toContainText('لم تُضبط ضوابط الموارد البشرية');await expect(summary).toContainText('وقت القراءة');await expect(summary).toContainText('يمكن حفظ الطلب');
 const form=await fillNew(page);await expect(form.getByRole('button',{name:'حفظ طلب التعيين',exact:true})).toBeEnabled();
 state.approvalReadiness=readiness(3);await page.getByRole('button',{name:'تحديث الموظفين',exact:true}).click();await expect(summary).toContainText('تُراجع صلاحية المالك');await expect(summary).toContainText('الموظف المفوض لكل طلب');await expect(summary).toContainText('ضوابط الموارد البشرية مكتملة');await expect(form.getByLabel('المسمى الوظيفي')).toHaveValue('منسق موارد بشرية');await expect(form.getByLabel('سبب طلب التعيين')).toHaveValue('حاجة وظيفية في بيئة اختبار معزولة');expect(state.writes).toHaveLength(0);expect(state.initWrites).toBe(0);
});
test('missing or inconsistent approval evidence stays unknown and a failed refresh removes old readiness',async({page})=>{
 const state=await setup(page),summary=page.locator('[data-staff-readiness]');
 await expect(summary).toContainText('تُراجع صلاحية المالك');
 for(const evidence of [null,{...readiness(),checkedAt:'not-a-date'},{...readiness(),independentAdministrators:{required:3,available:-1}},{...readiness(),compliance:{ready:true,reason:'HR_COMPLIANCE_CONTROLS_MISSING'}},{...readiness(),compliance:{ready:false,reason:'<img src=x onerror=alert(1)>'}}]){
  state.approvalReadiness=evidence;await page.getByRole('button',{name:'تحديث الموظفين',exact:true}).click();await expect(summary).toContainText('تعذر التحقق');await expect(summary).not.toContainText('تُراجع صلاحية المالك');await expect(summary.locator('img')).toHaveCount(0);
 }
 state.approvalReadiness=readiness();await page.getByRole('button',{name:'تحديث الموظفين',exact:true}).click();await expect(summary).toContainText('تُراجع صلاحية المالك');
 await page.route(/\/api\/v1\/admin\/employees(?:\?.*)?$/,route=>json(route,{message:'تعذر تحميل الموظفين مؤقتًا'},503));await page.getByRole('button',{name:'تحديث الموظفين',exact:true}).click();await expect(page.locator('[data-staff-feedback]')).toContainText('تعذر تحميل');await expect(summary).toContainText('تعذر التحقق');await expect(summary).not.toContainText('تُراجع صلاحية المالك');expect(state.writes).toHaveLength(0);
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
test('reviewer sees appointment approval pending and no permission grant after review',async({page})=>{
 const state=await setup(page,{rows:[row({canReview:true,canReject:true})]}),form=await fillDecision(page);await form.getByRole('button',{name:'حفظ مراجعة الموارد البشرية',exact:true}).click();await expect(page.locator('[data-staffing-record]')).toContainText('بانتظار اعتماد التعيين');await expect(page.locator('[data-staffing-record]')).toContainText('لم تُفعّل');await expect(page.getByRole('button',{name:'اعتماد التعيين وتفعيل الصلاحيات',exact:true})).toHaveCount(0);expect(state.writes[0].body).toEqual({action:'REVIEW',reason:'مراجعة وظيفية مستقلة في الاختبار',reviewed:true,expectedUpdatedAt:revision});
});
test('the responsible internal owner reviews an owner-created request before owner final approval',async({page})=>{
 const state=await setup(page,{rows:[row({canReview:true,canCancel:true})],approvalReadiness:readiness(2)});
 await expect(page.locator('[data-staff-review-authority]')).toContainText('حسابك هو مسؤول مراجعة');await expect(page.locator('[data-staff-review-authority]')).toContainText('يمكنك مراجعة الطلب الذي أنشأته');await expect(page.locator('[data-staff-readiness-admins]')).toContainText('حساب مالك الجهة: 1');
 const form=await fillDecision(page);await form.getByRole('button',{name:'حفظ مراجعة الموارد البشرية',exact:true}).click();await expect(page.locator('[data-staffing-record]')).toContainText('بانتظار اعتماد التعيين');await expect(page.locator('[data-staffing-record]')).toContainText('لم تُفعّل');await expect(page.getByRole('button',{name:'اعتماد التعيين وتفعيل الصلاحيات',exact:true})).toHaveCount(0);expect(state.writes[0].body.action).toBe('REVIEW');
});
test('another administrator sees the responsible review account without an owner-review action',async({page})=>{
 const value=readiness(2);value.reviewAuthority.isCurrentAccount=false;
 const state=await setup(page,{approvalReadiness:value,rows:[row({canReview:false})]});await expect(page.locator('[data-staff-review-authority]')).toContainText('المالك للجهة');await expect(page.getByRole('button',{name:'حفظ مراجعة الموارد البشرية',exact:true})).toHaveCount(0);
 state.approvalReadiness={...value,reviewAuthority:{kind:'PLATFORM_OWNER',available:false,isCurrentAccount:false}};await page.getByRole('button',{name:'تحديث الموظفين',exact:true}).click();await expect(page.locator('[data-staff-review-authority]')).toContainText('غير متاح');expect(state.writes).toHaveLength(0);
 await page.evaluate(()=>window.HydrolandAuth.terminateSession());await expect(page.locator('[data-staff-review-authority]')).toBeEmpty();
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


test('owner grants and revokes approval by employee email with conflict notes retained',async({page})=>{
 const state=await setup(page,{ownerDelegation:true}),section=page.locator('[data-staff-delegations]'),form=section.locator('[data-delegation-grant]');
 await expect(section).toBeVisible();await form.getByLabel('بريد الموظف المفوض').fill('approved-employee@example.invalid');await form.getByLabel('سبب التفويض').fill('تفويض اعتماد جميع الإدارات الداخلية في اختبار معزول');await form.getByRole('checkbox').check();
 state.failDelegation=true;await form.getByRole('button',{name:'تفويض الاعتماد',exact:true}).click();await expect(section).toContainText('تغيرت التفويضات');await expect(form.getByLabel('بريد الموظف المفوض')).toHaveValue('approved-employee@example.invalid');
 state.failDelegation=false;await form.getByRole('button',{name:'تفويض الاعتماد',exact:true}).click();await expect(section.locator('[data-delegation-items]')).toContainText('approved-employee@example.invalid');expect(state.writes.at(-1).body).toMatchObject({action:'GRANT',email:'approved-employee@example.invalid',expectedRevision:'NONE',reviewed:true});
 const revoke=section.locator('[data-delegation-revoke]');await revoke.getByLabel('سبب سحب التفويض').fill('سحب صلاحية الاعتماد في اختبار معزول');await revoke.getByRole('checkbox').check();await revoke.getByRole('button',{name:'سحب التفويض',exact:true}).click();await expect(section).toContainText('تم سحب التفويض');expect(state.writes.at(-1).body).toMatchObject({action:'REVOKE',accountId,expectedRevision:'new-revision'});
 await form.getByLabel('بريد الموظف المفوض').fill('private-draft@example.invalid');await page.evaluate(()=>document.dispatchEvent(new CustomEvent('hydroland:workspace-selected',{detail:{target:document.getElementById('home')}})));await expect(section).toBeHidden();await expect(form.getByLabel('بريد الموظف المفوض')).toHaveValue('');await expect(section.locator('[data-delegation-items]')).toBeEmpty();
 await page.evaluate(()=>window.HydrolandAuth.terminateSession());await expect(section).toBeHidden();await expect(section.locator('[data-delegation-items]')).toBeEmpty();await expect(form.getByLabel('بريد الموظف المفوض')).toHaveValue('');
});
async function openDelegatedApprovals(page){await page.locator('#profile-open').click();await page.locator('[data-open-staff-approvals]').click();await expect(page.locator('#hl-staff-approvals')).toBeVisible();}
test('ordinary delegated employee approves without an admin portal and loses access immediately on revocation',async({page})=>{
 const state=await setup(page,{admin:false,delegateOnly:true,rows:[row({status:'APPROVAL_REQUIRED',canApprove:true})]});await openDelegatedApprovals(page);
 const panel=page.locator('#hl-staff-approvals'),form=panel.locator('[data-delegated-decision]');await expect(page.locator('[data-staff-request]')).toBeHidden();await expect(panel.locator('[data-delegation-grant]')).toHaveCount(0);
 await form.getByLabel('سبب اعتماد التعيين').fill('اعتماد من الموظف المفوض في اختبار متصفح');await form.getByRole('checkbox').check();state.revokedDelegate=true;await form.getByRole('button',{name:'اعتماد التعيين وتفعيل الصلاحيات',exact:true}).click();await expect(panel).toContainText('تفويض الاعتماد غير متاح');await expect(panel.locator('[data-delegated-decision]')).toHaveCount(0);expect(state.writes.at(-1).body).toMatchObject({action:'APPROVE',expectedUpdatedAt:revision});
});
test('delegated approval persists and late private data cannot return after logout',async({page})=>{
 const state=await setup(page,{admin:false,delegateOnly:true,rows:[row({status:'APPROVAL_REQUIRED',canApprove:true})]});await openDelegatedApprovals(page);
 const panel=page.locator('#hl-staff-approvals'),form=panel.locator('[data-delegated-decision]');await form.getByLabel('سبب اعتماد التعيين').fill('اعتماد تعيين من المفوض في اختبار متصفح');await form.getByRole('checkbox').check();await form.getByRole('button',{name:'اعتماد التعيين وتفعيل الصلاحيات',exact:true}).click();await expect(panel).toContainText('تم اعتماد التعيين وتفعيل الصلاحيات');
 state.rows=[row({canApprove:true})];state.delayApproval=true;await panel.getByRole('button',{name:'تحديث طلبات الاعتماد',exact:true}).click();await expect.poll(()=>Boolean(state.releaseApproval)).toBe(true);await page.evaluate(()=>window.HydrolandAuth.terminateSession());state.releaseApproval();await expect(panel).toBeHidden();await expect(panel.locator('[data-approval-items]')).toBeEmpty();await expect(page.locator('[data-open-staff-approvals]')).toHaveCount(0);
});

const hrContractTemplate={id:'template-hr',code:'CLIB-HR-PERMANENT',titleAr:'عقد عمل غير محدد المدة',version:2,contentHash:'sha256:template',content:{fields:[{key:'employeeName',label:'اسم العامل',source:'EMPLOYMENT_ACCOUNT',required:true},{key:'pay',label:'الأجر',source:'CONTRACT_TERMS',required:true}],clauses:['بند موظف معتمد للاختبار']}};
function hrContractWorkspace(templates=[hrContractTemplate]){return {employeeName:'موظف اختبار',employmentUpdatedAt:revision,sourceHash:'sha256:source',expectedContractVersion:0,sourceValues:{employeeName:'موظف اختبار'},canCreate:true,templates,items:[],execution:'DRAFT_ONLY'};}
async function openHrContracts(page,options={}){
 const state=await setup(page,{rows:[row({canManageContractDrafts:true})]});const workspace=hrContractWorkspace(options.templates);const writes=[];
 await page.route('**/hr/employments/employment-fixture/contracts',async route=>{
  if(options.delay)await new Promise(resolve=>options.release=resolve);
  if(route.request().method()==='POST'){
   const body=route.request().postDataJSON();writes.push(body);
   if(options.deny)return json(route,{message:'Permission revoked'},403);
   if(options.conflict)return json(route,{message:'تغير سجل الموظف؛ حدّث البيانات.'},409);
   const result={id:'hr-contract',version:1,contractType:'CLIB-HR-PERMANENT',status:'DRAFT',effectiveFrom:body.effectiveFrom+'T00:00:00.000Z',librarySnapshot:{template:workspace.templates.find(t=>t.id===body.templateId),values:{employeeName:'موظف اختبار',...body.values},snapshotHash:'sha256:saved'}};
   workspace.items=[result];workspace.expectedContractVersion=1;return json(route,result,201);
  }return json(route,workspace);
 });
 await page.getByRole('button',{name:'عقود الموظف من المكتبة',exact:true}).click();
 return {state,workspace,writes,box:page.locator('[data-employment-contract-box]')};
}
async function fillHrContract(box){const form=box.locator('[data-employment-contract-draft]');await form.getByLabel('الأجر',{exact:true}).fill('أجر تجريبي');await form.getByLabel('تاريخ سريان المسودة').fill('2027-01-01');await form.getByLabel('سبب إعداد مسودة العقد').fill('إعداد مسودة للاختبار فقط');await form.getByRole('checkbox').check();return form;}

test('employee contract draft pins approved template and canonical identity without staffing writes',async({page})=>{
 const {state,writes,box}=await openHrContracts(page);await expect(box).toContainText('توقيع العامل والتوثيق الرسمي لهما إجراء لاحق');
 await expect(box.locator('[name="value.employeeName"]')).toHaveCount(0);
 const form=await fillHrContract(box);await form.getByRole('button',{name:'حفظ مسودة عقد الموظف',exact:true}).click();
 await expect(box).toContainText('sha256:saved');expect(writes).toHaveLength(1);expect(writes[0]).toMatchObject({expectedContractVersion:0,expectedSourceHash:'sha256:source',templateId:'template-hr',expectedTemplateVersion:2,expectedTemplateContentHash:'sha256:template',reviewed:true,values:{pay:'أجر تجريبي'}});expect(state.writes).toHaveLength(0);
});
test('no published HR template explains the blocker without an enabled draft form',async({page})=>{
 const {box,writes}=await openHrContracts(page,{templates:[]});await expect(box).toContainText('يلزم اعتماد قالب موظفين');await expect(box.locator('form')).toHaveCount(0);expect(writes).toHaveLength(0);
});
test('employee contract conflict keeps entered terms and never applies an employment decision',async({page})=>{
 const {box,state,writes}=await openHrContracts(page,{conflict:true});const form=await fillHrContract(box);await form.getByRole('button',{name:'حفظ مسودة عقد الموظف',exact:true}).click();await expect(box).toContainText('تغير سجل الموظف');await expect(form.getByLabel('الأجر',{exact:true})).toHaveValue('أجر تجريبي');expect(writes).toHaveLength(1);expect(state.writes).toHaveLength(0);
});
test('lost employee contract authority removes private draft values',async({page})=>{
 const {box}=await openHrContracts(page,{deny:true});const form=await fillHrContract(box);await form.getByRole('button',{name:'حفظ مسودة عقد الموظف',exact:true}).click();await expect(box).toContainText('لم تعد صلاحية عقود الموظف متاحة');await expect(box.locator('form')).toHaveCount(0);await expect(box).not.toContainText('أجر تجريبي');
});
test('late employee contract workspace cannot return after logout',async({page})=>{
 const options={delay:true};const {box}=await openHrContracts(page,options);await expect.poll(()=>Boolean(options.release)).toBe(true);await page.evaluate(()=>window.HydrolandAuth.terminateSession());options.release();await expect(page.locator('[data-employment-contract-box]')).toHaveCount(0);await expect(page.locator('#hl-admin-employees')).toBeHidden();
});


test('administrative owner templates remain visibly drafts with independent Legal review pending',async({page})=>{
 const template={...hrContractTemplate,approval:{basis:'OWNER_COMBINED_INTERNAL_DRAFTS',independentLegalReviewComplete:false,scope:'INTERNAL_HR_DRAFTS_ONLY'}};
 const {box,state}=await openHrContracts(page,{templates:[template]});await expect(box.locator('[data-employment-contract-fields]')).toContainText('المراجعة القانونية المستقلة لم تكتمل');await expect(box.getByRole('option')).toContainText('اعتماد إداري للمسودات فقط');const form=await fillHrContract(box);await form.getByRole('button',{name:'حفظ مسودة عقد الموظف',exact:true}).click();await expect(box.locator('[data-employment-contract-history]')).toContainText('المراجعة القانونية المستقلة لم تكتمل');expect(state.writes).toHaveLength(0);
});
