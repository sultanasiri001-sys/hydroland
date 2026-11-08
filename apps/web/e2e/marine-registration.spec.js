import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher,returnToDiverWorkspace} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
async function setup(page){
 const state={roles:[{role:'ADMIN',status:'ACTIVE'}],reads:0,writes:[],revision:'a'.repeat(64),receipt:null,assets:[{id:'registration-asset',name:'قارب التصحيح',registrationNumber:'OLD-10',status:'DRAFT',documents:[{id:'doc-1',documentType:'NAVIGATION_LICENSE',status:'VERIFIED'}],maintenance:[],readiness:[]}]};
 await page.route(/\/api\/v1\//,r=>json(r,[]));
 await page.route(/\/api\/v1\/me$/,r=>json(r,{id:'registration-owner',status:'ACTIVE',roleAssignments:state.roles,person:{firstName:'Registration',lastName:'Owner'}}));
 await page.route(/\/api\/v1\/me\/diver-profile$/,r=>json(r,{profile:null,equipment:[]}));
 await page.route(/\/api\/v1\/marine-operations\/admin\/assets\/review$/,r=>json(r,state.assets));
 state.read=()=>({id:'registration-asset',name:state.assets[0].name,status:'DRAFT',registrationNumber:state.assets[0].registrationNumber,revision:state.revision,canCorrect:true,verifiedDocumentCount:state.assets[0].documents.filter(d=>d.status==='VERIFIED').length,latestCorrectionReference:state.receipt,notice:'التصحيح يعيد الوثائق للمراجعة ولا يفعّل الأصل.'});
 state.commit=body=>{state.assets[0].registrationNumber=body.registrationNumber;state.assets[0].documents[0].status='PENDING';state.revision='b'.repeat(64);state.receipt='MRC-synthetic-one';return {reference:state.receipt,marineAssetId:'registration-asset',registrationNumber:body.registrationNumber,documentsReturnedForReview:1,activated:false}};
 await page.route(/\/api\/v1\/marine-operations\/admin\/assets\/registration-asset\/registration$/,r=>{if(r.request().method()==='GET'){state.reads++;return json(r,state.read())}const b=r.request().postDataJSON();state.writes.push(b);return json(r,state.commit(b),201)});
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandMarineReadiness));
 await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','registration-token');sessionStorage.setItem('hl-refresh-token','registration-refresh');window.HydrolandAuth.syncAuthUi();document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));await window.HydrolandProfile.load()});
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="admin"]').click();await page.locator('.hl-role-dashboard .hl-portal-nav-item[data-portal-label="الوساطة البحرية"]').click();
 await expect(page.locator('[data-marine-readiness-review="registration-asset"]')).toContainText('OLD-10');await expect(page.locator('[data-marine-readiness-refresh]')).toBeEnabled();
 return state;
}
const editor=page=>page.locator('[data-marine-registration-editor]');
async function open(page){await page.getByRole('button',{name:'تصحيح رقم التسجيل',exact:true}).click();await expect(editor(page)).toBeVisible();}
async function fill(page){await editor(page).getByLabel('رقم التسجيل الصحيح',{exact:true}).fill('NEW-20');await editor(page).getByLabel('سبب تصحيح رقم التسجيل',{exact:true}).fill('تصحيح إدخال اصطناعي بعد مراجعة السجل');await editor(page).getByLabel('راجعت رقم التسجيل والوثائق التي ستعاد للمراجعة',{exact:true}).check();}

test('owner correction saves the existing vessel once and displays the persisted number and review receipt',async({page})=>{
 const s=await setup(page);await open(page);await expect(editor(page).getByRole('button',{name:'حفظ تصحيح رقم التسجيل'})).toBeDisabled();await fill(page);await editor(page).getByRole('button',{name:'حفظ تصحيح رقم التسجيل'}).click();
 await expect(page.locator('[data-marine-registration-status]')).toContainText('MRC-synthetic-one');await expect(page.locator('[data-marine-readiness-review]')).toContainText('NEW-20');await expect(page.locator('[data-marine-readiness-review]')).toContainText('PENDING');expect(s.assets).toHaveLength(1);expect(s.writes).toHaveLength(1);expect(Object.keys(s.writes[0]).sort()).toEqual(['confirmed','expectedRevision','reason','registrationNumber']);expect(s.writes[0].expectedRevision).toBe('a'.repeat(64));
 await open(page);await expect(editor(page)).toContainText('آخر تصحيح محفوظ: MRC-synthetic-one');await expect(editor(page)).toContainText('الرقم الحالي: NEW-20');
});
test('correction requires an explicit acknowledgement and meaningful reason',async({page})=>{
 const s=await setup(page);await open(page);const f=editor(page);await f.getByLabel('رقم التسجيل الصحيح',{exact:true}).fill('NEW-20');await f.getByLabel('سبب تصحيح رقم التسجيل',{exact:true}).fill('قصير');await f.getByLabel('راجعت رقم التسجيل والوثائق التي ستعاد للمراجعة',{exact:true}).check();await expect(f.getByRole('button',{name:'حفظ تصحيح رقم التسجيل'})).toBeDisabled();await f.getByLabel('سبب تصحيح رقم التسجيل',{exact:true}).fill('سبب تصحيح واضح ومحدد للسجل');await f.getByLabel('راجعت رقم التسجيل والوثائق التي ستعاد للمراجعة',{exact:true}).uncheck();await expect(f.getByRole('button',{name:'حفظ تصحيح رقم التسجيل'})).toBeDisabled();expect(s.writes).toHaveLength(0);
});
test('a malformed owner read never creates a confirmable correction form',async({page})=>{
 const s=await setup(page);await page.route(/\/admin\/assets\/registration-asset\/registration$/,r=>json(r,{...s.read(),revision:'invalid'}));await page.getByRole('button',{name:'تصحيح رقم التسجيل',exact:true}).click();await expect(page.locator('[data-marine-registration-status]')).toContainText('تعذر قراءة نسخة صالحة');await expect(editor(page)).toHaveCount(0);expect(s.writes).toHaveLength(0);
});
test('a general administrator without owner authority cannot open the correction editor',async({page})=>{
 const s=await setup(page);await page.route(/\/admin\/assets\/registration-asset\/registration$/,r=>json(r,{message:'Owner required'},403));await page.getByRole('button',{name:'تصحيح رقم التسجيل',exact:true}).click();await expect(page.locator('#hl-marine-readiness')).toBeHidden();await expect(editor(page)).toHaveCount(0);expect(s.writes).toHaveLength(0);
});
test('a late owner read cannot repopulate a departed workspace',async({page})=>{
 const s=await setup(page);let release;await page.route(/\/admin\/assets\/registration-asset\/registration$/,async r=>{await new Promise(resolve=>{release=resolve});return json(r,s.read())});await page.getByRole('button',{name:'تصحيح رقم التسجيل',exact:true}).click();await expect.poll(()=>typeof release).toBe('function');await returnToDiverWorkspace(page);release();await expect(page.locator('#hl-marine-readiness')).toBeHidden();await expect(editor(page)).toHaveCount(0);expect(s.writes).toHaveLength(0);
});
test('revoked role is rechecked before posting a filled correction form',async({page})=>{
 const s=await setup(page);await open(page);await fill(page);let release;await page.route(/\/api\/v1\/me$/,async r=>{await new Promise(resolve=>{release=resolve});return json(r,{id:'registration-owner',status:'ACTIVE',roleAssignments:[],person:{firstName:'Owner'}})});await editor(page).getByRole('button',{name:'حفظ تصحيح رقم التسجيل'}).click();await expect.poll(()=>typeof release).toBe('function');expect(s.writes).toHaveLength(0);release();await expect(page.locator('#hl-marine-readiness')).toBeHidden();expect(s.writes).toHaveLength(0);
});
test('an uncertain save requires a fresh read and never automatically replays the correction',async({page})=>{
 const s=await setup(page);await open(page);await fill(page);await page.route(/\/admin\/assets\/registration-asset\/registration$/,r=>{if(r.request().method()==='GET')return json(r,s.read());const b=r.request().postDataJSON();s.writes.push(b);s.commit(b);return json(r,{message:'Response unavailable after commit'},503)});await editor(page).getByRole('button',{name:'حفظ تصحيح رقم التسجيل'}).click();await expect(editor(page).getByRole('alert')).toContainText('أعد القراءة');await expect(editor(page).getByRole('button',{name:'حفظ تصحيح رقم التسجيل'})).toBeDisabled();expect(s.writes).toHaveLength(1);await editor(page).getByRole('button',{name:'إعادة قراءة رقم التسجيل'}).click();await expect(editor(page)).toContainText('الرقم الحالي: NEW-20');await expect(editor(page)).toContainText('MRC-synthetic-one');await expect(editor(page).getByLabel('رقم التسجيل الصحيح',{exact:true})).toHaveValue('');expect(s.writes).toHaveLength(1);
});
test('a changed server revision locks the old confirmation until a new read',async({page})=>{
 const s=await setup(page);await open(page);await fill(page);await page.route(/\/admin\/assets\/registration-asset\/registration$/,r=>{if(r.request().method()==='GET')return json(r,s.read());s.writes.push(r.request().postDataJSON());s.revision='c'.repeat(64);return json(r,{message:'Changed registration revision'},409)});await editor(page).getByRole('button',{name:'حفظ تصحيح رقم التسجيل'}).click();await expect(editor(page).getByRole('button',{name:'حفظ تصحيح رقم التسجيل'})).toBeDisabled();await expect(editor(page).getByRole('button',{name:'إعادة قراءة رقم التسجيل'})).toBeVisible();expect(s.writes).toHaveLength(1);
});
test('duplicate save clicks are disabled while the correction is pending',async({page})=>{
 const s=await setup(page);await open(page);await fill(page);let release;await page.route(/\/admin\/assets\/registration-asset\/registration$/,async r=>{const b=r.request().postDataJSON();s.writes.push(b);await new Promise(resolve=>{release=resolve});return json(r,s.commit(b),201)});const save=editor(page).getByRole('button',{name:'حفظ تصحيح رقم التسجيل'});await save.click();await expect.poll(()=>typeof release).toBe('function');await expect(save).toBeDisabled();expect(s.writes).toHaveLength(1);release();await expect(page.locator('[data-marine-registration-status]')).toContainText('MRC-synthetic-one');expect(s.writes).toHaveLength(1);
});
test('active vessels do not expose the draft registration correction action',async({page})=>{
 const s=await setup(page);s.assets[0].status='ACTIVE';await page.locator('[data-marine-readiness-refresh]').click();await expect(page.locator('[data-marine-readiness-review]')).toContainText('ACTIVE');await expect(page.getByRole('button',{name:'تصحيح رقم التسجيل',exact:true})).toHaveCount(0);expect(s.writes).toHaveLength(0);
});
