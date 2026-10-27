import { BadRequestException, ConflictException } from '@nestjs/common';
import { InternalResearchInitiative, InternalResearchRevision } from '@prisma/client';
import { decisionDigest, scopeId } from '../document-forms/owner-administrative-decision.domain';
import { templateObject } from '../document-forms/document-template-input';
import { boundedNote, validExpiry } from '../document-forms/internal-document-review.domain';

export const RESEARCH_POLICY = 'INTERNAL_DESK_RESEARCH_V1';
export const RESEARCH_DEPARTMENT = 'RND_MARKET_INTELLIGENCE';
export const RESEARCH_NOTICE = 'مسار بحث مكتبي داخلي فقط. قبول المراجعة وإكمال السجل لا يجيزان إنفاقًا أو استثمارًا أو نشرًا أو جمع بيانات خارجيًا أو إرسالًا لنموذج، ولا يقفلان الإدارة أو يمنحان صلاحية على مستندات أخرى.';
export const RESEARCH_STATES = ['PROPOSED','PROPOSAL_REVIEW','APPROVED','ACTIVE','RESULT_REVIEW','VERIFIED','COMPLETED','ARCHIVED','REJECTED','CANCELLED'] as const;
export type ResearchPhase = 'PROPOSAL' | 'RESULT';
export type ResearchTransition = 'START' | 'COMPLETE' | 'ARCHIVE' | 'CANCEL';
export type ReferenceInput = { documentId: string; version: number };
export type ResearchSection = { title: string; summary: string; method: string; limitations: string; evidence: ReferenceInput[] };
export type ResolvedReference = ReferenceInput & { referenceNumber: string; contentHash: string; sourceHash: string };
export type SavedResearchSection = Omit<ResearchSection, 'evidence'> & { evidence: ResolvedReference[] };
export type ResearchContent = { proposal: SavedResearchSection; result: SavedResearchSection | null; proposalAuthorPersonId: string; resultAuthorPersonId: string | null };
const text = (value: unknown, label: string, max: number, min = 5) => {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) throw new BadRequestException(`${label}: أدخل نصًا من ${min} إلى ${max} حرف.`);
  return value.trim();
};
export function researchVersion(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) throw new BadRequestException('إصدار البحث غير صالح.');
  return Number(value);
}
export function researchPhase(value: unknown): ResearchPhase {
  if (value !== 'PROPOSAL' && value !== 'RESULT') throw new BadRequestException('اختر مراجعة المقترح أو النتيجة.');
  return value;
}
export function researchSection(value: unknown, phase: ResearchPhase): ResearchSection {
  const x = templateObject(value, ['title','summary','method','limitations','evidence']);
  if (!Array.isArray(x.evidence) || x.evidence.length > 5 || phase === 'RESULT' && x.evidence.length === 0) throw new BadRequestException('مراجع الأدلة: حتى خمسة مستندات، ومرجع واحد على الأقل للنتيجة.');
  const evidence = x.evidence.map(value => {
    const e = templateObject(value, ['documentId','version']); scopeId(e.documentId);
    return { documentId: e.documentId, version: researchVersion(e.version) };
  }).sort((a,b) => a.documentId.localeCompare(b.documentId));
  if (new Set(evidence.map(e => e.documentId)).size !== evidence.length) throw new BadRequestException('لا تكرر مرجع المستند.');
  return { title: text(x.title,'العنوان',200), summary: text(x.summary,'الهدف أو النتيجة',4000,20), method: text(x.method,'منهج البحث',2000,10), limitations: text(x.limitations,'الحدود والافتراضات',2000,10), evidence };
}
export function researchCreateInput(body: unknown) {
  const x = templateObject(body, ['requestKey','proposal','confirmed']); scopeId(x.requestKey);
  if (x.confirmed !== true) throw new BadRequestException('أكّد حفظ المقترح الداخلي؛ لا يمنح ذلك اعتمادًا أو تصريح تنفيذ خارجي.');
  return { requestKey: x.requestKey, proposal: researchSection(x.proposal,'PROPOSAL') };
}
export function researchRevisionInput(body: unknown) {
  const x = templateObject(body, ['expectedRevision','phase','section','reason','confirmed']), phase = researchPhase(x.phase);
  if (x.confirmed !== true) throw new BadRequestException('أكّد حفظ الإصدار الجديد وإبطال المراجعة السابقة لهذه المرحلة.');
  return { expectedRevision: researchVersion(x.expectedRevision), phase, section: researchSection(x.section,phase), reason: boundedNote(x.reason) };
}
export function researchAssignmentInput(body: unknown, confirmed = false) {
  const x = templateObject(body, ['expectedRevision','phase','reviewerAccountId','expiresAt','reason', ...(confirmed ? ['expectedPlanHash','confirmed'] : [])]);
  scopeId(x.reviewerAccountId);
  if (typeof x.expiresAt !== 'string') throw new BadRequestException('وقت انتهاء التكليف غير صالح.');
  validExpiry(x.expiresAt);
  if (confirmed) confirmPlan(x);
  return { expectedRevision: researchVersion(x.expectedRevision), phase: researchPhase(x.phase), reviewerAccountId: x.reviewerAccountId, expiresAt: x.expiresAt, reason: boundedNote(x.reason), expectedPlanHash: confirmed ? x.expectedPlanHash as string : undefined };
}
export function researchTransitionInput(body: unknown, confirmed = false) {
  const x = templateObject(body, ['expectedRevision','action','reason', ...(confirmed ? ['expectedPlanHash','confirmed'] : [])]);
  if (typeof x.action !== 'string' || !['START','COMPLETE','ARCHIVE','CANCEL'].includes(x.action)) throw new BadRequestException('انتقال البحث غير صالح.');
  if (confirmed) confirmPlan(x);
  return { expectedRevision: researchVersion(x.expectedRevision), action: x.action as ResearchTransition, reason: boundedNote(x.reason), expectedPlanHash: confirmed ? x.expectedPlanHash as string : undefined };
}
function confirmPlan(x: Record<string,unknown>) {
  if (x.confirmed !== true || typeof x.expectedPlanHash !== 'string' || !/^[a-f0-9]{64}$/.test(x.expectedPlanHash)) throw new BadRequestException('راجع المعاينة وأكّد الخطة نفسها.');
}
export function researchContent(row: InternalResearchInitiative): ResearchContent {
  const x = row.content as unknown as ResearchContent;
  try {
    if (!x || row.policyVersion !== RESEARCH_POLICY || !RESEARCH_STATES.includes(row.status as never) || !x.proposalAuthorPersonId || (x.result && !x.resultAuthorPersonId)) throw new Error();
    for (const [phase, section] of [['PROPOSAL',x.proposal],['RESULT',x.result]] as const) {
      if (!section) { if (phase === 'PROPOSAL') throw new Error(); continue; }
      researchSection({ ...section, evidence: section.evidence.map(e => ({ documentId:e.documentId,version:e.version })) },phase);
      if (section.evidence.some(e => !e.referenceNumber || !e.contentHash || !/^[a-f0-9]{64}$/.test(e.sourceHash))) throw new Error();
    }
    return x;
  } catch { throw new ConflictException('محتوى سجل البحث غير متسق؛ يلزم مراجعة تاريخه.'); }
}
export const jsonDigest = (value: unknown) => decisionDigest(JSON.parse(JSON.stringify(value)));
export const researchRecordDigest = (row: Pick<InternalResearchInitiative,'id'|'organizationId'|'policyVersion'|'revision'|'status'|'content'|'createdByAccountId'|'createdByPersonId'|'currentReviewId'|'proposalReviewId'|'resultReviewId'>) => jsonDigest({ id:row.id,organizationId:row.organizationId,policyVersion:row.policyVersion,revision:row.revision,status:row.status,content:row.content,createdByAccountId:row.createdByAccountId,createdByPersonId:row.createdByPersonId,currentReviewId:row.currentReviewId,proposalReviewId:row.proposalReviewId,resultReviewId:row.resultReviewId });
export const researchRevisionDigest = (row: Omit<InternalResearchRevision,'recordDigest'>) => jsonDigest(row);
