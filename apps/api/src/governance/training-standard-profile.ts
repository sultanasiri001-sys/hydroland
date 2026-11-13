import { createHash } from 'node:crypto';

/** An agency's reviewed programme, not a universal ISO-to-agency substitution. */
export type TrainingStandardProfile = {
  agencyCode: string;
  programCode: string;
  level: string;
  edition: string;
  sources: Array<{ authority: 'AGENCY' | 'ISO' | 'SAUDI'; reference: string; edition: string; locator: string }>;
  requirements: {
    minimumAge: number;
    minimumCompletedSessions: number;
    minimumOpenWaterDives: number;
    minimumOpenWaterMinutes: number;
    // Source-reviewed individual dive requirements. Absence preserves legacy hashes,
    // and is not a declaration that a source needs no progression rules.
    openWaterDiveRequirements?: Array<{ sequence: number; minimumBottomMinutes: number; maximumDepthMetres: number }>;
    instructorCredentialTitles: string[];
    prerequisites: Array<{ issuer: string; title: string }>;
    requiredSkillCodes: string[];
    requiredFormCodes: string[];
    supervision: Array<{
      environment: 'POOL' | 'CONFINED_WATER' | 'OPEN_WATER';
      minimumAge: number;
      maximumAge: number;
      studentsPerInstructor: number;
      maximumDepthMetres: number;
    }>;
  };
};

export class TrainingStandardError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(message); this.name = 'TrainingStandardError'; this.code = code; }
}
function fail(code: string, message: string): never { throw new TrainingStandardError(code, message); }
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('INVALID_STANDARD', 'بيانات معيار التدريب غير صالحة.');
  return value as Record<string, unknown>;
};
function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some(key => !allowed.includes(key))) fail('INVALID_STANDARD', 'حقول معيار التدريب غير معروفة.');
}
function text(value: unknown, maximum = 200): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maximum) return fail('INVALID_STANDARD', 'مرجع أو إصدار معيار التدريب ناقص.');
  return value.trim();
}
function integer(value: unknown, maximum: number, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) return fail('INVALID_STANDARD', 'حدود معيار التدريب غير صالحة.');
  return value as number;
}
function strings(value: unknown, required = false): string[] {
  if (!Array.isArray(value) || value.length > 200 || (required && !value.length)) return fail('INVALID_STANDARD', 'قائمة متطلبات معيار التدريب ناقصة.');
  const result = value.map(item => text(item));
  if (new Set(result).size !== result.length) fail('INVALID_STANDARD', 'متطلبات معيار التدريب مكررة.');
  return result;
}
export function parseTrainingStandard(value: unknown): TrainingStandardProfile {
  const input = object(value);
  keys(input, ['agencyCode', 'programCode', 'level', 'edition', 'sources', 'requirements']);
  const agencyCode = text(input.agencyCode, 32).toUpperCase(), programCode = text(input.programCode, 80);
  if (!/^[A-Z0-9][A-Z0-9_-]{1,31}$/.test(agencyCode)) fail('INVALID_STANDARD', 'رمز المنظمة غير صالح.');
  if (!Array.isArray(input.sources) || !input.sources.length || input.sources.length > 30) fail('SOURCE_REQUIRED', 'أرفق مراجع المنظمة والانطباق قبل الاعتماد.');
  const sources = (input.sources as unknown[]).map(item => {
    const source = object(item); keys(source, ['authority', 'reference', 'edition', 'locator']);
    if (!['AGENCY', 'ISO', 'SAUDI'].includes(String(source.authority))) fail('INVALID_STANDARD', 'نوع مصدر المعيار غير صالح.');
    return { authority: source.authority as 'AGENCY' | 'ISO' | 'SAUDI', reference: text(source.reference, 1000), edition: text(source.edition, 80), locator: text(source.locator, 1000) };
  });
  if (!sources.some(source => source.authority === 'AGENCY')) fail('AGENCY_SOURCE_REQUIRED', 'مرجع ISO وحده لا يثبت تفاصيل برنامج المنظمة.');
  const requirements = object(input.requirements);
  keys(requirements, ['minimumAge', 'minimumCompletedSessions', 'minimumOpenWaterDives', 'minimumOpenWaterMinutes', 'instructorCredentialTitles', 'prerequisites', 'requiredSkillCodes', 'requiredFormCodes', 'supervision', 'openWaterDiveRequirements']);
  if (!Array.isArray(requirements.prerequisites) || requirements.prerequisites.length > 50) fail('INVALID_STANDARD', 'متطلبات الالتحاق ناقصة.');
  const prerequisites = (requirements.prerequisites as unknown[]).map(item => {
    const prerequisite = object(item); keys(prerequisite, ['issuer', 'title']);
    return { issuer: text(prerequisite.issuer, 100).toUpperCase(), title: text(prerequisite.title) };
  });
  if (!Array.isArray(requirements.supervision) || !requirements.supervision.length || requirements.supervision.length > 30) fail('INVALID_STANDARD', 'حدود الإشراف حسب العمر والبيئة مطلوبة.');
  const supervision = (requirements.supervision as unknown[]).map(item => {
    const band = object(item); keys(band, ['environment', 'minimumAge', 'maximumAge', 'studentsPerInstructor', 'maximumDepthMetres']);
    if (!['POOL', 'CONFINED_WATER', 'OPEN_WATER'].includes(String(band.environment))) fail('INVALID_STANDARD', 'بيئة التدريب غير صالحة.');
    const minimumAge = integer(band.minimumAge, 120), maximumAge = integer(band.maximumAge, 120);
    if (maximumAge < minimumAge) fail('INVALID_STANDARD', 'نطاق العمر معكوس.');
    if (typeof band.maximumDepthMetres !== 'number' || !Number.isFinite(band.maximumDepthMetres) || band.maximumDepthMetres < 0 || band.maximumDepthMetres > 200) fail('INVALID_STANDARD', 'حد العمق غير صالح.');
    return { environment: band.environment as 'POOL' | 'CONFINED_WATER' | 'OPEN_WATER', minimumAge, maximumAge, studentsPerInstructor: integer(band.studentsPerInstructor, 100, 1), maximumDepthMetres: band.maximumDepthMetres as number };
  });
  let openWaterDiveRequirements: TrainingStandardProfile['requirements']['openWaterDiveRequirements'];
  if (requirements.openWaterDiveRequirements !== undefined) {
    const rows = requirements.openWaterDiveRequirements;
    if (!Array.isArray(rows) || !rows.length || rows.length > 200 || rows.length !== requirements.minimumOpenWaterDives) fail('INVALID_STANDARD', 'متطلبات الغوصات الفردية يجب أن تغطي جميع غوصات البرنامج.');
    openWaterDiveRequirements = rows.map((item, index) => {
      const row = object(item); keys(row, ['sequence', 'minimumBottomMinutes', 'maximumDepthMetres']);
      if (row.sequence !== index + 1) fail('INVALID_STANDARD', 'ترتيب متطلبات الغوصات يجب أن يكون متصلاً وفريدًا.');
      if (typeof row.maximumDepthMetres !== 'number' || !Number.isFinite(row.maximumDepthMetres) || row.maximumDepthMetres <= 0 || row.maximumDepthMetres > 200) fail('INVALID_STANDARD', 'حد عمق الغوصة الفردية غير صالح.');
      return { sequence: index + 1, minimumBottomMinutes: integer(row.minimumBottomMinutes, 1440, 1), maximumDepthMetres: row.maximumDepthMetres };
    });
  }
  return { agencyCode, programCode, level: text(input.level, 80), edition: text(input.edition, 80), sources,
    requirements: { ...(openWaterDiveRequirements ? { openWaterDiveRequirements } : {}), minimumAge: integer(requirements.minimumAge, 120), minimumCompletedSessions: integer(requirements.minimumCompletedSessions, 10000), minimumOpenWaterDives: integer(requirements.minimumOpenWaterDives, 10000), minimumOpenWaterMinutes: integer(requirements.minimumOpenWaterMinutes, 100000), instructorCredentialTitles: strings(requirements.instructorCredentialTitles, true), prerequisites, requiredSkillCodes: strings(requirements.requiredSkillCodes, true), requiredFormCodes: strings(requirements.requiredFormCodes), supervision } };
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical((value as Record<string, unknown>)[key])).join(',') + '}';
  return JSON.stringify(value);
}
export const trainingStandardHash = (profile: TrainingStandardProfile) => createHash('sha256').update(canonical(parseTrainingStandard(profile))).digest('hex');
export type TrainingStandardBinding = { profileId: string; profileHash: string; agencyCode: string; programCode: string; level: string; edition: string };
export function trainingStandardBinding(profileId: string, profile: TrainingStandardProfile): TrainingStandardBinding {
  return { profileId, profileHash: trainingStandardHash(profile), agencyCode: profile.agencyCode, programCode: profile.programCode, level: profile.level, edition: profile.edition };
}
export function assertTrainingStandardBinding(binding: TrainingStandardBinding | undefined, id: string, profile: TrainingStandardProfile, courseCode: string) {
  if (!binding) fail('STANDARD_SELECTION_REQUIRED', 'اختر المنظمة وبرنامجًا بإصدار معتمد قبل بدء التدريب.');
  const expected = trainingStandardBinding(id, profile);
  if (Object.entries(expected).some(([key, value]) => binding![key as keyof TrainingStandardBinding] !== value) || courseCode !== profile.programCode) fail('STANDARD_BINDING_MISMATCH', 'تغير المعيار أو لا يطابق برنامج الدورة؛ يلزم مراجعة موثقة.');
}
export type VerifiedTrainingCredential = { issuer: string; title: string; verificationStatus: string; issuedAt: Date | null; expiresAt: Date | null };
export function hasTrainingCredential(credentials: VerifiedTrainingCredential[], issuer: string, titles: string[], now: Date) {
  return credentials.some(row => row.issuer.trim().toUpperCase() === issuer.toUpperCase() && titles.includes(row.title.trim()) && row.verificationStatus === 'VERIFIED' && (!row.issuedAt || row.issuedAt <= now) && (!row.expiresAt || row.expiresAt > now));
}
export function ageOn(dateOfBirth: Date | null | undefined, at: Date): number | null {
  if (!dateOfBirth || !Number.isFinite(dateOfBirth.getTime()) || dateOfBirth > at) return null;
  // Programme eligibility is evaluated on the Saudi calendar day of the activity.
  const day = new Date(at.getTime() + 3 * 60 * 60 * 1000);
  let age = day.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  if (day.getUTCMonth() < dateOfBirth.getUTCMonth() || (day.getUTCMonth() === dateOfBirth.getUTCMonth() && day.getUTCDate() < dateOfBirth.getUTCDate())) age--;
  return age;
}
export function trainingSupervisionLimits(profile: TrainingStandardProfile, age: number, environment: string) {
  if (!Number.isSafeInteger(age) || age < profile.requirements.minimumAge) fail('AGE_REQUIREMENT', 'عمر المتدرب لا يستوفي متطلبات البرنامج.');
  const bands = profile.requirements.supervision.filter(row => row.environment === environment && row.minimumAge <= age && row.maximumAge >= age);
  if (!bands.length) fail('SUPERVISION_REVIEW_REQUIRED', 'لا يوجد حد إشراف معتمد لهذا العمر وبيئة التدريب.');
  // Intersect applicable limits. No invented assistant multipliers or permissive fallback.
  return { studentsPerInstructor: Math.min(...bands.map(row => row.studentsPerInstructor)), maximumDepthMetres: Math.min(...bands.map(row => row.maximumDepthMetres)) };
}
export function trainingCompletionGaps(profile: TrainingStandardProfile, evidence: { completedSessions: number; completedSkillCodes: string[]; verifiedFormCodes: string[]; verifiedOpenWaterDives: number; verifiedOpenWaterMinutes: number }) {
  const gaps: string[] = [];
  if (!Number.isSafeInteger(evidence.completedSessions) || evidence.completedSessions < profile.requirements.minimumCompletedSessions) gaps.push('STANDARD_SESSIONS_REQUIRED');
  if (!Number.isSafeInteger(evidence.verifiedOpenWaterDives) || evidence.verifiedOpenWaterDives < profile.requirements.minimumOpenWaterDives) gaps.push('STANDARD_DIVES_REQUIRED');
  if (!Number.isSafeInteger(evidence.verifiedOpenWaterMinutes) || evidence.verifiedOpenWaterMinutes < profile.requirements.minimumOpenWaterMinutes) gaps.push('STANDARD_WATER_MINUTES_REQUIRED');
  if (profile.requirements.requiredSkillCodes.some(code => !evidence.completedSkillCodes.includes(code))) gaps.push('STANDARD_SKILLS_REQUIRED');
  if (profile.requirements.requiredFormCodes.some(code => !evidence.verifiedFormCodes.includes(code))) gaps.push('STANDARD_FORMS_REQUIRED');
  return gaps;
}

export type VerifiedOpenWaterDive = { id: string; sequence: unknown; startedAt: number; bottomMinutes: number; maximumDepthMetres: number };
/** Validate every supplied proof, never drop a deep/short early dive and renumber the rest. */
export function trainingDiveProgressionGaps(profile: TrainingStandardProfile, evidence: VerifiedOpenWaterDive[]) {
  const rules = profile.requirements.openWaterDiveRequirements;
  if (!rules) return [];
  const gaps = new Set<string>();
  const chronological = [...evidence].sort((a, b) => a.startedAt - b.startedAt);
  if (chronological.length !== rules.length) gaps.add('STANDARD_DIVE_PROGRESSION_REQUIRED');
  chronological.forEach((dive, index) => {
    const rule = rules[index];
    if (!rule || dive.sequence !== rule.sequence || !Number.isFinite(dive.startedAt) || (index > 0 && dive.startedAt < chronological[index - 1].startedAt + chronological[index - 1].bottomMinutes * 60000)) gaps.add('STANDARD_DIVE_PROGRESSION_REQUIRED');
    if (!rule) return;
    if (!Number.isSafeInteger(dive.bottomMinutes) || dive.bottomMinutes < rule.minimumBottomMinutes) gaps.add('STANDARD_DIVE_DURATION_REQUIRED');
    if (!Number.isFinite(dive.maximumDepthMetres) || dive.maximumDepthMetres <= 0 || dive.maximumDepthMetres > rule.maximumDepthMetres) gaps.add('STANDARD_DIVE_DEPTH_EXCEEDED');
  });
  return [...gaps];
}
