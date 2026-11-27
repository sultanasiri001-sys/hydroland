// Actual Nest routes, sessions, source PDFs and PostgreSQL evidence. Every actor
// and document is synthetic; passing this script is not a clinical decision or a
// real guardian/participant signature, and creates no production policy.
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { mkdirSync, writeFileSync } = require('node:fs');
const { dirname } = require('node:path');
const { participationFixture, hash } = require('./d01-participation-fixture.cjs');

(async () => {
  const startedAt = new Date().toISOString(), checks = [];
  let f, success = false, retained;
  const test = async (name, work) => {
    const at = Date.now();
    try { await work(); checks.push({ name, status: 'PASS', durationMs: Date.now() - at }); console.log('D01 PASS ' + name); }
    catch (error) { checks.push({ name, status: 'FAIL', durationMs: Date.now() - at, message: error.message }); throw error; }
  };
  try {
    f = await participationFixture();
    const { db, call, ok, denied, creator, approver, signer, reviewer, participant, guardian, outsider, viewer, centerOwner, center,
      dates, bookingSubject, trainingSubject, policyTerms, identityTerms, evidenceTerms, sourceInput, createSource, signedSource,
      sourceEnvelope, sourceAction, readCase, caseEnvelope, caseAction, createCase, changed, noEffects } = f;
    const readSource = async (source, actor = reviewer) => ok(await call(actor, '/participation/sources/' + source.id));
    const stored = value => db.participationCase.findUniqueOrThrow({ where: { id: value.id } });
    const sign = async (value, actor = participant) => {
      const state = (await stored(value)).state;
      const consentHash = hash({ schemaVersion: 1, subjectType: state.subjectType, subjectId: state.subjectId, organizationId: state.organizationId,
        service: state.service, subjectFingerprint: state.subjectFingerprint, policy: state.policy, identity: state.identity,
        participant: state.participant, guardian: state.guardian, guardianActor: state.guardianActor });
      assert.equal(value.consentHash, consentHash, 'The visible wording digest must match independently reconstructed source binding');
      return caseAction(value, 'SIGN_CONSENT', actor, { consent: true, signedName: actor.person.firstName + ' ' + actor.person.lastName, consentHash });
    };
    const review = (value, actor = reviewer, decision = 'ELIGIBLE') => caseAction(value, 'REVIEW', actor, {
      decision, reviewed: true, reason: 'Synthetic independent evidence review for this service; no medical judgement is made by the test.',
    });
    const setup = async ({ subject = null, policy = {}, identity = {} } = {}) => {
      subject = subject || await bookingSubject();
      const policySource = await signedSource('POLICY', policyTerms(subject, policy));
      const identitySource = await signedSource('IDENTITY', identityTerms(subject, identity));
      const value = await createCase(subject, policySource, identitySource);
      return { subject, policy: policySource, identity: identitySource, value };
    };
    let source, sourceSubject, adult, minor, medical, training, withdrawCase, genericBefore, operationalCandidate;

    await test('anonymous and ordinary organization members cannot create private sources or enumerate participant workspace', async () => {
      denied(await call(null, '/participation/workspace'), 401);
      sourceSubject = await bookingSubject();
      const input = sourceInput('POLICY', policyTerms(sourceSubject));
      await noEffects(() => call(null, '/participation/sources', 'POST', input), 401);
      await noEffects(() => call(viewer, '/participation/sources', 'POST', input), [403, 404]);
      await noEffects(() => call(outsider, '/participation/sources', 'POST', input), [403, 404]);
      const workspace = ok(await call(participant, '/participation/workspace'));
      assert.ok(!JSON.stringify(workspace).includes('synthetic-private-policy.pdf'));
      genericBefore = {};
      for (const route of ['list', 'inventory', 'templates']) {
        const value = ok(await call(viewer, '/documents/organizations/' + center.id + '/' + route));
        if (route === 'inventory') delete value.observedAt;
        genericBefore[route] = value;
      }
    });

    await test('source validation rejects unknown applicability, forged content, invalid dates and cross-operator subjects before persistence', async () => {
      const valid = sourceInput('POLICY', policyTerms(sourceSubject));
      for (const input of [
        { ...valid, privileged: true },
        { ...valid, payload: { ...valid.payload, medicalRequirement: 'OPTIONAL' } },
        { ...valid, payload: { ...valid.payload, minimumAge: -1 } },
        { ...valid, payload: { ...valid.payload, validUntil: '2026-02-30T00:00:00Z' } },
        { ...valid, payload: { ...valid.payload, sourceClause: '' } },
        { ...valid, attachment: { ...valid.attachment, base64: Buffer.from('%PDF-not-a-real-document').toString('base64') } },
        { ...valid, attachment: { ...valid.attachment, filename: '../private.pdf' } },
        { ...valid, attachment: { ...valid.attachment, mimeType: 'text/html' } },
      ]) await noEffects(() => call(creator, '/participation/sources', 'POST', input), 400);
      await noEffects(() => call(creator, '/participation/sources', 'POST', { ...valid, organizationId: f.foreign.id }), 409);
    });

    await test('native source creation retains one original PDF, one revision and an idempotent audited identity', async () => {
      const input = sourceInput('POLICY', policyTerms(sourceSubject));
      source = ok(await call(creator, '/participation/sources', 'POST', input));
      assert.equal(source.status, 'DRAFT'); assert.equal(source.version, 1); assert.equal(source.administrativeVerificationOnly, true);
      assert.match(source.hash, /^[a-f0-9]{64}$/); assert.equal(source.attachments.length, 1);
      const file = await db.managedDocumentAttachment.findUniqueOrThrow({ where: { id: source.attachments[0].id } });
      assert.equal(Buffer.compare(Buffer.from(file.content), f.pdfBytes), 0);
      assert.equal(file.sha256, createHash('sha256').update(f.pdfBytes).digest('hex'));
      assert.equal(await db.documentRevision.count({ where: { documentId: source.id } }), 1);
      const replay = ok(await call(creator, '/participation/sources', 'POST', input));
      assert.equal(replay.id, source.id); assert.equal(replay.command.alreadyApplied, true);
      await noEffects(() => call(creator, '/participation/sources', 'POST', { ...input, title: 'different source content' }), 409);
      assert.equal(await db.auditEvent.count({ where: { resourceId: source.id, action: 'PARTICIPATION_SOURCE_CREATED' } }), 1);
    });

    await test('source preparation, independent approval and administrative signature are separate and cannot be self-assigned', async () => {
      await noEffects(() => call(signer, '/participation/sources/' + source.id + '/actions', 'POST', sourceEnvelope(source, 'SIGN')), 403);
      source = await sourceAction(source, 'SUBMIT', creator);
      await noEffects(() => call(creator, '/participation/sources/' + source.id + '/actions', 'POST', sourceEnvelope(source, 'APPROVE')), 403);
      const input = sourceEnvelope(source, 'APPROVE');
      const race = await Promise.all([call(approver, '/participation/sources/' + source.id + '/actions', 'POST', input), call(approver, '/participation/sources/' + source.id + '/actions', 'POST', input)]);
      assert.ok(race.every(r => r.status === 201), JSON.stringify(race));
      assert.equal(race.filter(r => r.data.command.alreadyApplied).length, 1);
      source = await readSource(source);
      assert.equal(source.status, 'APPROVED');
      await noEffects(() => call(approver, '/participation/sources/' + source.id + '/actions', 'POST', sourceEnvelope(source, 'SIGN')), 403);
      source = await sourceAction(source, 'SIGN', signer);
      assert.equal(source.status, 'SIGNED');
      assert.equal(await db.documentLifecycleEvent.count({ where: { documentId: source.id, action: 'APPROVED' } }), 1);
      assert.equal(await db.participationCase.count(), 0, 'An administrative signature must not create participant consent or eligibility');
    });

    await test('private sources deny known IDs to unrelated participants and organization viewers', async () => {
      for (const actor of [outsider, participant, viewer]) {
        denied(await call(actor, '/participation/sources/' + source.id), 404);
        denied(await call(actor, '/participation/sources/' + source.id + '/attachments/' + source.attachments[0].id), 404);
      }
      const allowed = await call(reviewer, '/participation/sources/' + source.id + '/attachments/' + source.attachments[0].id);
      assert.equal(allowed.status, 200); assert.ok(allowed.data.startsWith('%PDF-'));
      assert.match(allowed.headers['cache-control'] || '', /no-store/);
    });

    await test('self-reported FIT and a verified diving credential cannot supply source consent or grant eligibility', async () => {
      ok(await call(participant, '/me/diver-profile', 'PATCH', { medicalFitnessStatus: 'FIT', medicalClearanceExpiresAt: dates.validUntil.slice(0, 10) }));
      await db.credential.create({ data: { personId: participant.person.id, issuer: 'SYNTHETIC-D01', title: 'Synthetic verified diving credential', issuedAt: new Date(), verificationStatus: 'VERIFIED' } });
      adult = await setup();
      assert.equal(adult.value.status, 'ACTION_REQUIRED');
      const state = await stored(adult.value);
      assert.equal(state.state.consent, null); assert.equal(state.state.review, null);
      assert.equal((await db.bookingParticipant.findUniqueOrThrow({ where: { id: adult.subject.subjectId } })).eligibilityStatus, 'PENDING');
      await noEffects(() => call(reviewer, '/participation/cases/' + adult.value.id + '/actions', 'POST', caseEnvelope(adult.value, 'REVIEW', { decision: 'ELIGIBLE', reviewed: true, reason: 'Self-report alone must never suffice.' })), 409);
    });

    await test('actual adult account signs the exact service and source version while administrators and other users cannot substitute', async () => {
      for (const actor of [creator, reviewer, outsider, guardian]) {
        await noEffects(() => call(actor, '/participation/cases/' + adult.value.id + '/actions', 'POST', caseEnvelope(adult.value, 'SIGN_CONSENT', { consent: true, signedName: actor.person.firstName + ' ' + actor.person.lastName, consentHash: 'a'.repeat(64) })), [403, 404, 409]);
      }
      await noEffects(() => call(participant, '/participation/cases/' + adult.value.id + '/actions', 'POST', caseEnvelope(adult.value, 'SIGN_CONSENT', { consent: true, signedName: participant.person.firstName + ' ' + participant.person.lastName, consentHash: 'a'.repeat(64) })), 400);
      adult.value = await sign(adult.value);
      const state = (await stored(adult.value)).state;
      assert.equal(state.consent.actorAccountId, participant.id); assert.equal(state.consent.actorPersonId, participant.person.id);
      assert.equal(state.consent.role, 'PARTICIPANT'); assert.equal(state.review, null);
      assert.equal(state.service.id, adult.subject.trip.id); assert.equal(state.policy.id, adult.policy.id); assert.equal(state.identity.id, adult.identity.id);
      assert.equal(await db.organizationMember.count({ where: { accountId: participant.id } }), 0);
    });

    await test('separate review persists source-bound eligibility and no self-review is possible even after role elevation', async () => {
      const elevated = await db.roleAssignment.create({ data: { accountId: participant.id, role: 'ADMIN', status: 'ACTIVE' } });
      try { await noEffects(() => call(participant, '/participation/cases/' + adult.value.id + '/actions', 'POST', caseEnvelope(adult.value, 'REVIEW', { decision: 'ELIGIBLE', reviewed: true, reason: 'Reject participant self-review even with ADMIN.' })), [403, 409]); }
      finally { await db.roleAssignment.delete({ where: { id: elevated.id } }); }
      adult.value = await review(adult.value);
      assert.equal(adult.value.status, 'CLEARED');
      assert.equal(adult.value.readiness.selfDeclarationIsMedicalEvidence, false);
      const state = (await stored(adult.value)).state;
      assert.equal(state.review.decision, 'ELIGIBLE'); assert.equal(state.review.actorAccountId, reviewer.id);
      assert.equal((await db.bookingParticipant.findUniqueOrThrow({ where: { id: adult.subject.subjectId } })).eligibilityStatus, 'ELIGIBLE');
      assert.equal((await db.booking.findUniqueOrThrow({ where: { id: adult.subject.booking.id } })).status, 'PENDING', 'Evidence review does not itself confirm a booking');
      assert.equal((await db.diverProfile.findUniqueOrThrow({ where: { accountId: participant.id } })).medicalFitnessStatus, 'FIT', 'Self declaration and source decision remain separate stores');
    });

    await test('stale revision, digest and different-content request reuse cannot overwrite a reviewed case', async () => {
      const input = caseEnvelope(adult.value, 'REVIEW', { decision: 'REJECTED', reviewed: true, reason: 'Synthetic change under optimistic concurrency.' });
      await noEffects(() => call(reviewer, '/participation/cases/' + adult.value.id + '/actions', 'POST', { ...input, expectedRevision: adult.value.revision - 1 }), 409);
      await noEffects(() => call(reviewer, '/participation/cases/' + adult.value.id + '/actions', 'POST', { ...input, expectedDigest: 'a'.repeat(64) }), 409);
    });

    await test('one independent review wins concurrent conflicting decisions and each committed revision has one immutable event', async () => {
      const candidate = await setup(); candidate.value = await sign(candidate.value);
      const payload = { reviewed: true, reason: 'Conflicting concurrent synthetic review requests.' };
      const results = await Promise.all(['ELIGIBLE', 'REJECTED'].map(decision => call(reviewer, '/participation/cases/' + candidate.value.id + '/actions', 'POST', caseEnvelope(candidate.value, 'REVIEW', { ...payload, decision }))));
      assert.equal(results.filter(r => r.status === 201).length, 1, JSON.stringify(results));
      assert.equal(results.filter(r => r.status === 409).length, 1, JSON.stringify(results));
      const row = await stored(candidate.value);
      assert.equal(await db.participationEvent.count({ where: { caseId: row.id } }), row.revision);
    });

    await test('a minor companion with no account needs a current guardian source and the guardian actual account consent', async () => {
      const subject = await bookingSubject({ account: null, booker: participant });
      minor = await setup({ subject, identity: { dateOfBirth: '2012-01-01' } });
      await noEffects(() => call(participant, '/participation/cases/' + minor.value.id + '/actions', 'POST', caseEnvelope(minor.value, 'SIGN_CONSENT', { consent: true, signedName: participant.person.firstName + ' ' + participant.person.lastName, consentHash: 'a'.repeat(64) })), [403, 404, 409]);
      minor.guardian = await signedSource('GUARDIAN', evidenceTerms(subject, minor.identity, 'GUARDIAN'));
      minor.value = await caseAction(minor.value, 'LINK_EVIDENCE', reviewer, { kind: 'GUARDIAN', documentId: minor.guardian.id });
      minor.value = await sign(minor.value, guardian);
      minor.value = await review(minor.value);
      assert.equal(minor.value.status, 'CLEARED');
      const state = (await stored(minor.value)).state;
      assert.equal(state.participant.accountId, null); assert.equal(state.guardianActor.accountId, guardian.id); assert.equal(state.consent.role, 'GUARDIAN');
      assert.equal(state.consent.actorAccountId, guardian.id); assert.equal(state.review.decision, 'ELIGIBLE');
      assert.equal(await db.organizationMember.count({ where: { accountId: guardian.id } }), 0);
      denied(await call(participant, '/participation/cases/' + minor.value.id), 404, 'Booking owner is not the guardian merely by adding a companion');
    });

    await test('required medical evidence is per activity and cannot be replaced by self-report or administrative consent', async () => {
      medical = await setup({ policy: { medicalRequirement: 'REQUIRED' } });
      medical.value = await sign(medical.value);
      await noEffects(() => call(reviewer, '/participation/cases/' + medical.value.id + '/actions', 'POST', caseEnvelope(medical.value, 'REVIEW', { decision: 'ELIGIBLE', reviewed: true, reason: 'Required original medical evidence has not been linked.' })), 409);
      medical.source = await signedSource('MEDICAL', evidenceTerms(medical.subject, medical.identity, 'MEDICAL'));
      medical.value = await caseAction(medical.value, 'LINK_EVIDENCE', reviewer, { kind: 'MEDICAL', documentId: medical.source.id });
      medical.value = await review(medical.value);
      assert.equal(medical.value.status, 'CLEARED');
      assert.equal((await stored(medical.value)).state.medical.id, medical.source.id);
      assert.equal((await stored(medical.value)).state.review.decision, 'ELIGIBLE');
      assert.equal(medical.source.administrativeVerificationOnly, true);
    });

    await test('evidence bound to another identity, activity or service cannot clear the participant', async () => {
      const other = await setup({ policy: { medicalRequirement: 'REQUIRED' } });
      other.value = await sign(other.value);
      await noEffects(() => call(reviewer, '/participation/cases/' + other.value.id + '/actions', 'POST', caseEnvelope(other.value, 'LINK_EVIDENCE', { kind: 'MEDICAL', documentId: medical.source.id })), [400, 409]);
      const wrong = await signedSource('MEDICAL', evidenceTerms(other.subject, other.identity, 'MEDICAL', { activityCode: 'A_DIFFERENT_ACTIVITY' }));
      other.value = await caseAction(other.value, 'LINK_EVIDENCE', reviewer, { kind: 'MEDICAL', documentId: wrong.id });
      assert.equal(other.value.status, 'ACTION_REQUIRED');
      assert.ok(other.value.readiness.reasons.includes('PARTICIPATION_MEDICAL_NOT_APPLICABLE'));
      await noEffects(() => call(reviewer, '/participation/cases/' + other.value.id + '/actions', 'POST', caseEnvelope(other.value, 'REVIEW', { decision: 'ELIGIBLE', reviewed: true, reason: 'Medical source for a different activity cannot clear this participant.' })), 409);
    });

    await test('generic document lists, counts, templates, direct reads, revisions, attachments and prints cannot disclose any private source kind', async () => {
      for (const route of ['list', 'inventory', 'templates']) {
        const value = ok(await call(viewer, '/documents/organizations/' + center.id + '/' + route));
        if (route === 'inventory') delete value.observedAt;
        assert.deepEqual(value, genericBefore[route], 'Private sources changed generic ' + route);
      }
      for (const privateSource of [adult.policy, adult.identity, minor.guardian, medical.source]) {
        const native = await db.managedDocument.findUniqueOrThrow({ where: { id: privateSource.id }, include: { template: true } });
        const id = native.id, templateId = native.templateId;
        const paths = [
          '/documents/' + id, '/documents/' + id + '/revisions', '/documents/' + id + '/revisions/1',
          '/documents/' + id + '/attachments', '/documents/' + id + '/attachments/' + privateSource.attachments[0].id,
          '/documents/' + id + '/print-contract', '/documents/' + id + '/pdf',
          '/documents/organizations/' + center.id + '/documents/' + id + '/workflow-readiness',
          '/documents/organizations/' + center.id + '/templates/' + native.template.code + '/history',
        ];
        for (const actor of [viewer, centerOwner]) for (const path of paths) denied(await call(actor, path), [403, 404]);
        denied(await call(centerOwner, '/documents/organizations/' + center.id + '/templates/' + templateId + '/preview-pdf', 'POST', {}), [403, 404]);
        for (const action of ['submit', 'approve', 'sign', 'archive']) await noEffects(() => call(centerOwner, '/documents/' + id + '/' + action, 'POST', {}), [403, 404]);
        await noEffects(() => call(centerOwner, '/documents/' + id + '/attachments', 'POST', {
          filename: 'extra-original.pdf', mimeType: 'application/pdf', base64: f.pdfBytes.toString('base64'),
        }), [403, 404]);
        await noEffects(() => call(centerOwner, '/documents/templates/' + templateId, 'PUT', {
          titleAr: native.template.titleAr, titleEn: native.template.titleEn, fields: native.template.fields, printable: false,
        }), [403, 404]);
      }
    });

    await test('internal platform source audit, owner approval and reviewer assignment cannot expose or approve private policy sources', async () => {
      const catalog = f.load('hr/staffing-catalog.js');
      const internal = await db.organization.create({ data: {
        ownerId: creator.id, kind: catalog.PLATFORM_STAFFING_KIND, status: 'ACTIVE', displayName: 'Synthetic internal D01',
        legalName: 'Synthetic internal D01', registrationNumber: 'SYNTHETIC-INTERNAL-' + randomUUID(), address: 'Disposable database',
      } });
      await db.organizationMember.create({ data: { organizationId: internal.id, accountId: creator.id, role: 'OWNER', status: 'ACTIVE' } });
      await db.operationalSetting.create({ data: { key: catalog.PLATFORM_STAFFING_KEY, value: { organizationId: internal.id } } });
      const subject = await bookingSubject({ organizationId: internal.id });
      const privateSource = await signedSource('POLICY', policyTerms(subject), { organizationId: internal.id });
      const audit = ok(await call(creator, '/documents/organizations/' + internal.id + '/platform-source-audit'));
      assert.ok(!JSON.stringify(audit).includes(privateSource.id));
      assert.ok(!JSON.stringify(audit).includes('D01-POLICY'));
      for (const path of [
        '/documents/organizations/' + internal.id + '/documents/' + privateSource.id + '/owner-approval',
        '/documents/organizations/' + internal.id + '/documents/' + privateSource.id + '/owner-decision',
        '/document-reviews/organizations/' + internal.id + '/documents/' + privateSource.id + '/assignment',
        '/documents/' + privateSource.id + '/identity-pdf',
      ]) denied(await call(creator, path), [403, 404]);
      const documents = ok(await call(creator, '/admin/department-references/SAFETY_COMPLIANCE_RISK/assessment/documents?query=' + encodeURIComponent(privateSource.referenceNumber)));
      assert.ok(!JSON.stringify(documents).includes(privateSource.id));
    });

    await test('an expired original source and a negative medical outcome never clear an otherwise signed case', async () => {
      const candidate = await setup({ policy: { medicalRequirement: 'REQUIRED' } }); candidate.value = await sign(candidate.value);
      for (const extra of [
        { validUntil: new Date(Date.now() - 3600000).toISOString() },
        { validUntil: new Date(Date.parse(dates.startsAt) - 1000).toISOString() },
        { outcome: 'NOT_CLEARED' }, { outcome: 'REQUIRES_REVIEW' },
      ]) {
        const evidence = await signedSource('MEDICAL', evidenceTerms(candidate.subject, candidate.identity, 'MEDICAL', extra));
        const response = await call(reviewer, '/participation/cases/' + candidate.value.id + '/actions', 'POST', caseEnvelope(candidate.value, 'LINK_EVIDENCE', { kind: 'MEDICAL', documentId: evidence.id }));
        if (response.status === 201) candidate.value = response.data;
        else denied(response, [400, 409]);
        await noEffects(() => call(reviewer, '/participation/cases/' + candidate.value.id + '/actions', 'POST', caseEnvelope(candidate.value, 'REVIEW', { decision: 'ELIGIBLE', reviewed: true, reason: 'Expired or negative medical evidence must block.' })), [403, 409]);
        assert.notEqual((await db.bookingParticipant.findUniqueOrThrow({ where: { id: candidate.subject.subjectId } })).eligibilityStatus, 'ELIGIBLE');
      }
    });

    await test('booking confirmation rechecks native source readiness and preserves scoped policy behavior without bypassing an adopted requirement', async () => {
      const candidate = await setup(); candidate.value = await sign(candidate.value); candidate.value = await review(candidate.value);
      const tripId = candidate.subject.trip.id, bookingId = candidate.subject.booking.id;
      await db.operationalSetting.upsert({ where: { key: 'WEATHER_GATE' }, create: { key: 'WEATHER_GATE', value: { enabled: false, mode: 'ENFORCE', provider: 'STORMGLASS' } }, update: { value: { enabled: false, mode: 'ENFORCE', provider: 'STORMGLASS' } } });
      await db.operationalSetting.create({ data: { key: 'trip-price:' + tripId, value: { pricePerSeatMinor: 0, currency: 'SAR' } } });
      await db.safetyChecklist.create({ data: { tripId, decision: 'ALLOWED', decidedAt: new Date(), items: { synthetic: true } } });
      const before = ok(await call(centerOwner, '/center/me/bookings/' + bookingId));
      assert.ok(before.actions.includes('CONFIRM'), JSON.stringify(before.blockers));
      assert.equal(before.participation[0].status, 'CLEARED');
      const confirm = { action: 'CONFIRM', requestId: randomUUID(), expectedState: before.stateToken, reason: 'Synthetic source-aware confirmation.' };
      candidate.value = await caseAction(candidate.value, 'WITHDRAW_CONSENT', participant, { reason: 'Synthetic participant withdraws after the preview.' });
      denied(await call(centerOwner, '/center/me/bookings/' + bookingId + '/actions', 'POST', confirm), 409);
      let fresh = ok(await call(centerOwner, '/center/me/bookings/' + bookingId));
      assert.ok(!fresh.actions.includes('CONFIRM')); assert.ok(fresh.blockers.includes('PARTICIPATION_CONSENT_WITHDRAWN'));
      const control = await db.policyControl.create({ data: { category: 'BOOKING', ruleKey: 'PARTICIPANT_ELIGIBILITY', state: 'DISABLED', labelAr: 'إعداد اختبار اصطناعي معزول' } });
      try {
        fresh = ok(await call(centerOwner, '/center/me/bookings/' + bookingId));
        assert.equal(fresh.policyReview.states.participant, 'DISABLED');
        assert.ok(fresh.blockers.includes('PARTICIPATION_CONSENT_WITHDRAWN'));
        denied(await call(centerOwner, '/center/me/bookings/' + bookingId + '/actions', 'POST', { ...confirm, requestId: randomUUID(), expectedState: fresh.stateToken }), 409);
        denied(await call(reviewer, '/trips/admin/' + tripId + '/bookings/' + bookingId + '/confirm', 'PATCH', {}), 409);
        assert.equal((await db.booking.findUniqueOrThrow({ where: { id: bookingId } })).status, 'PENDING');
      } finally { await db.policyControl.delete({ where: { id: control.id } }); }
      const positive = await setup(); positive.value = await sign(positive.value); positive.value = await review(positive.value);
      await db.operationalSetting.create({ data: { key: 'trip-price:' + positive.subject.trip.id, value: { pricePerSeatMinor: 0, currency: 'SAR' } } });
      await db.safetyChecklist.create({ data: { tripId: positive.subject.trip.id, decision: 'ALLOWED', decidedAt: new Date(), items: { synthetic: true } } });
      const preview = ok(await call(centerOwner, '/center/me/bookings/' + positive.subject.booking.id));
      assert.deepEqual(preview.blockers, []);
      ok(await call(centerOwner, '/center/me/bookings/' + positive.subject.booking.id + '/actions', 'POST', { ...confirm, requestId: randomUUID(), expectedState: preview.stateToken }));
      assert.equal((await db.booking.findUniqueOrThrow({ where: { id: positive.subject.booking.id } })).status, 'CONFIRMED');
      assert.equal(await db.payment.count({ where: { bookingId: positive.subject.booking.id } }), 0, 'Explicit free synthetic confirmation creates no financial transaction');
      operationalCandidate = positive;
    });

    await test('a revoked source reviewer makes the operational display stale immediately and the scanner revokes the original grant once', async () => {
      const tripId = operationalCandidate.subject.trip.id;
      const controls = [];
      try {
        for (const [category, ruleKey] of [['TRIP', 'RESOURCE_READINESS'], ['CREW', 'RESPONSE_REQUIRED']]) {
          controls.push(await db.policyControl.create({ data: { category, ruleKey, state: 'DISABLED', labelAr: 'إعداد اختبار اصطناعي معزول' } }));
        }
        ok(await call(reviewer, '/trips/admin/compliance/' + tripId, 'PATCH', {
          regulatoryStatus: 'APPROVED', permitStatus: 'APPROVED', notes: 'Synthetic fixture only, not a real regulatory approval.',
        }));
        const grant = ok(await call(reviewer, '/trips/admin/' + tripId + '/operational-clearance', 'POST', {
          reason: 'Synthetic native clearance used only to exercise current source authority.',
        }));
        assert.equal(grant.clearance, 'GRANTED');
        const visible = async () => ok(await call(reviewer, '/trips/admin')).find(row => row.id === tripId).operationalClearance;
        assert.equal((await visible()).status, 'ACTIVE');
        const original = await db.auditEvent.findUniqueOrThrow({ where: { id: grant.auditEventId } });
        const countBeforeRead = await db.auditEvent.count({ where: { resource: 'Trip', resourceId: tripId } });
        await changed('roleAssignment', { id: approver.assignment.id }, { status: 'SUSPENDED' }, async () => {
          assert.equal((await visible()).status, 'STALE');
          assert.equal(await db.auditEvent.count({ where: { resource: 'Trip', resourceId: tripId } }), countBeforeRead,
            'An administrative display must evaluate current authority without writing a revocation');
          const clearance = f.app.get(f.load('trips/operational-clearance.service.js').OperationalClearanceService);
          const first = await clearance.revokeIfStale(tripId);
          assert.equal(first.revoked, true); assert.equal(first.previousClearanceEventId, grant.auditEventId);
          assert.equal((await clearance.revokeIfStale(tripId)).revoked, false);
          assert.equal((await visible()).status, 'REVOKED');
          assert.equal(await db.auditEvent.count({ where: { resource: 'Trip', resourceId: tripId, action: 'OPERATIONAL_CLEARANCE_REVOKED' } }), 1);
          denied(await call(reviewer, '/trips/admin/' + tripId + '/operational-clearance', 'POST', {
            reason: 'A new grant cannot bypass an invalidated independent source reviewer.',
          }), 409);
        });
        assert.deepEqual(await db.auditEvent.findUniqueOrThrow({ where: { id: original.id } }), original);
      } finally {
        for (const control of controls) await db.policyControl.delete({ where: { id: control.id } });
      }
    });

    await test('participant withdrawal atomically removes native eligibility, preserves the signed history and is idempotent', async () => {
      withdrawCase = await setup(); withdrawCase.value = await sign(withdrawCase.value); withdrawCase.value = await review(withdrawCase.value);
      const before = await stored(withdrawCase.value), bookingBefore = await db.booking.findUniqueOrThrow({ where: { id: withdrawCase.subject.booking.id } });
      const input = caseEnvelope(withdrawCase.value, 'WITHDRAW_CONSENT', { reason: 'The synthetic participant withdraws personal consent.' });
      const first = ok(await call(participant, '/participation/cases/' + withdrawCase.value.id + '/actions', 'POST', input));
      assert.equal(first.status, 'ACTION_REQUIRED'); assert.equal(first.readiness.hardBlocked, true);
      const replay = ok(await call(participant, '/participation/cases/' + withdrawCase.value.id + '/actions', 'POST', input));
      assert.equal(replay.command.alreadyApplied, true); assert.equal(replay.revision, first.revision);
      const after = await stored(first); assert.ok(after.state.consent.withdrawnAt);
      assert.equal(after.state.consent.eventId, before.state.consent.eventId);
      const historical = await db.participationEvent.findUniqueOrThrow({ where: { id: before.state.consent.eventId } });
      assert.equal(historical.payload.state.consent.withdrawnAt, null);
      assert.notEqual((await db.bookingParticipant.findUniqueOrThrow({ where: { id: withdrawCase.subject.subjectId } })).eligibilityStatus, 'ELIGIBLE');
      assert.ok((await db.booking.findUniqueOrThrow({ where: { id: withdrawCase.subject.booking.id } })).updatedAt > bookingBefore.updatedAt);
      await noEffects(() => call(participant, '/participation/cases/' + first.id + '/actions', 'POST', { ...input, payload: { reason: 'Different content with same request ID.' } }), 409);
      withdrawCase.value = first;
    });

    await test('administrative policy replacement cannot erase personal withdrawal even when the new policy says consent not applicable', async () => {
      const policy = await signedSource('POLICY', policyTerms(withdrawCase.subject, { consentRequirement: 'NOT_APPLICABLE', sourceVersion: 'synthetic-replacement-2' }));
      const before = await stored(withdrawCase.value);
      const response = await call(reviewer, '/participation/cases/' + withdrawCase.value.id + '/actions', 'POST', caseEnvelope(withdrawCase.value, 'REPLACE_SOURCES', {
        policyDocumentId: policy.id, identityDocumentId: withdrawCase.identity.id, reason: 'Policy change must preserve the participant withdrawal.',
      }));
      if (response.status === 201) withdrawCase.value = response.data;
      else denied(response, [403, 409]);
      const after = await stored(withdrawCase.value);
      assert.equal(after.state.consent.withdrawnAt, before.state.consent.withdrawnAt);
      const correctedIdentity = await signedSource('IDENTITY', identityTerms(withdrawCase.subject, {
        dateOfBirth: '1991-01-01', sourceReference: 'SYNTHETIC-SAME-PERSON-IDENTITY-CORRECTION',
      }));
      withdrawCase.value = await caseAction(withdrawCase.value, 'REPLACE_SOURCES', reviewer, {
        policyDocumentId: policy.id, identityDocumentId: correctedIdentity.id,
        reason: 'Correcting the same account identity does not create a different person or erase their withdrawal.',
      });
      const corrected = await stored(withdrawCase.value);
      assert.equal(corrected.state.participant.accountId, before.state.participant.accountId);
      assert.equal(corrected.state.participant.personId, before.state.participant.personId);
      assert.equal(corrected.state.consent.withdrawnAt, before.state.consent.withdrawnAt);
      assert.equal(corrected.state.consent.eventId, before.state.consent.eventId);
      assert.equal(withdrawCase.value.resumeReasonRequired, true);
      await noEffects(() => call(reviewer, '/participation/cases/' + withdrawCase.value.id + '/actions', 'POST', caseEnvelope(withdrawCase.value, 'REVIEW', { decision: 'ELIGIBLE', reviewed: true, reason: 'A policy toggle cannot waive an explicit withdrawal.' })), [403, 409]);
    });

    await test('source revocation invalidates every bound decision while preserving original PDF and signature history', async () => {
      const before = await stored(medical.value), eventsBefore = await db.participationEvent.count({ where: { caseId: medical.value.id } });
      medical.source = await sourceAction(medical.source, 'REVOKE', reviewer);
      assert.equal(medical.source.revoked, true); assert.equal(medical.source.status, 'ARCHIVED');
      const after = await stored(medical.value);
      const visible = await readCase(medical.value); assert.equal(visible.status, 'ACTION_REQUIRED'); assert.equal(visible.readiness.hardBlocked, true);
      assert.ok(after.state.revokedAt); assert.equal(after.state.review, null);
      assert.equal(after.state.consent.eventId, before.state.consent.eventId);
      assert.equal(await db.participationEvent.count({ where: { caseId: medical.value.id } }), eventsBefore + 1);
      assert.equal(await db.participationEvent.count({ where: { caseId: medical.value.id, action: 'SOURCE_REVOKED' } }), 1);
      assert.equal(await db.managedDocumentAttachment.count({ where: { documentId: medical.source.id } }), 1);
      assert.notEqual((await db.bookingParticipant.findUniqueOrThrow({ where: { id: medical.subject.subjectId } })).eligibilityStatus, 'ELIGIBLE');
    });

    await test('a revoked guardian source immediately removes the former guardian access to private case and attachments', async () => {
      minor.guardian = await sourceAction(minor.guardian, 'REVOKE', reviewer);
      denied(await call(guardian, '/participation/cases/' + minor.value.id), [403, 404]);
      denied(await call(guardian, '/participation/sources/' + minor.identity.id), [403, 404]);
      denied(await call(guardian, '/participation/sources/' + minor.identity.id + '/attachments/' + minor.identity.attachments[0].id), [403, 404]);
      assert.notEqual((await db.bookingParticipant.findUniqueOrThrow({ where: { id: minor.subject.subjectId } })).eligibilityStatus, 'ELIGIBLE');
    });

    await test('replacing a guest with another actual person does not transfer private evidence or earlier signatures', async () => {
      const firstName = participant.person.firstName + ' ' + participant.person.lastName;
      const replacementName = outsider.person.firstName + ' ' + outsider.person.lastName;
      const subject = await bookingSubject({ account: null, fullName: firstName });
      const candidate = await setup({ subject, policy: { medicalRequirement: 'REQUIRED' }, identity: { participantAccountId: participant.id } });
      const previousMedical = await signedSource('MEDICAL', evidenceTerms(subject, candidate.identity, 'MEDICAL'));
      const previousGuardian = await signedSource('GUARDIAN', evidenceTerms(subject, candidate.identity, 'GUARDIAN'));
      candidate.value = await caseAction(candidate.value, 'LINK_EVIDENCE', reviewer, { kind: 'MEDICAL', documentId: previousMedical.id });
      candidate.value = await caseAction(candidate.value, 'LINK_EVIDENCE', reviewer, { kind: 'GUARDIAN', documentId: previousGuardian.id });
      candidate.value = await sign(candidate.value); candidate.value = await review(candidate.value);
      assert.equal(candidate.value.status, 'CLEARED');
      const original = await stored(candidate.value);
      const consentEvent = await db.participationEvent.findUniqueOrThrow({ where: { id: original.state.consent.eventId } });
      ok(await call(participant, '/participation/sources/' + previousMedical.id + '/attachments/' + previousMedical.attachments[0].id));
      denied(await call(outsider, '/participation/cases/' + candidate.value.id), 404);

      // Use the existing booking-owner HTTP route: the original guest has no
      // permanent account FK, so changing the name must not transfer privacy.
      ok(await call(participant, '/trips/bookings/' + subject.booking.id + '/participants/' + subject.subjectId, 'PATCH', { fullName: replacementName }));
      const replacementIdentity = await signedSource('IDENTITY', identityTerms(subject, {
        participantAccountId: outsider.id, fullName: replacementName, sourceReference: 'SYNTHETIC-REPLACEMENT-PERSON',
      }));
      candidate.value = await caseAction(candidate.value, 'REPLACE_SOURCES', reviewer, {
        policyDocumentId: candidate.policy.id, identityDocumentId: replacementIdentity.id,
        reason: 'A different synthetic guest needs their own evidence and personal consent.',
      });
      assert.equal(candidate.value.status, 'ACTION_REQUIRED');
      const after = await stored(candidate.value);
      assert.equal(after.participantAccountId, outsider.id);
      assert.equal(after.medicalDocumentId, null); assert.equal(after.guardianDocumentId, null); assert.equal(after.guardianAccountId, null);
      assert.equal(after.state.consent, null); assert.equal(after.state.review, null);
      const replacementView = await readCase(candidate.value, outsider);
      assert.equal(replacementView.consent, null); assert.equal(replacementView.medical, null); assert.equal(replacementView.guardian, null);
      assert.ok(!replacementView.events.some(event => event.id === consentEvent.id || event.actorPersonId === participant.person.id));
      for (const privateSource of [candidate.identity, previousMedical, previousGuardian]) {
        denied(await call(outsider, '/participation/sources/' + privateSource.id), 404);
        denied(await call(outsider, '/participation/sources/' + privateSource.id + '/attachments/' + privateSource.attachments[0].id), 404);
      }
      denied(await call(guardian, '/participation/cases/' + candidate.value.id), 404);
      assert.deepEqual(await db.participationEvent.findUniqueOrThrow({ where: { id: consentEvent.id } }), consentEvent,
        'Reassignment must preserve the original immutable private evidence for authorized review');
      const reviewerView = await readCase(candidate.value, reviewer);
      assert.ok(reviewerView.events.some(event => event.id === consentEvent.id));

      candidate.value = await sign(candidate.value, outsider);
      await noEffects(() => call(reviewer, '/participation/cases/' + candidate.value.id + '/actions', 'POST', caseEnvelope(candidate.value, 'REVIEW', {
        decision: 'ELIGIBLE', reviewed: true, reason: 'The previous participant medical proof cannot clear this replacement.',
      })), 409);
      const newMedical = await signedSource('MEDICAL', evidenceTerms(subject, replacementIdentity, 'MEDICAL'));
      candidate.value = await caseAction(candidate.value, 'LINK_EVIDENCE', reviewer, { kind: 'MEDICAL', documentId: newMedical.id });
      candidate.value = await review(candidate.value);
      assert.equal(candidate.value.status, 'CLEARED');
      assert.equal((await stored(candidate.value)).state.consent.actorPersonId, outsider.person.id);
    });

    await test('training enrollment uses the same native source, consent and independent review chain without issuing an external certificate', async () => {
      const subject = await trainingSubject(); training = await setup({ subject });
      training.value = await sign(training.value); training.value = await review(training.value);
      assert.equal(training.value.status, 'CLEARED');
      const state = await stored(training.value);
      assert.equal(state.bookingParticipantId, null); assert.equal(state.trainingEnrollmentId, subject.subjectId);
      assert.equal(state.state.service.type, 'TRAINING_ENROLLMENT'); assert.equal(state.state.review.decision, 'ELIGIBLE');
      assert.equal(await db.trainingCertificate.count(), 0);
      assert.equal((await db.trainingEnrollment.findUniqueOrThrow({ where: { id: subject.subjectId } })).status, 'PENDING');
    });

    await test('a current training consent cannot retroactively authorize an earlier activity when the enrollment has no dates', async () => {
      const subject = await trainingSubject();
      await db.trainingEnrollment.update({ where: { id: subject.subjectId }, data: { metadata: { title: 'Synthetic unscheduled D01 course' } } });
      const candidate = await setup({ subject });
      candidate.value = await sign(candidate.value); candidate.value = await review(candidate.value);
      assert.equal(candidate.value.status, 'CLEARED');
      const { participationTrainingGate } = f.load('participation/participation-evaluator.js');
      const signedAt = Date.parse((await stored(candidate.value)).state.consent.signedAt);
      const current = await db.serializable(tx => participationTrainingGate(tx, subject.subjectId, new Date()));
      assert.equal(current.ready, true);
      await assert.rejects(() => db.serializable(tx => participationTrainingGate(tx, subject.subjectId,
        new Date(signedAt - 3600000), new Date(signedAt - 1800000))), error => error?.getStatus?.() === 409
          && error.getResponse().reasons.includes('PARTICIPATION_CONSENT_STALE'));
      const historicalLegacy = await trainingSubject();
      for (const state of ['REVIEW', 'DISABLED']) {
        const control = await db.policyControl.create({ data: { category: 'TRAINING', ruleKey: 'PARTICIPANT_ELIGIBILITY', state,
          labelAr: 'إعداد تاريخي اصطناعي لا يتجاوز مصادر المشاركة المعتمدة' } });
        try {
          const legacy = await db.serializable(tx => participationTrainingGate(tx, historicalLegacy.subjectId));
          assert.equal(legacy.ready, true);
          assert.equal(legacy.cleared, false);
          assert.equal(legacy.issues.length > 0, state === 'REVIEW');
          assert.equal(await db.participationCase.count({ where: { trainingEnrollmentId: historicalLegacy.subjectId } }), 0);
          await assert.rejects(() => db.serializable(tx => participationTrainingGate(tx, subject.subjectId,
            new Date(signedAt - 3600000), new Date(signedAt - 1800000))), error => error?.getStatus?.() === 409
              && error.getResponse().reasons.includes('PARTICIPATION_CONSENT_STALE'));
        } finally { await db.policyControl.delete({ where: { id: control.id } }); }
      }
      assert.equal(await db.trainingCertificate.count(), 0);
    });

    await test('current authority, verified account and active session are rechecked on retained reads and exact action retries', async () => {
      await changed('roleAssignment', { id: reviewer.assignment.id }, { status: 'SUSPENDED' }, async () => {
        denied(await call(reviewer, '/participation/cases/' + adult.value.id), [403, 404]);
      });
      await changed('account', { id: participant.id }, { emailVerifiedAt: null }, async () => denied(await call(participant, '/participation/cases/' + adult.value.id), [401, 403]));
      await changed('session', { id: participant.session.id }, { revokedAt: new Date() }, async () => denied(await call(participant, '/participation/cases/' + adult.value.id), 401));
      await changed('organizationMember', { id: f.ownerMember.id }, { status: 'SUSPENDED' }, async () => denied(await call(centerOwner, '/participation/cases/' + adult.value.id), [403, 404]));
    });

    await test('case state and all event hashes independently verify against the retained native source history', async () => {
      const cases = await db.participationCase.findMany({ orderBy: { id: 'asc' } });
      for (const row of cases) {
        assert.equal(row.digest, hash({ id: row.id, revision: row.revision, state: row.state }));
        const events = await db.participationEvent.findMany({ where: { caseId: row.id }, orderBy: { afterRevision: 'asc' } });
        assert.equal(events.length, row.revision);
        let previous = null;
        for (let i = 0; i < events.length; i++) {
          const event = events[i], { evidenceHash, ...body } = event;
          assert.equal(event.beforeRevision, i); assert.equal(event.afterRevision, i + 1); assert.equal(event.previousDigest, previous);
          assert.equal(evidenceHash, hash(body));
          assert.equal(event.resultDigest, hash({ id: row.id, revision: event.afterRevision, state: event.payload.state }));
          previous = event.resultDigest;
        }
        assert.equal(previous, row.digest);
      }
      const first = cases[0];
      await assert.rejects(() => db.$executeRawUnsafe('UPDATE "ParticipationEvent" SET "action"=\'REVIEW\' WHERE "caseId"=$1', first.id), error => error?.meta?.code === '55000');
      await assert.rejects(() => db.$executeRawUnsafe('DELETE FROM "ParticipationEvent" WHERE "caseId"=$1', first.id), error => error?.meta?.code === '55000');
      await changed('participationCase', { id: first.id }, { digest: 'f'.repeat(64) }, async () => {
        const corrupt = ok(await call(reviewer, '/participation/cases/' + first.id));
        assert.equal(corrupt.status, 'ACTION_REQUIRED'); assert.equal(corrupt.readiness.hardBlocked, true);
        assert.ok(corrupt.readiness.reasons.includes('PARTICIPATION_HISTORY_INVALID'));
        assert.ok(Object.values(corrupt.actions).every(action => action.allowed === false));
        denied(await call(reviewer, '/participation/cases/' + first.id + '/actions', 'POST', caseEnvelope(corrupt, 'REVIEW', { decision: 'ELIGIBLE', reviewed: true, reason: 'Corrupted state must not be accepted.' })), [403, 409]);
      });
    });

    await test('audit evidence contains identifiers and hashes without copying medical documents or personal consent wording', async () => {
      const audits = await db.auditEvent.findMany({ where: { action: { startsWith: 'PARTICIPATION_' } } });
      assert.ok(audits.length > 0);
      const raw = JSON.stringify(audits.map(row => row.metadata));
      for (const disallowed of ['base64', 'dateOfBirth', 'consentTextAr', 'consentTextEn', 'Synthetic original source issuer', 'synthetic-private-medical.pdf']) assert.ok(!raw.includes(disallowed), disallowed + ' leaked into general audit metadata');
      assert.deepEqual(f.externalAttempts, []);
    });
    retained = { cases: await db.participationCase.count(), events: await db.participationEvent.count(), sources: await db.managedDocument.count({ where: { template: { code: { startsWith: 'D01-' } } } }) };
    success = true;
  } finally {
    const result = { kind: 'D01_SYNTHETIC_NATIVE_HTTP_ACCEPTANCE_V1', startedAt, finishedAt: new Date().toISOString(), success,
      checks, retained, sourceDatabase: 'DISPOSABLE_LOOPBACK_ONLY', realParticipantConsent: false, realGuardianVerification: false,
      realMedicalClearance: false, externalProviderCalls: f?.externalAttempts.length || 0, productionWrites: 0 };
    if (process.env.D01_EVIDENCE_FILE) { mkdirSync(dirname(process.env.D01_EVIDENCE_FILE), { recursive: true }); writeFileSync(process.env.D01_EVIDENCE_FILE, JSON.stringify(result, null, 2)); }
    if (f) await f.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
