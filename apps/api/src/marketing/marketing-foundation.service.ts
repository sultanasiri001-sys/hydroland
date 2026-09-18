import { BadRequestException, Injectable } from '@nestjs/common';
import { MarketingAudience, MarketingCampaign, MarketingContentAsset } from './marketing.domain';

@Injectable()
export class MarketingFoundationService {
  validateAudience(audience: MarketingAudience): MarketingAudience {
    if (!audience.id || !audience.organizationId || !audience.name.trim() || !audience.segmentDefinition.trim()) throw new BadRequestException('Marketing audience identity and segment are required.');
    return audience;
  }

  validateCampaign(campaign: MarketingCampaign, audience: MarketingAudience): MarketingCampaign {
    this.validateAudience(audience);
    if (!campaign.id || !campaign.organizationId || !campaign.name.trim() || !campaign.objective.trim()) throw new BadRequestException('Marketing campaign identity and objective are required.');
    if (campaign.organizationId !== audience.organizationId || campaign.audienceId !== audience.id) throw new BadRequestException('Marketing campaign audience scope mismatch.');
    if (!campaign.channels.length) throw new BadRequestException('At least one marketing channel is required.');
    if (campaign.startAt && campaign.endAt && campaign.endAt <= campaign.startAt) throw new BadRequestException('Campaign end must be after start.');
    return campaign;
  }

  validateContent(asset: MarketingContentAsset, campaign: MarketingCampaign): MarketingContentAsset {
    if (!asset.id || !asset.organizationId || !asset.title.trim()) throw new BadRequestException('Marketing content identity and title are required.');
    if (asset.organizationId !== campaign.organizationId || asset.campaignId !== campaign.id) throw new BadRequestException('Marketing content campaign scope mismatch.');
    return asset;
  }
}
