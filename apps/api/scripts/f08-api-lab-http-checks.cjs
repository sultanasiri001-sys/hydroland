// Real Nest/HTTP/PostgreSQL checks of the owner-only synthetic preparation lab.
// No customer organization is provisioned. Every provider check is an explicit
// test stub; the separate transport suite tests real isolated HTTPS sockets.
const assert = require('node:assert/strict');
const { createHash, randomBytes, randomUUID, scryptSync } = require('node:crypto');
const { mkdirSync, writeFileSync } = require('node:fs');
const { dirname, resolve } = require('node:path');

(async () => {
  assert.equal(process.env.CI, 'true'); assert.equal(process.env.NODE_ENV, 'test');
  assert.equal(process.env.F08_API_LAB_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
  const database = new URL(process.env.DATABASE_URL || 'invalid:');
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(database.hostname));
  assert.match(database.pathname, /^\/commerce_test_f08_api_[a-z0-9_]+$/);
  const startedAt = new Date().toISOString(), checks = [], externalAttempts = [], nativeFetch = global.fetch;
  let app, db, base, transport, originalCheck, checkHandler, checkCalls = 0, success = false, retained;
  const syntheticSecret = 'SYNTHETIC_F08_API_SECRET_NOT_A_REAL_CREDENTIAL';
  Object.assign(process.env, { JWT_SECRET: 'SYNTHETIC_F08_API_LOCAL_SECRET_AT_LEAST_32_CHARACTERS', HYDROLAND_AI_TEST_MANUAL_WORKER: '1',
    HYDROLAND_INTEGRATION_EMAIL_STATUS: 'DISABLED', HYDROLAND_EMAIL_PROVIDER: 'NONE', HYDROLAND_INTEGRATION_PAYMENT_PSP_STATUS: 'DISABLED', HYDROLAND_PAYMENT_PROVIDER: 'NONE',
    HYDROLAND_PROCUREMENT_API_SECRET_TEST: syntheticSecret,
    HYDROLAND_PROCUREMENT_API_CREDENTIALS: JSON.stringify([
      { ref: 'synthetic-test', label: 'Synthetic registered test reference', origin: 'https://supplier.example.com', secretEnv: 'HYDROLAND_PROCUREMENT_API_SECRET_TEST', authMode: 'BEARER' },
      { ref: 'synthetic-missing', label: 'Synthetic unconfigured reference', origin: 'https://supplier.example.com', secretEnv: 'HYDROLAND_PROCUREMENT_API_SECRET_MISSING', authMode: 'BEARER' },
    ]) });
  delete process.env.HYDROLAND_PROCUREMENT_API_SECRET_MISSING;
  global.fetch = (input, options) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (!base || url.origin !== new URL(base).origin) { externalAttempts.push(url.origin); throw new Error('F08 API lab fixture forbids external HTTP'); }
    return nativeFetch(input, { ...options, redirect: 'error', signal: options?.signal || AbortSignal.timeout(30_000) });
  };
  const dist = process.env.F08_API_TEST_DIST || resolve(__dirname, '../dist'), load = file => require(resolve(dist, file));
  const test = async (name, work) => { const at = Date.now(); try { await work(); checks.push({ name, status: 'PASS', durationMs: Date.now() - at }); console.log('F08 API LAB PASS ' + name); }
    catch (error) { checks.push({ name, status: 'FAIL', durationMs: Date.now() - at, message: error.message }); throw error; } };
  const ok = response => { assert.ok(response.status >= 200 && response.status < 300, JSON.stringify(response)); return response.data; };
  const denied = (response, statuses) => { assert.ok((Array.isArray(statuses) ? statuses : [statuses]).includes(response.status), JSON.stringify(response)); return response.data; };
  const call = async (actor, path, method = 'GET', body) => {
    const response = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(actor ? { authorization: 'Bearer ' + actor.token } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const raw = await response.text(); let data; try { data = JSON.parse(raw); } catch { data = raw; } return { status: response.status, data };
  };
  const sha = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
  try {
    require('reflect-metadata');
    transport = load('procurement-lab/procurement-api-transport.js'); originalCheck = transport.checkProcurementConnection;
    transport.checkProcurementConnection = async settings => {
      checkCalls += 1;
      assert.equal(settings.endpoint, 'https://supplier.example.com/api/');
      if (checkHandler) return checkHandler(settings);
      return { status: 'SUCCEEDED', code: 'CAPABILITIES_VERIFIED', checkedAt: new Date().toISOString(), externalRequestAttempted: false };
    };
    const { NestFactory } = require('@nestjs/core');
    app = await NestFactory.create(load('app.module.js').AppModule, { logger: false, abortOnError: false });
    app.setGlobalPrefix('api/v1'); app.useBodyParser('json', { limit: '15mb' }); await app.listen(0, '127.0.0.1');
    base = (await app.getUrl()) + '/api/v1'; db = app.get(load('database/database.service.js').DatabaseService);
    const zone = await db.$queryRaw`SHOW TimeZone`; assert.ok(['UTC', 'Etc/UTC'].includes(zone[0]?.TimeZone));
    const password = randomBytes(24).toString('hex'), salt = randomBytes(16).toString('hex'), passwordHash = salt + ':' + scryptSync(password, salt, 64).toString('hex');
    const actor = async (label, admin) => {
      const person = await db.person.create({ data: { firstName: 'Synthetic API lab', lastName: label } });
      const account = await db.account.create({ data: { personId: person.id, email: label + '-' + randomUUID() + '@example.invalid', passwordHash, status: 'ACTIVE', emailVerifiedAt: new Date() } });
      const role = admin ? await db.roleAssignment.create({ data: { accountId: account.id, role: 'ADMIN', status: 'ACTIVE' } }) : null;
      const login = ok(await call(null, '/auth/login', 'POST', { email: account.email, password }));
      const session = await db.session.findFirstOrThrow({ where: { accountId: account.id }, orderBy: { createdAt: 'desc' } });
      return { ...account, token: login.accessToken, role, session };
    };
    const owner = await actor('owner', true), other = await actor('other-admin', true), ordinary = await actor('ordinary', false);
    const { PLATFORM_STAFFING_KEY, PLATFORM_STAFFING_KIND } = load('hr/staffing-catalog.js');
    const platform = await db.organization.create({ data: { ownerId: owner.id, kind: PLATFORM_STAFFING_KIND, status: 'ACTIVE', displayName: 'Synthetic internal HYDROLAND', legalName: 'Synthetic internal platform only', registrationNumber: 'SYNTHETIC-LAB-' + randomUUID(), address: 'Disposable fixture only' } });
    await db.operationalSetting.create({ data: { key: PLATFORM_STAFFING_KEY, value: { organizationId: platform.id } } });
    assert.equal(await db.organization.count({ where: { kind: { not: PLATFORM_STAFFING_KIND } } }), 0);
    const rootPath = '/procurement-lab';
    const read = async session => ok(await call(owner, rootPath + '/sessions/' + (typeof session === 'string' ? session : session.id)));
    const create = async input => ok(await call(owner, rootPath + '/sessions', 'POST', { requestId: randomUUID(), scenario: 'STANDARD_V1', ...input }));
    const envelope = (session, action, role, payload = {}) => ({ requestId: randomUUID(), expectedRevision: session.revision, expectedDigest: session.digest, action, role, payload });
    const act = async (session, action, role, payload = {}) => ok(await call(owner, rootPath + '/sessions/' + session.id + '/actions', 'POST', envelope(session, action, role, payload)));
    const labSnapshot = async () => JSON.stringify(await Promise.all([
      db.procurementLabSession.findMany({ orderBy: { id: 'asc' } }), db.procurementLabEvent.findMany({ orderBy: { id: 'asc' } }), db.procurementApiProfile.findMany({ orderBy: { id: 'asc' } }),
    ]));
    const noEffects = async (work, statuses) => { const before = await labSnapshot(); const response = await work(); denied(response, statuses); assert.equal(await labSnapshot(), before, 'A rejected request changed retained lab or API configuration'); return response; };
    const changed = async (model, where, data, work) => {
      const before = await db[model].findUniqueOrThrow({ where }), restore = Object.fromEntries(Object.keys(data).map(key => [key, before[key]]));
      if ('updatedAt' in before) restore.updatedAt = before.updatedAt;
      await db[model].update({ where, data }); try { return await work(); } finally { await db[model].update({ where, data: restore }); }
    };
    const businessTables = (await db.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`).map(row => row.tablename).filter(table => !['ProcurementLabSession', 'ProcurementLabEvent', 'ProcurementApiProfile'].includes(table));
    const businessSnapshot = async () => {
      const rows = [];
      for (const table of businessTables) {
        const quoted = '"' + table.replaceAll('"', '""') + '"';
        // Runtime scheduler leases are not procurement business effects.
        const filter = table === 'OperationalSetting' ? ' WHERE "key" NOT LIKE \'LEASE:%\'' : '';
        const [fingerprint] = await db.$queryRawUnsafe(`SELECT count(*)::text AS count,md5(coalesce(string_agg(md5(to_jsonb(r)::text),'' ORDER BY md5(to_jsonb(r)::text)),'')) AS digest FROM (SELECT * FROM ${quoted}${filter}) r`);
        rows.push({ table, ...fingerprint });
      }
      return JSON.stringify(rows);
    };
    const originals = await businessSnapshot();
    let session, settledSession, recoveredSession, profile, schema;

    await test('owner preparation works without a customer organization and initial reads write nothing', async () => {
      const before = await labSnapshot(), workspace = ok(await call(owner, rootPath + '/workspace'));
      assert.deepEqual(workspace.sessions, []); assert.equal(workspace.capabilities.create.allowed, true);
      assert.equal(workspace.integration.businessExchangeEnabled, false); assert.equal(workspace.integration.requiresRealOrganizationForInternalTest, false);
      assert.equal(await labSnapshot(), before); assert.equal(await db.organization.count(), 1);
    });
    await test('authentication, current canonical ownership and verified ADMIN are mandatory', async () => {
      await noEffects(() => call(null, rootPath + '/workspace'), 401);
      await noEffects(() => call(other, rootPath + '/workspace'), 403);
      await noEffects(() => call(ordinary, rootPath + '/workspace'), 403);
      await changed('account', { id: owner.id }, { emailVerifiedAt: null }, () => noEffects(() => call(owner, rootPath + '/workspace'), 401));
      await changed('account', { id: owner.id }, { status: 'SUSPENDED' }, () => noEffects(() => call(owner, rootPath + '/workspace'), 401));
      await changed('roleAssignment', { id: owner.role.id }, { status: 'SUSPENDED' }, () => noEffects(() => call(owner, rootPath + '/workspace'), 403));
      await changed('session', { id: owner.session.id }, { revokedAt: new Date() }, () => noEffects(() => call(owner, rootPath + '/workspace'), 401));
    });
    await test('published exchange schema validates all synthetic message kinds without business effects', async () => {
      const before = await labSnapshot(); schema = ok(await call(owner, rootPath + '/contract'));
      assert.equal(schema.protocol, 'HYDROLAND_PROCUREMENT_EXCHANGE_V1'); assert.equal(schema.boundary.businessWrites, false);
      for (const example of Object.values(schema.examples)) {
        const result = ok(await call(owner, rootPath + '/exchange/validate', 'POST', { message: example }));
        assert.equal(result.valid, true); assert.equal(result.execution, 'VALIDATION_ONLY'); assert.equal(result.businessEffects, false); assert.match(result.messageDigest, /^[a-f0-9]{64}$/);
      }
      const bad = structuredClone(schema.examples.invoice); bad.payload.totalMinor += 1;
      assert.equal(ok(await call(owner, rootPath + '/exchange/validate', 'POST', { message: bad })).valid, false);
      bad.payload.totalMinor = '4300'; assert.equal(ok(await call(owner, rootPath + '/exchange/validate', 'POST', { message: bad })).valid, false);
      assert.equal(ok(await call(owner, rootPath + '/exchange/validate', 'POST', { message: { ...schema.examples.receipt, mode: ['TEST'] } })).valid, false);
      await noEffects(() => call(other, rootPath + '/exchange/validate', 'POST', { message: schema.examples.receipt }), 403);
      assert.equal(await labSnapshot(), before);
    });
    await test('concurrent creation is idempotent and preserves the original synthetic occurrence', async () => {
      const body = { requestId: randomUUID(), scenario: 'STANDARD_V1' };
      const results = await Promise.all([call(owner, rootPath + '/sessions', 'POST', body), call(owner, rootPath + '/sessions', 'POST', body)]);
      const [a, b] = results.map(ok); assert.equal(a.id, b.id); assert.equal(a.digest, b.digest); assert.equal(a.createdAt, b.createdAt);
      assert.equal(await db.procurementLabSession.count(), 1); assert.equal(await db.procurementLabEvent.count(), 1);
      session = a; assert.equal(session.totals.amountMinor, 4450); assert.equal(session.lines[0].taxMinor, 450);
      assert.equal(session.synthetic, true); assert.equal(session.realFinancialEffects, false); assert.equal(session.externalTraffic, false);
      const changedBody = { ...body, lines: session.lines.map(({ receivedQuantity, remainingQuantity, returnedQuantity, ...line }) => ({ ...line, unitPriceMinor: line.unitPriceMinor + 1 })) };
      await noEffects(() => call(owner, rootPath + '/sessions', 'POST', changedBody), 409);
    });
    await test('custom line validation rejects invalid totals, taxes, quantities and unbounded content', async () => {
      const custom = await create({ lines: [{ ...schema.examples.invoice.payload.lines[0], quantity: 1, unitPriceMinor: 100, taxMinor: 15 }] });
      assert.equal(custom.totals.amountMinor, 115); assert.equal(custom.lines.length, 1);
      for (const replacement of [{ quantity: 0 }, { quantity: 1.5 }, { taxMinor: 0 }, { unitPriceMinor: 2147483647 }, { injected: true }]) {
        await noEffects(() => call(owner, rootPath + '/sessions', 'POST', { requestId: randomUUID(), scenario: 'STANDARD_V1', lines: [{ ...schema.examples.invoice.payload.lines[0], ...replacement }] }), 400);
      }
      await noEffects(() => call(owner, rootPath + '/sessions', 'POST', { requestId: randomUUID(), scenario: 'STANDARD_V1', ownerAccountId: other.id }), 400);
      await noEffects(() => call(owner, rootPath + '/sessions', 'POST', { requestId: randomUUID(), scenario: 'STANDARD_V1', lines: Array(51).fill(schema.examples.invoice.payload.lines[0]) }), 400);
      await noEffects(() => call(owner, rootPath + '/sessions/' + session.id + '/actions', 'POST', envelope(session, 'RECOMMEND', 'RECOMMENDER', { decision: 'APPROVE', note: 'x'.repeat(70_000) })), 400);
    });
    await test('session ownership remains isolated after the configured platform owner changes', async () => {
      await changed('organization', { id: platform.id }, { ownerId: other.id }, async () => {
        await noEffects(() => call(owner, rootPath + '/sessions/' + session.id), 403);
        await noEffects(() => call(other, rootPath + '/sessions/' + session.id), 404);
        const workspace = ok(await call(other, rootPath + '/workspace')); assert.deepEqual(workspace.sessions, []);
      });
    });
    await test('simulation decisions reject role forgery and coercible arrays before any effect', async () => {
      for (const decision of [['APPROVE'], ['DECLINE'], true, { toString: 'APPROVE' }]) await noEffects(() => call(owner, rootPath + '/sessions/' + session.id + '/actions', 'POST', envelope(session, 'RECOMMEND', 'RECOMMENDER', { decision, note: 'Malformed synthetic decision' })), 400);
      await noEffects(() => call(owner, rootPath + '/sessions/' + session.id + '/actions', 'POST', envelope(session, 'RECOMMEND', 'OWNER', { decision: 'APPROVE', note: 'Wrong simulated role' })), 400);
      await noEffects(() => call(owner, rootPath + '/sessions/' + session.id + '/actions', 'POST', envelope(session, 'APPROVE', 'OWNER', { decision: 'APPROVE', note: 'Premature approval' })), 409);
    });
    await test('different-key recommendation race commits once and replay does not duplicate an event', async () => {
      const before = session, first = envelope(before, 'RECOMMEND', 'RECOMMENDER', { decision: 'APPROVE', note: 'Synthetic recommendation' }), second = { ...first, requestId: randomUUID() };
      const responses = await Promise.all([call(owner, rootPath + '/sessions/' + before.id + '/actions', 'POST', first), call(owner, rootPath + '/sessions/' + before.id + '/actions', 'POST', second)]);
      assert.equal(responses.filter(row => row.status === 409).length, 1); session = ok(responses.find(row => row.status !== 409)); assert.equal(session.revision, 2);
      const winning = responses[0].status === 409 ? second : first, replay = ok(await call(owner, rootPath + '/sessions/' + before.id + '/actions', 'POST', winning));
      assert.equal(replay.command.replayed, true); assert.equal(replay.digest, session.digest);
      await noEffects(() => call(owner, rootPath + '/sessions/' + before.id + '/actions', 'POST', { ...winning, payload: { decision: 'DECLINE', note: 'Changed replay' } }), 409);
      session = await act(session, 'APPROVE', 'OWNER', { decision: 'APPROVE', note: 'Synthetic final owner decision' });
      await noEffects(() => call(owner, rootPath + '/sessions/' + before.id + '/actions', 'POST', envelope(before, 'CANCEL', 'OWNER', { reason: 'Stale cancellation' })), 409);
    });
    await test('invoice and partial receipts obey original quantities, explicit tax and full-receipt acceptance', async () => {
      const lines = session.lines.map(({ receivedQuantity, remainingQuantity, returnedQuantity, ...line }) => line);
      await noEffects(() => call(owner, rootPath + '/sessions/' + session.id + '/actions', 'POST', envelope(session, 'INVOICE', 'ACCOUNTANT', { reference: 'SIM-INV', lines, amountMinor: 4449 })), 409);
      session = await act(session, 'INVOICE', 'ACCOUNTANT', { reference: 'SIM-INV', lines, amountMinor: 4450 });
      await noEffects(() => call(owner, rootPath + '/sessions/' + session.id + '/actions', 'POST', envelope(session, 'RECEIVE', 'RECEIVER', { reference: 'SIM-RECEIPT', quantities: [{ lineId: lines[0].lineId, quantity: 4 }] })), 409);
      session = await act(session, 'RECEIVE', 'RECEIVER', { reference: 'SIM-RECEIPT-1', quantities: [{ lineId: lines[0].lineId, quantity: 1 }] });
      assert.equal(session.lines[0].remainingQuantity, 2); assert.equal(session.actions.PREPARE_SETTLEMENT.allowed, false);
      await noEffects(() => call(owner, rootPath + '/sessions/' + session.id + '/actions', 'POST', envelope(session, 'RECEIPT_ACCEPTANCE', 'ACCEPTOR', { evidenceDigest: session.receiptDigest, note: 'Premature receipt acceptance' })), 409);
      await noEffects(() => call(owner, rootPath + '/sessions/' + session.id + '/actions', 'POST', envelope(session, 'RECEIVE', 'RECEIVER', { reference: ' sim-receipt-1 ', quantities: [{ lineId: lines[0].lineId, quantity: 1 }] })), 409);
      session = await act(session, 'RECEIVE', 'RECEIVER', { reference: 'SIM-RECEIPT-2', quantities: session.lines.filter(line => line.remainingQuantity > 0).map(line => ({ lineId: line.lineId, quantity: line.remainingQuantity })) });
      await noEffects(() => call(owner, rootPath + '/sessions/' + session.id + '/actions', 'POST', envelope(session, 'RECEIPT_ACCEPTANCE', 'ACCEPTOR', { evidenceDigest: '0'.repeat(64), note: 'Wrong receipt digest' })), 409);
      session = await act(session, 'RECEIPT_ACCEPTANCE', 'ACCEPTOR', { evidenceDigest: session.receiptDigest, note: 'Synthetic complete receipt accepted' });
    });
    await test('simulated settlement retains rejection history and requires exact independently selected roles', async () => {
      session = await act(session, 'PREPARE_SETTLEMENT', 'ACCOUNTANT');
      session = await act(session, 'APPROVE_SETTLEMENT', 'OWNER', { decision: 'DECLINE', note: 'Synthetic rejected financial preparation' });
      const rejectedId = session.settlement.id; session = await act(session, 'PREPARE_SETTLEMENT', 'ACCOUNTANT'); assert.notEqual(session.settlement.id, rejectedId);
      session = await act(session, 'APPROVE_SETTLEMENT', 'OWNER', { decision: 'APPROVE', note: 'Synthetic movement approved' });
      await noEffects(() => call(owner, rootPath + '/sessions/' + session.id + '/actions', 'POST', envelope(session, 'CONFIRM_SETTLEMENT', 'TREASURER', { reference: 'SIM-OUT', amountMinor: 4451 })), 409);
      session = await act(session, 'CONFIRM_SETTLEMENT', 'TREASURER', { reference: 'SIM-OUT', amountMinor: 4450 });
      assert.equal(session.status, 'SETTLED'); assert.deepEqual(session.totals, { amountMinor: 4450, settledMinor: 4450, recoveredMinor: 0, netPaidMinor: 4450, remainingMinor: 0, recoveryRequiredMinor: 0 });
      assert.equal(session.simulatedLedger.find(row => row.id === rejectedId).status, 'REJECTED');
      session = await act(session, 'ACCEPTANCE', 'ACCEPTOR', { evidenceDigest: session.completionDigest, note: 'Synthetic complete cycle acceptance' });
      assert.equal(session.acceptance.valid, true); assert.equal(session.acceptance.realRepresentativeAcceptance, false); settledSession = session.id;
    });
    await test('full reversal invalidates earlier acceptance and recovery preserves original outgoing evidence', async () => {
      const originalOutgoing = structuredClone(session.settlement), returned = session.lines.map(line => ({ lineId: line.lineId, quantity: line.receivedQuantity }));
      await noEffects(() => call(owner, rootPath + '/sessions/' + session.id + '/actions', 'POST', envelope(session, 'REVERSE', 'OWNER', { reference: 'SIM-RETURN', quantities: [], amountMinor: 4450, reason: 'Incomplete return' })), 409);
      session = await act(session, 'REVERSE', 'OWNER', { reference: 'SIM-RETURN', quantities: returned, amountMinor: 4450, reason: 'Synthetic full return' });
      assert.equal(session.status, 'RECOVERY_REQUIRED'); assert.equal(session.acceptance.valid, false); assert.equal(session.totals.recoveryRequiredMinor, 4450);
      await noEffects(() => call(owner, rootPath + '/sessions/' + session.id + '/actions', 'POST', envelope(session, 'ACCEPTANCE', 'ACCEPTOR', { evidenceDigest: session.completionDigest, note: 'Cannot accept before recovery' })), 409);
      session = await act(session, 'PREPARE_RECOVERY', 'ACCOUNTANT'); session = await act(session, 'APPROVE_RECOVERY', 'OWNER', { decision: 'APPROVE', note: 'Synthetic incoming recovery approval' });
      await noEffects(() => call(owner, rootPath + '/sessions/' + session.id + '/actions', 'POST', envelope(session, 'CONFIRM_RECOVERY', 'TREASURER', { reference: ' sim-out ', amountMinor: 4450 })), 409);
      session = await act(session, 'CONFIRM_RECOVERY', 'TREASURER', { reference: 'SIM-IN', amountMinor: 4450 });
      assert.equal(session.status, 'RECOVERED'); assert.equal(session.totals.netPaidMinor, 0); assert.equal(session.totals.recoveryRequiredMinor, 0); assert.deepEqual(session.settlement, originalOutgoing);
      session = await act(session, 'ACCEPTANCE', 'ACCEPTOR', { evidenceDigest: session.completionDigest, note: 'Synthetic returned and recovered cycle accepted' }); assert.equal(session.acceptance.valid, true); recoveredSession = session.id;
    });
    await test('negative recommendation retains the owner final decision and cancellation is effect-free only', async () => {
      let rejected = await create(); rejected = await act(rejected, 'RECOMMEND', 'RECOMMENDER', { decision: 'DECLINE', note: 'Synthetic negative recommendation' });
      assert.equal(rejected.status, 'RECOMMENDED'); assert.equal(rejected.actions.APPROVE.allowed, true);
      rejected = await act(rejected, 'APPROVE', 'OWNER', { decision: 'DECLINE', note: 'Synthetic final refusal' }); assert.equal(rejected.status, 'DECLINED');
      let cancelled = await create(); cancelled = await act(cancelled, 'CANCEL', 'OWNER', { reason: 'Synthetic reset uses a fresh session; this scenario is cancelled' }); assert.equal(cancelled.status, 'CANCELLED');
      await noEffects(() => call(owner, rootPath + '/sessions/' + session.id + '/actions', 'POST', envelope(session, 'CANCEL', 'OWNER', { reason: 'Cannot cancel an executed cycle' })), 409);
    });
    const fullyReceived = async () => {
      let s = await create(); s = await act(s, 'RECOMMEND', 'RECOMMENDER', { decision: 'APPROVE', note: 'Synthetic recommendation' });
      s = await act(s, 'APPROVE', 'OWNER', { decision: 'APPROVE', note: 'Synthetic approval' });
      s = await act(s, 'INVOICE', 'ACCOUNTANT', { reference: 'SIM-UNPAID', lines: s.lines.map(({ receivedQuantity, remainingQuantity, returnedQuantity, ...line }) => line), amountMinor: s.totals.amountMinor });
      s = await act(s, 'RECEIVE', 'RECEIVER', { reference: 'SIM-FULL', quantities: s.lines.map(line => ({ lineId: line.lineId, quantity: line.quantity })) });
      return act(s, 'RECEIPT_ACCEPTANCE', 'ACCEPTOR', { evidenceDigest: s.receiptDigest, note: 'Synthetic full receipt' });
    };
    await test('a new session starts independently and retained settled and recovered scenarios remain distinct', async () => {
      let s = await fullyReceived(); s = await act(s, 'PREPARE_SETTLEMENT', 'ACCOUNTANT');
      s = await act(s, 'APPROVE_SETTLEMENT', 'OWNER', { decision: 'APPROVE', note: 'Synthetic second settlement' });
      s = await act(s, 'CONFIRM_SETTLEMENT', 'TREASURER', { reference: 'SIM-SECOND-OUT', amountMinor: s.totals.amountMinor });
      s = await act(s, 'ACCEPTANCE', 'ACCEPTOR', { evidenceDigest: s.completionDigest, note: 'Synthetic retained settled scenario' });
      assert.equal(s.status, 'SETTLED'); assert.equal(s.acceptance.valid, true); settledSession = s.id;
      assert.notEqual(s.id, recoveredSession); assert.equal((await read(recoveredSession)).status, 'RECOVERED');
    });
    await test('unpaid reversal voids simulated preparation without inventing incoming recovery', async () => {
      let s = await fullyReceived(); s = await act(s, 'PREPARE_SETTLEMENT', 'ACCOUNTANT');
      s = await act(s, 'REVERSE', 'OWNER', { reference: 'SIM-UNPAID-RETURN', quantities: s.lines.map(line => ({ lineId: line.lineId, quantity: line.receivedQuantity })), amountMinor: 0, reason: 'Synthetic return before payment' });
      assert.equal(s.status, 'REVERSED'); assert.equal(s.settlement.status, 'VOIDED'); assert.equal(s.recovery, null); assert.equal(s.totals.netPaidMinor, 0);
      s = await act(s, 'ACCEPTANCE', 'ACCEPTOR', { evidenceDigest: s.completionDigest, note: 'Synthetic unpaid reversal accepted' }); assert.equal(s.acceptance.valid, true);
    });
    await test('event insertion failure rolls back the session update and returns a controlled server error', async () => {
      const requestId = randomUUID();
      await db.$executeRawUnsafe(`CREATE FUNCTION f08_lab_fail_occurrence() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."requestId"='${requestId}' THEN RAISE EXCEPTION 'SYNTHETIC_EVENT_FAILURE'; END IF; RETURN NEW; END $$`);
      await db.$executeRawUnsafe('CREATE TRIGGER f08_lab_fail_occurrence BEFORE INSERT ON "ProcurementLabEvent" FOR EACH ROW EXECUTE FUNCTION f08_lab_fail_occurrence()');
      try { const response = await noEffects(() => call(owner, rootPath + '/sessions', 'POST', { requestId, scenario: 'STANDARD_V1' }), 500); assert.ok(!JSON.stringify(response.data).includes('SYNTHETIC_EVENT_FAILURE')); }
      finally { await db.$executeRawUnsafe('DROP TRIGGER f08_lab_fail_occurrence ON "ProcurementLabEvent"'); await db.$executeRawUnsafe('DROP FUNCTION f08_lab_fail_occurrence()'); }
    });
    await test('serialization retry preserves occurrence identity and rechecks fresh owner authority', async () => {
      const originalSerializable = db.serializable.bind(db), attempts = []; let count = 0;
      db.serializable = (work, maximum) => originalSerializable(async tx => {
        const result = await work(tx); attempts.push({ id: result.id, digest: result.digest, createdAt: result.createdAt, event: result.events[0] });
        if (++count === 1) throw Object.assign(new Error('Synthetic serialization retry'), { code: 'P2034' }); return result;
      }, maximum);
      try { await create(); assert.equal(attempts.length, 2); assert.deepEqual(attempts[0], attempts[1]); }
      finally { db.serializable = originalSerializable; }
      const previousRole = await db.roleAssignment.findUniqueOrThrow({ where: { id: owner.role.id } }); count = 0;
      db.serializable = (work, maximum) => originalSerializable(async tx => {
        count += 1;
        if (count === 2) await db.roleAssignment.update({ where: { id: owner.role.id }, data: { status: 'SUSPENDED' } });
        const result = await work(tx); if (count === 1) throw Object.assign(new Error('Synthetic revoked retry'), { code: 'P2034' }); return result;
      }, maximum);
      try { await noEffects(() => call(owner, rootPath + '/sessions', 'POST', { requestId: randomUUID(), scenario: 'STANDARD_V1' }), 403); assert.equal(count, 2); }
      finally { db.serializable = originalSerializable; await db.roleAssignment.update({ where: { id: owner.role.id }, data: { status: previousRole.status, updatedAt: previousRole.updatedAt } }); }
    });
    await test('retained state corruption fails closed and the database rejects event rewriting', async () => {
      const stored = await db.procurementLabSession.findUniqueOrThrow({ where: { id: session.id } });
      await changed('procurementLabSession', { id: session.id }, { state: { ...stored.state, amountMinor: 1 } }, async () => denied(await call(owner, rootPath + '/sessions/' + session.id), 409));
      await assert.rejects(() => db.$executeRawUnsafe('UPDATE "ProcurementLabEvent" SET "role"=\'OWNER\''), error => error?.meta?.code === '55000');
      assert.equal((await read(session)).acceptance.valid, true);
    });
    await test('API profile saves and replays without credentials, connections or customer records', async () => {
      const body = { requestId: randomUUID(), expectedRevision: 0, displayName: 'Synthetic API preparation', protocol: schema.protocol, endpoint: null, credentialRef: null, authMode: 'BEARER' };
      profile = ok(await call(owner, rootPath + '/integration', 'POST', body)); assert.equal(profile.revision, 1); assert.equal(profile.state, 'NOT_CONFIGURED');
      const before = await labSnapshot(), replay = ok(await call(owner, rootPath + '/integration', 'POST', body)); assert.equal(replay.command.replayed, true); assert.equal(await labSnapshot(), before);
      await noEffects(() => call(owner, rootPath + '/integration', 'POST', { ...body, displayName: 'Changed replay' }), 409);
      await noEffects(() => call(owner, rootPath + '/integration', 'POST', { ...body, requestId: randomUUID() }), 409);
      await noEffects(() => call(owner, rootPath + '/integration', 'POST', { ...body, requestId: randomUUID(), expectedRevision: 1, secret: syntheticSecret }), 400);
      await noEffects(() => call(owner, rootPath + '/integration/check', 'POST', { requestId: randomUUID(), expectedRevision: profile.revision, expectedConfigHash: profile.configHash }), 400); assert.equal(checkCalls, 0);
    });
    const saveProfile = async (changes = {}) => {
      profile = ok(await call(owner, rootPath + '/integration', 'POST', { requestId: randomUUID(), expectedRevision: profile.revision, displayName: 'Synthetic API preparation', protocol: schema.protocol,
        endpoint: 'https://supplier.example.com/api/', credentialRef: 'synthetic-test', authMode: 'BEARER', ...changes })); return profile;
    };
    const checkBody = () => ({ requestId: randomUUID(), expectedRevision: profile.revision, expectedConfigHash: profile.configHash });
    await test('missing, mismatched and unregistered credential references never reach a provider', async () => {
      await saveProfile({ credentialRef: 'synthetic-missing' });
      await noEffects(() => call(owner, rootPath + '/integration/check', 'POST', checkBody()), 400); assert.equal(checkCalls, 0);
      await saveProfile({ endpoint: 'https://another.example.com/api/' });
      await noEffects(() => call(owner, rootPath + '/integration/check', 'POST', checkBody()), 400); assert.equal(checkCalls, 0);
      await noEffects(() => call(owner, rootPath + '/integration', 'POST', { requestId: randomUUID(), expectedRevision: profile.revision, displayName: 'Bad ref', protocol: schema.protocol, endpoint: 'https://supplier.example.com/api/', credentialRef: 'JWT_SECRET', authMode: 'BEARER' }), 400);
      await saveProfile();
      const output = JSON.stringify(ok(await call(owner, rootPath + '/workspace'))); assert.ok(!output.includes(syntheticSecret)); assert.ok(!output.includes('HYDROLAND_PROCUREMENT_API_SECRET_TEST'));
    });
    const delayedCheck = () => {
      let release, entered; const started = new Promise(resolve => { entered = resolve; }), wait = new Promise(resolve => { release = resolve; });
      checkHandler = async () => { entered(); await wait; return { status: 'SUCCEEDED', code: 'CAPABILITIES_VERIFIED', checkedAt: new Date().toISOString(), externalRequestAttempted: false }; };
      return { started, release, clear: () => { checkHandler = null; } };
    };
    await test('concurrent connection check and replay perform one provider attempt per request', async () => {
      const gate = delayedCheck(), body = checkBody(), beforeCalls = checkCalls;
      const pending = call(owner, rootPath + '/integration/check', 'POST', body); await gate.started;
      try { await noEffects(() => call(owner, rootPath + '/integration/check', 'POST', body), 409); }
      finally { gate.release(); }
      profile = ok(await pending); gate.clear(); assert.equal(profile.state, 'CONNECTION_VERIFIED'); assert.equal(checkCalls, beforeCalls + 1);
      const before = await labSnapshot(), replay = ok(await call(owner, rootPath + '/integration/check', 'POST', body)); assert.equal(replay.command.replayed, true); assert.equal(checkCalls, beforeCalls + 1); assert.equal(await labSnapshot(), before);
    });
    await test('configuration or credential drift while awaiting a response cannot verify stale settings', async () => {
      let gate = delayedCheck(), body = checkBody(), pending = call(owner, rootPath + '/integration/check', 'POST', body); await gate.started;
      await saveProfile({ displayName: 'Changed during synthetic network wait' }); gate.release(); profile = ok(await pending); gate.clear();
      assert.equal(profile.lastCheck.code, 'CONFIGURATION_CHANGED'); assert.equal(profile.connectionCheckCurrent, false);
      gate = delayedCheck(); body = checkBody(); pending = call(owner, rootPath + '/integration/check', 'POST', body); await gate.started;
      process.env.HYDROLAND_PROCUREMENT_API_SECRET_TEST = syntheticSecret + '_ROTATED'; gate.release(); profile = ok(await pending); gate.clear();
      assert.equal(profile.lastCheck.code, 'CREDENTIAL_CONFIGURATION_CHANGED'); assert.equal(profile.connectionCheckCurrent, false);
      process.env.HYDROLAND_PROCUREMENT_API_SECRET_TEST = syntheticSecret;
    });
    await test('connection completion rechecks current owner ADMIN authority after asynchronous work', async () => {
      const gate = delayedCheck(), body = checkBody(), pending = call(owner, rootPath + '/integration/check', 'POST', body); await gate.started;
      await changed('roleAssignment', { id: owner.role.id }, { status: 'SUSPENDED' }, async () => { gate.release(); denied(await pending, 403); }); gate.clear();
      const current = ok(await call(owner, rootPath + '/workspace')); assert.equal(current.integration.connectionCheckCurrent, false);
    });
    await test('bounded history rejects new events while replay and retained reads remain available', async () => {
      let s = await fullyReceived();
      while (s.revision < s.limits.maxEvents) {
        if (s.actions.PREPARE_SETTLEMENT.allowed) s = await act(s, 'PREPARE_SETTLEMENT', 'ACCOUNTANT');
        else s = await act(s, 'APPROVE_SETTLEMENT', 'OWNER', { decision: 'DECLINE', note: 'Synthetic bounded-history attempt' });
      }
      assert.equal(s.revision, 160); assert.ok(Object.values(s.actions).every(action => action.allowed === false));
      await noEffects(() => call(owner, rootPath + '/sessions/' + s.id + '/actions', 'POST', envelope(s, 'CANCEL', 'OWNER', { reason: 'Beyond bounded history' })), 409);
      assert.equal((await read(s)).events.length, 160);
    });
    await test('session count is bounded per owner and the full original business state remains unchanged', async () => {
      while (await db.procurementLabSession.count({ where: { ownerAccountId: owner.id } }) < 40) await create();
      const workspace = ok(await call(owner, rootPath + '/workspace')); assert.equal(workspace.sessions.length, 40); assert.equal(workspace.capabilities.create.allowed, false);
      await noEffects(() => call(owner, rootPath + '/sessions', 'POST', { requestId: randomUUID(), scenario: 'STANDARD_V1' }), 409);
      assert.equal(await db.organization.count({ where: { kind: { not: PLATFORM_STAFFING_KIND } } }), 0);
      assert.equal(await businessSnapshot(), originals, 'Lab or API preparation changed original platform business records'); assert.deepEqual(externalAttempts, []);
    });
    retained = { database: database.pathname.slice(1), platformOwnerAccountId: owner.id, customerOrganizations: 0, settledSessionId: settledSession, recoveredSessionId: recoveredSession,
      originalBusinessTables: businessTables.length, originalBusinessSha256: sha(originals), originalBusinessUnchanged: true,
      counts: { sessions: await db.procurementLabSession.count(), events: await db.procurementLabEvent.count(), profiles: await db.procurementApiProfile.count() },
      simulatedProviderCheckCalls: checkCalls, externalHttpAttempts: externalAttempts.length, realSignatures: 0, realFinancialEffects: 0 };
    success = true;
  } finally {
    if (app) await app.close(); if (transport && originalCheck) transport.checkProcurementConnection = originalCheck; global.fetch = nativeFetch;
    const result = { schemaVersion: 1, suite: 'F08_API_LAB_HTTP', synthetic: true, realOrganizationAcceptance: false, status: success ? 'PASS' : 'FAIL', startedAt,
      finishedAt: new Date().toISOString(), passed: checks.filter(row => row.status === 'PASS').length, failed: checks.filter(row => row.status === 'FAIL').length, skipped: 0, checks, retained };
    if (process.env.F08_API_LAB_EVIDENCE_FILE) { mkdirSync(dirname(process.env.F08_API_LAB_EVIDENCE_FILE), { recursive: true }); writeFileSync(process.env.F08_API_LAB_EVIDENCE_FILE, JSON.stringify(result, null, 2)); }
    console.log('F08_API_LAB_RESULT ' + JSON.stringify(result));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
