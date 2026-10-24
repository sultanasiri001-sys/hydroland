# Ordered closeout queue — 24 October 2026

User instruction: prioritize the remaining work and close each item with
evidence, without repeating completed assignments, approvals or tests.

This queue records release and acceptance separately. It is not a completion
percentage, a legal opinion, a financial-policy decision or a signature.

| Priority | Existing tracking | Confirmed state / next closure evidence |
| --- | --- | --- |
| 1 — Mobile security | #443 | Old findings were superseded by current main. A fresh audit identifies the Zod/Expo chain; the scoped fix and compatibility tests are being validated on current production source. Close only after required exact-head checks and merge evidence. |
| 2 — Database recovery | #369, #444, #446 | Historical replay diagnostics and fresh-install candidate remain distinct. Production adoption needs final schema/type/ledger compatibility and an isolated restoration of an actual production backup with data/history verification. Do not rewrite historical migrations or declare synthetic fixtures to be production recovery. |
| 3 — HR legal references | Library HR Control Mapping/Reference Pack, #493/#500/#501 | Independent legal references/approval remain pending. Owner 001 assignment and administrative approval of the three employee templates for internal drafts are completed; do not repeat or reinterpret them as independent legal review. Prepare missing legal-source/version mappings and actual approval evidence through the existing workflow. |
| 4 — Organization finance and calendar | #445 | Organization portal publication is complete in #470. Billing ownership, payment terms and booking/calendar confirmation policy remain proposed decisions; review concrete choices before activating business policy. |
| 5 — Center acceptance | #462 | Render UAT is LIVE at branch head b58b5942589c68f9f827fee627c8b378bfcf0534. It is not waiting for its first deployment. Refresh against the accepted production scope when needed and obtain a named center representative's actual acceptance; do not substitute CI for that signature. |
| 6 — Historical portal request | #352 | Old branch is 821 commits behind reviewed main and references a stylesheet absent from current source. Determine which requirements remain before selectively porting or closing it as superseded; do not merge old portal implementation blindly. |
| 7 — Delivery evidence | #449 | Its register describes 9 October state and lists several now-published areas as unmerged. Reconcile it with current merged/publication evidence after the above changes, preserving accepted scopes and separately recording unresolved acceptance. |

## Completed publication preserved

Both Render production services are LIVE at
`9a353ae274fc66843e1d0d61505c545904fe73b9` (#502). Employee draft revision and
comparison are already published. The currently observed open PR inventory is
seven requests: #352, #443, #444, #445, #446, #449, #462. Only #444, #446 and
#462 have GitHub's formal Draft flag; an open request is not automatically an
unpublished feature.

The Library integration report of 17 October is evidence of that date only.
The later Moyasar test-payment verification records a successful captured test
payment. Do not reopen that completed provider test or copy earlier blanket
claims that every integration is unconfigured into this queue.
