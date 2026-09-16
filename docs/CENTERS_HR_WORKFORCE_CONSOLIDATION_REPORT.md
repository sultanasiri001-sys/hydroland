# HYDROLAND Centers, Departments, HR & Workforce Consolidation

Status: **architecture/domain consolidation complete; persistence and runtime validation pending**.

## Canonical ownership

- `src/organizations` remains the persisted owner for organizations and memberships.
- `src/credentials` remains the persisted owner for professional credentials.
- `src/governance` owns cross-cutting center/department operating semantics, staged leadership, recruitment governance, workforce/contracts, temporary assignments, scoped permissions, approvals, delegation, capacity and expansion indicators.
- `src/audit` remains the only audit implementation.
- Customer payments/invoices remain separate from workforce compensation/payables.

## Organization architecture

The operating hierarchy supports Headquarters -> Region -> Center -> Department -> Unit -> Team without requiring every layer to be active. Centers and departments have independent activation states. Leadership can be Executive Secretary, AI manager, human manager, or hybrid.

The four operating stages are canonical:
1. Executive Secretary operates all departments initially.
2. Department managers are activated selectively.
3. Center managers are activated as geographic operations expand.
4. Specialized human/AI workforce is activated according to measured demand.

Service workflows remain owned by their business domains. Changing the manager of a department must not change the customer booking/training/trip workflow.

## Central HR invariant

External-center recruitment always routes through HR governance. A candidate may enter from direct application, a center request, a department request, or HR sourcing. HR verifies required documents and canonical credential references before appointment.

Center managers may request or nominate workforce, but cannot independently finalize a sensitive appointment. Required approval stages are determined by configurable ApprovalEngine definitions rather than a permanently hard-coded chain.

Employment relationship, job title, contract, compensation and system permissions are separate dimensions. Appointment does not automatically grant unrestricted application permissions.

## Center controls

HQ can enable or disable departments and manager capabilities per center. The control model is compatible with scoped permissions and effective periods. Sensitive DENY rules remain authoritative unless an explicitly authorized higher-order override policy applies.

## Capacity and cost indicators

Capacity snapshots support Executive Secretary, department manager, center manager, AI agent and human worker attribution. Cost and workload can be attributed to department and center. Expansion thresholds are configuration, not constants: utilization warning, sustained period, department share, financial-approval percentage and reserve floor.

Recommendations can propose department managers, center managers, specialized agents or human workers. They do not self-activate resources. Financial approval is required when the configured projected-cost threshold is exceeded.

## Persistence gate

No Prisma migration was added in this unit. The current `Organization` model is not yet sufficient for the full Headquarters/Region/Center/Department hierarchy, and the existing `RoleAssignment` uniqueness requires review for multi-center/multi-department scopes. Recruitment, contracts, temporary assignments, center department controls and capacity history will require additive persistence after the deployed production `_prisma_migrations` state and the prior P3011 incident are reconciled.

Do not reset, squash or destructively rewrite production migrations.

## Validation status

The new artifacts are TypeScript domain definitions and pure helpers with no database side effects. No claim is made that TypeScript, Prisma, CI, Render or production runtime validation has passed. That validation remains a release gate.
