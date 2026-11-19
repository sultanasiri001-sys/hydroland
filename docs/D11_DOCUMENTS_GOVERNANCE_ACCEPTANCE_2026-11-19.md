# D11 documents and governance localization

## Delivered boundary

This batch localizes the authored controls, instructions, known local status labels, empty states, local errors and accessible labels in the 34-file `documents-and-governance` inventory. It changes 33 UI-bearing JS/MJS modules and three feature stylesheets. `hydroland-license-fields.mjs` is intentionally unchanged: it parses source evidence, not interface text.

Arabic remains the default and the global English control remains disabled. This batch does not claim complete D11 acceptance. The combined seven-portal RTL/LTR, viewport, keyboard and actual screen-reader gates still apply. Catalog size and source-file coverage are not completion counts.

The starting application source was the expanded C11 implementation, `cb91d7ba76278129b4e448fb7a71a254d6876e50`. Its custom SECTION and STATEMENT controls are included. C11's backend versioning, attribution, hashes, source binding, restore behavior and signed-document rules are unchanged by this batch.

## Changes and boundaries

- Each feature has an explicit scoped Arabic-to-English catalog. Tagged literal markup and deliberately marked imperative messages carry authored provenance. There is no general DOM translator, remote translation request or new observer that scans arbitrary user text.
- Local enum labels and message parameters can update in place. Names, saved text, provider responses, document titles, clauses, source facts, field keys, select values and request inputs remain opaque. A user value equal to `إغلاق` or another catalog key is still data.
- Existing mixed DOM builders use the shared `message`/`setMessage` adapter. Plain strings remain ordinary text; only privately branded authored descriptors acquire live translation. Full authored sentences use reviewed patterns and opaque parameters rather than mechanically concatenated English fragments.
- Locally constructed errors retain their authored message in a module-private WeakMap while preserving the original `Error` and string `message` contract. Their display can switch language after catching the error. Ordinary server/provider messages remain opaque, including a message exactly equal to a local catalog key. The existing HR/research/license helper boundaries expose only the descriptor for an error created by that helper.
- Dynamic accessible labels use the shared allowed-attribute API. Field move controls, editor creation/editing labels, search descriptions and status messages update without replacing active forms or losing focus.
- Operational dialogs inherit the shell direction. Arabic document preview surfaces explicitly retain RTL, including custom form and contract previews. Three feature stylesheets use logical alignment for their interface chrome. The API PDF renderer and persisted print data are unchanged.
- Default greeting options now have explicit canonical Arabic values, so translating their visible labels cannot change submitted values. Its user name stays opaque. Known built-in theme labels have display helpers; registered/custom theme names and categories remain untouched, including values identical to built-in Arabic labels.
- The existing document opener reads `data-action-label`, `data-secondary-label` and `data-portal-label` before its legacy visible-text fallback. Canonical route keys and the set of accepted routes remain unchanged.
- The raw `HydrolandHrSource.stateLabel` contract remains unchanged; a separate authored display descriptor supports localized HR interface labels.

Source transformation was followed by per-feature review and actual DOM execution. Local label identification used lexical binding identity, including shadowed names. Keyword operands were checked for accidentally joined identifiers such as `returnuiLocale`; syntax parsing alone would not catch that class of defect.

## Shared dependencies

The feature commit should be integrated after the shared localization foundation and helpers, once each, in this order:

1. `483765d1e3fa0a1e5b6996d8b1110d462b49f62e` — scoped navigation foundation.
2. `e633b6ca74fd55c2e0e3f956be3c6d86795d0a5d` — authored literal markup adapter.
3. `374d5ec8a060ab0dd4db2ad8fbb0de91a273feb4` — opaque inline parameters.
4. `e1b7ca7a5f591b401a9d607bdf0919e03ed13d2b` — privately branded messages and dynamic allowed attributes.
5. `afcabd2cdb07e06256d06c35e6b07bd191ad5d05` — nested authored parameters and mixed message HTML.
6. `333ba70` — existing document-motion callback fixture receives its explicit display adapter; assertions retained.
7. `af5b312` — theme accessibility source validator accepts the explicit localized attribute setter.

These dependencies were developed by the foundation owner. The documents/governance feature commit does not modify shared navigation, locale-engine files, global styles, workflows or the global English switch.

## Verified locally

| Check | Result and practical limit |
|---|---|
| `npm test` in `apps/web` | 130 Node tests passed; shell, design, public interface, checkout, portal access and portal action validators all passed. Existing research state/replay and document motion assertions remain intact. |
| `npm run build` in `apps/web` | Production static build passed with the existing pinned PDF/OCR dependencies. |
| Actual-engine JSDOM initialization and AR→EN→AR→EN | 32 JS modules executed; 27 created interface DOM and five are helpers or lazy views. Created authored text/allowed attributes had no remaining Arabic in English, with zero execution errors and zero writes. This is initialization coverage, not acceptance of every private workflow. |
| Custom form interaction | SECTION/STATEMENT labels and dynamic move ARIA switched; draft, focus, Arabic title and clause remained exact; one synthetic publish sent the canonical schema and created a new version while preserving the old clause; logout cleared the private view and a locale change did not revive it. |
| Account interaction | Local role/status/action/count labels switched; names and an unknown role equal to a catalog key stayed opaque; draft, focus and `SUSPENDED` value stayed unchanged; revocation cleared private content with zero writes. |
| Technology requests | Local kind/state/action options and complete nested messages switched; stored title, source label and reason stayed opaque; canonical values/focus survived; revocation cleared content with zero writes. |
| HR source/attendance formatters | Local fact labels, known statuses and yes/no displays switched; recorded department/position remained exact; raw state-label contract was retained. |
| Marketing drafts | Nested creation/editing ARIA, channels and state/history captions switched; saved title/history and active draft stayed exact; focus survived; revoked content stayed cleared with zero writes. |
| Themes and greeting | Built-in names switched while custom names/categories stayed opaque; greeting role values and name stayed exact, with no share action or write. |
| Actual `license-reader.mjs` | Invalid-file error switched AR/EN without OCR, network access or changes to source-field parsing. Existing parser tests also passed in the Node suite. |
| Caught-error provenance | A real account validation error switched AR↔EN after display; an identical provider message stayed exact through one in-memory synthetic account submission. A research-helper error retained its `Error` contract and live authored descriptor across the module boundary. |
| Literal source characters | Actual document table controls and all three contract approval/review references preserved ampersands, angle brackets and Arabic exactly in both languages. The shared markup/attribute sink escapes each opaque parameter once; raw cell attributes retain their original escaping. No injected element or write occurred. |
| Source boundary audit | All 33 modules retained their original JSON serialization argument expressions and storage calls. Literal form values/checked/disabled/role/name assignments were unchanged; one syntactic difference was the authored text argument in an option builder whose value remains the empty string. |
| Syntax and whitespace | All changed modules parsed; joined keyword/localization identifier scan and `git diff --check` passed. |

The JSDOM fixtures exercise shipped module code and the shipped engine with synthetic in-memory responses. They do not establish CSS layout, native browser focus, accessibility-tree behavior or actual screen-reader output. No production service, account or source document was mutated by these checks.

## Browser acceptance supplied

`apps/web/e2e/locale-documents-governance.spec.js` contains eleven discovered actual-browser cases:

- Custom form UI, accessible field movement, focus, exact input values and opaque clause rendering at 1536×864, 768×1024 and 390×844, in both directions.
- English publication with exact canonical schema and immutable previous clause, followed by revocation.
- Account role/action/name and unsaved reason boundaries.
- Caught local validation errors versus identical provider text, with cross-module authored error display.
- Literal document table accessible labels/canonical columns and contract approval references containing ampersands and angle brackets.
- Built-in versus custom theme labels and canonical greeting role/name values.
- Technology request labels, source data, draft/focus and revoked view.
- HR source fact labels versus recorded department/position data.
- Marketing dynamic ARIA, channel/state labels, draft/focus and revoked content.

The existing full `Browser E2E` step in `.github/workflows/web-validation.yml` discovers this file. The three viewport cases attach six PNGs named `locale-documents-form-{ar,en}-{width}` for review. Retaining those screenshots in the combined workflow is coordinated with the integration owner and remains pending verification; this feature commit does not change the workflow itself.

Local Playwright discovery succeeded. Browser execution and screenshot review are pending CI: Chromium's previously established local Unix-socket restriction was not bypassed or weakened. No local browser, screenshot, accessibility-tree or screen-reader pass is claimed. Existing Arabic feature regressions remain mandatory alongside the new bilingual cases.

## Integration and closure

Merge only after the combined source passes the existing required checks and the new browser cases. Review the actual screenshots and combined bilingual routes before enabling English. Complete the separately defined actual screen-reader acceptance before closing D11. This batch does not update the 77-item tracker or any external project record.
