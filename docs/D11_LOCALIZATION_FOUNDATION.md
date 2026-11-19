# D11 localization foundation and continuation contract

> Historical receipt for the source-only stage. The separate prepared activation and its remaining browser/release gates are recorded in `D11_LANGUAGE_ACTIVATION_RECEIPT.md`.

## Scope and status

D11.01 requires all seven agreed portals in Arabic/English, RTL/LTR at phone/tablet/desktop sizes, current visual references, empty/failure/revoked-access states, ARIA, keyboard and screen-reader evidence. This change supplies a navigation foundation and a disjoint operational migration inventory. It does not claim full D11 acceptance or enable the incomplete English interface.

Default remains Arabic. The existing EN control remains disabled. There is no persisted language selection, remote translation request, role/permission change, translated user content or automatic readiness inference. The setLocale API exists for implementation and acceptance fixtures; do not connect the global UI selector until the declared operational inventory is localized and tested.

## Shared API

Load hydroland-i18n.js before application modules. The current scope navigation has188 explicit static source-text translations. Each operational module owns a separate catalog:

```js
const i18n = window.HydrolandI18n;
i18n.registerCatalog('module-name', {
  'عنوان ثابت': 'Static heading',
  'بحث': 'Search',
});
// After rendering the existing component, bind only known static text nodes.
i18n.bindStatic(component, {
  scope: 'module-name',
  text: '.static-heading,.submit-label',
  attributes: {
    'aria-label': '.search-input',
    placeholder: '.search-input',
    title: '.help-button',
  },
});
const locale = i18n.getLocale(); // ar or en
const label = i18n.translate('بحث', 'module-name');
```

Catalog identifiers use lowercase letters/digits/hyphens. Registration is immutable: identical repeat registration is allowed; an attempt to overwrite a scope with different translations fails. Catalogs are separate, so one Arabic phrase may have distinct domain translations. Strings are plain text; translate does not make HTML safe. Use textContent or the existing esc helper when interpolating a translated value into HTML.

bindStatic binds direct text nodes only and preserves child icons, escaped names, existing controls/listeners and values. It permits only aria-label, aria-description, placeholder, title and alt attributes. It never changes href, data-route, data-action, role enums, values or authorization state. Selectors must target static labels within the component, never broad body/div/span/p matches that could include names, messages, documents, comments or server-supplied business data. A controller change to a bound value invalidates the older binding instead of reviving stale content. Call bindStatic again after a component replaces its static DOM.

Locale changes dispatch hydroland:locale-changed. Dynamic counts/times/error states should update from the component's current guarded state, retaining unsaved inputs and focus. Do not re-fetch private data or rebuild an entire form solely to change language. Keep established session/current-target fences. Currency, amounts, status enums, source text and timezones do not change with display language. Known server error codes may map to localized messages; do not change business decisions or hide a required action.

The engine deliberately has no general MutationObserver translation and no automatic rewriting of all Arabic text. Names/free text may equal a catalog key and still must remain unchanged.

## Disjoint batches

The machine-readable inventory is [D11_LOCALIZATION_BATCHES.json](./D11_LOCALIZATION_BATCHES.json). It covers105 Arabic-bearing JS/MJS/HTML source files including the new engine; this is a source inventory, not a translation-completeness count. Core11 files remain with the foundation owner. The three operational batches are mutually exclusive:

| Batch | Modules | Responsibility |
|---|---:|---|
| commerce-and-centers |29|Booking, rental, inventory, finance, organizations and center operations |
| documents-and-governance |34|Documents/forms/contracts, administration/HR/governance/research/content |
| participant-training-and-safety |31|Identity/account, training, safety/marine, community/messages/support |

Own only the listed files and their feature-specific CSS/test companions. Shared index/app/bootstrap, locale engine, styles.css, portals.css and shell infrastructure stay with core. Report required common additions to the core owner instead of editing another batch. Do not duplicate models, routes, role checks, money sources or document engines.

Each module's receipt records source commit, declared routes/actions, catalog scope, static/dynamic/ARIA/empty/error/denied strings, source-vs-display boundary, screenshot/viewport results and bilingual role/session tests. Unknown/incomplete content must be reported; no automatic completion from catalog-entry counts.

## Acceptance and evidence

- A local JSDOM run against the actual engine and current index passed6 behavioral groups: language roundtrip with retained input/focus/routes; nested name/icon preservation; late DOM; stale controller wins; scoped catalogs/plain-text injection protection; invalid catalog/attribute/locale refusal. The helper is scratch-only; no JSDOM dependency was added to the project.
- The new locale-navigation-foundation.spec.js has4 real-browser scenarios, including all seven surfaces at1536×864,768×1024,390×844 and both directions, unchanged route keys/roles, disabled global EN, escaped names, focus/draft retention and revoked roles.
- Local browser launch was blocked before app execution: Chromium's Unix process-singleton socket returned Operation not permitted. Therefore no local browser, layout, screenshot or screen-reader pass is claimed. Existing CI must run the new scenarios and retained Arabic portal tests.
- English shell CSS only applies under html[dir=ltr]. Protected managed workspaces keep their full-width shell; mobile navigation opens from the left. Arabic styles are retained. Layout acceptance awaits real-browser CI.

The global EN selector may be enabled only after all declared portal/service slices have actual bilingual tests and review. Catalog registration or navigation test success alone does not close D11.


## Authored operational markup helper

`HydrolandI18n.createScope(scope, catalog)` adds a frozen per-module adapter. `locale.html` is a tagged template: it translates only literal text fragments and literal `aria-label`, `aria-description`, `placeholder`, `title` and `alt` attributes. All interpolation slots remain opaque and are copied exactly once. Attribute structure and conditional attributes are preserved; script/style/textarea/title contents are excluded. Keep existing escaping of interpolated business data. The helper is a localization boundary, not an HTML sanitizer.

```js
const locale = HydrolandI18n.createScope('example-feature', {
  'عنوان': 'Title',
  'جاهز': 'Ready',
  'تم حفظ {0}': 'Saved {0}',
});
locale.setHTML(panel, locale.html`<h2>عنوان</h2><p>${esc(userName)}</p>`);
// Only locally authored status/type maps may use label. Unknown values are escaped.
locale.setHTML(statusCell, locale.html`${locale.label(localStatusLabels[status])}`);
locale.setText(message, 'تم حفظ {0}', [userName]);
```

`setHTML(element, html)` and `insertHTML(element, position, html)` retain the existing HTML operation and bind only emitted source markers. `bind(root)` is available for a retained insertion path. Dynamic slots never acquire source markers merely because their content equals a catalog key. `label(source, values = [])` emits escaped source-marked inline text only for known authored labels; indexed format parameters are escaped and remain opaque during locale changes; do not pass user names, provider labels, notes, document clauses or other business data to it. `t(source)` returns plain translated text. `format(source, values)` replaces indexed `{0}` placeholders with opaque values. `setText(element, source, values)` and `setAttribute(element, allowedAttribute, source, values)` explicitly bind authored dynamic messages and preserve subsequent controller changes.

HTML catalog keys are trimmed literal fragments between interpolation slots. For a complete dynamic sentence requiring word reordering, use an authored format pattern with opaque parameters. Do not translate canonical route keys, request payload values, money/currency values, entity names or policy/source text. No MutationObserver, global text lookup or form rebuilding is introduced. Detached dialogs retain their markers when attached; disconnected prior views are pruned on locale changes.

Validation for this adapter: four dependency-free Node tests exercise actual runtime code and six scratch JSDOM groups exercise real DOM binding, opaque strings, detached dialogs, forms/focus, source-map labels, controlled replacement, markup structure and allowed attribute boundaries. Browser acceptance remains separate.

Mixed imperative UI builders can receive `locale.message(source, values)` for authored input and plain strings for server/user input. The descriptor has private identity and is not detected by string matching. Use `locale.setMessage(element, input)` inside such a builder: only an actual authored descriptor is bound for live language changes; all other inputs are written unchanged. `setText` and `setAttribute` preserve explicitly nested authored descriptors in parameters, while ordinary parameter strings remain opaque. Do not use descriptors in request payloads or persisted business fields.

For an authored dynamic accessible attribute in a template, use `<button ${locale.attribute('aria-label', source, values)}>…</button>`. This method permits only the same five display attributes, escapes every value, and emits its explicit source marker. It cannot emit `href`, `value`, `data-route` or authority attributes. `label` remains for HTML text positions only; never put its comment markers inside an attribute or a plain-text setter.

`messageHTML(input)` is the HTML-text counterpart of `setMessage`: a branded authored descriptor becomes escaped marked text, while every plain server/user value is only escaped. Use it in text-position slots, never inside attributes. Marked inline labels and attributes preserve nested authored parameter descriptors by serializing their explicit catalog scope/source/parameter structure. On binding, nested structures must match registered source keys and a bounded depth; ordinary strings remain ordinary strings even when they equal catalog keys. This keeps an authored status parameter live while preserving an equal-valued business field unchanged.
