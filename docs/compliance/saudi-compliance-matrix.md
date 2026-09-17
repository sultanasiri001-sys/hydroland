# HYDROLAND — Saudi Compliance Matrix

Status: planning baseline. A control becomes **verified** only when tied to an official Saudi source and applicability is confirmed.

## Applicability rule

HYDROLAND operates across Saudi Arabia. Geographic and activity scope must be stored per control. SRSA controls apply only within their defined scope. Environmental/protected-area, labour, facility, municipal, product-conformity, privacy, cybersecurity, insurance, commerce and training controls are independently evaluated by their statutory scope. HYDROLAND must not be classified as an insurer/insurance intermediary or private training establishment merely because it stores insurance evidence or offers diving training; those regulated roles require separate applicability and licensing decisions.

## Verified official-source baseline

| Control | Authority | Official instrument / requirement | HYDROLAND owner | Level | System effect | Applicability |
|---|---|---|---|---|---|---|
| REG-SRSA-001 | Saudi Red Sea Authority | Maritime-tourism regulations and licensing framework. | Legal + Marine Operations | L1/L2 | Store licence/authority evidence and gate applicable regulated workflows. | Red Sea scope; exact activity applicability evaluated. |
| REG-TGA-001 | Transport General Authority | Ship/marine-unit registration and maritime-operation licensing framework. | Marine Operations + Facilities/Assets + Legal | L1/L2/L3 | Vessel evidence, validity and operation gates. | Vessel/activity classification dependent. |
| REG-BG-001 | General Directorate of Border Guard / ZAWIL | Sailing-permit and marine-activity authorisation services. | Marine Operations + Safety/Compliance | L2/L3 | Validate permit activity, validity, area, vessel and manifest. | Applicable sea-going activity. |
| REG-ENV-001 | MEWA / NCEC | Environmental Law and aquatic-environment pollution framework. | Safety/Compliance + Marine Operations + Facilities | L1/L2/L3 | Pollution-prevention, permit and corrective-action controls. | Applicable activity/environmental impact. |
| REG-NCW-001 | NCW | Protected-area and wildlife framework. | Marine Operations + Safety/Compliance + Legal | L1/L2/L3 | Protected-area geofence and activity-specific review. | Location/activity dependent. |
| REG-MT-001 | Ministry of Tourism | Saudi Tourism Law and licensing framework. | Legal + Customer Experience + Marine Operations | L1/L2 | Activity classification and applicable licence evidence. | Tourism-jurisdiction dependent. |
| REG-MOS-001 | Ministry of Sport | Sports Law framework. | Legal + Training + Executive Governance | L1/L2/L3 | Sport entity/activity/licence classification. | Exact sport activity/entity dependent. |
| REG-SWSDF-001 | Saudi Water Sports and Diving Federation | Diving regulations and centre controls. | Training + Marine Operations + Safety/Compliance + Legal | L1/L2/L3 | Credential, dive-permit and centre-service capability controls. | Applicable diving activity/entity. |
| REG-HRSD-001 | Ministry of Human Resources and Social Development | Labour Law Part VIII and OSH framework. | HR + Safety/Compliance + Legal | L1/L2/L3/L4 | Worker risk, PPE, fire-safety, assignment and conditional OSH governance controls. | Employment/activity/headcount dependent. |
| REG-CD-001 | General Directorate of Civil Defense | Fire-protection and activity/building safety regulations. | Safety/Compliance + Facilities/Assets | L1/L2/L3 | Facility/use classification, fire-safety evidence and corrective actions. | Premises/use dependent. |
| REG-MUN-001 | Ministry of Municipalities and Housing / Balady | Commercial activity and municipal requirement classification. | Legal + Facilities/Assets + Executive Governance | L1/L2 | Store activity/ISIC/licence evidence and gate centre activation where applicable. | Physical commercial activity/location dependent. |
| REG-SASO-001 | SASO | Mandatory technical regulations by product category. | Inventory/Procurement + Safety/Compliance + Legal | L1/L2/L3 | Product classifier and applicable conformity-evidence gate. | Product-specific. |
| REG-PDPL-001 | SDAIA / Competent Data Protection Authority | Personal Data Protection Law and Executive Regulations. | Technology + Legal + Executive Governance | L1/L2/L3/L4 | Data inventory, privacy governance, ROPA, transfer/DPO/applicability controls. | Personal-data processing within statutory scope. |
| REG-NCA-001 | National Cybersecurity Authority | ECC 2:2024 mandatory scope is limited by entity classification; other entities may adopt it as best practice. | Technology/Cybersecurity + Executive Governance + Legal | L1/L2/L3/L4 | Mandatory-scope assessment and cybersecurity control catalogue. | Mandatory only when entity falls within NCA scope. |
| REG-IA-001 | Insurance Authority | Licensing framework regulates insurance/reinsurance and licensed insurance intermediation/support activities. | Legal + Finance + Technology + Executive Governance | L1/L2/L3 | Insurance-role classifier; prevent regulated insurance distribution/intermediation without verified licence. | Only if HYDROLAND carries on a regulated insurance-sector activity. |
| REG-IA-002 | Insurance Authority | Marine-insurance and other product/activity-specific rules; mandatory insurance obligations may arise from another activity regulator. | Legal + Marine Operations + Facilities/Assets | L2/L3 | Insurance evidence registry; required coverage must be sourced from controlling instrument before hard BLOCK. | Policy/activity-specific. |
| REG-MC-001 | Ministry of Commerce | Saudi E-Commerce Law and Executive Regulations govern applicable electronic sales/services. | Legal + Customer Experience + Finance + Technology | L1/L2/L3 | Pre-contract disclosure, transaction terms and consumer-rights evidence. | Applicable HYDROLAND electronic commerce. |
| REG-MC-002 | Ministry of Commerce | E-commerce compliance/consumer framework and applicable promotion/discount licensing. | Marketing + Legal + Customer Experience | L2/L3 | Promotion/discount evidence and applicability workflow. | Applicable campaign/activity. |
| REG-TVTC-001 | Technical and Vocational Training Corporation | TVTC regulates licensed private training establishments and programme approvals. | Training + Legal + Executive Governance | L1/L2/L3 | Conditional private-training licence/programme approval gate. | Only where entity/programme falls within TVTC jurisdiction. |
| REG-ZATCA-001 | ZATCA | Electronic Invoicing Regulation and implementation framework. | Finance + Technology | L2/L3 | E-invoice compliance and integration evidence. | Subject taxpayer/transaction and Phase-2 notification scope. |

## Article-level hard-gate verification

| Control | Verified source detail | Enforcement candidate | Required system evidence |
|---|---|---|---|
| HARD-DIVE-001 | SWSDF Diving Regulations, Article 6: sports, technical or freediving requires a valid membership/licence from a diving organisation approved/licensed by the Federation. | BLOCK | Credential issuer, number, validity/status, recognised-organisation status. |
| HARD-DIVE-002 | SWSDF Diving Regulations, Article 7.1: diving in natural or artificial water requires a permit limited by place and time through a Federation-licensed diving centre. Article 7.2 assigns the centre the permit process in coordination with related authorities. | BLOCK | Dive permit ID, site/geofence, valid-from/to, licensed centre, related-authority evidence. |
| HARD-TRIP-001 | SWSDF Diving and Snorkeling Trips Regulations (2025), clause 7.3: only centres licensed by the Ministry and Federation and holding the trip-organisation activity are authorised to organise/advertise diving/snorkeling trips on diving marine craft; clauses 7.4–7.5 require Federation registration/approval and registration of diving marine craft for trip organisation. | BLOCK | Centre licence, trip-organisation capability, Federation approval, registered vessel and marina. |
| HARD-MANIFEST-001 | SWSDF Diving and Snorkeling Trips Regulations, clause 6.11.5–6.11.6: responsible private-beach operator/centre verifies participants and records diver/snorkeler water entry/exit times. | BLOCK for applicable private-beach workflow | Participant manifest, identity/credential match, entry/exit timestamps, responsible operator. |
| HARD-INCIDENT-001 | SWSDF Diving and Snorkeling Trips Regulations, clause 6.11.7: when an accident/emergency occurs during an applicable private-beach trip, the responsible entity must notify the Federation and related authorities immediately and submit a detailed report to the Federation within 24 hours. | ESCALATE + deadline | Incident timestamp, immediate-notification evidence, authority recipients, report, 24-hour deadline/status. |
| HARD-SAIL-001 | Official Border Guard sailing-permit service identifies diving among sailing-permit purposes and requires permit type, date/period, sailing areas, owner's available vessel, vessel details and accompanying persons; service conditions identify marine-craft driving licence and identity/residency/passport. | BLOCK when sailing permit applies | Permit ID/type, date range, sailing area, vessel ID, captain/driver licence, participant manifest and identity evidence. |
| HARD-ENV-001 | NCEC official environmental-accident reporting mechanism identifies reportable cases that caused or may cause pollution to air/water/soil, including harmful-material spills/leaks, vessel/tanker incidents, fires/explosions, marine colour change or marine-organism mortality. | ESCALATE when environmental trigger is met | Environmental trigger classification, location/time, media affected, evidence, NCEC notification status/reference. |

### Hard-gate implementation rule

A `BLOCK` control may stop activation only when its applicability predicate is true. Missing applicability data routes to `REVIEW`, not an invented statutory failure. `ESCALATE` creates an immutable incident/compliance case, authority-specific deadline and evidence trail. HYDROLAND must keep the SWSDF dive permit distinct from the Border Guard/ZAWIL sailing permit because they validate different regulatory conditions.

## Operational-control mapping

- CMB-001 vessel licence gate — TGA classification/evidence dependent.
- CMB-002 sailing permit gate — now strengthened by HARD-SAIL-001; permit activity/date/area/vessel/manifest must match the trip when applicable.
- CMB-003 captain/safety assignment gate — captain/driver evidence mapped where applicable; safety-officer requirement remains source/activity dependent.
- CMB-004 diver certification/depth compatibility gate — credential portion strengthened by HARD-DIVE-001; depth entitlement still comes from the verified credential framework, not a universal invented depth.
- CMB-005 safety briefing gate — authority/context specific; no invented universal statutory customer briefing.
- CMB-006 incident/escalation gate — now partially article-level mapped to HARD-INCIDENT-001 and HARD-ENV-001. Other incident types retain REVIEW until their exact authority trigger/deadline is verified.
- Dive-activation gate — HARD-DIVE-002 validates separate site/time-specific SWSDF permit evidence.
- Trip-organiser gate — HARD-TRIP-001 validates centre capability and registered diving marine craft before applicable trip activation.
- Manifest/accountability gate — HARD-MANIFEST-001 applies to the verified private-beach workflow and must not be generalised beyond its scope without another source.
- Insurance gate — store/verify insurance evidence only where another applicable instrument requires it.
- E-commerce transaction gate — online bookings/courses/rentals/sales retain applicable customer-facing disclosures/terms.
- Training gate — SWSDF/sport-diving controls remain primary; TVTC activates only after positive jurisdiction assessment.
- Privacy-by-design/cloud/vendor gates — retain PDPL evidence; NCA mandatory scope independently assessed.

## Required implementation fields

Each regulatory control should ultimately store: authority, instrument, exact article/requirement, source URL/document version, effective date, geography, activity/vessel/worker/facility/product/data/insurance/training applicability, owning department, L1-L4 level, system workflow, enforcement mode (INFO/REVIEW/BLOCK/ESCALATE), evidence type, retention/audit rule, and verification status.

Additional classification fields: insurance role, e-commerce provider role, private-training-establishment status, programme approval status, controller/processor role, cross-border transfer status and NCA mandatory-scope decision.

For hard operational gates additionally store: applicability predicate/result, permit/credential issuer, permit scope/site/area, valid-from/to, vessel, captain, participant manifest, centre capability, authority notification timestamp/reference, statutory deadline and escalation status.

## Source registry

- Saudi Red Sea Authority; Transport General Authority; General Directorate of Border Guard / ZAWIL.
- MEWA / NCEC; NCW.
- Ministry of Tourism; Ministry of Sport; Saudi Water Sports and Diving Federation.
- MHRSD; Civil Defense; Balady; SASO.
- SDAIA / National Data Governance Platform — PDPL framework.
- National Cybersecurity Authority — ECC 2:2024 and CCC-2:2024.
- Insurance Authority — licensing framework and official regulations catalogue.
- Ministry of Commerce — E-Commerce Law and consumer framework.
- Technical and Vocational Training Corporation — private-training framework.
- ZATCA — Electronic Invoicing Regulation and implementation framework.
- SWSDF — Diving Regulations, Articles 6–7; Diving and Snorkeling Trips Regulations (2025), clauses 6.11.5–6.11.7 and 7.3–7.5.
- General Directorate of Border Guard — official ZAWIL sailing-permit service description.
- NCEC — official environmental accidents and violations reporting mechanism.

## Next verification batches

1. Article-level PDPL data-breach notification and e-commerce cancellation/refund controls.
2. Product-level classification for diving cylinders, compressors, watercraft and PPE against exact SASO technical regulations.
3. Complete authority coverage audit against the 19-entity Saudi master list and identify source/version gaps.
4. After planning verification is complete, convert verified matrix rows into persisted compliance-control records, workflow gates, tests and CI validation.