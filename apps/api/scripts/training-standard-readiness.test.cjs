const test = require('node:test');
const assert = require('node:assert/strict');
const { ForbiddenException } = require('@nestjs/common');
const { TrainingStandardReadinessService } = require('../dist/governance/training-standard-readiness.service');

function fixture({ history = false, status = 'ACTIVE', bound = false, denied = false, revokeAfterRead = false, sourceFailure = false } = {}) {
  const steps = [];
  const row = { id: 'course', courseCode: 'SYNTHETIC_ONLY', status, instructorAccountId: 'PRIVATE_INSTRUCTOR', studentAccountId: 'PRIVATE_STUDENT', centerOrganizationId: 'PRIVATE_CENTER',
    metadata: { medical: 'DO_NOT_RETURN', private: 'DO_NOT_RETURN', ...(bound ? { trainingStandard: { profileId: 'source' } } : {}) },
    record: history ? { id: 'record', _count: { sessions: 2 } } : null };
  const tx = {
    trainingEnrollment: { findUniqueOrThrow: async () => { steps.push('read'); return structuredClone(row); } },
    trainingSkill: { count: async () => { steps.push('skills'); return 1; } },
    policyControl: { findFirst: async () => { if (sourceFailure) throw new Error('Synthetic unavailable database'); return null; } },
  };
  const db = { serializable: async work => work(tx) };
  const authorization = { assertAdministrativeEnrollmentAccess: async (actor, id, client) => {
    assert.equal(actor, 'operator'); assert.equal(id, 'course');
    steps.push(client ? 'authorize-in-transaction' : 'reauthorize-before-return');
    if (denied || (!client && revokeAfterRead)) throw new ForbiddenException();
  } };
  return { service: new TrainingStandardReadinessService(db, authorization), steps };
}

test('an unbound fresh course requires source selection without creating records or disclosing people/metadata', async () => {
  const f = fixture(), r = await f.service.read('operator', 'course');
  assert.equal(r.state, 'SOURCE_SELECTION_REQUIRED'); assert.equal(r.reasonCode, 'STANDARD_SELECTION_REQUIRED');
  assert.deepEqual(r.existingEvidence, { sessions: 0, signedSkills: 0 });
  assert.equal(r.previewOnly, true); assert.equal(r.operationalAuthorization, false); assert.equal(r.automaticHistoryAdoptionAllowed, false);
  assert.doesNotMatch(JSON.stringify(r), /PRIVATE_|DO_NOT_RETURN|studentAccountId|instructorAccountId|metadata/);
  assert.deepEqual(f.steps, ['authorize-in-transaction', 'read', 'reauthorize-before-return']);
});
test('existing sessions and signatures require review, never automatic adoption', async () => {
  const r = await fixture({ history: true }).service.read('operator', 'course');
  assert.equal(r.state, 'EXISTING_COURSE_REVIEW_REQUIRED'); assert.equal(r.existingCourseRequiresReview, true);
  assert.deepEqual(r.existingEvidence, { sessions: 2, signedSkills: 1 }); assert.equal(r.automaticHistoryAdoptionAllowed, false);
});
for (const status of ['COMPLETED', 'CANCELLED']) test(`an unbound ${status} course is not presented as a fresh selection even without evidence`, async () => {
  const r = await fixture({ status }).service.read('operator', 'course');
  assert.equal(r.state, 'EXISTING_COURSE_REVIEW_REQUIRED');
});
test('a stored binding does not imply approved or effective source', async () => {
  const r = await fixture({ bound: true }).service.read('operator', 'course');
  assert.equal(r.state, 'STANDARD_PREREQUISITES_BLOCKED'); assert.equal(r.standardPrerequisitesSatisfied, false);
  assert.equal(r.reasonCode, 'TRAINING_STANDARD_NOT_APPROVED'); assert.equal(r.operationalAuthorization, false);
});
test('scope denial occurs before reading enrollment or evidence', async () => {
  const f = fixture({ denied: true }); await assert.rejects(f.service.read('operator', 'course'), ForbiddenException);
  assert.deepEqual(f.steps, ['authorize-in-transaction']);
});
test('revocation before the final fresh check suppresses the buffered preview', async () => {
  const f = fixture({ history: true, revokeAfterRead: true });
  await assert.rejects(f.service.read('operator', 'course'), ForbiddenException);
  assert.equal(f.steps.at(-1), 'reauthorize-before-return');
});
test('database failures propagate rather than becoming readiness or ordinary review gaps', async () => {
  const f = fixture({ bound: true, sourceFailure: true });
  await assert.rejects(f.service.read('operator', 'course'), /Synthetic unavailable database/);
  assert.ok(!f.steps.includes('reauthorize-before-return'));
});
test('invalid identifiers are rejected before access or database work', async () => {
  const f = fixture();
  for (const id of ['', ' ', 'x'.repeat(101)]) await assert.rejects(f.service.read('operator', id));
  assert.deepEqual(f.steps, []);
});
