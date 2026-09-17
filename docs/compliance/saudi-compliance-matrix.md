# HYDROLAND — Saudi Compliance Matrix

Status: planning baseline. A control becomes **verified** only when tied to an official Saudi source and applicability is confirmed.

## Applicability rule

HYDROLAND operates across Saudi Arabia. Geographic scope must therefore be stored per control. Saudi Red Sea Authority (SRSA) controls are applied only where the SRSA regulation's defined geographical scope applies; they are not assumed to govern every Saudi water body.

## Verified official-source baseline

| Control | Authority | Official instrument / requirement | HYDROLAND owner | Level | System effect | Applicability |
|---|---|---|---|---|---|---|
| REG-SRSA-001 | Saudi Red Sea Authority | Maritime Tourism Agent Regulations define licensed maritime-tourism activity within the Red Sea geographical scope. | Legal + Marine Operations | L1/L2 | Store licence/authority record and prevent regulated workflow from being marked compliant when required evidence is missing. | Red Sea scope; exact activity applicability must be evaluated. |
| REG-SRSA-002 | Saudi Red Sea Authority | Marina Design and Operation Regulations define an operation licence for marina operators and a Red Sea geographical scope. | Facilities + Legal + Marine Operations | L1/L2 | Licence/evidence registry, expiry state, compliance gate where HYDROLAND operates/controls an applicable marina workflow. | Red Sea scope; marina activity only. |
| REG-SRSA-003 | Saudi Red Sea Authority | Tourist Navigation Agent Regulations include environmental-protection, pollution-prevention, security/safety and related-authority compliance obligations. | Safety/Compliance + Marine Operations | L2/L3 | Environmental/safety checklist, exception escalation and immutable evidence trail. | Red Sea scope and applicable regulated activity. |
| REG-TGA-001 | Transport General Authority | Ship Registration and Marine Unit Recording Regulation provides for registration/recording of ships and marine units, including inspection and registration/record certificates. | Marine Operations + Facilities/Assets + Legal | L1/L2 | Vessel master record must store registration/record evidence, validity and status; applicable trip workflows cannot be marked compliant when required vessel evidence is missing/invalid. | Apply according to vessel/unit classification and regulatory scope. |
| REG-TGA-002 | Transport General Authority | Regulation for Maritime Transport Operations provides licensing framework including navigation licence for ships and work licence for marine units, with issue, duration, renewal, suspension/cancellation and general licensee obligations. | Marine Operations + Legal | L1/L2/L3 | Store licence type/status/expiry; pre-operation gate; expiry alerts; suspension/cancellation blocks applicable operation and creates compliance escalation. | Apply only where the vessel/activity falls within the regulation and licence category. |
| REG-TGA-003 | Transport General Authority | Executive regulation for inspection/survey of small ships not subject to international conventions applies inspection/survey requirements according to vessel size, tonnage and activity. | Safety/Compliance + Marine Operations + Facilities/Assets | L2/L3 | Store survey/certificate evidence; prevent compliant/ready status when an applicable required survey/certificate is absent or invalid; defects route to corrective-action workflow. | Small ships/marine units within the regulation; exact survey/certificate depends on vessel/activity. |
| REG-BG-001 | General Directorate of Border Guard / ZAWIL | Official Saudi government service documentation identifies ZAWIL as the electronic channel for issuing sailing permits, including diving, fishing, recreation, research, rental, marine-agency, rescue, passenger transport and marine-sports purposes. | Marine Operations + Safety/Compliance | L2/L3 | Store permit number/type, validity period, sailing area, vessel and participants; block trip activation when an applicable sailing permit is absent/expired/mismatched. | Applicable sea-going activity requiring Border Guard sailing permit; permit type must match activity. |
| REG-BG-002 | General Directorate of Border Guard / ZAWIL | Sailing-permit service requires selection of permit type, sailing date/period, sailing areas, an available vessel belonging to the owner, vessel details and accompanying persons; government documentation also identifies marine-craft driving licence and identity/residency/passport as service conditions. | Marine Operations + Legal + Safety/Compliance | L2/L3 | Pre-departure validation compares HYDROLAND trip manifest against permit activity, dates, area, vessel and participant evidence; mismatches create BLOCK or review according to verified applicability. | Permit workflow for the relevant applicant/vessel/activity. |
| REG-BG-003 | General Directorate of Border Guard | Official Ministry of Interior information confirms ZAWIL provides electronic services including marine-craft command delegation and sailing permits for multiple purposes; Border Guard Marine Activities Administration coordinates licensing and safety instructions for marine activities including diving and marine sports. | Marine Operations + HR + Safety/Compliance | L1/L2/L3 | Captain/delegation evidence registry; assignment validation before departure; retain audit evidence of who was authorised to command the vessel. | Apply where captain delegation/authorisation is required for the vessel/activity. |
| REG-ZATCA-001 | ZATCA | Electronic Invoicing Regulation requires electronic issuance/storage for subject taxpayers; implementation requirements include technical/procedural specifications. | Finance + Technology | L2/L3 | E-invoice compliance gate, immutable invoice evidence, validation/error queue. | Subject taxpayer / transaction scope. |
| REG-ZATCA-002 | ZATCA | Phase 2 integration is applied in waves to notified target groups and requires integration with ZATCA systems according to technical specifications. | Finance + Technology | L2/L3 | Feature flag by taxpayer applicability; integration status and validation evidence. | Only when HYDROLAND entity is notified/in scope. |

## Existing operational controls awaiting/receiving legal-source mapping

- CMB-001 vessel licence gate — partially mapped to REG-TGA-001/002; exact vessel classification determines the required licence/record.
- CMB-002 sailing permit gate — mapped to REG-BG-001/002. Implementation must validate permit type, period, sailing area and vessel against the trip rather than merely storing a boolean.
- CMB-003 captain/safety assignment gate — captain/delegation portion partially mapped to REG-BG-003; safety-officer requirement remains activity/source dependent and must not be represented as universally statutory yet.
- CMB-004 diver certification/depth compatibility gate — awaiting exact Saudi authority/source mapping; international training standards remain reference-only unless incorporated by applicable Saudi rule/licence condition.
- CMB-005 safety briefing gate — awaiting exact official-source mapping.
- CMB-006 incident report/escalation gate — awaiting exact authority-specific reporting-source mapping.

## Source registry

- Saudi Red Sea Authority — Maritime Tourism Agent Regulations (official SRSA publication).
- Saudi Red Sea Authority — Marina Design and Operation Regulations (official SRSA publication).
- Saudi Red Sea Authority — Tourist Navigation Agent Regulations (official SRSA publication).
- Transport General Authority — Ship Registration and Marine Unit Recording Regulation.
- Transport General Authority — Regulation for Maritime Transport Operations.
- Transport General Authority — Executive Regulation for Inspection and Survey of Small Ships Not Subject to International Conventions.
- General Directorate of Border Guard / Ministry of Interior — ZAWIL and marine-activities official service information.
- Saudi National Platform / official government service directory — Border Guard entity registration and sailing-permit service descriptions.
- ZATCA — Electronic Invoicing Regulation and official implementation requirements/specifications.

## Next verification batches

1. MEWA, NCEC and NCW environmental/protected-area requirements.
2. Ministry of Tourism, Ministry of Sport and SWSDF activity/training applicability.
3. MHRSD, Civil Defense, municipalities, SASO, SDAIA/PDPL, NCA and Insurance Authority.
