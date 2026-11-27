import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { participationFixture } from './participation-isolated-fixture.mjs';

/** Synthetic prerequisite setup for pre-existing CI suites, never an operational source approval. */
export function trainingStandardFixture(db, base, options = {}) {
  const loopback = value => ['localhost', '127.0.0.1', '[::1]'].includes(new URL(value).hostname);
  assert.equal(process.env.CI, 'true', 'Standards fixtures require CI');
  assert.ok(loopback(process.env.DATABASE_URL), 'Standards fixtures require an isolated loopback database');
  if (base) assert.ok(loopback(base), 'Standards fixtures require a loopback API');
  const require = createRequire(import.meta.url);
  const { trainingStandardBinding, trainingStandardHash } = require('../dist/governance/training-standard-profile.js');
  const { evaluateParticipation, participationTrainingGate } = require('../dist/participation/participation-evaluator.js');
  assert.ok(Object.keys(options).every(key => key === 'legacyHistoricalParticipation'));
  assert.ok(options.legacyHistoricalParticipation === undefined || typeof options.legacyHistoricalParticipation === 'boolean');
  const legacyHistoricalParticipation = options.legacyHistoricalParticipation === true;
  const participationPolicyKey = { category: 'TRAINING', ruleKey: 'PARTICIPANT_ELIGIBILITY' };
  let previousParticipationPolicy, legacyConfigured = false;
  const namespace = randomUUID(), profileIds = [], credentialIds = [], diverProfileIds = [], profiles = new Map();
  const participation = participationFixture(db, base), suppliedProviders = [], instructorAccounts = new Set(), membershipIds = [];
  let syntheticProvider = null;
  const context = { environment: 'POOL', plannedMaximumDepthMetres: 0 };
  async function providerMember(accountId) {
    if (!syntheticProvider || await db.organizationMember.findUnique({ where: { organizationId_accountId: { organizationId: syntheticProvider.id, accountId } } })) return;
    const row = await db.organizationMember.create({ data: { organizationId: syntheticProvider.id, accountId, role: 'INSTRUCTOR', status: 'ACTIVE' } });
    membershipIds.push(row.id);
  }
  async function participant(accountId, instructor = false) {
    const account = await db.account.findUniqueOrThrow({ where: { id: accountId } });
    const birth = await db.diverProfile.findUnique({ where: { accountId } });
    if (!birth) { const row = await db.diverProfile.create({ data: { accountId, dateOfBirth: new Date('1990-01-01') } }); diverProfileIds.push(row.id); }
    else assert.ok(birth.dateOfBirth, 'Existing fixture birth date must be explicit');
    if (instructor && !await db.credential.findFirst({ where: { personId: account.personId, issuer: 'TEST_AGENCY', title: 'SYNTHETIC_INSTRUCTOR', verificationStatus: 'VERIFIED' } })) {
      const row = await db.credential.create({ data: { personId: account.personId, issuer: 'TEST_AGENCY', title: 'SYNTHETIC_INSTRUCTOR', verificationStatus: 'VERIFIED', issuedAt: new Date('2000-01-01'), expiresAt: new Date('2099-01-01') } }); credentialIds.push(row.id);
    }
    if (instructor) { instructorAccounts.add(accountId); await providerMember(accountId); }
  }
  async function bind(enrollmentId, requiredSkill = 'SYNTHETIC_NOT_EXERCISED') {
    let enrollment = await db.trainingEnrollment.findUniqueOrThrow({ where: { id: enrollmentId }, include: { record: true } });
    if (!enrollment.centerOrganizationId) {
      const provider = await participation.provider();
      syntheticProvider = provider;
      for (const accountId of instructorAccounts) await providerMember(accountId);
      enrollment = await db.trainingEnrollment.update({ where: { id: enrollmentId }, data: { centerOrganizationId: provider.id }, include: { record: true } });
      suppliedProviders.push(enrollmentId);
    }
    await participant(enrollment.studentAccountId);
    if (enrollment.instructorAccountId) await participant(enrollment.instructorAccountId, true);
    const key = enrollment.courseCode + ':' + requiredSkill;
    if (!profiles.has(key)) profiles.set(key, (async () => {
      const id = randomUUID(), profile = { agencyCode: 'TEST_AGENCY', programCode: enrollment.courseCode, level: 'SYNTHETIC_TEST_ONLY', edition: namespace,
        sources: [{ authority: 'AGENCY', reference: 'SYNTHETIC_TEST_ONLY_NOT_OPERATIONAL', edition: namespace, locator: 'isolated-ci-fixture' }],
        requirements: { minimumAge: 0, minimumCompletedSessions: 1, minimumOpenWaterDives: 0, minimumOpenWaterMinutes: 0,
          instructorCredentialTitles: ['SYNTHETIC_INSTRUCTOR'], prerequisites: [], requiredSkillCodes: [requiredSkill], requiredFormCodes: [],
          supervision: [{ environment: 'POOL', minimumAge: 0, maximumAge: 120, studentsPerInstructor: 1, maximumDepthMetres: 0 }] } };
      const hash = trainingStandardHash(profile);
      await db.policyControl.create({ data: { id, category: 'TRAINING_STANDARD_PROFILE', ruleKey: 'FIXTURE-' + id, labelAr: 'Synthetic CI standards, not an agency programme', state: 'APPROVED',
        metadata: { schemaVersion: 1, profile, contentHash: hash, createdByAccountId: 'SYNTHETIC_AUTHOR_' + namespace,
          approval: { profileHash: hash, reviewedByAccountId: 'SYNTHETIC_REVIEWER_' + namespace, approvalReference: 'SYNTHETIC_NO_OPERATIONAL_AUTHORITY', reviewedAt: '2000-01-01', validUntil: '2099-01-01' } } } });
      profileIds.push(id);return { id, profile };
    })());
    const { id, profile } = await profiles.get(key);
    await db.trainingEnrollment.update({ where: { id: enrollmentId }, data: { metadata: { ...(enrollment.metadata || {}), trainingStandard: trainingStandardBinding(id, profile), trainingStandardContext: context } } });
    if (legacyHistoricalParticipation) {
      assert.equal(await db.participationCase.findUnique({ where: { trainingEnrollmentId: enrollmentId } }), null,
        'Historical programme fixtures must not fabricate an adopted D01 case');
      if (!legacyConfigured) {
        previousParticipationPolicy = await db.policyControl.findUnique({ where: { category_ruleKey: participationPolicyKey } });
        await db.policyControl.upsert({ where: { category_ruleKey: participationPolicyKey },
          create: { ...participationPolicyKey, labelAr: 'Synthetic legacy historical review only', state: 'REVIEW' }, update: { state: 'REVIEW' } });
        legacyConfigured = true;
      }
      await db.$transaction(async tx => {
        const assessment = await evaluateParticipation(tx, 'TRAINING_ENROLLMENT', enrollmentId);
        const gate = await participationTrainingGate(tx, enrollmentId);
        assert.equal(assessment.readiness.status, 'ACTION_REQUIRED');
        assert.equal(gate.cleared, false, 'Legacy review never declares participation CLEARED');
        assert.ok(gate.issues.includes('PARTICIPATION_SOURCE_REVIEW_REQUIRED'), 'Legacy review must retain its unresolved source requirement');
      });
    } else await participation.prepare('TRAINING_ENROLLMENT', enrollmentId);
    return db.trainingEnrollment.findUniqueOrThrow({ where: { id: enrollmentId }, include: { record: true } });
  }
  async function cleanup() {
    await db.organizationMember.deleteMany({ where: { id: { in: membershipIds } } });
    await participation.cleanup();
    await db.trainingEnrollment.updateMany({ where: { id: { in: suppliedProviders } }, data: { centerOrganizationId: null } });
    await db.policyControl.deleteMany({ where: { id: { in: profileIds } } });
    await db.credential.deleteMany({ where: { id: { in: credentialIds } } });
    await db.diverProfile.deleteMany({ where: { id: { in: diverProfileIds } } });
    if (legacyConfigured) {
      if (previousParticipationPolicy) {
        await db.policyControl.update({ where: { id: previousParticipationPolicy.id }, data: { state: previousParticipationPolicy.state, updatedAt: previousParticipationPolicy.updatedAt } });
        assert.deepEqual(await db.policyControl.findUnique({ where: { id: previousParticipationPolicy.id } }), previousParticipationPolicy,
          'Every changed legacy participation policy field must be restored');
      } else {
        await db.policyControl.delete({ where: { category_ruleKey: participationPolicyKey } });
        assert.equal(await db.policyControl.findUnique({ where: { category_ruleKey: participationPolicyKey } }), null);
      }
      legacyConfigured = false;
    }
  }
  const consentAt = async enrollmentId => {
    const row = await db.participationCase.findUniqueOrThrow({ where: { trainingEnrollmentId: enrollmentId } });
    assert.ok(row.state.consent?.signedAt, 'Native fixture consent must precede the session');
    return new Date(row.state.consent.signedAt);
  };
  return { bind, participant, context, cleanup, participation, consentAt };
}
