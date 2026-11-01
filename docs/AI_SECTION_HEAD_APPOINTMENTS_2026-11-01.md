# AI section head appointments

The organization guide dated 25 October defines 83 sections in 14 departments. Each section now has one canonical AI head and one existing department director as its reporting parent. The existing `EXECUTIVE`, `SALES` and `SOCIAL` identities are reused; their tasks, runtime revisions and controls remain intact. Abdullah retains the executive report coordination role and also heads the executive secretariat. Eighty identities are added, bringing the catalog to **103 distinct agents: 14 directors, 83 section heads and 6 independent office reviewers**. Abdullah is included in the 83 heads, not counted again.

| Department | Section heads |
| --- | ---: |
| Human Resources | 8 |
| Marine Operations | 7 |
| Training | 7 |
| Inventory and Logistics | 6 |
| Finance | 6 |
| Safety, Compliance and Risk | 6 |
| Customer Experience | 5 |
| Marketing and Growth | 7 |
| Technology and Cybersecurity | 7 |
| Facilities, Assets and Maintenance | 5 |
| Administrative Affairs and Records | 4 |
| Executive Management and Governance | 5 |
| Research and Market Intelligence | 4 |
| Legal, Contracts and Insurance | 6 |

## Appointment and runtime behavior

`POST /admin/agents/section-head-appointments` requires an active verified administrator who owns the canonical internal platform organization, the exact catalog version, a reviewed reason and an explicit `enableNewHeads` boolean. All fourteen department units must be active and their directors initialized. The existing serializable runtime guard protects the complete change, its durable receipt and one audit event. An audit failure rolls back every write. A repeated request returns the stored appointment without creating identities, changing later pause decisions or adding another audit event. A changed organization or catalog receipt requires review rather than silently overwriting the appointment.

Existing controls for Abdullah, sales and social are preserved. New heads can be appointed paused. Enabling the eighty new heads requires the same provider configuration, worker freshness and available daily reservation as ordinary agent activation. Global concurrency, per-task limits and the existing budget remain unchanged. Appointment creates no tasks, paid calls, notifications, schedules, human employee accounts or role grants. Ordinary pause and resume controls remain available after appointment.

The administration panel shows section assignments, their reporting director and a department filter. The owner can record the appointment from that panel. A save is confirmed only when the server returns the expected section count and catalog version. Logout clears the appointment view and entries along with the existing workforce panel.

## Scope and reporting

Heads prepare reports, evidence gaps and recommendations within their named section for their director. They have bounded draft/read actions, with the existing forbidden safety overrides, payments, signatures, database access and role changes. Their model instructions explicitly distinguish platform/department aggregates from unavailable section performance. Appointment does not establish professional qualifications or permission for field work. The fourteen-director report cycle, independent governance reviewers and final owner approval remain unchanged; this change does not fan out an automatic 83-head reporting cycle.

## Validation

After generating Prisma and building the API:

```sh
node --test apps/api/scripts/section-heads.test.cjs apps/api/scripts/department-reporting.test.cjs apps/api/scripts/department-source.test.cjs
```

The mandatory API workflow includes the section tests. The existing loopback HTTP/PostgreSQL acceptance fixture additionally verifies authentication and owner boundaries, audit rollback, concurrent appointment deduplication, all eighty created controls, reused identities, pause preservation and absence of task/provider calls. Browser tests cover hierarchy display, filtering, reviewed submission, stale confirmation rejection and logout clearing.

Source installation and test acceptance are separate from deployment and the authenticated owner's recorded appointment. No live appointment is claimed by this document.
