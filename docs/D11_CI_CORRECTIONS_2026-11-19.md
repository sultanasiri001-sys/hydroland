# D11 — corrections from executed browser failures

The Web validation job for PR head `5c62ee0f479edddef1f09b5f83c2e8a5b4509ce5`
executed the administrator regression group: 126 cases passed and three failed.
The [actual job log](https://github.com/sultanasiri001-sys/hydroland/actions/runs/44487597490/job/135434843828)
reported a literal `{0}` in the agent reporting hierarchy and center training
assignment count, and an unavailable older-employee-page control. The full
browser suite was not reached in that job.

## Corrected behavior

The localization engine now resolves an exact authored catalog key before
considering surrounding layout whitespace. Some inline messages intentionally
include a leading separator space. Trimming those keys first discarded their
catalog match, returned the unformatted template and prevented later rebinding.
The same resolution now applies to generated text, retained source markers and
display attributes. Parameters remain opaque unless they are existing branded
authored-message descriptors; no arbitrary provider or user text is enrolled
in translation.

The employee controller now selects its own `data-staff-pagination` element.
The AI module can insert two other navigation elements earlier in the employee
panel, so selecting the first `nav` can reveal the wrong element and leave the
employee pager hidden. The request parameters, pagination state, authority
checks and API routes are unchanged.

## Verification and limits

- The two added engine regressions failed on the preceding source: seven
  existing cases passed and the two new cases failed. The same nine cases pass
  after the correction.
- The complete local Node web suite passes **136/136**, followed by all six
  existing static validators and the production web build.
- `/root/payments_review` independently reviewed all four changed source/test
  files and reran the nine engine cases. Actual-engine JSDOM checks covered
  exact and trimmed whitespace keys, nested descriptors, opaque/HTML-shaped
  parameters, ARIA markers, repeated AR/EN changes, retained focus/drafts and
  controller-replaced text.
- That reviewer also executed the actual employee module before and after the
  fix with two earlier navigation elements. The old source revealed the wrong
  navigation; the corrected source exposed only its pager, retained next-page
  requests/button state, and hid private content after session revocation.
- The existing employee browser case now checks visible Arabic and English
  pagination controls. Product-browser execution of the corrected source and
  the separate native Orca acceptance remain CI requirements. These local
  checks do not claim either result.
