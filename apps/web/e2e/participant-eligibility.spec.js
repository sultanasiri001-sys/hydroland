import {test,expect} from '@playwright/test';
import {actors,consent,detail,hash,install,json,open,panel,pdf,seedConsent,source,uid} from './fixtures/participation-fixture.js';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';

async function createSourceForm(page,kind) {
  const disclosure=panel(page).locator('details').filter({has:page.getByText('إنشاء مصدر خاص',{exact:true})});await disclosure.locator('summary').click();
  const form=panel(page).locator('[data-participation-source-create]');
  await form.locator('[name=organization]').selectOption(uid(21));await form.locator('[name=kind]').selectOption(kind);await form.locator('[name=subject]').selectOption('BOOKING_PARTICIPANT:'+uid(20));
  await form.locator('[name=title]').fill('أصل اختبار '+kind);await form.locator('[name=attachment]').setInputFiles({name:'original-'+kind+'.pdf',mimeType:'application/pdf',buffer:pdf});
  await form.locator('[name=sourceReference]').fill('مرجع أصلي اختباري');await form.locator('[name=validUntil]').fill('2099-01-01T03:00');
  if(kind==='POLICY'){
    await form.locator('[name=sourceAuthority]').fill('جهة معيار اختبارية');await form.locator('[name=sourceVersion]').fill('TEST-2026');await form.locator('[name=sourceClause]').fill('المادة الاختبارية المحددة');await form.locator('[name=applicabilityReason]').fill('انطباق اختباري على الخدمة المحددة فقط');await form.locator('[name=effectiveFrom]').fill('2026-01-01T03:00');await form.locator('[name=minimumAge]').fill('10');await form.locator('[name=guardianBelowAge]').fill('18');await form.locator('[name=consentRequirement]').selectOption('REQUIRED');await form.locator('[name=medicalRequirement]').selectOption('NOT_APPLICABLE');await form.locator('[name=consentTextAr]').fill('نص موافقة عربي <محفوظ>');await form.locator('[name=consentTextEn]').fill('Pinned English <declaration>');
  }else{
    await form.locator('[name=issuerName]').fill('جهة إصدار الدليل');await form.locator('[name=issuedAt]').fill('2026-01-01T03:00');
    if(kind==='IDENTITY')await form.locator('[name=dateOfBirth]').fill('1990-01-01');
    else{
      await form.locator('[name=identity]').selectOption(uid(12));await form.locator('[name=validFrom]').fill('2026-01-01T03:00');
      if(kind==='GUARDIAN'){await form.locator('[name=relationshipKind]').selectOption('PARENT');await form.locator('[name=accountEmail]').fill('guardian@example.invalid');await form.getByRole('button',{name:'تحقق من الحساب',exact:true}).click();await expect(form.locator('[data-participation-account]')).toHaveText(actors.guardian.name);}
      else{await form.locator('[name=issuerReference]').fill('مرجع اختصاص موثق في الأصل');await form.locator('[name=outcome]').selectOption('CLEARED_FOR_ACTIVITY');await form.locator('[name=limitations]').fill('');}
    }
  }
  return form;
}
async function sourceAction(page,action){const form=panel(page).locator('[data-participation-source-action="'+action+'"]');await form.locator('[name=reason]').fill('مراجعة إدارية معزولة لأصل المصدر');await form.getByRole('button').click();await expect(panel(page)).toHaveAttribute('aria-busy','false');}
async function review(page,decision='ELIGIBLE'){const form=panel(page).locator('[data-participation-review]');await form.locator('[name=decision]').selectOption(decision);await form.locator('[name=reason]').fill('مراجعة أدلة اصطناعية مرتبطة بالخدمة');await form.getByRole('checkbox').check();return form;}

test('reviewers prepare a named policy source and complete independent administrative stages without recording personal consent',async({page})=>{
  const state=await install(page);await open(page);const form=await createSourceForm(page,'POLICY');
  await expect(form.locator('textarea')).toHaveCount(4);await expect(form.locator('input[name*=Hash],input[name*=Digest],input[name*=Id]')).toHaveCount(0);
  await form.getByRole('button',{name:'حفظ مسودة المصدر',exact:true}).click();await expect(panel(page).locator('[data-participation-source]')).toBeVisible();
  const created=state.sources.at(-1),body=state.calls[0].body;expect(body.payload).toMatchObject({purpose:'D01_POLICY_V1',subjectId:uid(20),serviceType:'TRIP',serviceId:uid(22),activityCode:'SHORE',sourceVersion:'TEST-2026',effectiveFrom:'2026-01-01T00:00:00.000Z',validUntil:'2099-01-01T00:00:00.000Z',consentTextAr:'نص موافقة عربي <محفوظ>',consentTextEn:'Pinned English <declaration>'});expect(body.attachment.base64).toBe(pdf.toString('base64'));
  await sourceAction(page,'SUBMIT');await expect(panel(page).locator('[data-participation-source-action=APPROVE]')).toHaveCount(0);
  for(const [actor,action] of [['approver','APPROVE'],['signer','SIGN']]){await state.signIn(actor);await open(page);await panel(page).getByRole('heading',{name:sourceHeading(created)}).locator('..').getByRole('button',{name:'عرض المصدر',exact:true}).click();await sourceAction(page,action);}
  expect(created.status).toBe('SIGNED');expect(state.consent).toBeNull();expect(state.review).toBeNull();expect(state.calls.filter(call=>call.path.endsWith('/actions')).map(call=>call.actor)).toEqual(['reviewer','approver','signer']);
  await expect(panel(page)).toContainText('لا تُسجل توقيع المشارك أو الولي');expect(state.nativeWrites).toEqual([]);
});
function sourceHeading(source){return `${source.title} · ${source.referenceNumber} · v${source.version}`;}

for(const kind of ['IDENTITY','GUARDIAN','MEDICAL'])test(`${kind} source entry pins scoped identity and service fields without manual IDs or invented authority`,async({page})=>{
  const state=await install(page);await open(page);const form=await createSourceForm(page,kind);await form.getByRole('button',{name:'حفظ مسودة المصدر',exact:true}).click();await expect(panel(page).locator('[data-participation-source]')).toBeVisible();
  const body=state.calls[0].body;expect(body.payload).toMatchObject({purpose:'D01_'+kind+'_V1',subjectType:'BOOKING_PARTICIPANT',subjectId:uid(20),issuerName:'جهة إصدار الدليل',issuedAt:'2026-01-01T00:00:00.000Z'});
  if(kind==='IDENTITY')expect(body.payload.participantAccountId).toBe(actors.participant.id);
  else expect(body.payload).toMatchObject({serviceType:'TRIP',serviceId:uid(22),identityDocumentId:uid(12),identityDocumentHash:state.sources[1].hash,validFrom:'2026-01-01T00:00:00.000Z'});
  if(kind==='GUARDIAN'){expect(state.lookups).toEqual([{organizationId:uid(21),email:'guardian@example.invalid'}]);expect(body.payload.guardianAccountId).toBe(actors.guardian.id);expect(body.payload.authorityScope).toBe('PARTICIPATION_CONSENT');expect(state.guardianLinked).toBe(false);}
  if(kind==='MEDICAL')expect(body.payload).toMatchObject({activityCode:'SHORE',outcome:'CLEARED_FOR_ACTIVITY',limitations:''});
  expect(state.consent).toBeNull();expect(state.nativeWrites).toEqual([]);
});

for(const subjectType of ['BOOKING_PARTICIPANT','TRAINING_ENROLLMENT'])test(`reviewer creates a ${subjectType} case from current scoped documents`,async({page})=>{
  const state=await install(page,{caseExists:false,subjectType});await open(page);const form=panel(page).locator('[data-participation-create]');
  await form.locator('[name=subject]').selectOption(subjectType+':'+uid(20));await form.locator('[name=policy]').selectOption(uid(11));await form.locator('[name=identity]').selectOption(uid(12));await form.getByRole('button').click();
  await expect(panel(page).locator('[data-participation-detail]')).toHaveAttribute('data-participation-detail',uid(30));
  expect(state.calls[0].body).toEqual({requestId:expect.any(String),subjectType,subjectId:uid(20),policyDocumentId:uid(11),identityDocumentId:uid(12)});expect(state.reads.filter(path=>path==='/workspace')).toHaveLength(2);
  await expect(panel(page).locator('[data-state=ACTION_REQUIRED]')).toBeVisible();expect(state.nativeWrites).toEqual([]);
});

for(const language of ['ar','en'])test(`participant without organization membership reads both pinned texts and signs personally (${language})`,async({page})=>{
  const state=await install(page,{actor:'participant'});if(language==='en')await page.setViewportSize({width:390,height:844});await page.evaluate(value=>window.HydrolandI18n.setLocale(value),language);await open(page);await detail(page);
  await expect(panel(page).locator('[data-participation-source-create],[data-participation-create],[data-participation-review]')).toHaveCount(0);
  await expect(panel(page)).toContainText(state.sources[0].payload.consentTextAr);await expect(panel(page)).toContainText(state.sources[0].payload.consentTextEn);await expect(panel(page)).toContainText(state.subject.service.title);await expect(panel(page)).toContainText('01/01/2099, 03:00');await expect(panel(page)).not.toContainText('T00:00:00.000Z');await expect(panel(page).locator('[data-participation-detail] time').first()).toHaveText('01/01/2098, 12:00 ('+(language==='en'?'Riyadh time':'توقيت الرياض')+')');await expect(panel(page).locator('[data-date-only=true]')).toHaveText('01/01/1990');await expect(panel(page).locator('[data-participation-detail] time').first()).toHaveAttribute('dir','ltr');await expect(panel(page).locator('[data-participation-detail] time').first()).toHaveAttribute('datetime',state.subject.service.startsAt);await expect(panel(page).locator('غير,not,خاص')).toHaveCount(0);
  const form=panel(page).locator('[data-participation-sign]');await expect(form.locator('[name=signedName]')).toHaveValue(actors.participant.name);await expect(form.locator('[name=signedName]')).toHaveAttribute('readonly','');
  await form.dispatchEvent('submit');expect(state.calls).toHaveLength(0);await consent(page);expect(state.calls).toHaveLength(1);expect(state.calls[0].body.payload).toEqual({consent:true,signedName:actors.participant.name,consentHash:state.consent.consentHash});
  expect(state.consent.role).toBe('PARTICIPANT');await expect(panel(page).locator('[data-state=ACTION_REQUIRED]')).toBeVisible();
  const bounds=await panel(page).boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(await page.evaluate(()=>innerWidth));expect(await panel(page).evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
});

test('the verified guardian signs a minor case under their own account without membership',async({page})=>{
  const state=await install(page,{actor:'guardian',minor:true});await open(page);await detail(page);await expect(panel(page)).toContainText(actors.guardian.name);await expect(panel(page).locator('[data-date-only=true]')).toHaveText('01/01/2085');await consent(page);
  expect(state.consent.role).toBe('GUARDIAN');expect(state.consent.actorAccountId).toBe(actors.guardian.id);expect(state.consent.actorAccountId).not.toBe(actors.participant.id);expect(state.workspace().organizations).toEqual([]);expect(state.workspace().subjects).toEqual([]);
});

test('reviewer links original evidence, records a separate decision, and revokes it without assuming clinical approval',async({page})=>{
  const state=await install(page);seedConsent(state);await open(page);await detail(page);
  const link=panel(page).locator('[data-participation-action=LINK_EVIDENCE] form');await link.locator('[name=kind]').selectOption('MEDICAL');await link.locator('[name=document]').selectOption(uid(14));await link.getByRole('button').click();await expect(panel(page)).toHaveAttribute('aria-busy','false');expect(state.calls[0].body.payload).toEqual({kind:'MEDICAL',documentId:uid(14)});
  await expect(panel(page).locator('[data-state=ACTION_REQUIRED]')).toBeVisible();const form=await review(page);await form.getByRole('button').click();await expect(panel(page).locator('[data-state=CLEARED]')).toBeVisible();
  const revoke=panel(page).locator('[data-participation-revoke]');await revoke.locator('[name=reason]').fill('سحب القرار لتغيير المصدر');await revoke.getByRole('button').click();await expect(panel(page).locator('[data-state=ACTION_REQUIRED]')).toBeVisible();expect(state.calls.at(-1).body.action).toBe('REVOKE');expect(state.nativeWrites).toEqual([]);
});

test('withdrawal replaces the previously cleared display and does not reuse the previous signature',async({page})=>{
  const state=await install(page,{actor:'participant'});seedConsent(state);state.review={decision:'ELIGIBLE',reason:'مراجعة سابقة',reviewedAt:'2026-11-26T10:00:00.000Z'};await open(page);await detail(page);await expect(panel(page).locator('[data-state=CLEARED]')).toBeVisible();
  const form=panel(page).locator('[data-participation-withdraw]');await form.locator('[name=reason]').fill('سحب موافقتي الاختبارية');await form.getByRole('button').click();await expect(panel(page).locator('[data-state=ACTION_REQUIRED]')).toBeVisible();expect(state.consent.withdrawnAt).toBeTruthy();expect(state.calls[0].body.action).toBe('WITHDRAW_CONSENT');
});

test('renewed personal consent requires an explicit reason and binds a fresh signature to the current text',async({page})=>{
  const state=await install(page,{actor:'participant'});seedConsent(state);state.consent.withdrawnAt='2026-11-26T10:01:00.000Z';await open(page);await detail(page);
  const form=panel(page).locator('[data-participation-sign]');await expect(form.locator('[name=reason]')).toBeVisible();await form.getByRole('checkbox').check();await form.dispatchEvent('submit');expect(state.calls).toHaveLength(0);
  await form.locator('[name=reason]').fill('تجديد شخصي بعد مراجعة النص والخدمة الحاليين');await form.getByRole('button').click();await expect(panel(page).locator('[data-participation-withdraw]')).toBeVisible();
  expect(state.calls[0].body.payload).toEqual({consent:true,signedName:actors.participant.name,consentHash:state.consent.consentHash,reason:'تجديد شخصي بعد مراجعة النص والخدمة الحاليين'});expect(state.consent.withdrawnAt).toBeNull();expect(state.review).toBeNull();await expect(panel(page).locator('[data-state=ACTION_REQUIRED]')).toBeVisible();
});

test('a revoked policy with unavailable terms stays readable as action required and never offers stale consent text',async({page})=>{
  const state=await install(page,{actor:'participant'});seedConsent(state);state.sources[0].revoked=true;state.sources[0].status='ARCHIVED';await open(page);await detail(page);
  await expect(panel(page).locator('[data-state=ACTION_REQUIRED]')).toBeVisible();await expect(panel(page)).toContainText('مصدر المتطلبات مسحوب.');await expect(panel(page).locator('[data-participation-consent]')).toContainText('لا يُستخدم نصه لمنح موافقة جديدة');await expect(panel(page)).not.toContainText(state.sources[0].payload.consentTextAr);await expect(panel(page).locator('[data-participation-sign]')).toHaveCount(0);
  const form=panel(page).locator('[data-participation-withdraw]');await form.locator('[name=reason]').fill('سحب الموافقة السابقة بعد سحب مصدرها');await form.getByRole('button').click();await expect(panel(page)).toHaveAttribute('aria-busy','false');expect(state.calls[0].body.action).toBe('WITHDRAW_CONSENT');expect(state.consent.withdrawnAt).toBeTruthy();await expect(panel(page).locator('[data-participation-sign]')).toHaveCount(0);
});

test('private source PDF is downloaded with matching bytes and source revocation becomes visible',async({page})=>{
  const state=await install(page);await open(page);await panel(page).getByRole('heading',{name:sourceHeading(state.sources[0])}).locator('..').getByRole('button',{name:'عرض المصدر',exact:true}).click();
  const downloadEvent=page.waitForEvent('download');await panel(page).getByRole('button',{name:'تنزيل أصل PDF',exact:true}).click();const download=await downloadEvent;expect(download.suggestedFilename()).toBe('POLICY.pdf');const stream=await download.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);expect(Buffer.concat(chunks)).toEqual(pdf);
  await sourceAction(page,'REVOKE');await expect(panel(page).locator('[data-participation-source]')).toContainText('مسحوب');expect(state.calls.at(-1).body.action).toBe('REVOKE');await panel(page).getByRole('button',{name:'عودة إلى الطلبات',exact:true}).click();await detail(page);await expect(panel(page).locator('[data-state=ACTION_REQUIRED]')).toBeVisible();
});

test('fresh revision and authority checks preserve drafts and prevent stale or revoked review writes',async({page})=>{
  const state=await install(page);seedConsent(state);await open(page);await detail(page);let form=await review(page);state.revision++;
  await form.getByRole('button').click();await expect(panel(page).locator('[data-eligibility-feedback]')).toContainText('تغيرت البيانات أو الصلاحية');expect(state.calls).toHaveLength(0);await expect(form.locator('[name=reason]')).toHaveValue('مراجعة أدلة اصطناعية مرتبطة بالخدمة');expect(await form.evaluate(node=>node.inert)).toBe(true);
  await panel(page).getByRole('button',{name:'تحديث',exact:true}).click();await expect(panel(page)).toHaveAttribute('aria-busy','false');form=await review(page);state.revokeNextAuth=true;await form.getByRole('button').click();await expect(panel(page)).toHaveCount(0);expect(state.calls).toHaveLength(0);
});

test('409 keeps opaque review notes and requires refresh before another action',async({page})=>{
  const state=await install(page);seedConsent(state);await open(page);await detail(page);const form=await review(page),reason='مراجعة <img src=x onerror=alert(1)> ثابتة';await form.locator('[name=reason]').fill(reason);
  state.onWrite=async route=>{await json(route,{message:'Changed <img src=x onerror=alert(1)>'},409);return true;};await form.getByRole('button').click();await expect(panel(page).locator('[data-eligibility-feedback]')).toHaveText('Changed <img src=x onerror=alert(1)>');await expect(form.locator('[name=reason]')).toHaveValue(reason);await expect(panel(page).locator('img')).toHaveCount(0);
  await form.dispatchEvent('submit');expect(state.calls).toHaveLength(1);expect(await form.evaluate(node=>node.inert)).toBe(true);
  await page.evaluate(()=>window.HydrolandI18n.setLocale('en'));await expect(form.locator('[name=reason]')).toHaveValue(reason);await expect(form.getByRole('button')).toHaveText('Save eligibility review');await expect(panel(page).locator('[data-participation-detail] time').first()).toHaveText('01/01/2098, 12:00 (Riyadh time)');expect(state.calls).toHaveLength(1);
});

test('an uncertain consent response retries the exact original request and records one consent event',async({page})=>{
  const state=await install(page,{actor:'participant'});await open(page);await detail(page);state.loseResponse=true;await consent(page);await expect(panel(page).locator('[data-participation-retry]')).toBeVisible();
  const first=state.calls[0].body;await panel(page).locator('[data-participation-sign]').dispatchEvent('submit');expect(state.calls).toHaveLength(1);await panel(page).locator('[data-participation-retry]').click();await expect(panel(page).locator('[data-participation-withdraw]')).toBeVisible();expect(state.calls).toHaveLength(2);expect(state.calls[1].body).toEqual(first);expect(state.events.filter(event=>event.action==='SIGN_CONSENT')).toHaveLength(1);
});

test('logout while a private case response is pending removes data and ignores the late response',async({page})=>{
  const state=await install(page,{actor:'participant'});await open(page);let pending;
  state.onCaseRead=async(route,data)=>{pending={route,data};return true;};await panel(page).locator('[data-participation-case]').getByRole('button').click();await expect.poll(()=>Boolean(pending)).toBe(true);
  await page.evaluate(()=>{window.HydrolandAuth.syncAuthUi();document.dispatchEvent(new Event('hydroland:session-cleared'));});await expect(panel(page)).toHaveCount(0);await json(pending.route,pending.data);await expect(panel(page)).toHaveCount(0);expect(state.calls).toHaveLength(0);
});

test('an old write cannot populate or unlock the next account view during its pending read',async({page})=>{
  const state=await install(page,{actor:'participant'});await open(page);await detail(page);let post,read;
  state.afterWrite=async(route,result)=>{post={route,result};return true;};const form=panel(page).locator('[data-participation-sign]');await form.getByRole('checkbox').check();await form.getByRole('button').click();await expect.poll(()=>Boolean(post)).toBe(true);
  state.afterWrite=null;await state.signIn('reviewer');await open(page);state.onCaseRead=async(route,data)=>{read={route,data};return true;};await panel(page).locator('[data-participation-case]').getByRole('button').click();await expect.poll(()=>Boolean(read)).toBe(true);await json(post.route,post.result);await expect(panel(page)).toHaveAttribute('aria-busy','true');await expect(panel(page).getByRole('button',{name:'تحديث',exact:true})).toBeDisabled();
  await json(read.route,read.data);await expect(panel(page)).toHaveAttribute('aria-busy','false');await expect(panel(page).locator('[data-participation-review]')).toBeVisible();await expect(panel(page).locator('[data-participation-sign]')).toHaveCount(0);
});

test('withdrawn access removes a buffered private PDF before any download',async({page})=>{
  const state=await install(page,{actor:'participant'});await open(page);await detail(page);await panel(page).getByRole('button',{name:'عرض المصدر',exact:true}).first().click();let pending,downloads=0;page.on('download',()=>downloads++);
  state.onAttachment=async route=>{pending=route;return true;};await panel(page).getByRole('button',{name:'تنزيل أصل PDF',exact:true}).click();await expect.poll(()=>Boolean(pending)).toBe(true);state.hideSources=true;await pending.fulfill({status:200,contentType:'application/pdf',body:pdf});await expect(panel(page)).toHaveCount(0);expect(downloads).toBe(0);
  await state.signIn('outsider');await open(page);await expect(panel(page)).toContainText('لا توجد طلبات ضمن صلاحيتك الحالية.');await expect(panel(page).locator('[data-participation-case],[data-participation-source]')).toHaveCount(0);
});

test('an incomplete or contradictory CLEARED response is not displayed as clearance',async({page})=>{
  const state=await install(page,{actor:'participant'});state.workspaceResponse={...state.workspace(),cases:[{...state.view(),status:'CLEARED',readiness:{ready:false,hardBlocked:true,reasons:['Invalid evidence']}}]};await open(page);await expect(panel(page).locator('[data-eligibility-feedback]')).toContainText('تعذر التحقق من بيانات الخادم');await expect(panel(page).locator('[data-state=CLEARED],form')).toHaveCount(0);expect(state.calls).toHaveLength(0);
});

test('same-person source replacement preserves the prior signature and withdrawal while requiring current consent',async({page})=>{
  const state=await install(page);seedConsent(state);state.review={decision:'ELIGIBLE',reason:'مراجعة سابقة',reviewedAt:'2026-11-26T10:00:00.000Z'};await open(page);await detail(page);await expect(panel(page).locator('[data-state=CLEARED]')).toBeVisible();state.expired=true;state.revision++;
  await panel(page).getByRole('button',{name:'تحديث',exact:true}).click();await expect(panel(page).locator('[data-state=ACTION_REQUIRED]')).toBeVisible();await expect(panel(page)).toContainText('انتهت صلاحية المصدر أو سُحب.');
  const original=structuredClone(state.consent),replacement=source('POLICY',41,state.subject,{payload:{...state.sources[0].payload,sourceVersion:'TEST-2',consentTextAr:'نص الإصدار الجديد الذي يحتاج موافقة جديدة'}});state.sources.push(replacement);state.expired=false;
  await panel(page).getByRole('button',{name:'تحديث',exact:true}).click();await expect(panel(page)).toHaveAttribute('aria-busy','false');
  const replace=async(policyId,identityId)=>{const form=panel(page).locator('[data-participation-replace]');await form.locator('[name=policy]').selectOption(policyId);await form.locator('[name=identity]').selectOption(identityId);await form.locator('[name=reason]').fill('إعادة الربط بالمصدر المراجع للشخص نفسه');await form.getByRole('button').click();await expect(panel(page)).toHaveAttribute('aria-busy','false');};
  await replace(replacement.id,uid(12));expect(state.consent).toEqual(original);expect(state.review).toBeNull();expect(state.view().readiness.reasons).toContain('PARTICIPATION_CONSENT_STALE');expect(state.consent.consentHash).not.toBe(state.view().consentHash);
  await expect(panel(page).locator('[data-state=ACTION_REQUIRED]')).toBeVisible();await expect(panel(page).locator('[data-participation-consent-stale]')).toContainText('إصدار سابق');await expect(panel(page).locator('[data-participation-consent]')).toContainText(replacement.payload.consentTextAr);
  await state.signIn('participant');await open(page);await detail(page);const withdraw=panel(page).locator('[data-participation-withdraw]');await withdraw.locator('[name=reason]').fill('سحب توقيعي السابق قبل أي موافقة جديدة');await withdraw.getByRole('button').click();await expect(panel(page)).toHaveAttribute('aria-busy','false');const withdrawn=structuredClone(state.consent);
  const correctedIdentity=source('IDENTITY',42,state.subject,{payload:{...state.sources[1].payload,dateOfBirth:'1990-02-02'}});state.sources.push(correctedIdentity);
  await state.signIn('reviewer');await open(page);await detail(page);await replace(replacement.id,correctedIdentity.id);expect(state.consent).toEqual(withdrawn);expect(state.consent.withdrawnAt).toBeTruthy();expect(state.review).toBeNull();
  await expect(panel(page).locator('[data-state=ACTION_REQUIRED]')).toBeVisible();await expect(panel(page).locator('[data-participation-consent]')).toContainText('الموافقة مسحوبة');await expect(panel(page).locator('[data-participation-consent-stale]')).toBeVisible();
  await page.evaluate(()=>window.HydrolandI18n.setLocale('en'));await expect(panel(page).locator('[data-participation-consent-stale]')).toContainText('Signature retained for an earlier version');expect(state.calls.map(call=>call.body.action)).toEqual(['REPLACE_SOURCES','WITHDRAW_CONSENT','REPLACE_SOURCES']);expect(state.nativeWrites).toEqual([]);
});

test('a different guest receives only the new person binding and cannot inherit private evidence or the previous signature',async({page})=>{
  const state=await install(page,{guest:true,minor:true,medicalLinked:true});seedConsent(state);state.review={decision:'ELIGIBLE',reason:'مراجعة الشخص السابق',reviewedAt:'2026-11-26T10:00:00.000Z'};state.sources[3].payload.sourceReference='PRIVATE_OLD_MEDICAL_REF';
  state.events.push({id:uid(81),participantAccountId:actors.participant.id,action:'SIGN_CONSENT',actorName:actors.guardian.name,createdAt:'2026-11-26T10:00:00.000Z',beforeRevision:1,afterRevision:2});
  await open(page);await detail(page);await expect(panel(page)).toContainText('PRIVATE_OLD_MEDICAL_REF');await expect(panel(page).locator('[data-participation-consent]')).toContainText(actors.guardian.name);
  const replacement=source('IDENTITY',43,state.subject,{payload:{...state.sources[1].payload,participantAccountId:actors.outsider.id,fullName:actors.outsider.name,dateOfBirth:'1995-01-01'}});state.sources.push(replacement);state.subject.participantName=actors.outsider.name;state.subjectChanged=true;state.revision++;
  await panel(page).getByRole('button',{name:'تحديث',exact:true}).click();await expect(panel(page)).toHaveAttribute('aria-busy','false');const form=panel(page).locator('[data-participation-replace]');await form.locator('[name=policy]').selectOption(uid(11));await form.locator('[name=identity]').selectOption(replacement.id);await form.locator('[name=reason]').fill('تغيير الضيف إلى شخص مستقل بهوية مختلفة');await form.getByRole('button').click();await expect(panel(page)).toHaveAttribute('aria-busy','false');
  expect(state.view().consent).toBeNull();expect(state.view().guardian).toBeNull();expect(state.view().medical).toBeNull();expect(state.view().review).toBeNull();expect(state.events.some(event=>event.actorName===actors.guardian.name)).toBe(true);
  await state.signIn('outsider');await open(page);await detail(page);await expect(panel(page).locator('[data-state=ACTION_REQUIRED]')).toBeVisible();await expect(panel(page).locator('[data-participation-consent]')).toContainText('لم تُسجل موافقة.');
  for(const prior of [actors.participant.name,actors.guardian.name,'PRIVATE_OLD_MEDICAL_REF'])await expect(panel(page)).not.toContainText(prior);
  await expect(panel(page).locator('[data-participation-sign] [name=signedName]')).toHaveValue(actors.outsider.name);await consent(page);expect(state.consent.actorAccountId).toBe(actors.outsider.id);expect(state.consent.actorPersonId).toBe(uid(106));expect(state.review).toBeNull();
  await state.signIn('participant');await open(page);await expect(panel(page).locator('[data-participation-case]')).toHaveCount(0);expect(state.nativeWrites).toEqual([]);
});

test('stale operational approval has an explicit review label in trip and calendar views in both languages',async({page})=>{
  const state=await install(page),start=new Date(Date.now()+3600000).toISOString(),end=new Date(Date.now()+7200000).toISOString();
  const trip={id:uid(70),title:'رحلة اختبار حالة اعتماد متغيرة',type:'SHORE',status:'OPEN',startsAt:start,endsAt:end,capacity:2,remainingSeats:2,operationalClearance:{status:'STALE'},readiness:{status:'NOT_READY',checks:{participants:false}},crew:{members:[],summary:{total:0,accepted:0}},resources:[]};
  await page.route(/\/api\/v1\/trips\/admin$/,route=>json(route,[trip]));await page.route(/\/api\/v1\/trips\/admin\/calendar\?/,route=>json(route,[trip]));
  await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role=admin]').click();await page.locator('.hl-role-dashboard .hl-portal-nav-item').filter({hasText:'الرحلات والحجوزات'}).click();
  const status=page.locator('[data-trip-row] [data-clearance-status=STALE]');await expect(status).toHaveText('اعتماد التشغيل يحتاج إعادة مراجعة');
  await page.waitForFunction(()=>Boolean(window.HydrolandOperationsCalendar));await page.evaluate(()=>window.HydrolandOperationsCalendar.reload());const calendar=page.locator('.hl-calendar-event[data-clearance=STALE] .hl-calendar-tags');await expect(calendar).toContainText('اعتماد التشغيل يحتاج إعادة مراجعة');
  await page.evaluate(()=>window.HydrolandI18n.setLocale('en'));await expect(status).toHaveText('Operating approval needs renewed review');await expect(calendar).toContainText('Operating approval needs renewed review');expect(state.nativeWrites).toEqual([]);
});
