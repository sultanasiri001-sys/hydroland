# HYDROLAND — Saudi Compliance Matrix

Status: planning baseline. A control becomes **verified** only when tied to an official Saudi source and applicability is confirmed.

## Applicability rule

HYDROLAND operates across Saudi Arabia. Geographic and activity scope must be stored per control. SRSA controls apply only within their defined scope. Environmental and protected-area controls are evaluated independently for each trip location/activity.

## Verified official-source baseline

| Control | Authority | Official instrument / requirement | HYDROLAND owner | Level | System effect | Applicability |
|---|---|---|---|---|---|---|
| REG-SRSA-001 | Saudi Red Sea Authority | Maritime Tourism Agent Regulations define licensed maritime-tourism activity within the Red Sea geographical scope. | Legal + Marine Operations | L1/L2 | Store licence/authority evidence and gate applicable regulated workflows. | Red Sea scope; exact activity applicability must be evaluated. |
| REG-SRSA-002 | Saudi Red Sea Authority | Marina Design and Operation Regulations define an operation licence for marina operators and a Red Sea geographical scope. | Facilities + Legal + Marine Operations | L1/L2 | Licence/evidence registry and expiry gate. | Red Sea scope; marina activity only. |
| REG-SRSA-003 | Saudi Red Sea Authority | Tourist Navigation Agent Regulations include environmental-protection, pollution-prevention, security/safety and related-authority compliance obligations. | Safety/Compliance + Marine Operations | L2/L3 | Environmental/safety checklist, exception escalation and evidence trail. | Red Sea scope and applicable regulated activity. |
| REG-TGA-001 | Transport General Authority | Ship Registration and Marine Unit Recording Regulation provides for registration/recording of ships and marine units. | Marine Operations + Facilities/Assets + Legal | L1/L2 | Vessel record stores registration evidence, validity and status. | According to vessel/unit classification and regulatory scope. |
| REG-TGA-002 | Transport General Authority | Regulation for Maritime Transport Operations provides licensing framework including navigation/work licensing according to vessel/activity. | Marine Operations + Legal | L1/L2/L3 | Store licence type/status/expiry and gate applicable operation. | Applicable vessel/activity/licence category only. |
| REG-TGA-003 | Transport General Authority | Executive regulation for inspection/survey of small ships not subject to international conventions applies survey requirements according to vessel size, tonnage and activity. | Safety/Compliance + Marine Operations + Facilities/Assets | L2/L3 | Survey/certificate evidence and corrective-action workflow. | Applicable small ship/marine unit. |
| REG-BG-001 | General Directorate of Border Guard / ZAWIL | Government service documentation identifies ZAWIL sailing permits for purposes including diving, fishing, recreation and marine sports. | Marine Operations + Safety/Compliance | L2/L3 | Validate permit type, validity, area, vessel and manifest before applicable departure. | Sea-going activity requiring the permit. |
| REG-BG-002 | General Directorate of Border Guard / ZAWIL | Sailing-permit workflow records permit type, sailing period/area, vessel and accompanying persons. | Marine Operations + Legal + Safety/Compliance | L2/L3 | Compare trip manifest and voyage attributes with permit evidence. | Relevant applicant/vessel/activity. |
| REG-BG-003 | General Directorate of Border Guard | Ministry of Interior information identifies marine-craft command delegation and sailing-permit services and marine-activity safety coordination. | Marine Operations + HR + Safety/Compliance | L1/L2/L3 | Captain/delegation evidence and assignment validation. | Where delegation/authorisation is required. |
| REG-ENV-001 | MEWA / NCEC | Environmental Law executive regulation for protection of aquatic environments from pollution applies across the Kingdom to persons and activities related to aquatic environments. | Safety/Compliance + Marine Operations + Facilities | L1/L2/L3 | Add pollution-prevention control set to marine trips/facilities; environmental exceptions cannot be silently marked compliant. | Kingdom-wide where the activity relates to aquatic environments. |
| REG-ENV-002 | NCEC | Aquatic-environment regulation provides for environmental permits/licences for works or activities with environmental effects and compliance with permit conditions. | Legal + Safety/Compliance + Facilities | L1/L2/L3 | Environmental permit/evidence registry, applicability decision, expiry/condition tracking and BLOCK/review when a required permit is absent or invalid. | Only activities/projects for which an environmental permit/licence is required. |
| REG-ENV-003 | NCEC | Official environmental framework includes inspection, monitoring, environmental assessment and enforcement functions for activities with environmental impact. | Safety/Compliance + Executive Governance | L3/L4 | Inspection findings, corrective actions, evidence retention, escalation and compliance KPI dashboard. | Applicable regulated facilities/projects/activities. |
| REG-NCW-001 | NCW | Environmental Law protected-areas framework and the executive regulation for protected areas govern protected-area conservation and activities within protected areas. | Marine Operations + Safety/Compliance + Legal | L1/L2/L3 | Geofence every trip/site against protected-area registry; require activity-specific applicability/approval evidence before readiness is granted. | Only when trip/site intersects or affects an applicable protected area. |
| REG-NCW-002 | NCW | NCW officially identifies marine protected areas including Farasan Islands, Al Jubail Marine Wildlife Sanctuary, Blue Holes and Ras Hatibah, among others. | Marine Operations + Technology/GIS + Safety/Compliance | L2/L3 | Protected-area GIS flag, route/site warning and compliance review before booking/activation. | Location dependent; registry must be versioned because protected-area boundaries/status can change. |
| REG-NCW-003 | NCW | NCW describes organised low-impact marine/ecotourism experiences in protected areas and maintains regulations including protected areas, wildlife protection and marine/coastal environment management. | Marine Operations + Customer Experience + Safety/Compliance | L2/L3 | Activity profile stores ecological restrictions/conditions; briefing and operating checklist can be specialised by protected area and activity. | Apply only after exact area/activity conditions are confirmed from the controlling instrument/permit. |
| REG-ZATCA-001 | ZATCA | Electronic Invoicing Regulation requires electronic issuance/storage for subject taxpayers. | Finance + Technology | L2/L3 | E-invoice compliance gate, invoice evidence and validation/error queue. | Subject taxpayer / transaction scope. |
| REG-ZATCA-002 | ZATCA | Phase 2 integration is applied in waves to notified target groups. | Finance + Technology | L2/L3 | Feature flag by taxpayer applicability and integration evidence. | Only when entity is notified/in scope. |

## Operational-control mapping

- CMB-001 vessel licence gate — partially mapped to REG-TGA-001/002; vessel classification determines required evidence.
- CMB-002 sailing permit gate — mapped to REG-BG-001/002; validate permit attributes against the trip.
- CMB-003 captain/safety assignment gate — captain/delegation portion partially mapped to REG-BG-003; separate safety-officer requirement remains source/activity dependent.
- CMB-004 diver certification/depth compatibility gate — awaiting exact Saudi authority/source mapping; international training standards remain reference-only unless incorporated by an applicable Saudi rule/licence condition.
- CMB-005 safety briefing gate — environmental/protected-area content can be driven by REG-ENV/REG-NCW controls, but a universal statutory briefing requirement is not asserted yet.
- CMB-006 incident report/escalation gate — environmental incidents can route into NCEC-related compliance/corrective-action workflow; exact mandatory notification triggers/timelines require article-level mapping before hard BLOCK/escalation rules are encoded.

## Required implementation fields

Each regulatory control should ultimately store: authority, instrument, exact article/requirement, source URL/document version, effective date, geography, activity/vessel applicability, owning department, L1-L4 level, system workflow, enforcement mode (INFO/REVIEW/BLOCK/ESCALATE), evidence type, retention/audit rule, and verification status.

## Source registry

- Saudi Red Sea Authority official regulations.
- Transport General Authority maritime regulations.
- General Directorate of Border Guard / Ministry of Interior ZAWIL and marine-activities information.
- Ministry of Environment, Water and Agriculture — Environmental Law regulations library.
- National Center for Environmental Compliance — Executive Regulation for Protection of Aquatic Environments from Pollution and environmental compliance framework.
- National Center for Wildlife — regulations library and official protected-area registry.
- ZATCA — Electronic Invoicing Regulation and implementation requirements/specifications.

## Next verification batches

1. Ministry of Tourism, Ministry of Sport and SWSDF activity/training applicability.
2. MHRSD and occupational safety/labour controls.
3. Civil Defense, municipalities and SASO facility/equipment controls.
4. SDAIA/PDPL and NCA data/cybersecurity controls.
5. Insurance Authority and insurance applicability.
6. Article-level verification for controls that will become hard BLOCK/ESCALATE rules.
