// Synthetic identities and native signed documents for the actual F08 HTTP gate.
// This fixture is confined to a named disposable loopback PostgreSQL database.
// It deliberately retains its rows for the independent pg_dump/restore gate.
const assert = require('node:assert/strict');
const {createHash, randomBytes, randomUUID, scryptSync} = require('node:crypto');
const {resolve} = require('node:path');

exports.openFixture = async function openFixture() {
  assert.equal(process.env.CI, 'true');
  assert.equal(process.env.NODE_ENV, 'test');
  assert.equal(process.env.COMMERCE_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
  assert.equal(process.env.F08_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
  const database = new URL(process.env.DATABASE_URL || 'invalid:');
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(database.hostname));
  assert.match(database.pathname, /^\/commerce_test_f08_[a-z0-9_]+$/);
  assert.equal(process.env.TZ || 'UTC', 'UTC');
  Object.assign(process.env, {
    JWT_SECRET: 'SYNTHETIC_F08_local_session_secret_at_least_32_characters',
    HYDROLAND_AI_TEST_MANUAL_WORKER: '1',
    HYDROLAND_INTEGRATION_EMAIL_STATUS: 'DISABLED', HYDROLAND_EMAIL_PROVIDER: 'NONE',
    HYDROLAND_INTEGRATION_PAYMENT_PSP_STATUS: 'DISABLED', HYDROLAND_PAYMENT_PROVIDER: 'NONE',
    HYDROLAND_PUBLIC_WEB_ORIGIN: 'https://synthetic-f08.example.invalid',
  });
  const nativeFetch = global.fetch, externalAttempts = [];
  let app, db, base;
  global.fetch = (input, options) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (!base || url.origin !== new URL(base).origin) {
      externalAttempts.push({origin: url.origin, path: url.pathname});
      throw new Error('F08 fixture forbids external HTTP');
    }
    return nativeFetch(input, {...options, redirect: 'error', signal: options?.signal || AbortSignal.timeout(20_000)});
  };
  const dist = process.env.F08_TEST_DIST || resolve(__dirname, '../dist');
  const load = file => require(resolve(dist, file));
  require('reflect-metadata');
  try {
    const {NestFactory} = require('@nestjs/core');
    app = await NestFactory.create(load('app.module.js').AppModule, {logger: false, abortOnError: false});
    app.setGlobalPrefix('api/v1'); app.useBodyParser('json', {limit: '15mb'});
    await app.listen(0, '127.0.0.1'); base = (await app.getUrl()) + '/api/v1';
    db = app.get(load('database/database.service.js').DatabaseService);
    const zone = await db.$queryRaw`SHOW TimeZone`;
    assert.ok(['UTC', 'Etc/UTC'].includes(zone[0]?.TimeZone), 'F08 native evidence uses a UTC PostgreSQL session');
    console.log('F08 PostgreSQL session timezone=' + zone[0].TimeZone);
  } catch (error) {global.fetch = nativeFetch; await app?.close(); throw error;}
  const close = async () => {try {await app.close();} finally {global.fetch = nativeFetch;} assert.deepEqual(externalAttempts, []);};
  const call = async (actor, path, method = 'GET', input) => {
    const response = await fetch(base + path, {method, headers: {'content-type': 'application/json', ...(actor ? {authorization: 'Bearer ' + actor.token} : {})},
      ...(input === undefined ? {} : {body: JSON.stringify(input)})});
    const raw = await response.text(); let data;
    try {data = JSON.parse(raw);} catch {data = raw;}
    return {status: response.status, data};
  };
  const ok = result => {assert.ok(result.status >= 200 && result.status < 300, JSON.stringify(result)); return result.data;};
  const denied = (result, expected) => {
    const statuses = Array.isArray(expected) ? expected : [expected];
    assert.ok(statuses.includes(result.status), JSON.stringify(result)); return result.data;
  };
  const password = randomBytes(20).toString('hex'), salt = randomBytes(16).toString('hex');
  const passwordHash = salt + ':' + scryptSync(password, salt, 64).toString('hex');
  const account = async label => {
    const person = await db.person.create({data: {firstName: 'Synthetic F08', lastName: label}});
    const row = await db.account.create({data: {personId: person.id, email: `${label.toLowerCase()}-${randomUUID()}@example.invalid`, passwordHash, status: 'ACTIVE', emailVerifiedAt: new Date()}});
    const login = ok(await call(null, '/auth/login', 'POST', {email: row.email, password}));
    assert.ok(login.accessToken); return {...row, token: login.accessToken};
  };
  const organization = async label => {
    const actors = {};
    // Native document preparation, approval and signature have separate people,
    // distinct from the six procurement roles and the organization owner.
    for (const role of ['owner', 'maker', 'recommender', 'receiver', 'accountant', 'treasurer', 'acceptor', 'documentCreator', 'documentApprover', 'documentSigner', 'viewer']) {
      actors[role] = await account(`${label}-${role}`);
    }
    const row = await db.organization.create({data: {ownerId: actors.owner.id, kind: 'ORGANIZATION', status: 'ACTIVE',
      displayName: 'Synthetic F08 ' + label, legalName: 'Synthetic F08 organization ' + label, registrationNumber: 'SYN-F08-' + randomUUID(), address: 'Disposable loopback fixture only'}});
    for (const [role, actor] of Object.entries(actors)) await db.organizationMember.create({data: {organizationId: row.id, accountId: actor.id,
      role: role === 'owner' ? 'OWNER' : ['documentApprover', 'documentSigner', 'treasurer'].includes(role) ? 'ADMIN' : role === 'viewer' ? 'VIEWER' : 'STAFF', status: 'ACTIVE'}});
    const finance = await db.financeAccount.create({data: {organizationId: row.id, name: 'Synthetic F08 native account ' + label, currency: 'SAR'}});
    return {...row, actors, finance, templates: new Map()};
  };
  let org, other, outsider;
  try {org = await organization('primary'); other = await organization('other'); outsider = await account('outsider');}
  catch (error) {await close(); throw error;}
  const prefix = org => `/organizations/${org.id}/procurement`;
  const workspace = async (organization = org, actor = organization.actors.owner) => ok(await call(actor, prefix(organization) + '/workspace'));
  const install = async organization => {
    ok(await call(organization.actors.owner, prefix(organization) + '/templates/install', 'POST', {}));
    const rows = ok(await call(organization.actors.owner, `/documents/organizations/${organization.id}/templates`));
    for (const row of rows) organization.templates.set(row.code, row);
    for (const suffix of ['SUPPLIER', 'CONTRACT', 'EVIDENCE']) assert.ok(organization.templates.has(`F08-PROCUREMENT-${suffix}-V1`));
  };
  const sha = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
  const makeDocument = async (organization, code, payload, options = {}) => {
    const template = organization.templates.get(code); assert.ok(template, code);
    const creator = options.creator || organization.actors.documentCreator;
    const approver = options.approver || organization.actors.documentApprover;
    const signer = options.signer || organization.actors.documentSigner;
    let document = ok(await call(creator, '/documents', 'POST', {organizationId: organization.id, templateId: template.id,
      department: template.department, contentHash: 'sha256:' + sha(payload), payload}));
    let attachment;
    if (options.pdf) {
      const {PDFDocument} = require('pdf-lib');
      const pdf = await PDFDocument.create();
      pdf.setTitle('SYNTHETIC F08 ORIGINAL EVIDENCE - NOT A REAL TRANSACTION');
      const page = pdf.addPage([595, 842]);
      page.drawText('SYNTHETIC F08: isolated acceptance evidence only', {x: 40, y: 790, size: 11});
      page.drawText('Document: ' + document.id, {x: 40, y: 760, size: 10});
      page.drawText('Payload SHA-256: ' + sha(payload), {x: 40, y: 735, size: 8});
      const bytes = Buffer.from(await pdf.save());
      attachment = ok(await call(creator, `/documents/${document.id}/attachments`, 'POST', {filename: 'synthetic-f08-original.pdf', mimeType: 'application/pdf', base64: bytes.toString('base64')}));
      assert.equal(attachment.sha256, sha(bytes)); assert.equal(attachment.byteSize, bytes.length);
      const saved = await db.managedDocumentAttachment.findUniqueOrThrow({where: {id: attachment.id}});
      assert.ok(Buffer.from(saved.content).equals(bytes));
    }
    if (options.status !== 'DRAFT') {
      document = ok(await call(creator, `/documents/${document.id}/submit`, 'POST', {}));
      if (options.status !== 'PENDING_APPROVAL') {
        document = ok(await call(approver, `/documents/${document.id}/approve`, 'POST', {}));
        if (options.status !== 'APPROVED') document = ok(await call(signer, `/documents/${document.id}/sign`, 'POST', {}));
      }
    }
    return {...document, attachment};
  };
  const documentRef = async (organization, document, collection) => {
    const view = await workspace(organization);
    const row = view.documents[collection].find(item => item.id === document.id);
    assert.ok(row, `Native document ${document.id} absent from ${collection}: ${JSON.stringify(view.documents[collection])}`);
    assert.match(row.hash, /^[a-f0-9]{64}$/);
    return {documentId: document.id, documentVersion: document.version, documentHash: row.hash};
  };
  const day = delta => {
    const local = new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
    return new Date(Date.parse(local + 'T00:00:00Z') + delta * 86_400_000).toISOString().slice(0, 10);
  };
  const lines = [
    {lineId: 'LINE-TAXABLE', description: 'Synthetic equipment - explicit tax', quantity: 3, unitPriceMinor: 1000, taxMinor: 450, taxTreatment: 'TAXABLE', taxReason: 'Synthetic explicit tax test basis; not a real tax invoice'},
    {lineId: 'LINE-EXEMPT', description: 'Synthetic zero tax supplies', quantity: 2, unitPriceMinor: 500, taxMinor: 0, taxTreatment: 'EXEMPT', taxReason: 'Synthetic exempt fixture basis'},
  ];
  const makeSupplier = async (organization = org, overrides = {}, options = {}) => {
    const payload = {purpose: 'F08_PROCUREMENT_SUPPLIER_V1', supplierRef: 'SYN-SUPPLIER-' + randomUUID(), supplierName: 'Synthetic supplier - no real vendor',
      supplierAcceptanceRef: 'SYN-QUALIFICATION-' + randomUUID(), validUntil: day(365), scope: 'Synthetic F08 isolated procurement acceptance', ...overrides};
    const document = await makeDocument(organization, 'F08-PROCUREMENT-SUPPLIER-V1', payload, options);
    return {document, payload, ...(document.status === 'SIGNED' ? {ref: await documentRef(organization, document, 'suppliers')} : {})};
  };
  const makeContract = async (organization = org, overrides = {}, options = {}) => {
    const supplier = options.supplier || organization.supplier;
    assert.ok(supplier?.ref, 'A signed native supplier source is required');
    const payload = {purpose: 'F08_PROCUREMENT_CONTRACT_V1', purchaseReference: 'SYN-PO-' + randomUUID(),
      supplierDocumentId: supplier.document.id, supplierDocumentHash: supplier.ref.documentHash, currency: 'SAR', totalMinor: 4450,
      procurementMethod: 'Synthetic purchase order', procurementSystem: 'Native isolated F08 evidence', integrationMode: 'MANUAL_EVIDENCE',
      validFrom: day(-2), validUntil: day(365), ...Object.fromEntries(['maker', 'recommender', 'receiver', 'accountant', 'treasurer', 'acceptor'].map(role => [role + 'AccountId', organization.actors[role].id])),
      lines: structuredClone(lines), settlementPolicy: 'FULL_ORDER_AFTER_RECEIPT_ACCEPTANCE',
      cancellationPolicy: 'BEFORE_ANY_EFFECT', cancellationTerms: 'Cancel only before any original execution effect.',
      reversalPolicy: 'FULL_ORDER_RETURN_AND_RECOVERY', reversalTerms: 'Return every received quantity; recover proven full outgoing funds using independent original proof.',
      acceptanceMethod: 'Synthetic independent document acceptance bound to current source digest; not real representative acceptance.', ...overrides};
    const document = await makeDocument(organization, 'F08-PROCUREMENT-CONTRACT-V1', payload, options);
    const ref = document.status === 'SIGNED' ? await documentRef(organization, document, 'contracts') : null;
    return {document, payload, ref};
  };
  const makeEvidence = async (organization, order, kind, overrides = {}, options = {}) => {
    const payload = {purpose: 'F08_PROCUREMENT_EVIDENCE_V1', kind, orderId: order.id, contractHash: order.contract.hash,
      reference: 'SYN-' + kind + '-' + randomUUID(), occurredAt: new Date().toISOString(),
      findings: 'Synthetic isolated acceptance evidence; no real organization delivery or bank action.', ...overrides};
    const document = await makeDocument(organization, 'F08-PROCUREMENT-EVIDENCE-V1', payload,
      {pdf: ['INVOICE', 'SETTLEMENT', 'REVERSAL', 'RECOVERY'].includes(kind), ...options});
    return {document, payload, ref: document.status === 'SIGNED' ? await documentRef(organization, document, 'evidence') : null};
  };
  const snapshot = async () => {
    const organizationIds = [org.id, other.id];
    const values = await Promise.all([
      db.procurementOrder.findMany({where: {organizationId: {in: organizationIds}}, orderBy: {id: 'asc'}}),
      db.procurementOrderEvent.findMany({where: {organizationId: {in: organizationIds}}, orderBy: {id: 'asc'}}),
      db.procurementReceipt.findMany({where: {organizationId: {in: organizationIds}}, orderBy: {id: 'asc'}}),
      db.procurementMoneyProof.findMany({where: {organizationId: {in: organizationIds}}, orderBy: {id: 'asc'}}),
      db.financeEntry.findMany({where: {organizationId: {in: organizationIds}}, orderBy: {id: 'asc'}}),
      db.financeApproval.findMany({where: {financeEntry: {organizationId: {in: organizationIds}}}, orderBy: {id: 'asc'}}),
      db.auditEvent.findMany({where: {resource: {in: ['ProcurementOrder', 'FinanceEntry']}}, orderBy: {id: 'asc'}}),
    ]);
    return JSON.stringify(values);
  };
  const noEffects = async (run, expected) => {const before = await snapshot(); const result = await run(); denied(result, expected); assert.equal(await snapshot(), before, 'Rejected action changed procurement, finance or audit state'); return result;};
  return {app, db, load, call, ok, denied, close, account, org, other, outsider, prefix, workspace, install, sha, day, lines,
    makeDocument, documentRef, makeSupplier, makeContract, makeEvidence, snapshot, noEffects, externalAttempts};
};
