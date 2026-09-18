import { BadRequestException, Injectable } from '@nestjs/common';
import { MarketingCampaign } from './marketing.domain';

export type MarketingOperationalSourceType = 'TRIP' | 'TRAINING' | 'STORE' | 'RENTAL' | 'CENTER_SERVICE';

export interface MarketingOperationalSource {
  organizationId: string;
  type: MarketingOperationalSourceType;
  id: string;
  exists: boolean;
  marketable: boolean;
}

export interface MarketingAttribution {
  campaignId: string;
  organizationId: string;
  sourceType: MarketingOperationalSourceType;
  sourceId: string;
  customerId?: string;
  bookingId?: string;
  transactionId?: string;
}

@Injectable()
export class MarketingOperationsService {
  validateCampaignSource(campaign: MarketingCampaign, source: MarketingOperationalSource): MarketingOperationalSource {
    if (campaign.status !== 'ACTIVE') throw new BadRequestException('Only active campaigns can integrate with operational services.');
    if (campaign.organizationId !== source.organizationId) throw new BadRequestException('Marketing operational organization scope mismatch.');
    if (!source.id || !source.exists) throw new BadRequestException('Marketing operational source does not exist.');
    if (!source.marketable) throw new BadRequestException('Operational source is not approved for marketing.');
    return source;
  }

  attribution(campaign: MarketingCampaign, source: MarketingOperationalSource, links: { customerId?: string; bookingId?: string; transactionId?: string }): MarketingAttribution {
    this.validateCampaignSource(campaign, source);
    if (!links.customerId && !links.bookingId && !links.transactionId) throw new BadRequestException('At least one attribution link is required.');
    return { campaignId: campaign.id, organizationId: campaign.organizationId, sourceType: source.type, sourceId: source.id, ...links };
  }
}
