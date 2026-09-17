# HYDROLAND — Saudi Compliance Matrix

Status: planning hardening. A control becomes **verified** only when tied to an official Saudi source and applicability is confirmed.

## Applicability rule
HYDROLAND operates across Saudi Arabia. Geographic and activity scope is stored per control. A hard gate is enabled only when its applicability predicate is true; uncertainty routes to REVIEW rather than an invented legal failure.

## Saudi authority coverage
All 19 master authorities remain represented: Ministry of Sport, Ministry of Tourism, SWSDF, SRSA, TGA, Border Guard/ZAWIL, MEWA, NCEC, NCW, Ministry of Commerce, ZATCA, MHRSD, TVTC, Civil Defense, Ministry of Municipalities and Housing/Balady, SASO, SDAIA/data-protection authority, NCA and Insurance Authority.

## Article-level hard-gate register
| Control | Verified requirement | Enforcement | Evidence |
|---|---|---|---|
| HARD-DIVE-001 | SWSDF Diving Regulations Article 6: applicable valid credential/membership/licence from recognised organisation. | BLOCK | issuer, number, validity, recognition |
| HARD-DIVE-002 | SWSDF Article 7: applicable dive permit limited by place/time through licensed centre. | BLOCK | permit, site, validity, centre |
| HARD-TRIP-001 | SWSDF 2025 trip rules: applicable centre/trip and vessel approval conditions. | BLOCK | centre capability, approval, vessel/marina |
| HARD-INCIDENT-001 | SWSDF applicable accident/emergency: immediate notification and detailed report within 24h. | ESCALATE | incident/notification/report timestamps |
| HARD-SAIL-001 | Border Guard sailing permit: purpose/type, period, area, vessel and persons. | BLOCK when applicable | permit, dates, area, vessel, captain/manifest |
| HARD-ENV-001 | NCEC pollution/environmental incident triggers. | ESCALATE | trigger/evidence/notification |
| HARD-PDPL-001 | PDPL Executive Regulations Article 24(1): authority notification <=72h from awareness when trigger met. | ESCALATE + deadline | awareness, assessment, corrective action, submission |
| HARD-PDPL-002 | Article 24(5): affected-subject notice without undue delay when trigger met. | ESCALATE | trigger, notice, delivery |
| HARD-ECOM-001 | E-commerce termination/return subject to statutory predicates/exceptions. | REFUND/REVIEW | category/use/exception/refund |
| HARD-ECOM-002 | Qualifying delayed-performance cancellation/refund subject to force majeure. | ESCALATE + refund | dates/delay/force-majeure/settlement |
| HARD-BALADY-001 | Balady resolves municipal requirements by detailed activity name or ISIC; exact official activity classification precedes facility activation. | REVIEW -> BLOCK after classification | CR, official activity, code, licence/status/validity |
| HARD-CD-FACILITY-001 | Civil Defense/Salamah safety licence is activity/facility dependent. | BLOCK when applicable | activity, premises, Salamah, safety maintenance, linked insurance if required |
| HARD-INS-001 | Decision 103 third-party liability insurance is mandatory for activities in the staged in-scope list and becomes a Civil Defense licensing requirement for those activities. | REVIEW -> BLOCK only when exact activity/phase in scope | activity, phase/effective date, insurer/policy/coverage |

## TGA vessel survey/certificate hardening
Official TGA small-vessel inspection rules were verified at article level for ships/marine units not subject to international conventions. Article 2 applies the regulation to those vessels/units and expressly requires size, tonnage and nature of activity to be considered. This prevents HYDROLAND from applying one certificate profile to every boat.

| Control | TGA article-level rule | Enforcement | Required evidence |
|---|---|---|---|
| HARD-TGA-SCOPE-001 | Article 2: regulation applies to ships/marine units not subject to international conventions; implementation considers vessel size, tonnage and activity. | CLASSIFY/REVIEW before any TGA BLOCK | vessel type/use, length/tonnage where applicable, domestic/international-convention status, activity |
| HARD-TGA-SURVEY-001 | Article 7: applicable vessels/units undergo surveys; initial survey occurs before entry into service / first relevant certificate and examines structure, machinery, pressure vessels, electrical/radio, lifesaving and fire-safety systems as applicable. | BLOCK commissioning/operation when survey is due and scope confirmed | survey type/date, authorised surveyor, inspected systems, findings, corrective closure |
| HARD-TGA-CERT-001 | Article 8: the competent authority or authorised body issues/endorses the applicable safety certificates after required survey and compliance. Certificate type depends on vessel classification. | BLOCK when required certificate missing/invalid | certificate type/number, issuer, issue date, vessel ID, survey reference |
| HARD-TGA-VALIDITY-001 | Article 9 sets certificate validity rules; passenger-ship safety certificate is no more than 12 months while specified cargo certificates are set by the authority up to five years. HYDROLAND must therefore calculate expiry from the actual certificate type rather than a universal period. | BLOCK on expiry when applicable | certificate class, issued/expiry dates, extension basis/evidence |
| HARD-TGA-ONBOARD-001 | Article 12 requires certificates issued under the regulation to be readily available onboard for verification. | REVIEW/BLOCK according to operational applicability | onboard-document status, digital evidence/reference, verification timestamp |
| HARD-TGA-SURVEYOR-001 | Article 14 permits inspection, technical evaluation and mandatory certificates/reports by institutions/companies authorised in writing by the competent authority. | BLOCK evidence acceptance if issuer/authorisation invalid | survey organisation, authorisation/licence, scope, report/certificate reference |

### Vessel compliance state machine
`UNCLASSIFIED -> CLASSIFIED -> SURVEY_REQUIRED/NOT_REQUIRED -> SURVEY_PASSED -> CERTIFICATE_VALID -> OPERATION_ELIGIBLE`.

`OPERATION_ELIGIBLE` under TGA is not final trip permission. A marine trip may proceed only after independent applicable layers pass: SASO product conformity, TGA registration/survey/certificate, Border Guard sailing permit, SWSDF diving-trip/centre controls, and any SRSA/environmental/geographic controls.

## Facility/activity classifier
Balady's official service confirms lookup by detailed activity name or ISIC. HYDROLAND therefore keeps one canonical `ActivityClassification` record per actual operating/revenue activity and never guesses an ISIC code from a marketing label.

Target activity families remain: diving-centre operations; diving/snorkeling trip organisation; marine craft/boat trip operation; diving/sports equipment rental; equipment retail/e-commerce; diving training; compressor/cylinder filling or maintenance workshop if offered.

A relevant verified municipal category exists for offices renting land, marine and air transport means, confirming that marine-transport rental can carry its own municipal technical/operational requirements. This does **not** prove that every HYDROLAND boat trip or equipment rental belongs to that category; exact activity selection remains `CLASSIFICATION_PENDING` until matched in Balady.

## Decision-103 insurance classifier
Insurance Authority's 16 Aug 2026 announcement confirms staged mandatory cooperative third-party liability insurance for in-scope crowded/high-risk activities and that the policy becomes a core Civil Defense licensing requirement for activities included in the mandatory scope. The public announcement does not itself enumerate a complete machine-readable phase/activity table. Therefore HYDROLAND stores `decision103Status = PENDING_CLASSIFICATION | IN_SCOPE | OUT_OF_SCOPE`, with `IN_SCOPE` allowed only after the exact activity and effective phase are evidenced.

Marine-insurance instructions remain separate; their existence is not treated as proof of a universal mandatory marine policy for every vessel.

## SASO product controls
- Diving cylinders/pressure assemblies: REVIEW -> BLOCK after exact product classification.
- Diving compressors: machinery + pressure-component classification where applicable.
- Watercraft: SASO product conformity remains separate from TGA/BG/SWSDF operational evidence.
- PPE: only products actually within the PPE regulation scope are blocked for conformity evidence.

## Canonical implementation fields
`RegulatoryControl`: authority, instrument, article/requirement, source/version/effectiveDate, applicability predicate/result, enforcement mode, owner, L1-L4, evidence schema, validity/expiry, audit/retention, verification status.

`ActivityClassification`: legalEntity/CR, centre/unit, public label, official detailed activity, ISIC/activity code, source/version, physical/e-commerce flag, premises/use, geography, regulator set, municipal licence requirement, Salamah requirement, Decision-103 status/phase, verifiedAt.

`VesselComplianceProfile`: vessel ID/HIN/registration, type/use, size/tonnage/classification, convention status, survey requirement/type/date, surveyor/authorisation, findings/closure, certificate type/number/issuer/validity, onboard-document status, SASO/TGA/BG/SWSDF/SRSA statuses.

## Planning closure gate
Planning is not declared complete until:
1. exact Balady activity entries are resolved for the activities HYDROLAND will actually offer;
2. Decision-103 phase/activity applicability is evidenced for those resolved activities;
3. actual vessel onboarding categories are mapped to the TGA classifier and certificate profile;
4. remaining verified controls have source/version metadata suitable for persistence.

After those applicability inputs are fixed, the next phase is programmatic implementation: persisted compliance tables, policy evaluator, BLOCK/REVIEW/ESCALATE workflows, immutable evidence/audit trail, API integration, tests and CI.