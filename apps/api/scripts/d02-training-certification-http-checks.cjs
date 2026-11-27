// Native D02 HTTP/PG acceptance. The reused D01 harness rejects all external HTTP
// and requires an explicitly confirmed disposable participation_test_d01_* DB.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { writeFile } = require('node:fs/promises');
const { participationFixture } = require('./d01-participation-fixture.cjs');

async function main() {
  assert.equal(process.env.D02_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
  const f = await participationFixture(), { db, call, ok, denied } = f;
  const checks = [], courses = [];
  const check = async (name, work) => { await work(); checks.push(name); console.log('PASS D02', name); };
  const detail = (certificate, actor = f.reviewer) => call(actor, '/training/certificates/' + certificate.id).then(ok);
  const recommend = course => call(instructor, '/training/professional/me/records/' + course.recordId + '/certificate-recommendation', 'POST');
  const decide = (certificate, outcome = 'APPROVED', actor = f.reviewer) => call(actor, '/training/certificates/' + certificate.id + '/decision', 'POST', {
    outcome, expectedUpdatedAt: certificate.updatedAt, reviewed: true, reason: 'Synthetic internal D02 decision only; no agency issuance.',
  });
  const command = (certificate, extra = {}) => ({ requestId: randomUUID(), expectedUpdatedAt: certificate.updatedAt,
    reason: 'Synthetic D02 reconsideration or revocation with retained history.', ...extra });
  const queueItem = async certificate => ok(await call(f.reviewer, '/training/certificates?status=' + certificate.status)).items.find(row => row.id === certificate.id);
  const readiness = async course => ok(await call(instructor, '/training/professional/me/certificates')).find(row => row.trainingRecordId === course.recordId);
  const noWriteSnapshot = async () => JSON.stringify(await Promise.all([
    db.trainingCertificate.findMany({ orderBy: { id: 'asc' } }), db.trainingEnrollment.findMany({ orderBy: { id: 'asc' } }),
    db.trainingRecord.findMany({ orderBy: { id: 'asc' } }), db.trainingSession.findMany({ orderBy: { id: 'asc' } }),
    db.trainingSkill.findMany({ orderBy: { id: 'asc' } }), db.participationCase.findMany({ orderBy: { id: 'asc' } }),
    db.participationEvent.findMany({ orderBy: { id: 'asc' } }), db.auditEvent.findMany({ where: { action: { startsWith: 'training.' } }, orderBy: { id: 'asc' } }),
  ]));
  const noEffects = async (work, status) => { const before = await noWriteSnapshot(), response = await work(); denied(response, status); assert.equal(await noWriteSnapshot(), before); return response; };
  let instructor;
  try {
    instructor = await f.actor('d02-instructor', 'INSTRUCTOR');
    const membership = await db.organizationMember.create({ data: { organizationId: f.center.id, accountId: instructor.id, role: 'INSTRUCTOR', status: 'ACTIVE' } });
    const credential = await db.credential.create({ data: { personId: instructor.personId, issuer: 'SYNTHETIC_D02_AGENCY', title: 'SYNTHETIC_INSTRUCTOR',
      verificationStatus: 'VERIFIED', issuedAt: new Date('2000-01-01'), expiresAt: new Date('2099-01-01') } });
    await db.diverProfile.create({ data: { accountId: f.participant.id, dateOfBirth: new Date('1990-01-01') } });
    const certificates = f.app.get(f.load('governance/training-certificate.service.js').TrainingCertificateService);
    const { runTrainingCertificationAdapter } = f.load('governance/training-certification-adapter.js');
    const { TRAINING_CERTIFICATION_PROTOCOL, trainingCertificationDigest } = f.load('governance/training-certification-contract.js');

    async function completed(label, priorProgram) {
      const code = priorProgram?.code || 'SYNTHETIC_D02_' + label + '_' + randomUUID().slice(0, 8);
      let enrollment = ok(await call(f.participant, '/training/enrollments', 'POST', { courseCode: code, centerOrganizationId: f.center.id }));
      ok(await call(f.centerOwner, '/center/me/training/enrollments/' + enrollment.id + '/instructor', 'PATCH', {
        instructorAccountId: instructor.id, expectedUpdatedAt: enrollment.updatedAt, transferUpcomingSessions: true,
        reason: 'Synthetic D02 assigned instructor, no real training qualification claim.',
      }));
      const subject = { subject: enrollment, subjectType: 'TRAINING_ENROLLMENT', subjectId: enrollment.id,
        serviceType: 'TRAINING_ENROLLMENT', serviceId: enrollment.id, activityCode: code, account: f.participant, organizationId: f.center.id };
      const policy = await f.signedSource('POLICY', f.policyTerms(subject));
      const identity = await f.signedSource('IDENTITY', f.identityTerms(subject));
      let participation = await f.createCase(subject, policy, identity);
      participation = await f.readCase(participation, f.participant);
      participation = await f.caseAction(participation, 'SIGN_CONSENT', f.participant, {
        consent: true, signedName: participation.signatureName, consentHash: participation.consentHash,
      });
      participation = await f.caseAction(participation, 'REVIEW', f.reviewer, { decision: 'ELIGIBLE', reviewed: true, reason: 'Synthetic source applicability reviewed.' });
      assert.equal(participation.status, 'CLEARED');
      const originalConsent = await db.participationEvent.findUniqueOrThrow({ where: { id: participation.consent.eventId } });
      let program = priorProgram;
      if (!program) {
        const profile = { agencyCode: 'SYNTHETIC_D02_AGENCY', programCode: code, level: 'NO_REAL_OPERATIONAL_AUTHORITY', edition: 'SYNTHETIC_D02_V1',
          sources: [{ authority: 'AGENCY', reference: 'SYNTHETIC_NOT_AN_AGENCY_STANDARD', edition: 'TEST_ONLY', locator: 'isolated-d02-fixture' }],
          requirements: { minimumAge: 0, minimumCompletedSessions: 1, minimumOpenWaterDives: 0, minimumOpenWaterMinutes: 0,
            instructorCredentialTitles: ['SYNTHETIC_INSTRUCTOR'], prerequisites: [], requiredSkillCodes: ['SYNTHETIC_D02_SKILL'], requiredFormCodes: [],
            supervision: [{ environment: 'POOL', minimumAge: 0, maximumAge: 120, studentsPerInstructor: 1, maximumDepthMetres: 0 }] } };
        const draft = ok(await call(f.creator, '/training/standards', 'POST', { profile, reason: 'Synthetic original program source for isolated D02 verification.' }));
        const source = await db.policyControl.findUniqueOrThrow({ where: { id: draft.id } });
        ok(await call(f.approver, '/training/standards/' + draft.id + '/decision', 'POST', { outcome: 'APPROVE', reviewed: true,
          expectedUpdatedAt: source.updatedAt.toISOString(), approvalReference: 'SYNTHETIC_D02_ONLY_NO_AGENCY_AUTHORITY', validUntil: '2099-01-01T00:00:00.000Z' }));
        program = { id: draft.id, code };
      }
      enrollment = await db.trainingEnrollment.findUniqueOrThrow({ where: { id: enrollment.id } });
      ok(await call(instructor, '/training/professional/me/enrollments/' + enrollment.id + '/standard', 'POST', {
        profileId: program.id, environment: 'POOL', plannedMaximumDepthMetres: 0, expectedUpdatedAt: enrollment.updatedAt.toISOString(),
        reason: 'Synthetic current source adoption before any activity.',
      }));
      // Binding itself checks D01, then changes the subject's program scope.
      // The original signature remains evidence, but cannot authorize that new
      // scope until the participant personally reads and signs it again.
      participation = await f.readCase(participation, f.participant);
      assert.equal(participation.status, 'ACTION_REQUIRED');
      assert.ok(participation.readiness.reasons.includes('PARTICIPATION_SUBJECT_CHANGED'));
      participation = await f.caseAction(participation, 'REPLACE_SOURCES', f.reviewer, {
        policyDocumentId: policy.id, identityDocumentId: identity.id,
        reason: 'Reassess the current program binding before obtaining new personal consent.',
      });
      assert.equal(participation.status, 'ACTION_REQUIRED');
      assert.notEqual(participation.consent.consentHash, participation.consentHash);
      participation = await f.readCase(participation, f.participant);
      participation = await f.caseAction(participation, 'SIGN_CONSENT', f.participant, {
        consent: true, signedName: participation.signatureName, consentHash: participation.consentHash,
      });
      participation = await f.caseAction(participation, 'REVIEW', f.reviewer, {
        decision: 'ELIGIBLE', reviewed: true, reason: 'Synthetic current program scope and renewed personal consent reviewed.',
      });
      assert.equal(participation.status, 'CLEARED');
      assert.notEqual(participation.consent.eventId, originalConsent.id);
      assert.deepEqual(await db.participationEvent.findUniqueOrThrow({ where: { id: originalConsent.id } }), originalConsent);
      enrollment = await db.trainingEnrollment.findUniqueOrThrow({ where: { id: enrollment.id } });
      const sessionId = randomUUID(), startsAt = new Date(Date.now() + 1800), endsAt = new Date(startsAt.getTime() + 120000);
      assert.ok(Date.parse(participation.consent.signedAt) < startsAt.getTime());
      ok(await call(f.centerOwner, '/center/me/training/enrollments/' + enrollment.id + '/sessions', 'POST', {
        requestId: sessionId, instructorAccountId: instructor.id, expectedUpdatedAt: enrollment.updatedAt.toISOString(),
        startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), environment: 'POOL', plannedMaximumDepthMetres: 0,
        reason: 'Synthetic session scheduled after the actual test consent.',
      }));
      const actSession = async (action, actor = f.centerOwner, professional = false) => {
        const session = await db.trainingSession.findUniqueOrThrow({ where: { id: sessionId } });
        return ok(await call(actor, professional ? '/training/professional/me/sessions/' + sessionId + '/attendance' : '/center/me/training/sessions/' + sessionId + '/actions', 'PATCH', {
          action, expectedUpdatedAt: session.updatedAt.toISOString(), ...(!professional ? { reason: 'Synthetic native attendance and execution only.' } : {}),
        }));
      };
      await actSession('OPEN'); await actSession('INSTRUCTOR_CHECK_IN', instructor, true); await actSession('STUDENT_CHECK_IN');
      const remaining = startsAt.getTime() - Date.now() + 5; if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
      await actSession('START'); await actSession('COMPLETE');
      const record = await db.trainingRecord.findUniqueOrThrow({ where: { enrollmentId: enrollment.id }, include: { stages: { include: { skills: true } } } });
      for (const skill of record.stages.flatMap(stage => stage.skills)) ok(await call(instructor, '/training/skills/' + skill.id + '/assessment', 'PATCH', { status: 'COMPETENT' }));
      const plan = ok(await call(instructor, '/training/professional/me/enrollments/' + enrollment.id + '/plan'));
      ok(await call(instructor, '/training/professional/me/enrollments/' + enrollment.id + '/complete', 'POST', {
        expectedUpdatedAt: plan.record.updatedAt, reviewed: true, reason: 'Synthetic internal course completion after original evidence.',
      }));
      const result = { enrollmentId: enrollment.id, recordId: record.id, sessionId, participation, policy, identity, program };
      courses.push(result); return result;
    }
    async function revokeProgram(program) {
      const source = await db.policyControl.findUniqueOrThrow({ where: { id: program.id } });
      return ok(await call(f.approver, '/training/standards/' + program.id + '/decision', 'POST', {
        outcome: 'REVOKE', reviewed: true, expectedUpdatedAt: source.updatedAt.toISOString(), approvalReference: 'Synthetic source withdrawal, not an agency decision.',
      }));
    }
    function testStore() {
      const values = new Map();
      const active = (key, token) => { const row = values.get(key); assert.ok(row && row.token === token && !row.result && Date.now() < Date.parse(row.leaseExpiresAt)); return row; };
      return {
        async reserve(key, digest, leaseMs) { const prior = values.get(key); if (prior) return prior.digest !== digest ? { state: 'CONFLICT' } : prior.result ? { state: 'REPLAY', result: prior.result } : { state: 'IN_FLIGHT' };
          const token = randomUUID(), leaseExpiresAt = new Date(Date.now() + leaseMs).toISOString();
          values.set(key, { digest, token, leaseExpiresAt, exchangeStarted: false }); return { state: 'RESERVED', token, leaseExpiresAt }; },
        async beginExchange(key, token) { const current = active(key, token); assert.equal(current.exchangeStarted, false); current.exchangeStarted = true; },
        async finish(key, token, result) { const current = active(key, token); current.result = structuredClone(result); },
        async recover(key, digest, fallback, token) { const current = values.get(key); assert.ok(current);
          if (current.digest !== digest) return { state: 'CONFLICT' };
          if (current.result) return { state: 'REPLAY', result: structuredClone(current.result) };
          if (token !== undefined) assert.equal(current.token, token); else if (Date.now() < Date.parse(current.leaseExpiresAt)) return { state: 'IN_FLIGHT' };
          current.result = { ...structuredClone(fallback), syntheticRequestAttempted: current.exchangeStarted }; return { state: 'REPLAY', result: structuredClone(current.result) }; },
      };
    }
    const receipt = request => ({ protocol: request.protocol, mode: 'TEST', requestId: request.requestId, requestDigest: trainingCertificationDigest(request),
      binding: request.binding, internalCertificateId: request.internalResult.certificateId, outcome: 'CONTRACT_ACCEPTED', checkedAt: new Date().toISOString(),
      receiptId: randomUUID(), synthetic: true, officialIssuance: false, externalCertificateNumber: null });
    const requestFor = source => ({ protocol: TRAINING_CERTIFICATION_PROTOCOL, mode: 'TEST', requestId: randomUUID(), requestedAt: new Date().toISOString(), ...source });

    let baseline, approved, appealCourse, rejected;
    await check('registration, native source adoption, consent, attendance, assessment and completion preserve the internal boundary', async () => {
      baseline = await completed('BASELINE');
      assert.equal((await readiness(baseline)).readyForRecommendation, true);
      assert.equal(await db.trainingCertificate.count({ where: { trainingRecordId: baseline.recordId } }), 0);
    });
    await check('read-only readiness and queue queries create no certificate, training, consent or audit writes', async () => {
      const before = await noWriteSnapshot();
      assert.equal((await readiness(baseline)).completionReadiness.ready, true);
      ok(await call(f.reviewer, '/training/certificates')); ok(await call(f.participant, '/training/mine/certificates'));
      assert.equal(await noWriteSnapshot(), before);
    });
    await check('concurrent recommendation and internal approval issue one original number without external certification', async () => {
      const recommended = await Promise.all([recommend(baseline), recommend(baseline)]);
      recommended.forEach(ok); assert.equal(recommended.filter(row => !row.data.replayed).length, 1);
      const certificate = recommended[0].data;
      assert.equal((await queueItem(certificate)).canApprove, true);
      const results = await Promise.all([decide(certificate), decide(certificate)]); results.forEach(ok);
      assert.equal(results.filter(row => !row.data.replayed).length, 1); approved = results[0].data;
      assert.equal(approved.status, 'APPROVED'); assert.equal(approved.internalResult.scope, 'HYDROLAND_INTERNAL');
      assert.equal(approved.externalCertification.status, 'NOT_CONNECTED'); assert.equal(approved.externalCertification.officialIssuance, false);
      assert.equal(approved.externalCertification.certificateNumber, null);
    });
    await check('the original append-only audit migration rejects update, delete and truncate without changing decision evidence', async () => {
      const original = await db.auditEvent.findFirstOrThrow({ where: { resourceId: approved.id, action: 'training.certificate_decided' } });
      const before = await noWriteSnapshot();
      const attempts = [
        tx => tx.$executeRaw`UPDATE "AuditEvent" SET "action" = 'SYNTHETIC_FORBIDDEN_MUTATION' WHERE "id"::text = ${original.id}`,
        tx => tx.$executeRaw`DELETE FROM "AuditEvent" WHERE "id"::text = ${original.id}`,
        tx => tx.$executeRaw`TRUNCATE TABLE "AuditEvent"`,
      ];
      for (const attempt of attempts) await assert.rejects(() => db.$transaction(async tx => {
        await attempt(tx);
        // Roll back even if a missing trigger incorrectly allowed a mutation.
        throw new Error('Original AuditEvent append-only protection is missing');
      }), error => error?.meta?.code === '55000');
      assert.deepEqual(await db.auditEvent.findUniqueOrThrow({ where: { id: original.id } }), original);
      assert.equal(await noWriteSnapshot(), before);
      const triggers = await db.$queryRaw`SELECT "tgname"::text AS name, "tgenabled"::text AS enabled FROM pg_trigger WHERE tgrelid = '"AuditEvent"'::regclass AND NOT tgisinternal ORDER BY "tgname"`;
      for (const name of ['AuditEvent_append_only_row', 'AuditEvent_append_only_truncate'])
        assert.ok(triggers.some(trigger => trigger.name === name && trigger.enabled === 'O'));
    });
    await check('the native binding reader and injectable adapter share exact approved evidence and do not claim agency issuance', async () => {
      const source = await certificates.readCertificationSource(f.reviewer.id, approved.id), request = requestFor(source), store = testStore();
      assert.ok(source); assert.equal(source.binding.enrollmentId, baseline.enrollmentId); assert.equal(source.internalResult.certificateId, approved.id);
      const before = await noWriteSnapshot(); let calls = 0;
      const dependencies = { actorAccountId: f.reviewer.id, readCurrentSource: () => certificates.readCertificationSource(f.reviewer.id, approved.id), store };
      assert.equal((await runTrainingCertificationAdapter(request, dependencies)).status, 'NOT_CONNECTED');
      const connected = { ...dependencies, driver: { kind: 'SYNTHETIC', exchange: async value => { calls++; return receipt(value); } } };
      const result = await runTrainingCertificationAdapter(request, connected); assert.equal(result.status, 'CONTRACT_ACCEPTED');
      assert.equal(result.officialIssuance, false); assert.equal(result.externalCertification.status, 'NOT_CONNECTED');
      assert.equal((await runTrainingCertificationAdapter(request, connected)).replayed, true); assert.equal(calls, 1);
      assert.equal(await noWriteSnapshot(), before);
    });
    await check('adapter binding rejects a changed certificate label or decision proof rather than trusting APPROVED alone', async () => {
      await f.changed('trainingCertificate', { id: approved.id }, { certificateNumber: 'HYD-TRN-2026-1111111111111111' }, async () => {
        assert.equal(await certificates.readCertificationSource(f.reviewer.id, approved.id), null);
      });
      const original = await db.auditEvent.findFirstOrThrow({ where: { resourceId: approved.id, action: 'training.certificate_decided' } });
      assert.match(original.metadata.approvalSourceDigest, /^[a-f0-9]{64}$/);
      assert.match(original.metadata.afterStateDigest, /^[a-f0-9]{64}$/);
      assert.ok(await certificates.readCertificationSource(f.reviewer.id, approved.id));
    });
    await check('actual role and qualification loss blocks readiness and the native adapter source without writes', async () => {
      await f.changed('credential', { id: credential.id }, { verificationStatus: 'REJECTED' }, async () => {
        assert.equal((await readiness(baseline)).completionReadiness.ready, false);
        assert.equal(await certificates.readCertificationSource(f.reviewer.id, approved.id), null);
      });
      await f.changed('organizationMember', { id: membership.id }, { status: 'SUSPENDED' }, async () => {
        assert.ok(!ok(await call(instructor, '/training/professional/me/certificates')).some(row => row.trainingRecordId === baseline.recordId));
      });
      await f.changed('roleAssignment', { id: f.reviewer.assignment.id }, { status: 'SUSPENDED' }, async () => {
        denied(await call(f.reviewer, '/training/certificates'), 403);
        await assert.rejects(() => certificates.readCertificationSource(f.reviewer.id, approved.id), error => error.getStatus?.() === 403);
      });
    });
    await check('unexpected database failures remain server errors instead of being exposed as readiness reasons', async () => {
      const original = db.serializable;
      db.serializable = function (work, attempts) {
        return original.call(this, tx => work(new Proxy(tx, { get(target, key) {
          if (key === 'trainingEnrollment') return new Proxy(target.trainingEnrollment, { get(model, method) {
            if (method === 'findUniqueOrThrow') return async () => { throw new Error('Synthetic unexpected database failure, never a public review reason'); };
            const value = Reflect.get(model, method); return typeof value === 'function' ? value.bind(model) : value;
          } });
          const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value;
        } })), attempts);
      };
      try {
        await assert.rejects(() => certificates.readCertificationSource(f.reviewer.id, approved.id), /Synthetic unexpected database failure/);
        const response = await call(f.reviewer, '/training/certificates?status=APPROVED'); denied(response, 500);
        assert.ok(!JSON.stringify(response.data).includes('Synthetic unexpected database failure'));
      } finally { db.serializable = original; }
    });
    await check('native program revocation during adapter dispatch invalidates the receipt without changing an internal issued result', async () => {
      const source = await certificates.readCertificationSource(f.reviewer.id, approved.id); let calls = 0;
      const result = await runTrainingCertificationAdapter(requestFor(source), { actorAccountId: f.reviewer.id,
        readCurrentSource: () => certificates.readCertificationSource(f.reviewer.id, approved.id), store: testStore(),
        driver: { kind: 'SYNTHETIC', exchange: async request => { calls++; await revokeProgram(baseline.program); return receipt(request); } } });
      assert.equal(calls, 1); assert.equal(result.status, 'UNKNOWN'); assert.equal(result.code, 'SOURCE_CHANGED');
      assert.equal((await detail(approved)).status, 'APPROVED'); assert.equal((await detail(approved)).externalCertification.status, 'NOT_CONNECTED');
      const repeat = await runTrainingCertificationAdapter(requestFor(source), { actorAccountId: f.reviewer.id,
        readCurrentSource: () => certificates.readCertificationSource(f.reviewer.id, approved.id), store: testStore(),
        driver: { kind: 'SYNTHETIC', exchange: async request => { calls++; return receipt(request); } } });
      assert.equal(repeat.status, 'UNKNOWN'); assert.equal(repeat.code, 'SOURCE_CHANGED'); assert.equal(calls, 1, 'A program revoked before dispatch never calls the driver');
    });
    await check('program revocation blocks both readiness projections and approval while independent rejection remains possible', async () => {
      const unsubmitted = await completed('PROGRAM_UNSUBMITTED'), pending = await completed('PROGRAM_PENDING', unsubmitted.program);
      const certificate = ok(await recommend(pending));
      assert.equal((await readiness(unsubmitted)).readyForRecommendation, true); assert.equal((await queueItem(certificate)).canApprove, true);
      await revokeProgram(unsubmitted.program);
      const before = await noWriteSnapshot();
      const instructorView = await readiness(unsubmitted), reviewerView = await queueItem(certificate);
      assert.equal(instructorView.readyForRecommendation, false); assert.ok(instructorView.completionReadiness.reasonCodes.includes('TRAINING_STANDARD_NOT_APPROVED'));
      assert.equal(reviewerView.canApprove, false); assert.equal(reviewerView.canReview, true);
      assert.equal(await noWriteSnapshot(), before);
      await noEffects(() => recommend(unsubmitted), 409); await noEffects(() => decide(certificate), 409);
      assert.equal(ok(await decide(certificate, 'REJECTED')).status, 'REJECTED');
    });
    await check('native D01 source revocation blocks GET readiness and POST approval without exposing private reasons', async () => {
      const unsubmitted = await completed('PARTICIPATION_UNSUBMITTED'), pending = await completed('PARTICIPATION_PENDING');
      const certificate = ok(await recommend(pending));
      await f.sourceAction(unsubmitted.identity, 'REVOKE', f.creator); await f.sourceAction(pending.policy, 'REVOKE', f.creator);
      const before = await noWriteSnapshot(), a = await readiness(unsubmitted), b = await queueItem(certificate);
      assert.equal(a.readyForRecommendation, false); assert.equal(b.canApprove, false); assert.equal(b.canReview, true);
      assert.ok(a.completionReadiness.reasonCodes.includes('PARTICIPATION_NOT_CLEARED'));
      assert.ok(b.completionReadiness.reasonCodes.includes('PARTICIPATION_NOT_CLEARED'));
      assert.ok(!JSON.stringify([a, b]).match(/medicalDocument|dateOfBirth|guardianAccount|CLEARED_FOR_ACTIVITY|synthetic-private.*pdf/));
      assert.equal(await noWriteSnapshot(), before); await noEffects(() => recommend(unsubmitted), 409); await noEffects(() => decide(certificate), 409);
      assert.equal(ok(await decide(certificate, 'REJECTED')).status, 'REJECTED');
    });
    await check('an authenticated learner can read their own rejection and request reconsideration without organization membership', async () => {
      appealCourse = await completed('APPEAL'); rejected = ok(await decide(ok(await recommend(appealCourse)), 'REJECTED'));
      const mine = ok(await call(f.participant, '/training/mine/certificates')).items.find(row => row.id === rejected.id);
      assert.equal(mine.canRequestReconsideration, true); assert.equal(await db.organizationMember.count({ where: { accountId: f.participant.id } }), 0);
      denied(await call(f.outsider, '/training/certificates/' + rejected.id), 403);
      assert.ok(!ok(await call(f.outsider, '/training/mine/certificates')).items.some(row => row.id === rejected.id));
    });
    let pendingRequest, requestBody;
    await check('request replay, changed input, stale revision and concurrent requests preserve one pending objection', async () => {
      requestBody = command(rejected);
      const path = '/training/certificates/' + rejected.id + '/reconsideration';
      const results = await Promise.all([call(f.participant, path, 'POST', requestBody), call(f.participant, path, 'POST', requestBody)]); results.forEach(ok);
      assert.equal(results.filter(row => !row.data.replayed).length, 1); pendingRequest = results[0].data;
      assert.equal(pendingRequest.status, 'REJECTED'); assert.equal(pendingRequest.reconsideration.status, 'PENDING');
      await noEffects(() => call(f.participant, path, 'POST', { ...requestBody, reason: 'A different synthetic objection.' }), 409);
      await noEffects(() => call(f.participant, path, 'POST', command(rejected)), 409);
      assert.equal(await db.auditEvent.count({ where: { resourceId: rejected.id, action: 'training.certificate_reconsideration_requested' } }), 1);
    });
    await check('malformed or self-reviewed objections cannot change the decision or issue a certificate', async () => {
      const path = '/training/certificates/' + rejected.id + '/reconsideration-decision';
      for (const extra of [{ reviewed: false }, { outcome: ['REOPEN'] }, { reason: '' }, { requestId: 'bad' }, { status: 'APPROVED' }])
        await noEffects(() => call(f.reviewer, path, 'POST', command(pendingRequest, { reviewed: true, outcome: 'REOPEN', ...extra })), 400);
      await db.roleAssignment.create({ data: { accountId: f.participant.id, role: 'REVIEWER', status: 'ACTIVE' } });
      await noEffects(() => call(f.participant, path, 'POST', command(pendingRequest, { reviewed: true, outcome: 'REOPEN' })), 403);
      await db.roleAssignment.delete({ where: { accountId_role: { accountId: f.participant.id, role: 'REVIEWER' } } });
      await noEffects(() => call(instructor, path, 'POST', command(pendingRequest, { reviewed: true, outcome: 'REOPEN' })), 403);
    });
    await check('reconsideration may be reviewed by the original independent reviewer and only reopens the recommendation', async () => {
      const path = '/training/certificates/' + rejected.id + '/reconsideration-decision', body = command(pendingRequest, { reviewed: true, outcome: 'REOPEN' });
      const results = await Promise.all([call(f.reviewer, path, 'POST', body), call(f.reviewer, path, 'POST', body)]); results.forEach(ok);
      assert.equal(results.filter(row => !row.data.replayed).length, 1); rejected = results[0].data;
      assert.equal(rejected.status, 'RECOMMENDED'); assert.equal(rejected.certificateNumber, null); assert.equal(rejected.issuedAt, null);
      assert.ok(rejected.history.some(event => event.action === 'training.certificate_reconsideration_decided' && event.previousDecision.status === 'REJECTED'));
      assert.equal(ok(await decide(rejected)).status, 'APPROVED');
    });
    await check('audit failure rolls back an objection and opposite concurrent decisions have one winner', async () => {
      const course = await completed('AUDIT_RACE'), refused = ok(await decide(ok(await recommend(course)), 'REJECTED'));
      const path = '/training/certificates/' + refused.id + '/reconsideration', body = command(refused), original = db.serializable;
      const before = await noWriteSnapshot();
      db.serializable = function (work, attempts) { return original.call(this, tx => work(new Proxy(tx, { get(target, key) {
        if (key === 'auditEvent') return new Proxy(target.auditEvent, { get(model, method) {
          if (method === 'create') return async input => { if (input.data.action === 'training.certificate_reconsideration_requested') throw new Error('Synthetic atomic certificate audit failure'); return model.create(input); };
          const value = Reflect.get(model, method); return typeof value === 'function' ? value.bind(model) : value;
        } });
        const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value;
      } })), attempts); };
      try { await assert.rejects(() => certificates.requestReconsideration(refused.id, f.participant.id, body), /Synthetic atomic certificate audit failure/); }
      finally { db.serializable = original; }
      assert.equal(await noWriteSnapshot(), before);
      const pending = ok(await call(f.participant, path, 'POST', body));
      const decisions = await Promise.all(['REOPEN', 'DISMISS'].map(outcome => call(f.reviewer, '/training/certificates/' + refused.id + '/reconsideration-decision', 'POST', command(pending, { reviewed: true, outcome }))));
      assert.equal(decisions.filter(response => response.status === 201).length, 1); assert.equal(decisions.filter(response => response.status === 409).length, 1);
      assert.equal(await db.auditEvent.count({ where: { resourceId: refused.id, action: 'training.certificate_reconsideration_decided' } }), 1);
      assert.equal((await detail(refused)).certificateNumber, null);
    });
    await check('reopened recommendation still obeys current source requirements, and dismissal preserves the original refusal', async () => {
      const course = await completed('REOPEN_BLOCKED'), refused = ok(await decide(ok(await recommend(course)), 'REJECTED'));
      let request = ok(await call(f.participant, '/training/certificates/' + refused.id + '/reconsideration', 'POST', command(refused)));
      const dismissed = ok(await call(f.reviewer, '/training/certificates/' + refused.id + '/reconsideration-decision', 'POST', command(request, { reviewed: true, outcome: 'DISMISS' })));
      assert.equal(dismissed.status, 'REJECTED'); assert.equal(dismissed.reviewReason, refused.reviewReason); assert.equal(dismissed.reconsideration.status, 'DISMISSED');
      request = ok(await call(instructor, '/training/certificates/' + refused.id + '/reconsideration', 'POST', command(dismissed)));
      const reopened = ok(await call(f.reviewer, '/training/certificates/' + refused.id + '/reconsideration-decision', 'POST', command(request, { reviewed: true, outcome: 'REOPEN' })));
      await f.sourceAction(course.identity, 'REVOKE', f.creator);
      await noEffects(() => decide(reopened), 409); assert.equal((await detail(reopened)).canApprove, false); assert.equal((await detail(reopened)).canReview, true);
    });
    await check('a revoked internal result retains its number, original decision and final status across replay and unauthorized actions', async () => {
      const current = await detail(rejected), body = command(current, { reviewed: true }), path = '/training/certificates/' + current.id + '/revoke';
      await noEffects(() => call(f.participant, path, 'POST', body), 403);
      await noEffects(() => call(instructor, path, 'POST', body), 403);
      const results = await Promise.all([call(f.reviewer, path, 'POST', body), call(f.reviewer, path, 'POST', body)]); results.forEach(ok);
      assert.equal(results.filter(row => !row.data.replayed).length, 1); const revoked = results[0].data;
      assert.equal(revoked.status, 'REVOKED'); assert.equal(revoked.certificateNumber, current.certificateNumber); assert.equal(revoked.issuedAt, current.issuedAt);
      assert.ok(revoked.history.some(event => event.action === 'training.certificate_revoked' && event.previousDecision.status === 'APPROVED'));
      assert.equal(revoked.externalCertification.status, 'NOT_CONNECTED'); assert.equal(revoked.canRequestReconsideration, false);
      await noEffects(() => call(f.participant, '/training/certificates/' + revoked.id + '/reconsideration', 'POST', command(revoked)), 409);
      await noEffects(() => decide(revoked), 409); assert.equal(await certificates.readCertificationSource(f.reviewer.id, revoked.id), null);
    });
    await check('real D01 revocation during and before adapter dispatch invalidates the receipt and prevents a later driver call', async () => {
      const course = await completed('ADAPTER_D01'), certificate = ok(await decide(ok(await recommend(course)))), source = await certificates.readCertificationSource(f.reviewer.id, certificate.id);
      const input = requestFor(source); let dispatches = 0;
      const during = await runTrainingCertificationAdapter(input, { actorAccountId: f.reviewer.id,
        readCurrentSource: () => certificates.readCertificationSource(f.reviewer.id, certificate.id), store: testStore(),
        driver: { kind: 'SYNTHETIC', exchange: async request => { dispatches++; await f.sourceAction(course.policy, 'REVOKE', f.creator); return receipt(request); } } });
      assert.equal(during.status, 'UNKNOWN'); assert.equal(during.code, 'SOURCE_CHANGED'); assert.equal(dispatches, 1);
      const result = await runTrainingCertificationAdapter(input, { actorAccountId: f.reviewer.id,
        readCurrentSource: () => certificates.readCertificationSource(f.reviewer.id, certificate.id), store: testStore(),
        driver: { kind: 'SYNTHETIC', exchange: async request => { dispatches++; return receipt(request); } } });
      assert.equal(dispatches, 1); assert.equal(result.status, 'UNKNOWN'); assert.equal(result.code, 'SOURCE_CHANGED');
    });
    assert.equal(f.externalAttempts.length, 0); assert.equal(await db.financeEntry.count(), 0);
    const evidence = { scope: 'SYNTHETIC_HTTP_POSTGRESQL_D02', passed: checks.length, failed: 0, skipped: 0,
      runtime: process.version, postgresVersion: (await db.$queryRaw`SHOW server_version`)[0].server_version,
      nativeCourses: courses.length, originalTrainingCompletion: true, originalD01ConsentAndSources: true,
      nativeConsentRenewedAfterProgramBinding: true, originalAuditAppendOnly: true,
      readOnlyProjections: true, externalHttpRequests: f.externalAttempts.length, realAgencyAcceptance: false,
      officialIssuance: false, externalCertification: 'NOT_CONNECTED', checks };
    if (process.env.D02_CERTIFICATION_EVIDENCE_FILE) await writeFile(process.env.D02_CERTIFICATION_EVIDENCE_FILE, JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify(evidence, null, 2));
  } finally { await f.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
