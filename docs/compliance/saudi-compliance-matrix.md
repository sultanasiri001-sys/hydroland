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
| REG-ZATCA-001 | ZATCA | Electronic Invoicing Regulation requires electronic issuance/storage for subject taxpayers; implementation requirements include technical/procedural specifications. | Finance + Technology | L2/L3 | E-invoice compliance gate, immutable invoice evidence, validation/error queue. | Subject taxpayer / transaction scope. |
| REG-ZATCA-002 | ZATCA | Phase 2 integration is applied in waves to notified target groups and requires integration with ZATCA systems according to technical specifications. | Finance + Technology | L2/L3 | Feature flag by taxpayer applicability; integration status and validation evidence. | Only when HYDROLAND entity is notified/in scope. |

## Existing operational controls awaiting/receiving legal-source mapping

- CMB-001 vessel licence gate — partially mapped to REG-TGA-001/002; exact vessel classification must determine which licence/record is required.
- CMB-002 sailing permit gate — awaiting exact Border Guard/ZAWIL official-source mapping.
- CMB-003 captain/safety assignment gate — awaiting exact official-source mapping by vessel/activity.
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
- ZATCA — Electronic Invoicing Regulation and official implementation requirements/specifications.

## Next verification batches

1. General Directorate of Border Guard / ZAWIL permit workflows.
2. MEWA, NCEC and NCW environmental/protected-area requirements.
3. Ministry of Tourism, Ministry of Sport and SWSDF activity/training applicability.
4. MHRSD, Civil Defense, municipalities, SASO, SDAIA/PDPL, NCA and Insurance Authority.
