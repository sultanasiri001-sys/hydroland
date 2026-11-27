// Native D01 acceptance fixture. Synthetic identities and source documents are
// confined to an explicitly confirmed, disposable loopback PostgreSQL database.
// Production source/consent/review commands are exercised through real HTTP.
const assert = require('node:assert/strict');
const { randomBytes, randomUUID, scryptSync, createHash } = require('node:crypto');
const { resolve } = require('node:path');
const { PDFDocument, StandardFonts } = require('pdf-lib');

const canonical = value => {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => [k, canonical(value[k])]));
  return value;
};
const hash = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');

async function participationFixture() {
  assert.equal(process.env.CI, 'true');
  assert.equal(process.env.NODE_ENV, 'test');
  assert.equal(process.env.D01_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
  const database = new URL(process.env.DATABASE_URL || 'invalid:');
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(database.hostname));
  assert.match(database.pathname, /^\/participation_test_d01_[a-z0-9_]+$/);
  Object.assign(process.env, {
    JWT_SECRET: 'SYNTHETIC_D01_ISOLATED_SECRET_AT_LEAST_32_CHARACTERS',
    HYDROLAND_AI_TEST_MANUAL_WORKER: '1', HYDROLAND_EMAIL_PROVIDER: 'NONE',
    HYDROLAND_INTEGRATION_EMAIL_STATUS: 'DISABLED', HYDROLAND_PAYMENT_PROVIDER: 'NONE',
    HYDROLAND_INTEGRATION_PAYMENT_PSP_STATUS: 'DISABLED',
  });
  const dist = resolve(__dirname, '../dist'), load = file => require(resolve(dist, file));
  const nativeFetch = global.fetch, externalAttempts = [];
  let app, db, base;
  global.fetch = (input, options) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (!base || url.origin !== new URL(base).origin) {
      externalAttempts.push(url.origin);
      throw new Error('D01 fixture rejects external HTTP');
    }
    return nativeFetch(input, { ...options, redirect: 'error', signal: options?.signal || AbortSignal.timeout(30000) });
  };
  const ok = response => {
    assert.ok(response.status >= 200 && response.status < 300, JSON.stringify(response));
    return response.data;
  };
  const denied = (response, statuses) => {
    assert.ok((Array.isArray(statuses) ? statuses : [statuses]).includes(response.status), JSON.stringify(response));
    return response.data;
  };
  const call = async (actor, path, method = 'GET', body) => {
    const response = await fetch(base + path, {
      method, headers: { 'content-type': 'application/json', ...(actor ? { authorization: 'Bearer ' + actor.token } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const raw = await response.text();
    let data; try { data = JSON.parse(raw); } catch { data = raw; }
    return { status: response.status, data, headers: Object.fromEntries(response.headers) };
  };
  try {
    require('reflect-metadata');
    const { NestFactory } = require('@nestjs/core');
    app = await NestFactory.create(load('app.module.js').AppModule, { logger: ['error'], abortOnError: false });
    app.setGlobalPrefix('api/v1');
    app.useBodyParser('json', { limit: '15mb' });
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl() + '/api/v1';
    db = app.get(load('database/database.service.js').DatabaseService);
    const zone = await db.$queryRaw`SHOW TimeZone`;
    assert.ok(['UTC', 'Etc/UTC'].includes(zone[0]?.TimeZone));
    const password = randomBytes(24).toString('hex'), salt = randomBytes(16).toString('hex');
    const passwordHash = salt + ':' + scryptSync(password, salt, 64).toString('hex');
    const actor = async (label, role = null) => {
      const person = await db.person.create({ data: { firstName: 'Synthetic D01', lastName: label } });
      const account = await db.account.create({ data: {
        personId: person.id, email: 'd01-' + label + '-' + randomUUID() + '@example.invalid',
        passwordHash, status: 'ACTIVE', emailVerifiedAt: new Date(),
      } });
      const assignment = role ? await db.roleAssignment.create({ data: { accountId: account.id, role, status: 'ACTIVE' } }) : null;
      const login = ok(await call(null, '/auth/login', 'POST', { email: account.email, password }));
      const session = await db.session.findFirstOrThrow({ where: { accountId: account.id }, orderBy: { createdAt: 'desc' } });
      return { ...account, person, token: login.accessToken, assignment, session };
    };
    const creator = await actor('source-creator', 'ADMIN');
    const approver = await actor('source-approver', 'ADMIN');
    const signer = await actor('source-signer', 'ADMIN');
    const reviewer = await actor('eligibility-reviewer', 'ADMIN');
    const participant = await actor('participant');
    const guardian = await actor('guardian');
    const outsider = await actor('outsider');
    const viewer = await actor('ordinary-organization-viewer');
    const centerOwner = await actor('center-owner', 'DIVE_CENTER');
    const center = await db.organization.create({ data: {
      ownerId: centerOwner.id, kind: 'DIVE_CENTER', status: 'ACTIVE',
      displayName: 'Synthetic D01 operator', legalName: 'Disposable D01 fixture, no real operator',
      registrationNumber: 'SYNTHETIC-D01-' + randomUUID(), address: 'Isolated test database',
    } });
    const ownerMember = await db.organizationMember.create({ data: { organizationId: center.id, accountId: centerOwner.id, role: 'OWNER', status: 'ACTIVE' } });
    await db.organizationMember.create({ data: { organizationId: center.id, accountId: viewer.id, role: 'VIEWER', status: 'ACTIVE' } });
    const foreign = await db.organization.create({ data: {
      ownerId: outsider.id, kind: 'DIVE_CENTER', status: 'ACTIVE', displayName: 'Synthetic foreign operator',
      legalName: 'Synthetic foreign operator', registrationNumber: 'SYNTHETIC-D01-' + randomUUID(), address: 'Isolated test database',
    } });
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    pdf.addPage([595, 842]).drawText('SYNTHETIC D01 TEST SOURCE - NOT A MEDICAL OR LEGAL DOCUMENT', { x: 24, y: 790, size: 10, font });
    const pdfBytes = Buffer.from(await pdf.save());
    const now = Date.now(), day = 86400000;
    const dates = {
      issuedAt: new Date(now - 2 * day).toISOString(), validFrom: new Date(now - day).toISOString(),
      validUntil: new Date(now + 40 * day).toISOString(), startsAt: new Date(now + 2 * day).toISOString(), endsAt: new Date(now + 2 * day + 3600000).toISOString(),
    };
    const bookingSubject = async ({ account = participant, fullName, organizationId = center.id, booker = participant } = {}) => {
      const trip = await db.trip.create({ data: {
        organizationId, title: 'Synthetic source-bound trip ' + randomUUID(), type: 'SHORE_DIVE', capacity: 1,
        status: 'OPEN', startsAt: dates.startsAt, endsAt: dates.endsAt,
      } });
      const booking = await db.booking.create({ data: { tripId: trip.id, accountId: booker.id, status: 'PENDING', seats: 1 } });
      const subject = await db.bookingParticipant.create({ data: {
        bookingId: booking.id, accountId: account?.id || null,
        fullName: fullName || (account ? account.person.firstName + ' ' + account.person.lastName : 'Synthetic minor companion'),
        eligibilityStatus: 'PENDING',
      } });
      return { subject, booking, trip, subjectType: 'BOOKING_PARTICIPANT', subjectId: subject.id,
        serviceType: 'TRIP', serviceId: trip.id, activityCode: trip.type, account, organizationId };
    };
    const trainingSubject = async ({ account = participant, organizationId = center.id } = {}) => {
      const subject = await db.trainingEnrollment.create({ data: {
        studentAccountId: account.id, centerOrganizationId: organizationId, courseCode: 'SYNTHETIC-D01-COURSE', status: 'PENDING',
        metadata: { title: 'Synthetic D01 training only', startsAt: dates.startsAt, endsAt: dates.endsAt },
      } });
      return { subject, subjectType: 'TRAINING_ENROLLMENT', subjectId: subject.id, serviceType: 'TRAINING_ENROLLMENT',
        serviceId: subject.id, activityCode: subject.courseCode, account, organizationId };
    };
    const policyTerms = (subject, extra = {}) => ({
      purpose: 'D01_POLICY_V1', serviceType: subject.serviceType, serviceId: subject.serviceId, subjectId: 'ALL', activityCode: subject.activityCode,
      effectiveFrom: dates.validFrom, validUntil: dates.validUntil, minimumAge: 10, guardianBelowAge: 18,
      consentRequirement: 'REQUIRED', medicalRequirement: 'NOT_APPLICABLE',
      consentTextAr: 'أوافق على المشاركة في هذه الخدمة التجريبية المحددة. هذه بيانات اختبار اصطناعية وليست موافقة شخص حقيقي.',
      consentTextEn: 'I consent to this specific synthetic service for isolated testing. This is not a real person consent.',
      sourceAuthority: 'Synthetic source owner, no real authority', sourceReference: 'SYNTHETIC-D01-POLICY', sourceVersion: 'fixture-1',
      sourceClause: 'Fixture applicability only', applicabilityReason: 'No production policy or medical/legal rule is created by this fixture.', ...extra,
    });
    const identityTerms = (subject, extra = {}) => ({
      purpose: 'D01_IDENTITY_V1', subjectType: subject.subjectType, subjectId: subject.subjectId,
      participantAccountId: subject.account?.id || null,
      fullName: subject.subject.fullName || subject.account.person.firstName + ' ' + subject.account.person.lastName,
      dateOfBirth: '1990-01-01', issuerName: 'Synthetic identity source', sourceReference: 'SYNTHETIC-IDENTITY-' + subject.subjectId,
      issuedAt: dates.issuedAt, validUntil: dates.validUntil, ...extra,
    });
    const evidenceTerms = (subject, identity, kind, extra = {}) => ({
      purpose: 'D01_' + kind + '_V1', subjectType: subject.subjectType, subjectId: subject.subjectId,
      serviceType: subject.serviceType, serviceId: subject.serviceId, identityDocumentId: identity.id, identityDocumentHash: identity.hash,
      issuerName: 'Synthetic original source issuer', sourceReference: 'SYNTHETIC-' + kind + '-' + subject.subjectId,
      issuedAt: dates.issuedAt, validFrom: dates.validFrom, validUntil: dates.validUntil,
      ...(kind === 'GUARDIAN' ? { guardianAccountId: guardian.id, relationshipKind: 'LEGAL_GUARDIAN', authorityScope: 'PARTICIPATION_CONSENT' }
        : { activityCode: subject.activityCode, issuerReference: 'SYNTHETIC-QUALIFIED-ISSUER-REFERENCE', outcome: 'CLEARED_FOR_ACTIVITY', limitations: '' }),
      ...extra,
    });
    const sourceInput = (kind, payload, extra = {}) => ({
      requestId: randomUUID(), organizationId: center.id, kind, title: 'Synthetic private ' + kind + ' source', payload,
      attachment: { filename: 'synthetic-private-' + kind.toLowerCase() + '.pdf', mimeType: 'application/pdf', base64: pdfBytes.toString('base64') }, ...extra,
    });
    const createSource = async (kind, payload, extra = {}, who = creator) => ok(await call(who, '/participation/sources', 'POST', sourceInput(kind, payload, extra)));
    const sourceEnvelope = (source, action, extra = {}) => ({ requestId: randomUUID(), expectedVersion: source.version, expectedHash: source.hash, action, reason: 'Synthetic source review; original evidence inspected in isolated test only.', ...extra });
    const sourceAction = async (source, action, who, extra = {}) => ok(await call(who, '/participation/sources/' + source.id + '/actions', 'POST', sourceEnvelope(source, action, extra)));
    const signedSource = async (kind, payload, extra = {}) => {
      let source = await createSource(kind, payload, extra);
      source = await sourceAction(source, 'SUBMIT', creator);
      source = await sourceAction(source, 'APPROVE', approver);
      return sourceAction(source, 'SIGN', signer);
    };
    const readCase = async (value, who = reviewer) => ok(await call(who, '/participation/cases/' + (typeof value === 'string' ? value : value.id)));
    const caseEnvelope = (value, action, payload = {}, extra = {}) => ({ requestId: randomUUID(), expectedRevision: value.revision, expectedDigest: value.digest, action, payload, ...extra });
    const caseAction = async (value, action, who, payload = {}, extra = {}) => ok(await call(who, '/participation/cases/' + value.id + '/actions', 'POST', caseEnvelope(value, action, payload, extra)));
    const createCase = async (subject, policy, identity, who = creator, extra = {}) => ok(await call(who, '/participation/cases', 'POST', {
      requestId: randomUUID(), subjectType: subject.subjectType, subjectId: subject.subjectId, policyDocumentId: policy.id, identityDocumentId: identity.id, ...extra,
    }));
    const changed = async (model, where, data, work) => {
      const before = await db[model].findUniqueOrThrow({ where });
      const restore = Object.fromEntries(Object.keys(data).map(key => [key, before[key]]));
      if ('updatedAt' in before) restore.updatedAt = before.updatedAt;
      await db[model].update({ where, data });
      try { return await work(); } finally { await db[model].update({ where, data: restore }); }
    };
    const snapshot = async () => JSON.stringify(await Promise.all([
      db.participationCase.findMany({ orderBy: { id: 'asc' } }), db.participationEvent.findMany({ orderBy: { id: 'asc' } }),
      db.managedDocument.findMany({ where: { template: { code: { startsWith: 'D01-' } } }, orderBy: { id: 'asc' } }),
    ]));
    const noEffects = async (work, statuses) => {
      const before = await snapshot(); const response = await work(); denied(response, statuses);
      assert.equal(await snapshot(), before, 'Rejected command changed a retained case, source, or event'); return response;
    };
    return { app, db, base, load, call, ok, denied, actor, creator, approver, signer, reviewer, participant, guardian, outsider, viewer,
      centerOwner, center, ownerMember, foreign, pdfBytes, dates, bookingSubject, trainingSubject, policyTerms, identityTerms, evidenceTerms,
      sourceInput, createSource, sourceEnvelope, sourceAction, signedSource, readCase, caseEnvelope, caseAction, createCase, changed, snapshot, noEffects,
      externalAttempts, close: async () => { await app.close(); global.fetch = nativeFetch; } };
  } catch (error) {
    if (app) await app.close();
    global.fetch = nativeFetch;
    throw error;
  }
}

module.exports = { participationFixture, canonical, hash };
