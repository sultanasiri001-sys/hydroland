# A14 transaction-bound compliance reads (local candidate)

Base: a3d5ad1d73dad0cd81c0194031a2e1ed57e4038d, after shipped PR533.

BoatComplianceService.evaluate and TripComplianceService.get now accept an
optional Prisma transaction client. Every policy and proof read uses that client,
including the trip existence check. Existing callers default to DatabaseService
and retain current optional-policy semantics. Errors propagate; there is no
fallback to an outside transaction. No write path or control state is changed.

This is a prerequisite for integrating source-bound mandatory checks into a
mutation's transaction, not the complete integration. Current calendar callers
still use the default client. No mandatory evaluator, legal manifest, source
adoption or external-verification assertion is introduced. Missing proof can
still be bypassed under current DISABLED semantics: A14 remains PARTIAL.

Verification command after API build:

    node apps/api/scripts/compliance-transaction-validation.cjs

The synthetic harness loads the compiled product services and real policy
service. A root-client trap proves caller transaction propagation across policy,
boat proof, trip existence and trip proof reads. All policy states preserve
existing default-client behavior; transaction failures propagate. It does not
prove PostgreSQL isolation, concurrency, HTTP authorization or audit rollback.

Remaining integration prerequisites: recover the original evaluator/aggregator
and 18-entry applicability manifest; bind each mandatory requirement to exact
official clause/version, service, jurisdiction, issuer, validity and adoption
evidence; integrate all mutation callers and source revisions; run isolated
HTTP/PostgreSQL race/rollback tests. No generic approval substitutes for law.

PR533's five shipped files, governance runtime, package/lock files, deployment,
UAT data and other lanes are unchanged.

## Executed local evidence

- API typecheck: PASS.
- API build: PASS.
- API lint (zero warnings): PASS.
- Compiled-service transaction harness: 34 cases PASS, no real DB/network.
- git diff --check: PASS.

HTTP/PostgreSQL isolation/race tests and mandatory-source acceptance were NOT
run. The earlier 1,523-assertion characterization is a separate artifact outside
this checkout, not rerun or counted as patch acceptance.

## Bounded review follow-up

The final suite additionally covers populated verified/approved, rejected and
expired proof; mixed policy states; absent/invalid/null policy rows falling back
to existing ENABLED semantics; empty boat IDs; and failures at later proof and
policy reads after earlier reads succeed. It checks exact failure identity and
zero root-client fallback across all cases. Populated proof objects remain
unchanged. Both default and supplied-client paths retain existing semantics.

Passing a client through is not proof of a database snapshot, transaction
isolation, race safety or integration by mutation callers. Those caller and
HTTP/PostgreSQL checks remain outstanding. No source applicability or mandatory
default was introduced by this follow-up.
