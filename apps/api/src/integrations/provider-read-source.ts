import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { lockAccountIdentities } from '../admin/admin-authorization';
import { reviewPlatform, reviewSource } from '../document-forms/internal-document-review.domain';
import { validateDocumentPayload } from '../document-forms/document-payload';
import { PLATFORM_STAFFING_KEY } from '../hr/staffing-catalog';
import { digest, MarineReadKey, object, parseProviderReadPolicy, providerReadFailure, ProviderReadUnavailable, ProviderSource, ProviderSourcePin, sourcePin } from './provider-read-policy';
import { ForbiddenException } from '@nestjs/common';

/** An environment pointer selects evidence; it never creates owner approval. */
export async function readProviderSource(tx: Prisma.TransactionClient, key: MarineReadKey, previewPin?:ProviderSourcePin): Promise<ProviderSource> {
  const pin = previewPin??sourcePin(key);
  try {
    const platform = await reviewPlatform(tx), source = await reviewSource(tx, platform.id, pin.documentId), d = source.d;
    if (!['APPROVED','SIGNED'].includes(d.status) || d.template.status !== 'ACTIVE' || d.template.code !== 'TECH-PROVIDER-ENTITLEMENT' || d.department !== 'TECHNOLOGY_SECURITY'
      || d.approvedByAccountId !== platform.ownerId || !d.approvedAt || d.approvedAt > new Date() || d.version !== pin.version || d.contentHash !== pin.contentHash || source.sourceHash !== pin.sourceHash) return providerReadFailure('SOURCE_APPROVAL_REQUIRED');
    validateDocumentPayload(d.template.fields, d.payload);
    const payload = object(d.payload);
    if (payload.purpose !== 'D03_PROVIDER_ENTITLEMENT' || typeof payload.policy !== 'string' || payload.policy.length > 12000) return providerReadFailure('SOURCE_POLICY_INVALID');
    let policyValue: unknown; try { policyValue = JSON.parse(payload.policy); } catch { return providerReadFailure('SOURCE_POLICY_INVALID'); }
    const policy = parseProviderReadPolicy(policyValue, key);
    const attachment = await tx.managedDocumentAttachment.findFirst({ where: { id: policy.attachmentId, documentId: d.id, organizationId: platform.id } });
    if (!attachment || attachment.createdAt > d.approvedAt || attachment.mimeType !== 'application/pdf' || attachment.byteSize < 5 || attachment.byteSize > 8 * 1024 * 1024) return providerReadFailure('SOURCE_ENTITLEMENT_EVIDENCE_REQUIRED');
    const bytes = Buffer.from(attachment.content), sha = createHash('sha256').update(bytes).digest('hex');
    if (bytes.length !== attachment.byteSize || bytes.subarray(0, 5).toString('ascii') !== '%PDF-' || sha !== attachment.sha256 || sha !== policy.attachmentSha256) return providerReadFailure('SOURCE_ENTITLEMENT_EVIDENCE_CHANGED');
    const status = process.env[`HYDROLAND_INTEGRATION_${key}_STATUS`]?.trim().toUpperCase();
    if (!previewPin&&status !== (policy.mode === 'SANDBOX' ? 'SANDBOX' : 'PRODUCTION_ENABLED')) return providerReadFailure('SOURCE_MODE_MISMATCH');
    if (!previewPin&&(key === 'MAPS_GEO' && process.env.HYDROLAND_MAP_PROVIDER?.trim() !== policy.provider || key === 'DISTRESS_AIS' && process.env.HYDROLAND_DISTRESS_AIS_PROVIDER?.trim().toUpperCase() !== policy.provider)) return providerReadFailure('SOURCE_SCOPE_MISMATCH');
    return { ...pin, policy, policyHash: digest(policy), organizationId: platform.id, ownerId: platform.ownerId, creatorId:d.createdByAccountId, templateId: d.templateId, referenceNumber: d.referenceNumber };
  } catch (error) {
    if (error instanceof ProviderReadUnavailable) throw error;
    return providerReadFailure('SOURCE_EVIDENCE_UNAVAILABLE');
  }
}

export async function inspectProviderCandidate(tx:Prisma.TransactionClient,actorId:string,key:MarineReadKey,documentId:string){
  const platform=await reviewPlatform(tx);
  if(platform.ownerId!==actorId)throw new ForbiddenException('Only the current platform owner may inspect a provider source binding.');
  const {d,sourceHash}=await reviewSource(tx,platform.id,documentId);
  const pin={documentId:d.id,version:d.version,contentHash:d.contentHash,sourceHash};
  await readProviderSource(tx,key,pin);
  return{pin,configured:false,providerVerified:false,automaticSafetyPermission:false};
}

/** Held through the single transport call; no automatic transaction retry. */
export async function lockProviderSource(tx: Prisma.TransactionClient, key: MarineReadKey, candidate: ProviderSource): Promise<ProviderSource> {
  await lockAccountIdentities(tx, [candidate.ownerId,candidate.creatorId]);
  await tx.$queryRaw`SELECT key FROM "OperationalSetting" WHERE key=${PLATFORM_STAFFING_KEY} FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "Organization" WHERE id::text=${candidate.organizationId} FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "OrganizationMember" WHERE "organizationId"::text=${candidate.organizationId} AND "accountId"::text=${candidate.ownerId} FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "ManagedDocument" WHERE id::text=${candidate.documentId} FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "DocumentTemplate" WHERE id::text=${candidate.templateId} FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "DocumentRevision" WHERE "documentId"::text=${candidate.documentId} FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "DocumentLifecycleEvent" WHERE "documentId"::text=${candidate.documentId} FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "ManagedDocumentAttachment" WHERE id::text=${candidate.policy.attachmentId} FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "DocumentBrandSnapshot" WHERE "organizationId"::text=${candidate.organizationId} FOR SHARE`;
  const current = await readProviderSource(tx, key);
  if (digest(current) !== digest(candidate)) return providerReadFailure('SOURCE_CHANGED');
  return current;
}
