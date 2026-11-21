import assert from 'node:assert/strict';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PDFDocument } from 'pdf-lib';
import { marineReviewFixture } from './marine-review-fixture.mjs';

const base = process.env.INSTRUCTOR_DOCUMENTS_E2E_BASE_URL;
for (const url of [base, process.env.DATABASE_URL]) {
  assert(
    ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname),
    'Use an isolated loopback test instance.',
  );
}
const db = new PrismaClient();
const kinds = ['NATIONAL_LICENSE', 'PROFESSIONAL_LICENSE', 'MEDICAL_EXAM', 'LIABILITY_WAIVER'];
const people = [],
  accounts = [];
const run = randomUUID();
let fixture, unrelatedCenter;
async function actor(name, roles) {
  const email = name + '-' + run + '@example.invalid';
  const password = randomBytes(24).toString('hex'),
    salt = randomBytes(16).toString('hex');
  const person = await db.person.create({ data: { firstName: name, lastName: 'Test' } });
  people.push(person.id);
  const account = await db.account.create({
    data: {
      personId: person.id,
      email,
      passwordHash: salt + ':' + scryptSync(password, salt, 64).toString('hex'),
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      roleAssignments: { create: roles.map((role) => ({ role, status: 'ACTIVE' })) },
    },
  });
  accounts.push(account.id);
  const response = await fetch(base + '/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 200);
  const { accessToken } = await response.json();
  assert.ok(accessToken);
  return { id: account.id, accessToken };
}
async function call(actor, path, body, expected = body === undefined ? 200 : 201) {
  const response = await fetch(base + '/instructor-documents/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(actor ? { authorization: 'Bearer ' + actor.accessToken } : {}),
      'content-type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  assert.equal(response.status, expected, path + ' ' + JSON.stringify(data));
  return data;
}
async function document(kind, centerId, revision = 1) {
  const pdf = await PDFDocument.create();
  pdf.addPage().drawText('Test ' + kind + ' revision ' + revision);
  return {
    centerId,
    originalName: kind + '-' + revision + '.pdf',
    base64: Buffer.from(await pdf.save()).toString('base64'),
  };
}
try {
  const instructor = await actor('trainer', ['INSTRUCTOR', 'DIVE_CENTER', 'ADMIN']);
  const reviewer = await actor('center', ['DIVE_CENTER']);
  const platform = await actor('platform', ['ADMIN']);
  const other = await actor('other', ['DIVE_CENTER', 'ADMIN']);
  fixture = await marineReviewFixture(db, base, reviewer.id, platform.id, { storage: true });
  const centerId = fixture.center.id;
  unrelatedCenter = await db.organization.create({
    data: { displayName: 'Other center', kind: 'DIVE_CENTER', status: 'ACTIVE', ownerId: other.id },
  });
  await db.organizationMember.create({
    data: { organizationId: centerId, accountId: instructor.id, role: 'INSTRUCTOR', status: 'ACTIVE' },
  });
  await call(null, 'instructor', undefined, 401);
  assert.deepEqual(
    (await call(instructor, 'instructor')).centers.map((c) => c.id),
    [centerId],
  );
  await call(other, 'instructor', undefined, 403);
  const docs = [];
  for (const kind of kinds) {
    const body = await document(kind, centerId);
    const path = 'instructor/' + kind + '/upload';
    if (!docs.length) {
      await call(instructor, path, { ...body, centerId: unrelatedCenter.id }, 403);
      await call(instructor, 'instructor/UNKNOWN/upload', body, 400);
      await call(instructor, path, { ...body, base64: 'YWJj' }, 400);
    }
    const row = await call(instructor, path, body);
    assert.equal(row.status, 'CENTER_PENDING');
    assert.equal((await call(instructor, path, body)).id, row.id);
    docs.push({ kind, id: row.id, body });
  }
  const pending = await call(reviewer, 'center');
  assert.deepEqual(pending.records.map((r) => r.id).sort(), docs.map((r) => r.id).sort());
  assert.equal((await call(other, 'center')).records.length, 0);
  assert.equal((await call(platform, 'platform')).records.length, 0);
  await call(other, 'platform', undefined, 403);
  const medical = docs[2];
  const decision = (view, id) => view + '/' + id + '/decision';
  const access = (view, id) => view + '/' + id + '/access';
  const approve = { decision: 'APPROVE' };
  await call(instructor, decision('center', medical.id), approve, 404);
  await call(other, access('center', medical.id), undefined, 404);
  await call(platform, decision('platform', medical.id), approve, 404);
  await call(reviewer, decision('center', medical.id), { decision: 'RETURN' }, 400);
  const url = (await call(reviewer, access('center', medical.id))).url;
  assert.deepEqual(
    Buffer.from(await (await fetch(url)).arrayBuffer()),
    Buffer.from(medical.body.base64, 'base64'),
  );
  await call(reviewer, decision('center', medical.id), { decision: 'RETURN', reason: 'Replace page 2' });
  const snapshot = (await call(instructor, 'instructor')).records;
  assert.equal(snapshot.find((r) => r.id === medical.id).reason, 'Replace page 2');
  assert.equal(snapshot.filter((r) => r.status === 'CENTER_PENDING').length, 3);
  const revised = await document(medical.kind, centerId, 2);
  await call(instructor, 'instructor/' + medical.kind + '/upload', revised, 409);
  const replacement = await call(instructor, 'instructor/' + medical.kind + '/upload', {
    ...revised,
    previousId: medical.id,
  });
  await call(reviewer, decision('center', medical.id), approve, 404);
  medical.id = replacement.id;
  for (const row of docs) {
    await call(reviewer, decision('center', row.id), approve);
    await call(reviewer, decision('center', row.id), approve, 404);
  }
  assert.equal((await call(platform, 'platform')).records.length, 4);
  const returned = docs[1];
  await call(platform, decision('platform', returned.id), {
    decision: 'RETURN',
    reason: 'Provide a clear scan',
  });
  const corrected = await document(returned.kind, centerId, 2);
  returned.id = (
    await call(instructor, 'instructor/' + returned.kind + '/upload', {
      ...corrected,
      previousId: returned.id,
    })
  ).id;
  await call(platform, decision('platform', returned.id), approve, 404);
  await call(reviewer, decision('center', returned.id), approve);
  for (const row of docs) await call(platform, decision('platform', row.id), approve);
  const final = (await call(instructor, 'instructor')).records;
  assert.deepEqual(final.map((r) => r.kind).sort(), kinds.slice().sort());
  assert(final.every((row) => row.status === 'APPROVED'));
  assert.equal((await call(platform, 'platform')).records.length, 0);
  console.log(
    'Passed: four separate PDF submissions, private access, center scope, returns at both stages, independent revisions, final decisions and retry handling.',
  );
} finally {
  await db.instructorDocument.deleteMany({ where: { accountId: { in: accounts } } });
  await db.organizationMember.deleteMany({ where: { accountId: { in: accounts } } });
  if (unrelatedCenter) await db.organization.delete({ where: { id: unrelatedCenter.id } });
  await fixture?.close();
  await db.session.deleteMany({ where: { accountId: { in: accounts } } });
  await db.roleAssignment.deleteMany({ where: { accountId: { in: accounts } } });
  await db.account.deleteMany({ where: { id: { in: accounts } } });
  await db.auditEvent.deleteMany({ where: { actorId: { in: people } } });
  await db.person.deleteMany({ where: { id: { in: people } } });
  await db.$disconnect();
}
