import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { requireVerifiedAdmin } from '../admin/admin-authorization';
import { platformOrganization, record } from '../hr/staffing-catalog';
import { reviewSource } from '../document-forms/internal-document-review.domain';
import { validateDocumentPayload } from '../document-forms/document-payload';
import { evidenceDigest, evidenceId, evidenceNote, evidenceObject } from '../trips/trip-return.domain';
import { currentTripRoster, readTripReturn, returnCounts, tripReturnScope } from '../trips/trip-return.service';

type Tx = Prisma.TransactionClient;
type Pin = { documentId: string; version: number; contentHash: string };
type Decision = { requestId: string; expectedUpdatedAt: string; status: 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED'; terminal: boolean; resolutionNotes: string | null; capaRequired?: boolean; applicabilityReason?: string; capa?: Pin; effectiveness?: Pin };
function pin(value: unknown): Pin {
  const p = evidenceObject(value, ['documentId', 'version', 'contentHash']); evidenceId(p.documentId);
  if (!Number.isSafeInteger(p.version) || Number(p.version) < 1 || typeof p.contentHash !== 'string' || !/^(sha256:)?[a-f0-9]{64}$/.test(p.contentHash)) throw new BadRequestException('حدد إصدار المستند المعتمد وبصمته.');
  return { documentId: p.documentId, version: Number(p.version), contentHash: p.contentHash };
}
export function incidentDecision(body: unknown): Decision {
  const b = evidenceObject(body, ['requestId', 'expectedUpdatedAt', 'status', 'resolutionNotes', 'capaRequired', 'applicabilityReason', 'capa', 'effectiveness']);
  evidenceId(b.requestId);
  if (typeof b.expectedUpdatedAt !== 'string' || !Number.isFinite(Date.parse(b.expectedUpdatedAt)) || new Date(b.expectedUpdatedAt).toISOString() !== b.expectedUpdatedAt) throw new BadRequestException('حدّث البلاغ قبل القرار.');
  if (!['UNDER_REVIEW', 'RESOLVED', 'CLOSED'].includes(b.status as string)) throw new BadRequestException('قرار البلاغ غير صالح.');
  const terminal = b.status === 'RESOLVED' || b.status === 'CLOSED';
  const resolutionNotes = b.resolutionNotes === undefined ? null : evidenceNote(b.resolutionNotes, 3, 5000);
  if (terminal && !resolutionNotes) throw new BadRequestException('اكتب نتيجة المعالجة.');
  if (terminal && typeof b.capaRequired !== 'boolean') throw new BadRequestException('حدد انطباق الإجراء التصحيحي صراحةً.');
  if (!terminal && ['capaRequired', 'applicabilityReason', 'capa', 'effectiveness'].some(k => k in b)) throw new BadRequestException('أدلة الإقفال متاحة عند المعالجة أو الإغلاق.');
  if (b.capaRequired === false && (b.capa !== undefined || b.effectiveness !== undefined)) throw new BadRequestException('اختر مسار الإجراء التصحيحي أو سبب عدم انطباقه.');
  return { requestId: b.requestId, expectedUpdatedAt: b.expectedUpdatedAt, status: b.status as 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED', terminal, resolutionNotes,
    ...(terminal ? { capaRequired: b.capaRequired as boolean, ...(b.capaRequired ? { capa: pin(b.capa), effectiveness: pin(b.effectiveness) } : { applicabilityReason: evidenceNote(b.applicabilityReason) }) } : {}) };
}
async function organizations(tx: Tx, incident: { tripId: string | null }) {
  const platform = await platformOrganization(tx), trip = incident.tripId ? await tx.trip.findUnique({ where: { id: incident.tripId }, select: { organizationId: true } }) : null;
  return [...new Set([platform?.id, trip?.organizationId].filter((s): s is string => !!s))];
}
async function nativeSource(tx: Tx, allowedOrganizations: string[], p: Pin, code: string) {
  const doc = await tx.managedDocument.findFirst({ where: { id: p.documentId, organizationId: { in: allowedOrganizations } }, select: { organizationId: true } });
  if (!doc) throw new ConflictException('مستند الإقفال خارج نطاق البلاغ.');
  await tx.$queryRaw`SELECT "id" FROM "ManagedDocument" WHERE "id"::text=${p.documentId} FOR SHARE`;
  await tx.$queryRaw`SELECT t."id" FROM "DocumentTemplate" t JOIN "ManagedDocument" d ON d."templateId"=t."id" WHERE d."id"::text=${p.documentId} FOR SHARE OF t`;
  const source = await reviewSource(tx, doc.organizationId, p.documentId), d = source.d;
  if (!['APPROVED', 'SIGNED'].includes(d.status) || d.template.status !== 'ACTIVE' || d.template.code !== code || d.version !== p.version || d.contentHash !== p.contentHash) throw new ConflictException('تغير المستند المعتمد أو نوعه؛ حدّث دليل الإقفال.');
  validateDocumentPayload(d.template.fields, d.payload);
  return { d, sourceHash: source.sourceHash, pin: { ...p, sourceHash: source.sourceHash, referenceNumber: d.referenceNumber, templateCode: code, organizationId: d.organizationId, approvedAt: d.approvedAt } };
}
export async function closureEvidence(tx: Tx, actor: string, incident: { id: string; tripId: string | null; reportedByAccountId: string }, command: ReturnType<typeof incidentDecision>) {
  if (!command.terminal) return null;
  const admin = await requireVerifiedAdmin(tx, actor), reporter = await tx.account.findUniqueOrThrow({ where: { id: incident.reportedByAccountId }, select: { personId: true } });
  if (admin.personId === reporter.personId) throw new ForbiddenException('يلزم قرار مستقل عن الشخص الذي قدم البلاغ.');
  if (!command.capaRequired) return { capaRequired: false, applicabilityReason: command.applicabilityReason, independentDecision: true };
  const orgs = await organizations(tx, incident), capa = await nativeSource(tx, orgs, command.capa!, 'SAF-CAPA'), effectiveness = await nativeSource(tx, orgs, command.effectiveness!, 'SAF-EFFECTIVENESS-CLOSE');
  const c = record(capa.d.payload), e = record(effectiveness.d.payload);
  if (c.incidentNo !== incident.id || effectiveness.d.organizationId !== capa.d.organizationId || e.correctiveActionRef !== capa.d.referenceNumber) throw new ConflictException('يجب أن يعود الإجراء إلى هذا البلاغ وأن تشير الفعالية إلى الإجراء نفسه في الجهة نفسها.');
  for (const value of [c.rootCause, c.correctiveAction, e.verificationMethod, e.independentVerifierRef, e.closureDecisionRef]) evidenceNote(value, 3, 10000);
  if (effectiveness.d.approvedBy!.personId === capa.d.createdBy.personId) throw new ConflictException('التحقق من الفعالية يجب أن يكون مستقلاً عن مُعد الإجراء التصحيحي.');
  return { capaRequired: true, independentDecision: true, capa: capa.pin, effectiveness: effectiveness.pin };
}
export async function incidentClosureContext(tx: Tx, actor: string, incidentId: string) {
  await requireVerifiedAdmin(tx, actor); evidenceId(incidentId);
  const incident = await tx.safetyIncident.findUnique({ where: { id: incidentId } });
  if (!incident) throw new NotFoundException();
  const orgs = await organizations(tx, incident), rows = await tx.managedDocument.findMany({ where: { organizationId: { in: orgs }, status: { in: ['APPROVED', 'SIGNED'] }, template: { code: { in: ['SAF-CAPA', 'SAF-EFFECTIVENESS-CLOSE'] }, status: 'ACTIVE' } }, include: { template: { select: { code: true, titleAr: true, titleEn: true } }, organization: { select: { displayName: true } } }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], take: 200 });
  const candidates = [];
  for (const d of rows) {
    if (d.template.code === 'SAF-CAPA' && record(d.payload).incidentNo !== incident.id) continue;
    try {
      await reviewSource(tx, d.organizationId, d.id);
      candidates.push({ documentId: d.id, version: d.version, contentHash: d.contentHash, referenceNumber: d.referenceNumber, code: d.template.code, organizationId: d.organizationId, organizationName: d.organization.displayName, titleAr: d.template.titleAr, titleEn: d.template.titleEn,
        ...(d.template.code === 'SAF-EFFECTIVENESS-CLOSE' ? { correctiveActionRef: record(d.payload).correctiveActionRef } : {}) });
    } catch (error) { if (!(error instanceof ConflictException || error instanceof ForbiddenException || error instanceof BadRequestException)) throw error; }
  }
  return { incident: { id: incident.id, status: incident.status, updatedAt: incident.updatedAt }, candidates, sourceReferenceRequired: incident.id };
}
export async function incidentPack(tx: Tx, actor: string, incidentId: string) {
  evidenceId(incidentId);
  const account = await tx.account.findFirst({ where: { id: actor, status: 'ACTIVE' }, select: { id: true, emailVerifiedAt: true, roleAssignments: { where: { role: 'ADMIN', status: 'ACTIVE' }, select: { id: true } } } });
  if (!account) throw new ForbiddenException();
  const admin = !!account.emailVerifiedAt && account.roleAssignments.length > 0;
  const incident = await tx.safetyIncident.findUnique({ where: { id: incidentId }, include: { trip: { select: { id: true, title: true, type: true, status: true, startsAt: true, endsAt: true } } } });
  if (!incident) throw new NotFoundException();
  const own = incident.reportedByAccountId === actor;
  let operator = false;
  if (!admin) {
    if (incident.tripId) {
      try { await tripReturnScope(tx, actor, incident.tripId); operator = true; }
      catch (error) { if (!(error instanceof ForbiddenException || error instanceof NotFoundException)) throw error; }
    }
    if (!own && !operator) throw new NotFoundException();
  }
  const audits = await tx.auditEvent.findMany({ where: { resource: 'SafetyIncident', resourceId: incident.id }, orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }], select: { id: true, action: true, occurredAt: true, metadata: true } });
  const latest = [...audits].reverse().find(a => a.action === 'SAFETY_INCIDENT_STATUS_SET'), closure = record(record(latest?.metadata).result).closure ?? null;
  // Reporting an incident is not authority to inspect a trip. The generic
  // reporter endpoint can link a known trip, so report ownership alone must
  // never disclose its return counts, timetable or operational state.
  const returnRecord = incident.tripId && (admin || operator) ? await readTripReturn(tx, incident.tripId) : null;
  const roster = incident.tripId && (admin || operator) ? await currentTripRoster(tx, incident.tripId) : null;
  const returnEvidence = returnRecord ? { revision: returnRecord.revision, observedAt: returnRecord.observedAt, counts: returnCounts(returnRecord.entries),
    ...(roster ? { sourceCurrent: roster.sourceDigest === returnRecord.sourceDigest, persons: returnRecord.entries.map(e => ({ ...e, name: roster.persons.find(p => p.kind === e.kind && p.id === e.id)?.name ?? null })) } : {}) } : null;
  const content = { protocol: 'HYDROLAND_INCIDENT_PACK_V1', scope: admin ? 'AUTHORIZED_ADMIN' : operator ? 'TRIP_OPERATOR' : 'REPORTER',
    incident: { id: incident.id, severity: incident.severity, title: incident.title, status: incident.status, locationName: incident.locationName, createdAt: incident.createdAt, updatedAt: incident.updatedAt,
      description: admin || own ? incident.description : null, descriptionVisible: admin || own, resolutionNotes: admin ? incident.resolutionNotes : null, resolvedAt: incident.resolvedAt },
    trip: admin || operator ? incident.trip : incident.tripId ? { id: incident.tripId } : null, returnEvidence, closure: admin ? closure : closure ? { documented: true, capaRequired: record(closure).capaRequired } : null,
    history: audits.map(a => ({ id: a.id, action: a.action, occurredAt: a.occurredAt, status: record(a.metadata).status ?? null })),
    externalTransmission: 'NOT_IMPLEMENTED', externalDistressSent: false, operationalAuthority: false };
  return { ...content, contentDigest: evidenceDigest(content), generatedAt: new Date().toISOString() };
}
