export type IntegrationKey = 'WEATHER_MARINE' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PAYMENT_PSP' | 'BANKING_SETTLEMENT' | 'NAFATH' | 'REGULATORY';
export type IntegrationStatus = 'NOT_SELECTED' | 'SANDBOX_READY' | 'CONNECTED' | 'DISABLED';
export interface IntegrationDescriptor { key:IntegrationKey; name:string; category:'marine'|'messaging'|'payments'|'identity'|'regulatory'; status:IntegrationStatus; requiresHumanApproval:boolean; supportsWebhook:boolean; }
export interface VerifiedWebhook { provider:IntegrationKey; eventId:string; eventType:string; receivedAt:string; payload:Record<string,unknown>; }
