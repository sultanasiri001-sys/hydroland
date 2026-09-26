# Stage 3 — Diving certification automated verification onboarding

Status: PARTIAL / MANUAL OFFICIAL VERIFICATION AVAILABLE / AUTOMATED PROVIDER CONTRACT REQUIRED
Parent blocker: #329
Closure task: #331

## Current verified sources

### Saudi professional-diver national licence

Saudi Water Sports & Diving Federation (SWSDF) provides an official public professional-diver licence validation service:

- https://swsdf.sa/diving/license-validation

The public flow accepts an identity number and returns licence information. HYDROLAND must not scrape or automate this public page because identity numbers are sensitive identifiers and the page is not an approved machine-to-machine contract.

### International training organizations

PADI provides Pro Chek / eCard verification mechanisms for certification and professional-member status. Equivalent official verification mechanisms may exist for other approved training organizations, but HYDROLAND must treat each organization as a separate governed provider contract unless an approved aggregation contract exists.

## HYDROLAND integration purpose

Automated certification verification is intended to support:

- professional-diver onboarding;
- trainer/professional authorization checks;
- diver certification-level verification where an approved provider contract permits it;
- periodic status re-verification for credentials that expire or can be suspended.

Manual official verification remains an acceptable governed fallback while automated provider access is unavailable.

## Provider priority

1. SWSDF — Saudi national professional-diver licence authority/check.
2. PADI — international certification/professional status where contract/API access is approved.
3. SSI and other internationally recognized agencies — only after provider-specific approval and contract review.

Do not create a single generic scraper across public verification pages.

## SWSDF partner/API request text

> HYDROLAND is a Saudi marine and diving activities platform requesting an approved machine-to-machine method to verify professional-diver national licence status during onboarding and compliance review. The current public licence-validation page is suitable for human verification but HYDROLAND will not automate or scrape it. Please advise whether SWSDF provides a partner API, secure data-sharing service, approved batch verification mechanism, or another supported integration method. We require least-privilege read-only access, sandbox/UAT guidance if available, authentication requirements, permitted fields, rate limits, audit requirements, data-retention rules, and production approval steps.

## International provider request text

> HYDROLAND requests approved machine-to-machine verification access for diver certifications and/or professional-member status. The integration will be read-only, least-privilege, auditable, and restricted to provider-approved identifiers and fields. Please provide partner/API availability, authentication, permitted lookup keys, contract/data-use terms, sandbox/UAT process, rate limits, error semantics, and production approval requirements. HYDROLAND will not scrape public verification tools.

## Data minimization

An approved automated contract should prefer provider/member/certification identifiers over national identity numbers whenever possible. If a Saudi identity number is contractually required for SWSDF verification, processing must be limited to the approved purpose, protected in transit, excluded from logs, and retained only if legally/contractually required.

## Adapter acceptance criteria

CERTIFICATION is production-closed only when all are true:

- automated provider/authority contract approved;
- permitted lookup identifiers and fields documented;
- contract-specific adapter implemented;
- secrets configured in the approved production secret store;
- timeout/rate-limit/error mapping implemented;
- audit event records provider, result class, and correlation identifier without leaking sensitive identifiers;
- sandbox/UAT or approved contract tests pass;
- provider outage falls back to governed manual verification rather than false approval;
- production inventory no longer reports `CERTIFICATION:AUTOMATED_PROVIDER_REQUIRED`;
- Stage 3 Technical Closure and Main Integrity gates remain green.

## Prohibited shortcuts

- No scraping SWSDF/PADI/SSI public verification pages.
- No logging Saudi identity numbers or provider secrets.
- No interpreting network failure as a valid certification.
- No automatic approval from an unverified/ambiguous provider response.
- No production enablement without provider contract and data-use approval.
