# HYDROLAND HR — Saudi Labor Control Mapping

Status: IMPLEMENTATION CONTROL BASELINE

This document defines the executable compliance contract for HR production activation. It does not claim legal completeness and does not hard-code statutory article numbers. Authoritative Saudi labor requirements must be maintained in the approved regulatory library with source, version, effective date and evidence requirements.

## Fail-closed contract

A production-sensitive HR action is eligible only when every mandatory applicable control has:
1. an approved regulatory requirement/version;
2. an executable HR control;
3. required evidence references;
4. a validation result;
5. no unresolved blocking finding.

Missing or expired mandatory evidence blocks production activation of the affected action.

## Control families

| Control | Applies to | Minimum evidence category | Blocking |
| --- | --- | --- | --- |
| HR-LAB-EMP-001 | appointment / employment activation | approved employment terms and required identity/employment evidence | yes |
| HR-LAB-CON-001 | contract activation/change | approved contract/version and required acknowledgements | yes |
| HR-LAB-CMP-001 | compensation-sensitive change | approved compensation decision and maker/reviewer/approver evidence | yes |
| HR-LAB-LVE-001 | leave decision | request, entitlement basis, approval evidence | yes when mandatory |
| HR-LAB-DIS-001 | disciplinary decision | case record, evidence, review and required approval | yes |
| HR-LAB-TRM-001 | termination/offboarding | approved decision, effective date, clearance/settlement handoff evidence | yes |
| HR-LAB-ACC-001 | access revocation on offboarding | IAM revocation evidence and final audit event | yes |

## Regulatory-library requirements

Each control must resolve to the canonical regulatory library rather than embedding legal text in HR code. Required metadata:
- authority
- regulation
- version
- effectiveFrom/effectiveTo
- clause/requirement identifier
- applicability
- evidence specification
- validation status
- decision/audit reference

## Ownership

Legal Governance owns regulatory interpretation/versioning. HR owns operational control execution. IAM owns access changes. Finance owns accounting/payment execution. Audit preserves evidence of decisions.

## Closure boundary

This mapping closes the HR architecture contract only when the regulatory library is populated with approved authoritative Saudi labor requirements and production validation proves fail-closed behavior. Legal interpretation remains subject to Legal Governance review.
