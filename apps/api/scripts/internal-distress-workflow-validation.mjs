import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const service=read('src/safety/safety-distress.service.ts');
const controller=read('src/safety/safety-incidents.controller.ts');
const moduleFile=read('src/safety/safety.module.ts');
const incidentService=read('src/safety/safety-incidents.service.ts');
const ais=read('src/integrations/marinetraffic-ais.service.ts');
const safetyUi=fs.readFileSync(new URL('../../web/src/hydroland-safety-incidents.js',import.meta.url),'utf8');
const coverage=fs.readFileSync(new URL('../../../docs/STAGE3_INTEGRATION_COVERAGE.md',import.meta.url),'utf8');

for(const marker of [
  "severity:'CRITICAL'",
  "title:'Maritime distress / استغاثة بحرية'",
  "workflow:'INTERNAL_CRITICAL_INCIDENT'",
  "externalTransmission:'NOT_IMPLEMENTED'",
  'externalDistressSent:false',
  'humanEmergencyEscalationRequired:true',
  "status:'UNAVAILABLE'",
  'SAFETY_DISTRESS_CASE_OPENED',
  'ais.singleVesselByMmsi',
  'ais.singleVesselByImo',
])if(!service.includes(marker))throw new Error(`Internal distress workflow invariant missing: ${marker}`);

for(const prohibited of ['sendDistress','triggerDistress','transmitDistress','acknowledgeDistress','maydayEndpoint','method:\'POST\'']){
  if(service.includes(prohibited))throw new Error(`Internal distress workflow contains prohibited external distress capability: ${prohibited}`);
}

for(const marker of ["@Post('distress')",'this.distress.open','SafetyDistressService'])if(!controller.includes(marker))throw new Error(`Distress controller boundary missing: ${marker}`);
for(const marker of ['IntegrationModule','SafetyDistressService'])if(!moduleFile.includes(marker))throw new Error(`Safety module distress registration missing: ${marker}`);
for(const marker of ['SafetyIncident','UNDER_REVIEW','RESOLVED','CLOSED','Resolution notes are required'])if(!incidentService.includes(marker))throw new Error(`Safety incident lifecycle invariant missing: ${marker}`);
for(const marker of ["method:'GET'",'MARINETRAFFIC_AIS_ONLY'])if(!ais.includes(marker))throw new Error(`AIS read-only invariant missing: ${marker}`);

for(const marker of [
  "emergency.dataset.safetyEmergencyBoundary='internal-only'",
  'href="tel:994"',
  'داخل HYDROLAND فقط',
  'لم يتم إشعار حرس الحدود تلقائيًا',
  'للطوارئ البحرية في عسير',
])if(!safetyUi.includes(marker))throw new Error(`Emergency UI boundary missing: ${marker}`);

for(const prohibited of ["window.location='tel:994'",'window.location="tel:994"',"window.open('tel:994'",'window.open("tel:994"']){
  if(safetyUi.includes(prohibited))throw new Error(`Emergency UI must require explicit user-initiated calling: ${prohibited}`);
}

if(!coverage.includes('DISTRESS_AIS'))throw new Error('Stage 3 documentation must retain DISTRESS_AIS boundary.');

console.log('Internal fail-safe maritime distress workflow validation passed.');
