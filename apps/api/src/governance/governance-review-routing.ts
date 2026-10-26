/**
 * Deterministic routing for Governance & Quality Office reviews.
 * Advisory only: never grants IAM, commits changes, or approves owner-gated actions.
 */
export const REVIEW_AGENTS = [
  'GOV_QUALITY_AUDIT',
  'GOV_TECH_REVIEW',
  'GOV_SECURITY_RISK',
  'GOV_COMPLIANCE_POLICY',
  'GOV_VERIFICATION',
] as const;
export type ReviewAgent = typeof REVIEW_AGENTS[number];
export type ReviewVerdict = 'PASS' | 'FAIL' | 'NEEDS_EVIDENCE';
export type ReviewRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface GovernanceSubmission {
  workId: string;
  departmentCode: string;
  submittedByAgentKey: string;
  stageFinal: boolean;
  architectureChange: boolean;
  securityOrPrivacyImpact: boolean;
  permissionChange: boolean;
  budgetException: boolean;
  contractException: boolean;
  destructiveProductionAction: boolean;
  safetyOrRegulatoryImpact: boolean;
  explicitlyOwnerReserved: boolean;
  risk: ReviewRisk;
  evidenceRefs: readonly string[];
}

export interface GovernanceReview {
  agentKey: ReviewAgent;
  verdict: ReviewVerdict;
  evidenceRefs: readonly string[];
  findingCodes: readonly string[];
}

export type GovernanceRoute = 'RETURN_FOR_CORRECTION' | 'WAIT_FOR_EVIDENCE' | 'READY_FOR_OWNER' | 'INTERNAL_REVIEW_COMPLETE';

export interface GovernanceRoutingDecision {
  route: GovernanceRoute;
  reasons: string[];
  approvalAuthority: 'OWNER_001' | 'EXISTING_DOMAIN_WORKFLOW';
  finalAgentKey: 'GOV_FINAL_GATE';
}

/** Deny/owner-reservation wins. Missing evidence fails closed. */
export function routeGovernanceSubmission(submission: GovernanceSubmission, reviews: readonly GovernanceReview[]): GovernanceRoutingDecision {
  const reasons: string[] = [];
  const ownerReserved = submission.stageFinal
    || submission.architectureChange
    || submission.securityOrPrivacyImpact
    || submission.permissionChange
    || submission.budgetException
    || submission.contractException
    || submission.destructiveProductionAction
    || submission.safetyOrRegulatoryImpact
    || submission.explicitlyOwnerReserved
    || submission.risk === 'HIGH'
    || submission.risk === 'CRITICAL';

  if (!submission || typeof submission.workId !== 'string' || typeof submission.departmentCode !== 'string' || typeof submission.submittedByAgentKey !== 'string' || !submission.workId.trim() || !submission.departmentCode.trim() || !submission.submittedByAgentKey.trim()) {
    return {route:'WAIT_FOR_EVIDENCE',reasons:['INVALID_SUBMISSION_IDENTITY'],approvalAuthority:'OWNER_001',finalAgentKey:'GOV_FINAL_GATE'};
  }
  const riskFlags = ['stageFinal','architectureChange','securityOrPrivacyImpact','permissionChange','budgetException','contractException','destructiveProductionAction','safetyOrRegulatoryImpact','explicitlyOwnerReserved'] as const;
  if (!['LOW','MEDIUM','HIGH','CRITICAL'].includes(submission.risk) || riskFlags.some(flag => typeof submission[flag] !== 'boolean')) {
    return {route:'WAIT_FOR_EVIDENCE',reasons:['INVALID_RISK_SIGNALS'],approvalAuthority:'OWNER_001',finalAgentKey:'GOV_FINAL_GATE'};
  }
  if (!Array.isArray(submission.evidenceRefs) || !submission.evidenceRefs.length || submission.evidenceRefs.some(ref => typeof ref !== 'string' || !ref.trim())) {
    return {route:'WAIT_FOR_EVIDENCE',reasons:['SUBMISSION_EVIDENCE_MISSING'],approvalAuthority:'OWNER_001',finalAgentKey:'GOV_FINAL_GATE'};
  }
  if (!Array.isArray(reviews) || reviews.some(review => !review || !REVIEW_AGENTS.includes(review.agentKey))) {
    return {route:'WAIT_FOR_EVIDENCE',reasons:['UNKNOWN_REVIEWER'],approvalAuthority:'OWNER_001',finalAgentKey:'GOV_FINAL_GATE'};
  }
  if (reviews.some(review => review.agentKey === submission.submittedByAgentKey)) {
    return {route:'WAIT_FOR_EVIDENCE',reasons:['SELF_REVIEW_FORBIDDEN'],approvalAuthority:'OWNER_001',finalAgentKey:'GOV_FINAL_GATE'};
  }
  const unique = new Map(reviews.map(review => [review.agentKey, review]));
  if (unique.size !== reviews.length) {
    return {route:'WAIT_FOR_EVIDENCE',reasons:['DUPLICATE_REVIEW'],approvalAuthority:'OWNER_001',finalAgentKey:'GOV_FINAL_GATE'};
  }
  if (REVIEW_AGENTS.some(agent => !unique.has(agent))) {
    return {route:'WAIT_FOR_EVIDENCE',reasons:['FIVE_REVIEWS_REQUIRED'],approvalAuthority:'OWNER_001',finalAgentKey:'GOV_FINAL_GATE'};
  }
  for (const review of reviews) {
    if (!['PASS','FAIL','NEEDS_EVIDENCE'].includes(review.verdict) || !Array.isArray(review.findingCodes) || !Array.isArray(review.evidenceRefs)) {
      return {route:'WAIT_FOR_EVIDENCE',reasons:['INVALID_REVIEW_PAYLOAD'],approvalAuthority:'OWNER_001',finalAgentKey:'GOV_FINAL_GATE'};
    }
    if (review.verdict === 'FAIL') reasons.push(...(review.findingCodes.length ? review.findingCodes : ['REVIEW_FAILED']));
    if (review.verdict === 'NEEDS_EVIDENCE' || !review.evidenceRefs.length || review.evidenceRefs.some((ref: unknown) => typeof ref !== 'string' || !ref.trim())) {
      reasons.push('REVIEW_EVIDENCE_MISSING');
    }
  }
  if (reviews.some(review => review.verdict === 'FAIL')) {
    return {route:'RETURN_FOR_CORRECTION',reasons:[...new Set(reasons)],approvalAuthority:ownerReserved?'OWNER_001':'EXISTING_DOMAIN_WORKFLOW',finalAgentKey:'GOV_FINAL_GATE'};
  }
  if (reasons.length) {
    return {route:'WAIT_FOR_EVIDENCE',reasons:[...new Set(reasons)],approvalAuthority:ownerReserved?'OWNER_001':'EXISTING_DOMAIN_WORKFLOW',finalAgentKey:'GOV_FINAL_GATE'};
  }
  return ownerReserved
    ? {route:'READY_FOR_OWNER',reasons:['OWNER_APPROVAL_RESERVED'],approvalAuthority:'OWNER_001',finalAgentKey:'GOV_FINAL_GATE'}
    : {route:'INTERNAL_REVIEW_COMPLETE',reasons:['ALL_FIVE_REVIEWS_PASSED'],approvalAuthority:'EXISTING_DOMAIN_WORKFLOW',finalAgentKey:'GOV_FINAL_GATE'};
}
