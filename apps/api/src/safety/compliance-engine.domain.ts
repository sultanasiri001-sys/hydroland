export type ComplianceDecision = 'PASS' | 'REVIEW' | 'BLOCK' | 'ESCALATE';

export type ApplicabilityStatus =
  | 'APPLICABLE'
  | 'NOT_APPLICABLE'
  | 'CLASSIFICATION_PENDING';

export interface ComplianceControlInput {
  controlId: string;
  applicability: ApplicabilityStatus;
  evidenceRequired: boolean;
  evidenceValid?: boolean;
  escalationTriggered?: boolean;
  deadlineAt?: Date;
}

export interface ComplianceControlResult {
  controlId: string;
  decision: ComplianceDecision;
  reason: string;
  deadlineAt?: Date;
}

/**
 * Canonical HYDROLAND compliance decision rule:
 * - unknown applicability never becomes a guessed legal BLOCK;
 * - non-applicable controls pass;
 * - applicable escalation triggers escalate independently;
 * - applicable mandatory evidence that is absent/invalid blocks activation.
 */
export function evaluateComplianceControl(
  input: ComplianceControlInput,
): ComplianceControlResult {
  if (input.applicability === 'CLASSIFICATION_PENDING') {
    return {
      controlId: input.controlId,
      decision: 'REVIEW',
      reason: 'Applicability/classification must be verified before enforcement.',
    };
  }

  if (input.applicability === 'NOT_APPLICABLE') {
    return {
      controlId: input.controlId,
      decision: 'PASS',
      reason: 'Control is outside the verified applicability scope.',
    };
  }

  if (input.escalationTriggered) {
    return {
      controlId: input.controlId,
      decision: 'ESCALATE',
      reason: 'Verified escalation trigger is active.',
      deadlineAt: input.deadlineAt,
    };
  }

  if (input.evidenceRequired && input.evidenceValid !== true) {
    return {
      controlId: input.controlId,
      decision: 'BLOCK',
      reason: 'Applicable mandatory evidence is missing, invalid, or expired.',
    };
  }

  return {
    controlId: input.controlId,
    decision: 'PASS',
    reason: 'Applicable control requirements are satisfied.',
  };
}

export function aggregateComplianceDecision(
  results: ComplianceControlResult[],
): ComplianceDecision {
  if (results.some((result) => result.decision === 'BLOCK')) return 'BLOCK';
  if (results.some((result) => result.decision === 'ESCALATE')) return 'ESCALATE';
  if (results.some((result) => result.decision === 'REVIEW')) return 'REVIEW';
  return 'PASS';
}
