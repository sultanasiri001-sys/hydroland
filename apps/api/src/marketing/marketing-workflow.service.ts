import { BadRequestException, Injectable } from '@nestjs/common';
import { MarketingCampaign, MarketingContentAsset } from './marketing.domain';

export type MarketingApprovalStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED';

export interface MarketingApprovalRequest {
  id: string;
  campaignId: string;
  organizationId: string;
  status: MarketingApprovalStatus;
  requestedBy: string;
  approvedBy?: string;
}

@Injectable()
export class MarketingWorkflowService {
  requestApproval(campaign: MarketingCampaign, requesterId: string): MarketingApprovalRequest {
    if (!requesterId) throw new BadRequestException('Requester is required.');
    if (campaign.status !== 'DRAFT' && campaign.status !== 'PAUSED') throw new BadRequestException('Campaign cannot request approval from its current state.');
    return { id: `marketing-approval-${campaign.id}`, campaignId: campaign.id, organizationId: campaign.organizationId, status: 'REQUESTED', requestedBy: requesterId };
  }

  decide(request: MarketingApprovalRequest, approverId: string, decision: 'APPROVED' | 'REJECTED'): MarketingApprovalRequest {
    if (request.status !== 'REQUESTED') throw new BadRequestException('Marketing approval request is already decided.');
    if (!approverId || request.requestedBy === approverId) throw new BadRequestException('Independent approver is required.');
    return { ...request, status: decision, approvedBy: approverId };
  }

  activate(campaign: MarketingCampaign, approval: MarketingApprovalRequest, assets: MarketingContentAsset[]): MarketingCampaign {
    if (approval.campaignId !== campaign.id || approval.organizationId !== campaign.organizationId || approval.status !== 'APPROVED') throw new BadRequestException('Approved campaign authorization is required.');
    if (!assets.length || assets.some((asset) => asset.campaignId !== campaign.id || asset.organizationId !== campaign.organizationId || !asset.approved)) throw new BadRequestException('All campaign content must be approved and scoped.');
    return { ...campaign, status: 'ACTIVE' };
  }

  pause(campaign: MarketingCampaign): MarketingCampaign {
    if (campaign.status !== 'ACTIVE') throw new BadRequestException('Only active campaigns can be paused.');
    return { ...campaign, status: 'PAUSED' };
  }

  complete(campaign: MarketingCampaign): MarketingCampaign {
    if (campaign.status !== 'ACTIVE' && campaign.status !== 'PAUSED') throw new BadRequestException('Campaign cannot be completed from its current state.');
    return { ...campaign, status: 'COMPLETED' };
  }
}
