import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { DatabaseService } from '../database/database.service';
import { participationAccount, participationReviewer, isParticipationReviewer, participationReadAccess, participationSubject } from './participation-access';
import { invalidateParticipationSource, verifyParticipationChain } from './participation-store';
import { AuthorityBinding, choice, hash, json, keys, object, occurrenceId, parseSource, parseSourceCommand, PARTICIPATION_SOURCE_PREFIX, SOURCE_KINDS, SourceKind, SourceTerms, text, uuid } from './participation.domain';

const sourceInclude = { template: true, revisions: true, lifecycleEvents: { orderBy: { occurredAt: 'asc' as const } }, attachments: true } as const;
export type NativeParticipationSource = Prisma.ManagedDocumentGetPayload<{ include: typeof sourceInclude }>;
const fieldNames: Record<SourceKind, string[]> = {
  POLICY: ['purpose','serviceType','serviceId','subjectId','activityCode','effectiveFrom','validUntil','minimumAge','guardianBelowAge','consentRequirement','medicalRequirement','consentTextAr','consentTextEn','sourceAuthority','sourceReference','sourceVersion','sourceClause','applicabilityReason'],
  IDENTITY: ['purpose','subjectType','subjectId','participantAccountId','fullName','dateOfBirth','issuerName','sourceReference','issuedAt','validUntil'],
  GUARDIAN: ['purpose','subjectType','subjectId','serviceType','serviceId','identityDocumentId','identityDocumentHash','guardianAccountId','relationshipKind','authorityScope','issuerName','sourceReference','issuedAt','validFrom','validUntil'],
  MEDICAL: ['purpose','subjectType','subjectId','serviceType','serviceId','identityDocumentId','identityDocumentHash','activityCode','issuerName','issuerReference','sourceReference','issuedAt','validFrom','validUntil','outcome','limitations'],
};
export function sourceFields(kind: SourceKind) {
  return fieldNames[kind].map(key => ({ key, labelAr: key, labelEn: key, type: ['minimumAge','guardianBelowAge'].includes(key) ? 'NUMBER' : key === 'dateOfBirth' ? 'DATE' : ['consentTextAr','consentTextEn','applicabilityReason','limitations'].includes(key) ? 'TEXTAREA' : 'TEXT', required: !['participantAccountId','limitations'].includes(key) }));
}
export { isParticipationSourceCode, genericDocumentTemplateWhere, assertNotParticipationSource } from './participation-privacy';
export function participationSourceKind(row: NativeParticipationSource): SourceKind {
  const kind = row.template.code.slice(PARTICIPATION_SOURCE_PREFIX.length);
  if (!SOURCE_KINDS.includes(kind as SourceKind)) throw new ConflictException('PARTICIPATION_SOURCE_KIND');
  return kind as SourceKind;
}
export async function participationSource(tx: Prisma.TransactionClient, id: string, organizationId?: string, signed = true) {
  const row = await tx.managedDocument.findFirst({ where: { id, ...(organizationId ? { organizationId } : {}), template: { code: { startsWith: PARTICIPATION_SOURCE_PREFIX } } }, include: sourceInclude });
  if (!row) throw new NotFoundException('Private participation source not found.');
  const kind = participationSourceKind(row), payload = parseSource(kind, row.payload);
  if (row.template.organizationId !== row.organizationId || row.department !== 'SAFETY_COMPLIANCE_RISK' || row.template.department !== row.department
    || row.template.status !== 'ACTIVE' || hash(row.template.fields) !== hash(sourceFields(kind))) throw new ConflictException('PARTICIPATION_SOURCE_TEMPLATE');
  if (signed && row.status !== 'SIGNED') throw new ConflictException('PARTICIPATION_SOURCE_NOT_SIGNED');
  if (row.lifecycleEvents.some(event => event.action === 'D01_SOURCE_REVOKED')) throw new ConflictException('PARTICIPATION_SOURCE_REVOKED');
  const revisions = row.revisions.filter(revision => revision.version === row.version);
  if (revisions.length !== 1 || revisions[0].contentHash !== row.contentHash || hash(revisions[0].payload) !== hash(row.payload)
    || row.contentHash !== 'sha256:' + hash({ templateId: row.templateId, templateVersion: row.template.version, fields: row.template.fields, payload: row.payload })) throw new ConflictException('PARTICIPATION_SOURCE_REVISION');
  const attachments = row.attachments.sort((a, b) => a.id.localeCompare(b.id)).map(file => {
    const bytes = Buffer.from(file.content), sha256 = createHash('sha256').update(bytes).digest('hex');
    if (file.organizationId !== row.organizationId || file.documentId !== row.id || file.mimeType !== 'application/pdf' || bytes.length !== file.byteSize || sha256 !== file.sha256 || bytes.subarray(0, 5).toString() !== '%PDF-') throw new ConflictException('PARTICIPATION_SOURCE_ATTACHMENT');
    return { id: file.id, filename: file.filename, mimeType: file.mimeType, byteSize: file.byteSize, sha256 };
  });
  if (attachments.length !== 1) throw new ConflictException('PARTICIPATION_ORIGINAL_PDF_REQUIRED');
  const creators = row.lifecycleEvents.filter(event => event.action === 'CREATE' && event.version === row.version);
  if (creators.length !== 1 || creators[0].actorAccountId !== row.createdByAccountId || creators[0].toStatus !== 'DRAFT') throw new ConflictException('PARTICIPATION_SOURCE_CREATION');
  const approvals = row.lifecycleEvents.filter(event => event.action === 'APPROVED' && event.version === row.version);
  const signatures = row.lifecycleEvents.filter(event => event.action === 'SIGNED' && event.version === row.version);
  if (signed && (approvals.length !== 1 || signatures.length !== 1 || !row.approvedAt || !row.signedAt
    || approvals[0].fromStatus !== 'PENDING_APPROVAL' || approvals[0].toStatus !== 'APPROVED' || approvals[0].actorAccountId !== row.approvedByAccountId
    || signatures[0].fromStatus !== 'APPROVED' || signatures[0].toStatus !== 'SIGNED' || signatures[0].actorAccountId !== row.signedByAccountId
    || row.signedAt < row.approvedAt || row.signedAt > new Date())) throw new ConflictException('PARTICIPATION_SOURCE_LIFECYCLE');
  const actorIds = [...new Set([row.createdByAccountId, ...approvals.map(event => event.actorAccountId), ...signatures.map(event => event.actorAccountId)])];
  const people = await tx.account.findMany({ where: { id: { in: actorIds } }, select: { id: true, personId: true } });
  if (people.length !== actorIds.length || new Set(people.map(person => person.personId)).size !== actorIds.length) throw new ConflictException('PARTICIPATION_SOURCE_INDEPENDENCE');
  for (const event of [creators[0], ...approvals, ...signatures]) {
    const metadata = object(event.metadata), authority = await participationReviewer(tx, event.actorAccountId, row.organizationId);
    if (hash(metadata.authority) !== hash(authority) || metadata.actorPersonId !== authority.personId) throw new ConflictException('PARTICIPATION_SOURCE_AUTHORITY_CHANGED');
  }
  const snapshot = json({ id: row.id, organizationId: row.organizationId, version: row.version, contentHash: row.contentHash, referenceNumber: row.referenceNumber,
    template: row.template, payload: row.payload, revision: revisions[0], status: row.status,
    createdByAccountId: row.createdByAccountId, approvedByAccountId: row.approvedByAccountId, signedByAccountId: row.signedByAccountId,
    approvedAt: row.approvedAt, signedAt: row.signedAt, lifecycle: row.lifecycleEvents, people: people.sort((a, b) => a.id.localeCompare(b.id)), attachments });
  return { row, kind, payload, hash: hash(snapshot), attachments, snapshot };
}
export type ParticipationSource = Awaited<ReturnType<typeof participationSource>>;

@Injectable()
export class ParticipationSourcesService {
  constructor(private readonly db: DatabaseService) {}

  private async access(tx: Prisma.TransactionClient, actorId: string, id: string) {
    const row = await tx.managedDocument.findFirst({ where: { id, template: { code: { startsWith: PARTICIPATION_SOURCE_PREFIX } } }, select: { organizationId: true, payload: true, template: { select: { code: true } } } });
    if (!row) throw new NotFoundException('Private participation source not found.');
    const actor = await participationAccount(tx, actorId), reviewer = await isParticipationReviewer(tx, actorId, row.organizationId);
    if (!reviewer) {
      const linked = await tx.participationCase.findMany({ where: { organizationId: row.organizationId, OR: [{ participantAccountId: actorId }, { guardianAccountId: actorId }],
        AND: [{ OR: [{ policyDocumentId: id }, { identityDocumentId: id }, { guardianDocumentId: id }, { medicalDocumentId: id }] }] } });
      let permitted = false;
      for (const candidate of linked) {
        try {
          await participationReadAccess(tx, actorId, candidate);
          const { state } = await verifyParticipationChain(tx, candidate), payload = object(row.payload);
          const kind = row.template.code.slice(PARTICIPATION_SOURCE_PREFIX.length);
          if (kind === 'POLICY' && state.policy.id === id
            || kind === 'IDENTITY' && state.identity.id === id && payload.participantAccountId === state.participant.accountId
            || ['GUARDIAN', 'MEDICAL'].includes(kind) && payload.subjectType === state.subjectType && payload.subjectId === state.subjectId
              && payload.serviceType === state.service.type && payload.serviceId === state.service.id
              && payload.identityDocumentId === state.identity.id && payload.identityDocumentHash === state.identity.hash
              && (kind === 'MEDICAL' ? state.medical?.id === id : state.guardian?.id === id && payload.guardianAccountId === state.guardianActor?.accountId)) {
            permitted = true; break;
          }
        } catch (error) {
          if (!(error instanceof HttpException) || error.getStatus() < 400 || error.getStatus() >= 500) throw error;
        }
      }
      if (!permitted) throw new NotFoundException('Private participation source not found.');
    }
    return { actor, reviewer, organizationId: row.organizationId };
  }

  private async rawView(tx: Prisma.TransactionClient, actorId: string, id: string) {
    const { actor, reviewer } = await this.access(tx, actorId, id);
    const row = await tx.managedDocument.findUniqueOrThrow({ where: { id }, include: sourceInclude });
    const kind = participationSourceKind(row), revoked = row.lifecycleEvents.some(event => event.action === 'D01_SOURCE_REVOKED');
    let sourceHash: string, issue: string | null = null;
    try { sourceHash = (await participationSource(tx, id, row.organizationId, false)).hash; }
    catch (error) {
      if (!(error instanceof ConflictException) && !(error instanceof ForbiddenException) && !(error instanceof BadRequestException)) throw error;
      issue = error.message;
      sourceHash = hash({ id: row.id, version: row.version, contentHash: row.contentHash, payload: row.payload, status: row.status, lifecycle: row.lifecycleEvents, attachments: row.attachments.map(file => ({ id: file.id, sha256: file.sha256 })) });
    }
    const creator = await tx.account.findUnique({ where: { id: row.createdByAccountId }, select: { personId: true } });
    const approver = row.approvedByAccountId ? await tx.account.findUnique({ where: { id: row.approvedByAccountId }, select: { personId: true } }) : null;
    const allowed = (value: boolean, reason: string) => ({ allowed: Boolean(reviewer && value), reason: reviewer && value ? null : reason });
    return { id: row.id, organizationId: row.organizationId, kind, status: row.status, version: row.version, hash: sourceHash,
      title: String(object(row.lifecycleEvents.find(event => event.action === 'CREATE')?.metadata).title ?? row.template.titleAr),
      referenceNumber: row.referenceNumber, payload: row.payload,
      attachments: row.attachments.map(file => ({ id: file.id, filename: file.filename, mimeType: file.mimeType, byteSize: file.byteSize, sha256: file.sha256 })),
      revoked, integrityReason: issue, administrativeVerificationOnly: true,
      actions: {
        SUBMIT: allowed(!issue && row.status === 'DRAFT', 'A current draft and review authority are required.'),
        APPROVE: allowed(!issue && row.status === 'PENDING_APPROVAL' && actor.personId !== creator?.personId, 'Approval must be independent from source preparation.'),
        SIGN: allowed(!issue && row.status === 'APPROVED' && actor.personId !== creator?.personId && actor.personId !== approver?.personId, 'Administrative signature requires a third independent reviewer.'),
        REVOKE: allowed(!revoked && row.status === 'SIGNED', 'Only a signed current source can be revoked.'),
      } };
  }

  async detail(actorId: string, id: string) {
    const result = await this.db.serializable(tx => this.rawView(tx, actorId, uuid(id)));
    await this.db.serializable(tx => this.access(tx, actorId, id));
    return result;
  }

  async create(actorId: string, input: unknown) {
    const v = object(input);
    keys(v, ['requestId','organizationId','kind','title','payload','attachment']);
    const requestId = uuid(v.requestId), organizationId = uuid(v.organizationId), kind = choice(v.kind, SOURCE_KINDS, 'Source kind'), title = text(v.title, 'Source title', 180);
    const payload = parseSource(kind, v.payload), attachment = object(v.attachment);
    keys(attachment, ['filename','mimeType','base64']);
    if (attachment.mimeType !== 'application/pdf' || typeof attachment.base64 !== 'string' || attachment.base64.length > 14_000_000) throw new BadRequestException('Attach one original PDF up to 10 MB.');
    const bytes = Buffer.from(attachment.base64, 'base64'), filename = text(attachment.filename, 'PDF filename', 180);
    if (!bytes.length || bytes.length > 10_000_000 || bytes.toString('base64') !== attachment.base64 || bytes.subarray(0, 5).toString() !== '%PDF-' || !filename.toLowerCase().endsWith('.pdf') || /[\\/\u0000-\u001f]/.test(filename)) throw new BadRequestException('The original PDF is invalid.');
    try { await PDFDocument.load(bytes, { updateMetadata: false }); } catch { throw new BadRequestException('The original PDF cannot be read.'); }
    const sha256 = createHash('sha256').update(bytes).digest('hex'), fingerprint = hash({ organizationId, kind, title, payload, filename, sha256 });
    const id = randomUUID(), now = new Date(), templateId = randomUUID(), attachmentId = randomUUID(), revisionId = randomUUID(), eventId = randomUUID();
    const created = await this.db.serializable(async tx => {
      const authority = await participationReviewer(tx, actorId, organizationId);
      await tx.$queryRawUnsafe('SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext($1)::bigint)', 'participation-source-request:' + actorId + ':' + requestId);
      const prior = await tx.documentLifecycleEvent.findFirst({ where: { actorAccountId: actorId, action: 'CREATE', metadata: { path: ['d01RequestId'], equals: requestId } }, include: { document: { select: { id: true, organizationId: true } } } });
      if (prior) {
        if (object(prior.metadata).fingerprint !== fingerprint || prior.document.organizationId !== organizationId) throw new ConflictException('Request ID was used for different participation source content.');
        return { id: prior.document.id, alreadyApplied: true };
      }
      // A source can only refer to an actual subject/service in this operator's scope.
      if (kind === 'POLICY') {
        const policy = payload as import('./participation.domain').PolicyTerms;
        if (policy.serviceType === 'TRIP') {
          const trip = await tx.trip.findUnique({ where: { id: policy.serviceId }, select: { id: true, organizationId: true, type: true } });
          const internal = trip?.organizationId === null ? await import('../hr/staffing-catalog').then(m => m.platformOrganization(tx)) : null;
          if (!trip || (trip.organizationId ?? internal?.id) !== organizationId || trip.type !== policy.activityCode) throw new ConflictException('Policy service is outside the operating organization or activity.');
        } else {
          const course = await tx.trainingEnrollment.findUnique({ where: { id: policy.serviceId }, select: { centerOrganizationId: true, courseCode: true } });
          if (!course || course.centerOrganizationId !== organizationId || course.courseCode !== policy.activityCode) throw new ConflictException('Policy course is outside the operating organization or activity.');
        }
      } else {
        const terms = payload as Exclude<SourceTerms, import('./participation.domain').PolicyTerms>;
        const subject = await participationSubject(tx, terms.subjectType, terms.subjectId);
        if (subject.organizationId !== organizationId) throw new ConflictException('Source subject is outside the operating organization.');
      }
      const code = PARTICIPATION_SOURCE_PREFIX + kind, fields = sourceFields(kind);
      const template = await tx.documentTemplate.findUnique({ where: { organizationId_code_version: { organizationId, code, version: 1 } } })
        ?? await tx.documentTemplate.create({ data: { id: templateId, organizationId, code, titleAr: 'مصدر المشاركة — ' + kind, titleEn: 'Participation source — ' + kind, department: 'SAFETY_COMPLIANCE_RISK', fields: fields as Prisma.InputJsonValue, printable: false } });
      if (template.status !== 'ACTIVE' || hash(template.fields) !== hash(fields)) throw new ConflictException('The private participation template needs review.');
      const contentHash = 'sha256:' + hash({ templateId: template.id, templateVersion: template.version, fields: template.fields, payload });
      const year = now.getUTCFullYear();
      const counter = await tx.documentReferenceCounter.upsert({ where: { organizationId_department_year: { organizationId, department: 'SAFETY_COMPLIANCE_RISK', year } },
        create: { organizationId, department: 'SAFETY_COMPLIANCE_RISK', year, lastNumber: 1 }, update: { lastNumber: { increment: 1 } } });
      await tx.managedDocument.create({ data: { id, organizationId, templateId: template.id, referenceNumber: 'D01-' + year + '-' + String(counter.lastNumber).padStart(6, '0'),
        department: 'SAFETY_COMPLIANCE_RISK', contentHash, payload: payload as unknown as Prisma.InputJsonValue, createdByAccountId: actorId, createdAt: now, updatedAt: now } });
      await tx.documentRevision.create({ data: { id: revisionId, documentId: id, version: 1, contentHash, payload: payload as unknown as Prisma.InputJsonValue, createdByAccountId: actorId, createdAt: now } });
      await tx.managedDocumentAttachment.create({ data: { id: attachmentId, documentId: id, organizationId, uploadedByAccountId: actorId, filename, mimeType: 'application/pdf', byteSize: bytes.length, sha256, content: new Uint8Array(bytes), createdAt: now } });
      await tx.documentLifecycleEvent.create({ data: { id: eventId, documentId: id, actorAccountId: actorId, action: 'CREATE', toStatus: 'DRAFT', version: 1, occurredAt: now,
        metadata: json({ d01RequestId: requestId, fingerprint, title, actorPersonId: authority.personId, authority, scope: 'ADMINISTRATIVE_SOURCE_REVIEW' }) } });
      await tx.auditEvent.create({ data: { actorId: authority.personId, action: 'PARTICIPATION_SOURCE_CREATED', resource: 'ManagedDocument', resourceId: id, metadata: { organizationId, kind, actorAccountId: actorId, documentVersion: 1, attachmentHash: sha256 } } });
      return { id, alreadyApplied: false };
    });
    return { ...await this.detail(actorId, created.id), command: { requestId, alreadyApplied: created.alreadyApplied } };
  }

  async act(actorId: string, id: string, input: unknown) {
    const command = parseSourceCommand(input), fingerprint = hash({ id, ...command }), now = new Date(), eventId = randomUUID();
    const result = await this.db.serializable(async tx => {
      const access = await this.access(tx, actorId, uuid(id));
      const authority = await participationReviewer(tx, actorId, access.organizationId);
      await tx.$queryRawUnsafe('SELECT id FROM "ManagedDocument" WHERE id::text=$1 FOR UPDATE', id);
      const row = await tx.managedDocument.findUniqueOrThrow({ where: { id }, include: sourceInclude });
      const prior = row.lifecycleEvents.find(event => object(event.metadata).d01RequestId === command.requestId && event.actorAccountId === actorId);
      if (prior) {
        if (object(prior.metadata).fingerprint !== fingerprint) throw new ConflictException('Request ID was used for another source action.');
        return { alreadyApplied: true, eventId: prior.id };
      }
      const view = await this.rawView(tx, actorId, id);
      if (row.version !== command.expectedVersion || view.hash !== command.expectedHash) throw new ConflictException('Participation source changed; reload before acting.');
      if (!view.actions[command.action].allowed) throw new ForbiddenException(view.actions[command.action].reason ?? 'Source action is unavailable.');
      const next = command.action === 'SUBMIT' ? 'PENDING_APPROVAL' : command.action === 'APPROVE' ? 'APPROVED' : command.action === 'SIGN' ? 'SIGNED' : 'ARCHIVED';
      const action = command.action === 'REVOKE' ? 'D01_SOURCE_REVOKED' : next;
      await tx.managedDocument.update({ where: { id }, data: { status: next, updatedAt: now,
        ...(next === 'APPROVED' ? { approvedByAccountId: actorId, approvedAt: now } : {}),
        ...(next === 'SIGNED' ? { signedByAccountId: actorId, signedAt: now } : {}),
        ...(next === 'ARCHIVED' ? { archivedByAccountId: actorId, archivedAt: now } : {}) } });
      await tx.documentLifecycleEvent.create({ data: { id: eventId, documentId: id, actorAccountId: actorId, action, fromStatus: row.status, toStatus: next, version: row.version, occurredAt: now,
        metadata: json({ d01RequestId: command.requestId, fingerprint, reason: command.reason, beforeHash: view.hash, actorPersonId: authority.personId, authority, scope: 'ADMINISTRATIVE_SOURCE_REVIEW' }) } });
      await tx.auditEvent.create({ data: { actorId: authority.personId, action: 'PARTICIPATION_SOURCE_' + command.action, resource: 'ManagedDocument', resourceId: id,
        metadata: { organizationId: row.organizationId, actorAccountId: actorId, documentVersion: row.version, lifecycleEventId: eventId } } });
      if (command.action === 'REVOKE') await invalidateParticipationSource(tx, id, actorId, command.requestId, command.reason, now);
      return { alreadyApplied: false, eventId };
    });
    return { ...await this.detail(actorId, id), command: { requestId: command.requestId, ...result } };
  }

  async attachment(actorId: string, id: string, attachmentId: string) {
    const result = await this.db.serializable(async tx => {
      await this.access(tx, actorId, uuid(id));
      const file = await tx.managedDocumentAttachment.findFirst({ where: { id: uuid(attachmentId), documentId: id } });
      if (!file) throw new NotFoundException('Private attachment not found.');
      const bytes = Buffer.from(file.content);
      if (bytes.length !== file.byteSize || createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new ConflictException('PARTICIPATION_SOURCE_ATTACHMENT');
      return { bytes, filename: file.filename };
    });
    await this.db.serializable(tx => this.access(tx, actorId, id));
    return result;
  }
}
