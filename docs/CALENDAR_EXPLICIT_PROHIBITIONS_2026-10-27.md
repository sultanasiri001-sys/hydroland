# Explicit decisions in calendar readiness

The calendar now reports `NOT_READY` with a failed safety/compliance check when
the latest persisted safety decision is `DEFERRED`, or the current regulatory or
permit decision is `REJECTED`, in every operational-policy state.

Previously a disabled/review requirement could turn the corresponding calendar
check green and report `REVIEW_REQUIRED`. The adverse decision was still present
in `policyReview.issues`. `OperationalClearanceService.assertHardBlocks` already
refused those issue codes regardless of toggles. This corrects the calendar's
representation; it is not evidence of an executed production bypass or a new
execution prohibition.

The existing control catalogue says explicit safety deferral remains effective
when optional approval is disabled. The existing clearance code also treats
`SAFETY_DEFERRED` and `REGULATORY_BLOCK` as non-overridable. Those source rules,
not a newly inferred legal obligation, define this slice of A14.

Missing or pending optional approvals retain their configured semantics. An
allowed later source decision can supersede an older deferral without erasing
the older row. Readiness never creates an approval, changes a policy, contacts a
provider or modifies the source decision.

## Verification

- The pre-fix compiled service failed the new matrix: an explicitly rejected
  permit under REVIEW produced a successful compliance check.
- API lint, typecheck and build pass locally. The actual compiled calendar and
  compliance services pass 1,080 source/policy combinations, including absent,
  pending, adverse and approved decisions. Existing canonical weather/evidence
  and disabled/advisory behavior checks pass with zero provider calls.
- Existing booking-safety policy checks (18) and operational-controls checks
  pass. Their execution blockers are preserved.
- A helper in the existing HTTP/PostgreSQL acceptance harness verifies real
  admin calendar responses, adverse-decision clearance refusal without audit
  writes, optional missing-approval success, retained source history and fresh
  role revocation. Actual database acceptance must pass in CI before release;
  local HTTP/PostgreSQL success is not claimed.

The fixture requires CI, a loopback API and database, and test mode before data
mutation. Its caller establishes test mode only when unset, after the CI and
loopback checks; explicit production/development modes are refused. The helper
restores its policy/settings snapshot and removes only its own synthetic rows.

No schema, dependency, workflow, live flag, credential, budget, document/PDF or
UAT-continuity change is included. This does not close the complete A14 legal
applicability/mandatory-requirement acceptance scope or any operating department.
