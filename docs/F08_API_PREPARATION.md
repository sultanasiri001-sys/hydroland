# F08 — preparation, internal testing and API connection

## Current owner-defined scope

On 26 November 2026 the owner clarified that HYDROLAND is to be tested before
connecting any real organization. The current deliverable is the technical
procurement workflow, an interactive internal test workspace, and a documented
API connection that can be configured later. A customer organization, its
contract, credentials and operational acceptance are not prerequisites for
technical preparation. They remain necessary when commissioning its real use.

Technical completion does not record a customer's signature, the owner's user
acceptance, a real payment, or a general D19 approval. Q01 remains the final
cross-platform user acceptance step. The historical F08 evidence and customer
acceptance conditions remain available as history.

## Open the workspace

The verified HYDROLAND platform owner can open **Procurement testing and
integration / تجربة المشتريات وإعداد الربط** from the site. It is available
before registering an external organization. The configured internal HYDROLAND
organization identifies the platform owner; no customer membership is created.

Reading the workspace does not create a test session, purchase, document or
finance account. **Create a synthetic test** explicitly starts a session owned
by the account. Reopening the page restores the server-saved session.

### Internal procurement test

The test workspace models the recommendation, decision, invoice, partial
receipts, receipt acceptance, settlement, reversal, recovery and final scenario
acceptance. Its seven roles are synthetic choices operated by the logged-in
owner. They are not independent human signatures. Purchase-line, quantity,
explicit-tax and monetary validation reuses the production domain validators.

The server keeps sessions and their chained events only in
`ProcurementLabSession` and `ProcurementLabEvent`. It replays the events on
read to check the state and digest. Each command carries `requestId`,
`expectedRevision` and `expectedDigest`; an identical replay returns the current
session and the original command result without duplicating its effect. A stale
revision or a reused key with different content is rejected. A new session is
the reset mechanism; historical sessions are retained.

The simulator is deliberately separate from `Organization`, `ManagedDocument`,
`FinanceEntry`, native payments and real procurement evidence. No role switch in
the simulator grants production authority. No internal test calls a provider.
It is a user-facing rehearsal; the actual native procurement, authorization,
document lifecycle and finance behavior continue to be tested independently
through the existing full HTTP/PostgreSQL F08 gate.

### API connection preparation

The settings page can save an incomplete connection draft. The supported
protocol is **`HYDROLAND_PROCUREMENT_EXCHANGE_V1`**. It contains four strictly
validated message kinds: purchase order, invoice, receipt and reversal. The
contract download includes JSON Schema, semantic rules, synthetic examples,
authentication modes and a capabilities-response example.

Use the JSON editor to validate messages now. Validation checks their structure,
numeric types, declared totals and explicit taxes. It does not prove the
authenticity of a supplied source digest, import a signed document, create an
order, post money or approve a business action. Both TEST and LIVE are explicit
message labels; neither label bypasses the production evidence workflow.

The configured adapter supports a bounded **GET capabilities handshake**. It
does not enable external business writes, unattended data synchronization,
remote purchase approval or bank transfers. Those operations cannot be inferred
from a successful connection check. A future provider must implement the
published protocol; a different protocol requires its documented adapter.

## Connection inputs supplied later

| Input | Meaning |
| --- | --- |
| Display name | A recognizable name for the saved preparation profile. |
| Protocol | `HYDROLAND_PROCUREMENT_EXCHANGE_V1`. |
| API base URL | An HTTPS public DNS endpoint, port 443, without embedded credentials, query or fragment. |
| Authentication | Bearer token, `X-API-Key`, or no authentication for public metadata. |
| Credential reference | A named server-registered credential bound to this destination and authentication mode. |

The browser submits a credential reference, never a credential value or an
arbitrary environment-variable name. There are no credentials in the downloaded
examples, browser storage, connection history or response messages.

Server configuration uses `HYDROLAND_PROCUREMENT_API_CREDENTIALS`, a JSON array
of up to twenty metadata entries. Each `secretEnv` must name a dedicated variable
beginning with `HYDROLAND_PROCUREMENT_API_SECRET_`; other server secrets cannot
be selected. The registry entry binds the credential to its HTTPS origin.

The following is a configuration template, not a real organization or secret:

```json
[
  {
    "ref": "future-organization-test",
    "label": "Future organization test API",
    "origin": "https://procurement.example.org",
    "secretEnv": "HYDROLAND_PROCUREMENT_API_SECRET_ORGANIZATION_TEST",
    "authMode": "BEARER"
  }
]
```

The actual credential belongs only in the selected server secret setting. Do
not put it in source control, Notion, the tracker, screenshots or a chat message.
No real endpoint or secret is configured by this release.

## Provider handshake contract

For a configured base `https://procurement.example.org/api/v1/`, the explicit
**Check connection** action requests `GET /api/v1/capabilities`. This example
domain is a placeholder, not an asserted provider endpoint. The provider must
return HTTP 200 with JSON matching:

```json
{
  "protocol": "HYDROLAND_PROCUREMENT_EXCHANGE_V1",
  "version": 1,
  "capabilities": ["PURCHASE_ORDER", "INVOICE", "RECEIPT", "REVERSAL"],
  "currency": "SAR"
}
```

The request contains no order, invoice, personal data or financial evidence.
The response body and credentials are not returned to the browser or written to
the profile history; only a classified outcome is saved. Authentication errors,
protocol mismatches, redirects, invalid JSON, oversized responses and timeouts
produce explicit failure codes. An interrupted worker records an unknown
request-attempt state rather than asserting that no request left the server.

Every A/AAAA result must be a public address. The TLS socket uses one of the
validated addresses through a pinned lookup, with the original server name and
certificate verification enabled. Private, local, reserved and mapped addresses
are refused; redirects are not followed. DNS is bounded to two seconds and the
request to six seconds, with at most 64 KiB of uncompressed JSON.

The network request runs outside database transaction retries. A persisted
request prevents an identical retry from sending a second request. On completion
the server checks the current owner authorization, saved revision, configuration
digest and credential binding again. A changed or revoked configuration cannot
acquire a successful result from an earlier check. A verified status expires
after fifteen minutes and never indicates that business exchange is enabled.

## Management API on HYDROLAND

All routes below require the existing signed-in session and a fresh verified
platform-owner check. They are management APIs, not permanent customer-machine
credentials. Do not hand an owner's session token to an external system.

| Route under `/api/v1/procurement-lab` | Operation |
| --- | --- |
| `GET /workspace` | Current owner sessions, actions, connection state and contract. |
| `GET /contract` | Versioned exchange schema and synthetic examples. |
| `POST /exchange/validate` | Validate `{ "message": ... }` without executing it. |
| `POST /integration` | Save metadata using `requestId` and `expectedRevision`. |
| `POST /integration/check` | Check the saved `expectedRevision` and `expectedConfigHash`. |
| `POST /sessions` | Explicitly create a synthetic scenario. |
| `GET /sessions/:id` | Read the current saved session after ownership verification. |
| `POST /sessions/:id/actions` | Execute a bounded synthetic action with revision, digest and request key. |

## Evidence required for technical completion

The release gates exercise the real HTTP controllers and disposable PostgreSQL,
synthetic state transitions, wrong-role/stale/replay cases, unchanged business
tables, additive TEXT/UUID migration, native dump/restore/replay, strict message
validation and the transport against a local HTTPS provider. Browser tests cover
the same-site entry without an external organization, saved settings, interaction,
session changes, language, mobile layout and distinction from a live connection.

The tracker records successful execution on the released commit, then live
readiness and matching served assets. It can close the technical preparation
scope when these are proved, while keeping user acceptance and external
organization commissioning explicitly unperformed.
