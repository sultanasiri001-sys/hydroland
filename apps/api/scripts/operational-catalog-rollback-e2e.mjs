import assert from 'node:assert/strict';
import { randomBytes, scryptSync } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { trainingOperationalPolicy } from '../dist/governance/training-operational-policy.js';
import { PolicyControlService } from '../dist/trips/policy-control.service.js';
import { WeatherGateService } from '../dist/trips/weather-gate.service.js';

const connection = new URL(process.env.DATABASE_URL);
const api = new URL(process.env.A16_API_BASE_URL);
const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);
assert(loopback.has(connection.hostname) && loopback.has(api.hostname));
assert.equal(connection.pathname, '/a16_catalog_acceptance');
assert.equal(process.env.CI, 'true');

const db = new PrismaClient();
const policies = new PolicyControlService(db);
const weather = new WeatherGateService(db);
const trainingKeys = {
  CAPACITY_LIMIT: 'capacityLimit',
  SCHEDULE_CONFLICT: 'scheduleConflict',
  SESSION_TIME_WINDOW: 'sessionTimeWindow',
  ATTENDANCE_REQUIRED: 'attendanceRequired',
};

async function login() {
  const password = randomBytes(32).toString('hex');
  const salt = randomBytes(16).toString('hex');
  const account = await db.account.create({data: {
    email: 'catalog-check@example.invalid',
    passwordHash: salt + ':' + scryptSync(password, salt, 64).toString('hex'),
    status: 'ACTIVE', emailVerifiedAt: new Date(),
    person: {create: {firstName: 'Catalog', lastName: 'Fixture'}},
    roleAssignments: {create: {role: 'ADMIN', status: 'ACTIVE'}},
  }});
  const response = await fetch(api.href + '/auth/login', {
    method: 'POST', headers: {'content-type':'application/json'},
    body: JSON.stringify({email:account.email, password}),
  });
  assert.equal(response.status, 200);
  const {accessToken} = await response.json();
  assert(accessToken);
  return {account, headers: {authorization:'Bearer ' + accessToken, 'content-type':'application/json'}};
}

async function effective(control) {
  if (control.category === 'TRAINING') {
    const key = trainingKeys[control.ruleKey];
    assert(key, 'Map every training control to its application reader');
    return (await trainingOperationalPolicy(db))[key];
  }
  if (control.category === 'WEATHER') {
    const settings = await weather.settings();
    return settings.enabled && settings.mode === 'ENFORCE';
  }
  return (await policies.decision(control.category, control.ruleKey)).enforce;
}

async function readCatalog(headers) {
  const response = await fetch(api.href + '/admin/operational-controls', {headers});
  assert.equal(response.status, 200);
  const rows = await response.json();
  const catalog = new Map(rows.map(row => [row.id, row]));
  assert.equal(catalog.size, rows.length, 'Duplicate control id');
  return catalog;
}

async function change(control, state, headers, reason) {
  const [started] = await db.$queryRaw`SELECT clock_timestamp() AS instant`;
  const response = await fetch(api.href + '/admin/operational-controls/' + encodeURIComponent(control.id), {
    method:'PATCH', headers, body: JSON.stringify({state, expectedRevision:control.revision, reason}),
  });
  assert.equal(response.status, 200, control.id);
  const updated = await response.json();
  assert.equal(updated.id, control.id);
  assert.equal(updated.state, state);
  assert.notEqual(updated.revision, control.revision);
  const [finished] = await db.$queryRaw`SELECT clock_timestamp() AS instant`;
  const effectiveAt = Date.parse(updated.updatedAt);
  // PostgreSQL rounds TIMESTAMP(3) to the nearest millisecond.
  assert(effectiveAt >= started.instant.getTime() - 1 && effectiveAt <= finished.instant.getTime() + 1,
    control.id + ' effective timestamp must fall inside the actual database request window');
  if (control.category === 'WEATHER') {
    const setting = await db.operationalSetting.findUniqueOrThrow({where:{key:'WEATHER_GATE'}});
    assert(setting.updatedAt.getTime() >= started.instant.getTime() - 1 && setting.updatedAt.getTime() <= finished.instant.getTime() + 1,
      'Weather setting must use the same UTC time basis');
  }
  assert.equal(await effective(updated), state === 'ENABLED', control.id);
  return updated;
}

async function verifyControl(initial, account, headers) {
  const {id} = initial;
  assert.equal(initial.mandatoryBindingStatus, 'OPTIONAL', 'Only use unbound synthetic controls');
  assert(['ENABLED','DISABLED'].includes(initial.state));
  assert.equal(await effective(initial), initial.state === 'ENABLED', id);
  const applied = await change(initial, initial.state === 'ENABLED' ? 'DISABLED' : 'ENABLED', headers, 'A16 isolated catalog change');
  const restored = await change(applied, initial.state, headers, 'A16 isolated catalog rollback');
  assert.notEqual(initial.revision, restored.revision);
  assert(Date.parse(restored.updatedAt) >= Date.parse(applied.updatedAt), id);
  const events = await db.auditEvent.findMany({where:{
    actorId:account.personId, action:'OPERATIONAL_CONTROL_CHANGED', resource:'PolicyControl', resourceId:id,
  }});
  assert.equal(events.length, 2, id);
  const evidence = [];
  for (const [before, after] of [[initial, applied], [applied, restored]]) {
    const event = events.find(row => row.metadata?.revision === after.revision);
    assert(event, id);
    assert.equal(event.metadata.accountId, account.id);
    assert.equal(event.metadata.previousState, before.state);
    assert.equal(event.metadata.previousRevision, before.revision);
    assert.equal(event.metadata.state, after.state);
    assert.equal(event.metadata.reason, after === applied ? 'A16 isolated catalog change' : 'A16 isolated catalog rollback');
    evidence.push({auditId:event.id, previousVersion:before.revision, version:after.revision,
      state:after.state, effectiveUtc:after.updatedAt, auditedUtc:event.occurredAt.toISOString()});
  }
  return {id, initialState:initial.state, finalRevision:restored.revision, evidence};
}

try {
  const [database] = await db.$queryRaw`SELECT current_database() AS name, current_setting('TimeZone') AS timezone`;
  assert.equal(database.name, 'a16_catalog_acceptance');
  if (process.env.A16_EXPECT_DB_TIMEZONE) assert.equal(database.timezone, process.env.A16_EXPECT_DB_TIMEZONE);
  assert.equal(await db.account.count(), 0, 'Start from a fresh disposable database');
  const {account, headers} = await login();
  const catalog = await readCatalog(headers);
  assert(catalog.size >= 29, 'Operational catalog unexpectedly shrank');
  const receipts = [];
  for (const control of catalog.values()) {
    receipts.push(await verifyControl(control, account, headers));
  }
  const final = await readCatalog(headers);
  assert.equal(final.size, catalog.size);
  for (const receipt of receipts) {
    const row = final.get(receipt.id);
    assert.equal(row.state, receipt.initialState);
    assert.equal(row.revision, receipt.finalRevision);
    assert.equal(await effective(row), row.state === 'ENABLED');
  }
  const result = {status:'PASS', databaseTimezone:database.timezone, verifiedUtc:new Date().toISOString(),
    controls:receipts.length, categories:new Set([...catalog.values()].map(row => row.category)).size,
    auditRecords:receipts.reduce((count, row) => count + row.evidence.length, 0),
    scope:'HTTP changes and rollbacks on optional synthetic controls, checked through training, weather and shared operating-policy readers. Risk-based authorization is a separate acceptance condition.',
    receipts};
  if (process.env.A16_EVIDENCE_PATH) await writeFile(process.env.A16_EVIDENCE_PATH, JSON.stringify(result, null, 2) + '\n');
  console.log('A16 catalog rollback PASS: %d controls, %d categories, %d attributed audit records.', result.controls, result.categories, result.auditRecords);
} finally {
  await db.$disconnect();
}
