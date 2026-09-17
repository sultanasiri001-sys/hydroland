export type ComplianceControlLevel = 'L2' | 'L3' | 'L4';
export type ComplianceDecision = 'PASS' | 'BLOCK' | 'ESCALATE';

export interface MarineComplianceContext {
  vesselLicenseValid: boolean;
  sailingPermitValid: boolean;
  licensedCaptainAssigned: boolean;
  safetyOfficerAssigned: boolean;
  diverCertificationValid: boolean;
  diverDepthWithinLimit: boolean;
  safetyBriefingCompleted: boolean;
  incidentReported?: boolean;
  incidentOccurred?: boolean;
}

export interface ComplianceControlResult {
  id: string;
  level: ComplianceControlLevel;
  decision: ComplianceDecision;
  evidenceKey: string;
  reason?: string;
}

type Control = {
  id: string;
  level: ComplianceControlLevel;
  evidenceKey: string;
  evaluate: (context: MarineComplianceContext) => boolean;
  failureDecision?: ComplianceDecision;
  failureReason: string;
};

export const MARINE_COMPLIANCE_CONTROLS: readonly Control[] = [
  {
    id: 'CMB-001',
    level: 'L2',
    evidenceKey: 'vessel-license',
    evaluate: (c) => c.vesselLicenseValid,
    failureReason: 'A valid vessel licence is required before trip activation.',
  },
  {
    id: 'CMB-002',
    level: 'L2',
    evidenceKey: 'sailing-permit',
    evaluate: (c) => c.sailingPermitValid,
    failureReason: 'A valid sailing permit is required before trip activation.',
  },
  {
    id: 'CMB-003',
    level: 'L2',
    evidenceKey: 'captain-and-safety-assignment',
    evaluate: (c) => c.licensedCaptainAssigned && c.safetyOfficerAssigned,
    failureReason: 'A licensed captain and assigned safety officer are required.',
  },
  {
    id: 'CMB-004',
    level: 'L2',
    evidenceKey: 'diver-certification',
    evaluate: (c) => c.diverCertificationValid && c.diverDepthWithinLimit,
    failureReason: 'Diver certification must be valid and compatible with the planned depth.',
  },
  {
    id: 'CMB-005',
    level: 'L2',
    evidenceKey: 'safety-briefing',
    evaluate: (c) => c.safetyBriefingCompleted,
    failureReason: 'Safety briefing must be completed before trip activation.',
  },
  {
    id: 'CMB-006',
    level: 'L3',
    evidenceKey: 'incident-report',
    evaluate: (c) => !c.incidentOccurred || c.incidentReported === true,
    failureDecision: 'ESCALATE',
    failureReason: 'An incident requires a recorded report and L3 escalation.',
  },
] as const;

export function evaluateMarineCompliance(
  context: MarineComplianceContext,
): ComplianceControlResult[] {
  return MARINE_COMPLIANCE_CONTROLS.map((control) => {
    const passed = control.evaluate(context);
    return {
      id: control.id,
      level: control.level,
      evidenceKey: control.evidenceKey,
      decision: passed ? 'PASS' : control.failureDecision ?? 'BLOCK',
      ...(passed ? {} : { reason: control.failureReason }),
    };
  });
}

export function canActivateMarineTrip(context: MarineComplianceContext): boolean {
  return evaluateMarineCompliance(context).every((result) => result.decision === 'PASS');
}
