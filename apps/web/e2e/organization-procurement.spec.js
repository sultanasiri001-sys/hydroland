import {test, expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';

const respond = (route, body, status = 200) => route.fulfill({status, contentType:'application/json', body:JSON.stringify(body)});
const hash = char => char.repeat(64);
const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF');
const actionNames = ['recommend','approve','invoice','receive','receiptAcceptance','prepareSettlement','approveSettlement','confirmSettlement','cancel','reverse','prepareRecovery','approveRecovery','confirmRecovery','acceptance'];
const people = ['maker','recommender','receiver','accountant','treasurer','acceptor','owner','author','signer'].map((accountId, index) => ({accountId, personId:'person-' + accountId, name:['منشئ تجريبي','موصي تجريبي','مستلم تجريبي','محاسب تجريبي','مؤكد تجريبي','قابل تجريبي','مالك تجريبي','محرر تجريبي','موقّع تجريبي'][index], procurementEligible:true, memberRole:accountId === 'owner' ? 'OWNER' : ['acceptor','author','signer'].includes(accountId) ? 'ADMIN' : 'STAFF'}));
people.push({accountId:'viewer',personId:'person-viewer',name:'قارئ دون تفويض',procurementEligible:false,memberRole:'VIEWER'});
const rawTerms = {
  purpose:'F08_PROCUREMENT_CONTRACT_V1', purchaseReference:'PO-F08-1', supplierDocumentId:'supplier-1', supplierDocumentHash:hash('a'), currency:'SAR', totalMinor:7450,
  procurementMethod:'اتفاقية توريد مرنة', procurementSystem:'إثباتات الجهة الخاصة', integrationMode:'EXTERNAL_REFERENCE_ONLY', integrationReference:'EXT-CASE-1',
  validFrom:'2026-01-01', validUntil:'2030-12-31', ...Object.fromEntries(['maker','recommender','receiver','accountant','treasurer','acceptor'].map(role => [role + 'AccountId', role])),
  lines:[{lineId:'line-1',description:'أسطوانات تدريب',quantity:3,unitPriceMinor:1000,taxMinor:450,taxTreatment:'TAXABLE',taxReason:'ضريبة مصرح بها في الاتفاق'}, {lineId:'line-2',description:'خدمة تجهيز',quantity:2,unitPriceMinor:2000,taxMinor:0,taxTreatment:'EXEMPT',taxReason:'إعفاء موثق'}],
  settlementPolicy:'FULL_ORDER_AFTER_RECEIPT_ACCEPTANCE', cancellationPolicy:'BEFORE_ANY_EFFECT', cancellationTerms:'الإلغاء قبل الأثر فقط حسب الاتفاق',
  reversalPolicy:'FULL_ORDER_RETURN_AND_RECOVERY', reversalTerms:'إعادة الكميات المستلمة واسترداد المدفوع', acceptanceMethod:'مراجعة مستقلة عن بعد'
};
const document = (id, purpose, payload, digest = 'c') => ({id, purpose, payload, title:'مستند ' + id, referenceNumber:'REF-' + id, version:2, hash:hash(digest), kind:payload.kind || null, valid:true, reviewReasons:[]});
const supplier = document('supplier-1','F08_PROCUREMENT_SUPPLIER_V1',{purpose:'F08_PROCUREMENT_SUPPLIER_V1',supplierName:'مورد تجريبي معزول',supplierRef:'SUP-1',supplierAcceptanceRef:'QUAL-1',validUntil:'2030-12-31',scope:'توريد تجريبي'},'a');
const contract = document('contract-1','F08_PROCUREMENT_CONTRACT_V1',rawTerms,'b');
const templates = ['SUPPLIER','CONTRACT','EVIDENCE'].map((name, i) => ({id:'template-' + name.toLowerCase(),code:'F08-PROCUREMENT-' + name + '-V1',title:'نموذج ' + name,version:1,department:'INVENTORY_LOGISTICS',fields:[{key:'purpose',labelAr:'الغرض',type:'TEXT',required:true}]}));
const evidence = (id, kind, extra = {}) => document(id, 'F08_PROCUREMENT_EVIDENCE_V1', {purpose:'F08_PROCUREMENT_EVIDENCE_V1',kind,orderId:'po-1',contractHash:hash('b'),reference:'ORIGINAL-' + id,occurredAt:'2026-01-02T10:00:00Z',findings:'نتيجة تحقق محفوظة',...extra});
const initialOrder = () => ({
  id:'po-1',organizationId:'org-1',purchaseReference:'PO-F08-1',status:'REQUESTED',revision:1,digest:hash('0'),receiptDigest:hash('3'),completionDigest:hash('4'),currency:'SAR',amountMinor:7450,
  terms:{...structuredClone(rawTerms),participants:Object.fromEntries(['maker','recommender','receiver','accountant','treasurer','acceptor'].map(role => [role,role]))},
  contract:{id:'contract-1',version:2,hash:hash('b'),referenceNumber:'CONTRACT-1',title:'عقد الجهة الأصلي'},
  supplier:{id:'supplier-1',version:2,hash:hash('a'),referenceNumber:'SUPPLIER-1',name:'مورد تجريبي معزول',supplierRef:'SUP-1'},
  participants:Object.fromEntries(['maker','recommender','receiver','accountant','treasurer','acceptor'].map(role => [role,people.find(person => person.accountId === role)])), owner:people.find(person => person.accountId === 'owner'),
  lines:rawTerms.lines.map(line => ({...line,subtotalMinor:line.quantity*line.unitPriceMinor,totalMinor:line.quantity*line.unitPriceMinor+line.taxMinor,receivedQuantity:0,remainingQuantity:line.quantity,returnedQuantity:0})),
  recommendation:null,approval:null,invoice:null,invoiceSnapshot:null,receiptAcceptance:null,reversal:null,
  totals:{amountMinor:7450,settledMinor:0,recoveredMinor:0,netPaidMinor:0,remainingMinor:7450,recoveryRequiredMinor:0}, receipts:[],moneyProofs:[],
  acceptance:{document:null,valid:false,reason:null,scope:'ORDER_EVIDENCE',globalClosureGranted:false,actorAccountId:null,actorName:null,acceptedAt:null},
  integrity:{valid:true,reviewReasons:[]},events:[{id:'event-1',action:'CREATE',actorAccountId:'maker',beforeRevision:0,afterRevision:1,evidenceHash:hash('f'),createdAt:'2026-01-01T10:00:00Z'}],createdAt:'2026-01-01T10:00:00Z',updatedAt:'2026-01-01T10:00:00Z'
});

async function install(page, options = {}) {
  const state = {
    actor:options.actor || 'maker', organizationName:options.organizationName || 'جهة تجريبية مستقلة', canCreate:options.canCreate ?? true, createDocuments:options.createDocuments ?? true,
    allowed:options.allowed || [], order:initialOrder(), orders:options.empty ? [] : ['po-1'], documents:{suppliers:[supplier],contracts:[contract],evidence:[]},
    templates:structuredClone(templates), calls:[],drafts:[],attachments:[],savedDocuments:[],workspacePromise:null,detailPromise:null,onWrite:null,onDocument:null,...options
  };
  const membership = orgId => ({id:'member-' + orgId,organizationId:orgId,role:'OWNER',status:'ACTIVE',organization:{id:orgId,displayName:orgId === 'org-1' ? state.organizationName : 'الجهة الثانية',kind:'COMPANY',status:'ACTIVE'}});
  const workspace = orgId => ({organization:{id:orgId,displayName:orgId === 'org-1' ? state.organizationName : 'الجهة الثانية',ownerAccountId:'owner'},actor:people.find(person => person.accountId === state.actor),
    capabilities:{installTemplates:{allowed:state.actor === 'owner',reason:null},createDocuments:{allowed:state.createDocuments,reason:null},create:{allowed:state.canCreate && state.actor === 'maker',reason:null}},
    participants:people,documents:state.documents,templates:state.templates,financeAccounts:[{id:'finance-1',name:'حساب تشغيل الجهة',currency:'SAR'}],
    orders:state.orders.map(id => ({id,purchaseReference:state.order.purchaseReference,status:state.order.status,revision:state.order.revision,amountMinor:state.order.amountMinor,currency:'SAR'}))});
  const detail = () => ({...state.order,actions:Object.fromEntries(actionNames.map(key => [key,{allowed:state.allowed.includes(key),reason:state.allowed.includes(key)?null:'The current source state and named authority do not permit this action.'}]))});
  state.workspace = workspace; state.detail = detail;
  await page.route('**/api/v1/**', route => respond(route, []));
  await page.route(/\/api\/v1\/me$/, route => respond(route,{id:state.actor,email:state.actor+'@example.invalid',status:'ACTIVE',person:{firstName:'ممثل',lastName:'الجهة'},roleAssignments:[{role:'ORGANIZATION',status:'ACTIVE'}]}));
  await page.route('**/organizations/mine', route => respond(route,[membership('org-1'),membership('org-2')]));
  await page.route('**/documents/workspace', route => respond(route,[membership('org-1'),membership('org-2')]));
  await page.route(/\/documents\/organizations\/(org-1|org-2)\/templates$/, route => respond(route,state.templates));
  await page.route(/\/documents\/organizations\/(org-1|org-2)\/list$/, route => respond(route,state.savedDocuments));
  await page.route(/\/documents\/organizations\/(org-1|org-2)\/inventory$/, route => {
    const orgId = new URL(route.request().url()).pathname.split('/').at(-2);
    return respond(route,{organizationId:orgId,internalPlatform:false,observedAt:'2026-01-01T10:00:00Z',departments:[{code:'INVENTORY_LOGISTICS',nameAr:'المشتريات',summary:{types:3,noRecord:0,pendingApproval:0},items:state.templates.map(template => ({code:template.code,titleAr:template.title,activeTemplateId:template.id,templateStatus:'READY',recordStatus:'RECORDED',total:1,counts:{DRAFT:1,PENDING_APPROVAL:0,APPROVED:0,SIGNED:0,ARCHIVED:0}}))}]});
  });
  await page.route(/\/api\/v1\/documents$/, async route => {
    const body = route.request().postDataJSON(); state.drafts.push(body);
    const saved = {id:'draft-' + state.drafts.length,organizationId:body.organizationId,templateId:body.templateId,contentHash:body.contentHash,payload:body.payload,department:body.department,status:'DRAFT',version:1,createdByAccountId:state.actor,referenceNumber:'DRAFT-' + state.drafts.length,template:{...state.templates.find(row => row.id === body.templateId),titleAr:'المستند المحفوظ'}};
    state.savedDocuments.push(saved);
    if (state.onDocument) return state.onDocument(route,body,saved);
    return respond(route,saved,201);
  });
  await page.route(/\/documents\/[^/]+\/attachments$/, route => {
    if (route.request().method() === 'POST') { state.attachments.push({path:new URL(route.request().url()).pathname,body:route.request().postDataJSON()}); return respond(route,{id:'attachment-1'}); }
    return respond(route,[{id:'attachment-1',filename:'supplier-original.pdf',mimeType:'application/pdf',byteSize:pdf.length,sha256:hash('d')}]);
  });
  await page.route(/\/documents\/[^/]+\/(pdf|attachments\/attachment-1)$/, route => route.fulfill({contentType:'application/pdf',body:pdf}));
  await page.route(/\/organizations\/(org-1|org-2)\/procurement\//, async route => {
    const path = new URL(route.request().url()).pathname, orgId = path.split('/organizations/')[1].split('/')[0], action = path.split('/procurement/')[1];
    if (route.request().method() === 'GET') {
      if (action === 'workspace') { if (state.workspacePromise) await state.workspacePromise; return respond(route,state.workspaceResponse || workspace(orgId)); }
      if (action === 'orders/po-1') { if (state.detailPromise) await state.detailPromise; return respond(route,detail()); }
      return respond(route,{message:'Missing fixture'},404);
    }
    const body = route.request().postDataJSON(); state.calls.push({orgId,action,body});
    if (state.onWrite) return state.onWrite(route,action,body);
    if (action === 'templates/install') { state.templates = structuredClone(templates); return respond(route,{templates:state.templates}); }
    if (action === 'orders') { state.orders = ['po-1']; state.canCreate = false; return respond(route,{...detail(),command:{requestId:body.requestId,eventId:'created',replayed:false}},201); }
    state.order.revision++; state.order.digest = hash(String(state.order.revision % 10));
    return respond(route,{...detail(),command:{requestId:body.requestId,eventId:'event-' + state.order.revision,replayed:false}});
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => window.HydrolandAuth && window.HydrolandProfile && window.HydrolandOrganizations && window.HydrolandOrganizationProcurement);
  await page.evaluate(async actor => { window.HydrolandAuth.acceptSession({accessToken:'f08-' + actor,refreshToken:'f08-refresh'},window.HydrolandAuth.beginAuthAttempt()); await window.HydrolandProfile.load(); },state.actor);
  await openWorkspaceSwitcher(page); await page.locator('#role-dialog [data-role="organization"]').click();
  await expect(page.locator('.hl-role-dashboard[data-role="organization"]')).toBeVisible();
  await page.locator('.hl-role-dashboard[data-role="organization"] [data-action-label="بيانات الجهات"]').click();
  await page.locator('[data-org-id="org-1"] [data-org-procurement-open]').click();
  await expect(page.getByRole('dialog',{name:'مشتريات الجهة'})).toBeVisible();
  return state;
}
const dialog = page => page.locator('.hl-org-procurement');
async function order(page) { await dialog(page).locator('[data-procurement-order="po-1"]').click(); await expect(dialog(page).locator('[data-procurement-detail]')).toContainText('PO-F08-1'); }
async function actor(page,state,name,allowed) {
  state.actor = name; state.allowed = allowed;
  await page.evaluate(async name => { window.HydrolandAuth.acceptSession({accessToken:'f08-' + name,refreshToken:'f08-refresh'},window.HydrolandAuth.beginAuthAttempt()); await window.HydrolandProfile.load(); window.HydrolandOrganizationProcurement.open({organizationId:'org-1'}); },name);
  await order(page);
}
const evidenceRef = doc => ({id:doc.id,version:doc.version,hash:doc.hash,referenceNumber:doc.referenceNumber});

test('organization entry loads only its workspace and installs missing templates only on explicit action',async({page}) => {
  const state = await install(page,{actor:'owner',templates:[],empty:true});
  await expect(dialog(page)).toContainText('جهة تجريبية مستقلة'); expect(state.calls).toEqual([]);
  await dialog(page).getByRole('button',{name:'حفظ نماذج المشتريات',exact:true}).click();
  await expect(dialog(page).getByRole('button',{name:'إنشاء مسودة عقد',exact:true})).toBeVisible();
  expect(state.calls).toEqual([{orgId:'org-1',action:'templates/install',body:{}}]);
});

test('guided contract draft selects scoped people and supplier, preserves flexible terms and converts explicit SAR values',async({page}) => {
  const state = await install(page,{actor:'author',empty:true});
  await dialog(page).getByRole('button',{name:'إنشاء مسودة عقد',exact:true}).click();
  const form = dialog(page).locator('[data-procurement-draft="contract"]');
  await form.getByLabel('مستند تأهيل المورد الموقّع',{exact:true}).selectOption('supplier-1');
  await form.getByLabel('مرجع أمر الشراء',{exact:true}).fill('FLEX-7');
  await form.getByLabel('طريقة المشتريات المتفق عليها',{exact:true}).fill('اتفاق خاص متعدد البنود');
  await form.getByLabel('نظام أو وسيلة التبادل المتفق عليها',{exact:true}).fill('النظام الداخلي المختار');
  await form.getByLabel('حدود الربط',{exact:true}).selectOption('EXTERNAL_REFERENCE_ONLY');
  await form.getByLabel('مرجع العملية الخارجية',{exact:true}).fill('EXT-42');
  await form.getByLabel('سريان التفويض من',{exact:true}).fill('2026-01-01'); await form.getByLabel('سريان التفويض حتى',{exact:true}).fill('2030-12-31');
  for (const role of ['maker','recommender','receiver','accountant','treasurer','acceptor']) await form.locator('select[name="' + role + '"]').selectOption(role);
  await expect(form.locator('select[name="maker"] option[value="viewer"]')).toHaveCount(0);
  const row = form.locator('[data-procurement-line-editor]').first();
  await row.getByLabel('الوصف',{exact:true}).fill('توريد محدد'); await row.getByLabel('الكمية',{exact:true}).fill('2');
  await row.getByLabel('سعر الوحدة (ر.س)',{exact:true}).fill('15.25'); await row.getByLabel('ضريبة البند (ر.س)',{exact:true}).fill('4.50');
  await row.getByLabel('المعاملة الضريبية',{exact:true}).selectOption('TAXABLE'); await row.getByLabel('أساس المعاملة الضريبية',{exact:true}).fill('ضريبة الأصل الصريحة');
  await form.getByLabel('سياسة الإلغاء',{exact:true}).selectOption('BEFORE_ANY_EFFECT'); await form.getByLabel('الشروط الفعلية للإلغاء',{exact:true}).fill('شرط إلغاء مخصص');
  await form.getByLabel('سياسة العكس والاسترداد',{exact:true}).selectOption('FULL_ORDER_RETURN_AND_RECOVERY'); await form.getByLabel('الشروط الفعلية للعكس والاسترداد',{exact:true}).fill('شرط عكس مخصص');
  await form.getByLabel('طريقة القبول المستقل',{exact:true}).fill('عن بعد وفق مراجعة مستقلة');
  await row.screenshot({animations:'disabled',path:test.info().outputPath('f08-contract-explicit-tax.png')});
  await form.getByRole('button',{name:'حفظ المسودة',exact:true}).click();
  await expect(dialog(page).getByRole('button',{name:'افتح المسودة المحفوظة',exact:true})).toBeVisible();
  expect(state.drafts).toHaveLength(1); const saved = state.drafts[0];
  expect(saved).toMatchObject({organizationId:'org-1',templateId:'template-contract',department:'INVENTORY_LOGISTICS',payload:{supplierDocumentId:'supplier-1',supplierDocumentHash:hash('a'),totalMinor:3500,currency:'SAR',integrationMode:'EXTERNAL_REFERENCE_ONLY',integrationReference:'EXT-42',makerAccountId:'maker',treasurerAccountId:'treasurer',acceptorAccountId:'acceptor',acceptanceMethod:'عن بعد وفق مراجعة مستقلة'}});
  expect(saved.payload.lines).toEqual([{lineId:'line-1',description:'توريد محدد',quantity:2,unitPriceMinor:1525,taxMinor:450,taxTreatment:'TAXABLE',taxReason:'ضريبة الأصل الصريحة'}]);
  expect(saved.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/); expect(state.calls).toEqual([]);
  await dialog(page).getByRole('button',{name:'افتح المسودة المحفوظة',exact:true}).click();
  await expect(page.locator('.hl-documents [data-document-id="draft-1"]')).toBeFocused();
  await expect(page.locator('.hl-documents [data-doc-org]')).toHaveValue('org-1');
});

test('creating the purchase order binds only the reviewed signed contract version and hash',async({page}) => {
  const state = await install(page,{empty:true});
  await dialog(page).locator('summary').filter({hasText:'إنشاء طلب من العقد الموقّع'}).click();
  const form = dialog(page).locator('[data-procurement-create]'); await form.getByLabel('العقد الموقّع',{exact:true}).selectOption('contract-1');
  await expect(form).toContainText('اتفاقية توريد مرنة'); await expect(form).toContainText('قابل تجريبي');
  await form.getByRole('button',{name:'إنشاء أمر الشراء',exact:true}).click(); expect(state.calls).toEqual([]);
  await form.locator('input[name="accepted"]').check(); await form.getByRole('button',{name:'إنشاء أمر الشراء',exact:true}).click();
  await expect(dialog(page).locator('[data-procurement-detail]')).toContainText('PO-F08-1');
  expect(state.calls[0]).toMatchObject({orgId:'org-1',action:'orders',body:{contractDocumentId:'contract-1',contractVersion:2,contractHash:hash('b')}});
  expect(Object.keys(state.calls[0].body).sort()).toEqual(['contractDocumentId','contractHash','contractVersion','requestId']);
});

test('senior approval shows the procurement recommendation before a separate decision, with no invented authority',async({page}) => {
  const state = await install(page,{actor:'owner',allowed:['approve']}); state.order.status = 'RECOMMENDED'; state.order.recommendation = {decision:'DECLINE',note:'الكمية غير مناسبة للاحتياج',actorAccountId:'recommender',occurredAt:'2026-01-01T12:00:00Z'};
  await order(page); await expect(dialog(page).locator('[data-procurement-detail]')).toContainText('الكمية غير مناسبة للاحتياج');
  await expect(dialog(page).locator('[data-procurement-action="recommend"]')).toHaveCount(0);
  const form = dialog(page).locator('[data-procurement-action="approve"]'); await form.getByLabel('قرار الإدارة العليا',{exact:true}).selectOption('DECLINE'); await form.getByLabel('مسوغات القرار',{exact:true}).fill('أوافق على توصية الرفض');
  await form.getByRole('button',{name:'قرار الإدارة العليا',exact:true}).click(); await expect(dialog(page).getByRole('status')).toHaveText('تم حفظ الإجراء.');
  expect(state.calls[0].body).toMatchObject({expectedRevision:1,expectedDigest:hash('0'),decision:'DECLINE',note:'أوافق على توصية الرفض'});
});

test('signed evidence selection excludes a different order and requires deliberate review',async({page}) => {
  const good = evidence('invoice-1','INVOICE',{amountMinor:7450,currency:'SAR',lines:rawTerms.lines}), foreign = evidence('invoice-foreign','INVOICE',{orderId:'other-order'});
  const state = await install(page,{actor:'accountant',allowed:['invoice']}); state.order.status = 'APPROVED'; state.documents.evidence = [good,foreign];
  await dialog(page).getByRole('button',{name:'تحديث',exact:true}).click(); await order(page); const form = dialog(page).locator('[data-procurement-action="invoice"]');
  await expect(form.locator('option[value="invoice-foreign"]')).toHaveCount(0); await form.getByLabel('المستند الموقّع',{exact:true}).selectOption('invoice-1');
  await form.getByRole('button',{name:'تسجيل الفاتورة',exact:true}).click(); expect(state.calls).toEqual([]);
  await form.locator('input[name="reviewed"]').check(); await form.getByRole('button',{name:'تسجيل الفاتورة',exact:true}).click();
  await expect(dialog(page).getByRole('status')).toHaveText('تم حفظ الإجراء.'); expect(state.calls[0].body).toMatchObject({documentId:'invoice-1',documentVersion:2,documentHash:hash('c')});
});

test('financial evidence is prepared by another person and binds the approved native entry with an original PDF',async({page}) => {
  const state = await install(page,{actor:'treasurer',allowed:['confirmSettlement']}); state.order.status = 'APPROVED'; state.order.moneyProofs = [{id:'proof-1',kind:'SETTLEMENT',status:'APPROVED',financeEntryId:'entry-1',financeEntryStatus:'APPROVED',amountMinor:7450,currency:'SAR',preparedByAccountId:'accountant',approvedByAccountId:'owner',document:null}];
  await order(page); await dialog(page).locator('summary').filter({hasText:'تجهيز إثبات مرتبط بالطلب'}).click();
  await expect(dialog(page)).toContainText('يجهز شخص آخر دليل التنفيذ المالي'); await expect(dialog(page).locator('select[name="evidenceKind"] option[value="SETTLEMENT"]')).toHaveCount(0);
  await actor(page,state,'author',[]); await dialog(page).locator('summary').filter({hasText:'تجهيز إثبات مرتبط بالطلب'}).click();
  await dialog(page).getByLabel('نوع الإثبات',{exact:true}).selectOption('SETTLEMENT'); await dialog(page).getByRole('button',{name:'تجهيز المسودة',exact:true}).click();
  const form = dialog(page).locator('[data-procurement-draft="evidence"]'); await form.getByLabel('مرجع المستند الأصلي',{exact:true}).fill('BANK-ORIGINAL-1');
  await form.getByLabel('وقت الواقعة (بتوقيت السعودية)',{exact:true}).fill('2026-01-02T13:00'); await form.getByLabel('نتيجة التحقق والسبب',{exact:true}).fill('مطابقة أصل التنفيذ الخارجي');
  await form.getByLabel('اسم البنك',{exact:true}).fill('بنك تجريبي'); await form.getByLabel('مرجع التنفيذ البنكي',{exact:true}).fill('BANK-REF-1');
  await form.getByRole('button',{name:'حفظ المسودة',exact:true}).click(); expect(state.drafts).toEqual([]);
  await form.getByLabel('إرفاق الأصل PDF',{exact:true}).setInputFiles({name:'bank-proof.pdf',mimeType:'application/pdf',buffer:pdf}); await form.getByRole('button',{name:'حفظ المسودة',exact:true}).click();
  await expect(dialog(page).getByRole('button',{name:'افتح المسودة المحفوظة',exact:true})).toBeVisible();
  expect(state.drafts[0].payload).toMatchObject({kind:'SETTLEMENT',orderId:'po-1',contractHash:hash('b'),financeEntryId:'entry-1',amountMinor:7450,currency:'SAR',occurredAt:'2026-01-02T10:00:00.000Z',bankName:'بنك تجريبي',bankReference:'BANK-REF-1'});
  expect(state.attachments[0].body).toMatchObject({filename:'bank-proof.pdf',mimeType:'application/pdf'}); expect(Buffer.from(state.attachments[0].body.base64,'base64')).toEqual(pdf);
});

test('lost action response reuses the reviewed command while edited grounds receive a new request key',async({page}) => {
  const state = await install(page,{actor:'recommender',allowed:['recommend']}); state.onWrite = route => route.abort('failed'); await order(page);
  const form = dialog(page).locator('[data-procurement-action="recommend"]'); await form.getByLabel('توصية المشتريات',{exact:true}).selectOption('APPROVE'); await form.getByLabel('مسوغات القرار',{exact:true}).fill('مطابقة الاحتياج');
  const submit = () => form.getByRole('button',{name:'توصية المشتريات',exact:true}).click();
  await submit(); await expect(dialog(page).getByRole('status')).not.toHaveText('جارٍ حفظ الإجراء…'); await submit(); await expect.poll(() => state.calls.length).toBe(2);
  expect(state.calls[0].body).toEqual(state.calls[1].body);
  await expect(dialog(page).getByRole('status')).not.toHaveText('جارٍ حفظ الإجراء…'); await form.getByLabel('مسوغات القرار',{exact:true}).fill('سبب جديد بعد المراجعة'); await submit(); await expect.poll(() => state.calls.length).toBe(3);
  expect(state.calls[2].body.requestId).not.toBe(state.calls[0].body.requestId);
});

test('a stale decision blocks another write until the current order is reviewed again',async({page}) => {
  const state = await install(page,{actor:'owner',allowed:['approve']}); state.onWrite = route => respond(route,{message:'stale'},409); await order(page);
  const form = dialog(page).locator('[data-procurement-action="approve"]'); await form.getByLabel('قرار الإدارة العليا',{exact:true}).selectOption('APPROVE'); await form.getByLabel('مسوغات القرار',{exact:true}).fill('القرار الأول'); await form.getByRole('button',{name:'قرار الإدارة العليا',exact:true}).click();
  await expect(dialog(page).getByRole('status')).toContainText('تغيّرت بيانات الطلب'); expect(await form.evaluate(node => node.inert)).toBe(true);
  state.order.revision = 4; state.order.digest = hash('4'); state.onWrite = null;
  await dialog(page).getByRole('button',{name:'تحديث التفاصيل',exact:true}).click();
  await form.getByLabel('قرار الإدارة العليا',{exact:true}).selectOption('APPROVE'); await form.getByLabel('مسوغات القرار',{exact:true}).fill('قرار بعد تحديث الدليل'); await form.getByRole('button',{name:'قرار الإدارة العليا',exact:true}).click();
  await expect(dialog(page).getByRole('status')).toHaveText('تم حفظ الإجراء.'); expect(state.calls[1].body).toMatchObject({expectedRevision:4,expectedDigest:hash('4')});
});

test('unverified financial sources display unavailable amounts and do not offer writes',async({page}) => {
  const state = await install(page,{actor:'owner',allowed:[]}); state.order.integrity = {valid:false,reviewReasons:['The native finance entry changed.']};
  state.order.totals = {amountMinor:7450,settledMinor:null,recoveredMinor:null,netPaidMinor:null,remainingMinor:null,recoveryRequiredMinor:null}; state.order.moneyProofs = [{id:'proof',kind:'SETTLEMENT',status:'CONFIRMED',financeEntryId:'entry-1',amountMinor:7450,preparedByAccountId:'accountant',document:null}];
  await order(page); await expect(dialog(page).locator('[data-procurement-totals]')).toContainText('البيانات غير متاحة'); await expect(dialog(page).locator('[data-procurement-action]')).toHaveCount(0);
  await dialog(page).locator('summary').filter({hasText:'إثباتات التنفيذ المالي'}).click(); await expect(dialog(page).getByText('تنفيذ خارجي مؤكد',{exact:true})).toHaveCount(0);
});

for (const boundary of ['logout','organization']) test('late details cannot cross the ' + boundary + ' boundary',async({page}) => {
  const state = await install(page); let release; state.detailPromise = new Promise(resolve => { release = resolve; });
  await dialog(page).locator('[data-procurement-order="po-1"]').click();
  if (boundary === 'logout') await page.evaluate(() => document.dispatchEvent(new Event('hydroland:session-cleared')));
  else await page.evaluate(() => window.HydrolandOrganizationProcurement.open({organizationId:'org-2'}));
  release();
  if (boundary === 'logout') { await expect(dialog(page)).not.toBeVisible(); await expect(dialog(page).locator('[data-procurement-detail]')).toHaveCount(0); }
  else { await expect(dialog(page)).toContainText('الجهة الثانية'); await expect(dialog(page).locator('[data-procurement-detail]')).not.toContainText('عقد الجهة الأصلي'); }
});

test('a mismatched organization response is rejected and opaque business names remain unchanged in English on mobile',async({page}) => {
  await page.setViewportSize({width:390,height:844}); const state = await install(page,{organizationName:'مشتريات الجهة <img src=x onerror=alert(1)>'}); await order(page);
  await page.evaluate(() => window.HydrolandI18n.setLocale('en')); await expect(dialog(page).getByRole('heading',{name:'Organization procurement',exact:true})).toBeVisible();
  await expect(dialog(page).locator('.hl-org-procurement-organization')).toHaveText('مشتريات الجهة <img src=x onerror=alert(1)>'); await expect(dialog(page).locator('.hl-org-procurement-organization img')).toHaveCount(0);
  expect(await dialog(page).evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await dialog(page).screenshot({animations:'disabled',path:test.info().outputPath('f08-procurement-mobile.png')});
  state.workspaceResponse = {...state.workspace('org-1'),organization:{id:'wrong-org',displayName:'private wrong organization'}};
  await dialog(page).getByRole('button',{name:'Refresh',exact:true}).click(); await expect(dialog(page).getByRole('status')).toContainText('could not be verified'); await expect(dialog(page)).not.toContainText('private wrong organization');
});

test('the procurement screens carry one order through invoice, partial receipts, independent settlement, reversal, recovery and final acceptance',async({page}) => {
  test.setTimeout(90000);
  const state = await install(page,{actor:'recommender',allowed:['recommend'],canCreate:false});
  const sources = [evidence('invoice','INVOICE',{amountMinor:7450,currency:'SAR',lines:rawTerms.lines}),
    evidence('receipt-a','RECEIPT',{quantities:[{lineId:'line-1',quantity:1}]}),evidence('receipt-b','RECEIPT',{quantities:[{lineId:'line-1',quantity:2},{lineId:'line-2',quantity:2}]}),
    evidence('receipt-acceptance','RECEIPT_ACCEPTANCE',{evidenceDigest:hash('3')}),evidence('settlement','SETTLEMENT',{financeEntryId:'settlement-entry',amountMinor:7450,currency:'SAR'}),
    evidence('reversal','REVERSAL',{amountMinor:7450,currency:'SAR',quantities:[{lineId:'line-1',quantity:3},{lineId:'line-2',quantity:2}]}),
    evidence('recovery','RECOVERY',{financeEntryId:'recovery-entry',amountMinor:7450,currency:'SAR'}),evidence('acceptance','FINAL_ACCEPTANCE',{evidenceDigest:hash('4')})];
  state.documents.evidence = sources;
  state.onWrite = (route, path, body) => {
    const order = state.order, action = path.slice('orders/po-1/'.length), source = sources.find(doc => doc.id === body.documentId), reference = source && evidenceRef(source);
    const decision = {decision:body.decision,note:body.note,actorAccountId:state.actor,occurredAt:'2026-01-02T10:00:00Z'};
    if (action === 'recommend') { order.recommendation = decision; order.status = 'RECOMMENDED'; }
    else if (action === 'approve') { order.approval = decision; order.status = 'APPROVED'; }
    else if (action === 'invoice') order.invoice = reference;
    else if (action === 'receipts') {
      for (const received of source.payload.quantities) { const line = order.lines.find(row => row.lineId === received.lineId); line.receivedQuantity += received.quantity; line.remainingQuantity -= received.quantity; }
      order.receipts.push({id:'receipt-' + order.receipts.length,document:reference,lines:source.payload.quantities,receivedByAccountId:'receiver',createdAt:'2026-01-02T10:00:00Z'});
    } else if (action === 'receipt-acceptance') order.receiptAcceptance = reference;
    else if (action === 'settlement/prepare' || action === 'recovery/prepare') {
      const kind = action.startsWith('settlement') ? 'SETTLEMENT' : 'RECOVERY'; order.moneyProofs.push({id:kind+'-proof',kind,status:'PREPARED',financeEntryId:kind.toLowerCase()+'-entry',financeEntryStatus:'PENDING_APPROVAL',amountMinor:7450,currency:'SAR',preparedByAccountId:'accountant',approvedByAccountId:null,confirmedByAccountId:null,document:null});
    } else if (action === 'settlement/approve' || action === 'recovery/approve') {
      const proof = order.moneyProofs.find(row => row.kind === (action.startsWith('settlement') ? 'SETTLEMENT' : 'RECOVERY')); proof.status = 'APPROVED'; proof.financeEntryStatus = 'APPROVED'; proof.approvedByAccountId = 'owner';
    } else if (action === 'settlement/confirm' || action === 'recovery/confirm') {
      const settlement = action.startsWith('settlement'), proof = order.moneyProofs.find(row => row.kind === (settlement ? 'SETTLEMENT' : 'RECOVERY'));
      Object.assign(proof,{status:'CONFIRMED',financeEntryStatus:'POSTED',document:reference,confirmedByAccountId:'treasurer',confirmedAt:'2026-01-02T12:00:00Z'});
      order.status = settlement ? 'SETTLED' : 'RECOVERED'; order.totals.settledMinor = 7450; order.totals.recoveredMinor = settlement ? 0 : 7450; order.totals.netPaidMinor = settlement ? 7450 : 0; order.totals.remainingMinor = 0; order.totals.recoveryRequiredMinor = 0;
    } else if (action === 'reverse') { order.status = 'RECOVERY_REQUIRED'; order.reversal = reference; order.totals.recoveryRequiredMinor = 7450; for (const line of order.lines) line.returnedQuantity = line.receivedQuantity; }
    else if (action === 'acceptance') order.acceptance = {document:reference,valid:true,reason:null,scope:'ORDER_EVIDENCE',globalClosureGranted:false,actorAccountId:'acceptor',actorName:'قابل تجريبي',acceptedAt:'2026-01-02T13:00:00Z'};
    order.revision++; order.digest = hash(String(order.revision % 10));
    order.events.push({id:'event-' + order.revision,action:action.toUpperCase().replaceAll('/','_').replaceAll('-','_'),actorAccountId:state.actor,beforeRevision:order.revision-1,afterRevision:order.revision,evidenceHash:hash('e'),createdAt:'2026-01-02T12:00:00Z'});
    return respond(route,{...state.detail(),command:{requestId:body.requestId,eventId:'event-' + order.revision,replayed:false}});
  };
  async function step(who, key, sourceId) {
    await actor(page,state,who,[key]); const revision = state.order.revision, digest = state.order.digest;
    const form = dialog(page).locator('[data-procurement-action="' + key + '"]');
    if (['recommend','approve','approveSettlement','approveRecovery'].includes(key)) { await form.locator('select[name="decision"]').selectOption('APPROVE'); await form.locator('textarea[name="note"]').fill('قرار مستقل بعد مراجعة الدليل'); }
    else if (['prepareSettlement','prepareRecovery'].includes(key)) await form.locator('select[name="financeAccountId"]').selectOption('finance-1');
    else { await form.locator('select[name="documentId"]').selectOption(sourceId); await form.locator('input[name="reviewed"]').check(); }
    await form.locator('button[type="submit"]').click(); await expect(dialog(page).getByRole('status')).toHaveText('تم حفظ الإجراء.');
    expect(state.calls.at(-1).body).toMatchObject({expectedRevision:revision,expectedDigest:digest});
  }
  await step('recommender','recommend'); await step('owner','approve'); await step('accountant','invoice','invoice');
  await step('receiver','receive','receipt-a'); expect(state.order.lines[0]).toMatchObject({receivedQuantity:1,remainingQuantity:2}); expect(state.order.totals.settledMinor).toBe(0);
  await step('receiver','receive','receipt-b'); await step('acceptor','receiptAcceptance','receipt-acceptance');
  await step('accountant','prepareSettlement'); await step('owner','approveSettlement'); await step('treasurer','confirmSettlement','settlement');
  await expect(dialog(page).locator('[data-procurement-detail]')).toContainText('تمت التسوية');
  await page.setViewportSize({width:1280,height:960}); await dialog(page).locator('[data-procurement-detail]').evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));
  await dialog(page).screenshot({animations:'disabled',path:test.info().outputPath('f08-settlement-desktop.png')});
  await step('owner','reverse','reversal'); await expect(dialog(page).locator('[data-procurement-detail]')).toContainText('بانتظار استرداد المبلغ');
  await step('accountant','prepareRecovery'); await step('owner','approveRecovery'); await step('treasurer','confirmRecovery','recovery');
  await step('acceptor','acceptance','acceptance'); await expect(dialog(page).locator('[data-procurement-detail]')).toContainText('القبول النهائي مسجّل');
  await expect(dialog(page).locator('[data-procurement-detail]')).toContainText('هذا قبول لأدلة الطلب المسجلة.');
  await page.setViewportSize({width:390,height:844});
  await dialog(page).getByRole('heading',{name:'قبول أدلة هذا الطلب',exact:true}).locator('..').screenshot({animations:'disabled',path:test.info().outputPath('f08-independent-acceptance-mobile.png')});
  expect(state.order.totals).toMatchObject({settledMinor:7450,recoveredMinor:7450,netPaidMinor:0,remainingMinor:0,recoveryRequiredMinor:0});
  expect(state.calls.map(row => row.action)).toEqual(['recommend','approve','invoice','receipts','receipts','receipt-acceptance','settlement/prepare','settlement/approve','settlement/confirm','reverse','recovery/prepare','recovery/approve','recovery/confirm','acceptance'].map(path => 'orders/po-1/' + path));
});

test('a reversal draft returns only actually received quantities and records explicit zero before settlement',async({page}) => {
  const state = await install(page,{actor:'author',canCreate:false}); state.order.status = 'APPROVED'; state.order.lines[0].receivedQuantity = 1; state.order.lines[0].remainingQuantity = 2;
  state.order.receipts = [{id:'receipt-1',document:{id:'receipt-source',referenceNumber:'REC-1',version:1},lines:[{lineId:'line-1',quantity:1}],receivedByAccountId:'receiver',createdAt:'2026-01-01T10:00:00Z'}];
  await order(page); await dialog(page).locator('summary').filter({hasText:'تجهيز إثبات مرتبط بالطلب'}).click(); await dialog(page).getByLabel('نوع الإثبات',{exact:true}).selectOption('REVERSAL'); await dialog(page).getByRole('button',{name:'تجهيز المسودة',exact:true}).click();
  const form = dialog(page).locator('[data-procurement-draft="evidence"]'); await form.getByLabel('مرجع المستند الأصلي',{exact:true}).fill('RETURN-1'); await form.getByLabel('وقت الواقعة (بتوقيت السعودية)',{exact:true}).fill('2026-01-02T13:00'); await form.getByLabel('نتيجة التحقق والسبب',{exact:true}).fill('إعادة كامل المستلم قبل دفع أي مبلغ');
  await form.getByLabel('إرفاق الأصل PDF',{exact:true}).setInputFiles({name:'return.pdf',mimeType:'application/pdf',buffer:pdf}); await form.getByRole('button',{name:'حفظ المسودة',exact:true}).click();
  await expect(dialog(page).getByRole('button',{name:'افتح المسودة المحفوظة',exact:true})).toBeVisible();
  expect(state.drafts[0].payload).toMatchObject({kind:'REVERSAL',amountMinor:0,quantities:[{lineId:'line-1',quantity:1}]}); expect(state.drafts[0].payload).not.toHaveProperty('lines');
});

for (const recoverable of [true,false]) test('lost document creation response ' + (recoverable ? 'recovers the saved draft' : 'blocks a blind duplicate') + ' without replaying POST documents',async({page}) => {
  const state = await install(page,{actor:'author',empty:true}); state.onDocument = route => { if (!recoverable) state.savedDocuments = []; return route.abort('failed'); };
  await dialog(page).getByRole('button',{name:'إنشاء مسودة تأهيل مورد',exact:true}).click(); const form = dialog(page).locator('[data-procurement-draft="supplier"]');
  for (const [name,value] of [['supplierName','مورد الإثبات'],['supplierRef','REF-LOST'],['supplierAcceptanceRef','ACCEPT-1'],['scope','نطاق محدد']]) await form.locator('[name="' + name + '"]').fill(value);
  await form.getByLabel('صالح حتى',{exact:true}).fill('2030-12-31'); await form.getByRole('button',{name:'حفظ المسودة',exact:true}).click();
  if (recoverable) await expect(dialog(page).getByRole('button',{name:'افتح المسودة المحفوظة',exact:true})).toBeVisible();
  else { await expect(dialog(page).getByRole('status')).toContainText('لم تُحسم نتيجة الحفظ'); await form.getByRole('button',{name:'حفظ المسودة',exact:true}).click(); }
  expect(state.drafts).toHaveLength(1); expect(state.calls).toEqual([]);
});
