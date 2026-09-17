# HYDROLAND — Saudi Compliance Matrix

Status: planning baseline. A control becomes **verified** only when tied to an official Saudi source and applicability is confirmed.

## Applicability rule

HYDROLAND operates across Saudi Arabia. Geographic and activity scope must be stored per control. SRSA controls apply only within their defined scope. Environmental/protected-area, labour, facility, municipal, product-conformity, privacy and cybersecurity controls are independently evaluated by their own statutory scope. PDPL applies to personal-data processing within its statutory scope. NCA ECC mandatory scope must not be assumed for an ordinary private platform: applicability depends on whether the entity falls within the ECC scope (government/affiliates or private entities owning, operating or hosting Critical National Infrastructure), while other entities are strongly encouraged to use ECC as best practice.

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
| REG-PDPL-001 | SDAIA / Competent Data Protection Authority | Personal Data Protection Law Article 2 applies to processing of personal data relating to individuals carried out in the Kingdom, including processing relating to individuals residing in the Kingdom by entities outside the Kingdom, subject to statutory exceptions. | Technology + Legal + Executive Governance | L1/L2/L3 | Personal-data inventory; controller/processor classification; processing-purpose and lawful-basis workflow; prohibit treating platform data as outside PDPL merely because a processor/cloud service is external. | Personal-data processing within Article 2 scope. |
| REG-PDPL-002 | SDAIA / Competent Data Protection Authority | PDPL requires controller privacy governance, including making a privacy policy available when personal data is collected; the Executive Regulations provide the operational framework. | Legal + Technology + Customer Experience | L1/L2/L3 | Versioned privacy notice/policy, collection-point notice linkage, processing-purpose register, consent/lawful-basis evidence where applicable and audit history. | HYDROLAND acting as controller for personal data. |
| REG-PDPL-003 | SDAIA / Competent Data Protection Authority | PDPL Article 31 and Executive Regulations Article 33 establish requirements concerning records of personal-data processing activities. | Technology + Legal + Executive Governance | L2/L3/L4 | Maintain versioned Records of Processing Activities (ROPA): data categories, purposes, parties/processors, systems, retention/transfer metadata and evidence of review. | Controller processing activities subject to the statutory requirement. |
| REG-PDPL-004 | SDAIA / Competent Data Protection Authority | PDPL framework includes specific rules for transfers/disclosure of personal data outside the Kingdom; SDAIA publishes the Regulation on Personal Data Transfer Outside the Kingdom. | Technology + Legal + Procurement | L2/L3 | Cloud/vendor data-flow register, hosting/processing location, cross-border transfer assessment and approval evidence before enabling an applicable transfer. | Only where personal data is transferred/disclosed outside the Kingdom or an external processing arrangement triggers the rules. |
| REG-PDPL-005 | SDAIA / Competent Data Protection Authority | SDAIA has issued Rules for Appointing a Personal Data Protection Officer pursuant to PDPL Article 30(2) and Executive Regulations Article 32(4). | Executive Governance + Legal + Technology | L1/L3/L4 | DPO applicability assessment; if triggered, record appointment, independence/contact details, responsibilities and review evidence. | Conditional; appointment must be determined using the official rules, not assumed for every private controller. |
| REG-PDPL-006 | SDAIA | National Data Governance Platform provides registration for private controllers and describes the national unified register for controllers processing personal data in the Kingdom. | Legal + Executive Governance | L1/L2 | Controller-registration applicability/status/evidence record and authorised representative workflow. | Apply according to current SDAIA registration requirements and controller status. |
| REG-NCA-001 | National Cybersecurity Authority | Essential Cybersecurity Controls ECC 2:2024 apply mandatorily to Saudi government entities and affiliates and private entities that own, operate or host Critical National Infrastructure; other Saudi entities are strongly encouraged to benefit from them as cybersecurity best practice. | Technology/Cybersecurity + Executive Governance + Legal | L1/L4 | Mandatory-scope assessment first. If in scope, activate ECC compliance programme; if not, maintain ECC as a best-practice baseline without falsely labelling it statutory. | Mandatory only when HYDROLAND/entity falls within ECC scope; otherwise recommended baseline. |
| REG-NCA-002 | National Cybersecurity Authority | ECC 2:2024 contains four main domains covering cybersecurity governance, cybersecurity defense, cybersecurity resilience, and third-party/cloud cybersecurity. | Technology/Cybersecurity + Executive Governance | L1/L2/L3/L4 | Cybersecurity control catalogue, owner/evidence mapping, risk/exceptions, incident/resilience controls, third-party/cloud reviews and periodic compliance assessment. | Mandatory when REG-NCA-001 scope test is met; otherwise adopted according to HYDROLAND governance decision. |
| REG-NCA-003 | National Cybersecurity Authority | Cloud Cybersecurity Controls CCC-2:2024 extend/complement ECC and define cybersecurity requirements from cloud service provider and cloud subscriber perspectives. | Technology/Cybersecurity + Procurement + Legal | L2/L3/L4 | Cloud-provider/subscriber classification, cloud due diligence, contract/security evidence, hosting architecture record and periodic supplier review. | Apply according to NCA scope and cloud role/service; where not mandatory, may be retained as best-practice control set. |
| REG-ZATCA-001 | ZATCA | Electronic Invoicing Regulation and implementation framework. | Finance + Technology | L2/L3 | E-invoice compliance and integration evidence. | Subject taxpayer/transaction and Phase-2 notification scope. |

## Operational-control mapping

- CMB-001 vessel licence gate — TGA classification/evidence dependent.
- CMB-002 sailing permit gate — Border Guard/ZAWIL permit attributes must match trip.
- CMB-003 captain/safety assignment gate — captain/delegation mapped where applicable; safety-officer requirement remains source/activity dependent.
- CMB-004 diver certification/depth compatibility gate — recognised credential portion mapped to SWSDF; depth entitlement comes from verified credential framework.
- CMB-005 safety briefing gate — environmental/protected-area and worker-awareness content is authority/context specific; no invented universal statutory customer briefing.
- CMB-006 incident/escalation gate — environmental, worker, privacy/data and cybersecurity incidents must route to separate authority-specific workflows; exact statutory notification triggers/timelines are encoded only after article-level verification.
- Privacy-by-design gate — new user/profile/booking/training/employee/vendor features that collect personal data must identify purpose, data categories, controller/processor role, retention and sharing/transfer before production activation.
- Cloud/vendor gate — vendors processing HYDROLAND personal data must be recorded as processors/recipients as applicable, with location/cross-border assessment and contract/security evidence.
- Cybersecurity applicability gate — HYDROLAND must never mark NCA ECC as legally mandatory merely because it is a Saudi platform; first determine whether the operating entity is within ECC mandatory scope.

## Required implementation fields

Each regulatory control should ultimately store: authority, instrument, exact article/requirement, source URL/document version, effective date, geography, activity/vessel/worker/facility/product/data applicability, owning department, L1-L4 level, system workflow, enforcement mode (INFO/REVIEW/BLOCK/ESCALATE), evidence type, retention/audit rule, and verification status.

For privacy/cybersecurity also store: controller/processor role, processing purpose/lawful basis, personal-data categories, sensitive-data flag, retention rule, recipient/vendor, hosting/processing country, cross-border transfer basis/status, security-control owner, incident classification, and NCA mandatory-scope decision.

## Source registry

- Saudi Red Sea Authority official regulations.
- Transport General Authority maritime regulations.
- General Directorate of Border Guard / Ministry of Interior ZAWIL and marine-activities information.
- MEWA / NCEC environmental framework; NCW protected-area framework.
- Ministry of Tourism; Ministry of Sport; Saudi Water Sports and Diving Federation.
- MHRSD Labour Law and OSH framework; Civil Defense; Balady; SASO technical regulations.
- SDAIA / National Data Governance Platform — Personal Data Protection Law, Executive Regulations, Regulation on Personal Data Transfer Outside the Kingdom, controller/processor guidance, ROPA guidance and DPO appointment rules.
- National Cybersecurity Authority — Essential Cybersecurity Controls ECC 2:2024 and Cloud Cybersecurity Controls CCC-2:2024.
- ZATCA — Electronic Invoicing Regulation and implementation framework.

## Next verification batches

1. Insurance Authority and insurance applicability.
2. Ministry of Commerce and TVTC applicability to HYDROLAND entity/services/training.
3. Article-level verification for controls that will become hard BLOCK/ESCALATE rules, including privacy/data-breach timelines, incident notification, product-level classification and operational permits.
4. After planning verification is complete, convert the verified matrix into persisted compliance-control records, workflow gates, tests and CI validation.