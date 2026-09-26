export type IntegrationKey = 'WEATHER_MARINE' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PAYMENT_PSP' | 'BANKING_SETTLEMENT' | 'OBJECT_STORAGE' | 'TRANSLATION_ENGINE' | 'MAPS_GEO' | 'ESIGN' | 'CERTIFICATION' | 'DISTRESS_AIS' | 'NAFATH' | 'REGULATORY';
export type IntegrationStatus = 'NOT_SELECTED' | 'SANDBOX' | 'CONFIGURED' | 'VERIFIED' | 'PRODUCTION_ENABLED' | 'DEGRADED' | 'DISABLED';
export interface IntegrationDescriptor { key:IntegrationKey; name:string; category:'marine'|'messaging'|'payments'|'storage'|'translation'|'maps'|'documents'|'certification'|'identity'|'regulatory'; status:IntegrationStatus; requiresHumanApproval:boolean; supportsWebhook:boolean; }
export interface VerifiedWebhook { provider:IntegrationKey; eventId:string; eventType:string; receivedAt:string; payload:Record<string,unknown>; }

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

export interface DistressAisReadinessPayload {
  service:string;
  integration:'DISTRESS_AIS';
  status:IntegrationStatus;
  provider:string;
  aisReady:boolean;
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

export interface MapsPublicConfigPayload {
  engine:'MAPLIBRE';
  engineVersion:string;
  status:IntegrationStatus;
  provider:string;
  enabled:boolean;
  styleUrl:string|null;
  attribution:string|null;
}

export interface WeatherPublicConfigPayload {
  status:IntegrationStatus;
  provider:'STORMGLASS';
  configured:boolean;
  sandbox:boolean;
}
