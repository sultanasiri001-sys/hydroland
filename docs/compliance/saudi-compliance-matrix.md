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
| REG-IA-001 | Insurance Authority | Insurance Authority licensing framework, under the Cooperative Insurance Companies Control Law and Authority mandate, regulates insurance/reinsurance, foreign branches, insurance/reinsurance brokers and agents, electronic insurance brokerage, and insurance support-service companies. | Legal + Finance + Technology + Executive Governance | L1/L2/L3 | Insurance-role classifier: distinguish merely recording/validating a customer's or vessel's insurance evidence from carrying on insurance, brokerage, agency or regulated support services; prevent enabling regulated insurance distribution/intermediation without a verified licence. | Only if HYDROLAND itself carries on a regulated insurance-sector activity; storing policy evidence does not by itself establish that status. |
| REG-IA-002 | Insurance Authority | Insurance Authority rules catalogue includes marine-insurance instructions and other product/activity-specific rules, while mandatory insurance obligations may arise from the separate regulator/activity instrument. | Legal + Marine Operations + Facilities/Assets | L2/L3 | Insurance evidence registry stores insurer, policy type/number, insured asset/activity, coverage dates and verification status; the required policy/coverage must be sourced from the controlling activity/vessel/facility rule before a hard BLOCK is used. | Policy/activity-specific; do not invent a universal mandatory marine/diving insurance requirement from Insurance Authority regulation alone. |
| REG-MC-001 | Ministry of Commerce | Saudi E-Commerce Law and its Executive Regulations govern electronic commerce and cover services provided electronically to consumers; Ministry guidance identifies consumer-protection and disclosure obligations for e-commerce. | Legal + Customer Experience + Finance + Technology | L1/L2/L3 | E-commerce seller/service-provider profile; pre-contract disclosure, service characteristics, total price/fees/taxes, payment/performance terms and applicable consumer-rights evidence; version transaction terms shown to the customer. | HYDROLAND electronic sales/bookings/services falling within the E-Commerce Law. |
| REG-MC-002 | Ministry of Commerce | Ministry of Commerce maintains an e-commerce compliance checklist and consumer legislation framework; discount campaigns are subject to the applicable Ministry licensing process. | Marketing + Legal + Customer Experience | L2/L3 | Promotion/discount workflow records advertised price, discount basis, campaign dates and licence evidence where required; marketing cannot publish a regulated discount campaign until applicability/licence status is resolved. | Applicable e-commerce promotion/discount activity. |
| REG-TVTC-001 | Technical and Vocational Training Corporation | TVTC regulates licensed private training establishments and approves their training programmes; in 2026 TVTC states that private-training programme applications are reviewed and approved under its controls. | Training + Legal + Executive Governance | L1/L2/L3 | Training-provider applicability classifier: if a HYDROLAND entity operates as a TVTC-regulated private training establishment, store establishment licence and programme approval/version before offering the regulated programme. | Conditional; only where the entity/programme falls within TVTC private-training jurisdiction. Diving certification governed by sport/diving authorities must not automatically be treated as TVTC-regulated without scope confirmation. |
| REG-ZATCA-001 | ZATCA | Electronic Invoicing Regulation and implementation framework. | Finance + Technology | L2/L3 | E-invoice compliance and integration evidence. | Subject taxpayer/transaction and Phase-2 notification scope. |

## Operational-control mapping

- CMB-001 vessel licence gate — TGA classification/evidence dependent.
- CMB-002 sailing permit gate — Border Guard/ZAWIL permit attributes must match trip.
- CMB-003 captain/safety assignment gate — captain/delegation mapped where applicable; safety-officer requirement remains source/activity dependent.
- CMB-004 diver certification/depth compatibility gate — recognised credential portion mapped to SWSDF; depth entitlement comes from verified credential framework.
- CMB-005 safety briefing gate — authority/context specific; no invented universal statutory customer briefing.
- CMB-006 incident/escalation gate — authority-specific notification triggers/timelines are encoded only after article-level verification.
- Insurance gate — store and verify insurance evidence where another applicable instrument requires it. Do not treat HYDROLAND as an insurer/intermediary unless its actual business model crosses REG-IA-001 licensing scope.
- E-commerce transaction gate — online bookings, courses, rentals and goods/services sales must retain the customer-facing disclosures/terms applicable under REG-MC-001.
- Training gate — SWSDF/sport-diving controls remain the primary diving-training layer; TVTC controls activate only after a positive private-training-jurisdiction assessment.
- Privacy-by-design and cloud/vendor gates — retain PDPL processing/transfer evidence; NCA mandatory scope is independently assessed.

## Required implementation fields

Each regulatory control should ultimately store: authority, instrument, exact article/requirement, source URL/document version, effective date, geography, activity/vessel/worker/facility/product/data/insurance/training applicability, owning department, L1-L4 level, system workflow, enforcement mode (INFO/REVIEW/BLOCK/ESCALATE), evidence type, retention/audit rule, and verification status.

Additional classification fields: insurance role (policy-holder/evidence-only/insurer/broker/agent/e-broker/support-service), e-commerce provider role, private-training-establishment status, programme approval status, controller/processor role, cross-border transfer status and NCA mandatory-scope decision.

## Source registry

- Saudi Red Sea Authority; Transport General Authority; General Directorate of Border Guard / ZAWIL.
- MEWA / NCEC; NCW.
- Ministry of Tourism; Ministry of Sport; Saudi Water Sports and Diving Federation.
- MHRSD; Civil Defense; Balady; SASO.
- SDAIA / National Data Governance Platform — PDPL framework.
- National Cybersecurity Authority — ECC 2:2024 and CCC-2:2024.
- Insurance Authority — licensing framework and official regulations catalogue, including marine-insurance instructions.
- Ministry of Commerce — E-Commerce Law, Executive Regulations, e-commerce compliance checklist and consumer legislation.
- Technical and Vocational Training Corporation — private-training regulation/programme-approval framework.
- ZATCA — Electronic Invoicing Regulation and implementation framework.

## Next verification batches

1. Article-level verification for hard BLOCK/ESCALATE controls: operational permits, insurance requirements, e-commerce consumer disclosures/cancellation/refunds, privacy/data-breach notification and incident reporting.
2. Product-level classification for diving cylinders, compressors, watercraft and PPE against exact SASO technical regulations.
3. Complete authority coverage audit against the 19-entity Saudi master list and identify any source/version gaps.
4. After planning verification is complete, convert verified matrix rows into persisted compliance-control records, workflow gates, tests and CI validation.