import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

// Real PostgreSQL/service integration, NOT an HTTP/browser or production test.
// Every fixture is synthetic and every transaction is deliberately rolled back.
// Run only after the API build and canonical schema setup in isolated GitHub CI.
assert.equal(process.env.CI, 'true', 'This suite requires CI=true');
const url = new URL(process.env.DATABASE_URL || 'invalid:');
assert.ok(['postgres:', 'postgresql:'].includes(url.protocol), 'PostgreSQL URL required');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Only isolated loopback PostgreSQL is permitted');
// libpq query overrides must not redirect the connection away from loopback.
assert.ok([...url.searchParams.keys()].every(key => ['schema', 'connection_limit', 'pool_timeout', 'connect_timeout', 'sslmode'].includes(key)), 'Unsupported database URL override');
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const { assertTrainingStandardCompletion, assertTrainingDivePlan, createTrainingStandardDraft, decideTrainingStandard } = require('../dist/governance/training-standard-store.js');
const { trainingStandardBinding, trainingStandardHash, parseTrainingStandard } = require('../dist/governance/training-standard-profile.js');
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
const { TrainingSessionService } = require('../dist/governance/training-session.service.js');
const { TrainingAuthorizationService } = require('../dist/governance/training-authorization.service.js');
const { AuditService } = require('../dist/audit/audit.service.js');
const { DocumentPersistenceService } = require('../dist/document-forms/document-persistence.service.js');
const { DocumentAuthorizationService } = require('../dist/document-forms/document-authorization.service.js');
const { assertCalendarHumanAvailable } = require('../dist/trips/calendar-training-availability.js');
const rollback = new Error('SYNTHETIC_FIXTURE_ROLLBACK');
const clone = value => structuredClone(value);
const beforeDive = '2020-01-01T00:00:00.000Z';
// Direct-created evidence matches the assigned instructor legacy producer scope.
const attendance = (instructor, student, at) => ({
  instructorCheckInAt: at, studentCheckInAt: at,
  instructorCheckInByAccountId: instructor.id, studentCheckInByAccountId: instructor.id,
  instructorCheckInSource: 'AUTHORIZED_OPERATOR', studentCheckInSource: 'AUTHORIZED_OPERATOR',
  startedByAccountId: instructor.id, completedByAccountId: instructor.id
});

function profile(cap = 2) {
  return {
    agencyCode: 'TEST_AGENCY', programCode: 'SYNTHETIC_A14_ONLY', level: 'NO_OPERATIONAL_AUTHORITY', edition: 'SYNTHETIC_V2',
    sources: [{ authority: 'AGENCY', reference: 'SYNTHETIC_NOT_AN_AGENCY_STANDARD', edition: 'TEST_ONLY', locator: 'isolated-ci-fixture' }],
    requirements: { minimumAge: 0, minimumCompletedSessions: 2, minimumOpenWaterDives: 2, minimumOpenWaterMinutes: 0,
      instructorCredentialTitles: ['SYNTHETIC_INSTRUCTOR'], prerequisites: [], requiredSkillCodes: ['SYNTHETIC_SKILL'], requiredFormCodes: ['TRAINING-DIVE-LOG'],
      supervision: ['POOL', 'CONFINED_WATER', 'OPEN_WATER'].map(environment => ({ environment, minimumAge: 0, maximumAge: 120, studentsPerInstructor: 1, maximumDepthMetres: 20 })) },
    diveProgression: { schemaVersion: 2, timeZone: 'Asia/Riyadh',
      qualification: { minimumDepthMetres: 3, minimumPercentAtDepth: 60, depthFractionComparison: 'MORE_THAN', alternatives: [{ metric: 'SUBMERGED_SECONDS', minimum: 960 }, { metric: 'BREATHED_GAS_LITRES', minimum: 1250 }] },
      qualifyingDives: [7, 11].map((maximumDepthMetres, i) => ({ number: i + 1, maximumDepthMetres, requiredSkillCodesBeforeDive: [] })),
      experienceLimits: [], dayLimits: { maximumDives: 3, depthLimits: [], afterConfinedWaterMaximumDives: cap } }
  };
}

async function fixture(tx, ids, cap = 2, gas = false) {
  const accounts = [];
  for (const role of ['ADMIN', 'REVIEWER', 'INSTRUCTOR', 'DIVER']) {
    const account = await tx.account.create({ data: { id: randomUUID(), email: `a14-${randomUUID()}@example.invalid`, passwordHash: 'SYNTHETIC_NOT_A_LOGIN', status: 'ACTIVE',
      person: { create: { firstName: 'Synthetic A14', lastName: role } }, roleAssignments: { create: { role, status: 'ACTIVE' } } } });
    ids.accounts.push(account.id); ids.persons.push(account.personId); accounts.push(account);
  }
  const [author, reviewer, instructor, student] = accounts;
  const center = await tx.organization.create({ data: { displayName: 'SYNTHETIC A14 CI ONLY', kind: 'DIVE_CENTER', status: 'ACTIVE', ownerId: author.id } });
  ids.center = center.id;
  await tx.organizationMember.createMany({ data: [[author, 'OWNER'], [reviewer, 'ADMIN'], [instructor, 'ADMIN']].map(([account, role]) => ({ organizationId: center.id, accountId: account.id, role, status: 'ACTIVE' })) });
  await tx.diverProfile.create({ data: { accountId: student.id, dateOfBirth: new Date('1990-01-01') } });
  await tx.credential.create({ data: { personId: instructor.personId, issuer: 'TEST_AGENCY', title: 'SYNTHETIC_INSTRUCTOR', verificationStatus: 'VERIFIED', issuedAt: new Date('2000-01-01'), expiresAt: new Date('2099-01-01') } });
  const sourceProfile = profile(cap);
  const source = await createTrainingStandardDraft(tx, author.id, { profile: sourceProfile, reason: 'Synthetic isolated CI evidence, no operational approval' });
  ids.source = source.id;
  let row = await tx.policyControl.findUniqueOrThrow({ where: { id: source.id } });
  await decideTrainingStandard(tx, reviewer.id, source.id, { outcome: 'APPROVE', reviewed: true, expectedUpdatedAt: row.updatedAt.toISOString(), approvalReference: 'SYNTHETIC_CI_ONLY_NO_OPERATIONAL_AUTHORITY', validUntil: '2099-01-01T00:00:00.000Z' });
  row = await tx.policyControl.findUniqueOrThrow({ where: { id: source.id } });
  assert.notEqual(row.metadata.createdByAccountId, row.metadata.approval.reviewedByAccountId);
  // The public approval path uses the current clock. This synthetic, rolled-back
  // historical fixture explicitly moves only its approval start before the 2020
  // activities; it does not assert that today's approval authorizes past training.
  // No real source approval is seeded or changed by this test.
  await tx.policyControl.update({ where: { id: source.id }, data: { metadata: { ...row.metadata, approval: { ...row.metadata.approval, reviewedAt: beforeDive } } } });
  const binding = trainingStandardBinding(source.id, sourceProfile);
  const enrollment = await tx.trainingEnrollment.create({ data: { studentAccountId: student.id, instructorAccountId: instructor.id, centerOrganizationId: center.id,
    courseCode: sourceProfile.programCode, status: 'ACTIVE', enrolledAt: new Date(beforeDive),
    metadata: { trainingStandard: binding, trainingStandardContext: { environment: 'OPEN_WATER', plannedMaximumDepthMetres: 11 } },
    record: { create: { status: 'IN_PROGRESS', stages: { create: { stageType: 'SYNTHETIC', deliveryMode: 'BLENDED', sequence: 1,
      skills: { create: { skillCode: 'SYNTHETIC_SKILL', name: 'Synthetic only', status: 'COMPETENT', signedOffByInstructorId: instructor.id, signedOffAt: new Date(beforeDive) } } } } } } }, include: { record: true } });
  ids.enrollment = enrollment.id;
  const sessions = [], dives = [];
  for (let i = 0; i < 2; i++) {
    const startedAt = `2020-01-02T${i ? '08' : '06'}:00:00.000Z`, endedAt = `2020-01-02T${i ? '08' : '06'}:30:00.000Z`;
    const evidence = { trainingStandardContext: { environment: 'OPEN_WATER', plannedMaximumDepthMetres: i ? 11 : 7 }, ...attendance(instructor, student, startedAt), startedAt, endedAt };
    const session = await tx.trainingSession.create({ data: { trainingRecordId: enrollment.record.id, instructorAccountId: instructor.id, status: 'COMPLETED', startsAt: new Date(Date.parse(startedAt) - 60000), endsAt: new Date(Date.parse(endedAt) + 60000), evidence } });
    sessions.push(session);
    dives.push({ id: randomUUID(), sessionId: session.id, environment: 'OPEN_WATER', startedAt, endedAt, kind: 'QUALIFYING', qualifyingNumber: i + 1, maximumDepthMetres: i ? 11 : 7,
      submergedSeconds: gas && i === 0 ? 30 : 1200, depthThresholdMetres: 3, secondsAtOrDeeperThanThreshold: gas && i === 0 ? 20 : 900, breathedGasLitres: gas && i === 0 ? 1250 : null });
  }
  // Every baseline goes through the real document producer and authorization.
  // Only transaction ownership is adapted: all queries join this real outer tx.
  const scopedDb = new Proxy(tx, { get(target, key) { return key === 'serializable' ? work => work(tx) : Reflect.get(target, key); } });
  // No sourceBinding is requested. Fail loudly if a source-capture path is used;
  // this suite does not claim to exercise PlatformDocumentSourceService.
  const unusedSources = new Proxy({}, { get() { return () => { throw new Error('Unexpected source-binding path in isolated document fixture'); }; } });
  const documents = new DocumentPersistenceService(scopedDb, new DocumentAuthorizationService(scopedDb), unusedSources);
  const columns = ['id', 'sessionId', 'environment', 'startedAt', 'endedAt', 'kind', 'qualifyingNumber', 'maximumDepthMetres', 'submergedSeconds', 'depthThresholdMetres', 'secondsAtOrDeeperThanThreshold', 'breathedGasLitres'];
  const fields = ['trainingEnrollmentId', 'studentAccountId', 'instructorAccountId', 'trainingStandardHash'].map(key => ({ key, labelAr: key, labelEn: key, type: 'TEXT', required: true }));
  fields.push({ key: 'openWaterDives', labelAr: 'Synthetic dives', labelEn: 'Synthetic dives', type: 'TABLE', required: true, options: columns });
  const template = await documents.createTemplate(author.id, { organizationId: center.id, code: 'TRAINING-DIVE-LOG', titleAr: 'Synthetic only', titleEn: 'Synthetic only', department: 'TRAINING', fields });
  const payload = { trainingEnrollmentId: enrollment.id, studentAccountId: student.id, instructorAccountId: instructor.id, trainingStandardHash: binding.profileHash, openWaterDives: dives };
  let document = await documents.createDocument(author.id, { organizationId: center.id, templateId: template.id, department: 'TRAINING', contentHash: 'synthetic-evidence-hash', payload });
  await documents.transition(author.id, document.id, 'PENDING_APPROVAL');
  await documents.transition(reviewer.id, document.id, 'APPROVED');
  document = await documents.transition(instructor.id, document.id, 'SIGNED');
  assert.equal(document.createdByAccountId, author.id);
  assert.equal(document.approvedByAccountId, reviewer.id);
  assert.equal(document.signedByAccountId, instructor.id);
  const revisions = await tx.documentRevision.findMany({ where: { documentId: document.id } });
  assert.equal(revisions.length, 1); assert.equal(revisions[0].version, 1);
  assert.deepEqual(revisions[0].payload, payload);
  const events = await tx.documentLifecycleEvent.findMany({ where: { documentId: document.id } });
  assert.deepEqual(events.map(event => event.action).sort(), ['CREATE', 'PENDING_APPROVAL', 'APPROVED', 'SIGNED'].sort());
  const f = { author, reviewer, instructor, student, center, source, sourceProfile, binding, enrollment, sessions, document, payload, documents, template };
  f.savePayload = () => tx.managedDocument.update({ where: { id: document.id }, data: { payload: f.payload } });
  f.confined = (environment = 'POOL') => tx.trainingSession.create({ data: { trainingRecordId: enrollment.record.id, instructorAccountId: instructor.id, status: 'COMPLETED', startsAt: new Date('2020-01-02T04:00:00Z'), endsAt: new Date('2020-01-02T05:00:00Z'), evidence: { trainingStandardContext: { environment, plannedMaximumDepthMetres: 2 }, ...attendance(instructor, student, '2020-01-02T04:00:00.000Z'), startedAt: '2020-01-02T04:00:00.000Z', endedAt: '2020-01-02T05:00:00.000Z' } } });
  return f;
}

async function snapshot(tx, f) {
  return {
    enrollment: await tx.trainingEnrollment.findUniqueOrThrow({ where: { id: f.enrollment.id } }),
    record: await tx.trainingRecord.findUniqueOrThrow({ where: { id: f.enrollment.record.id }, include: { stages: { include: { skills: true } }, sessions: { orderBy: { id: 'asc' } }, certificate: true } }),
    documents: await tx.managedDocument.findMany({ where: { organizationId: f.center.id }, orderBy: { id: 'asc' } }),
    audit: await tx.auditEvent.findMany({ where: { resourceId: { in: [f.source.id, f.enrollment.id, f.enrollment.record.id] } }, orderBy: { id: 'asc' } })
  };
}
const cases = [];
const check = (name, mutate, accepted = false, cap = 2) => cases.push({ name, mutate, accepted, cap });
check('complete v2 time-depth proof', async () => {}, true);
check('gas alternative below time threshold', async () => {}, true);
cases.at(-1).gas = true;
check('same-day confined activity within cap', async (_tx, f) => { await f.confined(); }, true);
check('same-day confined activity exceeds cap', async (_tx, f) => { await f.confined('CONFINED_WATER'); }, false, 1);
check('time alternative below threshold', async (_tx, f) => { f.payload.openWaterDives[0].submergedSeconds = 900; await f.savePayload(); });
check('depth fraction exactly 60 percent fails MORE_THAN', async (_tx, f) => { f.payload.openWaterDives[0].secondsAtOrDeeperThanThreshold = 720; await f.savePayload(); });
check('gas cannot waive depth fraction', async (_tx, f) => { Object.assign(f.payload.openWaterDives[0], { breathedGasLitres: 1250, secondsAtOrDeeperThanThreshold: 1 }); await f.savePayload(); });
check('per-dive depth cannot use overall maximum', async (_tx, f) => { f.payload.openWaterDives[0].maximumDepthMetres = 8; await f.savePayload(); });
check('missing completed-session proof', async (_tx, f) => { f.payload.openWaterDives.pop(); await f.savePayload(); });
check('duplicate dive identity', async (_tx, f) => { f.payload.openWaterDives[1].id = f.payload.openWaterDives[0].id; await f.savePayload(); });
check('duplicate proof across signed documents', async (tx, f) => { const { id, createdAt, updatedAt, ...data } = f.document; await tx.managedDocument.create({ data: { ...data, referenceNumber: randomUUID() } }); });
check('malformed qualification evidence', async (_tx, f) => { f.payload.openWaterDives[0].submergedSeconds = '1200'; await f.savePayload(); });
check('legacy bottomMinutes alone cannot qualify', async (_tx, f) => { delete f.payload.openWaterDives[0].submergedSeconds; f.payload.openWaterDives[0].bottomMinutes = 60; await f.savePayload(); });
check('multiple dives per session fail closed', async (_tx, f) => { f.payload.openWaterDives[1].sessionId = f.payload.openWaterDives[0].sessionId; await f.savePayload(); });
check('source-mismatched additional signed log is not filtered away', async (tx, f) => { const { id, createdAt, updatedAt, ...data } = f.document; await tx.managedDocument.create({ data: { ...data, referenceNumber: randomUUID(), payload: { ...f.payload, trainingStandardHash: 'f'.repeat(64) } } }); });
check('student mismatch cannot supply proof', async (_tx, f) => { f.payload.studentAccountId = f.author.id; await f.savePayload(); });
check('non-current signer cannot supply proof', async (tx, f) => { await tx.managedDocument.update({ where: { id: f.document.id }, data: { signedByAccountId: f.author.id } }); });
check('unapproved log cannot supply proof', async (tx, f) => { await tx.managedDocument.update({ where: { id: f.document.id }, data: { approvedAt: null } }); });
check('actual start must contain dive, not merely schedule', async (tx, f) => { await tx.trainingSession.update({ where: { id: f.sessions[0].id }, data: { evidence: { ...f.sessions[0].evidence, startedAt: '2020-01-02T06:01:00.000Z' } } }); });
check('actual completion must contain entire dive', async (tx, f) => { await tx.trainingSession.update({ where: { id: f.sessions[0].id }, data: { evidence: { ...f.sessions[0].evidence, endedAt: '2020-01-02T06:29:00.000Z' } } }); });
check('malformed completed confined context fails closed', async (tx, f) => { const session = await f.confined(); await tx.trainingSession.update({ where: { id: session.id }, data: { evidence: { ...session.evidence, endedAt: 'not-a-time' } } }); });
check('approval beginning after actual activity start is refused', async (tx, f) => { const source = await tx.policyControl.findUniqueOrThrow({ where: { id: f.source.id } }); const metadata = clone(source.metadata); metadata.approval.reviewedAt = '2020-01-02T06:01:00.000Z'; await tx.policyControl.update({ where: { id: source.id }, data: { metadata } }); });
check('approval ending before actual activity end is refused', async (tx, f) => { const source = await tx.policyControl.findUniqueOrThrow({ where: { id: f.source.id } }); const metadata = clone(source.metadata); metadata.approval.validUntil = '2020-01-02T06:29:00.000Z'; await tx.policyControl.update({ where: { id: source.id }, data: { metadata } }); });
check('cancelled but started activity blocks completion', async (tx, f) => { const session = await f.confined(); await tx.trainingSession.update({ where: { id: session.id }, data: { status: 'CANCELLED' } }); });
check('unresolved in-progress activity blocks completion', async (tx, f) => { const session = await f.confined(); await tx.trainingSession.update({ where: { id: session.id }, data: { status: 'IN_PROGRESS' } }); });
check('log approval before dive completion is refused', async (tx, f) => { await tx.managedDocument.update({ where: { id: f.document.id }, data: { approvedAt: new Date('2020-01-02T06:29:00Z') } }); });
check('future log signature is refused', async (tx, f) => { await tx.managedDocument.update({ where: { id: f.document.id }, data: { signedAt: new Date('2099-01-01') } }); });
check('completedAt-only alias cannot replace producer endedAt', async (tx, f) => { const evidence = clone(f.sessions[0].evidence); evidence.completedAt = evidence.endedAt; delete evidence.endedAt; await tx.trainingSession.update({ where: { id: f.sessions[0].id }, data: { evidence } }); });
check('missing instructor check-in fails closed', async (tx, f) => { const evidence = clone(f.sessions[0].evidence); delete evidence.instructorCheckInAt; await tx.trainingSession.update({ where: { id: f.sessions[0].id }, data: { evidence } }); });
check('missing student check-in fails closed', async (tx, f) => { const evidence = clone(f.sessions[0].evidence); delete evidence.studentCheckInAt; await tx.trainingSession.update({ where: { id: f.sessions[0].id }, data: { evidence } }); });
check('actual compiled session producer OPEN/check-ins/START/COMPLETE', async (tx, f) => {
  // Run the real service and collaborators, not an HTTP request. Its serializable
  // callback joins this suite's already-Serializable, always-rolled-back outer
  // Prisma transaction; no nested/independently committed fixture is needed.
  const scopedDb = { serializable: work => work(tx) };
  const service = new TrainingSessionService(scopedDb, new AuditService(scopedDb), new TrainingAuthorizationService(scopedDb));
  let session = await tx.trainingSession.create({ data: {
    trainingRecordId: f.enrollment.record.id, instructorAccountId: f.instructor.id, status: 'SCHEDULED',
    startsAt: new Date(Date.now() - 1000), endsAt: new Date(Date.now() + 3600000),
    evidence: { trainingStandardContext: { environment: 'POOL', plannedMaximumDepthMetres: 2 } }
  } });
  for (const action of ['OPEN', 'INSTRUCTOR_CHECK_IN', 'STUDENT_CHECK_IN', 'START', 'COMPLETE']) {
    if (action === 'COMPLETE') await new Promise(resolve => setTimeout(resolve, 5));
    await service.act(f.author.id, session.id, { action, expectedUpdatedAt: session.updatedAt.toISOString(), reason: 'Synthetic CI actual producer contract' }, 'legacy');
    session = await tx.trainingSession.findUniqueOrThrow({ where: { id: session.id } });
  }
  assert.equal(session.status, 'COMPLETED');
  assert.equal(session.evidence.completedAt, undefined);
  assert.ok(Date.parse(session.evidence.endedAt) > Date.parse(session.evidence.startedAt));
  assert.equal(session.evidence.completedByAccountId, f.author.id);
  assert.equal(session.evidence.instructorCheckInSource, 'AUTHORIZED_OPERATOR');
  assert.equal(session.evidence.studentCheckInSource, 'AUTHORIZED_OPERATOR');
  assert.equal(await tx.auditEvent.count({ where: { resourceId: session.id, action: 'training.session_action' } }), 5);
}, true);
check('plain organization instructor cannot SIGN', async (tx, f) => {
  const other = await f.documents.createDocument(f.author.id, { organizationId: f.center.id, templateId: f.template.id, department: 'TRAINING', contentHash: 'synthetic-denied-sign', payload: f.payload });
  await f.documents.transition(f.author.id, other.id, 'PENDING_APPROVAL');
  await f.documents.transition(f.reviewer.id, other.id, 'APPROVED');
  await tx.organizationMember.update({ where: { organizationId_accountId: { organizationId: f.center.id, accountId: f.instructor.id } }, data: { role: 'INSTRUCTOR' } });
  try {
    await assert.rejects(() => f.documents.transition(f.instructor.id, other.id, 'SIGNED'), error => error?.getStatus?.() === 403);
    assert.equal((await tx.managedDocument.findUniqueOrThrow({ where: { id: other.id } })).status, 'APPROVED');
    assert.equal(await tx.documentLifecycleEvent.count({ where: { documentId: other.id, action: 'SIGNED' } }), 0);
  } finally {
    await tx.organizationMember.update({ where: { organizationId_accountId: { organizationId: f.center.id, accountId: f.instructor.id } }, data: { role: 'ADMIN' } });
  }
  // Remove only the disposable unsigned negative fixture, retaining the baseline.
  await tx.documentLifecycleEvent.deleteMany({ where: { documentId: other.id } });
  await tx.documentRevision.deleteMany({ where: { documentId: other.id } });
  await tx.managedDocument.delete({ where: { id: other.id } });
}, true);
check('signed document cannot be revised through producer', async (tx, f) => {
  const before = await tx.managedDocument.findUniqueOrThrow({ where: { id: f.document.id } });
  await assert.rejects(() => f.documents.revise(f.author.id, f.document.id, { contentHash: 'forbidden-rewrite', payload: f.payload }), error => error?.getStatus?.() === 400);
  assert.deepEqual(await tx.managedDocument.findUniqueOrThrow({ where: { id: f.document.id } }), before);
  assert.equal(await tx.documentRevision.count({ where: { documentId: f.document.id } }), 1);
  assert.equal(await tx.documentLifecycleEvent.count({ where: { documentId: f.document.id } }), 4);
}, true);
check('non-approved source', async (tx, f) => { await tx.policyControl.update({ where: { id: f.source.id }, data: { state: 'REVIEW' } }); });
check('source revocation is checked at completion', async (tx, f) => { const source = await tx.policyControl.findUniqueOrThrow({ where: { id: f.source.id } }); await decideTrainingStandard(tx, f.reviewer.id, f.source.id, { outcome: 'REVOKE', reviewed: true, expectedUpdatedAt: source.updatedAt.toISOString(), approvalReference: 'Synthetic CI source withdrawal' }); });
check('immutable policy hash detects tampering', async (tx, f) => { const source = await tx.policyControl.findUniqueOrThrow({ where: { id: f.source.id } }); const metadata = clone(source.metadata); metadata.profile.diveProgression.dayLimits.maximumDives = 4; await tx.policyControl.update({ where: { id: source.id }, data: { metadata } }); });
check('enrollment hash remains bound even if source hashes are replaced', async (tx, f) => { const source = await tx.policyControl.findUniqueOrThrow({ where: { id: f.source.id } }); const metadata = clone(source.metadata); metadata.profile.diveProgression.dayLimits.maximumDives = 4; metadata.contentHash = trainingStandardHash(metadata.profile); metadata.approval.profileHash = metadata.contentHash; await tx.policyControl.update({ where: { id: source.id }, data: { metadata } }); });

// Partial-history planning fixtures deliberately remain INCOMPLETE at course
// completion. The planning assertions run explicitly before that existing check.
async function pendingSecond(tx, f) {
  const today=new Date(),start=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate()+1,3)),end=new Date(start.getTime()+1800000);
  f.payload.openWaterDives.pop();await f.savePayload();
  const context={environment:'OPEN_WATER',plannedMaximumDepthMetres:11,diveKind:'QUALIFYING',qualifyingNumber:2};
  await tx.trainingSession.update({where:{id:f.sessions[1].id},data:{status:'SCHEDULED',startsAt:start,endsAt:end,evidence:{trainingStandardContext:context}}});
  return {start,end,context};
}
const planDenied=(code)=>error=>error?.getStatus?.()===409&&(error.getResponse()?.code===code||error.getResponse()?.violations?.some(row=>row.code===code));
check('reserve next dive with partial verified history, never count it as completion',async(tx,f)=>{
 const p=await pendingSecond(tx,f),before=await snapshot(tx,f);
 await assertTrainingDivePlan(tx,f.enrollment.id,f.instructor.id,p.start,p.end,p.context,f.sessions[1].id);
 assert.deepEqual(await snapshot(tx,f),before);
});
check('planning refuses per-dive depth without writes',async(tx,f)=>{
 const p=await pendingSecond(tx,f),before=await snapshot(tx,f);
 await assert.rejects(()=>assertTrainingDivePlan(tx,f.enrollment.id,f.instructor.id,p.start,p.end,{...p.context,plannedMaximumDepthMetres:12},f.sessions[1].id),planDenied('PROGRESSION_DEPTH'));
 assert.deepEqual(await snapshot(tx,f),before);
});
check('planning refuses unlabelled legacy OW reservation',async(tx,f)=>{
 const p=await pendingSecond(tx,f),context={...p.context};delete context.diveKind;
 await assert.rejects(()=>assertTrainingDivePlan(tx,f.enrollment.id,f.instructor.id,p.start,p.end,context,f.sessions[1].id),planDenied('DIVE_PLAN_INVALID'));
});
check('completion cannot relabel a classified reservation after START',async(tx,f)=>{
 await tx.trainingSession.update({where:{id:f.sessions[0].id},data:{evidence:{...f.sessions[0].evidence,trainingStandardContext:{environment:'OPEN_WATER',plannedMaximumDepthMetres:11,diveKind:'EXPERIENCE',qualifyingNumber:null}}}});
});
check('actual START rechecks progression through the compiled session service',async(tx,f)=>{
 const p=await pendingSecond(tx,f),now=new Date();
 let row=await tx.trainingSession.update({where:{id:f.sessions[1].id},data:{startsAt:new Date(now.getTime()-1000),endsAt:new Date(now.getTime()+1800000)}});
 const scopedDb={serializable:work=>work(tx)};
 const service=new TrainingSessionService(scopedDb,new AuditService(scopedDb),new TrainingAuthorizationService(scopedDb));
 for(const action of ['OPEN','INSTRUCTOR_CHECK_IN','STUDENT_CHECK_IN','START']){
  await service.act(f.author.id,row.id,{action,expectedUpdatedAt:row.updatedAt.toISOString(),reason:'Synthetic source progression START'},'legacy');
  row=await tx.trainingSession.findUniqueOrThrow({where:{id:row.id}});
 }
 assert.equal(row.status,'IN_PROGRESS');assert.equal(row.evidence.trainingStandardContext.qualifyingNumber,2);
 assert.equal(await tx.auditEvent.count({where:{resourceId:row.id,action:'training.session_action'}}),4);
});
check('START refuses treating a prior reservation as completed evidence',async(tx,f)=>{
 const p=await pendingSecond(tx,f),now=new Date(),end=new Date(now.getTime()+1800000);
 await tx.managedDocument.update({where:{id:f.document.id},data:{status:'DRAFT'}});
 await tx.trainingSession.update({where:{id:f.sessions[0].id},data:{status:'SCHEDULED',startsAt:new Date(now.getTime()+3600000),endsAt:new Date(now.getTime()+5400000),evidence:{trainingStandardContext:{environment:'OPEN_WATER',plannedMaximumDepthMetres:7,diveKind:'QUALIFYING',qualifyingNumber:1}}}});
 await assert.rejects(()=>assertTrainingDivePlan(tx,f.enrollment.id,f.instructor.id,now,end,p.context,f.sessions[1].id,true,now),planDenied('ACTUAL_PREDECESSOR_REQUIRED'));
});
check('source-bound participant conflict survives disabled generic scheduling control',async(tx,f)=>{
 const p=await pendingSecond(tx,f);
 await tx.policyControl.upsert({where:{category_ruleKey:{category:'TRAINING',ruleKey:'SCHEDULE_CONFLICT'}},create:{category:'TRAINING',ruleKey:'SCHEDULE_CONFLICT',labelAr:'Synthetic disabled generic scheduling',state:'DISABLED'},update:{state:'DISABLED',metadata:{}}});
 const other=await tx.trainingEnrollment.create({data:{studentAccountId:f.student.id,instructorAccountId:f.author.id,courseCode:'SYNTHETIC_OVERLAP',record:{create:{}}},include:{record:true}});
 await tx.trainingSession.create({data:{trainingRecordId:other.record.id,instructorAccountId:f.author.id,status:'SCHEDULED',startsAt:p.start,endsAt:p.end}});
 const before=await snapshot(tx,f);
 await assert.rejects(()=>assertTrainingDivePlan(tx,f.enrollment.id,f.instructor.id,p.start,p.end,p.context,f.sessions[1].id),planDenied('STANDARD_PARTICIPANT_CONFLICT'));
 assert.deepEqual(await snapshot(tx,f),before);
});
check('calendar cannot bypass reserved source-bound dive with generic scheduling disabled',async(tx,f)=>{
 const p=await pendingSecond(tx,f);
 await tx.policyControl.upsert({where:{category_ruleKey:{category:'TRAINING',ruleKey:'SCHEDULE_CONFLICT'}},create:{category:'TRAINING',ruleKey:'SCHEDULE_CONFLICT',labelAr:'Synthetic disabled scheduling',state:'DISABLED'},update:{state:'DISABLED',metadata:{}}});
 const resource=await tx.calendarResource.create({data:{type:'CREW',name:'Synthetic student human alias',referenceId:f.student.id}});
 const before=await snapshot(tx,f);
 await assert.rejects(()=>assertCalendarHumanAvailable(tx,[resource.id],p.start,p.end),error=>error?.getStatus?.()===409);
 assert.deepEqual(await snapshot(tx,f),before);
});
check('non-diving scheduling cannot bypass an existing dive reservation when generic flag is off',async(tx,f)=>{
 const p=await pendingSecond(tx,f);
 await tx.policyControl.upsert({where:{category_ruleKey:{category:'TRAINING',ruleKey:'SCHEDULE_CONFLICT'}},create:{category:'TRAINING',ruleKey:'SCHEDULE_CONFLICT',labelAr:'Synthetic disabled scheduling',state:'DISABLED'},update:{state:'DISABLED',metadata:{}}});
 const scopedDb={serializable:work=>work(tx)},service=new TrainingSessionService(scopedDb,new AuditService(scopedDb),new TrainingAuthorizationService(scopedDb));
 const before=await snapshot(tx,f);
 await assert.rejects(()=>service.assertAvailable(tx,f.author.id,f.student.id,p.start,p.end),planDenied('STANDARD_PARTICIPANT_CONFLICT'));
 assert.deepEqual(await snapshot(tx,f),before);
});

try {
  // These also ensure the immutable policy is actually parsed into the source hash.
  const original = profile(), changed = clone(original); changed.diveProgression.dayLimits.maximumDives++;
  assert.notEqual(trainingStandardHash(original), trainingStandardHash(changed));
  const missing = clone(original); delete missing.diveProgression;
  assert.throws(() => parseTrainingStandard(missing));
  const legacy = clone(original); legacy.requirements.minimumOpenWaterMinutes = 1;
  assert.throws(() => parseTrainingStandard(legacy));
  for (const entry of cases) {
    const ids = { accounts: [], persons: [] };
    try {
      await db.$transaction(async tx => {
        const f = await fixture(tx, ids, entry.cap, entry.gas);
        // Every negative begins with a proven-valid fixture, so an unrelated gate
        // cannot make a broken mutation look like regression coverage.
        assert.deepEqual(await assertTrainingStandardCompletion(tx, f.enrollment.id), f.binding);
        await entry.mutate(tx, f);
        const before = await snapshot(tx, f);
        if (entry.accepted) assert.deepEqual(await assertTrainingStandardCompletion(tx, f.enrollment.id), f.binding);
        else await assert.rejects(() => assertTrainingStandardCompletion(tx, f.enrollment.id), error => error?.getStatus?.() === 409 || error?.name === 'TrainingStandardError' || error?.name === 'DiveProgressionError', entry.name);
        assert.deepEqual(await snapshot(tx, f), before, `${entry.name}: completion gate must not write`);
        throw rollback;
      }, { timeout: 60000, maxWait: 10000, isolationLevel: 'Serializable' });
      assert.fail('Fixture transaction unexpectedly committed');
    } catch (error) {
      if (error !== rollback) throw new Error(`A14 PostgreSQL regression failed: ${entry.name}`, { cause: error });
    } finally {
      // No deletes against shared data: transaction rollback is the cleanup.
      assert.equal(await db.account.count({ where: { id: { in: ids.accounts } } }), 0, 'Fixture account rollback');
      assert.equal(await db.person.count({ where: { id: { in: ids.persons } } }), 0, 'Fixture person rollback');
      if (ids.source) {
        assert.equal(await db.policyControl.count({ where: { id: ids.source } }), 0, 'Source rollback');
        assert.equal(await db.auditEvent.count({ where: { resourceId: ids.source } }), 0, 'Source audit rollback');
      }
      if (ids.enrollment) assert.equal(await db.trainingEnrollment.count({ where: { id: ids.enrollment } }), 0, 'Enrollment rollback');
      if (ids.center) assert.equal(await db.organization.count({ where: { id: ids.center } }), 0, 'Center rollback');
    }
    console.log(`PASS: ${entry.name}`);
  }
  console.log(`A14 PostgreSQL completion adapter: ${cases.length} cases passed; synthetic fixtures rolled back; no HTTP/browser or production/provider claim.`);
} finally {
  await db.$disconnect();
}
