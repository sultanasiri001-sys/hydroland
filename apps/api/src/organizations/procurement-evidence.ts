import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { validateDocumentPayload } from '../document-forms/document-payload';
import { PLATFORM_STAFFING_KEY, PLATFORM_STAFFING_KIND, record } from '../hr/staffing-catalog';
import { contractTerms, dateOnly, hash, json, object, PROCUREMENT_ROLES, ProcurementTerms, text } from './procurement.domain';

export async function procurementMember(tx: Prisma.TransactionClient, organizationId: string, accountId: string, manager = false) {
  const member = await tx.organizationMember.findUnique({ where: { organizationId_accountId: { organizationId, accountId } }, include: { account: { include: { person: true } } } });
  if (!member || member.status !== 'ACTIVE' || member.account.status !== 'ACTIVE' || !member.account.emailVerifiedAt || manager && !['OWNER', 'ADMIN'].includes(member.role)) throw new ForbiddenException('Active verified organization membership and the named procurement authority are required.');
  return { accountId, personId: member.account.personId, memberRole: member.role, name: [member.account.person.firstName, member.account.person.lastName].filter(Boolean).join(' '),
    membershipId: member.id, membershipUpdatedAt: member.updatedAt.toISOString(), accountUpdatedAt: member.account.updatedAt.toISOString() };
}

export async function procurementScope(tx: Prisma.TransactionClient, organizationId: string, accountId: string) {
  const organization = await tx.organization.findUnique({ where: { id: organizationId } });
  if (!organization || organization.status !== 'ACTIVE') throw new NotFoundException('Active organization not found.');
  const platform = await tx.operationalSetting.findUnique({ where: { key: PLATFORM_STAFFING_KEY }, select: { value: true } });
  if (organization.kind === PLATFORM_STAFFING_KIND || record(platform?.value).organizationId === organizationId) throw new ForbiddenException('Platform warehouse procurement uses its existing internal workflow.');
  const actor = await procurementMember(tx, organizationId, accountId);
  return { organization, actor };
}

export type ProcurementDocument = {
  id: string; organizationId: string; version: number; hash: string; referenceNumber: string; title: string; purpose: string | null;
  payload: Record<string, unknown>; createdByAccountId: string; approvedByAccountId: string; signedByAccountId: string | null;
  attachments: { id: string; filename: string; sha256: string; byteSize: number }[]; snapshot: Record<string, unknown>;
};

/** The digest is recomputed from native version, template, signature and bytes.
 * ManagedDocument.contentHash alone is never authority or document proof. */
export async function procurementDocument(tx: Prisma.TransactionClient, organizationId: string, documentId: string, options: { qualification?: boolean; pdf?: boolean } = {}): Promise<ProcurementDocument> {
  const document = await tx.managedDocument.findFirst({ where: { id: documentId, organizationId }, include: { template: true, revisions: true, lifecycleEvents: true, attachments: true } });
  if (!document) throw new NotFoundException('Procurement source document not found in the organization.');
  const approvedQualification = options.qualification && document.template.code === 'INV-SUPPLIER-QUALIFICATION' && document.status === 'APPROVED';
  if (!approvedQualification && !['SIGNED', 'ARCHIVED'].includes(document.status) || document.template.organizationId !== organizationId || document.department !== document.template.department) throw new ConflictException('A signed native source document is required.');
  validateDocumentPayload(document.template.fields, document.payload);
  const payload = object(document.payload);
  const revision = document.revisions.filter(row => row.version === document.version);
  if (revision.length !== 1 || revision[0].contentHash !== document.contentHash || hash(revision[0].payload) !== hash(payload)) throw new ConflictException('The source document no longer matches its immutable revision.');
  const approved = document.lifecycleEvents.filter(event => event.version === document.version && event.action === 'APPROVED' && event.fromStatus === 'PENDING_APPROVAL' && event.toStatus === 'APPROVED');
  const signed = document.lifecycleEvents.filter(event => event.version === document.version && event.action === 'SIGNED' && event.fromStatus === 'APPROVED' && event.toStatus === 'SIGNED');
  if (!document.approvedByAccountId || !document.approvedAt || approved.length !== 1 || approved[0].actorAccountId !== document.approvedByAccountId
    || !approvedQualification && (!document.signedByAccountId || !document.signedAt || signed.length !== 1 || signed[0].actorAccountId !== document.signedByAccountId
      || document.signedAt < document.approvedAt || document.signedAt > new Date())) throw new ConflictException('The native approval and signature history is incomplete.');
  const authors = await tx.account.findMany({ where: { id: { in: [document.createdByAccountId, document.approvedByAccountId, ...(document.signedByAccountId ? [document.signedByAccountId] : [])] } }, select: { id: true, personId: true } });
  const expectedActors = approvedQualification ? 2 : 3;
  if (authors.length !== expectedActors || new Set(authors.map(row => row.personId)).size !== expectedActors) throw new ConflictException('The procurement source requires person-level independent creation, approval and signature.');
  const signer = await procurementMember(tx, organizationId, document.signedByAccountId ?? document.approvedByAccountId, true);
  const brand = document.documentBrandVersion ? await tx.documentBrandSnapshot.findUnique({ where: { organizationId_brandVersion: { organizationId, brandVersion: document.documentBrandVersion } } }) : null;
  if (!brand) throw new ConflictException('The native document branding revision is missing.');
  const attachments = document.attachments.sort((a, b) => a.id.localeCompare(b.id)).map(attachment => {
    const bytes = Buffer.from(attachment.content), digest = createHash('sha256').update(bytes).digest('hex');
    if (attachment.organizationId !== organizationId || attachment.documentId !== documentId || bytes.length !== attachment.byteSize || digest !== attachment.sha256 || attachment.mimeType !== 'application/pdf' || bytes.subarray(0, 5).toString('ascii') !== '%PDF-') throw new ConflictException('The attached original PDF no longer matches its native bytes and digest.');
    return { id: attachment.id, filename: attachment.filename, sha256: digest, byteSize: bytes.length };
  });
  if (options.pdf && attachments.length === 0) throw new ConflictException('Attach the original PDF evidence before signing this document.');
  const snapshot = json({ id: document.id, organizationId, referenceNumber: document.referenceNumber, version: document.version, contentHash: document.contentHash,
    payload, template: { id: document.template.id, version: document.template.version, code: document.template.code, department: document.template.department,
      titleAr: document.template.titleAr, titleEn: document.template.titleEn, printable: document.template.printable, fields: document.template.fields },
    brand, revision: { id: revision[0].id, version: revision[0].version, contentHash: revision[0].contentHash, payload: revision[0].payload, createdByAccountId: revision[0].createdByAccountId, createdAt: revision[0].createdAt },
    authors: authors.sort((a, b) => a.id.localeCompare(b.id)), signatureAuthority: { accountId: signer.accountId, personId: signer.personId, membershipId: signer.membershipId, membershipUpdatedAt: signer.membershipUpdatedAt, memberRole: signer.memberRole },
    createdByAccountId: document.createdByAccountId, approvedByAccountId: document.approvedByAccountId, signedByAccountId: document.signedByAccountId,
    approvedAt: document.approvedAt, signedAt: document.signedAt, approvals: approved, signatures: signed, attachments });
  return { id: document.id, organizationId, version: document.version, hash: hash(snapshot), referenceNumber: document.referenceNumber,
    title: document.template.titleAr, purpose: typeof payload.purpose === 'string' ? payload.purpose : null, payload,
    createdByAccountId: document.createdByAccountId, approvedByAccountId: document.approvedByAccountId, signedByAccountId: document.signedByAccountId, attachments, snapshot };
}

export function documentReference(document: ProcurementDocument) {
  return { id: document.id, version: document.version, hash: document.hash, referenceNumber: document.referenceNumber, title: document.title };
}

export async function procurementSupplier(tx: Prisma.TransactionClient, organizationId: string, documentId: string) {
  const source = await procurementDocument(tx, organizationId, documentId, { qualification: true });
  const payload = source.payload, template = object(source.snapshot.template);
  if (payload.purpose !== 'F08_PROCUREMENT_SUPPLIER_V1' && template.code !== 'INV-SUPPLIER-QUALIFICATION') throw new ConflictException('A qualified supplier source is required.');
  const validUntil = dateOnly(payload.validUntil ?? payload.nextSupplierReviewDate, 'Supplier qualification expiry');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  if (validUntil < today) throw new ConflictException('Supplier qualification has expired.');
  return { ...source, supplierRef: text(payload.supplierRef, 'Supplier reference'), supplierName: text(payload.supplierName ?? payload.supplierRef, 'Supplier name'), acceptanceReference: text(payload.supplierAcceptanceRef, 'Supplier acceptance reference'), validUntil };
}

export async function procurementAuthority(tx: Prisma.TransactionClient, organizationId: string, terms: ProcurementTerms, expectedOwnerId?: string) {
  const organization = await tx.organization.findUnique({ where: { id: organizationId } });
  if (!organization || organization.status !== 'ACTIVE' || expectedOwnerId && organization.ownerId !== expectedOwnerId) throw new ConflictException('The organization or its owner mandate has changed. A new signed contract is required.');
  const owner = await procurementMember(tx, organizationId, organization.ownerId, true);
  const participants = {} as Record<typeof PROCUREMENT_ROLES[number], Awaited<ReturnType<typeof procurementMember>>>;
  for (const role of PROCUREMENT_ROLES) participants[role] = await procurementMember(tx, organizationId, terms.participants[role]);
  if (PROCUREMENT_ROLES.some(role => participants[role].memberRole === 'VIEWER')) throw new ForbiddenException('Read-only organization members cannot hold procurement execution or acceptance mandates.');
  const distinct = (accounts: { personId: string }[], reason: string) => { if (new Set(accounts.map(row => row.personId)).size !== accounts.length) throw new ConflictException(reason); };
  distinct([participants.maker, participants.recommender, owner], 'Purchase preparation, recommendation and owner approval require three independent people.');
  distinct([participants.receiver, participants.maker, owner], 'Receipt requires independence from purchase preparation and owner approval.');
  distinct([participants.accountant, participants.treasurer, owner], 'Finance preparation, approval and execution confirmation require three independent people.');
  if ([owner, participants.maker, participants.recommender, participants.receiver, participants.accountant, participants.treasurer].some(row => row.personId === participants.acceptor.personId)) throw new ConflictException('The named acceptance participant must be independent from all procurement execution roles.');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  if (today < terms.validFrom || today > terms.validUntil) throw new ConflictException('The signed procurement mandate is not currently effective.');
  return { owner, participants };
}

export async function procurementContract(tx: Prisma.TransactionClient, organizationId: string, documentId: string) {
  const source = await procurementDocument(tx, organizationId, documentId), terms = contractTerms(source.payload);
  const supplier = await procurementSupplier(tx, organizationId, terms.supplierDocumentId);
  if (supplier.hash !== terms.supplierDocumentHash) throw new ConflictException('The signed contract does not bind the current qualified supplier evidence.');
  const authority = await procurementAuthority(tx, organizationId, terms);
  return { source, supplier, terms, authority };
}

export function procurementAuthorityBinding(authority: Awaited<ReturnType<typeof procurementAuthority>>) {
  const binding = (participant: Awaited<ReturnType<typeof procurementMember>>) => ({ accountId: participant.accountId, personId: participant.personId, membershipId: participant.membershipId, membershipUpdatedAt: participant.membershipUpdatedAt, memberRole: participant.memberRole });
  return { owner: binding(authority.owner), participants: Object.fromEntries(PROCUREMENT_ROLES.map(role => [role, binding(authority.participants[role])])) };
}
