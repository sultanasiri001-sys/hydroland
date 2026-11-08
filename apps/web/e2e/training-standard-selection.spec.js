import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

// A browser fixture exercising the real training UI, not an agency certification or live API.
const source=fileURLToPath(new URL('../src/hydroland-training.js',import.meta.url));
async function setup(page,{empty=false,conflict=false}={}){
  await page.route('**/isolated-training-standards',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"></head><body><section class="training"></section><div class="hl-role-dashboard" data-role="instructor"></div></body></html>'}));
  await page.goto('/isolated-training-standards');
  await page.evaluate(({empty,conflict})=>{
    const fixture=agency=>({id:'profile-'+agency,profile:{agencyCode:agency,programCode:'TEST_PROGRAM',level:'TEST_LEVEL',edition:'SYNTHETIC_1',requirements:{minimumAge:agency==='TEST_PADI'?10:15,minimumCompletedSessions:2,minimumOpenWaterDives:2,minimumOpenWaterMinutes:20,requiredSkillCodes:['TEST_MASK'],requiredFormCodes:['TEST_FORM'],supervision:[{environment:'OPEN_WATER',minimumAge:10,maximumAge:120,studentsPerInstructor:2,maximumDepthMetres:8}]}}});
    window.testState={role:'instructor',binding:null,posts:[],empty,conflict};
    window.HydrolandPortalAccess={getCurrentRole:()=>window.testState.role,authorizeRole:async()=>window.testState.role==='instructor'};
    window.HydrolandAuth={isAuthenticated:()=>true,getSessionVersion:()=>1,authorizedFetch:async(path,options={})=>{
      const state=window.testState;let value;
      if(path.endsWith('/assignments'))value=[{enrollmentId:'enrollment',courseCode:'TEST_PROGRAM',status:'PENDING',student:{displayName:'متدرب اصطناعي'},record:null}];
      else if(path.endsWith('/plan'))value={enrollmentId:'enrollment',courseCode:'TEST_PROGRAM',enrollmentStatus:'PENDING',record:null,updatedAt:'2026-11-08T08:00:00Z',stages:[],canEdit:false,canComplete:false,completionReasons:['برنامج المنظمة يحتاج ربطًا معتمدًا.']};
      else if(path.endsWith('/standard-options'))value={enrollmentId:'enrollment',updatedAt:'2026-11-08T08:00:00Z',binding:state.binding,profiles:state.empty?[]:['TEST_PADI','TEST_NAUI','TEST_SSI','TEST_OTHER'].map(fixture),canSelect:!state.binding};
      else if(path.endsWith('/standard')&&options.method==='POST'){
        const body=JSON.parse(options.body);state.posts.push(body);
        if(state.conflict)return {ok:false,json:async()=>({message:'تغير الإصدار؛ حدّث الخطة.'})};
        const selected=['TEST_PADI','TEST_NAUI','TEST_SSI','TEST_OTHER'].map(fixture).find(row=>row.id===body.profileId);state.binding={...selected.profile,profileId:selected.id};value={enrollmentId:'enrollment',binding:state.binding};
      }else value=[];
      return {ok:true,json:async()=>value};
    }};
  },{empty,conflict});
  await page.addScriptTag({path:source});
  await page.getByRole('button',{name:'خطة التدريب وإتمام الدورة',exact:true}).click();
  await expect(page.locator('[data-training-plan-view]')).toContainText('TEST_PROGRAM');
}
async function choose(page,agency='TEST_PADI'){
  const form=page.locator('[data-standard-select]');await form.getByLabel('المنظمة',{exact:true}).selectOption(agency);
  await form.getByLabel('البرنامج والمستوى والإصدار',{exact:true}).selectOption('profile-'+agency);return form;
}
test('agency selection filters programmes and updates their requirements without writing',async({page})=>{
  await setup(page);const form=await choose(page);await expect(form.locator('[data-standard-requirements]')).toContainText('الحد الأدنى للعمر: 10');
  await form.getByLabel('المنظمة',{exact:true}).selectOption('TEST_NAUI');await expect(form.getByLabel('البرنامج والمستوى والإصدار',{exact:true})).toHaveValue('');
  await expect(form.getByLabel('البرنامج والمستوى والإصدار',{exact:true}).locator('option')).toHaveCount(2);
  await form.getByLabel('البرنامج والمستوى والإصدار',{exact:true}).selectOption('profile-TEST_NAUI');await expect(form.locator('[data-standard-requirements]')).toContainText('الحد الأدنى للعمر: 15');
  expect(await page.evaluate(()=>window.testState.posts.length)).toBe(0);
});
test('explicit selection sends only the chosen profile identity and context',async({page})=>{
  await setup(page);const form=await choose(page,'TEST_SSI');await form.getByLabel('بيئة التدريب',{exact:true}).selectOption('OPEN_WATER');await form.getByLabel('أقصى عمق مخطط بالمتر',{exact:true}).fill('8');await form.getByLabel('سبب اختيار الإصدار',{exact:true}).fill('اختيار اصطناعي لا يعتمد معايير فعلية');await form.getByRole('checkbox').check();await form.getByRole('button',{name:'ربط معايير المنظمة بالدورة',exact:true}).click();
  await expect(page.locator('[data-standard-select]')).toHaveCount(0);await expect(page.locator('.hl-training')).toContainText('TEST_SSI');const posts=await page.evaluate(()=>window.testState.posts);expect(posts).toHaveLength(1);expect(posts[0].profileId).toBe('profile-TEST_SSI');expect(posts[0]).not.toHaveProperty('requirements');expect(posts[0]).not.toHaveProperty('approval');
});
test('unavailable standards never invent an agency fallback',async({page})=>{await setup(page,{empty:true});await expect(page.locator('[data-standard-select]')).toHaveCount(0);await expect(page.locator('.hl-training')).toContainText('لا يبدأ التدريب قبل وجود إصدار معتمد');});
test('server conflict preserves the uncommitted selection',async({page})=>{
  await setup(page,{conflict:true});const form=await choose(page);await form.getByLabel('بيئة التدريب',{exact:true}).selectOption('OPEN_WATER');await form.getByLabel('أقصى عمق مخطط بالمتر',{exact:true}).fill('8');await form.getByLabel('سبب اختيار الإصدار',{exact:true}).fill('اختيار اصطناعي لا يعتمد معايير فعلية');await form.getByRole('checkbox').check();await form.getByRole('button',{name:'ربط معايير المنظمة بالدورة',exact:true}).click();await expect(form.locator('[data-plan-message]')).toContainText('تغير الإصدار');await expect(form.getByLabel('البرنامج والمستوى والإصدار',{exact:true})).toHaveValue('profile-TEST_PADI');
});
test('losing the instructor role clears the selection without a write',async({page})=>{await setup(page);await choose(page);await page.evaluate(()=>{window.testState.role='student';document.dispatchEvent(new CustomEvent('hydroland:role-changed'))});await expect(page.locator('[data-standard-select]')).toHaveCount(0);expect(await page.evaluate(()=>window.testState.posts.length)).toBe(0);});
