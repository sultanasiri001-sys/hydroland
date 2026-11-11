/** Pure candidate only. Callers must authenticate and verify every source/evidence record.
 * No agency defaults, persistence, source approval, certificate, or production authorization. */
export type DiveProgressionPolicyV1 = {
  schemaVersion: 1;
  profileHash: string;
  timeZone: string;
  qualifyingDives: Array<{ number: number; minimumBottomMinutes: number; maximumDepthMetres: number; requiredSkillCodesBeforeDive: string[] }>;
  experienceLimits: Array<{ afterQualifyingDive: number; minimumBottomMinutes: number; maximumDepthMetres: number }>;
  dayLimits: { maximumDives: number; depthLimits: Array<{ diveOfDay: number; maximumDepthMetres: number }> };
};
export type DiveQualificationRule = {
  minimumDepthMetres: number;
  minimumPercentAtDepth: number;
  depthFractionComparison: 'AT_LEAST' | 'MORE_THAN';
  alternatives: Array<{ metric: 'SUBMERGED_SECONDS' | 'BREATHED_GAS_LITRES'; minimum: number }>;
};
export type DiveProgressionPolicyV2 = {
  schemaVersion: 2;
  profileHash: string;
  timeZone: string;
  qualification: DiveQualificationRule;
  qualifyingDives: Array<{ number: number; maximumDepthMetres: number; requiredSkillCodesBeforeDive: string[] }>;
  experienceLimits: Array<{ afterQualifyingDive: number; maximumDepthMetres: number }>;
  dayLimits: { maximumDives: number; depthLimits: Array<{ diveOfDay: number; maximumDepthMetres: number }>; afterConfinedWaterMaximumDives: number };
};
export type DiveProgressionPolicy = DiveProgressionPolicyV1 | DiveProgressionPolicyV2;
export type VerifiedQualificationEvidence = {
  submergedSeconds: number;
  depthThresholdMetres: number;
  secondsAtOrDeeperThanThreshold: number;
  breathedGasLitres: number | null;
};
export type VerifiedConfinedActivity = {
  id: string;
  profileHash: string;
  environment: 'POOL' | 'CONFINED_WATER';
  startsAt: string;
  endsAt: string;
};
export type VerifiedDiveEvidence = {
  id: string;
  profileHash: string;
  kind: 'QUALIFYING' | 'EXPERIENCE';
  qualifyingNumber: number | null;
  startsAt: string;
  endsAt: string;
  bottomMinutes: number;
  maximumDepthMetres: number;
};
export type VerifiedDiveEvidenceV2 = Omit<VerifiedDiveEvidence, 'bottomMinutes'> & { qualificationEvidence: VerifiedQualificationEvidence };
type AnyVerifiedDive = VerifiedDiveEvidence | VerifiedDiveEvidenceV2;
export type VerifiedPreDiveSkill = { code: string; profileHash: string; completedAt: string };
export type DiveProgressionViolation = { code: string; diveId: string };
export class DiveProgressionError extends Error {
  readonly code = 'INVALID_DIVE_PROGRESSION_INPUT';
}
function invalid(): never { throw new DiveProgressionError('Dive progression policy or evidence is incomplete or invalid.'); }
function object(value: unknown, allowed: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) invalid();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.length !== allowed.length || keys.some(key => typeof key !== 'string' || !allowed.includes(key))) invalid();
  // Reject executable accessors and capture data once. This also avoids enum/hash
  // validation and subsequent construction observing different getter values.
  const snapshot: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of allowed) {
    const descriptor = descriptors[key];
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) invalid();
    snapshot[key] = descriptor.value;
  }
  return snapshot;
}
function integer(value: unknown, minimum: number, maximum: number): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) return invalid();
  return value as number;
}
function string(value: unknown, maximum = 100): string {
  if (typeof value !== 'string' || !value.length || value !== value.trim() || value.length > maximum) return invalid();
  return value;
}
function hash(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) return invalid();
  return value;
}
function depth(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 200) return invalid();
  return value;
}
function list(value: unknown, maximum = 200): unknown[] {
  if (!Array.isArray(value) || value.length > maximum || Object.getPrototypeOf(value) !== Array.prototype) return invalid();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== value.length + 1) invalid();
  const snapshot: unknown[] = [];
  for (let index = 0; index < value.length; index++) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) invalid();
    snapshot.push(descriptor.value);
  }
  return snapshot;
}
function unique(values: Array<string | number>) { if (new Set(values).size !== values.length) invalid(); }
function timestamp(value: unknown): number {
  // Require explicit UTC and reject JavaScript's normalization of impossible dates.
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return invalid();
  const time = Date.parse(value), normalized = value.includes('.') ? value : value.replace('Z', '.000Z');
  if (!Number.isFinite(time) || new Date(time).toISOString() !== normalized) return invalid();
  return time;
}
function parsePolicyV1(value: unknown): DiveProgressionPolicyV1 {
  const input = object(value, ['schemaVersion', 'profileHash', 'timeZone', 'qualifyingDives', 'experienceLimits', 'dayLimits']);
  if (input.schemaVersion !== 1) invalid();
  const timeZone = string(input.timeZone);
  try { new Intl.DateTimeFormat('en-CA', { timeZone }).format(0); } catch { invalid(); }
  const qualifyingDives = list(input.qualifyingDives).map((value, index) => {
    const row = object(value, ['number', 'minimumBottomMinutes', 'maximumDepthMetres', 'requiredSkillCodesBeforeDive']);
    const number = integer(row.number, 1, 200);
    if (number !== index + 1) invalid();
    const requiredSkillCodesBeforeDive = list(row.requiredSkillCodesBeforeDive).map(value => string(value));
    unique(requiredSkillCodesBeforeDive);
    return { number, minimumBottomMinutes: integer(row.minimumBottomMinutes, 1, 1440), maximumDepthMetres: depth(row.maximumDepthMetres), requiredSkillCodesBeforeDive };
  });
  if (!qualifyingDives.length) invalid();
  const experienceLimits = list(input.experienceLimits).map(value => {
    const row = object(value, ['afterQualifyingDive', 'minimumBottomMinutes', 'maximumDepthMetres']);
    return { afterQualifyingDive: integer(row.afterQualifyingDive, 0, qualifyingDives.length), minimumBottomMinutes: integer(row.minimumBottomMinutes, 1, 1440), maximumDepthMetres: depth(row.maximumDepthMetres) };
  });
  unique(experienceLimits.map(row => row.afterQualifyingDive));
  const daily = object(input.dayLimits, ['maximumDives', 'depthLimits']);
  const maximumDives = integer(daily.maximumDives, 1, 200);
  const depthLimits = list(daily.depthLimits).map(value => {
    const row = object(value, ['diveOfDay', 'maximumDepthMetres']);
    return { diveOfDay: integer(row.diveOfDay, 1, maximumDives), maximumDepthMetres: depth(row.maximumDepthMetres) };
  });
  unique(depthLimits.map(row => row.diveOfDay));
  return { schemaVersion: 1, profileHash: hash(input.profileHash), timeZone, qualifyingDives, experienceLimits, dayLimits: { maximumDives, depthLimits } };
}
function amount(value: unknown, maximum: number, minimum = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) invalid();
  return value;
}
export function parseDiveProgressionPolicy(value: unknown): DiveProgressionPolicy {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
  const version = Object.getOwnPropertyDescriptor(value, 'schemaVersion');
  if (!version || !Object.hasOwn(version, 'value')) invalid();
  if (version.value === 1) return parsePolicyV1(value);
  const input = object(value, ['schemaVersion', 'profileHash', 'timeZone', 'qualification', 'qualifyingDives', 'experienceLimits', 'dayLimits']);
  if (input.schemaVersion !== 2) invalid();
  const rawQualification = object(input.qualification, ['minimumDepthMetres', 'minimumPercentAtDepth', 'depthFractionComparison', 'alternatives']);
  if (rawQualification.depthFractionComparison !== 'AT_LEAST' && rawQualification.depthFractionComparison !== 'MORE_THAN') invalid();
  const minimumDepthMetres = depth(rawQualification.minimumDepthMetres);
  const minimumPercentAtDepth = integer(rawQualification.minimumPercentAtDepth, 1, 100);
  if (rawQualification.depthFractionComparison === 'MORE_THAN' && minimumPercentAtDepth === 100) invalid();
  const alternatives = list(rawQualification.alternatives, 2).map(value => {
    const rule = object(value, ['metric', 'minimum']);
    if (rule.metric !== 'SUBMERGED_SECONDS' && rule.metric !== 'BREATHED_GAS_LITRES') invalid();
    return { metric: rule.metric as 'SUBMERGED_SECONDS' | 'BREATHED_GAS_LITRES', minimum: rule.metric === 'SUBMERGED_SECONDS' ? integer(rule.minimum, 1, 86400) : amount(rule.minimum, 1000000, Number.MIN_VALUE) };
  });
  if (!alternatives.length) invalid();
  unique(alternatives.map(rule => rule.metric));
  // Reuse v1 shape/sequence/timezone validation, not its qualifying-minute rule.
  // The temporary minimum of 1 is parser scaffolding only; v2 evaluation never uses it.
  const qualify = list(input.qualifyingDives).map(value => {
    const row = object(value, ['number', 'maximumDepthMetres', 'requiredSkillCodesBeforeDive']);
    return { ...row, minimumBottomMinutes: 1 };
  });
  const experience = list(input.experienceLimits).map(value => {
    const row = object(value, ['afterQualifyingDive', 'maximumDepthMetres']);
    return { ...row, minimumBottomMinutes: 1 };
  });
  const daily = object(input.dayLimits, ['maximumDives', 'depthLimits', 'afterConfinedWaterMaximumDives']);
  const baseline = parsePolicyV1({ schemaVersion: 1, profileHash: input.profileHash, timeZone: input.timeZone, qualifyingDives: qualify, experienceLimits: experience, dayLimits: { maximumDives: daily.maximumDives, depthLimits: daily.depthLimits } });
  const afterConfinedWaterMaximumDives = integer(daily.afterConfinedWaterMaximumDives, 1, baseline.dayLimits.maximumDives);
  const caps = [...baseline.qualifyingDives, ...baseline.experienceLimits, ...baseline.dayLimits.depthLimits];
  if (caps.some(rule => rule.maximumDepthMetres < minimumDepthMetres)) invalid();
  return {
    schemaVersion: 2, profileHash: baseline.profileHash, timeZone: baseline.timeZone,
    qualification: { minimumDepthMetres, minimumPercentAtDepth, depthFractionComparison: rawQualification.depthFractionComparison, alternatives },
    qualifyingDives: baseline.qualifyingDives.map(rule => ({ number: rule.number, maximumDepthMetres: rule.maximumDepthMetres, requiredSkillCodesBeforeDive: rule.requiredSkillCodesBeforeDive })),
    experienceLimits: baseline.experienceLimits.map(rule => ({ afterQualifyingDive: rule.afterQualifyingDive, maximumDepthMetres: rule.maximumDepthMetres })),
    dayLimits: { ...baseline.dayLimits, afterConfinedWaterMaximumDives }
  };
}
function parseQualificationEvidence(value: unknown, elapsedMilliseconds: number, maximumDepthMetres: number, qualification: DiveQualificationRule): VerifiedQualificationEvidence {
  const row = object(value, ['submergedSeconds', 'depthThresholdMetres', 'secondsAtOrDeeperThanThreshold', 'breathedGasLitres']);
  const submergedSeconds = integer(row.submergedSeconds, 1, 86400);
  if (submergedSeconds * 1000 > elapsedMilliseconds) invalid();
  const depthThresholdMetres = depth(row.depthThresholdMetres);
  if (depthThresholdMetres !== qualification.minimumDepthMetres) invalid();
  const secondsAtOrDeeperThanThreshold = integer(row.secondsAtOrDeeperThanThreshold, 0, submergedSeconds);
  if (secondsAtOrDeeperThanThreshold > 0 && maximumDepthMetres < depthThresholdMetres) invalid();
  const breathedGasLitres = row.breathedGasLitres === null ? null : amount(row.breathedGasLitres, 1000000);
  return { submergedSeconds, depthThresholdMetres, secondsAtOrDeeperThanThreshold, breathedGasLitres };
}
function parseConfinedActivity(value: unknown, policy: DiveProgressionPolicyV2, now: number): VerifiedConfinedActivity {
  const row = object(value, ['id', 'profileHash', 'environment', 'startsAt', 'endsAt']);
  if (row.environment !== 'POOL' && row.environment !== 'CONFINED_WATER') invalid();
  const start = timestamp(row.startsAt), end = timestamp(row.endsAt);
  if (end <= start || end > now || hash(row.profileHash) !== policy.profileHash) invalid();
  return { id: string(row.id), profileHash: row.profileHash as string, environment: row.environment, startsAt: row.startsAt as string, endsAt: row.endsAt as string };
}
function parseDive(value: unknown, policy: DiveProgressionPolicy): AnyVerifiedDive {
  const row = object(value, ['id', 'profileHash', 'kind', 'qualifyingNumber', 'startsAt', 'endsAt', 'maximumDepthMetres', policy.schemaVersion === 1 ? 'bottomMinutes' : 'qualificationEvidence']);
  if (row.kind !== 'QUALIFYING' && row.kind !== 'EXPERIENCE') invalid();
  const qualifyingNumber = row.kind === 'QUALIFYING' ? integer(row.qualifyingNumber, 1, 200) : null;
  if (row.kind === 'EXPERIENCE' && row.qualifyingNumber !== null) invalid();
  const start = timestamp(row.startsAt), end = timestamp(row.endsAt);
  if (end <= start) invalid();
  const common = { id: string(row.id), profileHash: hash(row.profileHash), kind: row.kind as VerifiedDiveEvidence['kind'], qualifyingNumber, startsAt: row.startsAt as string, endsAt: row.endsAt as string, maximumDepthMetres: depth(row.maximumDepthMetres) };
  if (policy.schemaVersion === 2) return { ...common, qualificationEvidence: parseQualificationEvidence(row.qualificationEvidence, end - start, common.maximumDepthMetres, policy.qualification) };
  const bottomMinutes = integer(row.bottomMinutes, 1, 1440);
  if (bottomMinutes * 60000 > end - start) invalid();
  return { ...common, bottomMinutes };
}
function parseSkill(value: unknown): VerifiedPreDiveSkill {
  const row = object(value, ['code', 'profileHash', 'completedAt']);
  timestamp(row.completedAt);
  return { code: string(row.code), profileHash: hash(row.profileHash), completedAt: row.completedAt as string };
}

/** Evaluate complete verified history, never a user-selected subset.
 * The caller must also apply age, supervision, conditions, official forms, and all
 * other programme rules. Matching an input hash is NOT independent source approval. */
export function evaluateDiveProgression(policyInput: unknown, diveInput: unknown, skillInput: unknown, asOf: string, confinedActivityInput?: unknown) {
  const policy = parseDiveProgressionPolicy(policyInput), now = timestamp(asOf);
  const dives = list(diveInput).map(value => parseDive(value, policy)).sort((a, b) => timestamp(a.startsAt) - timestamp(b.startsAt) || a.id.localeCompare(b.id));
  const skills = list(skillInput, 2000).map(parseSkill);
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: policy.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const calendarDay = (value: string) => formatter.format(new Date(value));
  if (policy.schemaVersion === 1 && confinedActivityInput !== undefined) invalid();
  // v2 requires an explicit complete, caller-verified confined history, even if empty.
  const confined = policy.schemaVersion === 2 ? list(confinedActivityInput).map(value => parseConfinedActivity(value, policy, now)).sort((a, b) => timestamp(a.startsAt) - timestamp(b.startsAt)) : [];
  unique(confined.map(activity => activity.id));
  for (let i = 0; i < confined.length; i++) {
    const activity = confined[i];
    if (calendarDay(activity.startsAt) !== calendarDay(activity.endsAt) || (i > 0 && timestamp(activity.startsAt) < timestamp(confined[i - 1].endsAt)) || dives.some(dive => dive.id === activity.id)) invalid();
  }
  const violations: DiveProgressionViolation[] = [];
  const ids = new Set<string>(), counts = new Map<string, number>();
  let completedQualifyingDives = 0, previousEnd = -Infinity;
  for (const dive of dives) {
    const initialViolations = violations.length, start = timestamp(dive.startsAt), end = timestamp(dive.endsAt);
    const reject = (code: string) => violations.push({ code, diveId: dive.id });
    if (ids.has(dive.id)) reject('DUPLICATE_DIVE_ID');
    ids.add(dive.id);
    if (dive.profileHash !== policy.profileHash) reject('DIVE_PROFILE_MISMATCH');
    if (end > now) reject('DIVE_IN_FUTURE');
    if (start < previousEnd) reject('OVERLAPPING_DIVES');
    previousEnd = Math.max(previousEnd, end);
    const day = calendarDay(dive.startsAt), diveOfDay = (counts.get(day) || 0) + 1;
    counts.set(day, diveOfDay);
    // Cross-midnight evidence needs an explicit source-specific treatment; do not
    // split one dive into two days to obtain a larger quota or depth allowance.
    if (day !== calendarDay(dive.endsAt)) reject('DIVE_CROSSES_LOCAL_DAY');
    if (diveOfDay > policy.dayLimits.maximumDives) reject('DAILY_DIVE_LIMIT');
    if (policy.schemaVersion === 2) {
      if (confined.some(activity => timestamp(activity.startsAt) < end && start < timestamp(activity.endsAt))) reject('DIVE_OVERLAPS_CONFINED_ACTIVITY');
      const followsConfined = confined.some(activity => calendarDay(activity.endsAt) === day && timestamp(activity.endsAt) <= start);
      if (followsConfined && diveOfDay > policy.dayLimits.afterConfinedWaterMaximumDives) reject('AFTER_CONFINED_DAILY_DIVE_LIMIT');
      const evidence = (dive as VerifiedDiveEvidenceV2).qualificationEvidence, qualification = policy.qualification;
      if (dive.maximumDepthMetres < qualification.minimumDepthMetres) reject('DIVE_MINIMUM_DEPTH');
      const observed = evidence.secondsAtOrDeeperThanThreshold * 100, required = evidence.submergedSeconds * qualification.minimumPercentAtDepth;
      if (qualification.depthFractionComparison === 'MORE_THAN' ? observed <= required : observed < required) reject('DIVE_DEPTH_TIME_REQUIRED');
      if (!qualification.alternatives.some(rule => {
        const value = rule.metric === 'SUBMERGED_SECONDS' ? evidence.submergedSeconds : evidence.breathedGasLitres;
        return value !== null && value >= rule.minimum;
      })) reject('DIVE_QUALIFICATION_ALTERNATIVE_REQUIRED');
    }
    const dailyDepth = policy.dayLimits.depthLimits.find(row => row.diveOfDay === diveOfDay)?.maximumDepthMetres;
    if (dailyDepth !== undefined && dive.maximumDepthMetres > dailyDepth) reject('DAILY_DIVE_DEPTH');
    const rule = dive.kind === 'QUALIFYING'
      ? policy.qualifyingDives.find(row => row.number === dive.qualifyingNumber)
      : policy.experienceLimits.find(row => row.afterQualifyingDive === completedQualifyingDives);
    if (!rule) reject(dive.kind === 'QUALIFYING' ? 'QUALIFYING_DIVE_NOT_COVERED' : 'EXPERIENCE_DIVE_NOT_COVERED');
    if (dive.kind === 'QUALIFYING' && dive.qualifyingNumber !== completedQualifyingDives + 1) reject('DIVE_SEQUENCE_REQUIRED');
    if (rule) {
      if (dive.maximumDepthMetres > rule.maximumDepthMetres) reject('PROGRESSION_DEPTH');
      if ('bottomMinutes' in dive && 'minimumBottomMinutes' in rule && typeof rule.minimumBottomMinutes === 'number' && dive.bottomMinutes < rule.minimumBottomMinutes) reject('DIVE_BOTTOM_TIME');
      if ('requiredSkillCodesBeforeDive' in rule && rule.requiredSkillCodesBeforeDive.some(code => !skills.some(skill => skill.code === code && skill.profileHash === policy.profileHash && timestamp(skill.completedAt) <= start))) reject('PRE_DIVE_SKILL_REQUIRED');
    }
    // A rejected dive cannot advance the stage or qualify a later deeper dive.
    if (dive.kind === 'QUALIFYING' && violations.length === initialViolations) completedQualifyingDives++;
  }
  const missingQualifyingNumbers = policy.qualifyingDives.filter(row => row.number > completedQualifyingDives).map(row => row.number);
  return { complete: violations.length === 0 && missingQualifyingNumbers.length === 0, completedQualifyingDives, missingQualifyingNumbers, violations, productionAuthorized: false as const };
}
