# HR document cycle in the existing document library

The existing generic library is the canonical store for HR administrative forms.
The three original HR forms are retained. Eighteen additional source types cover
staffing need, job description, appointment evidence, commencement, attendance,
compensation/payroll handoff, employee relations, contract-change referral,
offboarding, clearance, IAM evidence and file closure. Contracts stay in the
existing contract library and are opened by reference; no contract copy, employee
appointment, compensation transaction or approval is created by template setup.

## Owner access and privacy

The canonical internal organization has an owner but no ordinary document
membership for that owner. GET /documents/workspace now discovers that existing
ownership for an active, verified ADMIN. Internal document actions require that
same current owner; ordinary members or another administrator cannot read the
personnel library. Explicit suspended membership still denies access. Other
organizations retain their existing membership permissions. No membership,
Employment or IAM role is created. Future departmental staff access requires
its own explicit scoped policy rather than inheriting an organization-wide read.

Template and document writes recheck authorization inside their existing
serializable transactions. Ownership, account, ADMIN or organization status
changes remove access. Existing creator/approver/signer separation and contract
library protections remain unchanged.

## Saving the forms

Open the internal organization in the document workspace, select HR, and use
حفظ نماذج دورة الموارد البشرية الناقصة. It uses the existing template-create API
sequentially for genuinely unconfigured types. Existing/inactive/conflicting
versions are not overwritten. A partial failure refreshes inventory, and another
explicit attempt resumes only missing types. Deployment and inventory reads do
not seed templates. Setting up forms creates no employee cases or documents.

The known source baseline remains 42 types. The separate HR extension adds 18,
so source discovery has 60 types and HR has 21. This is catalog coverage, not a
complete statutory inventory or proof of a completed employee cycle. Actual
source-record references and verified decisions are required when using forms.

## Validation scope

TypeScript/API compilation and the new owner-boundary checks passed locally.
The existing reference projection accepts the 60-type source without a false
completion claim. Updated HTTP/PostgreSQL fixtures cover owner discovery without
a membership, internal member privacy, ownership/ADMIN loss and unchanged
center access. One browser regression covers partial setup, explicit resume and
the existing contract workspace. Previously accepted operational tests and
production approvals are not manually repeated.
