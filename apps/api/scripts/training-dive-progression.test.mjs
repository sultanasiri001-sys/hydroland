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

// V2 fixtures are SYNTHETIC modelling contracts, not PADI or other agency rules.
const policyV2 = () => {
  const p = policy();
  return { ...p, schemaVersion: 2,
    qualification: { minimumDepthMetres: 3, minimumPercentAtDepth: 60, depthFractionComparison: 'MORE_THAN',
      alternatives: [{ metric: 'SUBMERGED_SECONDS', minimum: 960 }, { metric: 'BREATHED_GAS_LITRES', minimum: 1250 }] },
    qualifyingDives: p.qualifyingDives.map(({ minimumBottomMinutes, ...rule }) => rule),
    experienceLimits: p.experienceLimits.map(({ minimumBottomMinutes, ...rule }) => rule),
    dayLimits: { ...p.dayLimits, afterConfinedWaterMaximumDives: 2 }
  };
};
const v2Dive = value => {
  const { bottomMinutes, ...common } = value;
  return { ...common, qualificationEvidence: { submergedSeconds: 1200, depthThresholdMetres: 3, secondsAtOrDeeperThanThreshold: 900, breathedGasLitres: null } };
};
const historyV2 = () => history().map(v2Dive);
const confinedActivity = (id = 'confined', startsAt = '2036-01-01T04:00:00.000Z', endsAt = '2036-01-01T05:00:00.000Z', environment = 'POOL') => ({ id, profileHash: HASH, environment, startsAt, endsAt });
const evaluateV2 = (p = policyV2(), dives = historyV2(), confined = [], evidence = skills(), at = AS_OF) => evaluateDiveProgression(p, dives, evidence, at, confined);
const rejectsV2 = (modify, input = 'policy') => {
  const p = policyV2(), dives = historyV2(), confined = [];
  modify(input === 'policy' ? p : input === 'dives' ? dives : confined);
  assert.throws(() => evaluateV2(p, dives, confined), DiveProgressionError);
};

test('v2 round trips without v1 artificial minimum minutes or production authority', () => {
  assert.deepEqual(parseDiveProgressionPolicy(policyV2()), policyV2());
  assert.deepEqual(evaluateV2(), evaluate());
});
test('v2 immutable inputs remain unchanged after evaluation', () => {
  const values = [policyV2(), historyV2().reverse(), [confinedActivity()], skills()];
  const before = structuredClone(values); evaluateV2(...values); assert.deepEqual(values, before);
});
test('v2 gas alternative passes below the time threshold without a one-minute floor', () => {
  const h = historyV2(); h[0].qualificationEvidence = { submergedSeconds: 30, depthThresholdMetres: 3, secondsAtOrDeeperThanThreshold: 20, breathedGasLitres: 1250 };
  assert.equal(evaluateV2(policyV2(), h).complete, true);
});
test('v2 time alternative passes with gas evidence absent', () => {
  const h = historyV2(); h[0].qualificationEvidence.submergedSeconds = 960;
  h[0].qualificationEvidence.secondsAtOrDeeperThanThreshold = 700;
  assert.equal(evaluateV2(policyV2(), h).complete, true);
});
test('v2 neither time nor gas threshold cannot be replaced by total elapsed window', () => {
  const h = historyV2(); Object.assign(h[0].qualificationEvidence, { submergedSeconds: 900, secondsAtOrDeeperThanThreshold: 700, breathedGasLitres: 1249 });
  has(evaluateV2(policyV2(), h), 'DIVE_QUALIFICATION_ALTERNATIVE_REQUIRED');
});
test('v2 alternatives are OR and do not require both measurements', () => {
  const p = policyV2(); p.qualification.alternatives = [{ metric: 'BREATHED_GAS_LITRES', minimum: 1250 }];
  const h = historyV2(); h.forEach(d => { d.qualificationEvidence.breathedGasLitres = 1250; });
  assert.equal(evaluateV2(p, h).complete, true);
  h[0].qualificationEvidence.breathedGasLitres = null;
  has(evaluateV2(p, h), 'DIVE_QUALIFICATION_ALTERNATIVE_REQUIRED');
});
test('v2 strict depth-time fraction rejects equality and accepts one second above', () => {
  const h = historyV2(); h[0].qualificationEvidence.secondsAtOrDeeperThanThreshold = 720;
  has(evaluateV2(policyV2(), h), 'DIVE_DEPTH_TIME_REQUIRED');
  h[0].qualificationEvidence.secondsAtOrDeeperThanThreshold = 721;
  assert.equal(evaluateV2(policyV2(), h).complete, true);
});
test('v2 inclusive depth-time fraction accepts equality', () => {
  const p = policyV2(); p.qualification.depthFractionComparison = 'AT_LEAST';
  const h = historyV2(); h[0].qualificationEvidence.secondsAtOrDeeperThanThreshold = 720;
  assert.equal(evaluateV2(p, h).complete, true);
});
test('v2 a brief maximum-depth visit cannot satisfy depth-time evidence', () => {
  const h = historyV2(); h[0].qualificationEvidence.secondsAtOrDeeperThanThreshold = 1;
  has(evaluateV2(policyV2(), h), 'DIVE_DEPTH_TIME_REQUIRED');
});
test('v2 minimum depth is independent of maximum progression depth', () => {
  const h = historyV2(); h[0].maximumDepthMetres = 2; h[0].qualificationEvidence.secondsAtOrDeeperThanThreshold = 0;
  has(evaluateV2(policyV2(), h), 'DIVE_MINIMUM_DEPTH');
});
test('v2 invalid qualification cannot advance the stage', () => {
  const h = historyV2(); h[0].qualificationEvidence.secondsAtOrDeeperThanThreshold = 0;
  const r = evaluateV2(policyV2(), h); assert.equal(r.completedQualifyingDives, 0); has(r, 'DIVE_SEQUENCE_REQUIRED');
});
test('v2 experience dives also need qualification and count toward daily limits', () => {
  const h = historyV2(); const e = v2Dive(experience('extra', '2036-01-01T07:00:00.000Z'));
  e.qualificationEvidence.secondsAtOrDeeperThanThreshold = 0; h.splice(1, 0, e);
  const r = evaluateV2(policyV2(), h); has(r, 'DIVE_DEPTH_TIME_REQUIRED'); has(r, 'DAILY_DIVE_DEPTH');
});
test('v2 requires explicit confined history; v1 refuses ignored confined history', () => {
  assert.throws(() => evaluateDiveProgression(policyV2(), historyV2(), skills(), AS_OF), DiveProgressionError);
  assert.throws(() => evaluateDiveProgression(policy(), history(), skills(), AS_OF, []), DiveProgressionError);
});
test('v2 three OW dives pass without preceding confined activity but not after it', () => {
  const h = historyV2(); h[2] = v2Dive(dive(3, '2036-01-01T10:00:00.000Z', 9));
  assert.equal(evaluateV2(policyV2(), h).complete, true);
  const r = evaluateV2(policyV2(), h, [confinedActivity()]); has(r, 'AFTER_CONFINED_DAILY_DIVE_LIMIT'); assert.equal(r.completedQualifyingDives, 2);
});
test('v2 prior-day confined activity does not trigger the conditional quota', () => {
  const h = historyV2(); h[2] = v2Dive(dive(3, '2036-01-01T10:00:00.000Z', 9));
  assert.equal(evaluateV2(policyV2(), h, [confinedActivity('prior', '2035-12-31T04:00:00.000Z', '2035-12-31T05:00:00.000Z')]).complete, true);
});
test('v2 later confined activity does not retroactively trigger earlier OW quota', () => {
  const h = historyV2(); h[2] = v2Dive(dive(3, '2036-01-01T10:00:00.000Z', 9));
  assert.equal(evaluateV2(policyV2(), h, [confinedActivity('later', '2036-01-01T12:00:00.000Z', '2036-01-01T13:00:00.000Z')]).complete, true);
});
test('v2 conditional quota counts all preceding OW including before confined activity', () => {
  const h = historyV2(); h[2] = v2Dive(dive(3, '2036-01-01T10:00:00.000Z', 9));
  has(evaluateV2(policyV2(), h, [confinedActivity('middle', '2036-01-01T07:00:00.000Z', '2036-01-01T07:30:00.000Z')]), 'AFTER_CONFINED_DAILY_DIVE_LIMIT');
});
test('v2 natural confined water and pool both trigger source-configured conditional quota', () => {
  const p = policyV2(); p.dayLimits.afterConfinedWaterMaximumDives = 1;
  for (const env of ['POOL', 'CONFINED_WATER']) has(evaluateV2(p, historyV2(), [confinedActivity('c', undefined, undefined, env)]), 'AFTER_CONFINED_DAILY_DIVE_LIMIT');
});
test('v2 experience dives also count toward conditional quota', () => {
  const p = policyV2(); p.dayLimits.depthLimits = [];
  const h = historyV2(); h.splice(1, 0, v2Dive(experience('extra', '2036-01-01T07:00:00.000Z')));
  has(evaluateV2(p, h, [confinedActivity()]), 'AFTER_CONFINED_DAILY_DIVE_LIMIT');
});
test('v2 day condition uses explicit timezone rather than UTC calendar', () => {
  const p = policyV2(); p.dayLimits.afterConfinedWaterMaximumDives = 1; p.dayLimits.depthLimits = [];
  const h = [v2Dive(dive(1, '2036-01-01T21:00:00.000Z', 7)), v2Dive(dive(2, '2036-01-02T00:00:00.000Z', 11)), v2Dive(dive(3, '2036-01-03T00:00:00.000Z', 15))];
  const c = [confinedActivity('c', '2036-01-01T22:00:00.000Z', '2036-01-01T22:30:00.000Z')];
  has(evaluateV2(p, h, c), 'AFTER_CONFINED_DAILY_DIVE_LIMIT');
  p.timeZone = 'UTC'; assert.equal(evaluateV2(p, h, c).complete, true);
});
test('v2 overlap with confined activity blocks a qualifying dive', () => {
  has(evaluateV2(policyV2(), historyV2(), [confinedActivity('overlap', '2036-01-01T06:10:00.000Z', '2036-01-01T07:00:00.000Z')]), 'DIVE_OVERLAPS_CONFINED_ACTIVITY');
});
test('v2 exact adjacent confined/OW windows do not overlap', () => {
  assert.equal(evaluateV2(policyV2(), historyV2(), [confinedActivity('adjacent', '2036-01-01T05:00:00.000Z', '2036-01-01T06:00:00.000Z')]).complete, true);
});
for (const [name, change] of [
  ['unknown qualification key', p => { p.qualification.approved = true; }],
  ['missing alternative list', p => { delete p.qualification.alternatives; }],
  ['empty alternative list', p => { p.qualification.alternatives = []; }],
  ['duplicate alternative metric', p => { p.qualification.alternatives[1] = p.qualification.alternatives[0]; }],
  ['sparse alternatives', p => { delete p.qualification.alternatives[0]; }],
  ['unknown metric', p => { p.qualification.alternatives[0].metric = 'SESSION_MINUTES'; }],
  ['coerced metric', p => { p.qualification.alternatives[0].metric = { toString: () => 'SUBMERGED_SECONDS' }; }],
  ['zero metric threshold', p => { p.qualification.alternatives[0].minimum = 0; }],
  ['infinite gas threshold', p => { p.qualification.alternatives[1].minimum = Infinity; }],
  ['strict impossible percentage', p => { p.qualification.minimumPercentAtDepth = 100; }],
  ['fractional percentage', p => { p.qualification.minimumPercentAtDepth = 60.5; }],
  ['zero percentage', p => { p.qualification.minimumPercentAtDepth = 0; }],
  ['coerced comparison', p => { p.qualification.depthFractionComparison = { toString: () => 'MORE_THAN' }; }],
  ['shallower stage cap than minimum depth', p => { p.qualifyingDives[0].maximumDepthMetres = 2; }],
  ['shallower experience cap than minimum depth', p => { p.experienceLimits[0].maximumDepthMetres = 2; }],
  ['shallower daily cap than minimum depth', p => { p.dayLimits.depthLimits[0].maximumDepthMetres = 2; }],
  ['missing conditional cap', p => { delete p.dayLimits.afterConfinedWaterMaximumDives; }],
  ['conditional cap above general cap', p => { p.dayLimits.afterConfinedWaterMaximumDives = 4; }],
  ['v1 minute rule in v2', p => { p.qualifyingDives[0].minimumBottomMinutes = 20; }],
  ['unknown schema', p => { p.schemaVersion = 3; }]
]) test(`v2 rejects ${name}`, () => rejectsV2(change));
for (const [name, change] of [
  ['missing measurements', h => { delete h[0].qualificationEvidence; }],
  ['extra old bottom minutes', h => { h[0].bottomMinutes = 20; }],
  ['unknown measurement field', h => { h[0].qualificationEvidence.approved = true; }],
  ['missing gas evidence field', h => { delete h[0].qualificationEvidence.breathedGasLitres; }],
  ['wrong threshold depth', h => { h[0].qualificationEvidence.depthThresholdMetres = 2; }],
  ['submerged time exceeding window', h => { h[0].qualificationEvidence.submergedSeconds = 1801; }],
  ['negative submerged time', h => { h[0].qualificationEvidence.submergedSeconds = -1; }],
  ['fractional seconds', h => { h[0].qualificationEvidence.submergedSeconds = 1000.5; }],
  ['time at depth exceeding submerged time', h => { h[0].qualificationEvidence.secondsAtOrDeeperThanThreshold = 1201; }],
  ['positive time beyond actual maximum depth', h => { h[0].maximumDepthMetres = 2; }],
  ['negative gas volume', h => { h[0].qualificationEvidence.breathedGasLitres = -1; }],
  ['NaN gas volume', h => { h[0].qualificationEvidence.breathedGasLitres = NaN; }],
  ['string gas volume', h => { h[0].qualificationEvidence.breathedGasLitres = '1250'; }]
]) test(`v2 rejects ${name}`, () => rejectsV2(change, 'dives'));
for (const [name, change] of [
  ['wrong source hash', c => { c.push({ ...confinedActivity(), profileHash: OTHER }); }],
  ['future activity', c => { c.push(confinedActivity('future', '2036-01-05T04:00:00.000Z', '2036-01-05T05:00:00.000Z')); }],
  ['unknown environment', c => { c.push({ ...confinedActivity(), environment: 'OPEN_WATER' }); }],
  ['coerced environment', c => { c.push({ ...confinedActivity(), environment: { toString: () => 'POOL' } }); }],
  ['negative duration', c => { c.push(confinedActivity('bad', '2036-01-01T05:00:00.000Z', '2036-01-01T04:00:00.000Z')); }],
  ['cross-local-day activity', c => { c.push(confinedActivity('cross', '2036-01-01T20:30:00.000Z', '2036-01-01T21:30:00.000Z')); }],
  ['duplicate activity id', c => { c.push(confinedActivity(), confinedActivity()); }],
  ['id shared with OW dive', c => { c.push(confinedActivity('dive-1')); }],
  ['overlapping confined activities', c => { c.push(confinedActivity('a'), confinedActivity('b')); }],
  ['sparse confined array', c => { c.length = 1; }],
  ['unknown activity property', c => { c.push({ ...confinedActivity(), approved: true }); }]
]) test(`v2 rejects confined history with ${name}`, () => rejectsV2(change, 'confined'));

test('data-only boundary rejects changing comparison getter before invoking it', () => {
  const p = policyV2(); let calls = 0;
  Object.defineProperty(p.qualification, 'depthFractionComparison', { enumerable: true, get: () => ++calls <= 3 ? 'MORE_THAN' : 'UNSUPPORTED' });
  assert.throws(() => evaluateV2(p), DiveProgressionError); assert.equal(calls, 0);
});
test('schema-version accessor is rejected without executing it', () => {
  const p = policyV2(); let calls = 0;
  Object.defineProperty(p, 'schemaVersion', { enumerable: true, get: () => { calls++; return 2; } });
  assert.throws(() => evaluateV2(p), DiveProgressionError); assert.equal(calls, 0);
});
for (const field of ['metric', 'minimum']) test(`alternative ${field} accessor is rejected without execution`, () => {
  const p = policyV2(); let calls = 0;
  Object.defineProperty(p.qualification.alternatives[0], field, { enumerable: true, get: () => { calls++; return field === 'metric' ? 'SUBMERGED_SECONDS' : 960; } });
  assert.throws(() => evaluateV2(p), DiveProgressionError); assert.equal(calls, 0);
});
test('dense array getter is rejected without execution in both versions', () => {
  for (const p of [policy(), policyV2()]) {
    let calls = 0; const original = p.qualifyingDives[0];
    Object.defineProperty(p.qualifyingDives, 0, { enumerable: true, get: () => { calls++; return original; } });
    assert.throws(() => parseDiveProgressionPolicy(p), DiveProgressionError); assert.equal(calls, 0);
  }
});
test('confined evidence accessors cannot change validated timestamps or status', () => {
  const c = confinedActivity(); let calls = 0;
  Object.defineProperty(c, 'endsAt', { enumerable: true, get: () => { calls++; return '2036-01-01T05:00:00.000Z'; } });
  assert.throws(() => evaluateV2(policyV2(), historyV2(), [c]), DiveProgressionError); assert.equal(calls, 0);
});
test('dive enum getter and skill timestamp getter are rejected without invocation', () => {
  const h = historyV2(); let calls = 0;
  Object.defineProperty(h[0], 'kind', { enumerable: true, get: () => { calls++; return 'QUALIFYING'; } });
  assert.throws(() => evaluateV2(policyV2(), h), DiveProgressionError); assert.equal(calls, 0);
  const s = skills(); Object.defineProperty(s[0], 'completedAt', { enumerable: true, get: () => { calls++; return '2035-12-31T00:00:00.000Z'; } });
  assert.throws(() => evaluateV2(policyV2(), historyV2(), [], s), DiveProgressionError); assert.equal(calls, 0);
});
test('plain null-prototype data records remain supported', () => {
  const p = Object.assign(Object.create(null), policyV2()); assert.equal(evaluateV2(p).complete, true);
});
test('class instances, hidden extra keys and symbol keys cannot masquerade as records', () => {
  const p = policyV2(); Object.setPrototypeOf(p.qualification, { arbitrary: true }); assert.throws(() => evaluateV2(p), DiveProgressionError);
  const hidden = policyV2(); Object.defineProperty(hidden, 'approved', { value: true, enumerable: false }); assert.throws(() => evaluateV2(hidden), DiveProgressionError);
  const symbol = policyV2(); symbol[Symbol('approved')] = true; assert.throws(() => evaluateV2(symbol), DiveProgressionError);
});
test('non-data array additions do not override array methods', () => {
  const p = policyV2(); Object.defineProperty(p.qualifyingDives, 'map', { value: () => [], enumerable: false });
  assert.throws(() => evaluateV2(p), DiveProgressionError);
});
test('v2 inclusive 100-percent threshold accepts all time at minimum depth', () => {
  const p = policyV2(); p.qualification.minimumPercentAtDepth = 100; p.qualification.depthFractionComparison = 'AT_LEAST';
  const h = historyV2(); h.forEach(d => { d.qualificationEvidence.secondsAtOrDeeperThanThreshold = d.qualificationEvidence.submergedSeconds; });
  assert.equal(evaluateV2(p, h).complete, true);
});
test('v2 configured depth threshold and exact minimum-depth equality are used', () => {
  const p = policyV2(); p.qualification.minimumDepthMetres = 4;
  const h = historyV2(); h.forEach(d => { d.qualificationEvidence.depthThresholdMetres = 4; }); h[0].maximumDepthMetres = 4;
  assert.equal(evaluateV2(p, h).complete, true);
});
test('v2 bounded confined history refuses truncation or oversized data', () => {
  assert.throws(() => evaluateV2(policyV2(), historyV2(), Array.from({ length: 201 }, () => confinedActivity())), DiveProgressionError);
});
test('v2 rejected attempt cannot disappear when a later valid ordinal retry is supplied', () => {
  const h = historyV2(); const bad = structuredClone(h[0]); bad.id = 'rejected-attempt'; bad.startsAt = '2035-12-31T06:00:00.000Z'; bad.endsAt = '2035-12-31T06:30:00.000Z'; bad.qualificationEvidence.secondsAtOrDeeperThanThreshold = 0;
  const r = evaluateV2(policyV2(), [bad, ...h]); assert.equal(r.completedQualifyingDives, 3); assert.equal(r.complete, false); has(r, 'DIVE_DEPTH_TIME_REQUIRED');
});
