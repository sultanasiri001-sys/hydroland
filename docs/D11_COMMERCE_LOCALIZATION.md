# D11 commerce, center operations and support localization

## Review scope

This batch supplies explicit Arabic/English authored text for the 29 `commerce-and-centers` modules in `D11_LOCALIZATION_BATCHES.json`, plus `hydroland-support.js` after the C04 persisted lifecycle change. It covers booking, equipment/rental/inventory, center operations, finance, organization workflows, stores and the customer/staff support inbox. Default Arabic and the disabled global English selector are retained. This source batch does not assert complete D11 acceptance; combined browser, visual and accessibility review remains a separate gate.

The implementation was prepared from C04 source `b122ec1`. The parent integration branch contains the equivalent reviewed/rebased C04 change. The source and test delta in this batch is independent of the API, migrations and the existing approved-portal count correction.

Required shared commits, in order, are:

- `483765d1e3fa0a1e5b6996d8b1110d462b49f62e`: navigation foundation and disjoint inventory.
- `e633b6ca74fd55c2e0e3f956be3c6d86795d0a5d`: authored markup scopes and bindings.
- `374d5ec8a060ab0dd4db2ad8fbb0de91a273feb4`: opaque parameters in inline messages.
- `e1b7ca7a5f591b401a9d607bdf0919e03ed13d2b`: branded messages, display attributes and extracted-callback test dependencies.
- `afcabd2cdb07e06256d06c35e6b07bd191ad5d05`: nested authored messages and `messageHTML`.
- `8561589`: retained inventory failure/motion assertions with the local-error callback dependency.

The machine-readable receipt lists every owned file, catalog scope, original source digest and existing route expression. Catalog entry counts describe the review inventory; they are not acceptance counts.

## Implementation decisions

Each module owns an explicit catalog and uses the existing scoped localization engine. Tagged markup translates authored literal text and allowed display attributes. Dynamic data keeps its existing escaping. Locale changes update registered text/attribute nodes, preserving form nodes, focus, selections, deadlines, drafts and request identities.

Locally authored map values have separate message helpers. A known status or role label receives authored identity; an unknown API value remains an ordinary string. This distinction matters when a person name, note or future enum value happens to equal a catalog key such as `بحث`. Names, operator content and unknown server errors must retain their exact text. Local errors use a module-private WeakMap so a catch block can bind the original authored message without guessing from `error.message`.

Internal text and form-label builders accept privately branded authored messages. Ordinary strings still pass through as opaque data. This also keeps completion notices, table captions/headers, readiness checks and nested status parameters live when the language changes. The customer pager and warehouse create/edit fields bind their explicit accessible names. The source analysis used lexical references for local maps and label variables, avoiding same-name variables in other scopes.

Formatted messages receive raw opaque parameters and nested authored descriptors; the final HTML or attribute sink escapes them once. A follow-up review of all 30 modules found and replaced two plain-string booking summary builders with live message bindings. The marine booking view also retains authored option labels, detail status, price text and local validation errors across locale changes. Unknown status values and provider errors stay opaque, including strings identical to a catalog key. The review found no remaining nested HTML-escaping calls in formatted message or display-attribute parameters.

Existing public string helpers remain available. Two optional display helpers preserve authored identity across modules:

- `HydrolandBookingAvailability.explainMessage(trip)` uses the same availability decisions as `explain(trip)`. An available trip returns the empty string. The string `explain` API returns the current display language.
- `HydrolandBookings.tripTypeMessage(type)` supplies the existing authored type label as a branded message. `tripTypeLabel(type)` retains its string behavior.

Availability buttons update their text and title in place. Their disabled state, trip identifier and underlying capacity, price, safety and weather decisions remain unchanged.

Payload values, source route keys, money in minor units, financial currencies, tax/registration enums and business revisions retain their previous meaning. Existing date, number and timezone formatting remains attached to the business value; authored labels around those values are localized. The read-only SAR display field retains its original value. No translation request, locale-triggered data fetch, notification, provider call or persisted language preference is introduced.

## Local verification

| Evidence | Result |
|---|---|
| Existing web Node suite | 130 passed |
| New dependency-free actual-module/engine boundary suite | 4 passed |
| Commerce actual-module DOM groups | 18 passed |
| Support actual-module DOM groups | 16 passed |
| Populated settlement rendering and financial handover fixture | Passed, including exact `125` minor-unit payload |
| Existing web validators | Passed |
| Production web build | Passed |
| Browser discovery for the two batch files | 39 scenarios |

The commerce DOM groups use the actual localization engine and module sources. They cover the offer editor and identical retry identity with `12550` minor units; opaque server error text; an organization tax declaration and customer objection; booking cancellation with the same state token and financial acknowledgement; populated report tables with separate SAR/USD amounts; read-only readiness; unknown role/status strings equal to catalog keys; and customer/warehouse accessible names. Language roundtrips retain focus, drafts and source values without new feature requests.

The marine summary regression failed on the prior source and passes after the follow-up. It checks `A&B <b>نص</b>` as a trip/customer name and an unknown summary status, with no markup injection or literal entity leakage. Known status labels, summary counts, price text and local validation errors update in both directions; search text, selected canonical status and exact `12550` minor-unit price remain unchanged. A server error equal to a local Arabic validation string remains untouched. This fixture performs no mutations.

The support groups cover eight paths in both languages: requester draft/command preservation, named assignment and an explicit deadline, wait/escalate/resolve actions, acceptance, objection, revoked admin access, failed inbox recovery and a late response after logout. The real C04 API/database evidence is recorded separately in `C04_CUSTOMER_CASE_LIFECYCLE.md`.

The structural before/after comparison across all 30 modules found the same AST for **61 JSON.stringify payloads, 26 FormData constructions, 5 URLSearchParams constructions and 23 form.value assignments**. All **419 pre-existing comparisons involving literal values** remain present unchanged. Additional comparisons in display/error helpers do not establish authority. The new keyword-boundary regression also guards against compact `return` source accidentally becoming a joined identifier during the migration; actual availability and populated settlement cases exercise the affected paths.

## Browser and visual gate

`commerce-localization.spec.js` contains 22 browser scenarios. Both languages exercise the financial handover at 390×844, 768×1024 and 1536×864, with keyboard submission, RTL/LTR, overflow assertions and review screenshots. Additional scenarios exercise offers, organization declarations and objections, booking cancellation, marine booking summaries and opaque formatted values, reports, readiness, customer pagination and warehouse accessible names. The tests use synthetic intercepted API responses and real application authorization/session controllers.

`customer-case-lifecycle.spec.js` runs the existing eight C04 scenarios in both languages and adds a locale roundtrip scenario: 17 cases total. Existing Arabic workflow suites remain in place. The full browser job discovers both files, and the existing focused support step discovers the expanded support cases.

Local Chromium was blocked before application startup by the environment's Unix socket restriction. No local browser execution, screenshot, layout or screen-reader pass is claimed. CI must execute the discovered cases; its finance screenshots match the existing `portal-*.png` artifact collection. The global English selector must remain disabled until the combined D11 acceptance gates pass.
