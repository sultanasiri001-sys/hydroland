# One synthetic HR document case

This acceptance exercise uses one synthetic employee and the 21 current HR
administrative templates. All accounts use `example.invalid`; all test decisions,
contracts, compliance inputs and evidence are explicitly synthetic.

The runner refuses non-loopback APIs, non-test mode and any database other than
`hydroland_form_library_ci`. It uses the existing HTTP/PostgreSQL integration job
and does not connect to Render or production.

The case exercises the platform staffing request, owner review, compliance denial,
activation and scoped IAM effect; leave/return status changes; compensation and
relations decisions; termination and actual session/role revocation. Inputs for
which the exercised workflow has no creation/review endpoint are seeded and
identified individually in the receipt. Identity verification, legal review,
official employment-contract registration, payroll payment and physical clearance
are excluded from acceptance.

Every HR template creates a document tied to the same employment. Separate
synthetic accounts review and sign the pinned document version through HTTP.
Each document is printed and archived. One document is returned, revised and
resubmitted; an archived document is checked after template publication. Anonymous
or unrelated access, self-approval and required-field failures are also checked.

Run with an already built API and the integration job's isolated variables:

```sh
node apps/api/scripts/hr-document-case-http-e2e.mjs
```

`HR_DOCUMENT_CASE_OUTPUT` selects the evidence directory. The default is
`/tmp/hr-document-case-evidence`. The CI artifact contains `receipt.json` and
21 PDF documents. The receipt distinguishes HTTP actions from seeded inputs,
records the source commit, persisted versions, event actors and PDF hashes, and
reports cleanup separately from scenario success.

A passing receipt is technical evidence for this synthetic case. It does not
close HR operating acceptance, independent professional review or any real
employee's file. No new independent hiring approver is introduced.
