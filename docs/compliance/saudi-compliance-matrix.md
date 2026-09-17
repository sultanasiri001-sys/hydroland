# HYDROLAND — Saudi Compliance Matrix

Status: planning baseline. A control becomes **verified** only when tied to an official Saudi source and applicability is confirmed.

## Applicability rule

HYDROLAND operates across Saudi Arabia. Geographic and activity scope must be stored per control. Regulatory controls are independently evaluated by statutory scope. A hard gate is enabled only when its applicability predicate is true; uncertainty routes to REVIEW rather than an invented legal failure.

## Saudi 19-authority master coverage audit

| # | Authority | Coverage | HYDROLAND applicability |
|---|---|---|---|
| 1 | Ministry of Sport | COVERED | Sports/diving entity and activity classification. |
| 2 | Ministry of Tourism | COVERED | Tourism-service/activity classification where applicable. |
| 3 | Saudi Water Sports and Diving Federation (SWSDF) | COVERED + ARTICLE LEVEL | Diving credentials, permits, centres, trips, vessels and incident workflows. |
| 4 | Saudi Red Sea Authority (SRSA) | COVERED | Coastal/maritime tourism within the Authority's statutory geographic/activity scope; not a Kingdom-wide blanket rule. |
| 5 | Transport General Authority (TGA) | COVERED; HARDENING PENDING | Marine-unit registration/licensing/inspection classification. Exact hard-gate articles remain to be verified. |
| 6 | General Directorate of Border Guard / ZAWIL | COVERED + HARD GATE | Sailing permit/activity/area/vessel/manifest evidence. Border Guard officially administers marine-activity coordination including diving and marine sports. |
| 7 | Ministry of Environment, Water and Agriculture (MEWA) | COVERED | Environmental/aquatic framework as applicable. |
| 8 | National Center for Environmental Compliance (NCEC) | COVERED + INCIDENT GATE | Environmental impact/compliance and pollution-incident escalation. |
| 9 | National Center for Wildlife (NCW) | COVERED | Protected areas/wildlife/geofence activity review. |
| 10 | Ministry of Commerce | COVERED + ARTICLE-LEVEL CONSUMER FLOW | E-commerce, consumer disclosures, cancellation/refund and promotions as applicable. |
| 11 | ZATCA | COVERED | Tax/e-invoicing according to taxpayer, transaction and integration-wave scope. |
| 12 | MHRSD | COVERED + ARTICLE LEVEL | Labour/OSH/worker safety; headcount/activity-specific OSH rules remain conditional. |
| 13 | TVTC | COVERED — CONDITIONAL | Activates only if entity/programme falls within private-training jurisdiction; recreational diving training is not automatically classified as TVTC-regulated. |
| 14 | General Directorate of Civil Defense | COVERED; HARDENING PENDING | Facility/fire-life-safety classification and evidence; exact facility activation rule depends on premises/use. |
| 15 | Ministry of Municipalities and Housing / Balady | COVERED; HARDENING PENDING | Municipal/commercial activity licence according to location/activity/ISIC. |
| 16 | SASO | COVERED + PRODUCT CLASSIFICATION | Cylinders/pressure equipment, compressors/machinery, watercraft and PPE are SKU/product-class dependent. |
| 17 | SDAIA / competent data-protection authority | COVERED + ARTICLE LEVEL | PDPL governance, ROPA, transfers, DPO applicability and breach notification. |
| 18 | National Cybersecurity Authority (NCA) | COVERED — CONDITIONAL | ECC/CCC mandatory scope must be assessed; do not label mandatory for an ordinary private platform without scope trigger. |
| 19 | Insurance Authority | COVERED — CONDITIONAL; HARDENING PENDING | Insurance-role/licensing classifier; activity-specific mandatory insurance must be sourced from the controlling activity regulator/instrument. |

Coverage result: **19/19 master authorities represented in the planning matrix.** This does not mean every row is production-ready. TGA vessel licensing/inspection, Civil Defense/municipal facility activation and activity-specific insurance obligations remain article-level hardening items before they may become statutory BLOCK controls.

The official Saudi Red Sea Authority framework confirms that its remit is tied to maritime/coastal tourism and defined geographic/activity scope. The official Border Guard marine-activities function coordinates licensing/regulation for marine activities including marine sports and diving. Ministry of Sport/SWSDF remain a specific diving/sport layer; their presence does not collapse the independent mandates of TGA, Border Guard, SRSA, environment, municipal or other authorities.

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
| HARD-PDPL-001 | PDPL Executive Regulations Article 24(1): controller must notify the competent authority within no more than 72 hours from awareness of a personal-data breach when the statutory trigger is met. | ESCALATE + 72-hour deadline | Awareness timestamp, breach details, risks/impact, corrective actions, submission reference and retained evidence. |
| HARD-PDPL-002 | PDPL Executive Regulations Article 24(5): controller must notify affected data subjects without undue delay when the statutory trigger is met. | ESCALATE when trigger met | Trigger assessment, affected subjects, notice and dispatch/delivery evidence. |
| HARD-ECOM-001 | E-Commerce consumer termination/return right is conditional on statutory predicates/exceptions. | REFUND/REVIEW | Contract time, category, use/benefit state, exception and refund evidence. |
| HARD-ECOM-002 | Consumer cancellation/refund workflow for qualifying delayed performance is applicability/force-majeure dependent. | ESCALATE + refund workflow | Agreed date, delay, force-majeure assessment and settlement evidence. |

## SASO product-level classification

| Control | Product class | Verified SASO instrument/detail | Candidate enforcement | HYDROLAND evidence |
|---|---|---|---|---|
| HARD-SASO-CYL-001 | Diving breathing-gas cylinder / pressure assembly | Pressure-equipment/simple-pressure-vessel catalogue; gas-cylinder classification must be resolved against exact product parameters. | REVIEW -> BLOCK after classification | Manufacturer/model/serial, pressure/capacity/gas, manufacture date, regulation/standard, conformity and inspection/test evidence. |
| HARD-SASO-COMP-001 | Diving air compressor | Machinery-safety framework includes air-compressor safety standard; pressure components assessed separately where applicable. | REVIEW -> BLOCK after classification | Model/serial, pressure/flow, standard/regulation, conformity, manuals, commissioning/maintenance and pressure-component decision. |
| HARD-SASO-BOAT-001 | Watercraft / recreational craft product | Dedicated SASO Technical Regulation for Watercraft; separate from operational TGA/BG/SWSDF evidence. | REVIEW -> BLOCK at procurement/import/asset acceptance when applicable | Manufacturer/model/HIN, category/use, conformity and technical file; separate operational evidence. |
| HARD-SASO-PPE-001 | Personal protective equipment and clothing | SASO PPE technical regulation applies only to products within its scope; diving equipment is not automatically PPE. | REVIEW -> BLOCK when classified as regulated PPE | Product/risk class, supplier/model/batch, standard, conformity and instructions. |

### SASO implementation rule

SASO controls are product-conformity controls, not substitutes for operational licences. HYDROLAND first classifies the exact SKU/asset and then attaches all applicable technical regimes. Unclassified equipment routes to REVIEW.

## Operational-control mapping

- CMB-001 vessel licence gate — TGA classification/evidence dependent; SASO conformity is a separate product layer.
- CMB-002 sailing permit gate — HARD-SAIL-001 validates permit/trip matching when applicable.
- CMB-003 captain/safety assignment — captain/driver evidence mapped where applicable.
- CMB-004 diver credential gate — strengthened by HARD-DIVE-001; depth entitlement remains credential-framework dependent.
- CMB-005 safety briefing — authority/context specific; no invented universal statutory customer briefing.
- CMB-006 incident/escalation — SWSDF/NCEC/PDPL incidents route to separate verified workflows/deadlines.
- Equipment procurement/commissioning gate — SASO product controls require exact product classification before mandatory conformity BLOCK.
- Privacy incident and e-commerce cancellation/refund gates retain independently verified predicates.

## Required implementation fields

Each regulatory control stores authority, instrument, exact article/requirement, source URL/document version, effective date, applicability, owner, L1-L4 level, workflow, enforcement mode, evidence, audit/retention and verification status.

Product conformity additionally stores product/SKU class, manufacturer, model, serial/batch/HIN, intended use, pressure/volume/medium where relevant, applicable SASO regulation/standard, conformity route/certificate/declaration, technical file/manuals, inspection/test/commissioning evidence, supplier/importer and classification decision/version.

## Source registry

- Saudi Red Sea Authority; Transport General Authority; General Directorate of Border Guard / ZAWIL.
- MEWA / NCEC; NCW.
- Ministry of Tourism; Ministry of Sport; Saudi Water Sports and Diving Federation.
- MHRSD; Civil Defense; Ministry of Municipalities and Housing / Balady.
- SASO technical regulations and product conformity framework.
- SDAIA / National Data Governance Platform — PDPL and Executive Regulations.
- National Cybersecurity Authority — ECC 2:2024 and CCC-2:2024.
- Insurance Authority; Ministry of Commerce; TVTC; ZATCA.

## Next verification batches

1. Verify remaining hard-gate article details for TGA vessel registration/licensing/inspection and operator classification.
2. Verify Civil Defense + Balady facility activation requirements by actual HYDROLAND centre/activity classification.
3. Verify activity-specific mandatory insurance requirements and distinguish them from Insurance Authority licensing rules.
4. Resolve exact SASO conformity paths for actual equipment SKUs when manufacturer/model data is available.
5. After article-level planning hardening, convert verified rows into persisted compliance-control records, workflow gates, tests and CI validation.
