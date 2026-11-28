import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { lockAccountIdentities } from '../admin/admin-authorization';
import { evidenceDigest, evidenceId, ReturnEntry, returnCommand } from './trip-return.domain';

type Tx = Prisma.TransactionClient;
export type ReturnRecord = { tripId: string; revision: number; sourceDigest: string; entries: ReturnEntry[]; observedAt: Date; recordedByAccountId: string; createdAt: Date; updatedAt: Date };
export async function tripReturnScope(tx: Tx, actor: string, tripId: string) {
  evidenceId(tripId);
  const account = await tx.account.findFirst({ where: { id: actor, status: 'ACTIVE' }, select: { id: true, emailVerifiedAt: true, roleAssignments: { where: { status: 'ACTIVE' }, select: { role: true } } } });
  if (!account) throw new ForbiddenException();
  const admin = !!account.emailVerifiedAt && account.roleAssignments.some(r => r.role === 'ADMIN');
  if (!admin && !account.roleAssignments.some(r => r.role === 'DIVE_CENTER')) throw new ForbiddenException('يلزم دور إدارة مركز أو إدارة المنصة.');
  const trip = await tx.trip.findFirst({ where: { id: tripId, ...(!admin ? { organization: { kind: 'DIVE_CENTER', status: 'ACTIVE', members: { some: { accountId: actor, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] } } } } } : {}) } });
  if (!trip) throw new NotFoundException('الرحلة غير موجودة ضمن نطاق حسابك.');
  return { trip, admin };
}
export async function currentTripRoster(tx: Tx, tripId: string) {
  const trip = await tx.trip.findUniqueOrThrow({ where: { id: tripId }, select: { id: true, organizationId: true, type: true, startsAt: true, endsAt: true } });
  const bookings = await tx.booking.findMany({ where: { tripId, status: 'CONFIRMED' }, orderBy: { id: 'asc' }, select: { id: true, seats: true, updatedAt: true } });
  const participants = await tx.bookingParticipant.findMany({ where: { booking: { tripId, status: 'CONFIRMED' } }, orderBy: { id: 'asc' }, select: { id: true, bookingId: true, fullName: true, updatedAt: true } });
  // Every accepted crew member remains in the physical roster, including legacy
  // assignments. Loss of qualification must never conceal a person needing help.
  const crew = await tx.crewAssignment.findMany({ where: { tripId, status: 'ACCEPTED' }, orderBy: { id: 'asc' }, select: { id: true, accountId: true, roleType: true, updatedAt: true, account: { select: { person: { select: { firstName: true, lastName: true } } } } } });
  const persons: Array<{kind:'PARTICIPANT'|'CREW';id:string;name:string;role?:string;historical?:boolean}> = [...participants.map(p => ({ kind: 'PARTICIPANT' as const, id: p.id, name: p.fullName })), ...crew.map(c => ({ kind: 'CREW' as const, id: c.id, name: `${c.account.person.firstName} ${c.account.person.lastName}`.trim(), role: c.roleType }))];
  // A later cancellation or crew revision must not erase someone already
  // recorded in factual accountability, especially a person needing help.
  const prior = await readTripReturn(tx, tripId), retained: unknown[] = [];
  for (const previous of prior?.entries ?? []) if (!persons.some(p => p.kind === previous.kind && p.id === previous.id)) {
    if (previous.kind === 'PARTICIPANT') {
      const row = await tx.bookingParticipant.findFirst({ where: { id: previous.id, booking: { tripId } }, select: { id: true, fullName: true, updatedAt: true, booking: { select: { status: true, updatedAt: true } } } });
      retained.push({ kind: previous.kind, id: previous.id, source: row }); persons.push({ kind: previous.kind, id: previous.id, name: row?.fullName ?? previous.id, historical: true });
    } else {
      const row = await tx.crewAssignment.findFirst({ where: { id: previous.id, tripId }, select: { id: true, status: true, updatedAt: true, roleType: true, account: { select: { person: { select: { firstName: true, lastName: true } } } } } });
      retained.push({ kind: previous.kind, id: previous.id, source: row }); persons.push({ kind: previous.kind, id: previous.id, name: row ? `${row.account.person.firstName} ${row.account.person.lastName}`.trim() : previous.id, historical: true });
    }
  }
  if (persons.length > 2000) throw new ConflictException('يتجاوز الحصر الحد المدعوم؛ راجع تقسيم الرحلة.');
  return { sourceDigest: evidenceDigest({ trip, bookings, participants, crew, retained }), persons, confirmedSeats: bookings.reduce((sum, b) => sum + b.seats, 0), participantCount: participants.length };
}
export async function readTripReturn(tx: Tx, tripId: string): Promise<ReturnRecord | null> {
  const [row] = await tx.$queryRaw<ReturnRecord[]>`SELECT "tripId"::text,"revision","sourceDigest","entries","observedAt","recordedByAccountId"::text,"createdAt","updatedAt" FROM "TripReturnRecord" WHERE "tripId"::text=${tripId}`;
  if (row && !Array.isArray(row.entries)) throw new ConflictException('سجل الحصر غير متسق.');
  return row ?? null;
}
export function returnCounts(entries: ReturnEntry[]) {
  return { total: entries.length, returned: entries.filter(e => e.status === 'RETURNED').length, notBoarded: entries.filter(e => e.status === 'NOT_BOARDED').length,
    assistanceRequired: entries.filter(e => e.status === 'ASSISTANCE_REQUIRED').length, transferred: entries.filter(e => e.status === 'TRANSFERRED').length };
}
export async function requireAccountedReturn(tx: Tx, tripId: string, attendedParticipantIds: string[]) {
  const [record, roster] = await Promise.all([readTripReturn(tx, tripId), currentTripRoster(tx, tripId)]);
  if (!record || record.sourceDigest !== roster.sourceDigest || record.entries.some(e => e.status === 'ASSISTANCE_REQUIRED')) throw new ConflictException('وثّق حصر العودة الحالي وعالج حالات المساعدة قبل إنهاء الرحلة.');
  const keys = (entries: Array<{kind:string;id:string}>) => entries.map(e=>e.kind+':'+e.id).sort();
  if (evidenceDigest(keys(record.entries)) !== evidenceDigest(keys(roster.persons))) throw new ConflictException('سجل الحصر لا يغطي قائمة الرحلة الحالية.');
  // Physical accountability is separate from actual diving attendance: a
  // returned passenger may not have dived, and retained historical people must
  // never force a new dive log for a cancelled booking.
  const currentParticipants = new Set(roster.persons.filter(p => p.kind === 'PARTICIPANT' && !p.historical).map(p => p.id));
  const eligible = new Set(record.entries.filter(e => e.kind === 'PARTICIPANT' && currentParticipants.has(e.id) && ['RETURNED', 'TRANSFERRED'].includes(e.status)).map(e => e.id));
  if (attendedParticipantIds.some(id => !eligible.has(id))) throw new ConflictException('الحضور للغوص يجب أن يكون ضمن المشاركين الحاليين الذين يؤكد الحصر مشاركتهم بالرحلة.');
  return { revision: record.revision, observedAt: record.observedAt, counts: returnCounts(record.entries) };
}

@Injectable()
export class TripReturnService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}
  preview(actor: string, tripId: string) {
    return this.db.serializable(async tx => {
      const { trip } = await tripReturnScope(tx, actor, tripId), roster = await currentTripRoster(tx, tripId), saved = await readTripReturn(tx, tripId);
      return { trip: { id: trip.id, title: trip.title, status: trip.status, startsAt: trip.startsAt }, roster: roster.persons,
        confirmedSeats: roster.confirmedSeats, participantCount: roster.participantCount, revision: saved?.revision ?? 0,
        stateToken: evidenceDigest([roster.sourceDigest, saved?.revision ?? 0]), canRecord: trip.startsAt <= new Date(),
        saved: saved ? { revision: saved.revision, entries: saved.entries, observedAt: saved.observedAt, updatedAt: saved.updatedAt, counts: returnCounts(saved.entries), sourceCurrent: saved.sourceDigest === roster.sourceDigest } : null,
        externalDistressSent: false, operationalAuthority: false };
    });
  }
  save(actor: string, tripId: string, body: unknown) {
    const command = returnCommand(body), fingerprint = evidenceDigest({ actor, tripId, command });
    return this.db.serializable(async tx => {
      await lockAccountIdentities(tx, [actor]);
      // Lock the native center authority as well as ADMIN identity. A role or
      // membership revocation that wins this race must invalidate the write,
      // including an exact retry, before factual accountability is persisted.
      await tx.$queryRaw`SELECT "id" FROM "RoleAssignment" WHERE "accountId"::text=${actor} AND "role"='DIVE_CENTER' ORDER BY "id" FOR SHARE`;
      await tx.$queryRaw`SELECT m."id" FROM "OrganizationMember" m JOIN "Organization" o ON o."id"=m."organizationId" JOIN "Trip" t ON t."organizationId"=o."id" WHERE m."accountId"::text=${actor} AND t."id"::text=${tripId} ORDER BY m."id" FOR SHARE OF m,o`;
      const { trip } = await tripReturnScope(tx, actor, tripId);
      await tx.$queryRaw`SELECT "id" FROM "Trip" WHERE "id"::text=${tripId} FOR UPDATE`;
      const prior = await tx.auditEvent.findFirst({ where: { resource: 'TripReturnRecord', resourceId: tripId, action: 'TRIP_RETURN_RECORDED', metadata: { path: ['requestId'], equals: command.requestId } }, select: { metadata: true } });
      if (prior) {
        const m = prior.metadata as Record<string, any>;
        if (m.fingerprint !== fingerprint) throw new ConflictException('استُخدم الطلب نفسه بمعنى مختلف.');
        return { ...m.result, alreadyApplied: true };
      }
      const observed = new Date(command.observedAt), now = new Date();
      if (observed > now || observed < trip.startsAt) throw new ConflictException('سجل وقت الحصر الفعلي بعد بداية الرحلة وحتى الوقت الحالي.');
      const roster = await currentTripRoster(tx, tripId), before = await readTripReturn(tx, tripId), revision = before?.revision ?? 0;
      if (command.expectedRevision !== revision || command.expectedState !== evidenceDigest([roster.sourceDigest, revision])) throw new ConflictException('تغير الحصر أو المشاركون أو الطاقم؛ حدّث التفاصيل.');
      if (roster.confirmedSeats !== roster.participantCount) throw new ConflictException('أكمل أسماء جميع المقاعد المؤكدة قبل اعتماد الحصر.');
      const keys = (rows: Array<{ kind: string; id: string }>) => rows.map(r => r.kind + ':' + r.id).sort();
      if (evidenceDigest(keys(roster.persons)) !== evidenceDigest(keys(command.entries))) throw new ConflictException('يجب حصر كل المشاركين والطاقم دون حذف أو إضافة شخص خارج الرحلة.');
      for (const entry of command.entries) if (entry.incidentId) {
        const linked = await tx.safetyIncident.findFirst({ where: { id: entry.incidentId, tripId }, select: { id: true } });
        if (!linked) throw new ConflictException('مرجع المساعدة لا يعود إلى هذه الرحلة.');
      }
      // Missing people remain unresolved. Record one native internal case, never
      // a claim that a coast guard/provider has received an emergency message.
      const recordedEntries = command.entries.map(e => ({ ...e }));
      const unlinked = recordedEntries.filter(e => e.status === 'ASSISTANCE_REQUIRED' && !e.incidentId);
      if (unlinked.length) {
        const incident = await tx.safetyIncident.create({ data: { tripId, reportedByAccountId: actor, severity: 'CRITICAL', title: 'حاجة مساعدة في حصر العودة', description: command.reason } });
        for (const entry of unlinked) entry.incidentId = incident.id;
        await this.audit.record({ actorId: actor, action: 'SAFETY_INCIDENT_REPORTED', resource: 'SafetyIncident', resourceId: incident.id, metadata: { tripId, source: 'TRIP_RETURN', assistanceRequired: unlinked.length, externalDistressSent: false } }, tx);
        const reviewers = await tx.roleAssignment.findMany({ where: { role: 'ADMIN', status: 'ACTIVE', account: { status: 'ACTIVE', emailVerifiedAt: { not: null } } }, select: { accountId: true } });
        if (reviewers.length) await tx.notification.createMany({ data: reviewers.map(reviewer => ({ accountId: reviewer.accountId, type: 'SAFETY_INCIDENT_REPORTED', status: 'SENT' as const, sentAt: now, payload: { source: 'TRIP_RETURN', resource: 'SafetyIncident', resourceId: incident.id, tripId, message: 'حصر عودة يتضمن حاجة مساعدة؛ راجع البلاغ واتخذ إجراءات المساعدة الفعلية. هذا إشعار داخلي فقط.', externalDistressSent: false } })) });
      }
      const entries = JSON.stringify(recordedEntries);
      if (before) await tx.$executeRaw`UPDATE "TripReturnRecord" SET "revision"=${revision + 1},"sourceDigest"=${roster.sourceDigest},"entries"=${entries}::jsonb,"observedAt"=${observed},"recordedByAccountId"=(SELECT "id" FROM "Account" WHERE "id"::text=${actor}),"updatedAt"=clock_timestamp() WHERE "tripId"::text=${tripId}`;
      else await tx.$executeRaw`INSERT INTO "TripReturnRecord"("tripId","revision","sourceDigest","entries","observedAt","recordedByAccountId","createdAt","updatedAt") SELECT t."id",1,${roster.sourceDigest},${entries}::jsonb,${observed},a."id",clock_timestamp(),clock_timestamp() FROM "Trip" t CROSS JOIN "Account" a WHERE t."id"::text=${tripId} AND a."id"::text=${actor}`;
      const counts = returnCounts(recordedEntries), result = { tripId, revision: revision + 1, counts, state: counts.assistanceRequired ? 'ASSISTANCE_REQUIRED' : 'ACCOUNTED', observedAt: command.observedAt, externalDistressSent: false, alreadyApplied: false };
      await this.audit.record({ actorId: actor, action: 'TRIP_RETURN_RECORDED', resource: 'TripReturnRecord', resourceId: tripId, metadata: { requestId: command.requestId, fingerprint, previousRevision: revision, previousEntries: before?.entries ?? [], entries: recordedEntries, reason: command.reason, sourceDigest: roster.sourceDigest, result } }, tx);
      return result;
    });
  }
}
