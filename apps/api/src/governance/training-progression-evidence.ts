import { TrainingStandardError } from './training-standard-profile';
import type { VerifiedConfinedActivity, VerifiedDiveEvidenceV2 } from './training-dive-progression';

type Session = { id: string; status: string; instructorAccountId: string | null; startsAt: Date; endsAt: Date | null; evidence: unknown };
type Document = { organizationId: string | null; status: string; approvedAt: Date | null; signedAt: Date | null; contentHash: string | null; createdByAccountId: string; approvedByAccountId: string | null; signedByAccountId: string | null; template: { code: string }; payload: unknown };
type Course = { id: string; centerOrganizationId: string | null; studentAccountId: string; instructorAccountId: string | null; enrolledAt: Date };
function invalid(): never { throw new TrainingStandardError('DIVE_EVIDENCE_INVALID', 'أدلة الغوص أو حضور الجلسات ناقصة أو متعارضة؛ لا تقبل الإجماليات بديلًا عنها.'); }
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}
function utc(value: unknown): number {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return invalid();
  const at = Date.parse(value), canonical = value.includes('.') ? value : value.replace('Z', '.000Z');
  if (!Number.isFinite(at) || new Date(at).toISOString() !== canonical) invalid();
  return at;
}
function date(value: Date | null): number {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) return invalid();
  return value.getTime();
}
function id(value: unknown): string {
  if (typeof value !== 'string' || !value || value !== value.trim() || value.length > 100) return invalid();
  return value;
}

/** Bounded adapter: exactly one signed OW dive per completed individual OW session.
 * Multi-dive sessions, imported histories and instructor transfers need separate
 * reviewed evidence contracts; none are silently inferred from elapsed sessions.
 */
export function readTrainingProgressionEvidence(course: Course, sessions: Session[], documents: Document[], profileHash: string, now: Date) {
  if (!course.instructorAccountId || !course.centerOrganizationId || sessions.length > 200 || documents.length > 200) invalid();
  const asOf = date(now), enrolledAt = date(course.enrolledAt);
  const completed = new Map<string, { session: Session; start: number; end: number; context: Record<string, unknown> }>();
  const confined: VerifiedConfinedActivity[] = [];
  for (const session of sessions) {
    const evidence = record(session.evidence || {});
    // A started attempt cannot be hidden by cancellation or an unfinished status.
    if (session.status !== 'COMPLETED') {
      if (evidence.startedAt !== undefined) invalid();
      continue;
    }
    if (session.instructorAccountId !== course.instructorAccountId || completed.has(id(session.id))) invalid();
    const context = record(evidence.trainingStandardContext);
    if (context.environment !== 'POOL' && context.environment !== 'CONFINED_WATER' && context.environment !== 'OPEN_WATER') invalid();
    if (typeof context.plannedMaximumDepthMetres !== 'number' || !Number.isFinite(context.plannedMaximumDepthMetres) || context.plannedMaximumDepthMetres < 0) invalid();
    const start = utc(evidence.startedAt), end = utc(evidence.endedAt), scheduledStart = date(session.startsAt), scheduledEnd = date(session.endsAt);
    if (end <= start || end > asOf || start < enrolledAt || start < scheduledStart || end > scheduledEnd || scheduledEnd <= scheduledStart) invalid();
    // Consume the actual TrainingSessionService producer contract. Calendar
    // state alone or a fabricated legacy completedAt alias is not attendance.
    id(evidence.startedByAccountId); id(evidence.completedByAccountId);
    for (const [prefix, accountId] of [['instructor', course.instructorAccountId], ['student', course.studentAccountId]] as const) {
      const checkedAt = utc(evidence[prefix + 'CheckInAt']), by = id(evidence[prefix + 'CheckInByAccountId']), source = evidence[prefix + 'CheckInSource'];
      if (checkedAt < enrolledAt || checkedAt > start || (source !== 'SELF' && source !== 'CENTER' && source !== 'AUTHORIZED_OPERATOR') || (source === 'SELF' && by !== accountId)) invalid();
    }
    completed.set(session.id, { session, start, end, context });
    if (context.environment !== 'OPEN_WATER') confined.push({ id: 'session:' + session.id, profileHash, environment: context.environment, startsAt: evidence.startedAt as string, endsAt: evidence.endedAt as string });
  }
  const ordered = [...completed.values()].sort((a,b)=>a.start-b.start);
  if (ordered.some((row,index)=>index>0&&row.start<ordered[index-1].end)) invalid();
  const dives: VerifiedDiveEvidenceV2[] = [], coveredSessions = new Set<string>();
  for (const document of documents.filter(row => ['TRAINING-DIVE-LOG', 'TRAINING_DIVE_LOG'].includes(row.template.code))) {
    const payload = record(document.payload), approvedAt = date(document.approvedAt), signedAt = date(document.signedAt);
    if (document.template.code !== 'TRAINING-DIVE-LOG' || !document.createdByAccountId || document.createdByAccountId === document.approvedByAccountId || document.createdByAccountId === document.signedByAccountId || document.organizationId !== course.centerOrganizationId || document.status !== 'SIGNED' || !document.contentHash || !document.approvedByAccountId || [course.studentAccountId, course.instructorAccountId].includes(document.approvedByAccountId) || document.signedByAccountId !== course.instructorAccountId || payload.trainingEnrollmentId !== course.id || payload.studentAccountId !== course.studentAccountId || payload.instructorAccountId !== course.instructorAccountId || payload.trainingStandardHash !== profileHash || approvedAt > signedAt || signedAt > asOf) invalid();
    if (!Array.isArray(payload.openWaterDives) || !payload.openWaterDives.length || payload.openWaterDives.length > 100 || Object.keys(payload.openWaterDives).length !== payload.openWaterDives.length) invalid();
    for (const item of payload.openWaterDives) {
      const entry = record(item), allowed = ['id', 'sessionId', 'environment', 'startedAt', 'endedAt', 'kind', 'qualifyingNumber', 'maximumDepthMetres', 'submergedSeconds', 'depthThresholdMetres', 'secondsAtOrDeeperThanThreshold', 'breathedGasLitres'];
      if (Object.keys(entry).length !== allowed.length || allowed.some(key => !Object.hasOwn(entry, key)) || Object.keys(entry).some(key => !allowed.includes(key))) invalid();
      const sessionId = id(entry.sessionId), window = completed.get(sessionId), start = utc(entry.startedAt), end = utc(entry.endedAt);
      if (!window || window.context.environment !== 'OPEN_WATER' || entry.environment !== 'OPEN_WATER' || coveredSessions.has(sessionId) || end <= start || start < window.start || end > window.end || end > signedAt || end > approvedAt || typeof entry.maximumDepthMetres !== 'number' || !Number.isFinite(entry.maximumDepthMetres) || entry.maximumDepthMetres <= 0 || entry.maximumDepthMetres > Number(window.context.plannedMaximumDepthMetres)) invalid();
      // A new classified reservation cannot be relabelled after its START gate.
      // Historical completed sessions still require their explicit signed log;
      // unclassified future reservations are refused by the planning gate.
      if (window.context.diveKind !== undefined && (window.context.diveKind !== entry.kind || window.context.qualifyingNumber !== entry.qualifyingNumber)) invalid();
      coveredSessions.add(sessionId);
      // The pure evaluator validates every exact enum, measurement, timestamp,
      // duplicate physical ID, overlap, qualifying sequence and source rule.
      dives.push({ id: id(entry.id), profileHash, kind: entry.kind as VerifiedDiveEvidenceV2['kind'], qualifyingNumber: entry.qualifyingNumber as number | null, startsAt: entry.startedAt as string, endsAt: entry.endedAt as string, maximumDepthMetres: entry.maximumDepthMetres, qualificationEvidence: { submergedSeconds: entry.submergedSeconds, depthThresholdMetres: entry.depthThresholdMetres, secondsAtOrDeeperThanThreshold: entry.secondsAtOrDeeperThanThreshold, breathedGasLitres: entry.breathedGasLitres } as VerifiedDiveEvidenceV2['qualificationEvidence'] });
    }
  }
  if ([...completed.values()].some(row => row.context.environment === 'OPEN_WATER' && !coveredSessions.has(row.session.id))) invalid();
  return { dives, confined, activities: [...completed.values()].map(row => ({ startsAt: new Date(row.start), endsAt: new Date(row.end), context: row.context })) };
}
