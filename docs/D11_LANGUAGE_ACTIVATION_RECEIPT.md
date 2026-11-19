# D11 — prepared interface language activation

This is the separate activation candidate following the reviewed navigation foundation, participant batch and core receipt. It is intended to be integrated with the documents/governance and commerce/support batches before release. This receipt does not mark D11 closed or claim a production deployment.

## User-visible behavior

Arabic remains the initial language. Each current surface exposes one native button with `[data-hl-locale-switch]`: the public/diver shell, the sign-in panel, each of the five operational dashboards, or the active native dialog. An open dialog takes over the control; closing it restores the surrounding surface. An owned dialog header redraw restores its control without touching form values.

The button identifies the current interface language and the other available language through its accessible name and title. The short visible name is `EN` or `العربية`, with the appropriate language attribute. Enter and Space use native button activation. A pointer switch while editing retains the draft control's focus; keyboard activation keeps focus on the language button. The document language/direction and bound authored text update in place. No preference, account field, role, session, route key, option value or server content is written by the switch.

The former disabled sidebar control is replaced by a topbar control. A stable inert sidebar anchor retains the previous placement of theme/brand tools. A dedicated polite status region announces the change without replacing application notices.

## Membership card boundary

The existing card redraw uses the active UI language, mirrors text and QR positions, and preserves source display name/role values and the existing verification reference. The expiration display follows the current interface locale. Consent remains checked through a language switch. Share title/text are translated only when the user invokes Share; the verification URL is unchanged. A locale change does not issue a new reference, trigger a download or call the sharing service.

## Verification performed locally

- The complete web Node gate passed **130/130 tests**, followed by all six source/accessibility/authorization validators.
- The web production build passed.
- The seven committed actual participant-module DOM scenarios passed with the actual localization engine.
- An actual full-app JSDOM bootstrap with source styles checked one visible control across visitor, sign-in, diver, all five operational roles and the active participant dialog. Pointer draft focus, control focus, AR↔EN, modal header redraw and restoration passed; **zero non-GET requests and zero console errors** occurred in this synthetic scenario.
- Actual membership code with its QR and monotonic deadline companions passed an AR→EN→AR scenario using a canvas-context spy: source identity remained raw, drawing directions/positions changed, one issued reference remained stable, consent survived, and explicit share payloads used the active language and unchanged URL. The module-import adapter only supplied the two actual companion modules to the JSDOM host.
- Playwright discovered **28 cases across the three selected files**: five switch/layout cases, seven participant runtime cases, and sixteen existing/extended membership cases. Discovery is not execution.

## Browser acceptance prepared; not claimed as locally passed

`locale-navigation-foundation.spec.js` now operates the real button by click, Enter and Space. It checks sign-in and native-dialog isolation, drafts/focus, exact language state, opaque account data, canonical route keys, revoked roles and one visible switch across all seven portals. At 1536×864, 768×1024 and 390×844 it checks RTL/LTR navigation bounds, drawer behavior, horizontal overflow and the organization operational service's margins/alignment. It attaches `locale-organization-service-{ar,en}-{width}` screenshots.

`membership-pass.spec.js` adds a real canvas/share regression, including an English PNG attachment named `locale-membership-card-en`. Native sharing is replaced by a synthetic recorder in that test, so it verifies the application's payload and user-action boundary rather than a platform share-sheet implementation.

Local browser execution was unavailable because the environment denied Chromium's required Unix socket. No workaround was used. Native keyboard behavior, rendered viewport geometry, PNG appearance, the combined three-batch runtime and actual screen-reader output therefore remain required CI/review evidence before release. The separate workflow/Orca gate and artifact retention are owned by the integration change.
