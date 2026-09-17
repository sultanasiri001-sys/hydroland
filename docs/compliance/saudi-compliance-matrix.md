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
| HARD-TGA-VESSEL-001 | TGA executive rules for inspection/survey of small vessels not subject to international conventions establish competent-authority/authorised-company inspection and technical evaluation for registered, under-construction or repair vessels/units, with mandatory certificates/reports used to evidence compliance and seaworthiness. | REVIEW -> BLOCK after vessel-class applicability is resolved | Vessel class/use/size, registration, survey type/date, authorised surveyor, mandatory certificate/report, validity, deficiencies and closure evidence. |
| HARD-CD-FACILITY-001 | Civil Defense Salamah service enables establishments with valid commercial registrations to obtain a safety licence after selecting the activity and submitting activity-specific documents. Published requirements include building/occupancy evidence, safety-system maintenance contract and establishment insurance evidence. | BLOCK before physical-centre activation when Salamah licence applies | CR, activity class, facility/building evidence, safety-maintenance contract, insurance evidence, Salamah licence/status/validity. |
| HARD-CD-FACILITY-002 | Civil Defense publishes activity/building-specific fire/life-safety regulations; the applicable regulation depends on actual premises/use. Office/administrative rules require compliance evidence and recognise Civil Defense inspection/enforcement. | REVIEW -> BLOCK after facility/use classification | Facility use/occupancy, applicable regulation, engineering/safety evidence, inspection/corrective actions, fire systems and maintenance records. |
| HARD-INS-001 | Insurance Authority confirms mandatory cooperative third-party liability insurance applies to high-risk/crowded establishments and activities under Council of Ministers Decision 103; exact activity inclusion must be determined from the current implementation scope rather than inferred. | REVIEW -> BLOCK only when activity is listed/in scope | Activity code/class, applicable decision/phase, insurer/policy, coverage dates, verification and renewal evidence. |

### Hard-gate implementation rule

A `BLOCK` may stop activation only when applicability is true. Missing classification routes to `REVIEW`. Vessel product conformity (SASO), vessel registration/survey (TGA), sailing permit (Border Guard) and diving-trip vessel approval (SWSDF) remain separate evidence layers. Facility municipal licensing and Civil Defense Salamah/fire-safety controls also remain separate but coordinated activation gates. Insurance Authority licensing of insurers/intermediaries is distinct from a customer's or facility's obligation to hold an insurance policy.

## SASO product-level classification

| Control | Product class | Candidate enforcement | HYDROLAND evidence |
|---|---|---|---|
| HARD-SASO-CYL-001 | Diving cylinder/pressure assembly | REVIEW -> BLOCK after classification | Model/serial, pressure/capacity/gas, regulation/standard, conformity/test. |
| HARD-SASO-COMP-001 | Diving air compressor | REVIEW -> BLOCK after classification | Model/serial, pressure/flow, machinery/pressure conformity, commissioning/maintenance. |
| HARD-SASO-BOAT-001 | Watercraft/recreational craft | REVIEW -> BLOCK at procurement/import/acceptance when applicable | Manufacturer/model/HIN, category/use, conformity/technical file. |
| HARD-SASO-PPE-001 | PPE/clothing | REVIEW -> BLOCK when classified as regulated PPE | Product/risk class, supplier/model/batch, standard/conformity/instructions. |

## Operational-control mapping

- CMB-001 vessel gate now separates TGA registration/survey/certificates from SASO product conformity, Border Guard sailing permit and SWSDF diving-trip approval.
- CMB-002 sailing permit uses HARD-SAIL-001.
- CMB-004 diver credential uses HARD-DIVE-001; depth entitlement remains credential-framework dependent.
- CMB-006 incident/escalation routes SWSDF/NCEC/PDPL incidents to separate workflows/deadlines.
- Physical-centre activation requires activity classification first, then applicable Balady and Civil Defense/Salamah evidence; unknown facility use routes to REVIEW.
- Insurance gate first classifies the activity against the current mandatory-insurance scope; no universal diving-centre/boat insurance BLOCK is invented from Insurance Authority rules alone.
- Equipment procurement/commissioning uses SASO product classification before mandatory conformity BLOCK.

## Required implementation fields

Each regulatory control stores authority, instrument, exact requirement/source/version/effective date, applicability predicate/result, owner, L1-L4, workflow, enforcement mode, evidence, validity/expiry, audit/retention and verification status.

Vessel records additionally store vessel class/use/size, registration, survey type, authorised surveyor, certificates, defects/corrective closure and separate TGA/BG/SWSDF/SASO statuses. Facility records store CR/activity code, municipal licence, premises/use/occupancy, Salamah licence, fire-safety regulation, safety-system maintenance and insurance evidence. Insurance records store obligation source/phase, policy type/provider/number, insured activity/asset, coverage/expiry and verification.

## Source registry

- TGA — executive regulation for inspection/survey of small vessels not subject to international conventions; maritime safety/certificate framework.
- Civil Defense — Salamah electronic licensing service and official fire/life-safety regulations catalogue.
- Insurance Authority — official regulations catalogue and mandatory-insurance guidance; activity obligation must be tied to its controlling decision/current implementation scope.
- Existing verified sources: SRSA, Border Guard/ZAWIL, MEWA/NCEC, NCW, Tourism, Sport/SWSDF, MHRSD, Municipalities/Balady, SASO, SDAIA/PDPL, NCA, Commerce, TVTC and ZATCA.

## Next verification batches

1. Verify the exact current TGA vessel class/registration/survey/certificate rules for the HYDROLAND vessel categories that will be onboarded; SOLAS rules are not to be generalized to small domestic recreational craft.
2. Resolve actual Balady activity/ISIC classifications for diving centres, marine-trip operations, equipment rental/store and training premises, then map the corresponding Civil Defense facility requirements.
3. Resolve the current mandatory third-party-liability insurance activity list/phase and test whether any HYDROLAND centre/activity is actually included.
4. After those applicability classifiers are fixed, convert the verified matrix into persisted compliance-control records, workflow gates, tests and CI validation.