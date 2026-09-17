# HYDROLAND — Saudi Compliance Matrix

Status: planning baseline. A control becomes **verified** only when tied to an official Saudi source and applicability is confirmed.

## Applicability rule

HYDROLAND operates across Saudi Arabia. Geographic and activity scope must be stored per control. Regulatory controls are independently evaluated by statutory scope. A hard gate is enabled only when its applicability predicate is true; uncertainty routes to REVIEW rather than an invented legal failure.

## Verified official-source baseline

| Control | Authority | Official instrument / requirement | HYDROLAND owner | Level | System effect | Applicability |
|---|---|---|---|---|---|---|
| REG-SRSA-001 | Saudi Red Sea Authority | Maritime-tourism regulations and licensing framework. | Legal + Marine Operations | L1/L2 | Licence/authority evidence and applicable workflow gates. | Red Sea scope/activity dependent. |
| REG-TGA-001 | Transport General Authority | Ship/marine-unit registration and maritime-operation licensing framework. | Marine Operations + Facilities/Assets + Legal | L1/L2/L3 | Vessel evidence, validity and operation gates. | Vessel/activity classification dependent. |
| REG-BG-001 | General Directorate of Border Guard / ZAWIL | Sailing-permit and marine-activity authorisation services. | Marine Operations + Safety/Compliance | L2/L3 | Validate permit activity, validity, area, vessel and manifest. | Applicable sea-going activity. |
| REG-ENV-001 | MEWA / NCEC | Environmental Law and aquatic-environment pollution framework. | Safety/Compliance + Marine Operations + Facilities | L1/L2/L3 | Pollution-prevention, permit and corrective-action controls. | Applicable activity/environmental impact. |
| REG-NCW-001 | NCW | Protected-area and wildlife framework. | Marine Operations + Safety/Compliance + Legal | L1/L2/L3 | Protected-area geofence and activity-specific review. | Location/activity dependent. |
| REG-MT-001 | Ministry of Tourism | Saudi Tourism Law and licensing framework. | Legal + Customer Experience + Marine Operations | L1/L2 | Activity classification and applicable licence evidence. | Tourism-jurisdiction dependent. |
| REG-MOS-001 | Ministry of Sport | Sports Law framework. | Legal + Training + Executive Governance | L1/L2/L3 | Sport entity/activity/licence classification. | Exact sport activity/entity dependent. |
| REG-SWSDF-001 | Saudi Water Sports and Diving Federation | Diving regulations and centre controls. | Training + Marine Operations + Safety/Compliance + Legal | L1/L2/L3 | Credential, dive-permit and centre-service capability controls. | Applicable diving activity/entity. |
| REG-HRSD-001 | Ministry of Human Resources and Social Development | Labour Law Part VIII and OSH framework. | HR + Safety/Compliance + Legal | L1/L2/L3/L4 | Worker risk, PPE, fire-safety and OSH governance. | Employment/activity/headcount dependent. |
| REG-CD-001 | General Directorate of Civil Defense | Fire-protection and activity/building safety regulations. | Safety/Compliance + Facilities/Assets | L1/L2/L3 | Facility/use classification and fire-safety evidence. | Premises/use dependent. |
| REG-MUN-001 | Ministry of Municipalities and Housing / Balady | Commercial activity and municipal requirement classification. | Legal + Facilities/Assets + Executive Governance | L1/L2 | Activity/ISIC/licence evidence and centre gate. | Physical activity/location dependent. |
| REG-SASO-001 | SASO | Mandatory technical regulations by product category. | Inventory/Procurement + Safety/Compliance + Legal | L1/L2/L3 | Product classifier and conformity-evidence gate. | Product-specific. |
| REG-PDPL-001 | SDAIA / Competent Data Protection Authority | Personal Data Protection Law and Executive Regulations. | Technology + Legal + Executive Governance | L1/L2/L3/L4 | Data inventory, privacy governance, ROPA, transfers, DPO and incident controls. | Personal-data processing within statutory scope. |
| REG-NCA-001 | National Cybersecurity Authority | ECC 2:2024 scope depends on entity classification. | Technology/Cybersecurity + Executive Governance + Legal | L1/L2/L3/L4 | Mandatory-scope assessment and cybersecurity catalogue. | Mandatory only when entity is in NCA mandatory scope. |
| REG-IA-001 | Insurance Authority | Licensing framework for regulated insurance/intermediation/support activities. | Legal + Finance + Technology + Executive Governance | L1/L2/L3 | Insurance-role classifier and licence gate. | Only if HYDROLAND performs regulated insurance activity. |
| REG-MC-001 | Ministry of Commerce | Saudi E-Commerce Law and Executive Regulations govern applicable electronic sales/services. | Legal + Customer Experience + Finance + Technology | L1/L2/L3 | Pre-contract disclosures, transaction terms and consumer rights. | Applicable electronic commerce. |
| REG-TVTC-001 | Technical and Vocational Training Corporation | Private training establishment/programme framework. | Training + Legal + Executive Governance | L1/L2/L3 | Conditional training licence/programme gate. | Only if TVTC jurisdiction applies. |
| REG-ZATCA-001 | ZATCA | Electronic Invoicing Regulation and implementation framework. | Finance + Technology | L2/L3 | E-invoice compliance and integration evidence. | Subject taxpayer/transaction and Phase-2 scope. |

## Article-level hard-gate verification

| Control | Verified source detail | Enforcement candidate | Required system evidence |
|---|---|---|---|
| HARD-DIVE-001 | SWSDF Diving Regulations Article 6 requires applicable valid membership/licence from a Federation-approved/licensed diving organisation. | BLOCK | Credential issuer, number, validity/status, recognition status. |
| HARD-DIVE-002 | SWSDF Diving Regulations Article 7.1 requires applicable diving permit limited by place/time through a Federation-licensed diving centre; Article 7.2 assigns the centre the permit process with related authorities. | BLOCK | Dive permit ID, site/geofence, validity, licensed centre and related-authority evidence. |
| HARD-TRIP-001 | SWSDF Diving and Snorkeling Trips Regulations (2025) clauses 7.3–7.5 establish centre/trip-organisation and vessel registration/approval conditions for applicable diving marine-craft trips. | BLOCK | Centre licence/capability, Federation approval, vessel registration and marina evidence. |
| HARD-MANIFEST-001 | SWSDF trip regulation clauses 6.11.5–6.11.6 require participant verification and entry/exit records for the verified private-beach workflow. | BLOCK when applicable | Manifest, identity/credential match, entry/exit timestamps and responsible operator. |
| HARD-INCIDENT-001 | SWSDF trip regulation clause 6.11.7 requires immediate notification for applicable accident/emergency and detailed Federation report within 24 hours. | ESCALATE + deadline | Incident time, immediate-notification evidence, recipients, report and 24-hour deadline. |
| HARD-SAIL-001 | Official Border Guard sailing-permit service records permit purpose/type, period, sailing area, vessel and accompanying persons; applicable conditions include marine-craft driving licence and identity evidence. | BLOCK when applicable | Permit ID/type, dates, area, vessel, captain/driver licence and manifest. |
| HARD-ENV-001 | NCEC environmental-accident mechanism identifies pollution-related reportable triggers including spills/leaks, vessel incidents, fires/explosions and abnormal marine-environment indicators. | ESCALATE when trigger met | Trigger classification, location/time, affected medium, evidence and notification reference. |
| HARD-PDPL-001 | PDPL Executive Regulations Article 24(1): controller must notify the competent authority within no more than 72 hours from awareness of a personal-data breach when the incident may harm personal data/data subject or conflict with rights/interests. Article 24(2) allows missing required details to follow as soon as possible with justification; Article 24(3) requires retention of reports and corrective-action evidence. | ESCALATE + 72-hour deadline when statutory harm/rights trigger is met | Awareness timestamp, breach description/time/circumstances, data categories, approximate affected subjects/records, risks/impact, containment/corrective actions, competent-authority submission timestamp/reference, delayed-information justification and retained report/evidence. |
| HARD-PDPL-002 | PDPL Executive Regulations Article 24(5): controller must notify the affected data subject without undue delay when the breach may cause damage to their data or conflict with their rights/interests; notice must be clear and include breach description, potential risks/mitigation, controller/DPO contact and practical recommendations. | ESCALATE when data-subject notification trigger is met | Trigger assessment, affected-subject set, notice version/language, dispatch timestamp/channel, delivery status and contact/recommendation content. |
| HARD-ECOM-001 | Ministry of Commerce states the E-Commerce Law gives the consumer a right to terminate/return within 7 days where the product/service has not been used or benefited from, subject to statutory exceptions including identified service categories such as accommodation, transport and catering. | REFUND/REVIEW rule, not unconditional BLOCK | Contract/booking time, service/product category, use/benefit status, exception classification, cancellation request time, eligibility decision and refund transaction/reference. |
| HARD-ECOM-002 | Ministry of Commerce states the consumer may cancel when delivery/performance is delayed more than 15 days from contract/agreed date and recover amounts paid/costs resulting from delay, unless delay is due to force majeure. | ESCALATE + cancellation/refund workflow | Agreed performance date, actual/status timeline, delay duration, force-majeure assessment/evidence, cancellation request and refund/cost settlement evidence. |

### Hard-gate implementation rule

A `BLOCK` control may stop activation only when its applicability predicate is true. Missing applicability data routes to `REVIEW`. `ESCALATE` creates an immutable compliance/incident case with authority-specific deadline and evidence trail. Customer cancellation/refund rules use an eligibility decision engine because statutory exceptions and factual conditions matter; HYDROLAND must not auto-refund or auto-deny without evaluating those predicates.

For PDPL incidents, the 72-hour clock is anchored to the controller's awareness time, not merely the technical event timestamp. The platform must retain the authority report and corrective-action evidence and support supplemental information with a delay justification. Data-subject notification is a separate trigger from authority notification and must be evaluated independently.

## Operational-control mapping

- CMB-001 vessel licence gate — TGA classification/evidence dependent.
- CMB-002 sailing permit gate — HARD-SAIL-001 validates permit/trip matching when applicable.
- CMB-003 captain/safety assignment — captain/driver evidence mapped where applicable; safety-officer requirement remains source/activity dependent.
- CMB-004 diver credential gate — strengthened by HARD-DIVE-001; depth entitlement remains credential-framework dependent.
- CMB-005 safety briefing — authority/context specific; no invented universal statutory customer briefing.
- CMB-006 incident/escalation — SWSDF/NCEC/PDPL incidents now route to separate verified workflows and deadlines.
- Privacy incident gate — HARD-PDPL-001/002 creates two independent decisions: competent-authority notification and affected-data-subject notification.
- E-commerce cancellation/refund gate — HARD-ECOM-001/002 evaluates use/benefit, service category/exception, delay, agreed performance date and force majeure before refund/cancellation outcome.
- Dive permit remains distinct from Border Guard sailing permit.
- Insurance, training, NCA mandatory scope and product conformity remain applicability-driven.

## Required implementation fields

Each regulatory control stores authority, instrument, exact article/requirement, source URL/document version, effective date, applicability, owner, L1-L4 level, workflow, enforcement mode, evidence, audit/retention and verification status.

Hard operational fields additionally include applicability predicate/result, permit/credential scope and validity, vessel/captain/manifest, authority notification timestamps/references, statutory deadline and escalation status.

Privacy incident fields additionally include event timestamp, controller awareness timestamp, breach/data categories, affected-subject/record estimates, harm/rights assessment, containment/corrective actions, authority report, supplemental-information justification, data-subject notification trigger and dispatch evidence.

E-commerce consumer-rights fields additionally include contract/booking timestamp, service/product category, benefit/use state, statutory-exception classification, agreed/actual performance date, force-majeure assessment, cancellation/refund eligibility, refund amount/status/reference and decision evidence.

## Source registry

- Saudi Red Sea Authority; Transport General Authority; General Directorate of Border Guard / ZAWIL.
- MEWA / NCEC; NCW.
- Ministry of Tourism; Ministry of Sport; Saudi Water Sports and Diving Federation.
- MHRSD; Civil Defense; Balady; SASO.
- SDAIA / National Data Governance Platform — PDPL and Executive Regulations, including Article 24 breach notification.
- National Cybersecurity Authority — ECC 2:2024 and CCC-2:2024.
- Insurance Authority; Ministry of Commerce E-Commerce Law/Executive Regulations; TVTC; ZATCA.
- SWSDF Diving Regulations and Diving and Snorkeling Trips Regulations (2025).
- NCEC environmental accident reporting mechanism.

## Next verification batches

1. Product-level classification for diving cylinders, compressors, watercraft and PPE against exact SASO technical regulations.
2. Complete authority coverage audit against the 19-entity Saudi master list and identify source/version gaps.
3. Verify remaining hard-gate article details for vessel licensing/inspection, insurance obligations and facility activation.
4. After planning verification is complete, convert verified matrix rows into persisted compliance-control records, workflow gates, tests and CI validation.
