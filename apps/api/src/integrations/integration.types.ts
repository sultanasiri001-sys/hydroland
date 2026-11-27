export type IntegrationKey = 'WEATHER_MARINE' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PAYMENT_PSP' | 'BANKING_SETTLEMENT' | 'OBJECT_STORAGE' | 'TRANSLATION_ENGINE' | 'MAPS_GEO' | 'ESIGN' | 'CERTIFICATION' | 'DISTRESS_AIS' | 'NAFATH' | 'REGULATORY' | 'AI_MODEL';
export type IntegrationStatus = 'NOT_SELECTED' | 'SANDBOX' | 'CONFIGURED' | 'VERIFIED' | 'PRODUCTION_ENABLED' | 'DEGRADED' | 'DISABLED';
export interface IntegrationDescriptor { key:IntegrationKey; name:string; category:'marine'|'messaging'|'payments'|'storage'|'translation'|'maps'|'documents'|'certification'|'identity'|'regulatory'|'ai'; status:IntegrationStatus; requiresHumanApproval:boolean; supportsWebhook:boolean; }
export interface VerifiedWebhook { provider:IntegrationKey; eventId:string; eventType:string; receivedAt:string; payload:Record<string,unknown>; }

import type { MarineReadinessEvidence } from './marine-provider-evidence';

export interface IntegrationReadinessPayload {
  service:string;
  integration:IntegrationKey;
  status:IntegrationStatus;
  provider:string;
  locallyConfigured:boolean;
  productionReady:boolean;
  sandboxReady:boolean;
  checks:Record<string,boolean>;
  commit:string;
  timestamp:string;
}

export interface DistressAisReadinessPayload extends MarineReadinessEvidence {
  service:string;
  integration:'DISTRESS_AIS';
  status:IntegrationStatus;
  provider:string;
  aisReady:boolean;
  aisConfigured:boolean;
  dataFreshness:{status:'UNASSESSED';reasonCodes:string[]};
  distressReady:boolean;
  productionReady:boolean;
  sandboxReady:boolean;
  checks:Record<string,boolean>;
  limitation:string;
  commit:string;
  timestamp:string;
}

export interface OfficialOnboardingReadinessPayload {
  service:string;
  integration:'NAFATH'|'REGULATORY';
  status:IntegrationStatus;
  provider:string;
  contractAccessReady:boolean;
  productionReady:boolean;
  sandboxReady:boolean;
  checks:Record<string,boolean>;
  blocker:string;
  commit:string;
  timestamp:string;
}

export interface MapsPublicConfigPayload extends MarineReadinessEvidence {
  engine:'MAPLIBRE';
  engineVersion:string;
  status:IntegrationStatus;
  provider:string;
  enabled:boolean;
  styleUrl:string|null;
  attribution:string|null;
  dataFreshness:{status:'NOT_ASSESSED';reasonCodes:string[]};
}

export interface WeatherPublicConfigPayload extends MarineReadinessEvidence {
  status:IntegrationStatus;
  provider:'STORMGLASS';
  configured:boolean;
  sandbox:boolean;
  dataFreshness:{status:'TRIP_REVIEW_REQUIRED';reasonCodes:string[]};
}
