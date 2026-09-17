# HYDROLAND — Saudi Compliance Matrix

Status: planning baseline. A control becomes **verified** only when tied to an official Saudi source and applicability is confirmed.

## Applicability rule

HYDROLAND operates across Saudi Arabia. Geographic and activity scope must be stored per control. Regulatory controls are independently evaluated by statutory scope. A hard gate is enabled only when its applicability predicate is true; uncertainty routes to REVIEW rather than an invented legal failure.

## Saudi 19-authority master coverage audit

All 19 master authorities are represented: Ministry of Sport, Ministry of Tourism, SWSDF, SRSA, TGA, Border Guard/ZAWIL, MEWA, NCEC, NCW, Ministry of Commerce, ZATCA, MHRSD, TVTC, Civil Defense, Ministry of Municipalities and Housing/Balady, SASO, SDAIA/data-protection authority, NCA and Insurance Authority. Coverage does not mean every control is automatically applicable or production-ready.

## Verified official-source baseline

| Control | Authority | Official instrument / requirement | HYDROLAND owner | Level | System effect | Applicability |
|---|---|---|---|---|---|---|
| REG-SRSA-001 | Saudi Red Sea Authority | Maritime-tourism regulations/licensing framework. | Legal + Marine Operations | L1/L2 | Licence/authority evidence. | Geographic/activity scope dependent. |
| REG-TGA-001 | Transport General Authority | Ship/marine-unit registration, safety inspection and maritime-operation framework. | Marine Operations + Assets + Legal | L1/L2/L3 | Vessel classification, registration and inspection/certificate gates. | Vessel/activity classification dependent. |
| REG-BG-001 | Border Guard / ZAWIL | Sailing-permit and marine-activity authorisation services. | Marine Operations + Safety | L2/L3 | Permit/activity/area/vessel/manifest validation. | Applicable sea-going activity. |
| REG-ENV-001 | MEWA / NCEC | Environmental Law and aquatic-environment framework. | Safety + Marine Operations + Facilities | L1/L2/L3 | Pollution/permit/corrective-action controls. | Environmental impact dependent. |
| REG-NCW-001 | NCW | Protected-area/wildlife framework. | Operations + Safety + Legal | L1/L2/L3 | Geofence/activity review. | Location/activity dependent. |
| REG-MT-001 | Ministry of Tourism | Tourism Law/licensing framework. | Legal + CX + Operations | L1/L2 | Activity/licence classification. | Tourism jurisdiction dependent. |
| REG-MOS-001 | Ministry of Sport | Sports Law framework. | Legal + Training + Governance | L1/L2/L3 | Sport entity/activity classification. | Activity/entity dependent. |
| REG-SWSDF-001 | SWSDF | Diving regulations and centre/trip controls. | Training + Operations + Safety + Legal | L1/L2/L3 | Credentials, permits, centre/trip gates. | Applicable diving activity. |
| REG-HRSD-001 | MHRSD | Labour Law Part VIII and OSH framework. | HR + Safety + Legal | L1-L4 | Worker/OSH controls. | Employment/activity/headcount dependent. |
| REG-CD-001 | Civil Defense | Fire/life-safety regulations and Salamah licensing service. | Safety + Facilities | L1/L2/L3 | Facility safety-licence/evidence gate. | Premises/activity dependent. |
| REG-MUN-001 | Municipalities/Balady | Commercial/municipal activity classification. | Legal + Facilities + Governance | L1/L2 | Municipal activity/licence gate. | Physical activity/location dependent. |
| REG-SASO-001 | SASO | Mandatory technical regulations by product category. | Inventory + Safety + Legal | L1/L2/L3 | Product conformity gate. | Product-specific. |
| REG-PDPL-001 | SDAIA / data-protection authority | PDPL and Executive Regulations. | Technology + Legal + Governance | L1-L4 | Privacy/ROPA/transfers/DPO/incidents. | Personal-data scope. |
| REG-NCA-001 | NCA | ECC 2:2024/CCC scope dependent on entity classification. | Cyber + Governance + Legal | L1-L4 | Scope assessment/control catalogue. | Conditional. |
| REG-IA-001 | Insurance Authority | Insurance-sector licensing and official insurance rules catalogue. | Legal + Finance + Governance | L1/L2/L3 | Insurance-role classifier. | Regulated insurance activity only. |
| REG-MC-001 | Ministry of Commerce | E-Commerce Law/Executive Regulations. | Legal + CX + Finance + Tech | L1/L2/L3 | Consumer disclosures/rights. | Applicable e-commerce. |
| REG-TVTC-001 | TVTC | Private training framework. | Training + Legal + Governance | L1/L2/L3 | Conditional training licence/programme gate. | TVTC jurisdiction only. |
| REG-ZATCA-001 | ZATCA | E-Invoicing framework. | Finance + Tech | L2/L3 | E-invoice compliance. | Taxpayer/wave scope. |

## Article-level hard-gate verification

| Control | Verified source detail | Enforcement candidate | Required system evidence |
|---|---|---|---|
| HARD-DIVE-001 | SWSDF Diving Regulations Article 6: applicable valid membership/licence from approved/licensed diving organisation. | BLOCK | Credential issuer/number/validity/recognition. |
| HARD-DIVE-002 | SWSDF Article 7: applicable dive permit limited by place/time through licensed centre. | BLOCK | Permit, site/geofence, validity, centre. |
| HARD-TRIP-001 | SWSDF 2025 trip regulation clauses 7.3–7.5: centre/trip-organisation and vessel registration/approval conditions. | BLOCK | Centre capability, Federation approval, vessel/marina evidence. |
| HARD-MANIFEST-001 | SWSDF clauses 6.11.5–6.11.6: participant verification and entry/exit records for verified private-beach workflow. | BLOCK when applicable | Manifest, identity, timestamps. |
| HARD-INCIDENT-001 | SWSDF clause 6.11.7: immediate notification and detailed Federation report within 24 hours for applicable accident/emergency. | ESCALATE + deadline | Incident/notification/report evidence. |
| HARD-SAIL-001 | Border Guard sailing-permit service records purpose/type, period, area, vessel and accompanying persons. | BLOCK when applicable | Permit, dates, area, vessel, driver licence, manifest. |
| HARD-ENV-001 | NCEC mechanism identifies pollution-related reportable triggers. | ESCALATE | Trigger/evidence/notification reference. |
| HARD-PDPL-001 | PDPL Executive Regulations Article 24(1): authority notification within no more than 72 hours from awareness when statutory trigger is met. | ESCALATE + 72h | Awareness, assessment, corrective action, submission evidence. |
| HARD-PDPL-002 | Article 24(5): affected-subject notification without undue delay when trigger is met. | ESCALATE | Trigger/notice/delivery evidence. |
| HARD-ECOM-001 | E-commerce termination/return right subject to predicates/exceptions. | REFUND/REVIEW | Category/use/exception/refund evidence. |
| HARD-ECOM-002 | Qualifying delayed performance cancellation/refund subject to force-majeure assessment. | ESCALATE + refund | Dates/delay/force-majeure/settlement. |
| HARD-TGA-VESSEL-001 | TGA small-vessel survey framework requires applicable technical inspection/evaluation and certificates/reports for vessel classes within scope. | REVIEW -> BLOCK after vessel-class applicability | Vessel class/use/size, registration, survey, authorised surveyor, certificate/report, validity, defects/closure. |
| HARD-CD-FACILITY-001 | Civil Defense Salamah service provides activity-specific safety licensing for establishments; facility activation depends on the selected activity and required evidence. | BLOCK before physical-centre activation when applicable | CR, activity class, premises evidence, safety maintenance, insurance where required, Salamah licence/status/validity. |
| HARD-CD-FACILITY-002 | Civil Defense fire/life-safety regulation depends on actual facility use/occupancy. | REVIEW -> BLOCK after facility classification | Use/occupancy, applicable regulation, engineering/safety evidence, inspections/corrective actions, systems/maintenance. |
| HARD-BALADY-001 | Balady's official Commercial Activities and Municipal Requirements service resolves requirements by detailed activity name or ISIC activity. Ministry guidance states municipal licensing is required before practising commercial activity within cities. | BLOCK before physical-site activation once exact activity classification is resolved | CR entity, detailed activity name, ISIC/activity code, municipality/location, municipal licence number/status/validity, linked requirements and approvals. |
| HARD-BALADY-002 | Balady commercial-licence workflow coordinates the commercial activity licence with Civil Defense safety permit for approved commercial activities. HYDROLAND therefore keeps municipal and Salamah evidence separate but linked under one facility-activation case. | BLOCK when both are applicable | Municipal licence + Salamah permit relationship, activity code, facility ID/address, issue/expiry dates and verification status. |
| HARD-INS-001 | Insurance Authority confirms compulsory cooperative third-party liability insurance for crowded places/high-risk activities under Council of Ministers Decision 103. On 16 Aug 2026 the Authority announced staged implementation and stated the policy becomes a core requirement for Civil Defense licensing of activities included in the mandatory scope. | REVIEW -> BLOCK only when current activity/phase is in scope | Exact activity code/class, implementation phase/effective date, policy insurer/number, coverage dates/limits, verification/renewal and linked Salamah case. |
| HARD-INS-002 | Insurance Authority's official rules catalogue separately contains Marine Insurance Coverage Instructions. These rules do not by themselves prove that every HYDROLAND boat or diving activity must carry a particular marine policy; the obligation source must be identified from the vessel/activity/licensing framework before BLOCK. | REVIEW | Vessel/activity class, controlling obligation source, policy type, insured vessel/activity, insurer, coverage/expiry and verification. |

### Hard-gate implementation rule

A `BLOCK` may stop activation only when applicability is true. Missing classification routes to `REVIEW`. Vessel product conformity (SASO), vessel registration/survey (TGA), sailing permit (Border Guard) and diving-trip vessel approval (SWSDF) remain separate evidence layers. Facility activation uses a canonical activity classifier first, then resolves Balady municipal licensing, Civil Defense/Salamah and mandatory-insurance predicates without duplicating activity records.

The municipal classifier must not guess an ISIC code from a marketing label such as 'diving centre'. HYDROLAND stores each actual revenue/operating activity separately (for example: diving-centre services, marine-trip operation, equipment rental, retail/e-commerce and training) and resolves the current official detailed activity/ISIC selection before enabling a statutory BLOCK.

Insurance Authority licensing of insurers/intermediaries is distinct from a HYDROLAND facility's duty to hold a policy. For Decision 103 insurance, the platform must store the implementation phase/effective date and the exact listed activity; staged implementation means a generic high-risk label is insufficient for an automatic BLOCK.

## SASO product-level classification

| Control | Product class | Candidate enforcement | HYDROLAND evidence |
|---|---|---|---|
| HARD-SASO-CYL-001 | Diving cylinder/pressure assembly | REVIEW -> BLOCK after classification | Model/serial, pressure/capacity/gas, regulation/standard, conformity/test. |
| HARD-SASO-COMP-001 | Diving air compressor | REVIEW -> BLOCK after classification | Model/serial, pressure/flow, machinery/pressure conformity, commissioning/maintenance. |
| HARD-SASO-BOAT-001 | Watercraft/recreational craft | REVIEW -> BLOCK at procurement/import/acceptance when applicable | Manufacturer/model/HIN, category/use, conformity/technical file. |
| HARD-SASO-PPE-001 | PPE/clothing | REVIEW -> BLOCK when classified as regulated PPE | Product/risk class, supplier/model/batch, standard/conformity/instructions. |

## HYDROLAND activity-classification model

Before facility or insurance activation, create one canonical `ActivityClassification` record per actual activity with: legal entity/CR, operating unit/centre, public activity label, official detailed activity name, ISIC/activity code, source authority, source version/date, physical/e-commerce flag, premises/use, geography, regulator set, municipal-licence requirement, Salamah requirement, Decision-103 insurance status/phase and verification timestamp.

Target activities to resolve against Balady's live activity catalogue are: diving-centre operations, diving/snorkeling trip organisation, marine craft/boat trip operation, diving/sports equipment rental, diving/sports equipment retail/e-commerce, diving training/course delivery, and any compressor/cylinder filling or maintenance workshop activity actually offered. These remain `CLASSIFICATION_PENDING` until the exact current official activity entry is selected; no guessed ISIC number is stored.

## Operational-control mapping

- CMB-001 vessel gate separates TGA registration/survey/certificates from SASO conformity, Border Guard sailing permit and SWSDF approval.
- CMB-002 sailing permit uses HARD-SAIL-001.
- CMB-004 diver credential uses HARD-DIVE-001.
- CMB-006 incident/escalation routes SWSDF/NCEC/PDPL incidents to separate workflows/deadlines.
- Facility activation now uses HARD-BALADY-001/002 + HARD-CD-FACILITY-001/002 and a single canonical ActivityClassification source of truth.
- Decision-103 insurance uses HARD-INS-001 and cannot become BLOCK until exact activity + current implementation phase are verified.
- Marine insurance uses HARD-INS-002 and remains separate from Decision-103 facility liability insurance.
- Equipment procurement/commissioning uses SASO product classification before mandatory conformity BLOCK.

## Required implementation fields

Each regulatory control stores authority, instrument, exact requirement/source/version/effective date, applicability predicate/result, owner, L1-L4, workflow, enforcement mode, evidence, validity/expiry, audit/retention and verification status.

Facility records store CR/activity code, municipal licence, premises/use/occupancy, Salamah licence, fire-safety regulation, safety-system maintenance and insurance evidence. Insurance records store obligation source/phase/effective date, exact activity, policy type/provider/number, insured activity/asset, coverage/expiry and verification. Vessel records retain separate TGA/BG/SWSDF/SASO statuses.

## Source registry

- Balady — Commercial Activities and Municipal Requirements lookup by detailed activity/ISIC; commercial licensing services.
- Ministry of Municipalities and Housing — municipal licensing requirement before commercial activity.
- Civil Defense — Salamah licensing and fire/life-safety framework.
- Insurance Authority — Decision 103 implementation announcement (16 Aug 2026), mandatory third-party liability policy for in-scope crowded/high-risk activities, official regulations catalogue and Marine Insurance Coverage Instructions.
- TGA — small-vessel survey/inspection framework.
- Existing verified sources: SRSA, Border Guard/ZAWIL, MEWA/NCEC, NCW, Tourism, Sport/SWSDF, MHRSD, SASO, SDAIA/PDPL, NCA, Commerce, TVTC and ZATCA.

## Next verification batches

1. Resolve exact live Balady detailed activity/ISIC entries for each HYDROLAND physical activity; do not guess codes if the public catalogue does not expose the entry in a verifiable form.
2. Obtain/verify the current Decision-103 mandatory-insurance activity list and staged implementation mapping; test each resolved HYDROLAND activity against it.
3. Verify remaining exact TGA vessel class/registration/survey/certificate rules for the vessel categories HYDROLAND will onboard.
4. Once these classifiers are fixed, close planning hardening and convert the verified matrix into persisted compliance-control records, workflow gates, tests and CI validation.
