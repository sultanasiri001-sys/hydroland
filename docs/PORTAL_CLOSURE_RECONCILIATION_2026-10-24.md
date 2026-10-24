# Historical portal request reconciled with current source

PR #352's original September implementation is superseded by the published
reference design system. Its remaining useful change is the real deferred-load
regression test. The final PR carries that test without restoring obsolete CSS.

| Original requirement | Current source and disposition |
| --- | --- |
| Fresh authorization before protected modules | `app.js` loads `hydroland-portal-access-freshness.js` once, before center modules and role dashboards; `portal-access-validation.mjs` enforces the order and rejects late routing injection. Already present. |
| Dashboard loaded after a role change uses the current authorized role | `hydroland-role-dashboards.js` replays the current role in a microtask. The updated `auth-session.spec.js` actually withholds its network response, selects ADMIN through the workspace UI, proves no dashboard exists, then releases the script and requires the ADMIN dashboard. This is the remaining test change. |
| Visitor hero, background and brand images load | Current `hydroland-design-system.css` and `hydroland-portals.css` use the published reference WebP assets. `public-reference-layout.spec.js` decodes five reference images on desktop/tablet/mobile; `design-system.spec.js` decodes and checks the actual brand background. The old PNG replacement and old artwork-specific selectors are superseded. |
| Header/hero geometry | The published reference layout has its own compact hero, search and responsive composition checks. The old absolute-position rule belongs to the replaced visitor composition and is not reintroduced. |

This closure records implementation and regression coverage for the historical
request. It does not manufacture a new visual signoff, center UAT acceptance or
general launch approval. Previously accepted/published scope remains separate
from outstanding human acceptance in the delivery register.
