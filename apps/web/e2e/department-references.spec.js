import { test, expect } from '@playwright/test';
import { openWorkspaceSwitcher } from './portal-test-helpers.js';
const json = (route, value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
const codes = ['HR','TRAINING','MARINE_OPERATIONS','INVENTORY_LOGISTICS','FINANCE','SAFETY_COMPLIANCE_RISK','CUSTOMER_EXPERIENCE','MARKETING_GROWTH','TECHNOLOGY_CYBERSECURITY','FACILITIES_ASSETS_MAINTENANCE','ADMIN_AFFAIRS_RECORDS','EXECUTIVE_GOVERNANCE','RND_MARKET_INTELLIGENCE','LEGAL_CONTRACTS_INSURANCE'];
const counts = { HR:25, TRAINING:16, MARINE_OPERATIONS:15, INVENTORY_LOGISTICS:15, FINANCE:14, SAFETY_COMPLIANCE_RISK:13, CUSTOMER_EXPERIENCE:10, MARKETING_GROWTH:12, TECHNOLOGY_CYBERSECURITY:15, FACILITIES_ASSETS_MAINTENANCE:11, ADMIN_AFFAIRS_RECORDS:11, EXECUTIVE_GOVERNANCE:12, RND_MARKET_INTELLIGENCE:10, LEGAL_CONTRACTS_INSURANCE:13 };
const gateIds = ['REFERENCE_APPLICABILITY','DOCUMENT_COVERAGE','SCOPED_AUTHORIZATION','PERSISTED_EXECUTION','VERIFICATION_AND_EXCEPTIONS','REVISION_PRINT_RETENTION','END_TO_END_ACCEPTANCE'];
const policy = 'DEPARTMENT_CLOSURE_ASSESSMENT_V1', organizationId = '11111111-1111-4111-8111-111111111111', recordId = '22222222-2222-4222-8222-222222222222', documentId = '33333333-3333-4333-8333-333333333333';
const operatingCycle = code => ({ departmentClosed:false, closureDecisionReference:null,closureRecord:null,closureAssessment:'NOT_ASSESSED', sharedEngineBoundaryAr:'التنفيذ والتحقق والإقفال أعمال في المجال المختص', cycles:[{titleAr:'دورة تشغيل '+code,stepsAr:['طلب','مراجعة','اعتماد','تنفيذ','تحقق','إقفال وأرشفة']}],closureEvidenceAr:['دليل تنفيذ مرتبط بالسجل'],templates:Array.from({length:counts[code]},(_,i)=>({code:i===0&&code==='TRAINING'?'TRN-TRAINING-PLAN':i===0&&code==='FINANCE'?'FIN-PROVIDER-RECONCILIATION':code+'-SOURCE-'+i,titleAr:i===0&&code==='TRAINING'?'خطة التدريب':i===0&&code==='FINANCE'?'مطابقة مزود الدفع':'نموذج مصدري للاختبار '+i,availability:code==='HR'&&i===0?'MULTIPLE_ACTIVE_VERSIONS':'NO_ACTIVE_VERSION_RECORDED',recordedVersions:[]})),documentCounts:[{status:'ARCHIVED',count:5}],closureGates:gateIds.map(id=>({id,labelAr:'شرط '+id,verificationStatus:'NOT_ASSESSED'})) });
const assessment = () => ({schemaVersion:1,policy,organizationId,department:'HR',specificationVersion:'2026-10-26.v2',expectedRevision:0,current:null,history:[],canRecord:true,departmentClosed:false,closureDecisionReference:null,notice:'تقييم نواقص فقط؛ لا يثبت قبولًا أو اعتمادًا أو إقفالًا.'});
const snapshot = () => ({
  catalogVersion: 'isolated-v2', referenceOnly: true, canActivate: false, completeDocumentInventoryVerified:false, canonicalSourceTemplateCount:192, canonicalDepartmentCount: 14, recordedDepartmentCount: 14, effectivePolicyCount: 1, policiesWithRecordedReferences: 0, observedAt: new Date().toISOString(),
  departments: codes.map(code => ({ code, nameAr: code === 'HR' ? 'الموارد البشرية' : code === 'FINANCE' ? 'المالية' : code, unitRecorded: true, unitActive: true, authorityIds: ['GOV-1'], legalReferenceIds: ['LEG-1'], marineArchiveIds: code === 'HR' ? ['MAR-ARCH-1'] : [], hrSourceIds: code === 'HR' ? ['HR-1'] : [],isoReferenceIds:['ISO-9001'],operatingCycle:operatingCycle(code), policies: [{ category: 'FIXTURE', ruleKey: 'FIXTURE-CONTROL', labelAr: 'ضابط مشترك للاختبار', state: 'ENABLED', referencesRecorded: false }], canActivate: false })),
  isoReferences:[{id:'ISO-9001',designation:'ISO 9001:2026',titleAr:'إدارة الجودة',snapshotDate:'2026-10-24',scopeAr:'قرار الانتقال معلق',url:'https://www.iso.org/standard/9001'}],
  authorities: [{ id: 'GOV-1', nameAr: 'جهة اختبار معزولة', recordedStatus: 'قيد الاستكمال', snapshotDate: '2026-09-17', scope: 'نطاق مرجعي تجريبي', routingStatus: 'PROPOSED_OWNER_ROUTING', sourceLibraryFileId: 'libfile_fixtureauthority' }],
  legalReferences: [{ id: 'LEG-1', titleAr: 'مرجع قانوني للاختبار', recordedStatus: 'Active', snapshotDate: '2026-09-16', url: 'https://example.invalid/official-reference', sourceLibraryFileId: 'libfile_fixturelegal' }],
  marineArchives: [{ id: 'MAR-ARCH-1', titleAr: 'ملف غوص محفوظ للاختبار', recordedStatus: 'الإصدار وقابلية الانطباق قيد التحقق', snapshotDate: '2026-10-24', sourceLibraryFileId: 'libfile_fixturemarine' }],
  hrSources: [{ id: 'HR-1', titleAr: 'مصدر موارد بشرية للاختبار', snapshotDate: '2026-10-23', url: 'https://example.invalid/hr-source', sourceLibraryFileId: 'libfile_fixturehr' }],
  hrControlCandidates: [{ ruleKey: 'HR-FIXTURE-001', labelAr: 'ضابط مرشح معزول', sourceIds: ['HR-1'], clauseReferences: ['مادة تجريبية'], evidenceSpecification: ['مواصفة دليل تجريبية وليست دليلًا فعليًا'], limitations: 'المراجعة القانونية معلقة', enabled: false, regulatoryRequirementId: null, legalApprovalReference: null }],
});
async function setup(page) {
  const state = { admin: true, reads: 0, writes: 0, data: snapshot(), delay: false, release: null, fail: false, authorizationGate: null,
    assessment:assessment(),assessmentReads:0,previews:0,assessmentWrites:0,owner:true,assessmentDelay:false,assessmentRelease:null,previewDelay:false,previewRelease:null,saveDelay:false,saveRelease:null,abortSave:false,saveStatus:200,previewTransform:null,requests:[] };
  await page.route('**/api/v1/**', r => json(r, []));
  await page.route('**/auth/google/config', r => json(r, { enabled: false }));
  await page.route(/\/api\/v1\/me$/, async r => { if (state.authorizationGate) await state.authorizationGate; return json(r, { id: 'reference-browser-admin', status: 'ACTIVE', person: { firstName: 'إدارة', lastName: 'اختبار' }, roleAssignments: state.admin ? [{ role: 'ADMIN', status: 'ACTIVE' }] : [] }); });
  await page.route(/\/admin\/employees(?:\?.*)?$/, r => json(r, { initialized: true, departments: [], profiles: [], items: [], nextCursor: null, email: { enabled: false }, google: { enabled: false } }));
  await page.route(/\/admin\/employees\/compliance-controls(?:\?.*)?$/, r => json(r, { observedAt: new Date().toISOString(), controls: [], items: [], nextCursor: null }));
  await page.route(/\/admin\/department-references(?:\?.*)?$/, async r => {
    if (r.request().method() !== 'GET') state.writes++;
    state.reads++; const response = structuredClone(state.data);
    if (state.delay) await new Promise(resolve => { state.release = resolve; });
    return json(r, state.fail ? { message: 'تعذر تحميل المراجع مؤقتًا' } : response, state.fail ? 503 : 200);
  });
  await page.route(/\/admin\/department-references\/[^/]+\/assessment(?:\/preview)?$/, async r => {
    const request=r.request(),preview=request.url().endsWith('/preview');
    if(request.method()==='GET'){
      state.assessmentReads++;const response=structuredClone(state.assessment);
      if(state.assessmentDelay)await new Promise(resolve=>{state.assessmentRelease=resolve;});
      return json(r,state.owner?response:{message:'owner only'},state.owner?200:403);
    }
    const body=request.postDataJSON();state.requests.push(body);
    if(preview){
      state.previews++;if(state.previewDelay)await new Promise(resolve=>{state.previewRelease=resolve;});
      const response={schemaVersion:1,policy,organizationId,department:'HR',...body,gates:body.gates.map(g=>({...g,evidence:g.evidence.map(e=>({...e,contentHash:'canonical-server-source-hash',referenceNumber:'HYD-HR-EVIDENCE'}))})),expectedPlanHash:'a'.repeat(64),notice:state.assessment.notice};
      return json(r,state.previewTransform?state.previewTransform(response):response);
    }
    state.assessmentWrites++;if(state.saveDelay)await new Promise(resolve=>{state.saveRelease=resolve;});
    if(state.abortSave)return r.abort('failed');
    if(state.saveStatus!==200)return json(r,{message:'changed'},state.saveStatus);
    const gates=body.gates.map(g=>({...g,evidence:g.evidence.map(e=>({...e,contentHash:'canonical-server-source-hash',referenceNumber:'HYD-HR-EVIDENCE'}))}));
    const current={id:recordId,revision:body.expectedRevision+1,recordedAt:new Date().toISOString(),state:gates.some(g=>g.verificationStatus==='BLOCKED')?'BLOCKED':'NOT_ASSESSED',gates,assessmentReference:'DCA-HR-'+(body.expectedRevision+1)+'-'+recordId,assessmentCurrent:true};
    state.assessment={...state.assessment,expectedRevision:current.revision,current,history:[{...current,gates:undefined},...state.assessment.history]};
    return json(r,state.assessment);
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.HydrolandDepartmentReferences && window.HydrolandProfile));
  await page.evaluate(async () => { window.HydrolandAuth.acceptSession({ accessToken: 'reference-fixture', refreshToken: 'reference-fixture-refresh' }, window.HydrolandAuth.beginAuthAttempt()); await window.HydrolandProfile.load(); });
  await openWorkspaceSwitcher(page); await page.locator('#role-dialog [data-role="admin"]').click(); await page.locator('[data-portal-label="إدارة الموظفين"]').click();
  await expect(page.locator('[data-staff-feedback]')).toContainText('تم تحميل'); expect(state.reads).toBe(0);
  return state;
}
const box = page => page.locator('[data-department-references]');
async function open(page) { await box(page).locator('summary').click(); await expect(page.locator('[data-reference-status]')).toContainText('وقت القراءة'); }

async function sourceLinks(page){
 const state=await setup(page),linkPolicy='OPERATIONAL_SOURCE_REVIEW_LINK_V1';
 Object.assign(state,{linkReads:0,linkPreviews:0,linkWrites:0,linkBodies:[],linkDelay:false,linkRelease:null,linkAbort:false,linkStatus:200,linkTransform:null});
 const source={documentId,version:1,referenceNumber:'HYD-SYNTHETIC-MATRIX-1',status:'DRAFT'};
 const rows=[{controlId:'BOAT.REGISTRATION',requirement:'<img src=x onerror=alert(1)> synthetic private source',applicability:'draft only',responsibility:'owner',inspection:'check',acceptance:'unaccepted evidence'}];
 await page.route(/\/admin\/operational-source-links(?:\/preview)?$/,async r=>{
  const req=r.request();if(req.method()==='GET'){
   state.linkReads++;if(state.linkDelay)await new Promise(resolve=>{state.linkRelease=resolve;});
   return json(r,state.owner?{schemaVersion:1,policy:linkPolicy,organizationId,canRecord:true,canActivate:false,notice:'Review trace only',documents:[{id:documentId,...source}],controls:[{controlId:rows[0].controlId,labelAr:'test',sourceReviewStatus:'UNLINKED'}]}:{message:'owner only'},state.owner?200:403);
  }
  const body=req.postDataJSON();state.linkBodies.push(body);
  if(req.url().endsWith('/preview')){state.linkPreviews++;let result={schemaVersion:1,policy:linkPolicy,organizationId,canActivate:false,notice:'Review trace only',source,rows,expectedPlanHash:'b'.repeat(64)};if(state.linkTransform)result=state.linkTransform(result);return json(r,result);}
  state.linkWrites++;if(state.linkDelay)await new Promise(resolve=>{state.linkRelease=resolve;});if(state.linkAbort)return r.abort('failed');
  return json(r,state.linkStatus===200?{schemaVersion:1,policy:linkPolicy,reference:'SRL-synthetic',recordedAt:new Date().toISOString(),linkedControlCount:1,source,canActivate:false}:{message:'source changed'},state.linkStatus);
 });
 await open(page);await page.getByLabel('إدارة المراجع').selectOption('SAFETY_COMPLIANCE_RISK');return state;
}
async function sourceDraft(page){await page.locator('[data-source-links-open]').click();await expect(page.locator('[data-source-links-form]')).toBeVisible();await page.getByLabel('نسخة مصفوفة التشغيل',{exact:true}).selectOption(documentId);await page.getByLabel('سبب ربط المصفوفة',{exact:true}).fill('Synthetic private review reason');}
async function sourcePreview(page){await page.locator('[data-source-links-preview]').click();await expect(page.locator('[data-source-links-plan]')).toContainText('معاينة فقط');}

test('source link owner lazily previews canonical text and explicitly confirms a non-activating review link',async({page})=>{
 const state=await sourceLinks(page);expect(state.linkReads).toBe(0);await sourceDraft(page);expect(state.linkReads).toBe(1);expect(state.linkWrites).toBe(0);
 await expect(page.locator('[data-source-links-save]')).toBeDisabled();await sourcePreview(page);
 await expect(page.locator('[data-source-links-plan] img')).toHaveCount(0);await expect(page.locator('[data-source-links-plan]')).toContainText('<img src=x');await expect(page.locator('[data-source-links-save]')).toBeDisabled();
 await page.getByLabel('راجعت ربط هذه النسخة بالضوابط دون اعتماد محتواها أو تفعيل الإلزام',{exact:true}).check();await page.locator('[data-source-links-save]').click();
 await expect(page.locator('[data-source-links-status]')).toContainText('تم حفظ روابط مراجعة 1');await expect(page.locator('[data-source-links-status]')).toContainText('الإلزام ما زالا');
 expect(state.linkWrites).toBe(1);expect(state.linkBodies[1]).toEqual({documentId,expectedDocumentVersion:1,reason:'Synthetic private review reason',expectedPlanHash:'b'.repeat(64),confirmed:true});await expect(page.locator('[data-source-links-private]')).toBeEmpty();
});
test('source link editing invalidates preview and malformed server plans cannot be confirmed',async({page})=>{
 const state=await sourceLinks(page);await sourceDraft(page);await sourcePreview(page);await page.getByLabel('راجعت ربط هذه النسخة بالضوابط دون اعتماد محتواها أو تفعيل الإلزام',{exact:true}).check();
 await page.getByLabel('سبب ربط المصفوفة',{exact:true}).fill('Changed reason after preview');await expect(page.locator('[data-source-links-plan]')).toBeEmpty();await expect(page.locator('[data-source-links-save]')).toBeDisabled();
 state.linkTransform=r=>({...r,canActivate:true});await page.locator('[data-source-links-preview]').click();await expect(page.locator('[data-source-links-status]')).toContainText('غير متسقة');await expect(page.locator('[data-source-links-save]')).toBeDisabled();expect(state.linkWrites).toBe(0);
});
test('unrelated ADMIN is denied private source links and late owner responses stay hidden after department change',async({page})=>{
 const state=await sourceLinks(page);state.owner=false;await page.locator('[data-source-links-open]').click();await expect(page.locator('[data-source-links-status]')).toContainText('لمالك');await expect(page.locator('[data-source-links-private]')).toBeEmpty();
 state.owner=true;state.linkDelay=true;await page.locator('[data-source-links-open]').click();await expect.poll(()=>Boolean(state.linkRelease)).toBe(true);await page.getByLabel('إدارة المراجع').selectOption('FINANCE');state.linkRelease();await expect(page.locator('[data-source-links-private]')).toHaveCount(0);await expect(page.locator('[data-reference-detail]')).not.toContainText('HYD-SYNTHETIC');expect(state.linkWrites).toBe(0);
});
for(const failure of ['network','conflict'])test(`source link ${failure} save requires fresh read without replaying old confirmation`,async({page})=>{
 const state=await sourceLinks(page);await sourceDraft(page);await sourcePreview(page);await page.getByLabel('راجعت ربط هذه النسخة بالضوابط دون اعتماد محتواها أو تفعيل الإلزام',{exact:true}).check();
 state.linkAbort=failure==='network';state.linkStatus=failure==='conflict'?409:200;await page.locator('[data-source-links-save]').click();await expect(page.locator('[data-source-links-status]')).toContainText('أعد القراءة');await expect(page.locator('[data-source-links-private]')).toBeEmpty();expect(state.linkWrites).toBe(1);
});
test('source link in-flight save is single-submit and owner UI fits mobile then clears with a new session',async({page})=>{
 const state=await sourceLinks(page);await page.setViewportSize({width:390,height:844});await sourceDraft(page);await sourcePreview(page);expect(await box(page).evaluate(el=>el.scrollWidth<=el.clientWidth+2)).toBe(true);
 await page.getByLabel('راجعت ربط هذه النسخة بالضوابط دون اعتماد محتواها أو تفعيل الإلزام',{exact:true}).check();state.linkDelay=true;await page.locator('[data-source-links-save]').click();await expect.poll(()=>state.linkWrites).toBe(1);await expect(page.locator('[data-source-links-save]')).toBeDisabled();
 await page.evaluate(()=>window.HydrolandAuth.acceptSession({accessToken:'new-admin',refreshToken:'new-admin-refresh'},window.HydrolandAuth.beginAuthAttempt()));state.linkRelease();await expect(page.locator('[data-reference-detail]')).toBeEmpty();expect(state.linkWrites).toBe(1);
});

test('catalog review links distinguish absent policy rows from stored policy and mandatory counts',async({page})=>{
 const state=await setup(page);state.data.sourceReviewSummary={schemaVersion:1,linkedForReview:0,staleLinks:0,unlinked:1};
 for(const d of state.data.departments)for(const p of d.policies)p.sourceReviewStatus='UNLINKED';
 state.data.sourceReviewCatalogSummary={schemaVersion:1,total:29,linkedForReview:29,staleLinks:0,unlinked:0,withoutPolicyRecord:5};
 await open(page);await expect(page.locator('[data-reference-status]')).toContainText('كتالوج التشغيل: 29 من 29');await expect(page.locator('[data-reference-status]')).toContainText('دون سجل ضبط مستقل: 5');await expect(page.locator('[data-reference-status]')).toContainText('لا ينشئ سجلات ضبط');
 state.data.sourceReviewCatalogSummary.linkedForReview=30;await page.locator('[data-reference-refresh]').click();await expect(page.locator('[data-reference-detail]')).toBeEmpty();await expect(page.locator('[data-reference-status]')).not.toContainText('29 من 29');expect(state.writes).toBe(0);
});

test('department source discovery is lazy, read only and separate from approval', async ({ page }) => {
  const state = await setup(page); await open(page);
  await expect(page.getByLabel('إدارة المراجع').locator('option')).toHaveCount(14);
  await expect(page.locator('[data-reference-detail]')).toContainText('لم يُثبت متطلب معتمد');
  await expect(page.locator('[data-reference-detail]')).toContainText('ربط المصدر بالإدارة مقترح');
  await expect(page.locator('[data-reference-detail]')).toContainText('ملف غوص محفوظ للاختبار');
  await expect(page.locator('[data-reference-detail] a[href*="libfile_fixturemarine"]')).toHaveCount(1);
  await expect(page.locator('[data-reference-detail]')).toContainText('حالة الإعداد المسجلة: مفعّل');
  await expect(page.locator('[data-reference-detail]')).toContainText('ربط المتطلب ونسخته وأدلته ومرجع اعتماده غير مكتمل');
  await expect(page.locator('[data-reference-detail]')).toContainText('دورة تشغيل HR');
  await expect(page.locator('[data-reference-detail]')).toContainText('إقفال وأرشفة');
  await expect(page.locator('[data-reference-detail]')).toContainText('تعارض: أكثر من نسخة نشطة');
  await expect(page.locator('[data-reference-detail]')).toContainText('العدد لا يقيس اكتمال الإجراء');
  await expect(page.locator('[data-reference-detail]')).toContainText('ISO 9001:2026');
  await expect(page.locator('[data-reference-detail]')).toContainText('حالة تحقق إقفال الإدارة: لم تُقيّم');
  expect(state.writes).toBe(0);
  await page.getByRole('button', { name: 'فتح مسار مراجعة ضوابط الموارد البشرية', exact: true }).click();
  await expect(page.locator('[data-hr-control-review]')).toHaveAttribute('open', '');
  await expect(page.locator('[data-hr-control-request] [name=regulatoryRequirementId]')).toHaveValue('');
  await expect(page.locator('[data-hr-control-request] [name=legalApprovalReference]')).toHaveValue(''); expect(state.writes).toBe(0);
  await page.getByLabel('إدارة المراجع').selectOption('FINANCE');
  await expect(page.locator('[data-reference-detail]')).toContainText('المالية');
  await expect(page.locator('[data-reference-detail]')).toContainText('دورة تشغيل FINANCE');
  await expect(page.locator('[data-reference-detail]')).not.toContainText('دورة تشغيل HR');
  await expect(page.locator('[data-reference-detail]')).not.toContainText('مواصفة دليل تجريبية');
});
test('all 192 administrative forms render across the 14 departments with accurate counts', async ({ page }) => {
  const state=await setup(page);await open(page);
  await expect(page.locator('[data-reference-status]')).toContainText('نماذج الكتالوج: 192');
  for(const code of codes){
    await page.getByLabel('إدارة المراجع').selectOption(code);
    await expect(page.locator('[data-reference-template]')).toHaveCount(counts[code]);
    await expect(page.locator('[data-reference-detail]')).toContainText('نماذج الإدارة في الكتالوج الحالي: '+counts[code]);
    await expect(page.locator('[data-reference-detail]')).not.toContainText('هذه النماذج الثلاثة');
    await expect(page.locator('[data-reference-detail]')).toContainText('حالة تحقق إقفال الإدارة: لم تُقيّم');
  }
  await page.getByLabel('إدارة المراجع').selectOption('TRAINING');
  await expect(page.locator('[data-reference-template="TRN-TRAINING-PLAN"]')).toContainText('خطة التدريب');
  await page.getByLabel('إدارة المراجع').selectOption('FINANCE');
  await expect(page.locator('[data-reference-template="FIN-PROVIDER-RECONCILIATION"]')).toContainText('مطابقة مزود الدفع');
  expect(state.writes).toBe(0);expect(state.reads).toBe(1);
});
test('current mandatory bindings are distinguished from legacy references and configured switches',async({page})=>{
  const state=await setup(page);
  state.data.effectivePolicyCount=4;state.data.policiesWithRecordedReferences=3;
  state.data.bindingSummary={schemaVersion:1,legacyReferences:1,currentBindings:2,mandatoryBindings:1,notApplicableBindings:1,reviewRequiredBindings:1,unrecordedBindings:1};
  for(const department of state.data.departments) department.policies=['MANDATORY','NOT_APPLICABLE','REVIEW_REQUIRED','NOT_RECORDED'].map((bindingStatus,i)=>({category:'FIXTURE',ruleKey:'FIXTURE-'+i,labelAr:'حالة ربط '+i,state:'DISABLED',bindingStatus,legacyReferencesRecorded:i===2,referencesRecorded:i<3}));
  await open(page);
  await expect(page.locator('[data-reference-status]')).toContainText('سجلات إلزام صالحة: 1');
  await expect(page.locator('[data-reference-status]')).toContainText('سجلات عدم انطباق صالحة: 1');
  await expect(page.locator('[data-reference-status]')).toContainText('روابط تحتاج مراجعة: 1');
  await expect(page.locator('[data-reference-status]')).toContainText('بلا ربط بصيغة الإلزام الحالية: 1');
  const policies=page.locator('[data-reference-detail] article').filter({hasText:'حالة ربط'});
  await expect(policies.nth(0)).toContainText('حالة الإعداد المسجلة: غير مفعّل');
  await expect(policies.nth(0)).toContainText('تفرضه الحماية بصرف النظر عن إعداد التعطيل');
  await expect(policies.nth(1)).toContainText('لا يثبت إعفاءً من المتطلبات الأخرى');
  await expect(policies.nth(2)).toContainText('القرار التشغيلي محجوب');
  await expect(policies.nth(2)).toContainText('مراجع بالصيغة السابقة مسجلة');
  await expect(policies.nth(3)).toContainText('لم يسجل ربط بصيغة الإلزام الحالية');
  expect(state.writes).toBe(0);expect(state.assessmentWrites).toBe(0);
});
test('an older response leaves current binding status unknown and malformed counts clear claims',async({page})=>{
  const state=await setup(page);await open(page);
  await expect(page.locator('[data-reference-status]')).toContainText('لم تقس حالة ربط الإلزام');
  await expect(page.locator('[data-reference-status]')).not.toContainText('سجلات إلزام صالحة: 0');
  await expect(page.locator('[data-reference-detail]')).toContainText('لم ترد حالة ربط الإلزام');
  state.data.bindingSummary={schemaVersion:1,legacyReferences:0,currentBindings:1,mandatoryBindings:1,notApplicableBindings:0,reviewRequiredBindings:1,unrecordedBindings:0};
  await page.locator('[data-reference-refresh]').click();
  await expect(page.locator('[data-reference-status]')).toContainText('استجابة حالات ربط المراجع غير مكتملة');
  await expect(page.locator('[data-reference-detail]')).toBeEmpty();
  state.data.bindingSummary={schemaVersion:1,legacyReferences:0,currentBindings:0,mandatoryBindings:0,notApplicableBindings:0,reviewRequiredBindings:0,unrecordedBindings:1};
  state.data.departments[0].policies[0].bindingStatus='APPROVED';state.data.departments[0].policies[0].legacyReferencesRecorded=false;
  await page.locator('[data-reference-refresh]').click();
  await expect(page.locator('[data-reference-status]')).toContainText('استجابة حالات ربط المراجع غير مكتملة');
  await expect(page.locator('[data-reference-detail]')).toBeEmpty();expect(state.writes).toBe(0);
});
test('mismatched catalog totals and duplicate form codes clear the previous inventory', async ({page})=>{
  const state=await setup(page);await open(page);
  state.data.canonicalSourceTemplateCount=60;
  await page.getByRole('button',{name:'تحديث المراجع',exact:true}).click();
  await expect(page.locator('[data-reference-status]')).toContainText('استجابة نماذج الإدارات غير مكتملة');
  await expect(page.locator('[data-reference-detail]')).toBeEmpty();
  state.data.canonicalSourceTemplateCount=192;state.data.departments[1].operatingCycle.templates[0].code=state.data.departments[0].operatingCycle.templates[0].code;
  await page.getByRole('button',{name:'تحديث المراجع',exact:true}).click();
  await expect(page.locator('[data-reference-status]')).toContainText('استجابة نماذج الإدارات غير مكتملة');
  await expect(page.locator('[data-reference-detail]')).toBeEmpty();expect(state.writes).toBe(0);
});
test('late source data cannot reappear after leaving the department workspace', async ({ page }) => {
  const state = await setup(page); await open(page); state.delay = true;
  await page.getByRole('button', { name: 'تحديث المراجع', exact: true }).click(); await expect.poll(() => typeof state.release).toBe('function');
  await page.locator('[data-portal-label="مركز القيادة والتحكم"]').click();
  const completed = page.waitForResponse(r => /\/department-references$/.test(r.url())); state.release(); await completed;
  await expect(page.locator('[data-reference-detail]')).toBeEmpty(); await expect(page.getByLabel('إدارة المراجع').locator('option')).toHaveCount(0);
});
test('fresh authorization loss prevents a private reference read', async ({ page }) => {
  const state = await setup(page); let release; state.authorizationGate = new Promise(resolve => { release = resolve; }); state.admin = false;
  try { await box(page).locator('summary').click(); } finally { state.authorizationGate = null; release(); }
  await expect(page.locator('#hl-admin-employees')).toBeHidden(); await expect(page.locator('[data-reference-detail]')).toBeEmpty(); expect(state.reads).toBe(0);
});
test('untrusted reference text remains text and non-HTTPS source links are rejected', async ({ page }) => {
  const state = await setup(page); state.data.legalReferences[0].titleAr = '<img src=x onerror=alert(1)>'; state.data.legalReferences[0].url = 'javascript:alert(1)';
  await open(page); await expect(page.locator('[data-reference-detail]')).toContainText('<img src=x');
  await expect(page.locator('[data-reference-detail] img,[data-reference-detail] svg')).toHaveCount(0);
  await expect(page.locator('[data-reference-detail] a[href^="javascript:"]')).toHaveCount(0);
  await expect(page.locator('[data-reference-detail] a[href*="chatgpt.com/library"]').first()).toHaveAttribute('rel', 'noopener noreferrer');
});
test('failed and malformed refreshes remove stale reference claims', async ({ page }) => {
  const state = await setup(page); await open(page); state.fail = true;
  await page.getByRole('button', { name: 'تحديث المراجع', exact: true }).click(); await expect(page.locator('[data-reference-status]')).toContainText('مؤقتًا');
  await expect(page.locator('[data-reference-detail]')).toBeEmpty(); await expect(page.getByLabel('إدارة المراجع')).toBeDisabled();
  state.fail = false; state.data.referenceOnly = false;
  await page.getByRole('button', { name: 'تحديث المراجع', exact: true }).click(); await expect(page.locator('[data-reference-status]')).toContainText('غير مكتملة');
  await expect(page.locator('[data-reference-detail]')).toBeEmpty(); expect(state.writes).toBe(0);
  state.data.referenceOnly=true; state.data.departments[0].operatingCycle.departmentClosed=true;
  await page.getByRole('button',{name:'تحديث المراجع',exact:true}).click(); await expect(page.locator('[data-reference-status]')).toContainText('دورة الإدارة غير مكتملة');
  await expect(page.locator('[data-reference-detail]')).toBeEmpty(); expect(state.writes).toBe(0);
});
test('mobile reference discovery fits the workspace and logout clears its content', async ({ page }) => {
  const state = await setup(page); await open(page); await page.setViewportSize({ width: 390, height: 844 });
  expect(await box(page).evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.evaluate(() => window.HydrolandAuth.terminateSession()); await expect(page.locator('[data-reference-detail]')).toBeEmpty();
  await expect(page.getByLabel('إدارة المراجع').locator('option')).toHaveCount(0); expect(state.writes).toBe(0);
});

async function openAssessment(page) {
  await page.locator('[data-closure-open]').click();
  await expect(page.locator('[data-closure-form]')).toBeVisible();
}
async function blockedDraft(page) {
  await page.getByLabel('حالة '+gateIds[0],{exact:true}).selectOption('BLOCKED');
  await page.getByLabel('ملاحظة '+gateIds[0],{exact:true}).fill('مرجع المتطلب غير مكتمل ويحتاج تحققًا مستقلًا.');
}
async function previewAssessment(page) {
  await page.locator('[data-closure-preview]').click();
  await expect(page.locator('[data-closure-plan]')).toContainText('معاينة فقط');
}

test('stored blocker and stale summaries are not interpreted as departmental closure',async({page})=>{
  const state=await setup(page),cycle=state.data.departments[0].operatingCycle;
  cycle.closureAssessment='BLOCKED';cycle.closureGates[0].verificationStatus='BLOCKED';
  cycle.closureRecord={id:recordId,revision:1,recordedAt:new Date().toISOString(),policyVersion:policy,specificationVersion:'2026-10-26.v2',assessmentReference:'DCA-HR-1-fixture',assessmentCurrent:true};
  await open(page);await expect(page.locator('[data-reference-detail]')).toContainText('موانع محفوظة؛ الإدارة غير مقفلة');
  await expect(page.locator('[data-reference-detail]')).toContainText('DCA-HR-1-fixture');
  expect(state.assessmentReads).toBe(0);
  cycle.closureAssessment='STALE';cycle.closureGates[0].verificationStatus='NOT_ASSESSED';cycle.closureRecord.assessmentCurrent=false;
  await page.locator('[data-reference-refresh]').click();await expect(page.locator('[data-reference-detail]')).toContainText('التقييم المحفوظ قديم');
  expect(state.assessmentWrites).toBe(0);
});

test('unknown, duplicate or missing gates fail closed without stale assessment claims',async({page})=>{
  const state=await setup(page);await open(page);
  for(const alter of [cycle=>cycle.closureGates.pop(),cycle=>{cycle.closureGates[1].id=cycle.closureGates[0].id;},cycle=>{cycle.closureGates[0].verificationStatus='ACCEPTED';},cycle=>{cycle.closureGates[0].id='UNKNOWN';},cycle=>{cycle.closureDecisionReference='forged-decision';},cycle=>{cycle.closureAssessment='CLOSED';}]){
    state.data=snapshot();alter(state.data.departments[0].operatingCycle);
    await page.locator('[data-reference-refresh]').click();await expect(page.locator('[data-reference-status]')).toContainText('دورة الإدارة غير مكتملة');
    await expect(page.locator('[data-reference-detail]')).toBeEmpty();
  }
  expect(state.assessmentWrites).toBe(0);
});

test('owner editor loads lazily and non-owner denial never reveals private assessment notes',async({page})=>{
  const state=await setup(page);state.owner=false;await open(page);expect(state.assessmentReads).toBe(0);
  await page.locator('[data-closure-open]').click();await expect(page.locator('[data-closure-status]')).toContainText('للمالك المتحقق فقط');
  await expect(page.locator('[data-closure-private]')).toBeEmpty();expect(state.assessmentReads).toBe(1);expect(state.previews).toBe(0);
});

test('owner previews seven gates and canonical references before separate confirmed save',async({page})=>{
  const state=await setup(page);await open(page);await openAssessment(page);
  await expect(page.locator('[data-closure-gate]')).toHaveCount(7);await blockedDraft(page);
  await page.getByLabel('أدلة '+gateIds[0],{exact:true}).fill(documentId+' 2');
  await previewAssessment(page);expect(state.previews).toBe(1);expect(state.assessmentWrites).toBe(0);
  await expect(page.locator('[data-closure-plan]')).toContainText('HYD-HR-EVIDENCE');
  await expect(page.locator('[data-closure-plan]')).toContainText('canonical-server-source-hash');
  await expect(page.locator('[data-closure-save]')).toBeDisabled();
  await page.locator('[data-closure-confirmed]').check();await page.locator('[data-closure-save]').click();
  await expect(page.locator('[data-closure-status]')).toContainText('حُفظ تقييم النواقص بالإصدار 1');
  expect(state.assessmentWrites).toBe(1);expect(state.requests[1].confirmed).toBe(true);expect(state.requests[1].expectedPlanHash).toBe('a'.repeat(64));
  expect(state.requests[1].gates[0].evidence).toEqual([{documentId,version:2}]);
  await expect(page.locator('[data-closure-private]')).toContainText('الإصدار 1');
  await expect(page.locator('[data-closure-private]')).toContainText('سجل إصدارات التقييم');
  await expect(page.locator('[data-closure-plan]')).toBeEmpty();
});

test('editing any previewed gate invalidates confirmation and requires a fresh preview',async({page})=>{
  const state=await setup(page);await open(page);await openAssessment(page);await blockedDraft(page);await previewAssessment(page);
  await page.locator('[data-closure-confirmed]').check();
  await page.getByLabel('ملاحظة '+gateIds[1],{exact:true}).fill('ملاحظة جديدة لم تدخل المعاينة السابقة');
  await expect(page.locator('[data-closure-plan]')).toBeEmpty();expect(state.assessmentWrites).toBe(0);
  await previewAssessment(page);expect(state.previews).toBe(2);await expect(page.locator('[data-closure-confirmed]')).not.toBeChecked();
});

test('malformed owner detail and changed preview source never become a confirmable plan',async({page})=>{
  const state=await setup(page);state.assessment.departmentClosed=true;await open(page);
  await page.locator('[data-closure-open]').click();await expect(page.locator('[data-closure-status]')).toContainText('غير مكتملة');
  await expect(page.locator('[data-closure-private]')).toBeEmpty();
  state.assessment=assessment();await openAssessment(page);await blockedDraft(page);
  state.previewTransform=response=>({...response,gates:response.gates.map((g,i)=>i===0?{...g,note:'server-changed-note'}:g)});
  await page.locator('[data-closure-preview]').click();await expect(page.locator('[data-closure-status]')).toContainText('استجابة معاينة التقييم غير مكتملة');
  await expect(page.locator('[data-closure-private]')).toBeEmpty();expect(state.assessmentWrites).toBe(0);
});

test('invalid blockers and duplicate evidence stop locally without a preview request',async({page})=>{
  const state=await setup(page);await open(page);await openAssessment(page);
  await page.getByLabel('حالة '+gateIds[0],{exact:true}).selectOption('BLOCKED');
  await page.locator('[data-closure-preview]').click();await expect(page.locator('[data-closure-status]')).toContainText('5 إلى 1000');expect(state.previews).toBe(0);
  await blockedDraft(page);await page.getByLabel('أدلة '+gateIds[0],{exact:true}).fill(documentId+' 1\n'+documentId+' 1');
  await page.locator('[data-closure-preview]').click();await expect(page.locator('[data-closure-status]')).toContainText('لا تكرر');expect(state.previews).toBe(0);
  await page.getByLabel('أدلة '+gateIds[0],{exact:true}).fill('https://example.invalid/unverified 1');
  await page.locator('[data-closure-preview]').click();await expect(page.locator('[data-closure-status]')).toContainText('معرّف مستند صالح');expect(state.previews).toBe(0);
});

test('uncertain saves clear private details and cannot be replayed without an explicit reread',async({page})=>{
  const state=await setup(page);await open(page);await openAssessment(page);await blockedDraft(page);await previewAssessment(page);
  state.abortSave=true;await page.locator('[data-closure-confirmed]').check();await page.locator('[data-closure-save]').click();
  await expect(page.locator('[data-closure-status]')).toContainText('لم يتأكد حفظ التقييم');
  await expect(page.locator('[data-closure-private]')).toBeEmpty();expect(state.assessmentWrites).toBe(1);
  await page.waitForTimeout(100);expect(state.assessmentWrites).toBe(1);
  state.abortSave=false;await openAssessment(page);expect(state.assessmentReads).toBe(2);
  await expect(page.locator('[data-closure-plan]')).toBeEmpty();
});

test('repeated confirmation cannot duplicate an in-flight save and conflict requires reread',async({page})=>{
  const state=await setup(page);await open(page);await openAssessment(page);await blockedDraft(page);await previewAssessment(page);
  state.saveDelay=true;state.saveStatus=409;await page.locator('[data-closure-confirmed]').check();
  await page.locator('[data-closure-save]').evaluate(button=>{button.click();button.click();button.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
  await expect.poll(()=>typeof state.saveRelease).toBe('function');expect(state.assessmentWrites).toBe(1);
  state.saveRelease();await expect(page.locator('[data-closure-status]')).toContainText('تغيّر التقييم أو المصدر');
  await expect(page.locator('[data-closure-private]')).toBeEmpty();expect(state.assessmentWrites).toBe(1);
});

test('closing during a private read or preview prevents late content from reappearing',async({page})=>{
  const state=await setup(page);await open(page);state.assessmentDelay=true;
  await page.locator('[data-closure-open]').click();await expect.poll(()=>typeof state.assessmentRelease).toBe('function');
  await page.getByRole('button',{name:'إغلاق تقييم النواقص',exact:true}).click();
  const readDone=page.waitForResponse(r=>r.url().endsWith('/HR/assessment'));state.assessmentRelease();await readDone;
  await expect(page.locator('[data-closure-private]')).toBeEmpty();
  state.assessmentDelay=false;await openAssessment(page);await blockedDraft(page);state.previewDelay=true;
  await page.locator('[data-closure-preview]').click();await expect.poll(()=>typeof state.previewRelease).toBe('function');
  await page.getByRole('button',{name:'إغلاق تقييم النواقص',exact:true}).click();
  const previewDone=page.waitForResponse(r=>r.url().endsWith('/assessment/preview'));state.previewRelease();await previewDone;
  await expect(page.locator('[data-closure-private]')).toBeEmpty();expect(state.assessmentWrites).toBe(0);
});

test('department navigation and history dismissal clear a preview and its private notes',async({page})=>{
  const state=await setup(page);await open(page);await openAssessment(page);await blockedDraft(page);await previewAssessment(page);
  await page.getByLabel('إدارة المراجع').selectOption('FINANCE');await expect(page.locator('[data-closure-private]')).toBeEmpty();
  await expect(page.locator('[data-reference-detail]')).not.toContainText('مرجع المتطلب غير مكتمل');
  await page.getByLabel('إدارة المراجع').selectOption('HR');await openAssessment(page);await blockedDraft(page);await previewAssessment(page);
  await page.evaluate(()=>window.dispatchEvent(new PopStateEvent('popstate')));
  await expect(page.locator('[data-reference-detail]')).toBeEmpty();expect(state.assessmentWrites).toBe(0);
});

test('fresh role loss at preview denies a write and mobile private editor clears on logout',async({page})=>{
  const state=await setup(page);await open(page);await openAssessment(page);await blockedDraft(page);
  await page.setViewportSize({width:390,height:844});expect(await box(page).evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await previewAssessment(page);expect(await box(page).evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  state.admin=false;await page.getByLabel('ملاحظة '+gateIds[0],{exact:true}).fill('سبب محدث قبل سحب الدور');
  await page.locator('[data-closure-preview]').click();await expect(page.locator('[data-reference-detail]')).toBeEmpty();
  expect(state.previews).toBe(1);expect(state.assessmentWrites).toBe(0);
});

test('new authenticated ADMIN session clears previous owner private data before any new read',async({page})=>{
  const state=await setup(page);await open(page);await openAssessment(page);await blockedDraft(page);await previewAssessment(page);
  await page.evaluate(()=>window.HydrolandAuth.acceptSession({accessToken:'another-admin-fixture',refreshToken:'another-admin-refresh'},window.HydrolandAuth.beginAuthAttempt()));
  await expect(page.locator('[data-reference-detail]')).toBeEmpty();expect(state.assessmentWrites).toBe(0);expect(state.assessmentReads).toBe(1);
});
