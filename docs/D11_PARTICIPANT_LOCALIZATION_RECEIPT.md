# D11 participant, training and safety localization

> Historical receipt for the source-only stage. The separate prepared activation and its remaining browser/release gates are recorded in `D11_LANGUAGE_ACTIVATION_RECEIPT.md`.

## Scope and status

This delivery covers the 30 JavaScript modules assigned to `participant-training-and-safety` in `D11_LOCALIZATION_BATCHES.json`. Customer support is assigned to the commerce batch because its C04 service lifecycle was implemented concurrently. The total declared inventory remains 105 files across four disjoint batches.

The English control remains disabled. This receipt does not close D11: the shared core, other operational batches, combined browser gates and seven-portal layout acceptance must be reviewed together before enabling a complete interface.

## Behavior

Each module registers an explicit source-owned catalog. Authored HTML literals and display attributes are bound through the shared localization engine; dynamic values remain opaque and retain the module's existing escaping. Local status maps use marked inline labels, and mixed message builders require an identity-branded authored descriptor. There is no translation by matching arbitrary DOM text.

Changing the interface language updates bound text and display attributes without replacing a form, resetting a draft, changing focus, changing a checked state, issuing a request or rebuilding an account session. Canonical enum values, request bodies, route IDs, Arabic source route labels, member/account names, messages, dates from the source and provider errors remain data. Native medical, safety, payment and permission decisions are unchanged.

Specific live bindings include participant eligibility labels, professional assignment counters, safety checklist labels, booking safety status and loading/error feedback, notification counts and ARIA labels, service-image label maps, and account dialog headings. Authentication preserves provenance for locally authored failures with a module-private WeakMap; an identically worded provider error is still opaque. Message titles, senders and bodies remain source text, including strings equal to catalog keys and strings containing markup characters.

Marine document/readiness discovery and mobile message discovery prefer stable source attributes where display text changes. Membership canvas labels follow interface direction and redraw only a valid existing card; no locale change issues a new QR token or performs a write. Canvas/layout verification remains part of browser acceptance.

## Evidence obtained locally

- `npm test` in `apps/web`: **130 Node tests passed**, followed by all six existing source/authorization/design validators. Authentication token rotation, cancellation, bounded retries, role checks and reduced-motion assertions remain intact.
- Actual localization engine with a DOM: **8 helper scenario groups passed**, including nested authored status descriptors, exact attribute preservation, detached dialogs, controller replacement, quoted opaque values and parameter reordering.
- `participant-locale-scenarios.mjs` executed against actual production modules in JSDOM: **7 scenario groups passed**. The same scenarios are committed for Playwright in `locale-participant-runtime.spec.js`.
- An AST-driven read-only audit rendered all **258 authored HTML templates** with the actual English engine: **zero untranslated static text or supported static display attributes** in those literal segments. This is a literal-segment coverage check, not a claim that all possible dynamic/server data is translated.

The seven actual-module groups cover participant edit and redraw, professional assignments and revocation, safety checklist state and notes, private messages and account clearing, authentication loading/local/provider failures, booking safety pending/status/clearing, and calendar weather/crew/resource labels with stable option values. All use isolated synthetic data and request stubs. The message scenario only simulates the existing read-receipt request; the localization action itself causes no write.

## Browser gate still required

The container's Chromium launch cannot create the required Unix socket. No browser pass, screenshot/layout pass or screen-reader pass is asserted by this receipt. Run the committed Playwright scenarios and the combined portal viewport tests in the normal browser CI environment. Tests merely listed/discovered are not counted as passed.

The next integration review must also check authored dynamic paths outside literal-template coverage, operational CSS in both directions, new rendering while English is active, role/session invalidation, and all three batches together. Business/contract/user/provider content is outside UI translation and must remain unchanged.

## Shared commit order

The base for this branch is `a3771fcaa6c69b33fb4d313351814e0aa49752cd`. Apply shared commits in this order, or use their reviewed tree-equivalent cherry-picks already present in another batch:

1. `483765d1e3fa0a1e5b6996d8b1110d462b49f62e` — scoped navigation foundation and disabled English boundary.
2. `e633b6ca74fd55c2e0e3f956be3c6d86795d0a5d` — authored HTML and explicit static bindings.
3. `374d5ec8a060ab0dd4db2ad8fbb0de91a273feb4` — opaque inline parameters.
4. `e1b7ca7a5f591b401a9d607bdf0919e03ed13d2b` — mixed message provenance and shared extracted-callback adapters.
5. `afcabd2cdb07e06256d06c35e6b07bd191ad5d05` — nested authored message provenance in markup.
6. `333ba70` — document motion callback's display adapter.
7. `af5b312` — exact localized theme ARIA validator alternative.

This participant source delivery follows those shared commits. It also updates the authentication source validator and extracted authorized-fetch fixture to reflect explicit authored error provenance; the underlying authority guards are unchanged.

A subsequent semantic audit corrected joined `return`/adapter tokens in the compact calendar helper. The new actual calendar scenario exercises those branches and verifies live nested status/count labels; source resource names and IDs stay unchanged.
