import { Injectable } from '@nestjs/common';
import { MarketingCampaign } from './marketing.domain';
import { MarketingAttribution } from './marketing-operations.service';

export interface MarketingGovernanceSnapshot {
  activeCampaigns: number;
  pausedCampaigns: number;
  completedCampaigns: number;
  attributedCustomers: number;
  attributedBookings: number;
  attributedTransactions: number;
  campaignsWithoutAttribution: number;
  alerts: string[];
  generatedAt: Date;
}

@Injectable()
export class MarketingGovernanceService {
  snapshot(campaigns: MarketingCampaign[], attributions: MarketingAttribution[]): MarketingGovernanceSnapshot {
    const activeCampaigns = campaigns.filter((campaign) => campaign.status === 'ACTIVE').length;
    const pausedCampaigns = campaigns.filter((campaign) => campaign.status === 'PAUSED').length;
    const completedCampaigns = campaigns.filter((campaign) => campaign.status === 'COMPLETED').length;
    const attributedCustomers = attributions.filter((item) => !!item.customerId).length;
    const attributedBookings = attributions.filter((item) => !!item.bookingId).length;
    const attributedTransactions = attributions.filter((item) => !!item.transactionId).length;
    const attributedCampaignIds = new Set(attributions.map((item) => item.campaignId));
    const campaignsWithoutAttribution = campaigns.filter((campaign) => campaign.status === 'ACTIVE' && !attributedCampaignIds.has(campaign.id)).length;
    const alerts: string[] = [];
    if (campaignsWithoutAttribution) alerts.push('ACTIVE_CAMPAIGN_WITHOUT_ATTRIBUTION');
    if (pausedCampaigns) alerts.push('PAUSED_CAMPAIGN_REVIEW');
    return { activeCampaigns, pausedCampaigns, completedCampaigns, attributedCustomers, attributedBookings, attributedTransactions, campaignsWithoutAttribution, alerts, generatedAt: new Date() };
  }

  automationSignals(snapshot: MarketingGovernanceSnapshot): string[] {
    const signals: string[] = [];
    if (snapshot.campaignsWithoutAttribution) signals.push('REVIEW_CAMPAIGN_TRACKING');
    if (snapshot.pausedCampaigns) signals.push('REVIEW_PAUSED_CAMPAIGNS');
    if (snapshot.activeCampaigns && !snapshot.attributedTransactions) signals.push('REVIEW_CONVERSION_PERFORMANCE');
    return signals;
  }
}
