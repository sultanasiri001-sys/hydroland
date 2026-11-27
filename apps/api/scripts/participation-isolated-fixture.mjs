import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

/** Native D01 prerequisites for isolated regression suites. Never an operational approval. */
export function participationFixture(db, base) {
  const url = new URL(process.env.DATABASE_URL || 'postgresql://invalid/invalid');
  const loopback = value => ['localhost', '127.0.0.1', '[::1]'].includes(new URL(value).hostname);
  const name = decodeURIComponent(url.pathname.slice(1));
  const githubService = process.env.GITHUB_ACTIONS === 'true' && ['5432', '5433'].includes(url.port)
    && /^(hydroland|course_checkout_test|calendar_training_availability_ci|training_cross_role_availability_ci|.*_availability_ci)$/.test(name);
  assert.equal(process.env.CI, 'true', 'D01 fixtures require CI');
  assert.equal(process.env.NODE_ENV, 'test', 'D01 fixtures require NODE_ENV=test');
  assert.equal(process.env.D01_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY', 'Explicit disposable D01 database confirmation required');
  assert.ok(loopback(url.href) && (!base || loopback(base)), 'D01 fixtures require loopback database and API');
  assert.ok(/^(participation_test_|commerce_test_)/.test(name) || githubService, 'D01 fixtures require a named disposable test database');

  const require = createRequire(import.meta.url);
  const { DatabaseService } = require('../dist/database/database.service.js');
  const { ParticipationService } = require('../dist/participation/participation.service.js');
  const { ParticipationSourcesService } = require('../dist/participation/participation-sources.service.js');
  const { participationSubject } = require('../dist/participation/participation-access.js');
  const { PDFDocument } = require('pdf-lib');
  // Preserve the real SERIALIZABLE/retry implementation when a pre-existing suite
  // supplies PrismaClient rather than DatabaseService.
  const database = typeof db.serializable === 'function' ? db : new Proxy(db, { get(target, key) {
    if (key === 'serializable') return DatabaseService.prototype.serializable.bind(target);
    const value = Reflect.get(target, key);
    return typeof value === 'function' ? value.bind(target) : value;
  } });
  const sources = new ParticipationSourcesService(database), cases = new ParticipationService(database, sources);
  const namespace = randomUUID(), caseIds = new Set(), documentIds = new Set(), templateIds = new Set(), counterIds = new Set();
  const accountIds = new Set(), personIds = new Set(), organizationIds = new Set(), verifiedAccounts = new Set();
  let reviewersPromise, providerPromise;

  async function account(label, fullName) {
    const person = await db.person.create({ data: { firstName: fullName || 'Synthetic D01', lastName: fullName ? '' : label } });
    personIds.add(person.id);
    const row = await db.account.create({ data: { personId: person.id, email: `d01-regression-${randomUUID()}@example.invalid`,
      passwordHash: 'SYNTHETIC_FIXTURE_NO_LOGIN', status: 'ACTIVE', emailVerifiedAt: new Date() } });
    accountIds.add(row.id);
    return row;
  }
  function reviewers() {
    return reviewersPromise ||= (async () => {
      const result = [];
      for (const label of ['Author', 'Approver', 'Signer']) {
        const actor = await account(label);
        await db.roleAssignment.create({ data: { accountId: actor.id, role: 'ADMIN', status: 'ACTIVE' } });
        result.push(actor);
      }
      return result;
    })();
  }
  async function provider() {
    return providerPromise ||= (async () => {
      const [owner] = await reviewers();
      const row = await db.organization.create({ data: { ownerId: owner.id, kind: 'DIVE_CENTER', status: 'ACTIVE', displayName: 'Synthetic D01 regression provider ' + namespace } });
      organizationIds.add(row.id);
      return row;
    })();
  }
  async function source(organizationId, kind, payload) {
    const [author, approver, signer] = await reviewers();
    const prior = await db.documentTemplate.findUnique({ where: { organizationId_code_version: { organizationId, code: 'D01-' + kind, version: 1 } } });
    const counterKey = { organizationId, department: 'SAFETY_COMPLIANCE_RISK', year: new Date().getUTCFullYear() };
    const priorCounter = await db.documentReferenceCounter.findUnique({ where: { organizationId_department_year: counterKey } });
    const pdf = await PDFDocument.create();
    pdf.addPage().drawText('SYNTHETIC CI ONLY - NO OPERATIONAL OR MEDICAL AUTHORITY\n' + kind + ' ' + namespace, { size: 10 });
    let row = await sources.create(author.id, { requestId: randomUUID(), organizationId, kind,
      title: 'Synthetic isolated D01 ' + kind, payload,
      attachment: { filename: 'synthetic-d01-' + kind.toLowerCase() + '.pdf', mimeType: 'application/pdf', base64: Buffer.from(await pdf.save()).toString('base64') } });
    documentIds.add(row.id);
    if (!priorCounter) counterIds.add((await db.documentReferenceCounter.findUniqueOrThrow({ where: { organizationId_department_year: counterKey } })).id);
    if (!prior) templateIds.add((await db.managedDocument.findUniqueOrThrow({ where: { id: row.id } })).templateId);
    for (const [action, actor] of [['SUBMIT', author], ['APPROVE', approver], ['SIGN', signer]]) {
      row = await sources.act(actor.id, row.id, { requestId: randomUUID(), expectedVersion: row.version, expectedHash: row.hash, action,
        reason: 'Synthetic isolated regression prerequisite; no real source adoption.' });
    }
    assert.equal(row.status, 'SIGNED');
    return row;
  }
  async function command(actorId, row, action, payload) {
    return cases.act(actorId, row.id, { requestId: randomUUID(), expectedRevision: row.revision, expectedDigest: row.digest, action, payload });
  }
  async function prepare(subjectType, subjectId, options = {}) {
    const [author, , reviewer] = await reviewers();
    let subject = await participationSubject(db, subjectType, subjectId);
    assert.equal(subject.terminal, false, 'Create native consent before terminal activity fixtures');
    assert.ok(!subject.service.startsAt || Date.parse(subject.service.startsAt) > Date.now(), 'Create native consent before activity starts');
    const actorId = options.participantAccountId || subject.accountId || (await account('Participant', subject.participantName)).id;
    const actor = await db.account.findUniqueOrThrow({ where: { id: actorId }, include: { person: true, diverProfile: true } });
    assert.equal(actor.status, 'ACTIVE', 'Fixture participant must be active');
    if (!actor.emailVerifiedAt) {
      // Synthetic identity prerequisite, restored at fixture cleanup. No role is granted.
      await db.account.update({ where: { id: actorId }, data: { emailVerifiedAt: new Date() } });
      verifiedAccounts.add(actorId);
      subject = await participationSubject(db, subjectType, subjectId);
    }
    const policy = await source(subject.organizationId, 'POLICY', {
      purpose: 'D01_POLICY_V1', serviceType: subject.service.type, serviceId: subject.service.id, subjectId,
      activityCode: subject.service.activityCode, effectiveFrom: '2000-01-01T00:00:00.000Z', validUntil: '2099-01-01T00:00:00.000Z',
      minimumAge: 0, guardianBelowAge: 0, consentRequirement: 'REQUIRED', medicalRequirement: 'NOT_APPLICABLE',
      consentTextAr: 'إقرار اصطناعي لاختبار تقني معزول؛ لا يمثل موافقة أو إجراءً حقيقيًا.',
      consentTextEn: 'Synthetic isolated regression consent. No real participation or clinical authority.',
      sourceAuthority: 'SYNTHETIC TEST AUTHORITY', sourceReference: namespace, sourceVersion: 'TEST_ONLY_V1',
      sourceClause: 'Synthetic prerequisite for the named test activity only.', applicabilityReason: 'No real medical applicability is claimed by this isolated fixture.',
    });
    const identity = await source(subject.organizationId, 'IDENTITY', {
      purpose: 'D01_IDENTITY_V1', subjectType, subjectId, participantAccountId: actorId,
      fullName: subject.participantName, dateOfBirth: subject.birthDate || actor.diverProfile?.dateOfBirth?.toISOString().slice(0, 10) || '1990-01-01',
      issuerName: 'SYNTHETIC TEST IDENTITY', sourceReference: namespace,
      issuedAt: new Date(Date.now() - 1000).toISOString(), validUntil: '2099-01-01T00:00:00.000Z',
    });
    const existing = await db.participationCase.findUnique({ where: subjectType === 'BOOKING_PARTICIPANT' ? { bookingParticipantId: subjectId } : { trainingEnrollmentId: subjectId } });
    let row;
    if (existing) {
      assert.ok(caseIds.has(existing.id), 'A regression helper may refresh only its own case');
      row = await command(author.id, await cases.detail(author.id, existing.id), 'REPLACE_SOURCES', { policyDocumentId: policy.id, identityDocumentId: identity.id, reason: 'Synthetic prerequisite changed; obtain a new actual fixture signature.' });
    } else {
      row = await cases.create(author.id, { requestId: randomUUID(), subjectType, subjectId, policyDocumentId: policy.id, identityDocumentId: identity.id });
      caseIds.add(row.id);
    }
    row = await cases.detail(actorId, row.id);
    row = await command(actorId, row, 'SIGN_CONSENT', { consent: true, signedName: row.signatureName, consentHash: row.consentHash,
      ...(row.resumeReasonRequired ? { reason: 'Actual synthetic participant renews the changed prerequisite.' } : {}) });
    const consentedAt = row.consent.signedAt;
    if (options.review !== false) {
      row = await cases.detail(reviewer.id, row.id);
      row = await command(reviewer.id, row, 'REVIEW', { decision: 'ELIGIBLE', reason: 'Independent synthetic source-bound prerequisite review.', reviewed: true });
      assert.equal(row.status, 'CLEARED', JSON.stringify(row.readiness));
    }
    return { case: row, participantAccountId: actorId, consentedAt, sourceIds: [policy.id, identity.id] };
  }

  async function cleanup() {
    if (!caseIds.size && !documentIds.size && !accountIds.size) return;
    // No application request may run during teardown. An exclusive table lock
    // prevents any other transaction from observing the temporary trigger state.
    const retainedState = await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('LOCK TABLE "ParticipationEvent" IN ACCESS EXCLUSIVE MODE');
      const triggers = await tx.$queryRawUnsafe(`SELECT tgname,tgenabled::text AS enabled FROM pg_trigger WHERE tgrelid='"ParticipationEvent"'::regclass AND tgname='ParticipationEvent_immutable' AND NOT tgisinternal`);
      if (triggers.length) {
        assert.equal(triggers[0].enabled, 'O', 'Participation append-only trigger must be enabled before cleanup');
        await tx.$executeRawUnsafe('ALTER TABLE "ParticipationEvent" DISABLE TRIGGER "ParticipationEvent_immutable"');
      }
      await tx.participationEvent.deleteMany({ where: { caseId: { in: [...caseIds] } } });
      await tx.participationCase.deleteMany({ where: { id: { in: [...caseIds] } } });
      if (triggers.length) {
        await tx.$executeRawUnsafe('ALTER TABLE "ParticipationEvent" ENABLE TRIGGER "ParticipationEvent_immutable"');
        const [trigger] = await tx.$queryRawUnsafe(`SELECT tgenabled::text AS enabled FROM pg_trigger WHERE tgrelid='"ParticipationEvent"'::regclass AND tgname='ParticipationEvent_immutable'`);
        assert.equal(trigger.enabled, 'O', 'Participation append-only trigger restored before commit');
      }
      await tx.managedDocumentAttachment.deleteMany({ where: { documentId: { in: [...documentIds] } } });
      await tx.documentLifecycleEvent.deleteMany({ where: { documentId: { in: [...documentIds] } } });
      await tx.documentRevision.deleteMany({ where: { documentId: { in: [...documentIds] } } });
      await tx.managedDocument.deleteMany({ where: { id: { in: [...documentIds] } } });
      await tx.documentTemplate.deleteMany({ where: { id: { in: [...templateIds] }, documents: { none: {} } } });
      for (const counter of await tx.documentReferenceCounter.findMany({ where: { id: { in: [...counterIds] } } })) {
        if (!await tx.managedDocument.count({ where: { organizationId: counter.organizationId, department: counter.department } })) {
          await tx.documentReferenceCounter.delete({ where: { id: counter.id } });
        }
      }
      for (const id of verifiedAccounts) await tx.account.update({ where: { id }, data: { emailVerifiedAt: null } });
      // Native notifications may target the synthetic provider owner. Remove
      // only this helper's accounts and their delivery records, never a broad
      // suite-wide notification set. No privileged fixture role survives.
      await tx.trialPushDispatch.deleteMany({ where: { accountId: { in: [...accountIds] } } });
      await tx.customerNoticeEmail.deleteMany({ where: { accountId: { in: [...accountIds] } } });
      await tx.notification.deleteMany({ where: { accountId: { in: [...accountIds] } } });
      await tx.roleAssignment.deleteMany({ where: { accountId: { in: [...accountIds] } } });
      const immutableAudit = await tx.$queryRawUnsafe(`SELECT 1 FROM pg_trigger WHERE tgrelid='"AuditEvent"'::regclass AND tgname='AuditEvent_append_only_row' AND tgenabled<>'D' AND NOT tgisinternal`);
      if (!immutableAudit.length) {
        await tx.auditEvent.deleteMany({ where: { resourceId: { in: [...caseIds, ...documentIds] }, action: { startsWith: 'PARTICIPATION_' } } });
        const removableOrganizations = await tx.organization.findMany({ where: { id: { in: [...organizationIds] }, trips: { none: {} } }, select: { id: true } });
        await tx.documentReferenceCounter.deleteMany({ where: { organizationId: { in: removableOrganizations.map(row => row.id) } } });
        await tx.organization.deleteMany({ where: { id: { in: removableOrganizations.map(row => row.id) } } });
        const retained = await tx.organization.findMany({ where: { ownerId: { in: [...accountIds] } }, select: { ownerId: true } });
        const deletable = [...accountIds].filter(id => !retained.some(row => row.ownerId === id));
        await tx.account.deleteMany({ where: { id: { in: deletable } } });
        await tx.person.deleteMany({ where: { id: { in: [...personIds] }, account: { is: null }, auditEvents: { none: {} } } });
      }
      await tx.account.updateMany({ where: { id: { in: [...accountIds] } }, data: { status: 'ARCHIVED' } });
      assert.equal(await tx.roleAssignment.count({ where: { accountId: { in: [...accountIds] }, status: 'ACTIVE' } }), 0,
        'No active authority from a completed synthetic fixture may escape cleanup');
      return {
        accounts: await tx.account.findMany({ where: { id: { in: [...accountIds] } }, select: { id: true } }),
        people: await tx.person.findMany({ where: { id: { in: [...personIds] } }, select: { id: true } }),
        organizations: await tx.organization.findMany({ where: { id: { in: [...organizationIds] } }, select: { id: true } }),
      };
    }, { timeout: 30_000 });
    caseIds.clear(); documentIds.clear(); templateIds.clear(); counterIds.clear(); accountIds.clear(); personIds.clear(); organizationIds.clear(); verifiedAccounts.clear();
    retainedState.accounts.forEach(row => accountIds.add(row.id));
    retainedState.people.forEach(row => personIds.add(row.id));
    retainedState.organizations.forEach(row => organizationIds.add(row.id));
  }
  return { prepare, cleanup, provider };
}
