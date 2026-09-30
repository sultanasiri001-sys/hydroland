# Dive Professionals portal — CLOSED 2026-10-01

## Closed functional scope
- ACTIVE INSTRUCTOR role gate and immediate fail-closed revocation.
- Privacy-safe professional profile and live metrics.
- Assigned courses and students only.
- Assigned schedule and instructor attendance actions with server-side session authorization.
- Skill assessment limited to assigned training scope, including instructor sign-off for COMPETENT.
- Internal HYDROLAND training certificate lifecycle: completion readiness → instructor recommendation → independent REVIEWER/ADMIN decision → internal verifiable certificate.
- Instructor earnings ledger/view isolated from customer/platform payment data.

## Closure evidence
PR #394 consolidated the browser acceptance path across the complete professional portal. The final head 9e4d7b701e763ce71fb7e6500bd2700873ce2015 passed:
- Web validation: 120/120 full Playwright tests.
- Focused safety-notifications regression: 4/4.
- API validation: success.
- Security audit: success.
- Release Candidate Gate: success.
- Production Release Gate: success.
- Stage 3 Main Integrity Gate: success.

PR #394 merged to main as 7a5dbec647a87dfde12a44e7e919191da0d1ed57 and the Web deployment for that exact commit reached LIVE on Render.

The API remains on the latest API-affecting portal commit #393 (d26a9779463f2d22ed2d7d86eb44d734e60b7f8c), which is LIVE; #394 contains only browser closure tests/documentation and therefore does not require an API rebuild.

## Deliberate boundaries
- HYDROLAND internal training certificates are not represented as government or external dive-agency credentials. External certification integrations remain separate.
- InstructorEarning provides the ledger and privacy boundary, but no commission/rate formula is invented. Automatic earning creation remains blocked until an approved compensation policy defines the amount and trigger.
- No production instructor, student, training record, certificate or earning was fabricated for closure.

## Decision
The Dive Professionals portal is CLOSED for its approved internal functional scope. Reopen only for regression, approved scope change, external certification integration, or an approved instructor compensation policy requiring new finance automation.
