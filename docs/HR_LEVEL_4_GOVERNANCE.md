# HYDROLAND HR — Level 4: Governance, Automation & Analytics

Status: IMPLEMENTATION BASELINE

## Scope
L4 closes the HR department after L1–L3 by governing payroll/benefits interfaces, performance/development, employee relations, disciplinary cases, offboarding, HR permissions, AI-agent boundaries, analytics and compliance controls.

## Governance rules
- Person, Employment, Position, Account and Permissions remain separate.
- No HR transaction grants permissions directly; IAM applies approved scope changes.
- Maker → Reviewer → Approver separation is mandatory for sensitive actions.
- DENY wins on conflicting authorization rules.
- Authentication + Authorization + Validation + Audit are mandatory for sensitive operations.
- Center managers operate only inside Center Scope and cannot self-approve sensitive HR actions.
- HR uses shared Documents, Workflow/Approvals, Notifications, Policy, IAM and Audit engines.
- Historical employment, financial, evidence and audit records are retained; offboarding does not hard-delete them.

## Workforce classes
Supported classification baseline:
- EMPLOYEE
- TEMPORARY_WORKER
- INDEPENDENT_PROFESSIONAL
- CONTRACTOR
- CENTER_AFFILIATED
- TRIP_ONLY

Identity verification is separate from legal/professional eligibility.

## L4 domains
### Compensation and benefits
HR owns compensation terms and eligibility; Finance owns payment execution/accounting. Payroll must not duplicate employee identity or finance ledger data.

### Performance and development
Goal cycle → manager assessment → HR review → development plan → training/credential outcome. Performance does not auto-promote an employee; promotion remains an approved EmploymentMovement.

### Employee relations and disciplinary cases
Case → evidence → HR review → required approval → decision → appeal/review → closure. Access is restricted and every transition audited.

### Offboarding
Resignation/termination → approvals → effective last day → asset/obligation clearance → financial settlement handoff → close open assignments → end Employment → revoke delegations/role scopes/sessions through IAM → archive employment state → final audit event.

### AI-agent controls
HR AI agents may classify, summarize, validate completeness, detect expiry/conflicts, draft recommendations and route workflows. They may not self-approve hiring, compensation, disciplinary action, termination, privilege escalation, or evidence deletion.

### HR analytics
Metrics may cover workforce count, vacancies, time-to-hire, credential expiry, attendance/leave, movement, training completion, performance-cycle completion and offboarding status. Analytics reads canonical HR records; it does not create parallel master data.

## Regulatory/control baseline
HR controls are mapped through the Regulatory, Standards & Compliance Library: authority → regulation → version → clause → requirement → applicability → evidence → decision. Personal-data processing follows the approved Saudi PDPL controls in the library. Employment controls must be mapped to the approved Saudi labor-system registry before production activation.

## Department closure criteria
1. L1–L4 workflows use one Employee Master Record.
2. HQ and external centers use the same HR engine with scoped access.
3. Hiring, movement, compensation-sensitive changes, discipline and termination enforce segregation of duties.
4. Documents/evidence are shared, versioned and auditable.
5. IAM activation/revocation follows approved HR events only.
6. AI cannot make restricted final decisions.
7. HR analytics is read-only over canonical operational records.
8. Offboarding revokes active access while preserving required history.
9. Regulatory requirements have traceable controls/evidence.
10. End-to-end HR tests pass before Operations phase begins.
