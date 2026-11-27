// Native, synthetic C06 acceptance. Explicitly restricted to a disposable
// loopback database; records remain for independent backup/restore checks.
const assert = require('node:assert/strict');
const {createHash, randomBytes, randomUUID, scryptSync} = require('node:crypto');
const {resolve} = require('node:path');

exports.openFixture = async function openFixture() {
  assert.equal(process.env.CI, 'true'); assert.equal(process.env.NODE_ENV, 'test');
  assert.equal(process.env.COMMERCE_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
  assert.equal(process.env.C06_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
  const database = new URL(process.env.DATABASE_URL || 'invalid:');
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(database.hostname));
  assert.match(database.pathname, /^\/commerce_test_c06_[a-z0-9_]+$/);
  assert.equal(process.env.TZ || 'UTC', 'UTC');
  Object.assign(process.env, {JWT_SECRET: 'SYNTHETIC_C06_native_session_secret_at_least_32_characters', HYDROLAND_AI_TEST_MANUAL_WORKER: '1',
    HYDROLAND_INTEGRATION_EMAIL_STATUS: 'DISABLED', HYDROLAND_EMAIL_PROVIDER: 'NONE', HYDROLAND_INTEGRATION_PAYMENT_PSP_STATUS: 'DISABLED', HYDROLAND_PAYMENT_PROVIDER: 'NONE',
    HYDROLAND_PUBLIC_WEB_ORIGIN: 'https://synthetic-c06.example.invalid'});
  let app, db, base;
  const nativeFetch = global.fetch, externalAttempts = [];
  global.fetch = (input, options) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (!base || url.origin !== new URL(base).origin) {externalAttempts.push(url.origin); throw new Error('C06 fixture forbids external HTTP');}
    return nativeFetch(input, {...options, redirect: 'error', signal: options?.signal || AbortSignal.timeout(30000)});
  };
  const load = file => require(resolve(process.env.C06_TEST_DIST || resolve(__dirname, '../dist'), file));
  require('reflect-metadata');
  try {
    app = await require('@nestjs/core').NestFactory.create(load('app.module.js').AppModule, {logger: false, abortOnError: false});
    app.setGlobalPrefix('api/v1'); app.useBodyParser('json', {limit: '15mb'});
    await app.listen(0, '127.0.0.1'); base = (await app.getUrl()) + '/api/v1'; db = app.get(load('database/database.service.js').DatabaseService);
    const zone = await db.$queryRaw`SHOW TimeZone`; assert.ok(['UTC', 'Etc/UTC'].includes(zone[0]?.TimeZone));
  } catch (error) {global.fetch = nativeFetch; await app?.close(); throw error;}
  const close = async () => {try {await app.close();} finally {global.fetch = nativeFetch;} assert.deepEqual(externalAttempts, []);};
  const call = async (actor, path, method = 'GET', input) => {
    const response = await fetch(base + path, {method, headers: {'content-type': 'application/json', ...(actor ? {authorization: 'Bearer ' + actor.token} : {})}, ...(input === undefined ? {} : {body: JSON.stringify(input)})});
    const text = await response.text(); let data; try {data = JSON.parse(text);} catch {data = text;}
    return {status: response.status, data, cache: response.headers.get('cache-control')};
  };
  const ok = result => {assert.ok(result.status >= 200 && result.status < 300, JSON.stringify(result)); return result.data;};
  const denied = (result, statuses = [400, 403, 409]) => {assert.ok((Array.isArray(statuses) ? statuses : [statuses]).includes(result.status), JSON.stringify(result)); return result.data;};
  const password = randomBytes(20).toString('hex'), salt = randomBytes(16).toString('hex'), passwordHash = salt + ':' + scryptSync(password, salt, 64).toString('hex');
  const account = async (label, role = 'STAFF') => {
    const person = await db.person.create({data: {firstName: 'Synthetic C06', lastName: label}});
    const row = await db.account.create({data: {personId: person.id, email: `${label}-${randomUUID()}@example.invalid`, passwordHash, status: 'ACTIVE', emailVerifiedAt: new Date()}});
    if (role) await db.roleAssignment.create({data: {accountId: row.id, role, status: 'ACTIVE'}});
    const login = ok(await call(null, '/auth/login', 'POST', {email: row.email, password}));
    assert.ok(login.accessToken); return {...row, token: login.accessToken};
  };
  const actors = {};
  try {
    for (const name of ['owner', 'reviewer', 'signer', 'outsider', 'viewer']) actors[name] = await account(name, ['owner', 'outsider'].includes(name) ? 'ADMIN' : name === 'viewer' ? null : 'STAFF');
  const org = await db.organization.create({data: {displayName: 'Synthetic C06 platform only', kind: 'HYDROLAND_INTERNAL_PLATFORM', ownerId: actors.owner.id, status: 'ACTIVE'}});
  const other = await db.organization.create({data: {displayName: 'Synthetic C06 other organization', kind: 'ORGANIZATION', ownerId: actors.outsider.id, status: 'ACTIVE'}});
  await db.operationalSetting.upsert({where: {key: 'PLATFORM_STAFFING_ORGANIZATION:v1'}, create: {key: 'PLATFORM_STAFFING_ORGANIZATION:v1', value: {organizationId: org.id}}, update: {value: {organizationId: org.id}}});
  for (const [name, actor] of Object.entries(actors)) await db.organizationMember.create({data: {organizationId: org.id, accountId: actor.id, role: name === 'owner' ? 'OWNER' : name === 'viewer' ? 'VIEWER' : name === 'outsider' ? 'ADMIN' : 'STAFF', status: 'ACTIVE'}});
  await db.organizationMember.create({data: {organizationId: other.id, accountId: actors.outsider.id, role: 'OWNER', status: 'ACTIVE'}});
  const employments = [];
  for (const department of ['MARKETING_GROWTH', 'FINANCE']) {
    const unit = await db.orgUnit.create({data: {organizationId: org.id, type: 'DEPARTMENT', code: department, nameAr: 'إدارة قبول اصطناعي ' + department}});
    for (const actor of [actors.reviewer, actors.signer]) {
      const position = await db.position.create({data: {orgUnitId: unit.id, code: 'SYN-C06-' + actor.id, titleAr: 'مراجع اصطناعي', active: true}});
      employments.push(await db.employment.create({data: {organizationId: org.id, accountId: actor.id, orgUnitId: unit.id, positionId: position.id, workerClass: 'EMPLOYEE', status: 'ACTIVE', startsAt: new Date(Date.now() - 86400000)}}));
    }
  }
  const finance = await db.financeAccount.create({data: {organizationId: org.id, name: 'Synthetic native USD campaign account', currency: 'USD'}});
  const otherFinance = await db.financeAccount.create({data: {organizationId: other.id, name: 'Synthetic foreign account', currency: 'USD'}});
  const root = '/admin/marketing-campaign-drafts', path = id => `${root}/${id}/lifecycle`;
  const detail = async id => ok(await call(actors.owner, path(id))), sources = async id => ok(await call(actors.owner, path(id) + '/sources'));
  const templates = new Map();
  const installed = ok(await call(actors.owner, root + '/lifecycle/templates/install', 'POST', {}));
  for (const template of installed.templates) templates.set(template.code, template);
  const proofTemplate = ok(await call(actors.owner, '/documents/templates', 'POST', {organizationId: org.id, code: 'C06-SYNTHETIC-FACT-PROOF', titleAr: 'إثبات اصطناعي لوقائع الحملة', titleEn: 'Synthetic campaign fact proof', department: 'MARKETING_GROWTH', printable: true,
    fields: [{key: 'note', labelAr: 'المصدر والواقعة', labelEn: 'Source and observation', type: 'LONG_TEXT', required: true}]}));
  templates.set(proofTemplate.code, proofTemplate);
  const sha = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
  const makeDocument = async (code, payload, {signed = false, draft = false, pdf = false, bareHash = false} = {}) => {
    const template = templates.get(code); assert.ok(template, code);
    let document = ok(await call(actors.owner, '/documents', 'POST', {organizationId: org.id, templateId: template.id, department: template.department, contentHash: (bareHash ? '' : 'sha256:') + sha(payload), payload}));
    let attachment;
    if (pdf) {
      const pdfDoc = await require('pdf-lib').PDFDocument.create(), page = pdfDoc.addPage([595, 842]);
      page.drawText('SYNTHETIC C06 native proof - no real campaign, permission or spend', {x: 30, y: 790, size: 10});
      page.drawText('Payload SHA256 ' + sha(payload), {x: 30, y: 760, size: 8});
      const bytes = Buffer.from(await pdfDoc.save());
      attachment = ok(await call(actors.owner, `/documents/${document.id}/attachments`, 'POST', {filename: 'synthetic-c06.pdf', mimeType: 'application/pdf', base64: bytes.toString('base64')}));
      assert.equal(attachment.sha256, sha(bytes));
    }
    if (!draft) {
      document = ok(await call(actors.owner, `/documents/${document.id}/submit`, 'POST', {}));
      const reviewRoot = `/document-reviews/organizations/${org.id}/documents/${document.id}`;
      const input = {reviewerAccountId: actors.reviewer.id, signerAccountId: actors.signer.id, expectedDocumentVersion: document.version, expiresAt: new Date(Date.now() + 86400000).toISOString(), reason: 'Synthetic native C06 independent review assignment'};
      const plan = ok(await call(actors.owner, reviewRoot + '/plan', 'POST', input));
      ok(await call(actors.owner, reviewRoot + '/assignment', 'POST', {...input, expectedPlanHash: plan.planHash, confirmed: true}));
      const review = ok(await call(actors.reviewer, reviewRoot + '/view'));
      ok(await call(actors.reviewer, reviewRoot + '/decisions', 'POST', {action: 'APPROVE', expectedVersion: document.version, reviewHash: review.reviewHash, note: 'Synthetic independent current actor approval', confirmed: true}));
      if (signed) {
        const signing = ok(await call(actors.signer, reviewRoot + '/view'));
        ok(await call(actors.signer, reviewRoot + '/decisions', 'POST', {action: 'SIGN', expectedVersion: document.version, reviewHash: signing.reviewHash, note: 'Synthetic optional native signature', confirmed: true}));
      }
      document = ok(await call(actors.owner, '/documents/' + document.id));
    }
    return {document, payload, attachment};
  };
  const makeCampaign = async (label = 'test') => ok(await call(actors.owner, root, 'POST', {requestKey: randomUUID(), title: 'Synthetic campaign ' + label, objective: 'Isolated C06 readiness and current source acceptance. No real marketing action.', channels: ['SOCIAL', 'WEB']})).record;
  const terms = campaign => ({campaignDraftId: campaign.id, draftRevision: campaign.revision, draftDigest: campaign.recordDigest, channelScope: campaign.channels.map(channel => ({channel})),
    validFrom: new Date(Date.now() - 86400000).toISOString(), validUntil: new Date(Date.now() + 86400000).toISOString()});
  const makeSources = async (campaign, {rights = {}, budget = {}, rightsOptions = {}, budgetOptions = {}} = {}) => {
    const rightsPayload = {purpose: 'C06_CAMPAIGN_RIGHTS_V1', ...terms(campaign), rightsHolderReference: 'SYNTHETIC-RIGHTS-HOLDER', contentScope: 'Synthetic fixture content only', contentPermissionReference: 'SYNTHETIC-NOT-A-REAL-PERMISSION', dataScope: 'Synthetic non-personal test data only', dataPermissionReference: 'SYNTHETIC-NO-REAL-PERSONAL-DATA', restrictions: 'No real publishing or provider traffic', ...rights};
    const budgetPayload = {purpose: 'C06_CAMPAIGN_BUDGET_V1', ...terms(campaign), financeAccountId: finance.id, currency: finance.currency, amountMinor: 12000, taxMinor: 1200, taxBasis: 'TAX_INCLUDED', taxReason: 'Explicit synthetic tax fixture, not tax advice or a real budget', budgetScope: 'Synthetic native preparation only; no spend execution', ...budget};
    const r = await makeDocument('C06-CAMPAIGN-RIGHTS-V1', rightsPayload, rightsOptions), b = await makeDocument('C06-CAMPAIGN-BUDGET-V1', budgetPayload, budgetOptions);
    return {rights: r, budget: b};
  };
  const prepareInput = async (campaign, original) => {
    const [view, options] = await Promise.all([detail(campaign.id), sources(campaign.id)]);
    const reference = (group, document) => {const row = options.documents[group].find(x => x.id === document.id); assert.ok(row?.eligible, JSON.stringify(row)); return {id: row.id, version: row.version, hash: row.hash};};
    return {requestId: randomUUID(), expectedRevision: view.lifecycle?.revision ?? 0, expectedDigest: view.lifecycle?.recordDigest ?? null,
      expectedDraftRevision: campaign.revision, expectedDraftDigest: campaign.recordDigest, rightsDocument: reference('rights', original.rights.document), budgetDocument: reference('budgets', original.budget.document), recommendation: 'Synthetic recommendation recorded for actual owner review; no live approval claimed.'};
  };
  const prepare = async (campaign, original) => ok(await call(actors.owner, path(campaign.id) + '/prepare', 'POST', await prepareInput(campaign, original)));
  const command = view => ({requestId: randomUUID(), expectedRevision: view.lifecycle.revision, expectedDigest: view.lifecycle.recordDigest});
  const decide = async (view, decision = 'APPROVE') => ok(await call(actors.owner, path(view.campaign.id) + '/decision', 'POST', {...command(view), expectedReadinessHash: view.readiness.hash, decision, note: 'Synthetic authenticated owner decision in isolated database only', confirmed: true}));
  const makeReady = async (label, opts) => {const campaign = await makeCampaign(label), original = await makeSources(campaign, opts), view = await decide(await prepare(campaign, original)); return {campaign, original, view};};
  const makeEvidence = async (campaign, kind, details, occurredAt = new Date().toISOString()) => {
    const proof = await makeDocument(proofTemplate.code, {note: 'SYNTHETIC OWNER-RECORDED campaign observation, no provider verification: ' + JSON.stringify(details)}, {pdf: true, bareHash: true});
    // OperationalEvidence's original contract binds an unprefixed SHA256, including the persisted native revision.
    const persistedProof = await db.managedDocument.findUniqueOrThrow({where: {id: proof.document.id}});
    const persistedRevision = await db.documentRevision.findUniqueOrThrow({where: {documentId_version: {documentId: persistedProof.id, version: persistedProof.version}}});
    assert.match(proof.document.contentHash, /^[a-f0-9]{64}$/);
    assert.equal(persistedProof.contentHash, sha(proof.payload));
    assert.equal(persistedRevision.contentHash, persistedProof.contentHash);
    const draft = ok(await call(actors.owner, '/admin/operational-evidence', 'POST', {requestKey: randomUUID(), kind, reference: 'SYN-C06-' + randomUUID(), occurredAt, proofDocumentId: proof.document.id, details: {campaignDraftId: campaign.id, ...details}}));
    const recorded = ok(await call(actors.owner, '/admin/operational-evidence/' + draft.record.id + '/record', 'POST', {expectedRevision: draft.record.revision, confirmed: true, reason: 'Synthetic owner-recorded original evidence'}));
    return {proof, view: recorded, id: recorded.record.id};
  };
  const snapshot = async () => JSON.stringify(await Promise.all([
    db.marketingCampaignLifecycle.findMany({orderBy: {id: 'asc'}}), db.marketingCampaignLifecycleEvent.findMany({orderBy: {id: 'asc'}}),
    db.marketingCampaignDraft.findMany({orderBy: {id: 'asc'}}), db.marketingCampaignDraftRevision.findMany({orderBy: {id: 'asc'}}),
    db.financeEntry.findMany({orderBy: {id: 'asc'}}), db.auditEvent.findMany({where: {resource: 'MarketingCampaignLifecycle'}, orderBy: {id: 'asc'}}),
  ]));
  return {app, db, base, actors, org, other, finance, otherFinance, employments, templates, load, close, call, ok, denied, root, path, detail, sources, makeDocument, makeCampaign, makeSources, prepareInput, prepare, command, decide, makeReady, makeEvidence, snapshot, externalAttempts, sha};
  } catch (error) {await close(); throw error;}
};
