import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDiveProgressionPolicy, evaluateDiveProgression, DiveProgressionError } from '../src/governance/training-dive-progression.ts';

// All limits and identifiers are SYNTHETIC. These are not agency standards.
const HASH = 'a'.repeat(64), OTHER = 'b'.repeat(64), AS_OF = '2036-01-05T00:00:00.000Z';
const policy = () => ({ schemaVersion: 1, profileHash: HASH, timeZone: 'Asia/Riyadh',
  qualifyingDives: [
    { number: 1, minimumBottomMinutes: 11, maximumDepthMetres: 7, requiredSkillCodesBeforeDive: [] },
    { number: 2, minimumBottomMinutes: 13, maximumDepthMetres: 11, requiredSkillCodesBeforeDive: ['SYNTH_CONFINED'] },
    { number: 3, minimumBottomMinutes: 17, maximumDepthMetres: 15, requiredSkillCodesBeforeDive: ['SYNTH_KNOWLEDGE'] }
  ],
  experienceLimits: [0, 1, 2, 3].map((afterQualifyingDive, i) => ({ afterQualifyingDive, minimumBottomMinutes: 5, maximumDepthMetres: [4, 6, 9, 10][i] })),
  dayLimits: { maximumDives: 3, depthLimits: [{ diveOfDay: 3, maximumDepthMetres: 9 }] }
});
const dive = (qualifyingNumber, startsAt, maximumDepthMetres, bottomMinutes = 20) => ({
  id: `dive-${qualifyingNumber}`, profileHash: HASH, kind: 'QUALIFYING', qualifyingNumber, startsAt,
  endsAt: new Date(Date.parse(startsAt) + 30 * 60000).toISOString(), bottomMinutes, maximumDepthMetres
});
const history = () => [dive(1, '2036-01-01T06:00:00.000Z', 7), dive(2, '2036-01-01T08:00:00.000Z', 11), dive(3, '2036-01-02T06:00:00.000Z', 15)];
const skills = () => ['SYNTH_CONFINED', 'SYNTH_KNOWLEDGE'].map(code => ({ code, profileHash: HASH, completedAt: '2035-12-31T00:00:00.000Z' }));
const experience = (id, startsAt, maximumDepthMetres = 6) => ({ ...dive(1, startsAt, maximumDepthMetres), id, kind: 'EXPERIENCE', qualifyingNumber: null });
const evaluate = (p = policy(), dives = history(), evidence = skills(), at = AS_OF) => evaluateDiveProgression(p, dives, evidence, at);
const has = (result, code) => assert.ok(result.violations.some(row => row.code === code), `${code}: ${JSON.stringify(result)}`);

test('complete synthetic sequence passes without granting production authority', () => {
  assert.deepEqual(evaluate(), { complete: true, completedQualifyingDives: 3, missingQualifyingNumbers: [], violations: [], productionAuthorized: false });
});
test('unsorted verified history is ordered chronologically without mutating inputs', () => {
  const p = policy(), dives = history().reverse(), evidence = skills();
  const original = structuredClone([p, dives, evidence]);
  assert.equal(evaluate(p, dives, evidence).complete, true);
  assert.deepEqual([p, dives, evidence], original);
});
test('empty and incomplete evidence cannot satisfy completion', () => {
  assert.deepEqual(evaluate(policy(), []).missingQualifyingNumbers, [1, 2, 3]);
  assert.equal(evaluate(policy(), history().slice(0, 2)).complete, false);
});
test('per-dive lower depth cannot be replaced by a programme maximum', () => {
  const h = history(); h[0].maximumDepthMetres = 15;
  const result = evaluate(policy(), h); has(result, 'PROGRESSION_DEPTH'); has(result, 'DIVE_SEQUENCE_REQUIRED');
  assert.equal(result.completedQualifyingDives, 0);
});
test('per-dive bottom time cannot be replaced by total course minutes or elapsed time', () => {
  const h = history(); h[0].bottomMinutes = 10; h[0].endsAt = '2036-01-01T07:00:00.000Z'; h[2].bottomMinutes = 30;
  has(evaluate(policy(), h), 'DIVE_BOTTOM_TIME');
});
test('exact minimum bottom time and depth boundaries pass', () => {
  const h = history(); [11, 13, 17].forEach((value, i) => { h[i].bottomMinutes = value; });
  assert.equal(evaluate(policy(), h).complete, true);
});
test('same-day depth cap intersects later programme depth', () => {
  const h = history(); h[2] = dive(3, '2036-01-01T10:00:00.000Z', 15);
  has(evaluate(policy(), h), 'DAILY_DIVE_DEPTH');
  h[2].maximumDepthMetres = 9; assert.equal(evaluate(policy(), h).complete, true);
});
test('experience dives count toward daily limits and cannot advance qualifying ordinal', () => {
  const h = history(); h.splice(1, 0, experience('extra', '2036-01-01T07:00:00.000Z'));
  const result = evaluate(policy(), h); has(result, 'DAILY_DIVE_DEPTH'); assert.equal(result.completedQualifyingDives, 1);
});
test('experience depth is restricted to the current completed stage', () => {
  const h = history(); h.splice(1, 0, experience('extra', '2036-01-01T07:00:00.000Z', 9));
  has(evaluate(policy(), h), 'PROGRESSION_DEPTH');
});
test('unmapped experience stage fails closed', () => {
  const p = policy(); p.experienceLimits = [];
  has(evaluate(p, [...history(), experience('extra', '2036-01-03T06:00:00.000Z')]), 'EXPERIENCE_DIVE_NOT_COVERED');
});
test('experience dive cannot substitute for a qualifying dive', () => {
  const h = history(); h[1] = experience('extra', h[1].startsAt, 6);
  const result = evaluate(policy(), h); has(result, 'DIVE_SEQUENCE_REQUIRED'); assert.equal(result.complete, false);
});
test('maximum dives includes all experience dives', () => {
  const p = policy(); p.dayLimits.depthLimits = [];
  const h = [history()[0], experience('x1', '2036-01-01T07:00:00.000Z'), experience('x2', '2036-01-01T08:00:00.000Z'), experience('x3', '2036-01-01T09:00:00.000Z')];
  has(evaluate(p, h), 'DAILY_DIVE_LIMIT');
});
test('out-of-order and duplicate ordinal cannot advance the course', () => {
  const h = history(); h[0].qualifyingNumber = 2;
  assert.equal(evaluate(policy(), h).completedQualifyingDives, 0);
  const duplicate = history(); duplicate[1].qualifyingNumber = 1;
  has(evaluate(policy(), duplicate), 'DIVE_SEQUENCE_REQUIRED');
});
test('qualifying ordinal outside source policy is not accepted', () => {
  const h = history(); h.push(dive(4, '2036-01-03T06:00:00.000Z', 5));
  has(evaluate(policy(), h), 'QUALIFYING_DIVE_NOT_COVERED');
});
test('duplicate identity is refused even when timestamps differ', () => {
  const h = history(); h[1].id = h[0].id; has(evaluate(policy(), h), 'DUPLICATE_DIVE_ID');
});
test('overlapping dives cannot be counted twice', () => {
  const h = history(); h[1].startsAt = '2036-01-01T06:10:00.000Z';
  has(evaluate(policy(), h), 'OVERLAPPING_DIVES');
});
test('adjacent windows do not overlap', () => {
  const h = history(); h[1] = dive(2, h[0].endsAt, 11);
  assert.equal(evaluate(policy(), h).complete, true);
});
test('same start timestamp is not hidden by sorting or caller order', () => {
  const h = history(); h[1] = dive(2, h[0].startsAt, 11);
  has(evaluate(policy(), h.reverse()), 'OVERLAPPING_DIVES');
});
test('wrong profile hashes cannot lend evidence to this policy', () => {
  const h = history(); h[1].profileHash = OTHER;
  has(evaluate(policy(), h), 'DIVE_PROFILE_MISMATCH');
});
test('late skills, missing skills, and wrong-profile skills do not meet a pre-dive prerequisite', () => {
  for (const evidence of [[], skills().map(s => ({ ...s, completedAt: AS_OF })), skills().map(s => ({ ...s, profileHash: OTHER }))]) has(evaluate(policy(), history(), evidence), 'PRE_DIVE_SKILL_REQUIRED');
});
test('skill evidence at exact start is accepted and future duplicate does not hide earlier proof', () => {
  const evidence = skills(); evidence[0].completedAt = history()[1].startsAt;
  evidence.push({ ...evidence[0], completedAt: AS_OF });
  assert.equal(evaluate(policy(), history(), evidence).complete, true);
});
test('future dives are not counted as completed', () => {
  has(evaluate(policy(), history(), skills(), '2036-01-01T06:29:59.999Z'), 'DIVE_IN_FUTURE');
});
test('completion exactly at as-of timestamp is valid', () => {
  assert.equal(evaluate(policy(), history(), skills(), history()[2].endsAt).complete, true);
});
test('Riyadh local day boundary changes daily ordinal rather than UTC midnight', () => {
  const p = policy(); p.dayLimits.maximumDives = 1; p.dayLimits.depthLimits = [];
  const h = [dive(1, '2036-01-01T20:00:00.000Z', 7), dive(2, '2036-01-01T21:01:00.000Z', 11), dive(3, '2036-01-02T21:01:00.000Z', 15)];
  assert.equal(evaluate(p, h).complete, true);
  p.timeZone = 'UTC'; has(evaluate(p, h), 'DAILY_DIVE_LIMIT');
});
test('DST repeated local hour remains the same day and overlaps use absolute time', () => {
  const p = policy(); p.timeZone = 'America/New_York'; p.dayLimits.maximumDives = 1; p.dayLimits.depthLimits = [];
  const h = [dive(1, '2036-11-02T05:00:00.000Z', 7), dive(2, '2036-11-02T06:00:00.000Z', 11)];
  has(evaluate(p, h, skills(), '2036-11-03T00:00:00.000Z'), 'DAILY_DIVE_LIMIT');
});
test('cross-local-midnight dive needs review instead of splitting daily quota', () => {
  has(evaluate(policy(), [dive(1, '2036-01-01T20:45:00.000Z', 7)]), 'DIVE_CROSSES_LOCAL_DAY');
});
test('one invalid experience dive makes whole result incomplete even if qualifying dives pass', () => {
  const result = evaluate(policy(), [...history(), experience('bad', '2036-01-03T06:00:00.000Z', 20)]);
  assert.equal(result.completedQualifyingDives, 3); assert.equal(result.complete, false); assert.equal(result.productionAuthorized, false);
});

for (const [label, mutate] of [
  ['missing required field', p => { delete p.experienceLimits; }],
  ['unknown field', p => { p.accepted = true; }],
  ['wrong schema', p => { p.schemaVersion = 2; }],
  ['invalid hash', p => { p.profileHash = 'source'; }],
  ['invalid timezone', p => { p.timeZone = 'not/a-zone'; }],
  ['empty sequence', p => { p.qualifyingDives = []; }],
  ['noncontiguous sequence', p => { p.qualifyingDives[1].number = 3; }],
  ['duplicate stage', p => { p.experienceLimits.push(p.experienceLimits[0]); }],
  ['unknown stage', p => { p.experienceLimits[0].afterQualifyingDive = 4; }],
  ['duplicate daily ordinal', p => { p.dayLimits.depthLimits.push(p.dayLimits.depthLimits[0]); }],
  ['daily cap outside day limit', p => { p.dayLimits.depthLimits[0].diveOfDay = 4; }],
  ['zero daily allowance', p => { p.dayLimits.maximumDives = 0; }],
  ['zero bottom time', p => { p.qualifyingDives[0].minimumBottomMinutes = 0; }],
  ['fractional bottom time', p => { p.qualifyingDives[0].minimumBottomMinutes = 1.5; }],
  ['nonfinite depth', p => { p.qualifyingDives[0].maximumDepthMetres = Infinity; }],
  ['negative depth', p => { p.qualifyingDives[0].maximumDepthMetres = -1; }],
  ['duplicate skill', p => { p.qualifyingDives[1].requiredSkillCodesBeforeDive.push('SYNTH_CONFINED'); }],
  ['oversized policy', p => { p.qualifyingDives = Array(201).fill(p.qualifyingDives[0]); }],
  ['sparse qualifying rules', p => { p.qualifyingDives = Array(1); }],
  ['sparse required skills', p => { p.qualifyingDives[1].requiredSkillCodesBeforeDive = Array(1); }],
  ['sparse experience rules', p => { p.experienceLimits = Array(1); }],
  ['sparse daily rules', p => { p.dayLimits.depthLimits = Array(1); }],
  ['array extra property', p => { p.qualifyingDives.approved = true; }]
]) test(`reject invalid policy: ${label}`, () => { const p = policy(); mutate(p); assert.throws(() => parseDiveProgressionPolicy(p), DiveProgressionError); });

for (const [label, mutate] of [
  ['missing field', d => { delete d.endsAt; }], ['unknown field', d => { d.approved = true; }],
  ['empty id', d => { d.id = ''; }], ['wrong kind', d => { d.kind = 'AUTO'; }],
  ['boxed kind', d => { d.kind = new String('EXPERIENCE'); d.qualifyingNumber = 123; }],
  ['array kind', d => { d.kind = ['EXPERIENCE']; d.qualifyingNumber = 123; }],
  ['object coerced kind', d => { d.kind = { toString: () => 'EXPERIENCE' }; d.qualifyingNumber = 123; }],
  ['experience ordinal', d => { d.kind = 'EXPERIENCE'; }], ['missing qualifying ordinal', d => { d.qualifyingNumber = null; }],
  ['naive timestamp', d => { d.startsAt = '2036-01-01T06:00:00'; }],
  ['impossible date', d => { d.startsAt = '2036-02-30T00:00:00.000Z'; }],
  ['negative duration', d => { d.endsAt = '2035-01-01T00:00:00.000Z'; }],
  ['bottom time exceeds dive window', d => { d.bottomMinutes = 31; }],
  ['fractional bottom time', d => { d.bottomMinutes = 20.5; }], ['NaN depth', d => { d.maximumDepthMetres = NaN; }],
  ['string depth', d => { d.maximumDepthMetres = '7'; }]
]) test(`reject malformed evidence: ${label}`, () => { const h = history(); mutate(h[0]); assert.throws(() => evaluate(policy(), h), DiveProgressionError); });

test('bounded evidence and skill lists fail rather than silently truncating', () => {
  assert.throws(() => evaluate(policy(), Array(201).fill(history()[0])), DiveProgressionError);
  assert.throws(() => evaluate(policy(), history(), Array(2001).fill(skills()[0])), DiveProgressionError);
});
test('sparse dive and skill evidence are rejected at the input boundary', () => {
  assert.throws(() => evaluate(policy(), Array(1)), DiveProgressionError);
  assert.throws(() => evaluate(policy(), history(), Array(1)), DiveProgressionError);
});
test('invalid as-of and malformed skill proof are refused', () => {
  assert.throws(() => evaluate(policy(), history(), skills(), 'now'), DiveProgressionError);
  const evidence = skills(); evidence[0].completedAt = '2036-02-30T00:00:00Z';
  assert.throws(() => evaluate(policy(), history(), evidence), DiveProgressionError);
});
test('UTC timestamp with exact seconds is accepted', () => {
  const h = history(); h[0].startsAt = h[0].startsAt.replace('.000Z', 'Z');
  assert.equal(evaluate(policy(), h).complete, true);
});
