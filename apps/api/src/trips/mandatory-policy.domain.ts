// A recorded binding is an adoption record, not an external legal verification.
// This layer never invents a requirement or infers applicability from a label.
export type MandatoryBindingStatus = 'OPTIONAL' | 'MANDATORY' | 'REVIEW_REQUIRED';
const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const text = (v: unknown): v is string => typeof v === 'string' && Boolean(v.trim());
const date = (v: unknown): number => {
  if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(v))return NaN;
  const value=Date.parse(v);
  return Number.isFinite(value)&&new Date(value).toISOString().slice(0,19)===v.slice(0,19)?value:NaN;
};

export function mandatoryBindingStatus(category: string, ruleKey: string, metadata: unknown, now = new Date()): MandatoryBindingStatus {
  const m = object(metadata);
  if (!Object.prototype.hasOwnProperty.call(m, 'mandatoryRequirement')) return 'OPTIONAL';
  const b = object(m.mandatoryRequirement), source = object(b.source), adoption = object(b.adoption);
  let officialUrl: URL;
  try { officialUrl = new URL(String(source.officialUrl)); } catch { return 'REVIEW_REQUIRED'; }
  const valid = b.schemaVersion === 1 && b.category === category.toUpperCase() && b.ruleKey === ruleKey.toUpperCase()
    // Center-specific applicability cannot be promoted to a global policy.
    && b.scope === 'ALL_OPERATIONS_USING_CONTROL' && text(b.requirementId)
    && ['APPLICABLE', 'NOT_APPLICABLE'].includes(String(b.applicability)) && text(b.applicabilityReason)
    && [source.authority, source.version, source.clause].every(text)
    && officialUrl.protocol === 'https:' && !officialUrl.username && !officialUrl.password
    && (officialUrl.hostname.endsWith('.gov.sa')||officialUrl.hostname==='swsdf.sa')
    && Number.isFinite(date(source.effectiveAt)) && date(source.effectiveAt) <= now.getTime()
    && Number.isFinite(date(source.reviewDueAt)) && date(source.reviewDueAt) > now.getTime()
    && [adoption.reference, adoption.approvedByAccountId].every(text)
    && Number.isFinite(date(adoption.approvedAt)) && date(adoption.approvedAt) <= now.getTime()
    && date(adoption.approvedAt) >= date(source.effectiveAt)
    && Array.isArray(b.evidenceIds) && b.evidenceIds.length > 0 && b.evidenceIds.every(text);
  if (!valid) return 'REVIEW_REQUIRED';
  return b.applicability === 'APPLICABLE' ? 'MANDATORY' : 'OPTIONAL';
}
