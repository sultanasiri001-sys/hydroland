/** Pure candidate only. Callers must authenticate and verify every source/evidence record.
 * No agency defaults, persistence, source approval, certificate, or production authorization. */
export type DiveProgressionPolicy = {
  schemaVersion: 1;
  profileHash: string;
  timeZone: string;
  qualifyingDives: Array<{ number: number; minimumBottomMinutes: number; maximumDepthMetres: number; requiredSkillCodesBeforeDive: string[] }>;
  experienceLimits: Array<{ afterQualifyingDive: number; minimumBottomMinutes: number; maximumDepthMetres: number }>;
  dayLimits: { maximumDives: number; depthLimits: Array<{ diveOfDay: number; maximumDepthMetres: number }> };
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
export type VerifiedPreDiveSkill = { code: string; profileHash: string; completedAt: string };
export type DiveProgressionViolation = { code: string; diveId: string };
export class DiveProgressionError extends Error {
  readonly code = 'INVALID_DIVE_PROGRESSION_INPUT';
}
function invalid(): never { throw new DiveProgressionError('Dive progression policy or evidence is incomplete or invalid.'); }
function object(value: unknown, allowed: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some(key => !allowed.includes(key)) || allowed.some(key => !Object.hasOwn(row, key))) invalid();
  return row;
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
  if (!Array.isArray(value) || value.length > maximum) return invalid();
  // These unknown-input APIs can also be called directly, outside a JSON parser.
  // Sparse arrays must not skip required rules or proof during map/some/filter.
  if (Object.keys(value).length !== value.length || Array.from({ length: value.length }, (_, index) => index).some(index => !Object.hasOwn(value, index))) invalid();
  return value;
}
function unique(values: Array<string | number>) { if (new Set(values).size !== values.length) invalid(); }
function timestamp(value: unknown): number {
  // Require explicit UTC and reject JavaScript's normalization of impossible dates.
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return invalid();
  const time = Date.parse(value), normalized = value.includes('.') ? value : value.replace('Z', '.000Z');
  if (!Number.isFinite(time) || new Date(time).toISOString() !== normalized) return invalid();
  return time;
}
export function parseDiveProgressionPolicy(value: unknown): DiveProgressionPolicy {
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
function parseDive(value: unknown): VerifiedDiveEvidence {
  const row = object(value, ['id', 'profileHash', 'kind', 'qualifyingNumber', 'startsAt', 'endsAt', 'bottomMinutes', 'maximumDepthMetres']);
  if (row.kind !== 'QUALIFYING' && row.kind !== 'EXPERIENCE') invalid();
  const qualifyingNumber = row.kind === 'QUALIFYING' ? integer(row.qualifyingNumber, 1, 200) : null;
  if (row.kind === 'EXPERIENCE' && row.qualifyingNumber !== null) invalid();
  const start = timestamp(row.startsAt), end = timestamp(row.endsAt), bottomMinutes = integer(row.bottomMinutes, 1, 1440);
  if (end <= start || bottomMinutes * 60000 > end - start) invalid();
  return { id: string(row.id), profileHash: hash(row.profileHash), kind: row.kind as VerifiedDiveEvidence['kind'], qualifyingNumber, startsAt: row.startsAt as string, endsAt: row.endsAt as string, bottomMinutes, maximumDepthMetres: depth(row.maximumDepthMetres) };
}
function parseSkill(value: unknown): VerifiedPreDiveSkill {
  const row = object(value, ['code', 'profileHash', 'completedAt']);
  timestamp(row.completedAt);
  return { code: string(row.code), profileHash: hash(row.profileHash), completedAt: row.completedAt as string };
}

/** Evaluate complete verified history, never a user-selected subset.
 * The caller must also apply age, supervision, conditions, official forms, and all
 * other programme rules. Matching an input hash is NOT independent source approval. */
export function evaluateDiveProgression(policyInput: unknown, diveInput: unknown, skillInput: unknown, asOf: string) {
  const policy = parseDiveProgressionPolicy(policyInput), now = timestamp(asOf);
  const dives = list(diveInput).map(parseDive).sort((a, b) => timestamp(a.startsAt) - timestamp(b.startsAt) || a.id.localeCompare(b.id));
  const skills = list(skillInput, 2000).map(parseSkill);
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: policy.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const calendarDay = (value: string) => formatter.format(new Date(value));
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
    const dailyDepth = policy.dayLimits.depthLimits.find(row => row.diveOfDay === diveOfDay)?.maximumDepthMetres;
    if (dailyDepth !== undefined && dive.maximumDepthMetres > dailyDepth) reject('DAILY_DIVE_DEPTH');
    const rule = dive.kind === 'QUALIFYING'
      ? policy.qualifyingDives.find(row => row.number === dive.qualifyingNumber)
      : policy.experienceLimits.find(row => row.afterQualifyingDive === completedQualifyingDives);
    if (!rule) reject(dive.kind === 'QUALIFYING' ? 'QUALIFYING_DIVE_NOT_COVERED' : 'EXPERIENCE_DIVE_NOT_COVERED');
    if (dive.kind === 'QUALIFYING' && dive.qualifyingNumber !== completedQualifyingDives + 1) reject('DIVE_SEQUENCE_REQUIRED');
    if (rule) {
      if (dive.maximumDepthMetres > rule.maximumDepthMetres) reject('PROGRESSION_DEPTH');
      if (dive.bottomMinutes < rule.minimumBottomMinutes) reject('DIVE_BOTTOM_TIME');
      if ('requiredSkillCodesBeforeDive' in rule && rule.requiredSkillCodesBeforeDive.some(code => !skills.some(skill => skill.code === code && skill.profileHash === policy.profileHash && timestamp(skill.completedAt) <= start))) reject('PRE_DIVE_SKILL_REQUIRED');
    }
    // A rejected dive cannot advance the stage or qualify a later deeper dive.
    if (dive.kind === 'QUALIFYING' && violations.length === initialViolations) completedQualifyingDives++;
  }
  const missingQualifyingNumbers = policy.qualifyingDives.filter(row => row.number > completedQualifyingDives).map(row => row.number);
  return { complete: violations.length === 0 && missingQualifyingNumbers.length === 0, completedQualifyingDives, missingQualifyingNumbers, violations, productionAuthorized: false as const };
}
