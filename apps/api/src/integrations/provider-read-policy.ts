import { ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';

export type MarineReadKey = 'MAPS_GEO' | 'WEATHER_MARINE' | 'DISTRESS_AIS';
export type ProviderReadPolicy = {
  kind: 'D03_PROVIDER_ENTITLEMENT'; version: 1; integration: MarineReadKey; provider: string;
  mode: 'SANDBOX' | 'PRODUCTION'; enabled: true; validFrom: string; validUntil: string;
  attribution: string; termsUrl: string; entitlementReference: string; attachmentId: string; attachmentSha256: string;
  source: 'sg' | 'AIS' | 'MAP_STYLE'; maxDataAgeSeconds: number;
  allowedAisDataSources: string[];
  maxRequestsPerMinute: number; maxRequestsPerDay: number; costMode: 'NO_CHARGE' | 'BOUNDED';
  currency: string; maxCostMicrosPerRequest: number; maxCostMicrosPerDay: number;
  allowedOrigins: string[]; maxResourcesPerView: number;
};
export type ProviderSourcePin = { documentId: string; version: number; contentHash: string; sourceHash: string };
export type ProviderSource = ProviderSourcePin & { policy: ProviderReadPolicy; policyHash: string; organizationId: string; ownerId: string; creatorId: string; templateId: string; referenceNumber: string };
export type ProviderProvenance = { version: 1; policyHash: string; documentId: string; documentVersion: number; sourceHash: string; attribution: string; validUntil: string; maxDataAgeSeconds: number; purpose: 'INFORMATION_ONLY'; automaticSafetyPermission: false };
export class ProviderReadUnavailable extends ServiceUnavailableException {
  constructor(readonly reason: string) { super({ code: 'PROVIDER_READ_UNAVAILABLE', reason, message: 'مصدر البيانات غير متاح حاليًا؛ راجع صلاحية المصدر وحدود الاستخدام.' }); }
}
export const providerReadFailure = (reason: string): never => { throw new ProviderReadUnavailable(reason); };
export const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
export const canonical = (value: unknown): string => Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']' : value && typeof value === 'object' ? '{' + Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}' : JSON.stringify(value) ?? 'null';
export const digest = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
export function utcTime(value: unknown): number {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|\+00:00)$/.test(value))return NaN;
  const n=Date.parse(value);if(!Number.isFinite(n)||new Date(n).toISOString().slice(0,19)!==value.slice(0,19))return NaN;return n;
}
const identifier = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(value);
const hash = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const text = (value: unknown, max = 400): value is string => typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= max && !/[\u0000-\u001f\u007f<>]/u.test(value);
const integer = (value: unknown, min: number, max: number): value is number => Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
export function publicHttpsUrl(value: unknown): URL | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value), host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search || url.port || !host.includes('.') || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || /^[\d.]+$/.test(host) || host.includes(':')) return null;
    return url;
  } catch { return null; }
}
export function sourcePin(key: MarineReadKey): ProviderSourcePin {
  let value: unknown;
  try { value = JSON.parse(process.env[`HYDROLAND_D03_${key}_DOCUMENT`] || 'null'); } catch { return providerReadFailure('SOURCE_BINDING_INVALID'); }
  const p = object(value);
  if (!Object.keys(p).length) return providerReadFailure('SOURCE_APPROVAL_REQUIRED');
  if (Object.keys(p).length !== 4 || !identifier(p.documentId) || !integer(p.version, 1, 1_000_000) || !text(p.contentHash, 200) || !hash(p.sourceHash)) return providerReadFailure('SOURCE_BINDING_INVALID');
  return p as ProviderSourcePin;
}
export function parseProviderReadPolicy(value: unknown, key: MarineReadKey, now = Date.now()): ProviderReadPolicy {
  const p = object(value), fields = ['kind','version','integration','provider','mode','enabled','validFrom','validUntil','attribution','termsUrl','entitlementReference','attachmentId','attachmentSha256','source','maxDataAgeSeconds','allowedAisDataSources','maxRequestsPerMinute','maxRequestsPerDay','costMode','currency','maxCostMicrosPerRequest','maxCostMicrosPerDay','allowedOrigins','maxResourcesPerView'];
  if (Object.keys(p).length !== fields.length || Object.keys(p).some(k => !fields.includes(k)) || p.kind !== 'D03_PROVIDER_ENTITLEMENT' || p.version !== 1 || p.integration !== key || !text(p.provider, 80) || !['SANDBOX','PRODUCTION'].includes(String(p.mode)) || p.enabled !== true
    || !text(p.attribution) || !publicHttpsUrl(p.termsUrl) || !text(p.entitlementReference) || !identifier(p.attachmentId) || !hash(p.attachmentSha256)
    || !integer(p.maxDataAgeSeconds, 1, 86400) || !integer(p.maxRequestsPerMinute, key==='MAPS_GEO'?0:1, 100) || !integer(p.maxRequestsPerDay, key==='MAPS_GEO'?0:1, 100000)
    || !['NO_CHARGE','BOUNDED'].includes(String(p.costMode)) || typeof p.currency !== 'string' || !/^[A-Z]{3}$/.test(p.currency)
    || !integer(p.maxCostMicrosPerRequest, 0, 1_000_000_000) || !integer(p.maxCostMicrosPerDay, 0, 1_000_000_000_000)
    || !Array.isArray(p.allowedOrigins) || p.allowedOrigins.length > 8 || !p.allowedOrigins.every(v => publicHttpsUrl(v)?.origin === v)
    || !Array.isArray(p.allowedAisDataSources) || p.allowedAisDataSources.length>3 || !p.allowedAisDataSources.every(v=>['TER','SAT','ROAM'].includes(v)) || new Set(p.allowedAisDataSources).size!==p.allowedAisDataSources.length || (key==='DISTRESS_AIS'?p.allowedAisDataSources.length===0:p.allowedAisDataSources.length!==0)
    || new Set(p.allowedOrigins).size !== p.allowedOrigins.length || !integer(p.maxResourcesPerView, 1, 1000)) return providerReadFailure('SOURCE_POLICY_INVALID');
  const from = utcTime(p.validFrom), until = utcTime(p.validUntil);
  if (!Number.isFinite(from) || !Number.isFinite(until) || until <= from) return providerReadFailure('SOURCE_POLICY_INVALID');
  if (now < from) return providerReadFailure('SOURCE_NOT_YET_VALID');
  if (now >= until) return providerReadFailure('SOURCE_EXPIRED');
  if (p.costMode === 'NO_CHARGE' ? p.maxCostMicrosPerRequest !== 0 || p.maxCostMicrosPerDay !== 0 : Number(p.maxCostMicrosPerRequest) <= 0 || Number(p.maxCostMicrosPerDay) < Number(p.maxCostMicrosPerRequest)) return providerReadFailure('SOURCE_COST_INVALID');
  if (key === 'WEATHER_MARINE' && (p.provider !== 'STORMGLASS' || p.source !== 'sg' || p.allowedOrigins.length !== 1 || p.allowedOrigins[0] !== 'https://api.stormglass.io')) return providerReadFailure('SOURCE_SCOPE_MISMATCH');
  if (key === 'DISTRESS_AIS' && (p.provider !== 'MARINETRAFFIC_AIS_ONLY' || p.source !== 'AIS' || p.allowedOrigins.length !== 1 || p.allowedOrigins[0] !== 'https://services.marinetraffic.com')) return providerReadFailure('SOURCE_SCOPE_MISMATCH');
  // Browser tile traffic has no server-side billing reservation. Never expose a
  // metered layer under a client-only request counter advertised as a cost cap.
  if (key === 'MAPS_GEO' && (p.source !== 'MAP_STYLE' || p.costMode !== 'NO_CHARGE' || p.allowedOrigins.length === 0 || p.maxRequestsPerMinute!==0 || p.maxRequestsPerDay!==0)) return providerReadFailure('MAP_BILLING_UNSUPPORTED');
  return p as ProviderReadPolicy;
}
export function provenance(source: ProviderSource): ProviderProvenance {
  return { version: 1, policyHash: source.policyHash, documentId: source.documentId, documentVersion: source.version, sourceHash: source.sourceHash, attribution: source.policy.attribution, validUntil: source.policy.validUntil, maxDataAgeSeconds: source.policy.maxDataAgeSeconds, purpose: 'INFORMATION_ONLY', automaticSafetyPermission: false };
}
export function publicProvenance(value:ProviderProvenance){
  return {version:value.version,attribution:value.attribution,validUntil:value.validUntil,maxDataAgeSeconds:value.maxDataAgeSeconds,purpose:value.purpose,automaticSafetyPermission:false as const};
}
