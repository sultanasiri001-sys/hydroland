import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

/** Synthetic prerequisite setup for pre-existing CI suites, never an operational source approval. */
export function trainingStandardFixture(db, base) {
  const loopback = value => ['localhost', '127.0.0.1', '[::1]'].includes(new URL(value).hostname);
  assert.equal(process.env.CI, 'true', 'Standards fixtures require CI');
  assert.ok(loopback(process.env.DATABASE_URL), 'Standards fixtures require an isolated loopback database');
  if (base) assert.ok(loopback(base), 'Standards fixtures require a loopback API');
  const require = createRequire(import.meta.url);
  const { trainingStandardBinding, trainingStandardHash } = require('../dist/governance/training-standard-profile.js');
  const namespace = randomUUID(), profileIds = [], credentialIds = [], diverProfileIds = [], profiles = new Map();
  const context = { environment: 'POOL', plannedMaximumDepthMetres: 0 };
  async function participant(accountId, instructor = false) {
    const account = await db.account.findUniqueOrThrow({ where: { id: accountId } });
    const birth = await db.diverProfile.findUnique({ where: { accountId } });
    if (!birth) { const row = await db.diverProfile.create({ data: { accountId, dateOfBirth: new Date('1990-01-01') } }); diverProfileIds.push(row.id); }
    else assert.ok(birth.dateOfBirth, 'Existing fixture birth date must be explicit');
    if (instructor && !await db.credential.findFirst({ where: { personId: account.personId, issuer: 'TEST_AGENCY', title: 'SYNTHETIC_INSTRUCTOR', verificationStatus: 'VERIFIED' } })) {
      const row = await db.credential.create({ data: { personId: account.personId, issuer: 'TEST_AGENCY', title: 'SYNTHETIC_INSTRUCTOR', verificationStatus: 'VERIFIED', issuedAt: new Date('2000-01-01'), expiresAt: new Date('2099-01-01') } }); credentialIds.push(row.id);
    }
  }
  async function bind(enrollmentId, requiredSkill = 'SYNTHETIC_NOT_EXERCISED') {
    const enrollment = await db.trainingEnrollment.findUniqueOrThrow({ where: { id: enrollmentId }, include: { record: true } });
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
    return db.trainingEnrollment.update({ where: { id: enrollmentId }, data: { metadata: { ...(enrollment.metadata || {}), trainingStandard: trainingStandardBinding(id, profile), trainingStandardContext: context } }, include: { record: true } });
  }
  async function cleanup() {
    await db.policyControl.deleteMany({ where: { id: { in: profileIds } } });
    await db.credential.deleteMany({ where: { id: { in: credentialIds } } });
    await db.diverProfile.deleteMany({ where: { id: { in: diverProfileIds } } });
  }
  return { bind, participant, context, cleanup };
}
