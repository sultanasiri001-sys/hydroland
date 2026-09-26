const base=process.env.MAPS_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';

let response=await fetch(`${base}/integrations/maps/public-config`);
let body=await response.json().catch(()=>null);
if(!response.ok)throw new Error(`Maps public config expected 200, got ${response.status}: ${JSON.stringify(body)}`);
if(body?.engine!=='MAPLIBRE'||body?.engineVersion!=='6.11.2')throw new Error(`Unexpected map engine contract: ${JSON.stringify(body)}`);
if(body?.status!=='SANDBOX'||body?.provider!=='E2E_MAPS'||body?.enabled!==true)throw new Error(`Sandbox maps integration was not exposed as operational: ${JSON.stringify(body)}`);
if(body?.styleUrl!=='https://maps.hydroland.test/style.json')throw new Error(`Public map style URL mismatch: ${JSON.stringify(body)}`);
if(Object.keys(body||{}).some(key=>/secret|password|private|apiKey/i.test(key)))throw new Error('Maps public config exposed a secret-shaped property.');

response=await fetch(`${base}/integrations/weather/public-config`);
body=await response.json().catch(()=>null);
if(!response.ok)throw new Error(`Weather public config expected 200, got ${response.status}: ${JSON.stringify(body)}`);
if(body?.provider!=='STORMGLASS'||body?.status!=='SANDBOX'||body?.configured!==true||body?.sandbox!==true)throw new Error(`Unexpected public weather readiness contract: ${JSON.stringify(body)}`);
if(Object.keys(body||{}).some(key=>/secret|password|private|apiKey/i.test(key)))throw new Error('Weather public config exposed a secret-shaped property.');

const protectedReadiness=[
  'payment','settlement','email','sms','whatsapp','object-storage','translation','esign','distress-ais','nafath','regulatory',
];
for(const route of protectedReadiness){
  response=await fetch(`${base}/health/integrations/${route}`);
  body=await response.json().catch(()=>null);
  if(response.status!==401)throw new Error(`Detailed readiness route ${route} must reject unauthenticated access with 401; got ${response.status}: ${JSON.stringify(body)}`);
}

console.log('Maps/readiness HTTP E2E passed: maps and weather public config remain public while detailed Stage 3 readiness diagnostics reject unauthenticated access.');
