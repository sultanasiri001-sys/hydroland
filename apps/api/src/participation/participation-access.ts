import { ConflictException, ForbiddenException, HttpException, NotFoundException } from '@nestjs/common';
import { ParticipationCase, Prisma } from '@prisma/client';
import { platformOrganization, record } from '../hr/staffing-catalog';
import { AuthorityBinding, hash, ServiceSnapshot, SubjectType } from './participation.domain';

export async function participationAccount(tx: Prisma.TransactionClient, accountId: string) {
  const account = await tx.account.findFirst({ where: { id: accountId, status: 'ACTIVE', emailVerifiedAt: { not: null } }, select: { id: true, personId: true, person: { select: { firstName: true, lastName: true } } } });
  if (!account) throw new ForbiddenException('An active verified account is required.');
  return { id: account.id, personId: account.personId, name: [account.person.firstName, account.person.lastName].filter(Boolean).join(' ') };
}

export async function participationReviewer(tx: Prisma.TransactionClient, accountId: string, organizationId: string): Promise<AuthorityBinding> {
  const actor = await participationAccount(tx, accountId);
  const organization = await tx.organization.findFirst({ where: { id: organizationId, status: 'ACTIVE' }, select: { id: true } });
  if (!organization) throw new ForbiddenException('The operating organization is inactive.');
  const admin = await tx.roleAssignment.findFirst({ where: { accountId, role: 'ADMIN', status: 'ACTIVE' }, orderBy: { id: 'asc' } });
  if (admin) return { accountId, personId: actor.personId, role: 'ADMIN', authorityId: admin.id, authorityUpdatedAt: admin.updatedAt.toISOString() };
  const member = await tx.organizationMember.findFirst({ where: { accountId, organizationId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] }, organization: { kind: 'DIVE_CENTER', status: 'ACTIVE' } } });
  const role = member && await tx.roleAssignment.findFirst({ where: { accountId, role: 'DIVE_CENTER', status: 'ACTIVE' }, orderBy: { id: 'asc' } });
  if (!member || !role) throw new ForbiddenException('Current verified participant-review authority is required in the operating organization.');
  return { accountId, personId: actor.personId, role: member.role, authorityId: member.id + ':' + role.id, authorityUpdatedAt: hash([member.updatedAt, role.updatedAt]) };
}
export async function isParticipationReviewer(tx: Prisma.TransactionClient, accountId: string, organizationId: string) {
  try { return await participationReviewer(tx, accountId, organizationId); }
  catch (error) { if (error instanceof ForbiddenException) return null; throw error; }
}
export async function participationSubject(tx: Prisma.TransactionClient, subjectType: SubjectType, subjectId: string) {
  if (subjectType === 'BOOKING_PARTICIPANT') {
    const row = await tx.bookingParticipant.findUnique({ where: { id: subjectId }, include: { account: { select: { personId: true, status: true, diverProfile: { select: { dateOfBirth: true } } } }, booking: { include: { trip: true } } } });
    if (!row) throw new NotFoundException('Participant not found.');
    const trip = row.booking.trip;
    const organizationId = trip.organizationId ?? (await platformOrganization(tx))?.id;
    if (!organizationId) throw new ConflictException('The trip operating organization is not configured.');
    const service: ServiceSnapshot = { id: trip.id, type: 'TRIP', title: trip.title, activityCode: trip.type, startsAt: trip.startsAt.toISOString(), endsAt: trip.endsAt.toISOString() };
    return { subjectType, subjectId, organizationId, participantName: row.fullName, accountId: row.accountId, personId: row.account?.personId ?? null, birthDate: row.account?.diverProfile?.dateOfBirth?.toISOString().slice(0, 10) ?? null,
      service, terminal: ['CANCELLED', 'COMPLETED'].includes(trip.status) || row.booking.status === 'CANCELLED', bookingId: row.bookingId, bookingStatus: row.booking.status,
      fingerprint: hash({ subjectType, subjectId, organizationId, service, accountId: row.accountId, personId: row.account?.personId ?? null, accountStatus: row.account?.status ?? null, fullName: row.fullName, certificationTitle: row.certificationTitle, certificationNumber: row.certificationNumber, certificationIssuer: row.certificationIssuer, birthDate: row.account?.diverProfile?.dateOfBirth ?? null }) };
  }
  const row = await tx.trainingEnrollment.findUnique({ where: { id: subjectId } });
  if (!row) throw new NotFoundException('Training enrollment not found.');
  const student = await tx.account.findUnique({ where: { id: row.studentAccountId }, select: { personId: true, status: true, person: { select: { firstName: true, lastName: true } }, diverProfile: { select: { dateOfBirth: true } } } });
  if (!student) throw new ConflictException('The enrolled participant account is unavailable.');
  if (!row.centerOrganizationId) throw new ConflictException('The course provider is not configured.');
  const metadata = record(row.metadata), contract = record(metadata.contractSnapshot), course = record(contract.course);
  const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
  const service: ServiceSnapshot = { id: row.id, type: 'TRAINING_ENROLLMENT', title: typeof metadata.title === 'string' ? metadata.title : row.courseCode, activityCode: row.courseCode,
    startsAt: date(course.startsAt ?? metadata.startsAt), endsAt: date(course.endsAt ?? metadata.endsAt) };
  return { subjectType, subjectId, organizationId: row.centerOrganizationId, participantName: [student.person.firstName, student.person.lastName].filter(Boolean).join(' '), accountId: row.studentAccountId,
    personId: student.personId, birthDate: student.diverProfile?.dateOfBirth?.toISOString().slice(0, 10) ?? null, service,
    terminal: ['COMPLETED', 'CANCELLED'].includes(row.status), bookingId: null, bookingStatus: null,
    fingerprint: hash({ subjectType, subjectId, organizationId: row.centerOrganizationId, service, accountId: row.studentAccountId, personId: student.personId, accountStatus: student.status, birthDate: student.diverProfile?.dateOfBirth ?? null, trainingStandard: metadata.trainingStandard ?? null }) };
}

export async function participationReadAccess(tx: Prisma.TransactionClient, actorId: string, row: ParticipationCase) {
  const actor = await participationAccount(tx, actorId);
  const reviewer = await isParticipationReviewer(tx, actorId, row.organizationId);
  if (!reviewer) {
    const { state } = await import('./participation-store').then(m => m.verifyParticipationChain(tx, row));
    if (row.participantAccountId === actorId && state.participant.personId === actor.personId) return { actor, reviewer };
    if (row.guardianAccountId !== actorId || !state.guardian || state.guardianActor?.personId !== actor.personId) throw new NotFoundException('Participation case not found.');
    try {
      const source = await import('./participation-sources.service').then(m => m.participationSource(tx, state.guardian!.id, row.organizationId));
      const terms = source.payload as import('./participation.domain').GuardianTerms;
      const subject = await participationSubject(tx, state.subjectType, state.subjectId);
      const now = new Date().toISOString();
      if (source.kind !== 'GUARDIAN' || source.hash !== state.guardian.hash || source.row.version !== state.guardian.version
        || terms.guardianAccountId !== actorId || terms.subjectType !== state.subjectType || terms.subjectId !== state.subjectId
        || terms.identityDocumentId !== state.identity.id || terms.identityDocumentHash !== state.identity.hash
        || terms.serviceType !== subject.service.type || terms.serviceId !== subject.service.id
        || terms.validFrom > now || terms.validUntil <= now || subject.fingerprint !== state.subjectFingerprint) throw new NotFoundException();
      const identity = await import('./participation-sources.service').then(m => m.participationSource(tx, state.identity.id, row.organizationId));
      if (identity.hash !== state.identity.hash) throw new NotFoundException();
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() >= 400 && error.getStatus() < 500) throw new NotFoundException('Participation case not found.');
      throw error;
    }
  }
  return { actor, reviewer };
}

export const participationOrganizationWhere = (actorId: string): Prisma.OrganizationWhereInput => ({
  status: 'ACTIVE', kind: 'DIVE_CENTER',
  members: { some: { accountId: actorId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] } } },
});
