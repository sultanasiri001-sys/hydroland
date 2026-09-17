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
| REG-ZATCA-001 | ZATCA | Electronic Invoicing Regulation requires electronic issuance/storage for subject taxpayers; implementation requirements include technical/procedural specifications. | Finance + Technology | L2/L3 | E-invoice compliance gate, immutable invoice evidence, validation/error queue. | Subject taxpayer / transaction scope. |
| REG-ZATCA-002 | ZATCA | Phase 2 integration is applied in waves to notified target groups and requires integration with ZATCA systems according to technical specifications. | Finance + Technology | L2/L3 | Feature flag by taxpayer applicability; integration status and validation evidence. | Only when HYDROLAND entity is notified/in scope. |

## Existing operational controls awaiting legal-source mapping

CMB-001 through CMB-006 remain implementation controls. They must not be labelled statutory requirements until each one is mapped to the exact official instrument/article and its applicability is confirmed.

- CMB-001 vessel licence gate
- CMB-002 sailing permit gate
- CMB-003 captain/safety assignment gate
- CMB-004 diver certification/depth compatibility gate
- CMB-005 safety briefing gate
- CMB-006 incident report/escalation gate

## Source registry

- Saudi Red Sea Authority — Maritime Tourism Agent Regulations (official SRSA publication).
- Saudi Red Sea Authority — Marina Design and Operation Regulations (official SRSA publication).
- Saudi Red Sea Authority — Tourist Navigation Agent Regulations (official SRSA publication).
- ZATCA — Electronic Invoicing Regulation and official implementation requirements/specifications.

## Next verification batches

1. Transport General Authority maritime rules and vessel/operator applicability.
2. General Directorate of Border Guard / ZAWIL permit workflows.
3. MEWA, NCEC and NCW environmental/protected-area requirements.
4. Ministry of Tourism, Ministry of Sport and SWSDF activity/training applicability.
5. MHRSD, Civil Defense, municipalities, SASO, SDAIA/PDPL, NCA and Insurance Authority.
