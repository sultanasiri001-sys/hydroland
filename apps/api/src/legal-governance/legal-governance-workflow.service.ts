import { BadRequestException, Injectable } from '@nestjs/common';
import { InsurancePolicy, InsuranceStatus, LegalDocument, LegalDocumentStatus, LegalObligation } from './legal-governance.domain';

export type LegalDecision = 'APPROVE' | 'REJECT';
export interface LegalReview {
  id: string; organizationId: string; legalDocumentId: string;
  requestedByAccountId: string; reviewerAccountId?: string; decision?: LegalDecision;
}

@Injectable()
export class LegalGovernanceWorkflowService {
  requestReview(document: LegalDocument, requesterId: string): LegalReview {
    if (!requesterId || document.status !== LegalDocumentStatus.DRAFT) throw new BadRequestException('Draft legal document and requester are required.');
    return { id: `legal-review-${document.id}`, organizationId: document.organizationId, legalDocumentId: document.id, requestedByAccountId: requesterId };
  }
  decide(review: LegalReview, reviewerId: string, decision: LegalDecision): LegalReview {
    if (!reviewerId || review.decision) throw new BadRequestException('Pending legal review and reviewer are required.');
    if (review.requestedByAccountId === reviewerId) throw new BadRequestException('Independent legal review is required.');
    return { ...review, reviewerAccountId: reviewerId, decision };
  }
  activate(document: LegalDocument, review: LegalReview, effectiveAt = new Date()): LegalDocument {
    if (document.status !== LegalDocumentStatus.DRAFT || review.decision !== 'APPROVE') throw new BadRequestException('Approved draft legal document is required.');
    this.assertScope(document, review);
    if (document.expiresAt && document.expiresAt <= effectiveAt) throw new BadRequestException('Legal document cannot activate after expiry.');
    return { ...document, status: LegalDocumentStatus.ACTIVE, effectiveAt };
  }
  terminate(document: LegalDocument): LegalDocument {
    if (document.status !== LegalDocumentStatus.ACTIVE) throw new BadRequestException('Only active legal documents can be terminated.');
    return { ...document, status: LegalDocumentStatus.TERMINATED };
  }
  fulfillObligation(obligation: LegalObligation, actorId: string): LegalObligation {
    if (!actorId || actorId !== obligation.responsibleAccountId) throw new BadRequestException('Responsible legal obligation account is required.');
    return { ...obligation, fulfilled: true };
  }
  activateInsurance(policy: InsurancePolicy, now = new Date()): InsurancePolicy {
    if (policy.status !== InsuranceStatus.PENDING || now < policy.startsAt || now >= policy.expiresAt) throw new BadRequestException('Insurance policy is not eligible for activation.');
    return { ...policy, status: InsuranceStatus.ACTIVE };
  }
  private assertScope(document: LegalDocument, review: LegalReview): void {
    if (review.organizationId !== document.organizationId || review.legalDocumentId !== document.id) throw new BadRequestException('Legal review scope mismatch.');
  }
}
