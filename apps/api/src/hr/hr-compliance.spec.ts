import { assertHrProductionCompliance, HrComplianceControl } from './hr-compliance';

const valid: HrComplianceControl = {
  controlId: 'HR-LAB-EMP-001',
  mandatory: true,
  applicable: true,
  regulatoryRequirementId: 'sa-labor-approved-requirement',
  regulatoryVersion: 'approved-version',
  evidenceIds: ['evidence-1'],
  validationStatus: 'VALID',
};
assertHrProductionCompliance([valid]);

for (const [mutation, code] of [
  [{ regulatoryRequirementId: undefined }, 'HR_COMPLIANCE_REQUIREMENT_MISSING'],
  [{ evidenceIds: [] }, 'HR_COMPLIANCE_EVIDENCE_MISSING'],
  [{ validationStatus: 'EXPIRED' as const }, 'HR_COMPLIANCE_VALIDATION_FAILED'],
  [{ blockingFinding: true }, 'HR_COMPLIANCE_BLOCKING_FINDING'],
] as const) {
  try {
    assertHrProductionCompliance([{ ...valid, ...mutation }]);
    throw new Error(`EXPECTED_DENIAL:${code}`);
  } catch (error) {
    if (error instanceof Error && error.message === `EXPECTED_DENIAL:${code}`) throw error;
    if (!(error instanceof Error) || !error.message.includes(code)) throw error;
  }
}
console.log('HR production compliance fail-closed controls validated.');
