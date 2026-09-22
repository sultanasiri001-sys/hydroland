export type HrComplianceControl = {
  controlId: string;
  mandatory: boolean;
  applicable: boolean;
  regulatoryRequirementId?: string;
  regulatoryVersion?: string;
  evidenceIds: string[];
  validationStatus: 'VALID' | 'INVALID' | 'MISSING' | 'EXPIRED';
  blockingFinding?: boolean;
};

export function assertHrProductionCompliance(controls: HrComplianceControl[]): void {
  for (const control of controls) {
    if (!control.applicable || !control.mandatory) continue;
    if (!control.regulatoryRequirementId || !control.regulatoryVersion) {
      throw new Error(`HR_COMPLIANCE_REQUIREMENT_MISSING:${control.controlId}`);
    }
    if (control.evidenceIds.length === 0) {
      throw new Error(`HR_COMPLIANCE_EVIDENCE_MISSING:${control.controlId}`);
    }
    if (control.validationStatus !== 'VALID') {
      throw new Error(`HR_COMPLIANCE_VALIDATION_FAILED:${control.controlId}:${control.validationStatus}`);
    }
    if (control.blockingFinding) {
      throw new Error(`HR_COMPLIANCE_BLOCKING_FINDING:${control.controlId}`);
    }
  }
}
