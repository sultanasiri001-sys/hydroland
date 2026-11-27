import { createHash } from 'node:crypto';

export type MarineObservation = {
  status: 'NOT_OBSERVED' | 'RESPONSE_RECEIVED' | 'FAILED';
  checkedAt: string | null;
  scope: 'CURRENT_PROCESS';
  reasonCode: string | null;
};

export type MarineReadinessEvidence = {
  configuration: { configured: boolean; status: string };
  providerObservation: MarineObservation;
  license: { status: 'NOT_VERIFIED'; reference: null };
  usagePlan: { status: 'NOT_VERIFIED'; reference: null; unitCost: null; budgetLimit: null };
  providerAcceptance: { status: 'NOT_VERIFIED'; verifiedAt: null };
  operationalAcceptance: false;
  navigationGranted: false;
};

export function marineReadinessEvidence(configured: boolean, status: string, observation?: MarineObservation): MarineReadinessEvidence {
  return {
    configuration: { configured, status },
    providerObservation: observation ? { ...observation } : { status: 'NOT_OBSERVED', checkedAt: null, scope: 'CURRENT_PROCESS', reasonCode: null },
    license: { status: 'NOT_VERIFIED', reference: null },
    usagePlan: { status: 'NOT_VERIFIED', reference: null, unitCost: null, budgetLimit: null },
    providerAcceptance: { status: 'NOT_VERIFIED', verifiedAt: null },
    operationalAcceptance: false,
    navigationGranted: false,
  };
}

export function marineEvidenceDigest(value: unknown): string {
  const canonical = (input: unknown): string => {
    if (Array.isArray(input)) return '[' + input.map(canonical).join(',') + ']';
    if (input && typeof input === 'object') return '{' + Object.entries(input).filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => JSON.stringify(key) + ':' + canonical(item)).join(',') + '}';
    return JSON.stringify(input) ?? 'null';
  };
  return createHash('sha256').update(canonical(value)).digest('hex');
}

// Provider examples specify UTC instants. Reject arrays, local-time strings,
// impossible calendar dates and Date's otherwise permissive rollover parsing.
export function marineUtcInstant(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|\+00:00)$/.test(value)) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  const normalized = new Date(parsed).toISOString();
  return normalized.slice(0, 19) === value.slice(0, 19) ? normalized : null;
}

// This is the documented v6 provider request window, not an operational safety
// policy or an assertion that a five-minute position is fit for navigation.
export const AIS_PROVIDER_WINDOW_MINUTES = 5;
export const AIS_PROVIDER_CONTRACT = 'https://servicedocs.marinetraffic.com/tag/AIS-API/';

export function aisTimeAssessment(observedAt: string, fetchedAt: string) {
  const ageSeconds = (Date.parse(fetchedAt) - Date.parse(observedAt)) / 1000;
  const outsideWindow = ageSeconds > AIS_PROVIDER_WINDOW_MINUTES * 60;
  return {
    status: outsideWindow ? 'STALE' as const : 'UNASSESSED' as const,
    observedAt, fetchedAt, ageSeconds,
    providerWindowMinutes: AIS_PROVIDER_WINDOW_MINUTES,
    providerWindowReference: AIS_PROVIDER_CONTRACT,
    operationalPolicyReference: null,
    reasonCodes: outsideWindow ? ['PROVIDER_REQUEST_WINDOW_EXCEEDED', 'OPERATIONAL_FRESHNESS_POLICY_NOT_VERIFIED'] : ['OPERATIONAL_FRESHNESS_POLICY_NOT_VERIFIED'],
    operationalUseAllowed: false as const,
  };
}
