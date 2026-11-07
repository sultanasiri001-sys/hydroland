import { mandatoryBindingStatus } from '../trips/mandatory-policy.domain';

const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const nonempty = (value: unknown): value is string => typeof value === 'string' && Boolean(value.trim());

// A legacy reference is not an adopted mandatory requirement. Use the same
// validator and clock as operational enforcement for the current envelope.
// Return status only; evidence IDs, approval actors and metadata stay private.
export function policyReferenceView(category: string, ruleKey: string, metadata: unknown, observedAt: Date) {
  const m = object(metadata);
  const legacyReferencesRecorded = [m.regulatoryRequirementId, m.regulatoryVersion, m.legalApprovalReference].every(nonempty)
    && Array.isArray(m.evidenceIds) && m.evidenceIds.length > 0 && m.evidenceIds.every(nonempty);
  const bindingRecorded = Object.prototype.hasOwnProperty.call(m, 'mandatoryRequirement');
  const status = mandatoryBindingStatus(category, ruleKey, metadata, observedAt);
  const bindingStatus = !bindingRecorded ? 'NOT_RECORDED' : status === 'MANDATORY' ? 'MANDATORY' : status === 'OPTIONAL' ? 'NOT_APPLICABLE' : 'REVIEW_REQUIRED';
  const currentBinding = bindingStatus === 'MANDATORY' || bindingStatus === 'NOT_APPLICABLE';
  return { legacyReferencesRecorded, bindingStatus, referencesRecorded: legacyReferencesRecorded || currentBinding };
}
