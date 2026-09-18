import { BadRequestException, Injectable } from '@nestjs/common';
import { InnovationOpportunity, MarketStudy, ResearchInitiative, ResearchInitiativeStatus } from './research-market.domain';

export type ResearchDecision = 'APPROVE' | 'REJECT';

export interface ResearchReview {
  id: string; organizationId: string; subjectId: string;
  requestedByAccountId: string; reviewerAccountId?: string; decision?: ResearchDecision;
}

@Injectable()
export class ResearchMarketWorkflowService {
  requestReview(organizationId: string, subjectId: string, requesterId: string): ResearchReview {
    if (!organizationId || !subjectId || !requesterId) throw new BadRequestException('Research review scope, subject and requester are required.');
    return { id: `review-${subjectId}`, organizationId, subjectId, requestedByAccountId: requesterId };
  }

  decide(review: ResearchReview, reviewerId: string, decision: ResearchDecision): ResearchReview {
    if (!reviewerId || review.decision) throw new BadRequestException('Pending research review and reviewer are required.');
    if (review.requestedByAccountId === reviewerId) throw new BadRequestException('Independent research review is required.');
    return { ...review, reviewerAccountId: reviewerId, decision };
  }

  activateInitiative(item: ResearchInitiative, review: ResearchReview): ResearchInitiative {
    if (item.status !== ResearchInitiativeStatus.PROPOSED || review.decision !== 'APPROVE') throw new BadRequestException('Approved proposed research initiative is required.');
    this.assertScope(item.organizationId, item.id, review);
    return { ...item, status: ResearchInitiativeStatus.ACTIVE };
  }

  completeInitiative(item: ResearchInitiative): ResearchInitiative {
    if (item.status !== ResearchInitiativeStatus.ACTIVE) throw new BadRequestException('Only an active research initiative can be completed.');
    return { ...item, status: ResearchInitiativeStatus.COMPLETED };
  }

  approveStudy(item: MarketStudy, review: ResearchReview): MarketStudy {
    if (review.decision !== 'APPROVE') throw new BadRequestException('Approved market study review is required.');
    this.assertScope(item.organizationId, item.id, review);
    if (!item.evidenceReferences?.length) throw new BadRequestException('Evidence-backed market study is required.');
    return item;
  }

  approveOpportunity(item: InnovationOpportunity, review: ResearchReview): InnovationOpportunity {
    if (review.decision !== 'APPROVE') throw new BadRequestException('Approved innovation opportunity review is required.');
    this.assertScope(item.organizationId, item.id, review);
    return item;
  }

  private assertScope(organizationId: string, subjectId: string, review: ResearchReview): void {
    if (review.organizationId !== organizationId || review.subjectId !== subjectId) throw new BadRequestException('Research review scope mismatch.');
  }
}
