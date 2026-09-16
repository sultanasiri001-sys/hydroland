export type SensitiveDataCategory = 'LOCATION' | 'CONTRACT' | 'COMPLAINT' | 'ATTENDANCE' | 'IDENTITY_DOCUMENT';

export interface RetentionPolicy {
  id: string;
  category: SensitiveDataCategory;
  retentionDays: number;
  legalHold: boolean;
  effectiveFrom: string;
  version: number;
}

export interface DataAccessDecision {
  allowed: boolean;
  reason: string;
  maskedFields?: string[];
}
