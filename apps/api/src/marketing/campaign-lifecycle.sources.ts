import { ConflictException, HttpException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { validateDocumentPayload } from '../document-forms/document-payload';
import { eligibleReviewParticipant, INTERNAL_REVIEW_POLICY, readGrant, reviewKey, reviewPlatform, reviewSource } from '../document-forms/internal-document-review.domain';
import { decisionDigest } from '../document-forms/owner-administrative-decision.domain';
import { genericDocumentTemplateWhere } from '../participation/participation-privacy';
import { campaignBudget, campaignHash, campaignJson, campaignObject, campaignRights, CAMPAIGN_TEMPLATES } from './campaign-lifecycle.domain';

type Tx = Prisma.TransactionClient;
export type CampaignPlatform = Awaited<ReturnType<typeof reviewPlatform>>;
export function campaignOwnerBinding(p: CampaignPlatform) {
  return { organizationId: p.id, ownerAccountId: p.ownerId, ownerPersonId: p.ownerPersonId, organizationRevision: p.updatedAt.toISOString(), platformRevision: p.platformRevision,
    ownerAuthorityRevision: p.ownerAuthorityRevision, ownerStatusRevision: p.ownerStatusRevision, ownerMemberRevision: p.ownerMemberRevision, ownerVerifiedAt: p.ownerVerifiedAt };
}
export const campaignSourceFailure = (error: unknown): string | null => {
  if (!(error instanceof HttpException) || ![400, 403, 404, 409].includes(error.getStatus())) return null;
  // A bounded code only. Infrastructure/DB errors must still propagate.
  return error instanceof NotFoundException ? 'SOURCE_UNAVAILABLE' : 'SOURCE_NOT_CURRENT';
};

/** Read the actual internal document path. APPROVED uses the existing
 * independent reviewer; SIGNED additionally uses the existing signer. No new
 * three-person requirement is imposed on an approved, unsigned source.
 * A review-link expiry ends access, not the document's explicit validity. */
export async function campaignDocument(tx: Tx, p: CampaignPlatform, documentId: string, lock = false) {
  const native = await tx.managedDocument.findFirst({ where: { id: documentId, organizationId: p.id, template: genericDocumentTemplateWhere },
    include: { template: true, lifecycleEvents: true, attachments: true } });
  if (!native) throw new NotFoundException('Campaign source is unavailable.');
  if (lock) {
    const accounts = [...new Set([native.createdByAccountId, native.approvedByAccountId, native.signedByAccountId].filter((id): id is string => Boolean(id)))].sort();
    await tx.$queryRaw`SELECT "id" FROM "ManagedDocument" WHERE "id"::text=${documentId} AND "organizationId"::text=${p.id} FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "DocumentTemplate" WHERE "id"::text=${native.templateId} FOR SHARE`;
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Account" WHERE "id"::text IN (${Prisma.join(accounts)}) ORDER BY "id" FOR SHARE`);
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "RoleAssignment" WHERE "accountId"::text IN (${Prisma.join(accounts)}) ORDER BY "id" FOR SHARE`);
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "OrganizationMember" WHERE "organizationId"::text=${p.id} AND "accountId"::text IN (${Prisma.join(accounts)}) ORDER BY "id" FOR SHARE`);
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Employment" WHERE "organizationId"::text=${p.id} AND "accountId"::text IN (${Prisma.join(accounts)}) ORDER BY "id" FOR SHARE`);
    await tx.$queryRaw`SELECT "key" FROM "OperationalSetting" WHERE "key"=${reviewKey(p.id, documentId)} FOR SHARE`;
  }
  if (!['APPROVED', 'SIGNED'].includes(native.status) || native.template.status !== 'ACTIVE') throw new ConflictException('CAMPAIGN_SOURCE_NOT_ACTIVE');
  const source = await reviewSource(tx, p.id, documentId);
  validateDocumentPayload(native.template.fields, native.payload);
  const storedGrant = await tx.operationalSetting.findUnique({ where: { key: reviewKey(p.id, documentId) }, select: { value: true } });
  const grant = readGrant(storedGrant?.value, p.id, documentId);
  if (!grant || grant.state !== 'ACTIVE' || grant.documentVersion !== native.version || grant.sourceHash !== source.sourceHash
    || grant.ownerId !== p.ownerId || grant.ownerPersonId !== p.ownerPersonId || grant.organizationRevision !== p.updatedAt.toISOString()
    || grant.platformRevision !== p.platformRevision || grant.ownerAuthorityRevision !== p.ownerAuthorityRevision || grant.ownerStatusRevision !== p.ownerStatusRevision
    || grant.ownerMemberRevision !== p.ownerMemberRevision || grant.ownerVerifiedAt !== p.ownerVerifiedAt) throw new ConflictException('CAMPAIGN_SOURCE_AUTHORITY_CHANGED');
  const createdBy = await tx.account.findFirst({ where: { id: native.createdByAccountId, status: 'ACTIVE', emailVerifiedAt: { not: null } }, select: { id: true, personId: true } });
  if (!createdBy || !native.approvedByAccountId || !native.approvedAt) throw new ConflictException('CAMPAIGN_SOURCE_APPROVAL_MISSING');
  const reviewer = await eligibleReviewParticipant(tx, p.id, native.department, native.approvedByAccountId);
  if (reviewer.binding.personId === createdBy.personId || grant.reviewer && campaignHash(grant.reviewer) !== campaignHash(reviewer.binding)
    || !grant.reviewer && (grant.approvalAtAssignment?.accountId !== native.approvedByAccountId || grant.approvalAtAssignment.personId !== reviewer.binding.personId || grant.approvalAtAssignment.approvedAt !== native.approvedAt.toISOString())) throw new ConflictException('CAMPAIGN_SOURCE_REVIEWER_CHANGED');
  const approvals = native.lifecycleEvents.filter(e => e.version === native.version && e.action === 'APPROVED' && e.fromStatus === 'PENDING_APPROVAL' && e.toStatus === 'APPROVED');
  const signatures = native.lifecycleEvents.filter(e => e.version === native.version && e.action === 'SIGNED' && e.fromStatus === 'APPROVED' && e.toStatus === 'SIGNED');
  const verifyReceipt = async (event: typeof approvals[number] | undefined, action: 'APPROVE' | 'SIGN', actorId: string, personId: string, timestamp: Date) => {
    if (!event || event.actorAccountId !== actorId) throw new ConflictException('CAMPAIGN_SOURCE_NATIVE_HISTORY_MISSING');
    const receipt = campaignObject(event.metadata), { receiptHash, ...body } = receipt;
    if (receipt.policy !== INTERNAL_REVIEW_POLICY || receipt.organizationId !== p.id || receipt.documentId !== documentId || receipt.sourceVersion !== native.version
      || receipt.sourceHash !== source.sourceHash || receipt.action !== action || receipt.actorAccountId !== actorId || receipt.actorPersonId !== personId
      || receipt.recordedAt !== timestamp.toISOString() || receiptHash !== decisionDigest(body) || timestamp > new Date()) throw new ConflictException('CAMPAIGN_SOURCE_NATIVE_RECEIPT_INVALID');
    const audited = await tx.auditEvent.findFirst({ where: { resource: 'InternalDocumentReview', resourceId: documentId, actorId: personId, action: 'INTERNAL_DOCUMENT_' + action,
      metadata: { path: ['receipt', 'receiptHash'], equals: receiptHash as string } }, select: { id: true } });
    if (!audited) throw new ConflictException('CAMPAIGN_SOURCE_NATIVE_AUDIT_MISSING');
  };
  if (approvals.length !== 1) throw new ConflictException('CAMPAIGN_SOURCE_APPROVAL_MISSING');
  await verifyReceipt(approvals[0], 'APPROVE', native.approvedByAccountId, reviewer.binding.personId, native.approvedAt);
  let signer = null;
  if (native.status === 'SIGNED') {
    if (!native.signedByAccountId || !native.signedAt || native.signedAt < native.approvedAt || signatures.length !== 1) throw new ConflictException('CAMPAIGN_SOURCE_SIGNATURE_MISSING');
    signer = await eligibleReviewParticipant(tx, p.id, native.department, native.signedByAccountId);
    if ([createdBy.personId, reviewer.binding.personId].includes(signer.binding.personId) || campaignHash(grant.signer) !== campaignHash(signer.binding)) throw new ConflictException('CAMPAIGN_SOURCE_SIGNER_CHANGED');
    await verifyReceipt(signatures[0], 'SIGN', native.signedByAccountId, signer.binding.personId, native.signedAt);
  }
  const attachments = native.attachments.sort((a, b) => a.id.localeCompare(b.id)).map(a => {
    const bytes = Buffer.from(a.content), sha256 = createHash('sha256').update(bytes).digest('hex');
    if (a.organizationId !== p.id || a.documentId !== documentId || a.byteSize !== bytes.length || a.sha256 !== sha256 || a.mimeType !== 'application/pdf' || bytes.subarray(0, 5).toString() !== '%PDF-') throw new ConflictException('CAMPAIGN_SOURCE_ATTACHMENT_CHANGED');
    return { id: a.id, filename: a.filename, sha256, byteSize: a.byteSize };
  });
  const snapshot = campaignJson({ id: native.id, organizationId: p.id, version: native.version, referenceNumber: native.referenceNumber, status: native.status, sourceHash: source.sourceHash,
    template: { id: native.template.id, code: native.template.code, version: native.template.version, department: native.department, fields: native.template.fields }, payload: native.payload,
    createdBy, reviewer: reviewer.binding, signer: signer?.binding ?? null, approvedAt: native.approvedAt, signedAt: native.signedAt, approvals, signatures, attachments,
    grant: { id: grant.id, state: grant.state, sourceHash: grant.sourceHash, owner: campaignOwnerBinding(p) } });
  return { id: native.id, version: native.version, hash: campaignHash(snapshot), referenceNumber: native.referenceNumber, title: native.template.titleAr, department: native.department,
    payload: campaignObject(native.payload), snapshot, template: native.template };
}

export async function campaignSource(tx: Tx, p: CampaignPlatform, documentId: string, kind: 'RIGHTS' | 'BUDGET', campaign: { id: string; revision: number; recordDigest: string; channels: unknown }, lock = false) {
  const source = await campaignDocument(tx, p, documentId, lock), definition = CAMPAIGN_TEMPLATES[kind === 'RIGHTS' ? 0 : 1];
  if (source.template.code !== definition.code || source.department !== definition.department || campaignHash(source.template.fields) !== campaignHash(definition.fields)) throw new ConflictException('CAMPAIGN_SOURCE_TEMPLATE_CHANGED');
  const terms = kind === 'RIGHTS' ? campaignRights(source.payload) : campaignBudget(source.payload);
  if (terms.campaignDraftId !== campaign.id || terms.draftRevision !== campaign.revision || terms.draftDigest !== campaign.recordDigest || campaignHash(terms.channels) !== campaignHash(campaign.channels)) throw new ConflictException('CAMPAIGN_SOURCE_SCOPE_CHANGED');
  const now = Date.now();
  if (Date.parse(terms.validFrom) > now || Date.parse(terms.validUntil) <= now) throw new ConflictException('CAMPAIGN_SOURCE_EXPIRED');
  return { ...source, terms };
}

export async function campaignFinanceAccount(tx: Tx, organizationId: string, financeAccountId: string, currency: string, lock = false) {
  if (lock) await tx.$queryRaw`SELECT "id" FROM "FinanceAccount" WHERE "id"::text=${financeAccountId} AND "organizationId"::text=${organizationId} FOR SHARE`;
  const account = await tx.financeAccount.findFirst({ where: { id: financeAccountId, organizationId, active: true, currency }, select: { id: true, organizationId: true, name: true, currency: true, active: true } });
  if (!account) throw new ConflictException('CAMPAIGN_BUDGET_ACCOUNT_UNAVAILABLE');
  return account;
}
