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
| HARD-PDPL-001 | PDPL Executive Regulations Article 24(1): controller must notify the competent authority within no more than 72 hours from awareness of a personal-data breach when the incident may harm personal data/data subject or conflict with rights/interests. | ESCALATE + 72-hour deadline when trigger met | Awareness timestamp, breach details, risks/impact, corrective actions, submission reference and retained evidence. |
| HARD-PDPL-002 | PDPL Executive Regulations Article 24(5): controller must notify affected data subjects without undue delay when the statutory trigger is met. | ESCALATE when trigger met | Trigger assessment, affected subjects, notice and dispatch/delivery evidence. |
| HARD-ECOM-001 | E-Commerce consumer termination/return right is conditional on statutory predicates/exceptions. | REFUND/REVIEW | Contract time, category, use/benefit state, exception and refund evidence. |
| HARD-ECOM-002 | Consumer cancellation/refund workflow for qualifying delayed performance is applicability/force-majeure dependent. | ESCALATE + refund workflow | Agreed date, delay, force-majeure assessment and settlement evidence. |

## SASO product-level classification

| Control | Product class | Verified SASO instrument/detail | Candidate enforcement | HYDROLAND evidence |
|---|---|---|---|---|
| HARD-SASO-CYL-001 | Diving breathing-gas cylinder / pressure assembly | SASO's mechanical technical-regulation catalogue includes the Technical Regulation for Pressure Equipment and the Technical Regulation for Simple Pressure Vessels; SASO's pressure-vessels technical team explicitly covers gas cylinders and their accessories. Exact cylinder classification must be resolved against pressure, volume, medium and product definition before selecting the applicable regulation/conformity path. | REVIEW -> BLOCK only after product classification confirms applicable mandatory conformity requirement | Manufacturer/model/serial, cylinder material, working/test pressure, water capacity, gas/service, manufacture date, applicable regulation/standard, conformity certificate/declaration, inspection/test evidence and status. |
| HARD-SASO-COMP-001 | Diving air compressor | SASO Technical Regulation for General Requirements for Safety of Machinery includes GSO EN 1012-1, Compressors and vacuum pumps — Safety requirements — Part 1: Air compressors, in its standards list. Compressor machinery therefore requires machine/product classification and applicable conformity evidence; pressure-containing components may also require a separate pressure-equipment assessment. | REVIEW -> BLOCK for procurement/commissioning when applicable conformity is confirmed | Manufacturer/model/serial, machine classification, rated pressure/flow, applicable standard/regulation, conformity evidence, manuals, commissioning/maintenance record and pressure-component classification. |
| HARD-SASO-BOAT-001 | Watercraft / recreational craft product | SASO publishes a dedicated Technical Regulation for Watercraft, adopted 06 Apr 2023 and published 19 May 2023. This is a product-conformity layer and does not replace TGA registration/licensing, Border Guard sailing permits or SWSDF trip-vessel controls. | REVIEW -> BLOCK at procurement/import/asset acceptance when watercraft regulation applies | Craft manufacturer/model/HIN or serial, category/use, conformity evidence, technical file, owner/asset record; separate TGA/BG/SWSDF operational evidence remains mandatory when applicable. |
| HARD-SASO-PPE-001 | Personal protective equipment and clothing | SASO Technical Regulation for Personal Protective Equipment and Clothing establishes essential health/safety and conformity requirements for products within its scope; Article 5 places technical, instructions and conformity obligations on suppliers. Diving equipment must not be automatically labelled PPE unless the exact product falls within the regulation's product scope. | REVIEW -> BLOCK for regulated PPE lacking required conformity evidence | Product type/category, intended protective function/risk, supplier, model/batch, applicable standard, conformity certificate/declaration, Arabic/user instructions where required and procurement acceptance status. |

### SASO implementation rule

SASO controls are product-conformity controls, not substitutes for operational licences. HYDROLAND must first classify the exact SKU/asset, then attach all applicable regulations because one assembly may cross more than one technical regime. A diving compressor can involve machinery-safety and pressure-equipment controls; a boat can require SASO product conformity plus TGA, Border Guard and SWSDF operational evidence. Unclassified equipment routes to `REVIEW`, not an automatic legal `BLOCK`.

## Operational-control mapping

- CMB-001 vessel licence gate — TGA classification/evidence dependent; SASO watercraft conformity is a separate asset/product layer.
- CMB-002 sailing permit gate — HARD-SAIL-001 validates permit/trip matching when applicable.
- CMB-003 captain/safety assignment — captain/driver evidence mapped where applicable.
- CMB-004 diver credential gate — strengthened by HARD-DIVE-001; depth entitlement remains credential-framework dependent.
- CMB-005 safety briefing — authority/context specific; no invented universal statutory customer briefing.
- CMB-006 incident/escalation — SWSDF/NCEC/PDPL incidents route to separate verified workflows/deadlines.
- Equipment procurement/commissioning gate — HARD-SASO-CYL/COMP/BOAT/PPE controls require exact product classification before a mandatory conformity `BLOCK` is activated.
- Privacy incident and e-commerce cancellation/refund gates retain their independently verified predicates.

## Required implementation fields

Each regulatory control stores authority, instrument, exact article/requirement, source URL/document version, effective date, applicability, owner, L1-L4 level, workflow, enforcement mode, evidence, audit/retention and verification status.

Product conformity additionally stores product/SKU class, manufacturer, model, serial/batch/HIN, intended use, pressure/volume/medium where relevant, applicable SASO regulation/standard, conformity route/certificate/declaration, technical file/manuals, inspection/test/commissioning evidence, supplier/importer and classification decision/version.

## Source registry

- Saudi Red Sea Authority; Transport General Authority; General Directorate of Border Guard / ZAWIL.
- MEWA / NCEC; NCW.
- Ministry of Tourism; Ministry of Sport; Saudi Water Sports and Diving Federation.
- MHRSD; Civil Defense; Balady.
- SASO — technical-regulation catalogue; Technical Regulation for Pressure Equipment; Technical Regulation for Simple Pressure Vessels; Technical Regulation for General Requirements for Safety of Machinery; Technical Regulation for Watercraft; Technical Regulation for Personal Protective Equipment and Clothing; pressure-vessels technical-team scope.
- SDAIA / National Data Governance Platform — PDPL and Executive Regulations.
- National Cybersecurity Authority — ECC 2:2024 and CCC-2:2024.
- Insurance Authority; Ministry of Commerce; TVTC; ZATCA.

## Next verification batches

1. Complete authority coverage audit against the 19-entity Saudi master list and identify source/version gaps.
2. Verify remaining hard-gate article details for vessel licensing/inspection, insurance obligations and facility activation.
3. Resolve exact SASO conformity paths for actual equipment SKUs when manufacturer/model data is available.
4. After planning verification is complete, convert verified matrix rows into persisted compliance-control records, workflow gates, tests and CI validation.
