import {test,expect} from '@playwright/test';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';

const PROTOCOL = 'HYDROLAND_PROCUREMENT_EXCHANGE_V1';
const json = (route,body,status = 200) => route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const copy = value => structuredClone(value);
const roleNames = {MAKER:'منشئ الطلب',RECOMMENDER:'الموصي',OWNER:'المعتمد',ACCOUNTANT:'المحاسب',RECEIVER:'المستلم',TREASURER:'مؤكد الحركة',ACCEPTOR:'القابل المستقل'};
const actionRoles = {RECOMMEND:'RECOMMENDER',APPROVE:'OWNER',INVOICE:'ACCOUNTANT',RECEIVE:'RECEIVER',RECEIPT_ACCEPTANCE:'ACCEPTOR',PREPARE_SETTLEMENT:'ACCOUNTANT',APPROVE_SETTLEMENT:'OWNER',CONFIRM_SETTLEMENT:'TREASURER',CANCEL:'OWNER',REVERSE:'OWNER',PREPARE_RECOVERY:'ACCOUNTANT',APPROVE_RECOVERY:'OWNER',CONFIRM_RECOVERY:'TREASURER',ACCEPTANCE:'ACCEPTOR'};
const lines = () => [{lineId:'line-1',description:'معدات اصطناعية للتجربة',quantity:3,unitPriceMinor:1000,taxMinor:450,taxTreatment:'TAXABLE',taxReason:'ضريبة صريحة للتجربة'},{lineId:'line-2',description:'مستلزمات اصطناعية للتجربة',quantity:2,unitPriceMinor:500,taxMinor:0,taxTreatment:'EXEMPT',taxReason:'إعفاء تجريبي'}];
const settings = () => ({revision:0,configHash:null,displayName:'HYDROLAND procurement API',protocol:PROTOCOL,endpoint:null,credentialRef:null,authMode:'BEARER',credentialOptions:[{ref:'supplier-test-reference',label:'مرجع اعتماد المورد التجريبي',configured:true},{ref:'pending-reference',label:'مرجع قيد الإعداد',configured:false}],state:'NOT_CONFIGURED',missing:['ENDPOINT_REQUIRED','CREDENTIAL_REFERENCE_REQUIRED'],lastCheck:null,connectionCheckCurrent:false,checkValiditySeconds:900,businessExchangeEnabled:false});
const message = kind => ({schemaVersion:PROTOCOL,messageId:'test-' + kind,kind,mode:'TEST',occurredAt:'2026-01-01T00:00:00Z',organizationReference:'SYNTHETIC-ORGANIZATION',purchaseReference:'TEST-PO',sourceRevision:1,sourceDigest:hash('source'),payload:kind === 'RECEIPT' ? {receiptReference:'TEST-RECEIPT',quantities:[{lineId:'line-1',quantity:1}]} : kind === 'REVERSAL' ? {returnReference:'TEST-RETURN',quantities:lines().map(line => ({lineId:line.lineId,quantity:line.quantity})),currency:'SAR',amountMinor:4450,reason:'Synthetic return'} : {currency:'SAR',[kind === 'INVOICE' ? 'invoiceReference' : 'supplierReference']:'TEST-REFERENCE',lines:lines(),totalMinor:4450}});
const contract = () => ({protocol:PROTOCOL,version:1,transport:{method:'GET',capabilitiesPath:'capabilities',authentication:['BEARER','API_KEY','NONE'],apiKeyHeader:'X-API-Key'},messageSchema:{type:'object',additionalProperties:false},examples:{purchaseOrder:message('PURCHASE_ORDER'),invoice:message('INVOICE'),receipt:message('RECEIPT'),reversal:message('REVERSAL')},capabilitiesResponseExample:{protocol:PROTOCOL,version:1,capabilities:['PURCHASE_ORDER','INVOICE','RECEIPT','REVERSAL'],currency:'SAR'},boundary:{businessWrites:false,liveConnectionRequiredForLab:false}});
function session(id = 'lab-1',source = lines()) {
  const amountMinor = source.reduce((sum,line) => sum + line.quantity * line.unitPriceMinor + line.taxMinor,0);
  return {id,scenario:'STANDARD_V1',synthetic:true,scope:'PROCUREMENT_LAB',revision:1,digest:hash(id + ':1'),status:'REQUESTED',currency:'SAR',realRepresentativeAcceptance:false,realFinancialEffects:false,externalTraffic:false,
    lines:source.map(line => ({...copy(line),receivedQuantity:0,remainingQuantity:line.quantity,returnedQuantity:0})),
    terms:{purchaseReference:'SIM-' + id,settlementPolicy:'FULL_ORDER_AFTER_RECEIPT_ACCEPTANCE',cancellationPolicy:'BEFORE_ANY_EFFECT',reversalPolicy:'FULL_ORDER_RETURN_AND_RECOVERY'},
    totals:{amountMinor,settledMinor:0,recoveredMinor:0,netPaidMinor:0,remainingMinor:amountMinor,recoveryRequiredMinor:0},recommendation:null,approval:null,invoice:null,receipts:[],receiptAcceptance:null,settlement:null,reversal:null,recovery:null,cancellation:null,simulatedLedger:[],
    acceptance:{document:null,valid:false,scope:'SIMULATION_ONLY',globalClosureGranted:false,realRepresentativeAcceptance:false},receiptDigest:hash('receipts:0'),completionDigest:hash('completion:0'),
    roles:Object.entries(roleNames).map(([id,labelAr]) => ({id,labelAr,labelEn:id})),events:[{id:'event-1',revision:1,action:'CREATE',role:'MAKER',occurredAt:'2026-01-01T10:00:00Z',digest:hash('event-1')}],createdAt:'2026-01-01T10:00:00Z',updatedAt:'2026-01-01T10:00:00Z'};
}
function projection(value) {
  const full = value.lines.every(line => line.remainingQuantity === 0), any = value.lines.some(line => line.receivedQuantity > 0), settled = value.settlement;
  const available = {RECOMMEND:value.status === 'REQUESTED',APPROVE:value.status === 'RECOMMENDED',INVOICE:value.status === 'APPROVED' && !value.invoice && !settled,RECEIVE:value.status === 'APPROVED' && !full && !settled,RECEIPT_ACCEPTANCE:value.status === 'APPROVED' && full && !value.receiptAcceptance && !settled,PREPARE_SETTLEMENT:value.status === 'APPROVED' && Boolean(value.invoice) && full && Boolean(value.receiptAcceptance) && (!settled || settled.status === 'REJECTED'),APPROVE_SETTLEMENT:settled?.status === 'PREPARED',CONFIRM_SETTLEMENT:settled?.status === 'APPROVED',CANCEL:['REQUESTED','RECOMMENDED','APPROVED'].includes(value.status) && !value.invoice && !any && !settled,REVERSE:['APPROVED','SETTLED'].includes(value.status) && !value.reversal && (Boolean(value.invoice) || any || Boolean(settled)),PREPARE_RECOVERY:value.status === 'RECOVERY_REQUIRED' && !value.recovery,APPROVE_RECOVERY:value.recovery?.status === 'PREPARED',CONFIRM_RECOVERY:value.recovery?.status === 'APPROVED',ACCEPTANCE:['SETTLED','REVERSED','RECOVERED'].includes(value.status) && !value.acceptance.valid};
  return {...copy(value),actions:Object.fromEntries(Object.entries(actionRoles).map(([key,role]) => [key,{allowed:Boolean(available[key]),role,reason:available[key] ? null : 'Complete the preceding simulation requirements before this action.'}]))};
}
function apply(value,body) {
  const {action,role,payload} = body, stamp = {simulated:true,role,recordedAt:new Date().toISOString()};
  if (action === 'RECOMMEND' || action === 'APPROVE') { value[action === 'RECOMMEND' ? 'recommendation' : 'approval'] = {...stamp,...payload}; value.status = action === 'RECOMMEND' ? 'RECOMMENDED' : payload.decision === 'DECLINE' ? 'DECLINED' : 'APPROVED'; }
  if (action === 'INVOICE') value.invoice = {...stamp,...copy(payload),currency:'SAR'};
  if (action === 'RECEIVE') { value.receipts.push({...stamp,id:'receipt-' + value.revision,...copy(payload)}); for (const quantity of payload.quantities) { const line = value.lines.find(line => line.lineId === quantity.lineId); line.receivedQuantity += quantity.quantity; line.remainingQuantity -= quantity.quantity; } }
  if (action === 'RECEIPT_ACCEPTANCE') value.receiptAcceptance = {...stamp,...payload};
  if (action === 'PREPARE_SETTLEMENT' || action === 'PREPARE_RECOVERY') { const kind = action === 'PREPARE_SETTLEMENT' ? 'SETTLEMENT' : 'RECOVERY', movement = {id:'movement-' + value.revision,simulated:true,kind,status:'PREPARED',amountMinor:value.totals.amountMinor,currency:'SAR',preparedByRole:'ACCOUNTANT',preparedAt:stamp.recordedAt}; value[kind === 'SETTLEMENT' ? 'settlement' : 'recovery'] = movement; value.simulatedLedger.push(movement); }
  if (action === 'APPROVE_SETTLEMENT' || action === 'APPROVE_RECOVERY') { const movement = value[action === 'APPROVE_SETTLEMENT' ? 'settlement' : 'recovery']; movement.approval = {...stamp,...payload}; movement.status = payload.decision === 'DECLINE' ? 'REJECTED' : 'APPROVED'; }
  if (action === 'CONFIRM_SETTLEMENT' || action === 'CONFIRM_RECOVERY') { const movement = value[action === 'CONFIRM_SETTLEMENT' ? 'settlement' : 'recovery']; Object.assign(movement,{status:'CONFIRMED',reference:payload.reference,confirmedAt:stamp.recordedAt,confirmedByRole:'TREASURER'}); value.status = action === 'CONFIRM_SETTLEMENT' ? 'SETTLED' : 'RECOVERED'; if (action === 'CONFIRM_SETTLEMENT') value.totals.settledMinor = payload.amountMinor; else value.totals.recoveredMinor = payload.amountMinor; }
  if (action === 'REVERSE') { value.reversal = {...stamp,...copy(payload)}; for (const line of value.lines) line.returnedQuantity = line.receivedQuantity; value.status = payload.amountMinor ? 'RECOVERY_REQUIRED' : 'REVERSED'; }
  if (action === 'CANCEL') { value.cancellation = {...stamp,...payload}; value.status = 'CANCELLED'; }
  if (action === 'ACCEPTANCE') value.acceptance = {document:{...stamp,...payload},valid:true,scope:'SIMULATION_ONLY',globalClosureGranted:false,realRepresentativeAcceptance:false};
  value.totals.netPaidMinor = value.totals.settledMinor - value.totals.recoveredMinor;
  value.totals.remainingMinor = ['DECLINED','CANCELLED','REVERSED','RECOVERY_REQUIRED','RECOVERED'].includes(value.status) ? 0 : value.totals.amountMinor - value.totals.settledMinor;
  value.totals.recoveryRequiredMinor = value.status === 'RECOVERY_REQUIRED' ? value.totals.settledMinor - value.totals.recoveredMinor : 0;
  value.revision++; value.digest = hash(value.id + ':' + value.revision); value.receiptDigest = hash(value.receipts); value.completionDigest = hash({revision:value.revision,status:value.status}); value.updatedAt = stamp.recordedAt;
  value.events.push({id:'event-' + value.revision,revision:value.revision,action,role,occurredAt:stamp.recordedAt,digest:hash(body)});
}
const lab = page => page.locator('#hl-procurement-lab');
async function install(page,options = {}) {
  const state = {active:true,owner:true,sessions:[],integration:settings(),contract:contract(),calls:[],nativeWrites:[],replays:new Map(),activeReads:new Map(),...options};
  const summary = value => ({id:value.id,status:value.status,scenario:value.scenario,revision:value.revision,digest:value.digest,amountMinor:value.totals.amountMinor,currency:'SAR',createdAt:value.createdAt,updatedAt:value.updatedAt});
  state.workspace = () => ({capabilities:{create:{allowed:state.sessions.length < 40,reason:null}},sessions:state.sessions.map(summary),integration:copy(state.integration),contract:copy(state.contract),limits:{maxSessions:40,maxEvents:160}});
  await page.route('**/api/v1/**',route => { if (route.request().method() !== 'GET') state.nativeWrites.push(new URL(route.request().url()).pathname); return json(route,[]); });
  await page.route('**/api/v1/auth/google/config',route => json(route,{enabled:false}));
  await page.route(/\/api\/v1\/me$/,route => { if (state.revokeNextAuth) { state.active = false; state.revokeNextAuth = false; } return json(route,{id:'lab-owner',status:'ACTIVE',email:'owner@example.invalid',emailVerifiedAt:'2026-01-01T00:00:00Z',person:{firstName:'مالك',lastName:'اختبار'},roleAssignments:state.active ? [{role:'ADMIN',status:'ACTIVE'},{role:'ORGANIZATION',status:'ACTIVE'}] : [{role:'DIVER',status:'ACTIVE'}]}); });
  await page.route(/\/api\/v1\/procurement-lab(?:\/|$)/,async route => {
    const path = new URL(route.request().url()).pathname.split('/procurement-lab')[1], method = route.request().method();
    if (!state.owner) return json(route,{message:'Canonical platform owner required.'},403);
    if (method === 'GET') {
      if (path === '/workspace') { if (state.workspaceDelay) await state.workspaceDelay; return json(route,state.workspaceResponse || state.workspace()); }
      if (path === '/contract') return json(route,state.contract);
      const id = path.split('/')[2]; if (state.activeReads.has(id)) await state.activeReads.get(id);
      const found = state.sessions.find(value => value.id === id); return found ? json(route,state.detailResponse || projection(found)) : json(route,{message:'Missing test session'},404);
    }
    const body = route.request().postDataJSON(); state.calls.push({path,body});
    if (state.onWrite) { const handled = await state.onWrite(route,path,body); if (handled) return; }
    if (path === '/exchange/validate') {
      const valid = body.message?.payload?.totalMinor !== 999;
      return json(route,{valid,normalized:valid ? body.message : null,issues:valid ? [] : [{message:'The total must match the explicit line amounts.'}],messageDigest:valid ? hash(body.message) : null,execution:'VALIDATION_ONLY',businessEffects:false});
    }
    const replay = state.replays.get(body.requestId);
    if (replay) return json(route,{...replay,command:{requestId:body.requestId,replayed:true}});
    if (path === '/integration') {
      if (body.expectedRevision !== state.integration.revision) return json(route,{message:'Stale configuration revision'},409);
      const missing = [...(!body.endpoint ? ['ENDPOINT_REQUIRED'] : []),...(body.authMode !== 'NONE' && !body.credentialRef ? ['CREDENTIAL_REFERENCE_REQUIRED'] : [])];
      state.integration = {...state.integration,...Object.fromEntries(['displayName','protocol','endpoint','credentialRef','authMode'].map(key => [key,body[key]])),revision:state.integration.revision + 1,configHash:hash(body),state:missing.length ? 'NOT_CONFIGURED' : 'CONFIGURED',missing,lastCheck:null,connectionCheckCurrent:false};
      state.replays.set(body.requestId,copy(state.integration)); return json(route,state.integration);
    }
    if (path === '/integration/check') {
      const result = state.checkCode || 'CAPABILITIES_VERIFIED';
      state.integration = {...state.integration,state:result === 'CAPABILITIES_VERIFIED' ? 'CONNECTION_VERIFIED' : 'CONFIGURED',connectionCheckCurrent:result === 'CAPABILITIES_VERIFIED',lastCheck:{status:result === 'CAPABILITIES_VERIFIED' ? 'SUCCEEDED' : 'FAILED',code:result,checkedAt:new Date().toISOString(),configHash:state.integration.configHash,externalRequestAttempted:result !== 'DNS_UNAVAILABLE'}};
      state.replays.set(body.requestId,copy(state.integration)); return json(route,state.integration);
    }
    if (path === '/sessions') { const value = session('lab-' + (state.sessions.length + 1),body.lines); state.sessions.push(value); const result = projection(value); state.replays.set(body.requestId,copy(result)); return json(route,result,201); }
    const value = state.sessions.find(value => value.id === path.split('/')[2]);
    if (!value || body.expectedRevision !== value.revision || body.expectedDigest !== value.digest) return json(route,{message:'Stale test evidence'},409);
    if (body.role !== actionRoles[body.action] || !projection(value).actions[body.action]?.allowed) return json(route,{message:'Action unavailable'},409);
    apply(value,body); const result = projection(value); state.replays.set(body.requestId,copy(result));
    if (state.loseActionResponse) { state.loseActionResponse = false; return route.abort('failed'); }
    return json(route,result);
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => window.HydrolandAuth && window.HydrolandProfile && window.HydrolandProcurementLab && window.HydrolandOrganizations);
  await page.evaluate(async() => { window.HydrolandAuth.acceptSession({accessToken:'lab-owner-fixture',refreshToken:'lab-refresh'},window.HydrolandAuth.beginAuthAttempt()); await window.HydrolandProfile.load(); });
  if (options.open !== false) { await openWorkspaceSwitcher(page); await page.locator('#role-dialog [data-role=admin]').click(); const board = page.locator('.hl-role-dashboard[data-role=admin]'); await expect(board).toBeVisible(); await board.locator('[data-procurement-lab-open]').click(); await expect(lab(page)).toBeVisible(); await expect(lab(page).getByRole('button',{name:'تحديث',exact:true})).toBeEnabled(); }
  return state;
}
async function create(page) { await lab(page).locator('[data-lab-create]').getByRole('button',{name:'إنشاء تجربة ببيانات مصطنعة',exact:true}).click(); await expect(lab(page).getByRole('status')).toHaveText('تم إنشاء تجربة جديدة.'); }
async function selected(page,id = 'lab-1') { await lab(page).locator('[data-lab-session-open="' + id + '"]').click(); await expect(lab(page).getByRole('status')).toHaveText('تم استرجاع التجربة المحفوظة.'); }
async function step(page,action,{note='مراجعة تجريبية للبيانات المحفوظة',reference='TEST-' + action,quantities,decision='APPROVE'} = {}) {
  await lab(page).getByLabel('الدور التجريبي الحالي',{exact:true}).selectOption(actionRoles[action]);
  const form = lab(page).locator('[data-lab-action="' + action + '"]'); await expect(form).toBeVisible();
  if (['RECOMMEND','APPROVE','APPROVE_SETTLEMENT','APPROVE_RECOVERY'].includes(action)) { await form.locator('[name=decision]').selectOption(decision); await form.locator('[name=note]').fill(note); }
  if (['RECEIPT_ACCEPTANCE','ACCEPTANCE'].includes(action)) await form.locator('[name=note]').fill(note);
  if (['INVOICE','RECEIVE','CONFIRM_SETTLEMENT','CONFIRM_RECOVERY','REVERSE'].includes(action)) await form.locator('[name=reference]').fill(reference);
  if (action === 'RECEIVE') for (const [id,value] of Object.entries(quantities || {})) await form.locator('[name="' + id + '"]').fill(String(value));
  if (['CANCEL','REVERSE'].includes(action)) await form.locator('[name=reason]').fill(note);
  await form.getByRole('button',{name:'تنفيذ الإجراء التجريبي',exact:true}).click();
  await expect(lab(page).getByRole('status')).toHaveText('تم حفظ الإجراء التجريبي.');
}

test('the owner opens the lab before any organization and reads do not seed test or native data',async({page}) => {
  const state = await install(page); await expect(lab(page).getByText('لا توجد تجارب محفوظة. ابدأ تجربة من النموذج أعلاه.')).toBeVisible();
  await expect(lab(page).locator('[data-lab-synthetic]')).toContainText('بيانات مصطنعة');
  await lab(page).getByRole('button',{name:'تحديث',exact:true}).click(); await expect(lab(page).locator('[data-lab-create]')).toBeVisible();
  expect(state.calls).toEqual([]); expect(state.nativeWrites).toEqual([]);
  await lab(page).getByRole('tab',{name:'إعداد API',exact:true}).click(); await expect(lab(page).getByRole('button',{name:'فحص الإعداد المحفوظ',exact:true})).toBeDisabled();
  await expect(lab(page)).toContainText('لا يمنع إعداد الربط الناقص استخدام التجربة.');
});

test('the empty organization view exposes the same owner lab without creating an organization',async({page}) => {
  const state = await install(page,{open:false}); await openWorkspaceSwitcher(page); await page.locator('#role-dialog [data-role=organization]').click();
  await page.locator('.hl-role-dashboard[data-role=organization] [data-action-label="بيانات الجهات"]').click();
  await expect(page.locator('[data-org-procurement-lab]')).toBeVisible(); await page.locator('[data-org-procurement-lab]').click();
  await expect(lab(page).locator('[data-lab-create]')).toBeVisible(); expect(state.nativeWrites).toEqual([]); expect(state.calls).toEqual([]);
});

test('canonical owner refusal clears private controls even when the account has an ADMIN role',async({page}) => {
  const state = await install(page,{owner:false}); await expect(lab(page).getByRole('status')).toContainText('مالك المنصة'); await expect(lab(page).locator('form')).toHaveCount(0); expect(state.calls).toEqual([]);
});

test('creating an editable synthetic scenario preserves exact SAR amounts and shows no final acceptance',async({page}) => {
  const state = await install(page); const row = lab(page).locator('[data-lab-line]').first();
  await row.locator('[name=description]').fill('بند مصطنع قابل للتعديل'); await row.locator('[name=tax]').fill('4.00'); await create(page);
  expect(state.calls[0].body).toMatchObject({scenario:'STANDARD_V1',lines:[{lineId:'line-1',description:'بند مصطنع قابل للتعديل',quantity:3,unitPriceMinor:1000,taxMinor:400,taxTreatment:'TAXABLE'},{lineId:'line-2',quantity:2,unitPriceMinor:500,taxMinor:0,taxTreatment:'EXEMPT'}]});
  expect(state.sessions[0].totals.amountMinor).toBe(4400); await expect(lab(page).locator('[data-lab-detail]')).not.toContainText('اكتمل القبول التجريبي'); expect(state.nativeWrites).toEqual([]);
  await lab(page).getByRole('button',{name:'إغلاق',exact:true}).click(); await page.locator('.hl-role-dashboard[data-role=admin] [data-procurement-lab-open]').click(); await selected(page); await expect(lab(page).locator('[data-lab-detail]')).toContainText('بند مصطنع قابل للتعديل');
});

test('one persisted test completes partial receipts, settlement, reversal, recovery and simulation-only acceptance',async({page}) => {
  const state = await install(page); await create(page);
  await step(page,'RECOMMEND'); await step(page,'APPROVE'); await step(page,'INVOICE');
  await step(page,'RECEIVE',{reference:'PART-1',quantities:{'line-1':1}}); expect(state.sessions[0].totals.settledMinor).toBe(0);
  await lab(page).getByLabel('الدور التجريبي الحالي',{exact:true}).selectOption('ACCOUNTANT'); await expect(lab(page).locator('[data-lab-action=PREPARE_SETTLEMENT]')).toHaveCount(0);
  await step(page,'RECEIVE',{reference:'PART-2',quantities:{'line-1':2,'line-2':2}}); await step(page,'RECEIPT_ACCEPTANCE');
  await step(page,'PREPARE_SETTLEMENT'); await step(page,'APPROVE_SETTLEMENT'); await step(page,'CONFIRM_SETTLEMENT');
  await expect(lab(page).locator('[data-lab-detail]')).toContainText('تمت التسوية التجريبية');
  await step(page,'REVERSE'); await step(page,'PREPARE_RECOVERY'); await step(page,'APPROVE_RECOVERY'); await step(page,'CONFIRM_RECOVERY'); await step(page,'ACCEPTANCE');
  const value = state.sessions[0]; expect(value.totals).toEqual({amountMinor:4450,settledMinor:4450,recoveredMinor:4450,netPaidMinor:0,remainingMinor:0,recoveryRequiredMinor:0});
  expect(value.acceptance).toMatchObject({valid:true,scope:'SIMULATION_ONLY',globalClosureGranted:false,realRepresentativeAcceptance:false});
  await expect(lab(page).locator('[data-lab-detail]')).toContainText('اكتمل القبول التجريبي لهذه الدورة. لا يسجل ذلك قبول ممثل جهة حقيقية.');
  expect(state.calls.filter(row => row.path.endsWith('/actions')).map(row => row.body.action)).toEqual(['RECOMMEND','APPROVE','INVOICE','RECEIVE','RECEIVE','RECEIPT_ACCEPTANCE','PREPARE_SETTLEMENT','APPROVE_SETTLEMENT','CONFIRM_SETTLEMENT','REVERSE','PREPARE_RECOVERY','APPROVE_RECOVERY','CONFIRM_RECOVERY','ACCEPTANCE']);
  expect(new Set(state.calls.filter(row => row.path.endsWith('/actions')).map(row => row.body.expectedDigest)).size).toBe(14); expect(state.nativeWrites).toEqual([]);
  await page.setViewportSize({width:1280,height:1000}); await lab(page).evaluate(node => { node.scrollTop += node.querySelector('[data-lab-detail] h3').getBoundingClientRect().top - node.getBoundingClientRect().top - node.querySelector('[data-lab-synthetic]').getBoundingClientRect().height - 48; });
  await lab(page).screenshot({animations:'disabled',path:test.info().outputPath('procurement-lab-arabic-desktop.png')});
  await page.setViewportSize({width:390,height:844}); await expect(lab(page)).toBeVisible(); expect(await lab(page).evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await lab(page).evaluate(node => { node.scrollTop += node.querySelector('[data-lab-detail] h3').getBoundingClientRect().top - node.getBoundingClientRect().top - node.querySelector('[data-lab-synthetic]').getBoundingClientRect().height - 48; });
  await lab(page).screenshot({animations:'disabled',path:test.info().outputPath('procurement-lab-mobile.png')});
});

test('cancel and decline remain explicit test outcomes with no simulated payment',async({page}) => {
  const state = await install(page,{sessions:[session()]}); await selected(page); await step(page,'CANCEL'); expect(state.sessions[0].status).toBe('CANCELLED'); expect(state.sessions[0].totals.settledMinor).toBe(0);
  await lab(page).getByText('بدء تجربة جديدة',{exact:true}).click(); await create(page); await step(page,'RECOMMEND',{decision:'DECLINE'}); expect(state.sessions[1].status).toBe('RECOMMENDED');
  await step(page,'APPROVE',{decision:'DECLINE'}); expect(state.sessions[1].status).toBe('DECLINED'); expect(state.nativeWrites).toEqual([]);
});

test('a lost action response retries with the same request identity and advances the session once',async({page}) => {
  const state = await install(page,{sessions:[session()],loseActionResponse:true}); await selected(page);
  await lab(page).getByLabel('الدور التجريبي الحالي',{exact:true}).selectOption('RECOMMENDER'); const form = lab(page).locator('[data-lab-action=RECOMMEND]'); await form.locator('[name=decision]').selectOption('APPROVE'); await form.locator('[name=note]').fill('مراجعة تجريبية محفوظة');
  await form.locator('button[type=submit]').click(); await expect(lab(page).getByRole('status')).toContainText('تعذر تأكيد النتيجة'); await form.locator('button[type=submit]').click(); await expect(lab(page).getByRole('status')).toHaveText('تم حفظ الإجراء التجريبي.');
  expect(state.calls[0].body.requestId).toBe(state.calls[1].body.requestId); expect(state.sessions[0].revision).toBe(2); expect(state.sessions[0].events).toHaveLength(2);
});

test('a stale action requires refresh and the next action binds the refreshed revision',async({page}) => {
  const state = await install(page,{sessions:[session()]}); await selected(page); let reject = true;
  state.onWrite = async(route,path) => { if (path.endsWith('/actions') && reject) { reject = false; state.sessions[0].revision = 4; state.sessions[0].digest = hash('new-current-source'); await json(route,{message:'Stale test evidence'},409); return true; } return false; };
  await lab(page).getByLabel('الدور التجريبي الحالي',{exact:true}).selectOption('RECOMMENDER'); let form = lab(page).locator('[data-lab-action=RECOMMEND]'); await form.locator('[name=decision]').selectOption('APPROVE'); await form.locator('[name=note]').fill('محاولة على نسخة قديمة'); await form.locator('button[type=submit]').click();
  await expect(lab(page).getByRole('status')).toContainText('تغيرت النسخة'); await expect(form.locator('button[type=submit]')).toBeDisabled();
  await lab(page).getByRole('button',{name:'تحديث',exact:true}).click(); await expect(lab(page).getByRole('status')).toHaveText('تم استرجاع التجربة المحفوظة.'); await step(page,'RECOMMEND'); expect(state.calls.at(-1).body.expectedRevision).toBe(4);
});

test('freshly revoked ADMIN authority prevents a protected POST',async({page}) => {
  const state = await install(page); state.revokeNextAuth = true; await lab(page).locator('[data-lab-create] button[type=submit]').click(); await expect(lab(page)).not.toBeVisible(); expect(state.calls).toEqual([]);
});

test('API settings save safe credential references and check only the exact saved configuration',async({page}) => {
  const state = await install(page); await lab(page).getByRole('tab',{name:'إعداد API',exact:true}).click(); let form = lab(page).locator('[data-lab-integration]');
  await form.getByLabel('اسم الإعداد',{exact:true}).fill('إعداد المورد'); await form.getByRole('button',{name:'حفظ الإعداد',exact:true}).click(); await expect(lab(page).getByRole('status')).toHaveText('تم حفظ إعداد الربط.'); expect(state.integration.state).toBe('NOT_CONFIGURED');
  form = lab(page).locator('[data-lab-integration]'); await form.getByLabel('عنوان API (اختياري الآن)',{exact:true}).fill('https://supplier.example.invalid/api/'); await form.getByLabel('مرجع بيانات الاعتماد',{exact:true}).selectOption('supplier-test-reference');
  await expect(form.getByRole('button',{name:'فحص الإعداد المحفوظ',exact:true})).toBeDisabled(); await form.getByRole('button',{name:'حفظ الإعداد',exact:true}).click(); await expect(lab(page).getByRole('status')).toHaveText('تم حفظ إعداد الربط.');
  const saved = copy(state.integration); await lab(page).getByRole('button',{name:'فحص الإعداد المحفوظ',exact:true}).click(); await expect(lab(page).getByRole('status')).toHaveText('تم التحقق من وصف قدرات API');
  expect(state.calls.at(-1).body).toMatchObject({expectedRevision:saved.revision,expectedConfigHash:saved.configHash}); expect(state.calls.at(-2).body.credentialRef).toBe('supplier-test-reference'); expect(state.integration.businessExchangeEnabled).toBe(false); expect(state.nativeWrites).toEqual([]);
  await expect(lab(page).locator('input[type=password]')).toHaveCount(0); await expect(lab(page)).toContainText('تبادل أوامر الشراء والأموال الخارجية غير مفعّل');
  await lab(page).getByLabel('عنوان API (اختياري الآن)',{exact:true}).fill('https://new.example.invalid/api/'); await expect(lab(page).getByRole('button',{name:'فحص الإعداد المحفوظ',exact:true})).toBeDisabled();
});

test('failed capability checks stay unverified and stale success receipts do not show current connection',async({page}) => {
  const configured = {...settings(),revision:2,configHash:hash('config'),endpoint:'https://supplier.example.invalid/',credentialRef:'supplier-test-reference',missing:[],state:'CONFIGURED'};
  const state = await install(page,{integration:configured,checkCode:'DNS_UNAVAILABLE'}); await lab(page).getByRole('tab',{name:'إعداد API',exact:true}).click(); await lab(page).getByRole('button',{name:'فحص الإعداد المحفوظ',exact:true}).click();
  await expect(lab(page).getByRole('status')).toHaveText('لم ينجح الفحص'); await expect(lab(page)).toContainText('تعذر حل عنوان المزود'); expect(state.integration.state).toBe('CONFIGURED');
  state.integration = {...state.integration,lastCheck:{status:'FAILED',code:'CHECK_INTERRUPTED',checkedAt:new Date().toISOString(),configHash:configured.configHash,externalRequestAttempted:null}};
  await lab(page).getByRole('button',{name:'تحديث',exact:true}).click(); await expect(lab(page)).toContainText('توقف الفحص قبل تسجيل النتيجة');
  const attempted = lab(page).locator('dl > div').filter({has:page.locator('dt',{hasText:'تمت محاولة اتصال خارجي'})}); await expect(attempted.locator('dd')).toHaveText('غير معلوم');
  state.integration = {...state.integration,state:'CONNECTION_VERIFIED',connectionCheckCurrent:true,lastCheck:{status:'SUCCEEDED',code:'CAPABILITIES_VERIFIED',checkedAt:new Date(Date.now()-901000).toISOString(),configHash:configured.configHash,externalRequestAttempted:true}};
  await lab(page).getByRole('button',{name:'تحديث',exact:true}).click(); await expect(lab(page)).toContainText('انتهت صلاحية الفحص السابق');
});

test('the editable API validator handles invalid JSON and semantic failure without a business action and downloads its contract',async({page}) => {
  const state = await install(page); await lab(page).getByRole('tab',{name:'إعداد API',exact:true}).click(); const editor = lab(page).getByLabel('رسالة JSON قابلة للتحرير',{exact:true});
  await editor.fill('{'); await lab(page).getByRole('button',{name:'التحقق من الرسالة',exact:true}).click(); await expect(lab(page).getByRole('status')).toHaveText('أدخل JSON صحيحًا قبل التحقق.'); expect(state.calls).toEqual([]);
  const invalid = message('PURCHASE_ORDER'); invalid.payload.totalMinor = 999; await editor.fill(JSON.stringify(invalid)); await lab(page).getByRole('button',{name:'التحقق من الرسالة',exact:true}).click(); await expect(lab(page).locator('[data-lab-validation-result]')).toContainText('الرسالة تحتاج تصحيحًا.');
  await lab(page).getByLabel('مثال الرسالة',{exact:true}).selectOption('invoice'); await lab(page).getByRole('button',{name:'تحميل المثال في المحرر',exact:true}).click(); await lab(page).getByRole('button',{name:'التحقق من الرسالة',exact:true}).click(); await expect(lab(page).locator('[data-lab-validation-result]')).toContainText('الرسالة صالحة وفق العقد.');
  const downloadPromise = page.waitForEvent('download'); await lab(page).getByRole('button',{name:'تنزيل عقد API',exact:true}).click(); const download = await downloadPromise; expect(JSON.parse(await readFile(await download.path(),'utf8'))).toEqual(state.contract);
  expect(state.calls.map(row => row.path)).toEqual(['/exchange/validate','/exchange/validate']); expect(state.sessions).toEqual([]); expect(state.nativeWrites).toEqual([]);
  await page.evaluate(() => window.HydrolandI18n.setLocale('en')); await expect(lab(page)).toContainText('Not configured'); await expect(lab(page).locator('[data-lab-validator] [name=message]')).toHaveValue(JSON.stringify(state.contract.examples.invoice,null,2));
  await page.setViewportSize({width:1280,height:1000}); await lab(page).evaluate(node => { node.scrollTop = 0; });
  await lab(page).screenshot({animations:'disabled',path:test.info().outputPath('procurement-api-english-desktop.png')});
});

for (const boundary of ['logout','replacement']) test('late workspace response cannot restore private lab data after ' + boundary,async({page}) => {
  const state = await install(page); let release; state.workspaceDelay = new Promise(resolve => { release = resolve; });
  await lab(page).getByRole('button',{name:'تحديث',exact:true}).click();
  if (boundary === 'logout') await page.evaluate(() => document.dispatchEvent(new Event('hydroland:session-cleared')));
  else await page.evaluate(() => window.HydrolandAuth.acceptSession({accessToken:'replacement',refreshToken:'replacement-refresh'},window.HydrolandAuth.beginAuthAttempt()));
  release(); await expect(lab(page)).not.toBeVisible(); await expect(lab(page).locator('form')).toHaveCount(0);
});

test('a late selected-session response cannot replace the newer selection',async({page}) => {
  const a = session(), b = session('lab-2',[{...lines()[0],description:'التجربة الثانية',quantity:1,unitPriceMinor:9900,taxMinor:0,taxTreatment:'EXEMPT'}]); const state = await install(page,{sessions:[a,b]});
  let release; state.activeReads.set('lab-1',new Promise(resolve => { release = resolve; })); await lab(page).locator('[data-lab-session-open=lab-1]').click(); await selected(page,'lab-2'); release();
  await expect(lab(page).locator('[data-lab-detail]')).toContainText('التجربة الثانية'); await expect(lab(page).locator('[data-lab-detail]')).not.toContainText('معدات اصطناعية للتجربة');
});

test('a foreign session response is rejected and English mobile rendering preserves opaque text safely',async({page}) => {
  const value = session('lab-1',[{...lines()[0],description:'عينة <img src=x onerror=alert(1)>'}]); const state = await install(page,{sessions:[value]}); await selected(page);
  await page.setViewportSize({width:390,height:844}); await page.evaluate(() => window.HydrolandI18n.setLocale('en')); await expect(lab(page).getByRole('heading',{name:'Procurement testing and integration',exact:true})).toBeVisible();
  await expect(lab(page).locator('[data-lab-detail] td').first()).toHaveText('عينة <img src=x onerror=alert(1)>'); await expect(lab(page).locator('[data-lab-detail] img')).toHaveCount(0); expect(await lab(page).evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await lab(page).screenshot({animations:'disabled',path:test.info().outputPath('procurement-lab-english-mobile.png')});
  state.detailResponse = projection(session('foreign-session')); await lab(page).locator('[data-lab-session-open=lab-1]').click(); await expect(lab(page).getByRole('status')).toContainText('Could not verify'); await expect(lab(page).locator('[data-lab-action]')).toHaveCount(0);
});
