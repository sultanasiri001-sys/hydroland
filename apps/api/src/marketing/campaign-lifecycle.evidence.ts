import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { evidenceDigest, validateEvidenceRecord } from '../agents/operational-evidence.domain';
import { genericDocumentTemplateWhere } from '../participation/participation-privacy';
import { campaignHash, campaignJson } from './campaign-lifecycle.domain';
import { campaignDocument, CampaignPlatform } from './campaign-lifecycle.sources';

type Campaign = { id: string; channels: unknown };
export type CampaignEvidence = Awaited<ReturnType<typeof campaignEvidence>>;

/** Existing OperationalEvidence is the only facts/measurement ledger. This
 * reader adds current native-proof and preparation scope checks; it does not
 * promote a manually recorded observation into a provider confirmation. */
export async function campaignEvidence(tx: Prisma.TransactionClient, p: CampaignPlatform, id: string, campaign: Campaign, approvedAt: string | null, lock = false, publicationOnly = false): Promise<{
  id: string; kind: string; reference: string; revision: number; hash: string; occurredAt: string; actorAccountId: string;
  details: Record<string, any>; proof: { id: string; version: number; hash: string; referenceNumber: string; title: string };
  provenance: 'OWNER_RECORDED'; providerVerified: false;
}> {
  if (lock) await tx.$queryRaw`SELECT "id" FROM "OperationalEvidence" WHERE "id"::text=${id} AND "organizationId"::text=${p.id} FOR SHARE`;
  const row = await tx.operationalEvidence.findFirst({ where: { id, organizationId: p.id, kind: publicationOnly ? 'CAMPAIGN_PUBLICATION' : { in: ['CAMPAIGN_PUBLICATION', 'CAMPAIGN_ANALYTICS'] }, proofDocument: { template: genericDocumentTemplateWhere } } });
  if (!row) throw new NotFoundException('Campaign operational evidence is unavailable.');
  validateEvidenceRecord(row);
  const history = await tx.operationalEvidenceRevision.findUnique({ where: { evidenceId_revision: { evidenceId: id, revision: row.revision } } });
  if (!history) throw new ConflictException('CAMPAIGN_EVIDENCE_HISTORY_MISSING');
  const { recordDigest, ...record } = history;
  if (evidenceDigest(record) !== recordDigest || evidenceDigest(history.snapshot) !== evidenceDigest(campaignJson(row))) throw new ConflictException('CAMPAIGN_EVIDENCE_INTEGRITY');
  const details = row.details as Record<string, any>;
  if (row.status !== 'RECORDED' || !row.recordedAt || row.occurredAt > new Date() || row.department !== 'MARKETING_GROWTH' || details.campaignDraftId !== campaign.id) throw new ConflictException('CAMPAIGN_EVIDENCE_NOT_CURRENT');
  const proof = await campaignDocument(tx, p, row.proofDocumentId, lock);
  if (proof.version !== row.proofVersion || proof.department !== 'MARKETING_GROWTH' || row.proofContentHash !== (await tx.managedDocument.findUniqueOrThrow({ where: { id: proof.id }, select: { contentHash: true } })).contentHash) throw new ConflictException('CAMPAIGN_EVIDENCE_PROOF_CHANGED');
  let publicationHash: string | null = null;
  if (row.kind === 'CAMPAIGN_PUBLICATION') {
    if (!(campaign.channels as string[]).includes(details.channel) || approvedAt && row.occurredAt.getTime() < Date.parse(approvedAt)) throw new ConflictException('CAMPAIGN_PUBLICATION_SCOPE_CHANGED');
  } else {
    const publication = await campaignEvidence(tx, p, details.publicationEvidenceId, campaign, approvedAt, lock, true);
    if (publication.kind !== 'CAMPAIGN_PUBLICATION' || Date.parse(publication.occurredAt) > Date.parse(details.windowStart)
      || Date.parse(details.windowStart) >= Date.parse(details.windowEnd) || Date.parse(details.windowEnd) > row.occurredAt.getTime()) throw new ConflictException('CAMPAIGN_ANALYTICS_WINDOW_INVALID');
    publicationHash = publication.hash;
  }
  return { id: row.id, kind: row.kind, reference: row.reference, revision: row.revision, hash: campaignHash({ recordDigest: row.recordDigest, proofHash: proof.hash, publicationHash }),
    occurredAt: row.occurredAt.toISOString(), actorAccountId: row.createdByAccountId, details, proof: { id: proof.id, version: proof.version, hash: proof.hash, referenceNumber: proof.referenceNumber, title: proof.title },
    provenance: 'OWNER_RECORDED', providerVerified: false };
}

export function campaignMeasurements(evidence: CampaignEvidence[]) {
  const publications = new Map(evidence.filter(row => row.kind === 'CAMPAIGN_PUBLICATION').map(row => [row.id, row]));
  const windows = evidence.filter(row => row.kind === 'CAMPAIGN_ANALYTICS' && publications.has(row.details.publicationEvidenceId)).map(row => ({
    evidenceId: row.id, reference: row.reference, publicationEvidenceId: row.details.publicationEvidenceId as string,
    channel: publications.get(row.details.publicationEvidenceId)!.details.channel as string, windowStart: row.details.windowStart as string, windowEnd: row.details.windowEnd as string,
    impressions: row.details.impressions as number, clicks: row.details.clicks as number, conversions: row.details.conversions as number,
    provenance: row.provenance, providerVerified: false, proof: row.proof,
  }));
  const overlaps: { evidenceIds: string[]; channel: string }[] = [];
  for (let a = 0; a < windows.length; a++) for (let b = a + 1; b < windows.length; b++) {
    const one = windows[a], two = windows[b];
    if (one.channel === two.channel && one.windowStart < two.windowEnd && two.windowStart < one.windowEnd) overlaps.push({ evidenceIds: [one.evidenceId, two.evidenceId], channel: one.channel });
  }
  return { windows, overlaps, aggregate: null, roi: null,
    reasonCodes: [...(windows.length ? ['PER_WINDOW_ONLY'] : ['MEASUREMENTS_UNAVAILABLE']), ...(overlaps.length ? ['OVERLAPPING_WINDOWS_NOT_SUMMED'] : []), 'PROVIDER_NOT_VERIFIED', 'ROI_UNAVAILABLE_NO_EXECUTION_OR_REVENUE_SOURCE'] };
}
