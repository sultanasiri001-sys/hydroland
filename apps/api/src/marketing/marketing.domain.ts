export type MarketingCampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
export type MarketingChannel = 'APP' | 'WEB' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'SOCIAL' | 'PAID_ADS';

export interface MarketingAudience {
  id: string;
  organizationId: string;
  name: string;
  segmentDefinition: string;
  active: boolean;
}

export interface MarketingCampaign {
  id: string;
  organizationId: string;
  name: string;
  status: MarketingCampaignStatus;
  audienceId: string;
  channels: MarketingChannel[];
  objective: string;
  startAt?: Date;
  endAt?: Date;
}

export interface MarketingContentAsset {
  id: string;
  organizationId: string;
  campaignId: string;
  title: string;
  contentType: 'POST' | 'IMAGE' | 'VIDEO' | 'EMAIL' | 'LANDING_PAGE' | 'AD';
  language: 'AR' | 'EN';
  approved: boolean;
}
