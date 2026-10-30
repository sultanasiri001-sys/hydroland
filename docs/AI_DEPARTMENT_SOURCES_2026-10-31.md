# Department reporting source snapshots

New owner-started reporting cycles use one department-specific numeric source packet for each of the fourteen directors. These replace the four general counters for those new director reports. Existing cycles, completed reports, manual legacy tasks and their recorded inputs are preserved.

## Scope and provenance

The platform staffing organization is resolved from the existing canonical setting and must be active, of the internal-platform kind and owned by a currently active, verified administrator. All fourteen department units must be active before a new reporting cycle can start. The source preview checks that authority again on every request, including during a provider cooldown; it never invokes the model or writes business records.

Counts cover the internal organization. They are not a roll-up of independently owned dive centers. Marine booking counts follow the trip provider's organization, not a booking customer's organization. Relational finance and administrative counts constrain both sides of the organization link. Technical counters cover the current owner's AI tasks and the existing platform-wide agent controls; they do not inspect accounts, credentials or security secrets.

Every department receives counts of its canonical administrative templates and documents, including inactive template versions, individual document states and inconsistent links. Only canonical codes in the retained administrative catalog are included. Document content, titles, parties, identities, amounts and free text are not selected or sent to the model.

| Department | Additional persisted source counts | Outstanding evidence or connector |
| --- | --- | --- |
| HR | Candidates, employment, active employment, pending leave | Official workforce validation |
| Training | Course offers, active enrollment, completed training records, certificate recommendations | Training authority verification |
| Marine operations | Trips, open trips, trip bookings, crew assignments | Release and return evidence |
| Inventory and logistics | Administrative source counts only | Warehouse, procurement and supplier register |
| Finance | Active accounts, pending entries, posted entries | Reconciliation and period close |
| Safety | Checklists, pending safety decisions, unresolved trip incidents | Risk and CAPA effectiveness |
| Customer experience | Cases, open/assigned cases, waiting-customer cases, closed cases | Verified customer outcome |
| Marketing | Administrative source counts only | Publication and campaign analytics |
| Technology and cybersecurity | Current owner's queued/running/failed tasks, enabled agents | Incident and recovery evidence |
| Facilities and maintenance | Administrative source counts only | Unified assets and work orders |
| Administrative affairs | Administrative records, pending routings, meetings | Delivery, retention and disposal evidence |
| Executive governance | Active departments, assessment revisions, pending office tasks | Decision execution evidence |
| Research | Internal initiatives and reviews | Experiment and market evidence |
| Legal | Employment-contract versions and draft versions | Commercial contracts, insurance and claims register |

An empty operational metrics object means an unavailable connector, not a measured zero. A numeric zero is a real count from the named, scoped table. Coverage remains PARTIAL and operational acceptance remains NOT_ASSESSED. Counts and approved documents do not establish legal applicability, completed work, effectiveness, financial settlement or departmental closure.

## Durable input and compatibility

New director tasks are pinned at creation with the `department-source:v2:` fingerprint prefix. The runtime captures only allowlisted scalar counts in the same serializable transaction as the exact-claim audit receipt. The digest binds the task, claim, source revision, observation time and complete packet, including the administrative catalog revision and a digest of its exact department code set. JSONB key order is canonicalized before hashing. Its department must match the claimed director.

Office reviews consume that recorded packet, never a reconstruction from current records. A later document or counter change does not replace the original evidence. Current owner authority is checked before forwarding a v2 source into a model review. Existing audit, task and office-review administration retain their established authorization boundaries; the direct live-source preview is owner-only.

The evidence reader and browser support the retained v1 four-counter receipts and the new v2 packets. Historical receipts are neither upgraded nor regenerated. Changes to the v2 metric contract require a new packet version while retaining the old reader. The ongoing reporting cycle can therefore finish using its original evidence after the persisted provider wait expires. No replacement production cycle or extra paid test is required for this change.

## Interface and validation

The admin agent panel offers a read-only source check while generation is unavailable or rate limited. It shows all fourteen departments, measured counts, inactive units and explicit gaps. A historical office file separately shows its captured source and date. Logout, role revocation and workspace changes clear the private preview. Unknown, cross-department or malformed evidence is rejected.

Validation covers strict packet boundaries, privacy, legacy receipt compatibility and exact-claim integrity. Native loopback HTTP/PostgreSQL acceptance seeds unrelated organizations, mismatched document and finance links, private-payload sentinels and representative domain records. It checks fresh authority, inactive-unit preflight, read-only behavior, every director's actual model input and an immutable historical source after the live document count changes. Browser cases cover mobile display, missing connectors, logout, role revocation and invalid historical evidence.

No migration, model, credential, price, budget or provider retry policy is changed. Existing provider waits, attempt caps, completed-output protection, owner decisions and idempotent report delivery continue to apply.
