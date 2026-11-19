# D11 participant error message review

## Scope and result

This follow-up starts from integrated source `1119daa` and preserves authored error messages across Arabic/English changes in 16 participant, training and safety modules. The initial audit found 57 authored `Error` constructions across 18 modules. The patch covers 55 constructions whose failures reach persistent interface feedback. The map's generic failure presentation and the marine document reader's native alert require no retained message binding and remain unchanged. Authentication and membership-pass sources are owned by the separate core review and are also unchanged here.

Each affected module keeps a private WeakMap from its created Error instance to the original display value. Authored values are the existing scoped message descriptors; provider values remain ordinary strings. The actual Error retains a string `message`, and properties such as `status` retain their existing behavior. Catches recover the original descriptor only for that exact instance. They do not identify authored errors by matching the text, so a provider message identical to an Arabic catalog key remains opaque.

The implementation updates 19 direct text sinks, 19 escaped HTML text sinks and 26 calls to existing display helpers. Raw parameters enter the final escaping sink once. Error codes, authorization conditions, payload values and request identities retain their original expressions.

The center safety conflict path previously appended its refresh button with `innerHTML +=`, recreating the existing error text node. Three append sites in the same form now use the scoped `insertHTML` helper. This preserves existing bindings and binds newly appended form labels and the refresh action. The 409 state still disables submission until the trip is refreshed, and the draft remains intact.

## Changed modules

| Area | Modules |
|---|---|
| Account and participant data | account-center, booking-participants, members, profile-data |
| Trip and crew administration | calendar-admin, crew-assignments, trip-admin, trip-lifecycle, weather-admin |
| Safety and readiness | center-safety, marine-readiness |
| Training and dive logs | training, training-certificate-admin, dive-logs |
| Other existing display paths | google-auth, service-images |

## Verification

Eight shared scenarios load the actual localization engine and feature module sources. They fail on the original `1119daa` source and pass after this patch in the local DOM runtime. The same scenarios are registered in `locale-participant-errors.spec.js` for the real browser gate.

The cases start in each language and cover formatted participant request errors, local safety validation failures, preserved HTTP 403 handling, certificate load feedback and opaque provider messages equal to local catalog text. The safety conflict cases preserve the search/form values, checklist key and selection, notes, state token and request identifier while adding the refresh action. They assert that the submit button stays disabled after a synthetic 409 response, that locale changes cause no additional request, and that revoked views remain cleared. Angle brackets and ampersands remain literal text without injected markup.

| Check | Result |
|---|---|
| Actual module/engine scenarios on prior source | 8 failed |
| Same scenarios after the patch | 8 passed |
| Existing web Node suite | 130 passed |
| Existing six web validators | Passed |
| Production web build | Passed |
| New browser scenario discovery | 8 cases |
| Original JSON.stringify payload arguments | 33 unchanged ASTs |
| FormData constructions | 17 unchanged ASTs |
| URLSearchParams constructions | 2 unchanged ASTs |
| Form value assignments | 27 unchanged ASTs |
| Original guard/test expressions | 944 unchanged ASTs |
| Protocol Error sentinels | 9 unchanged ASTs |

The tests use isolated synthetic responses. The conflict fixture records one rejected synthetic POST per initial language; it performs no real safety action. Local Chromium is unavailable before application startup in this environment. Browser execution, layout and visual acceptance remain CI gates; local discovery is not reported as browser execution. This patch changes no global locale activation setting.
