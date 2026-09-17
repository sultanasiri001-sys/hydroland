import {
  aggregateComplianceDecision,
  evaluateComplianceControl,
} from './compliance-engine.domain';

describe('HYDROLAND compliance engine', () => {
  it('routes unknown applicability to REVIEW instead of inventing a BLOCK', () => {
    expect(
      evaluateComplianceControl({
        controlId: 'HARD-BALADY-001',
        applicability: 'CLASSIFICATION_PENDING',
        evidenceRequired: true,
        evidenceValid: false,
      }).decision,
    ).toBe('REVIEW');
  });

  it('passes a control that is outside verified applicability', () => {
    expect(
      evaluateComplianceControl({
        controlId: 'HARD-INS-001',
        applicability: 'NOT_APPLICABLE',
        evidenceRequired: true,
      }).decision,
    ).toBe('PASS');
  });

  it('blocks applicable mandatory evidence when missing, invalid, or expired', () => {
    expect(
      evaluateComplianceControl({
        controlId: 'HARD-SAIL-001',
        applicability: 'APPLICABLE',
        evidenceRequired: true,
        evidenceValid: false,
      }).decision,
    ).toBe('BLOCK');
  });

  it('escalates an applicable incident trigger and preserves its deadline', () => {
    const deadlineAt = new Date('2026-09-20T12:00:00.000Z');
    const result = evaluateComplianceControl({
      controlId: 'HARD-PDPL-001',
      applicability: 'APPLICABLE',
      evidenceRequired: true,
      evidenceValid: false,
      escalationTriggered: true,
      deadlineAt,
    });

    expect(result.decision).toBe('ESCALATE');
    expect(result.deadlineAt).toEqual(deadlineAt);
  });

  it('passes an applicable control with valid mandatory evidence', () => {
    expect(
      evaluateComplianceControl({
        controlId: 'HARD-DIVE-001',
        applicability: 'APPLICABLE',
        evidenceRequired: true,
        evidenceValid: true,
      }).decision,
    ).toBe('PASS');
  });

  it('aggregates with BLOCK as the activation-stop priority', () => {
    expect(
      aggregateComplianceDecision([
        { controlId: 'a', decision: 'PASS', reason: 'ok' },
        { controlId: 'b', decision: 'ESCALATE', reason: 'case' },
        { controlId: 'c', decision: 'BLOCK', reason: 'stop' },
      ]),
    ).toBe('BLOCK');
  });

  it('keeps ESCALATE above REVIEW when no BLOCK exists', () => {
    expect(
      aggregateComplianceDecision([
        { controlId: 'a', decision: 'REVIEW', reason: 'classify' },
        { controlId: 'b', decision: 'ESCALATE', reason: 'deadline' },
      ]),
    ).toBe('ESCALATE');
  });
});
