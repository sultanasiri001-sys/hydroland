export type CapacitySubjectType = 'EXECUTIVE_SECRETARY' | 'DEPARTMENT_MANAGER' | 'CENTER_MANAGER' | 'AI_AGENT' | 'HUMAN_WORKER';

export interface CapacitySnapshot {
  subjectType: CapacitySubjectType;
  subjectId: string;
  departmentId?: string;
  centerId?: string;
  windowStart: string;
  windowEnd: string;
  activeWorkItems: number;
  overdueWorkItems: number;
  utilizationPercent: number;
  costMinor: number;
  currency: string;
}

export interface DepartmentLoadAttribution {
  departmentId: string;
  activeWorkItems: number;
  utilizationSharePercent: number;
  costMinor: number;
  currency: string;
}

export interface ExpansionThresholds {
  utilizationWarningPercent: number;
  sustainedDays: number;
  departmentShareWarningPercent: number;
  monthlyCostIncreaseApprovalPercent: number;
  reserveFloorMinor: number;
  currency: string;
}

export interface ExpansionRecommendation {
  targetType: 'DEPARTMENT_MANAGER' | 'CENTER_MANAGER' | 'SPECIALIZED_AGENT' | 'HUMAN_WORKER';
  targetDepartmentId?: string;
  targetCenterId?: string;
  reasonCodes: string[];
  currentMonthlyCostMinor: number;
  projectedMonthlyCostMinor: number;
  projectedIncreasePercent: number;
  reserveAfterActivationMinor: number;
  requiresApproval: boolean;
}

export function requiresFinancialApproval(projectedIncreasePercent: number, thresholds: ExpansionThresholds): boolean {
  return projectedIncreasePercent > thresholds.monthlyCostIncreaseApprovalPercent;
}

export function shouldRecommendExpansion(snapshot: CapacitySnapshot, thresholds: ExpansionThresholds): boolean {
  return snapshot.utilizationPercent >= thresholds.utilizationWarningPercent && snapshot.overdueWorkItems > 0;
}
