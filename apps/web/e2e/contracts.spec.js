import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';

async function seed(page,role='instructor',status='DRAFT',options={}){
  const accountId={instructor:'professional',center:'center',admin:'owner'}[role];
  const state={role,status,version:3,signatures:[],seal:null,saves:[],signs:[],decisions:[],issued:0,blocked:false,synced:0,sourceChanged:Boolean(options.sourceChanged)};
  const fields=[{section:'center',key:'legalName',label:'الاسم القانوني للمركز',max:160},{section:'professional',key:'fullName',label:'اسم المحترف',max:160},{section:'terms',key:'services',label:'الخدمات وحدود التأهيل والتكليف',max:2000}];
  let values={center:{legalName:'مركز اختبار الغوص'},professional:{fullName:options.professionalName||'محترف تجريبي'},terms:{services:'تنظيم وإرشاد رحلة ضمن التأهيل'}};
  const result=()=>({id:'contract-1',organizationId:'center-org',referenceNumber:'HYD-LEG-2026-000001',version:state.version,contentHash:'sha256:'+state.version,status:state.status,values:structuredClone(values),sources:{automatic:true,changed:state.sourceChanged,missing:[]},fields,clauses:['يوقع الطرفان الإصدار نفسه ثم يرفع لاعتماد هيدرولاند.'],branding:{brandVersion:1,name:'مركز اختبار الغوص',logoAssetId:null},participants:{centerAccountId:'center',professionalAccountId:'professional',centerName:'ممثل المركز',professionalName:'محترف تجريبي'},signatureName:role==='instructor'?'محترف تجريبي':'ممثل المركز',signatures:state.signatures,seal:state.seal,capabilities:{manageCenterProfile:role==='center',manageMemberProfile:role==='instructor',editCenter:false,editProfessional:false,editTerms:['center','admin'].includes(role)&&state.status==='DRAFT',sync:state.status==='DRAFT',review:role==='admin'&&['DRAFT','AWAITING_SIGNATURES','AWAITING_PLATFORM_APPROVAL'].includes(state.status),issue:role==='center'&&state.status==='DRAFT',sign:['center','instructor'].includes(role)&&state.status==='AWAITING_SIGNATURES'&&!state.signatures.some(s=>s.accountId===accountId),approve:role==='admin'&&state.status==='AWAITING_PLATFORM_APPROVAL',return:['AWAITING_SIGNATURES','AWAITING_PLATFORM_APPROVAL'].includes(state.status)},history:[]});
  const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  const profile={id:accountId,email:accountId+'@example.invalid',status:'ACTIVE',emailVerifiedAt:'2026-10-24T00:00:00Z',roleAssignments:[{id:'role',role:{instructor:'INSTRUCTOR',center:'DIVE_CENTER',admin:'ADMIN'}[role],status:'ACTIVE'}],person:{firstName:role==='instructor'?'محترف':'ممثل',lastName:'تجريبي',professional:null}};
  await page.route(/\/api\/v1\/me$/,route=>json(route,profile));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
  await page.route(/\/api\/v1\/credentials$/,route=>json(route,[]));
  await page.route(/\/api\/v1\/organizations\/mine$/,route=>json(route,[]));
  await page.route(/\/api\/v1\/contracts\/cooperation(?:\/.*|\?.*)?$/,async route=>{
    const request=route.request(),path=new URL(request.url()).pathname,body=request.postDataJSON();
    if(request.headers().authorization!=='Bearer contract-test')return json(route,{message:'Unauthorized'},401);
    if(state.blocked)return json(route,{message:'تم سحب صلاحية العقد'},403);
    if(path.endsWith('/workspace'))return json(route,{owner:role==='admin',centers:role==='center'?[{id:'center-org',displayName:'مركز اختبار الغوص'}]:[]});
    if(path.endsWith('/sync')){state.synced++;if(state.sourceChanged){state.version++;values.professional.fullName='محترف محدّث من العضوية';state.sourceChanged=false}return json(route,result());}
    if(path.endsWith('/fields')){state.saves.push(body);values={...values,...body.values};state.version++;return json(route,result());}
    if(path.endsWith('/issue')){state.issued++;state.status='AWAITING_SIGNATURES';return json(route,result());}
    if(path.endsWith('/sign')){state.signs.push(body);state.signatures.push({role:role==='instructor'?'PROFESSIONAL':'CENTER',accountId,name:body.signatureName,at:'2026-10-24T00:00:00Z'});if(state.signatures.length===2)state.status='AWAITING_PLATFORM_APPROVAL';return json(route,result());}
    if(path.endsWith('/decision')){state.decisions.push(body);if(body.action==='RETURN'){state.version++;state.status='DRAFT';state.signatures=[];state.seal=null}else if(body.action==='COMMENT'){return json(route,result())}else if(body.action==='REJECT'){state.status='REJECTED';state.seal=null}else{state.status='APPROVED';state.seal={decisionId:'fixture-decision',accountId:'owner',at:'2026-10-24T00:00:00Z',contentHash:'sha256:'+state.version,kind:'INTERNAL_PLATFORM_APPROVAL'}}return json(route,result());}
    if(path.endsWith('/contract-1'))return json(route,result());
    return json(route,{items:[result()],nextCursor:null});
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandContracts&&window.HydrolandProfile));
  await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','contract-test');sessionStorage.setItem('hl-refresh-token','contract-refresh');window.HydrolandAuth.syncAuthUi();document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));await window.HydrolandProfile.load()});
  await openWorkspaceSwitcher(page);await page.locator(`#role-dialog [data-role="${role}"]`).click();
  await expect(page.locator(`.hl-role-dashboard[data-role="${role}"]`)).toBeVisible();
  const open=page.locator('.hl-role-dashboard [data-action-label="العقود والتوقيع الإلكتروني"]');
  await expect(open).toBeEnabled();await open.click();
  const panel=page.locator('#hl-contracts');await expect(panel).toBeVisible();await panel.locator('[data-contract-open]').click();await expect(panel.locator('[data-contract-preview]')).toBeVisible();
  return {state,panel};
}

test('professional reviews automatic membership identity without retyping and source text is escaped',async({page})=>{
  const name='<img src=x onerror=alert(1)>';
  const {state,panel}=await seed(page,'instructor','DRAFT',{professionalName:name});
  await expect(panel.locator('[name="center.legalName"]')).toBeDisabled();
  await expect(panel.locator('[name="professional.fullName"]')).toBeDisabled();
  await expect(panel.locator('[name="terms.services"]')).toBeDisabled();
  await expect(panel.locator('[data-contract-save]')).toHaveCount(0);
  await expect(panel.locator('[data-contract-preview]')).toContainText(name);
  await expect(panel.locator('[data-contract-preview] img[onerror]')).toHaveCount(0);
  await expect(panel.locator('[data-contract-preview] h3')).toHaveText('عقد تعاون محترف غوص');
  await expect(panel.locator('.hl-contract-seal-position')).toContainText('موضع ختم هيدرولاند');
  expect(state.saves).toHaveLength(0);
});
test('changed draft sources refresh automatically and save a new revision before review',async({page})=>{
  const {state,panel}=await seed(page,'instructor','DRAFT',{sourceChanged:true});
  await expect(panel.locator('[data-contract-preview]')).toContainText('محترف محدّث من العضوية');
  await expect(panel.locator('[data-contract-preview]')).toContainText('الإصدار 4');
  expect(state.synced).toBe(1);expect(state.saves).toHaveLength(0);
});
test('center saves contract terms before issuing signatures and cannot fill professional details',async({page})=>{
  const {state,panel}=await seed(page,'center');
  await expect(panel.locator('[name="professional.fullName"]')).toBeDisabled();
  await panel.locator('[name="terms.services"]').fill('إرشاد رحلة تجريبية');
  await expect(panel.locator('[data-contract-issue]')).toBeDisabled();
  await panel.locator('[data-contract-save]').click();
  await expect(panel.locator('[data-contract-issue]')).toBeEnabled();
  await panel.locator('[data-contract-issue]').click();
  await expect.poll(()=>state.issued).toBe(1);
  await expect(panel.locator('[data-contract-preview]')).toContainText('بانتظار توقيع الطرفين');
  await expect(panel.locator('.hl-contract-seal')).toHaveCount(0);
});
test('party reviews consent then signs exact version without adding platform seal',async({page})=>{
  const {state,panel}=await seed(page,'instructor','AWAITING_SIGNATURES');
  await panel.locator('[data-contract-sign] button').click();expect(state.signs).toHaveLength(0);
  await panel.locator('[name="consent"]').check();await panel.locator('[data-contract-sign] button').click();
  await expect.poll(()=>state.signs.length).toBe(1);
  expect(state.signs[0]).toEqual({expectedVersion:3,expectedContentHash:'sha256:3',signatureName:'محترف تجريبي',consent:true});
  await expect(panel.locator('[data-contract-sign]')).toHaveCount(0);
  await expect(panel.locator('.hl-contract-seal')).toHaveCount(0);
});
test('platform owner gets seal only through explicit reviewed approval',async({page})=>{
  const {state,panel}=await seed(page,'admin','AWAITING_PLATFORM_APPROVAL');
  await expect(panel.locator('.hl-contract-seal')).toHaveCount(0);
  await expect(panel.locator('[data-contract-sign]')).toHaveCount(0);
  await panel.locator('[name="reason"]').fill('اعتماد النسخة التجريبية بعد المراجعة');
  await panel.locator('[name="reviewed"]').check();
  await panel.getByRole('button',{name:'اعتماد وإضافة ختم هيدرولاند'}).click();
  await expect.poll(()=>state.decisions.length).toBe(1);
  expect(state.decisions[0].action).toBe('APPROVE');
  await expect(panel.locator('.hl-contract-seal')).toContainText('معتمد');
  await expect(panel.locator('[data-contract-decision]')).toHaveCount(0);
});
test('return for corrections removes signatures and advances displayed version',async({page})=>{
  const {state,panel}=await seed(page,'instructor','AWAITING_SIGNATURES');
  await panel.locator('[name="reason"]').fill('إعادة للمركز لتصحيح النطاق');await panel.locator('[name="reviewed"]').check();
  await panel.getByRole('button',{name:'إعادة للتعديل',exact:true}).click();
  await expect.poll(()=>state.decisions.length).toBe(1);
  await expect(panel.locator('[name="professional.fullName"]')).toBeDisabled();
  await expect(panel.locator('[data-contract-preview]')).toContainText('الإصدار 4');
});
test('mobile contract fields and preview stay within viewport',async({page})=>{
  await page.setViewportSize({width:390,height:844});const {panel}=await seed(page);
  await expect(panel.locator('[data-contract-preview]')).toBeVisible();
  await page.evaluate(async()=>{await document.fonts.load('16px HydrolandContract');await document.fonts.load('700 16px HydrolandContract');await document.fonts.ready;});
  expect(await page.evaluate(()=>document.fonts.check('16px HydrolandContract'))).toBe(true);
  expect(await panel.locator('[data-contract-preview]').evaluate(el=>getComputedStyle(el).fontFamily)).toContain('HydrolandContract');
  expect(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  await page.screenshot({path:test.info().outputPath('cooperation-contract-mobile.png'),fullPage:true});
});
test('logout and late contract response cannot restore private data',async({page})=>{
  const {panel}=await seed(page);
  let release;const pending=new Promise(r=>release=r);
  await page.route(/\/contracts\/cooperation\/contract-1$/,async route=>{await pending;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({values:{center:{legalName:'بيانات متأخرة'}}})})});
  await panel.locator('[data-contract-open]').click();
  await page.evaluate(()=>{sessionStorage.removeItem('hl-access-token');sessionStorage.removeItem('hl-refresh-token');window.HydrolandAuth.syncAuthUi();document.dispatchEvent(new CustomEvent('hydroland:auth-changed'))});
  release();await expect(panel).toBeHidden();await expect(panel.locator('[data-contract-detail]')).toBeEmpty();
});
test('contract access revocation clears previously displayed private fields',async({page})=>{
  const {state,panel}=await seed(page);state.blocked=true;
  await panel.locator('[data-contract-sync]').click();
  await expect(panel).toBeHidden();await expect(panel.locator('[data-contract-detail]')).toBeEmpty();
});
test('professional portal contract action opens connected workspace',async({page})=>{
  await seed(page);await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="instructor"]').click();
  const button=page.locator('.hl-role-dashboard [data-action-label="العقود والتوقيع الإلكتروني"]');
  await expect(button).toBeEnabled();await button.click();await expect(page.locator('#hl-contracts')).toBeVisible();
  await page.screenshot({path:test.info().outputPath('cooperation-contract-desktop.png')});
});

test('platform owner can add a note without issuing an approval stamp',async({page})=>{
  const {state,panel}=await seed(page,'admin','AWAITING_PLATFORM_APPROVAL');
  await panel.locator('[name="reason"]').fill('ملاحظة للمركز: مراجعة موعد السداد');await panel.locator('[name="reviewed"]').check();
  await panel.getByRole('button',{name:'إضافة ملاحظة',exact:true}).click();
  await expect.poll(()=>state.decisions.length).toBe(1);expect(state.decisions[0].action).toBe('COMMENT');expect(state.version).toBe(3);
  await expect(panel.locator('.hl-contract-seal')).toHaveCount(0);
});
test('platform rejection closes the contract without a seal or editable fields',async({page})=>{
  const {state,panel}=await seed(page,'admin','DRAFT');
  await panel.locator('[name="reason"]').fill('رفض العقد لعدم استكمال الشروط');await panel.locator('[name="reviewed"]').check();
  await panel.getByRole('button',{name:'رفض العقد',exact:true}).click();
  await expect.poll(()=>state.status).toBe('REJECTED');
  await expect(panel.locator('[data-contract-decision]')).toHaveCount(0);await expect(panel.locator('[data-contract-save]')).toHaveCount(0);
  await expect(panel.locator('.hl-contract-seal')).toHaveCount(0);await expect(panel.locator('[data-contract-preview]')).toContainText('مرفوض');
});

test('membership source references are saved once in the profile rather than contract fields',async({page})=>{
  const {state,panel}=await seed(page);
  const profile=await page.evaluate(()=>window.HydrolandProfileData.profile);
  profile.person.professional={nationalLicenseCredentialId:'own-national',qualificationCredentialId:'own-qualification',eligibilityEvidenceReference:'مرجع محفوظ في العضوية'};
  const credentials=[{id:'own-national',issuer:'جهة ترخيص',title:'رخصة غوص',verificationStatus:'VERIFIED',documents:[]},{id:'own-qualification',issuer:'منظمة تدريب',title:'رتبة محترف',verificationStatus:'VERIFIED',documents:[]}];
  let saved;
  await page.route(/\/api\/v1\/credentials$/,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(credentials)}));
  await page.route(/\/api\/v1\/me$/,route=>{if(route.request().method()==='PATCH'){saved=route.request().postDataJSON();Object.assign(profile.person.professional,saved)}return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(profile)})});
  await page.evaluate(()=>window.HydrolandProfile.load());
  await panel.locator('[data-contract-member-profile]').click();
  const form=page.locator('#hl-profile-editor form');
  await expect(form.locator('[name="nationalLicenseCredentialId"]')).toHaveValue('own-national');
  await expect(form.locator('[name="qualificationCredentialId"]')).toHaveValue('own-qualification');
  await form.locator('[name="eligibilityEvidenceReference"]').fill('مرجع أهلية محدّث من العضوية');
  await form.locator('[type="submit"]').click();
  await expect.poll(()=>saved?.eligibilityEvidenceReference).toBe('مرجع أهلية محدّث من العضوية');
  expect(saved.nationalLicenseCredentialId).toBe('own-national');expect(state.saves).toHaveLength(0);
});
